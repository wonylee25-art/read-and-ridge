import { createClient } from '@/lib/supabase/server'
import AddHikeForm from '@/components/hikes/AddHikeForm'
import { deleteHike } from './actions'
import { Mountain, Clock, Ruler, TrendingUp, Trash2 } from 'lucide-react'

function formatDuration(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h}시간 ${m > 0 ? m + '분' : ''}` : `${m}분`
}

export default async function HikesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: hikes } = await supabase
    .from('hikes')
    .select('*')
    .eq('user_id', user!.id)
    .order('date', { ascending: false })

  const totalKm = hikes?.reduce((s, h) => s + (h.distance_km ?? 0), 0) ?? 0
  const totalMin = hikes?.reduce((s, h) => s + (h.duration_min ?? 0), 0) ?? 0

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">등산 기록</h2>
          <p className="text-gray-400 text-sm mt-1">총 {hikes?.length ?? 0}회</p>
        </div>
        <AddHikeForm />
      </div>

      {/* Summary bar */}
      {hikes && hikes.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: '총 거리', value: `${totalKm.toFixed(1)} km`, icon: Ruler },
            { label: '총 시간', value: formatDuration(totalMin), icon: Clock },
            { label: '최고 고도', value: `${Math.max(...hikes.map((h) => h.elevation_m ?? 0))} m`, icon: TrendingUp },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm text-center">
              <Icon size={16} className="text-gray-400 mx-auto mb-1" />
              <div className="text-lg font-bold text-gray-900">{value}</div>
              <div className="text-xs text-gray-400">{label}</div>
            </div>
          ))}
        </div>
      )}

      {(!hikes || hikes.length === 0) ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg">아직 등산 기록이 없어요</p>
          <p className="text-sm mt-1">첫 번째 등산을 기록해보세요 ⛰️</p>
        </div>
      ) : (
        <div className="space-y-3">
          {hikes.map((hike) => (
            <div key={hike.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <Mountain size={16} className="text-orange-400" />
                    <h4 className="font-semibold text-gray-900">{hike.mountain}</h4>
                    {hike.trail && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        {hike.trail}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mt-1">{hike.date}</p>
                </div>
                <form action={() => deleteHike(hike.id)}>
                  <button type="submit" className="text-gray-300 hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </form>
              </div>

              <div className="flex gap-4 mt-3 text-xs text-gray-500">
                {hike.distance_km && (
                  <span className="flex items-center gap-1">
                    <Ruler size={12} /> {hike.distance_km} km
                  </span>
                )}
                {hike.elevation_m && (
                  <span className="flex items-center gap-1">
                    <TrendingUp size={12} /> {hike.elevation_m} m
                  </span>
                )}
                {hike.duration_min && (
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> {formatDuration(hike.duration_min)}
                  </span>
                )}
              </div>

              {hike.memo && (
                <p className="text-sm text-gray-500 mt-3 border-t border-gray-50 pt-3">{hike.memo}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
