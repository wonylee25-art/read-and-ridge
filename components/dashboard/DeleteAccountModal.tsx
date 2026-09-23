'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import { 문구 } from '@/lib/copy'

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
  const canDelete = confirmText === 문구.회원탈퇴.확인문구

  async function handleConfirm() {
    if (!canDelete) return
    setDeleting(true)
    setErrorMsg(null)
    try {
      await onConfirm()
      // 로그아웃 버튼과 동일한 방식 — 서버 액션은 삭제만 하고, 이동은 여기서 처리.
      // 탈퇴 후에도 로그인 페이지 대신 예시 지형도가 있는 /dashboard로 이동.
      router.push('/dashboard')
      router.refresh()
    } catch (e) {
      setDeleting(false)
      setErrorMsg(e instanceof Error ? e.message : 문구.회원탈퇴.오류)
    }
  }

  return (
    <Modal onClose={onClose}>
        <h3 className="font-semibold text-gray-900 mb-2">{문구.회원탈퇴.제목}</h3>
        <p className="text-sm text-gray-500 mb-4 leading-relaxed">
          {문구.회원탈퇴.설명}
        </p>

        <label className="block text-xs text-gray-500 mb-1.5">
          {문구.회원탈퇴.입력안내_앞} <span className="font-semibold text-gray-700">{문구.회원탈퇴.확인문구}</span>
          {문구.회원탈퇴.입력안내_뒤}
        </label>
        <input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={문구.회원탈퇴.확인문구}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-red-200"
        />

        {errorMsg && <p className="text-xs text-red-500 mb-3">{errorMsg}</p>}

        <div className="flex justify-end gap-2 mt-3">
          <button
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-40"
          >
            {문구.공통.취소}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canDelete || deleting}
            className="px-4 py-2 bg-red-500 text-white text-sm rounded-xl hover:bg-red-600 disabled:opacity-40 transition-colors"
          >
            {deleting ? 문구.회원탈퇴.처리중 : 문구.회원탈퇴.버튼}
          </button>
        </div>
    </Modal>
  )
}
