// 공개 지형도(/trail/[slug])에 내보낼 데이터를 만드는 서버 전용 모듈.
//
// ⚠️ 이 파일에는 'use client'를 붙이면 안 됩니다 (components/worldmap/worldmap-utils.ts
// 상단의 같은 경고 참고). 그리고 여기서 만든 값은 그대로 클라이언트 컴포넌트로 내려가
// **페이지 소스와 RSC 페이로드에 전부 남습니다**. 화면에 안 그린다고 안전한 게 아니라,
// "안 넘긴 것"만 안전합니다. 아래 마스킹 규칙이 이 기능의 핵심입니다.
import { createAdminClient } from '@/lib/supabase/admin'
import { isAuroraBook } from '@/lib/aurora-books'
import { LONG_TITLE_THRESHOLD, PAGES_PER_STEP } from '@/components/worldmap/constants'
import { DISTANCE_PER_PAGE_M, type WorldMapBook } from '@/components/worldmap/worldmap-utils'

export type BookVisibility = 'public' | 'quiz' | 'private'

// 공개 페이지가 books에서 읽는 컬럼 목록.
// ⚠️ select('*')를 쓰면 안 됩니다 — author·cover_url처럼 책을 바로 특정하는 컬럼이
// 같이 딸려오고, 나중에 누가 컬럼을 추가하면 자동으로 유출됩니다. 명시 목록이
// "새 컬럼은 기본적으로 비공개"를 보장하는 유일한 방법입니다.
const PUBLIC_BOOK_COLUMNS =
  'id, title, total_pages, current_page, status, kdc, completed_at, isbn, owned, visibility, quiz_hints'

type PublicBookRow = {
  id: string
  title: string
  total_pages: number | null
  current_page: number
  status: string
  kdc: string | null
  completed_at: string | null
  isbn: string | null
  owned: boolean | null
  visibility: BookVisibility
  quiz_hints: string[] | null
}

// ─── 마스킹 (순수 함수) ───────────────────────────────────────────────────────

// 맞춰보세요 책의 제목 가리개.
//
// 제목이 산 모양에 미치는 영향은 딱 하나다 — getMountainShape(geometry.ts)의
// `title.trim().length >= LONG_TITLE_THRESHOLD`(쌍봉이냐 아니냐). 그래서 그 임계값을
// 넘는지 여부만 보존하는 고정 길이로 바꾸면 **실루엣이 주인 화면과 완전히 같으면서**
// 글자 수조차 새지 않는다.
//
// ⚠️ title.length(트림 안 한 길이)로 계산하면 앞뒤 공백이 있는 제목에서 임계값 판정이
// 달라져 주인이 본 적 없는 쌍봉이 뜬다. 반드시 trim 후 길이로 판단할 것.
export function maskTitle(title: string): string {
  const long = title.trim().length >= LONG_TITLE_THRESHOLD
  return '?'.repeat(long ? LONG_TITLE_THRESHOLD : 8)
}

// 맞춰보세요 책의 쪽수 가리개.
//
// getSteps(geometry.ts)가 `Math.round(pages / PAGES_PER_STEP)`으로 계단을 세므로,
// PAGES_PER_STEP 배수로 반올림해서 보내면 산 크기가 **픽셀 단위로 동일**하게 유지되면서
// 정확한 쪽수(= KDC·상태와 합치면 꽤 강력한 지문)는 안 나간다.
export function quantizePages(pages: number | null): number | null {
  if (pages == null || pages <= 0) return pages
  const bucket = Math.round(pages / PAGES_PER_STEP)
  // ⚠️ bucket이 0이면(= 20쪽 미만 얇은 책) 그냥 곱하면 0이 되고, getSteps는 0을
  // "쪽수 모름"으로 보고 DEFAULT_PAGES(250)로 대체해버린다 — 얇은 책이 갑자기
  // 250쪽짜리 산으로 커진다. 같은 bucket(0)에 속하면서 0이 아닌 값을 돌려준다.
  return bucket === 0 ? 10 : PAGES_PER_STEP * bucket
}

// 진행률(캐릭터가 오른 높이)은 비율로만 쓰이므로, 가려진 쪽수에 맞춰 같은 비율로 환산한다.
export function quantizeCurrentPage(
  currentPage: number,
  realPages: number | null,
  maskedPages: number | null
): number {
  if (!realPages || !maskedPages) return 0
  return Math.round((currentPage / realPages) * maskedPages)
}

// 맞춰보세요 책의 정답이 공개되는 시점 = 완독. 등반이 끝나면 산 이름이 밝혀진다.
export function isQuizRevealed(row: { visibility: BookVisibility; status: string }): boolean {
  return row.visibility === 'quiz' && row.status === 'completed'
}

