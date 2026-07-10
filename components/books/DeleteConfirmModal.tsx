'use client'

import Modal from '@/components/ui/Modal'

export default function DeleteConfirmModal({
  title,
  deleting,
  onConfirm,
  onClose,
}: {
  title: string
  deleting?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Modal onClose={onClose}>
      <h3 className="font-semibold text-gray-900 mb-2">책을 삭제할까요?</h3>
      <p className="text-sm text-gray-500 mb-5 leading-relaxed">
        <span className="font-medium text-gray-700">{title}</span>을(를) 삭제하면 되돌릴 수 없어요.
      </p>
      <div className="flex justify-end gap-2">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          취소
        </button>
        <button
          onClick={onConfirm}
          disabled={deleting}
          className="px-4 py-2 bg-red-500 text-white text-sm rounded-xl hover:bg-red-600 disabled:opacity-40 transition-colors"
        >
          {deleting ? '삭제 중…' : '삭제'}
        </button>
      </div>
    </Modal>
  )
}
