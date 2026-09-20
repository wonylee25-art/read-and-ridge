'use server'

// 비로그인 방문자의 "맞춰보세요" 정답 확인.
//
// ⚠️ 이 액션은 설계상 위험하다. book_id를 클라이언트가 보내고, 확인은 RLS를 우회하는
// 서비스 롤로 하기 때문에, 검사를 빠뜨리면 **모든 사용자의 모든 책(비공개 포함) 제목을
// 확인해주는 오라클**이 된다. 아래 검사 순서를 줄이거나 건너뛰지 말 것.
//   1) 맞춰보세요 상태인가
//   2) 그 책 주인의 공개 링크가 켜져 있고, 지금 보고 있는 slug와 같은 사람인가
//   3) 아직 안 밝혀졌는가(완독 = 정답 공개라 더 맞힐 게 없다)
//   4) 입력 길이 제한
// 그리고 반환값에는 **정답일 때만** 제목을 싣는다.
import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidShareSlug } from '@/lib/trail/slug'

const MAX_GUESS_LEN = 100
const MAX_NAME_LEN = 20

// 비교용 정규화 — 대소문자·공백·문장부호·괄호 차이로 오답 처리되지 않게.
// (예: "해리 포터와 마법사의 돌" vs "해리포터와 마법사의돌")
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s ]/g, '')
    .replace(/[.,!?;:'"`~/\\\-_—–()[\]{}<>「」『』《》〈〉·•]/g, '')
}

function isMatch(guess: string, title: string): boolean {
  const g = normalize(guess)
  const t = normalize(title)
  if (!g || !t) return false
  if (g === t) return true
  // 부제("제목 - 부제")까지 다 적지 않아도 맞게 처리. 너무 짧은 조각으로
  // 무차별 대입하는 걸 막으려고 4글자 이상일 때만 부분 일치를 인정한다.
  if (g.length >= 4 && t.startsWith(g)) return true
  return false
}

// 아주 가벼운 레이트 리밋 — 인스턴스 메모리에만 있고 콜드 스타트마다 초기화된다.
// 개인 규모 서비스에서 무차별 대입을 늦추는 용도로는 충분하고, 인프라가 안 든다.
const RATE_WINDOW_MS = 60_000
const RATE_MAX = 10
const rateBuckets = new Map<string, { count: number; windowStart: number }>()

function rateLimited(key: string): boolean {
  const now = Date.now()
  const bucket = rateBuckets.get(key)
  if (!bucket || now - bucket.windowStart > RATE_WINDOW_MS) {
    rateBuckets.set(key, { count: 1, windowStart: now })
    return false
  }
  bucket.count += 1
  return bucket.count > RATE_MAX
}

export type GuessResult =
  | { ok: true; correct: boolean; title: string | null }
  | { ok: false; reason: 'invalid' | 'rate_limited' | 'failed' }

export async function submitGuess(
  slug: string,
  bookId: string,
  guess: string,
  guesserName: string
): Promise<GuessResult> {
  if (!isValidShareSlug(slug)) return { ok: false, reason: 'invalid' }

  const trimmedGuess = guess.trim().slice(0, MAX_GUESS_LEN)
  const trimmedName = guesserName.trim().slice(0, MAX_NAME_LEN)
  if (!trimmedGuess) return { ok: false, reason: 'invalid' }

  const ip = headers().get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (rateLimited(ip)) return { ok: false, reason: 'rate_limited' }

  const admin = createAdminClient()

  const { data: book } = await admin
    .from('books')
    .select('id, user_id, title, status, visibility')
    .eq('id', bookId)
    .maybeSingle()

  // 존재하지 않는 책과 맞힐 수 없는 책을 같은 응답으로 묶는다 —
  // 오류 메시지 차이만으로도 "그 id는 실재한다"가 새기 때문.
  if (!book || book.visibility !== 'quiz' || book.status === 'completed') {
    return { ok: false, reason: 'invalid' }
  }

  // 이 책의 주인이 지금 보고 있는 그 공개 페이지의 주인이 맞는지 —
  // 링크를 통하지 않은 임의 book_id 조회를 막는 핵심 검사.
  // ⚠️ share_enabled까지 봐야 한다 — 공개 토글을 꺼도 slug는 남아 있으므로
  // (account-actions.ts의 updateShareEnabled 주석 참고), 이 검사를 빼면 꺼진
  // 지형도의 책 제목을 이 액션으로 계속 확인할 수 있다.
  const { data: profile } = await admin
    .from('profiles')
    .select('user_id, share_enabled')
    .eq('share_slug', slug)
    .maybeSingle()

  if (!profile || !profile.share_enabled || profile.user_id !== book.user_id) {
    return { ok: false, reason: 'invalid' }
  }

  const correct = isMatch(trimmedGuess, book.title as string)

  const { error } = await admin.from('guesses').insert({
    book_id: book.id,
    owner_id: book.user_id,
    guesser_name: trimmedName || null,
    guess: trimmedGuess,
    is_correct: correct,
  })
  if (error) console.error('submitGuess: 기록 실패:', error.message)

  // 제목은 맞혔을 때만 돌려준다.
  return { ok: true, correct, title: correct ? (book.title as string) : null }
}
