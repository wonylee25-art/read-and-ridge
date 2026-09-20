import { createClient } from '@/lib/supabase/server'

// 공개 등반지도에 놀러 온 사람이 '맞춰보세요' 산에 남긴 답. `guesses` 테이블에는
// 처음부터(0.5.0) 전부 쌓이고 있었지만 주인이 그걸 보는 화면이 없었다 — 방문자는
// 놀다 갔는데 주인 쪽에는 아무 일도 일어나지 않은 것처럼 보였다.
//
// 숫자(조회수·방문자 수)로 보여주지 않는다. 늘지 않으면 실망하고 늘면 집착하는
// 종류의 값이고, 무엇보다 이 앱이 안 만들기로 한 것들과 같은 성격이다
// (`docs/features/social-visit.md` 5절). 대신 "누가 뭐라고 답했는지"라는 사건으로
// 보여준다 — 비교할 대상이 없고, 사람 이름과 문장이 남는다.
//
// 조회는 로그인 사용자 세션(RLS)으로 한다. `guesses`에는 주인만 읽을 수 있는
// SELECT 정책(auth.uid() = owner_id)이 이미 걸려 있어서 서비스 롤이 필요 없다.
const MAX_ENTRIES = 12

export type GuestEntry = {
  id: string
  guess: string
  isCorrect: boolean
  guesserName: string | null
  bookTitle: string
  createdAt: string
}

export async function getGuestLog(userId: string): Promise<GuestEntry[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('guesses')
    .select('id, guess, is_correct, guesser_name, created_at, books(title)')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })
    .limit(MAX_ENTRIES)

  if (error) {
    // 방명록이 안 보이는 것 때문에 산책기록 전체가 깨지면 안 된다 — 조용히 빈 목록.
    console.error('getGuestLog:', error.message)
    return []
  }

  return (data ?? []).flatMap((row) => {
    // 책이 지워졌으면(FK는 남아도 조인 결과가 비면) 어느 산 이야기인지 알 수 없어 건너뛴다.
    const book = row.books as { title: string } | { title: string }[] | null
    const title = Array.isArray(book) ? book[0]?.title : book?.title
    if (!title) return []

    return [{
      id: row.id as string,
      guess: row.guess as string,
      isCorrect: row.is_correct as boolean,
      guesserName: (row.guesser_name as string | null) || null,
      bookTitle: title,
      createdAt: row.created_at as string,
    }]
  })
}
