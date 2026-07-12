import Sidebar from '@/components/dashboard/Sidebar'
import ProfileTrigger from '@/components/dashboard/ProfileTrigger'
import { createClient } from '@/lib/supabase/server'
import { DISTANCE_PER_PAGE_M } from '@/components/worldmap/worldmap-utils'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // "산책자 증표" 팝업용 데이터. 산책기록/완등기록 각 페이지가 이미 비슷한 계산을
  // 각자 하고 있지만(목록 렌더링에 필요), 여기서는 레이아웃 레벨에서 두 페이지
  // 데이터를 합쳐 보여줘야 해서 별도로 가볍게 한 번 더 조회한다.
  let nickname: string | null = null
  let stats: {
    createdAt: string
    lastActiveAt: string | null
    myBooksCount: number
    stepsWalked: number
    completedCount: number
    completedKm: number
  } | null = null

  if (user) {
    nickname =
      (user.user_metadata?.nickname as string | undefined) ||
      (user.user_metadata?.full_name as string | undefined) ||
      (user.user_metadata?.name as string | undefined) ||
      '산책자'

    const { data: books } = await supabase
      .from('books')
      .select('status, current_page, total_pages, status_changed_at')
      .eq('user_id', user.id)

    const all = books ?? []
    const readingOrPaused = all.filter((b) => b.status === 'reading' || b.status === 'paused')
    const completed = all.filter((b) => b.status === 'completed')

    const lastActiveAt =
      all
        .map((b) => b.status_changed_at)
        .filter((v): v is string => !!v)
        .sort()
        .at(-1) ?? null

    stats = {
      createdAt: user.created_at,
      lastActiveAt,
      myBooksCount: readingOrPaused.length,
      stepsWalked: readingOrPaused.reduce((sum, b) => sum + (b.current_page ?? 0), 0),
      completedCount: completed.length,
      completedKm:
        (completed.reduce((sum, b) => sum + (b.total_pages ?? 0), 0) * DISTANCE_PER_PAGE_M) / 1000,
    }
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-50">
      <Sidebar authenticated={!!user} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-5xl mx-auto relative">
          {/* 페이지 제목(children 최상단 h2)과 같은 줄에 보이도록 절대 위치로 겹쳐
              배치. children도 동일한 max-w-5xl mx-auto라 좌우 기준선이 일치하고,
              둘 다 이 relative 컨테이너의 top: 0에서 시작해 같은 줄에 정렬된다. */}
          {user && nickname && stats && (
            <div className="absolute top-0 right-0">
              <ProfileTrigger nickname={nickname} stats={stats} />
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  )
}
