import { createClient } from '@/lib/supabase/server'
import { BookOpen, Mountain, CheckCircle, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import WorldMapClient from '@/components/worldmap/WorldMapClient'
import type { WorldMapBook } from '@/components/worldmap/WorldMap'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: books }, { data: hikes }] = await Promise.all([
    supabase
      .from('books')
      .select('id, title, total_pages, current_page, status, kdc')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: true }), // 등록 순서 (타임라인 고정)
    supabase
      .from('hikes')
      .select('id, mountain, date, distance_km, elevation_m')
      .eq('user_id', user!.id)
      .order('date', { ascending: false }),
  ])

  const readingBooks = books?.filter((b) => b.status === 'reading') ?? []
  const completedBooks = books?.filter((b) => b.status === 'completed') ?? []
  const totalHikeKm = hikes?.reduce((s, h) => s + (h.distance_km ?? 0), 0) ?? 0

  const worldMapBooks: WorldMapBook[] = (books ?? []).map((b) => ({
    id: b.id,
    title: b.title,
    total_pages: b.total_pages,
    current_page: b.current_page,
    status: b.status as WorldMapBook['status'],
    kdc: b.kdc ?? null,
  }))

  const stats = [
    { label: '읽는 중', value: readingBooks.length, icon: BookOpen, color: 'text-blue-400', bg: 'bg-blue-950/40' },
    { label: '완독', value: completedBooks.length, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-950/40' },
    { label: '등산 횟수', value: hikes?.length ?? 0, icon: Mountain, color: 'text-orange-400', bg: 'bg-orange-950/40' },
    { label: '총 거리 km', value: totalHikeKm.toFixed(1), icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-950/40' },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* World Map — 메인 화면 */}
      <WorldMapClient books={worldMapBooks} />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className={`inline-flex p-2 rounded-xl ${bg} mb-2`}>
              <Icon size={16} className={color} />
            </div>
            <div className="text-xl font-bold text-gray-900">{value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Recent sections */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Recent books */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 text-sm">읽는 중</h3>
            <Link href="/dashboard/books" className="text-xs text-gray-400 hover:text-gray-700">
              전체 →
            </Link>
          </div>
          {readingBooks.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">읽는 중인 책이 없어요</p>
          ) : (
            <ul className="space-y-3">
              {readingBooks.slice(0, 4).map((book) => {
                const pct = book.total_pages
                  ? Math.round((book.current_page / book.total_pages) * 100)
                  : 0
                return (
                  <li key={book.id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-gray-800 truncate max-w-[160px]">
                        {book.title}
                      </span>
                      <span className="text-gray-400 shrink-0 ml-2">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Recent hikes */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 text-sm">최근 등산</h3>
            <Link href="/dashboard/hikes" className="text-xs text-gray-400 hover:text-gray-700">
              전체 →
            </Link>
          </div>
          {!hikes || hikes.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">등산 기록이 없어요</p>
          ) : (
            <ul className="space-y-3">
              {hikes.slice(0, 4).map((hike) => (
                <li key={hike.id} className="flex justify-between items-center">
                  <div>
                    <div className="text-xs font-medium text-gray-800">{hike.mountain}</div>
                    <div className="text-xs text-gray-400">{hike.date}</div>
                  </div>
                  <div className="text-right text-xs text-gray-400">
                    {hike.distance_km && <div>{hike.distance_km} km</div>}
                    {hike.elevation_m && <div>{hike.elevation_m} m</div>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
