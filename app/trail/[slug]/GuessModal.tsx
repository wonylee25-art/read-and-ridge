'use client'

import { useState } from 'react'
import { Shuffle } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { submitGuess, type GuessResult } from './guess-actions'

// 맞히기 창 제목 — "이 산"이라고만 하면 누구의 산인지가 빠져서, 놀러 온 사람 입장의
// 주인공(= 지형도 주인)이 문장에 안 들어온다. 닉네임을 넣어 그 사람 이야기로 만든다.
// 산마다 다른 문구가 뜨되 책 id로 고정 — 같은 산은 언제 눌러도 같은 질문이다.
// '산 책'은 이 앱이 이미 쓰는 말장난(샀다/산[山]).
const TITLES: Record<'reading' | 'paused', ((n: string) => string)[]> = {
  reading: [
    (n) => `${n}님이 지금 오르고 있는 산은?`,
    (n) => `${n}님은 어떤 산을 오르고 있을까요?`,
    (n) => `${n}님이 산 책은 무엇일까요?`,
  ],
  paused: [
    (n) => `${n}님이 잠깐 멈춰 선 산은?`,
    (n) => `${n}님이 산 책은 무엇일까요?`,
    (n) => `${n}님이 오르다 만 산, 무엇일까요?`,
  ],
}

// 책 id로 문구를 고정 배정 (worldmap의 hashString과 같은 방식)
function pickTitle(nickname: string, status: string, bookId: string): string {
  const list = TITLES[status === 'paused' ? 'paused' : 'reading']
  let h = 0
  for (let i = 0; i < bookId.length; i++) h = ((h << 5) - h + bookId.charCodeAt(i)) | 0
  return list[Math.abs(h) % list.length](nickname)
}

export default function GuessModal({
  slug,
  bookId,
  nickname,
  status,
  hints = [],
  onClose,
}: {
  slug: string
  bookId: string
  nickname: string
  status: string
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
      <h2 className="text-lg font-bold text-gray-900">{pickTitle(nickname, status, bookId)}</h2>
      <p className="text-sm text-gray-500 mt-1">
        이름표를 살짝 떼어뒀어요. 다 오르고 나면 저절로 드러납니다.
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
              쪽지 한 장 더 ({hintIndex + 1}/{hints.length})
            </button>
          )}
        </div>
      )}

      {correct ? (
        <div className="mt-5 text-center">
          <p className="text-2xl">🎉</p>
          <p className="mt-2 text-sm text-gray-500">정상 도착! {nickname}님이 산 책은</p>
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
            placeholder="무슨 책일까요?"
            autoFocus
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            placeholder="이름도 남겨볼까요? (안 남겨도 괜찮아요)"
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          />

          {result && !correct && (
            <p className="text-sm text-gray-500">
              {result.ok
                ? '음— 그 산은 아니에요. 한 번 더!'
                : result.reason === 'rate_limited'
                  ? '잠깐 숨 좀 돌리고 다시 올라볼까요.'
                  : '지금은 오를 수 없는 산이에요.'}
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
              {sending ? '오르는 중…' : '이 책인 것 같아요'}
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
