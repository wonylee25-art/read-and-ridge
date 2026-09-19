'use client'

import { useState } from 'react'
import { Shuffle } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { submitGuess, type GuessResult } from './guess-actions'

export default function GuessModal({
  slug,
  bookId,
  hints = [],
  onClose,
}: {
  slug: string
  bookId: string
  hints?: string[]
  onClose: () => void
}) {
  const [guess, setGuess] = useState('')
  const [name, setName] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<GuessResult | null>(null)
  // 힌트는 한 번에 하나만 — 누를 때마다 다음 힌트로 넘어간다(끝나면 처음으로).
  // 셋을 한꺼번에 늘어놓으면 너무 쉬워지고, 화면도 힌트가 다 차지한다.
  const [hintIndex, setHintIndex] = useState(0)

  async function handleSubmit() {
    if (!guess.trim() || sending) return
    setSending(true)
    try {
      setResult(await submitGuess(slug, bookId, guess, name))
    } catch {
      setResult({ ok: false, reason: 'failed' })
    } finally {
      setSending(false)
    }
  }

  const correct = result?.ok && result.correct

  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-bold text-gray-900">이 산, 무슨 책일까요?</h2>
      <p className="text-sm text-gray-500 mt-1">
        주인이 제목을 가려뒀어요. 완독하면 자동으로 공개됩니다.
      </p>

      {hints.length > 0 && (
        <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5">
          <p className="text-sm text-amber-900">{hints[hintIndex]}</p>
          {hints.length > 1 && (
            <button
              type="button"
              onClick={() => setHintIndex((i) => (i + 1) % hints.length)}
              className="mt-1.5 flex items-center gap-1 text-[11px] text-amber-700 hover:text-amber-900 transition-colors"
            >
              <Shuffle size={11} />
              다른 힌트 ({hintIndex + 1}/{hints.length})
            </button>
          )}
        </div>
      )}

      {correct ? (
        <div className="mt-5 text-center">
          <p className="text-2xl">🎉</p>
          <p className="mt-2 text-sm text-gray-500">정답이에요</p>
          <p className="mt-1 text-base font-bold text-gray-900">{result?.ok && result.title}</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <input
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit()
            }}
            maxLength={100}
            placeholder="책 제목"
            autoFocus
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            placeholder="이름 (선택)"
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          />

          {result && !correct && (
            <p className="text-sm text-gray-500">
              {result.ok
                ? '땡! 다시 한번 맞혀보세요.'
                : result.reason === 'rate_limited'
                  ? '조금 쉬었다가 다시 시도해주세요.'
                  : '지금은 맞힐 수 없는 산이에요.'}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-300 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              닫기
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!guess.trim() || sending}
              className="flex-1 rounded-xl bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-40"
            >
              {sending ? '확인 중…' : '맞혀보기'}
            </button>
          </div>
        </div>
      )}

      {correct && (
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          닫기
        </button>
      )}
    </Modal>
  )
}
