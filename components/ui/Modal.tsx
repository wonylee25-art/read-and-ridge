'use client'

// 배경 딤 처리 + 바깥 클릭하면 닫히는 카드형 모달의 공통 shell.
// AboutModal, DeleteAccountModal, DeleteConfirmModal이 각자 갖고 있던 동일한
// wrapper(fixed inset-0 배경 + max-w-sm 카드)를 여기로 통합.
// (worldmap/ProgressModal은 어두운 게임풍 인라인 스타일 모달이라 의도적으로 별개로 둠.)
export default function Modal({
  onClose,
  children,
  maxWidth = 'max-w-sm',
}: {
  onClose: () => void
  children: React.ReactNode
  maxWidth?: string
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-2xl p-6 ${maxWidth} w-full shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
