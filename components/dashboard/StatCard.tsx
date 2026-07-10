import type { LucideIcon } from 'lucide-react'

// 산책기록/완등기록 페이지 상단에 나란히 놓이는 통계 카드.
// 두 페이지가 같은 마크업을 각자 하드코딩하고 있던 걸 통합.
export default function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
}: {
  label: string
  value: string | number
  icon: LucideIcon
  color: string
  bg: string
}) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
      <div className={`inline-flex p-2 rounded-xl ${bg} mb-2`}>
        <Icon size={16} className={color} />
      </div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-400 mt-0.5">{label}</div>
    </div>
  )
}
