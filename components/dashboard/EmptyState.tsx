// 목록이 비었을 때 보여주는 공통 안내 문구. 산책기록/완등기록 페이지에서
// 각자 같은 모양의 마크업을 반복하고 있던 걸 통합.
export default function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="text-center py-20 text-gray-400">
      <p className="text-lg">{title}</p>
      <p className="text-sm mt-1">{subtitle}</p>
    </div>
  )
}
