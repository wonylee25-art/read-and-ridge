export const runtime = 'nodejs'

import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft, BookOpen, Footprints, User } from 'lucide-react'
import WorldMapClient from '@/components/worldmap/WorldMapClient'
import BookCard from '@/components/books/BookCard'
import StatCard from '@/components/dashboard/StatCard'
import EmptyState from '@/components/dashboard/EmptyState'
import { toWorldMapBooks } from '@/components/worldmap/worldmap-utils'
import { DEMO_HOME_BOOKS } from '@/lib/demo-books'
import { getNicknameFromUser } from '@/lib/nickname'
import GuestLog from '@/components/dashboard/GuestLog'
import HintBubble from '@/components/dashboard/HintBubble'
import { getGuestLog } from '@/lib/trail/guest-log'
import { isValidShareSlug } from '@/lib/trail/slug'
import { 문구 } from '@/lib/copy'

export default async function DashboardPage({
  searchParams,
}: {
  // add=1  — 책을 추가하려다(또는 남의 지도에서 "시작하기"를 눌러) 로그인하고 돌아온 길.
  //          책 추가 창을 연 채로 시작한다. (lib/auth/next.ts)
  // from   — 남의 등반지도에서 넘어왔다면 그 지도의 slug. 돌아갈 링크를 남긴다.
  searchParams: { add?: string; from?: string }
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 비로그인 — 실제 데이터 조회 없이 예시 지형도만 보여준다. 산 클릭(게이지 만져보기)
  // / 책 추가는 되지만 저장·등록은 구글 로그인으로 유도됨(WorldMapClient 내부에서 처리).
  // 아래 "읽는 중/잠시 멈춤" 카드 목록(BookCard)은 삭제·메모 등 계정 데이터를 직접
  // 다루는 액션이 많아 비로그인에서는 아예 보여주지 않는다.
  if (!user) {
    // 내가 산 책 = 상태와 무관하게 등록된 책 전부(읽는 중+잠시 멈춤+완독) (2026.07.12 변경 —
    // 예전엔 완독 통계가 완등기록 페이지로 옮겨가면서 여기서도 완독을 제외했는데,
    // "내가 산 책"은 등록한 책 전체를 세는 게 맞다는 피드백으로 다시 전체로 되돌림.
    const stepsWalked = DEMO_HOME_BOOKS.reduce((sum, b) => sum + (b.current_page ?? 0), 0)

    const demoStats = [
      { label: 문구.산책기록.통계.내가산책, value: DEMO_HOME_BOOKS.length, icon: BookOpen, color: 'text-blue-400', bg: 'bg-blue-950/40' },
      { label: 문구.산책기록.통계.발걸음수, value: stepsWalked.toLocaleString(), icon: Footprints, color: 'text-purple-400', bg: 'bg-purple-950/40' },
    ]

    return (
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{문구.산책기록.제목}</h2>
        </div>

        <div className="space-y-3 mb-10">
          <HintBubble id="demo-map">
            {문구.산책기록.팻말.예시지도}
          </HintBubble>

          <WorldMapClient books={DEMO_HOME_BOOKS} authenticated={false} />

          <div className="grid grid-cols-2 gap-3 pt-3">
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

  // 공개 지형도에 놀러 온 사람이 '맞춰보세요' 산에 남긴 답. 공개 링크를 한 번도
  // 켜지 않았거나 아무도 안 왔으면 빈 배열이고, 그때는 섹션이 아예 안 그려진다.
  const guestEntries = await getGuestLog(user.id)

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

  // 내가 산 책 = 상태와 무관하게 등록된 책 전부(읽는 중+잠시 멈춤+완독) (2026.07.12 변경 —
  // 예전엔 완독 통계가 완등기록 페이지로 옮겨가면서 여기서도 완독을 제외했는데,
  // "내가 산 책"은 등록한 책 전체를 세는 게 맞다는 피드백으로 다시 전체로 되돌림.
  const myBooksCount = books?.length ?? 0

  // 발걸음 수: 1페이지 = 1걸음으로 환산. 읽는 중/잠시 멈춤 책의 현재까지 읽은 페이지(current_page) 합산.
  const stepsWalked = readingBooks
    .concat(pausedBooks)
    .reduce((sum, b) => sum + (b.current_page ?? 0), 0)

  // 필요한 자리에 한 장씩 세우는 팻말(HintBubble)의 조건.
  // ① 책은 등록했는데 아무 산도 오르지 않은 상태 — 진도 입력 방법을 아직 모르는 것
  // ② 내 산책 지도를 아직 공개하지 않은 상태 — 공유 기능이 있다는 걸 알리는 팻말.
  //    ①과 겹치면 팻말이 두 장 서므로, 산을 하나라도 오른 뒤에 세운다.
  const nothingClimbed = (books?.length ?? 0) > 0 && !books?.some((b) => (b.current_page ?? 0) > 0)

  const { data: profile } = await supabase
    .from('profiles')
    .select('share_enabled')
    .eq('user_id', user.id)
    .maybeSingle()
  const showShareSign = (books?.length ?? 0) > 0 && !nothingClimbed && !profile?.share_enabled

  const worldMapBooks = toWorldMapBooks(books)
  // 형태가 맞는 slug일 때만 — 주소창 값을 그대로 링크로 만들지 않는다
  const fromSlug = searchParams.from && isValidShareSlug(searchParams.from) ? searchParams.from : null
  const nickname = getNicknameFromUser(user) // WorldMap PNG 캡처(정상 인증샷/완독 맵) 워터마크용

  const stats = [
    { label: 문구.산책기록.통계.내가산책, value: myBooksCount, icon: BookOpen, color: 'text-blue-400', bg: 'bg-blue-950/40' },
    { label: 문구.산책기록.통계.발걸음수, value: stepsWalked.toLocaleString(), icon: Footprints, color: 'text-purple-400', bg: 'bg-purple-950/40' },
  ]

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{문구.산책기록.제목}</h2>
      </div>

      {/* 상단 — 예전 홈: WorldMap + 통계 */}
      <div className="space-y-6 mb-10">
        {fromSlug && (
          <Link
            href={`/trail/${fromSlug}`}
            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft size={12} />
            {문구.산책기록.보던지도로돌아가기}
          </Link>
        )}

        {nothingClimbed && (
          <HintBubble id="first-progress">
            {문구.산책기록.팻말.진도적기}
          </HintBubble>
        )}

        {/* id를 새로 둔 이유 — 예전 first-summit(완등 + 공개를 섞은 문구)을 닫은 사람에게도
            공유 기능 팻말은 한 번은 보여야 한다 */}
        {showShareSign && (
          <HintBubble id="share-map">
            {문구.산책기록.팻말.지도공유_앞} (
            <User size={12} className="inline -mt-0.5" aria-label={문구.산책자증표.제목} />
            ){문구.산책기록.팻말.지도공유_뒤}
          </HintBubble>
        )}

        <WorldMapClient books={worldMapBooks} nickname={nickname} initialAddOpen={searchParams.add === '1'} />

        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat) => <StatCard key={stat.label} {...stat} />)}
        </div>
      </div>

      {/* 다녀간 사람들 — 내가 앱을 다시 열었을 때 기다리고 있는 것 */}
      <GuestLog entries={guestEntries} />

      {/* 하단 — 예전 산책기록: 읽는 중 / 잠시 멈춤 목록 (완독은 완등기록으로 이동) */}
      {(!books || books.length === 0) && (
        <EmptyState title={문구.산책기록.빈화면_책없음.제목} subtitle={문구.산책기록.빈화면_책없음.부제} />
      )}

      {books && books.length > 0 && readingBooks.length === 0 && pausedBooks.length === 0 && (
        <EmptyState title={문구.산책기록.빈화면_읽는책없음.제목} subtitle={문구.산책기록.빈화면_읽는책없음.부제} />
      )}

      {readingBooks.length > 0 && (
        <section className="mb-8">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{문구.산책기록.목록_읽는중}</h3>
          <div className="columns-1 sm:columns-2 gap-4">
            {readingBooks.map((book) => <BookCard key={book.id} book={book} />)}
          </div>
        </section>
      )}

      {pausedBooks.length > 0 && (
        <section className="mb-8">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{문구.산책기록.목록_잠시멈춤}</h3>
          <div className="columns-1 sm:columns-2 gap-4">
            {pausedBooks.map((book) => <BookCard key={book.id} book={book} />)}
          </div>
        </section>
      )}
    </div>
  )
}