// books row 한 줄 → 공개 페이지에 내보낼 WorldMapBook.
// 여기서 빼는 것들(모든 책 공통):
//   memo  — 읽으면서 남긴 사적인 문장
//   isbn  — 책 한 권을 바로 특정함. 대신 aurora(깃발 색) 판정 결과만 넘긴다
//   completed_at — 날짜까지만. 그래야 isRecentlyCompleted가 항상 false가 되어
//                  방문자 화면에서 완등 세레모니·인증샷 버튼이 뜨지 않는다
export function toPublicBook(row: PublicBookRow): WorldMapBook & { isQuiz: boolean } {
  const quizHidden = row.visibility === 'quiz' && !isQuizRevealed(row)
  const maskedPages = quizHidden ? quantizePages(row.total_pages) : row.total_pages

  return {
    id: row.id,
    title: quizHidden ? maskTitle(row.title) : row.title,
    total_pages: maskedPages,
    current_page: quizHidden
      ? quantizeCurrentPage(row.current_page, row.total_pages, maskedPages)
      : row.current_page,
    status: row.status as WorldMapBook['status'],
    kdc: row.kdc ?? null,
    completed_at: row.completed_at ? row.completed_at.slice(0, 10) : null,
    memo: null,
    // isbn은 아예 넘기지 않는다. quiz 책은 오로라 여부까지 감춘다 —
    // 오로라 깃발색은 지정 도서 몇 권에만 붙어서 그 자체가 정답 힌트가 된다.
    aurora: quizHidden ? false : isAuroraBook(row.isbn),
    owned: row.owned ?? false,
    isQuiz: quizHidden,
  }
}

// ─── 조회 ─────────────────────────────────────────────────────────────────────

export type PublicTrail = {
  nickname: string
  /** 산책기록 지형도용 — 비공개를 제외한 전부 */
  books: (WorldMapBook & { isQuiz: boolean })[]
  /** 완등기록 지형도용 — 완독한 책만, 최근 완독 순 */
  completed: (WorldMapBook & { isQuiz: boolean })[]
  /** 맞춰보세요 책의 주인이 적어둔 힌트 (책 id → 힌트 목록, 최대 3개) */
  quizHints: Record<string, string[]>
  stats: {
    /** 등록한 책 수 — 비공개 포함 전체 */
    totalBooks: number
    /** 완독 권수 — 비공개 포함 전체 */
    completedCount: number
    /** 발걸음 수 — 아직 오르는 중인 책(읽는 중·잠시 멈춤)의 읽은 쪽수 합. 1쪽 = 1걸음.
        주인 화면(app/dashboard/page.tsx)의 같은 이름 숫자와 동일한 기준이다. */
    stepsWalked: number
    /** 완등 거리(km) — 비공개 포함 전체, 실제 쪽수 기준 */
    totalKm: number
  }
}

// slug로 공개 지형도를 조회. 없으면 null(호출 측에서 notFound()).
//
// RLS를 anon에게 열지 않고 서비스 롤로 읽는다 — 노출 면적을 "이 함수가 고른 컬럼"으로
// 좁게 묶어두기 위함. 그래서 이 함수 밖으로는 절대 raw row를 내보내지 않는다.
export async function getPublicTrail(slug: string): Promise<PublicTrail | null> {
  const admin = createAdminClient()

  // ⚠️ share_enabled를 반드시 같이 본다. 공개 토글을 꺼도 share_slug는 지워지지 않고
  // 남아 있기 때문에(계정이 사라질 때까지 같은 링크를 쓰려고 — account-actions.ts의
  // updateShareEnabled 주석 참고), slug만 맞으면 열어주면 **껐는데도 열린다.**
  const { data: profile } = await admin
    .from('profiles')
    .select('user_id, nickname, share_enabled')
    .eq('share_slug', slug)
    .maybeSingle()

  if (!profile || !profile.share_enabled) return null

  const { data: rows, error } = await admin
    .from('books')
    .select(PUBLIC_BOOK_COLUMNS)
    .eq('user_id', profile.user_id)
    .order('created_at', { ascending: true }) // 지형도 가로축 = 등록 순(타임라인)

  if (error) {
    console.error('getPublicTrail: books 조회 실패:', error.message)
    return null
  }

  const all = (rows ?? []) as unknown as PublicBookRow[]

  // 집계는 비공개까지 포함한 **전체**, 그리고 가려지지 않은 실제 쪽수로 계산한다.
  // (지도에 보이는 산 개수와 숫자가 어긋나므로 방문자가 "비공개가 몇 권 있다"는 건
  //  역산할 수 있다. 개수만 새고 내용은 안 샌다 — 의도된 절충.)
  const completedRows = all.filter((b) => b.status === 'completed')
  const stats = {
    totalBooks: all.length,
    completedCount: completedRows.length,
    stepsWalked: all
      .filter((b) => b.status !== 'completed')
      .reduce((sum, b) => sum + (b.current_page ?? 0), 0),
    totalKm:
      (completedRows.reduce((sum, b) => sum + (b.total_pages ?? 0), 0) * DISTANCE_PER_PAGE_M) / 1000,
  }

  const visible = all.filter((b) => b.visibility !== 'private')
  const books = visible.map(toPublicBook)

  const completed = visible
    .filter((b) => b.status === 'completed')
    .sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''))
    .map(toPublicBook)

  // 힌트는 아직 안 밝혀진 맞춰보세요 책만
  const quizHints: Record<string, string[]> = {}
  for (const row of visible) {
    if (row.visibility !== 'quiz' || isQuizRevealed(row)) continue
    const list = (row.quiz_hints ?? []).map((h) => h.trim()).filter(Boolean)
    if (list.length) quizHints[row.id] = list
  }

  return { nickname: profile.nickname || '산책자', books, completed, quizHints, stats }
}
