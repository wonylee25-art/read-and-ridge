export const runtime = 'nodejs'

import { createClient } from '@/lib/supabase/server'
import { BookOpen, Footprints } from 'lucide-react'
import WorldMapClient from '@/components/worldmap/WorldMapClient'
import BookCard from '@/components/books/BookCard'
import StatCard from '@/components/dashboard/StatCard'
import EmptyState from '@/components/dashboard/EmptyState'
import { toWorldMapBooks } from '@/components/worldmap/worldmap-utils'
import { DEMO_HOME_BOOKS } from '@/lib/demo-books'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 비로그인 — 실제 데이터 조회 없이 예시 지형도만 보여준다. 산 클릭(게이지 만져보기)
  // / 책 추가는 되지만 저장·등록은 구글 로그인으로 유도됨(WorldMapClient 내부에서 처리).
  // 아래 "읽는 중/잠시 멈춤" 카드 목록(BookCard)은 삭제·메모 등 계정 데이터를 직접
  // 다루는 액션이 많아 비로그인에서는 아예 보여주지 않는다.
  if (!user) {
    const readingCount = DEMO_HOME_BOOKS.filter((b) => b.status === 'reading').length
    const pausedCount = DEMO_HOME_BOOKS.filter((b) => b.status === 'paused').length
    const stepsWalked = DEMO_HOME_BOOKS.reduce((sum, b) => sum + (b.current_page ?? 0), 0)

    const demoStats = [
      { label: '내가 산 책', value: readingCount + pausedCount, icon: BookOpen, color: 'text-blue-400', bg: 'bg-blue-950/40' },
      { label: '발걸음 수', value: stepsWalked.toLocaleString(), icon: Footprints, color: 'text-purple-400', bg: 'bg-purple-950/40' },
    ]

    return (
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">산책기록</h2>
        </div>

        <div className="space-y-6 mb-10">
          <WorldMapClient books={DEMO_HOME_BOOKS} authenticated={false} />

          <div className="grid grid-cols-2 gap-3">
            {demoStats.map((stat) => <StatCard key={stat.label} {...stat} />)}
          </div>
        </div>
      </div>
    )
  }

  // 홈(WorldMap)과 산책기록(목록)이 합쳐진 페이지라 한 번의 조회로 둘 다 충당.
  // 등록 순서(오래된 → 최신)로 받아서 WorldMap 타임라인 원칙은 그대로 유지함.
  const { data: books } = await supabase
    .from('books')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  // 목록(읽는 중/잠시 멈춤)은 WorldMap과 별개로 "이 상태가 된 시각"(status_changed_at)
  // 기준 최신순으로 따로 정렬 — 단순히 등록순을 뒤집기만 하면, 오래전에 등록해둔
  // 책을 오늘 막 "잠시 멈춤 → 읽는 중"으로 바꿔도 등록일이 오래됐다는 이유로 목록
  // 위로 안 올라오는 문제가 있었음. status_changed_at이 없는(마이그레이션 이전) 책은
  // created_at으로 대체.
  function byRecentStatusChange(a: { status_changed_at?: string | null; created_at: string }, b: typeof a) {
    const at = new Date(a.status_changed_at ?? a.created_at).getTime()
    const bt = new Date(b.status_changed_at ?? b.created_at).getTime()
    return bt - at
  }

  const readingBooks = (books?.filter((b) => b.status === 'reading') ?? []).slice().sort(byRecentStatusChange)
  const pausedBooks = (books?.filter((b) => b.status === 'paused') ?? []).slice().sort(byRecentStatusChange)

  // 산책기록 페이지의 통계는 완독은 제외하고 '읽는 중 + 잠시 멈춤'만 대상으로 함
  // (완독 통계는 완등기록 페이지로 이동했음).
  const myBooksCount = readingBooks.length + pausedBooks.length

  // 발걸음 수: 1페이지 = 1걸음으로 환산. 읽는 중/잠시 멈춤 책의 현재까지 읽은 페이지(current_page) 합산.
  const stepsWalked = readingBooks
    .concat(pausedBooks)
    .reduce((sum, b) => sum + (b.current_page ?? 0), 0)

  const worldMapBooks = toWorldMapBooks(books)

  const stats = [
    { label: '내가 산 책', value: myBooksCount, icon: BookOpen, color: 'text-blue-400', bg: 'bg-blue-950/40' },
    { label: '발걸음 수', value: stepsWalked.toLocaleString(), icon: Footprints, color: 'text-purple-400', bg: 'bg-purple-950/40' },
  ]

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">산책기록</h2>
      </div>

      {/* 상단 — 예전 홈: WorldMap + 통계 */}
      <div className="space-y-6 mb-10">
        <WorldMapClient books={worldMapBooks} />

        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat) => <StatCard key={stat.label} {...stat} />)}
        </div>
      </div>

      {/* 하단 — 예전 산책기록: 읽는 중 / 잠시 멈춤 목록 (완독은 완등기록으로 이동) */}
      {(!books || books.length === 0) && (
        <EmptyState title="아직 책이 없어요" subtitle="첫 번째 책을 추가해보세요 📚" />
      )}

      {books && books.length > 0 && readingBooks.length === 0 && pausedBooks.length === 0 && (
        <EmptyState title="읽는 중이거나 잠시 멈춘 책이 없어요" subtitle="완독한 책은 완등기록에서 볼 수 있어요 🚩" />
      )}

      {readingBooks.length > 0 && (
        <section className="mb-8">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">읽는 중</h3>
          <div className="columns-1 sm:columns-2 gap-4">
            {readingBooks.map((book) => <BookCard key={book.id} book={book} />)}
          </div>
        </section>
      )}

      {pausedBooks.length > 0 && (
        <section className="mb-8">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">잠시 멈춤</h3>
          <div className="columns-1 sm:columns-2 gap-4">
            {pausedBooks.map((book) => <BookCard key={book.id} book={book} />)}
          </div>
        </section>
      )}
    </div>
  )
}
