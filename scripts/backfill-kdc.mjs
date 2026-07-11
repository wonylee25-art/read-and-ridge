#!/usr/bin/env node
// 기존에 등록된 책 중 kdc가 비어있고 isbn이 있는 책을 대상으로 SEOJI API를 다시
// 조회해 KDC/SUBJECT 값을 채워 넣는 1회성 백필 스크립트.
// (app/api/books/search/route.ts의 resolveKdc() 로직을 그대로 재사용)
//
// 실행: 프로젝트 루트에서 `node scripts/backfill-kdc.mjs`
// (Next.js 밖에서 실행되는 순수 Node 스크립트라 .env.local을 직접 읽어서 씀)
//
// SUPABASE_SERVICE_ROLE_KEY로 RLS를 우회하므로, 베타 유저 전체의 책을 대상으로
// 한 번에 처리한다. ISBN이 없는 책(직접 입력한 책)은 재조회 대상이 아니라
// 그대로 스킵되고 기존 해시 색을 유지한다.

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

function loadEnvLocal() {
  const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf-8')
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    if (!(key in process.env)) process.env[key] = value
  }
}
loadEnvLocal()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const NL_API_KEY = process.env.NL_API_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !NL_API_KEY) {
  console.error(
    '필요한 환경변수가 .env.local에 없습니다 (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / NL_API_KEY)'
  )
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// app/api/books/search/route.ts의 resolveKdc()와 동일한 규칙 —
// KDC(정본) 우선, 없으면 SUBJECT(대분류 한 자리)로 폴백.
function resolveKdc(kdc, subject) {
  const k = kdc?.trim()
  if (k) return k
  const s = subject?.trim()
  if (s) return s
  return null
}

async function fetchKdcForIsbn(isbn) {
  const search = new URLSearchParams({
    cert_key: NL_API_KEY,
    result_style: 'json',
    page_no: '1',
    page_size: '1',
    isbn,
  })
  const res = await fetch(`https://www.nl.go.kr/seoji/SearchApi.do?${search}`, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: 'application/json',
    },
  })
  if (!res.ok) return null
  const data = await res.json()
  const doc = data?.docs?.[0]
  if (!doc) return null
  return resolveKdc(doc.KDC, doc.SUBJECT)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  const { data: books, error } = await supabase
    .from('books')
    .select('id, title, isbn')
    .is('kdc', null)
    .not('isbn', 'is', null)

  if (error) {
    console.error('책 목록 조회 실패:', error.message)
    process.exit(1)
  }

  console.log(`대상: ${books.length}권 (kdc 없음 + isbn 있음)\n`)

  let updated = 0
  let notFound = 0
  let failed = 0

  for (const [i, book] of books.entries()) {
    const tag = `[${i + 1}/${books.length}]`
    try {
      const kdc = await fetchKdcForIsbn(book.isbn)
      if (kdc) {
        const { error: updateError } = await supabase
          .from('books')
          .update({ kdc })
          .eq('id', book.id)
        if (updateError) {
          console.error(`  ✗ ${tag} "${book.title}" 업데이트 실패:`, updateError.message)
          failed++
        } else {
          console.log(`  ✓ ${tag} "${book.title}" → kdc=${kdc}`)
          updated++
        }
      } else {
        console.log(`  – ${tag} "${book.title}" — KDC/SUBJECT 둘 다 없음, 스킵`)
        notFound++
      }
    } catch (e) {
      console.error(`  ✗ ${tag} "${book.title}" 조회 실패:`, e.message)
      failed++
    }
    // 공공 API에 부담 안 주도록 요청 사이 살짝 텀을 둔다.
    await sleep(300)
  }

  console.log('\n완료:', { 대상: books.length, 갱신: updated, 값없음: notFound, 실패: failed })
}

main()
