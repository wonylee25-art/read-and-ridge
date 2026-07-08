'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeleteAccountModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  const router = useRouter()
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const canDelete = confirmText === '탈퇴합니다'

  async function handleConfirm() {
    if (!canDelete) return
    setDeleting(true)
    setErrorMsg(null)
    try {
      await onConfirm()
      // 로그아웃 버튼과 동일한 방식 — 서버 액션은 삭제만 하고, 이동은 여기서 처리.
      router.push('/login')
      router.refresh()
    } catch (e) {
      setDeleting(false)
      setErrorMsg(e instanceof Error ? e.message : '탈퇴 처리 중 문제가 발생했어요.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-semibold text-gray-900 mb-2">정말 탈퇴하시겠어요?</h3>
        <p className="text-sm text-gray-500 mb-4 leading-relaxed">
          지금까지 기록한 모든 책·독서 진행률·완독 기록이 즉시 삭제되고, 계정도 함께
          삭제돼요. 이 작업은 되돌릴 수 없어요.
        </p>

        <label className="block text-xs text-gray-500 mb-1.5">
          계속하려면 아래에 <span className="font-semibold text-gray-700">탈퇴합니다</span>를 입력해주세요.
        </label>
        <input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="탈퇴합니다"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-red-200"
        />

        {errorMsg && <p className="text-xs text-red-500 mb-3">{errorMsg}</p>}

        <div className="flex justify-end gap-2 mt-3">
          <button
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-40"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canDelete || deleting}
            className="px-4 py-2 bg-red-500 text-white text-sm rounded-xl hover:bg-red-600 disabled:opacity-40 transition-colors"
          >
            {deleting ? '탈퇴 처리 중…' : '회원 탈퇴'}
          </button>
        </div>
      </div>
    </div>
  )
}
