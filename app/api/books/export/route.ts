import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { formatAuthor } from '@/lib/formatAuthor'

export const runtime = 'nodejs'

const HEADERS = [
  'title',
  'author',
  'isbn',
  'status',
  'owned',
  'total_pages',
  'current_page',
  'started_at',
  'completed_at',
  'memo',
] as const

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: books, error } = await supabase
    .from('books')
    .select('*')
    .eq('user_id', user.id)
    .order('title', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = (books ?? []).map((book) =>
    HEADERS.map((key) => {
      const raw = (book as Record<string, unknown>)[key]
      // 저자/역자 원본("지은이: OOO ;옮긴이: OOO")은 화면 표시와 동일하게
      // 정리된 형태("OOO 지음 · OOO 옮김")로 내보냄 — 그전엔 DB 원본을 그대로 내보내서
      // 화면에서 보던 것과 CSV가 다르게 나오는 문제가 있었음.
      const value = key === 'author' ? formatAuthor(raw as string | null) ?? raw : raw
      return csvEscape(value)
    }).join(',')
  )
  const csv = [HEADERS.join(','), ...rows].join('\r\n')

  // 엑셀에서 한글이 깨지지 않도록 UTF-8 BOM 추가
  const body = '﻿' + csv
  const filename = `read-and-ridge-books-${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
