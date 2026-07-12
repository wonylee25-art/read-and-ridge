export const runtime = 'nodejs'

import { createClient } from '@/lib/supabase/server'
import BookCard from '@/components/books/BookCard'
import AddBookBar from '@/components/books/AddBookBar'
import StatCard from '@/components/dashboard/StatCard'
import EmptyState from '@/components/dashboard/EmptyState'
import WorldMap from '@/components/worldmap/WorldMap'
import { TARGET_TROPHY, DISTANCE_PER_PAGE_M, toWorldMapBooks } from '@/components/worldmap/worldmap-utils'
import { getNicknameFromUser } from '@/lib/nickname'
import { Mountain, TrendingUp } from 'lucide-react'

export default async function HikesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 비로그인 — 완등기록은 정적 예시로만 보여준다. 가짜 완독 산을 보여주는 대신,
  // 로그인 후 실제로 완독했을 때 보게 될 "빈 완등기록" 화면(지도 안내 문구 + 아래
  // EmptyState)을 그대로 재사용 — 로그인한 사용자가 책이 0권일 때와 완전히 동일한 모습.
  if (!user) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">완등기록</h2>
        </div>

        <div className="space-y-6 mb-10">
          <WorldMap books={[]} mode="trophy" />

          <div className="grid grid-cols-2 gap-3">
            <StatCard label="완등 기록" value={0} icon={Mountain} color="text-green-400" bg="bg-green-950/40" />
            <StatCard label="완등 거리 km" value="0.0" icon={TrendingUp} color="text-purple-400" bg="bg-purple-950/40" />
          </div>
        </div>

        <EmptyState title="아직 완등기록이 없어요" subtitle="완등한 산이 이곳으로 옮겨옵니다 🚩" />
      </div>
    )
  }

  const { data: books } = await supabase
    .from('books')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })

  const totalKm =
    ((books ?? []).reduce((sum, b) => sum + (b.total_pages ?? 0), 0) * DISTANCE_PER_PAGE_M) / 1000

  // 완등기록의 WorldMap은 정상석 전용: 산/나무/모닥불/깃발만 보여주고
  // 캐릭터·전경/배경 랜덤 선정 로직은 모두 비활성화된 mode="trophy" 사용.
  // 책 추가는 WorldMap 내부(해/별 클릭) 대신, 산책기록 페이지와 동일한 AddBookBar를
  // 별도로 얹어서 지원 — 완등기록 화면에서도 새 책을 바로 등록할 수 있게 함.
  const worldMapBooks = toWorldMapBooks(books)
  const nickname = getNicknameFromUser(user) // WorldMap PNG 캡처(완독 맵) 워터마크용

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">완등기록</h2>
      </div>

      <div className="space-y-6 mb-10">
        <AddBookBar variant="trophy" />
        <WorldMap books={worldMapBooks} mode="trophy" nickname={nickname} />
        {books && books.length > TARGET_TROPHY && (
          <p className="text-xs text-gray-400 -mt-4">
            최근 완등한 {TARGET_TROPHY}권만 지도에 표시돼요. 전체 기록은 아래 목록에서 확인하세요.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <StatCard label="완등 기록" value={books?.length ?? 0} icon={Mountain} color="text-green-400" bg="bg-green-950/40" />
          <StatCard label="완등 거리 km" value={totalKm.toFixed(1)} icon={TrendingUp} color="text-purple-400" bg="bg-purple-950/40" />
        </div>
      </div>

      {(!books || books.length === 0) ? (
        <EmptyState title="아직 완등기록이 없어요" subtitle="완등한 산이 이곳으로 옮겨옵니다 🚩" />
      ) : (
        <div className="columns-1 sm:columns-2 gap-4">
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  )
}
