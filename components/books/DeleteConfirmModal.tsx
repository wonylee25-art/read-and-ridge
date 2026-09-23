'use client'

import Modal from '@/components/ui/Modal'
import { 문구 } from '@/lib/copy'

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
      <h3 className="font-semibold text-gray-900 mb-2">{문구.책삭제.제목}</h3>
      <p className="text-sm text-gray-500 mb-5 leading-relaxed">
        <span className="font-medium text-gray-700">{title}</span>
        {문구.책삭제.설명_뒤}
      </p>
      <div className="flex justify-end gap-2">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          {문구.공통.취소}
        </button>
        <button
          onClick={onConfirm}
          disabled={deleting}
          className="px-4 py-2 bg-red-500 text-white text-sm rounded-xl hover:bg-red-600 disabled:opacity-40 transition-colors"
        >
          {deleting ? 문구.책삭제.삭제중 : 문구.책삭제.삭제}
        </button>
      </div>
    </Modal>
  )
}
