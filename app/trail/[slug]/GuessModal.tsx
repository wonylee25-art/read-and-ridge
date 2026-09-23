'use client'

import { useState } from 'react'
import { Shuffle } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { submitGuess, type GuessResult } from './guess-actions'
import { 문구 } from '@/lib/copy'

// 맞히기 창 제목 — "이 산"이라고만 하면 누구의 산인지가 빠져서, 놀러 온 사람 입장의
// 주인공(= 지형도 주인)이 문장에 안 들어온다. 닉네임을 넣어 그 사람 이야기로 만든다.
// 산마다 다른 문구가 뜨되 책 id로 고정 — 같은 산은 언제 눌러도 같은 질문이다.
// '산 책'은 이 앱이 이미 쓰는 말장난(샀다/산[山]).
const TITLES: Record<'reading' | 'paused', ((n: string) => string)[]> = {
  reading: 문구.맞히기.제목_읽는중,
  paused: 문구.맞히기.제목_잠시멈춤,
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
  onReveal,
}: {
  slug: string
  bookId: string
  nickname: string
  status: string
  hints?: string[]
  onClose: () => void
  /** 맞혔을 때 — 창을 닫으면서 지도의 이름표를 넘긴다. 연출의 무대는 모달이 아니라
   *  지도여야 해서, 정답을 받은 즉시가 아니라 '지도에서 보기'를 눌렀을 때 호출한다. */
  onReveal?: (bookId: string, title: string) => void
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
      {!correct && (
        <p className="text-sm text-gray-500 mt-1">
          {문구.맞히기.부제}
        </p>
      )}

      {/* 맞힌 뒤에는 힌트도 접는다 — 이미 답을 아는 사람에게 쪽지를 더 내밀 이유가 없다 */}
      {!correct && hints.length > 0 && (
        <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5">
          <p className="text-sm text-amber-900">{hints[hintIndex]}</p>
          {hints.length > 1 && (
            <button
              type="button"
              onClick={() => setHintIndex((i) => (i + 1) % hints.length)}
              className="mt-1.5 flex items-center gap-1 text-[11px] text-amber-700 hover:text-amber-900 transition-colors"
            >
              <Shuffle size={11} />
              {문구.맞히기.쪽지더(hintIndex + 1, hints.length)}
            </button>
          )}
        </div>
      )}

      {correct ? (
        <div className="mt-5 text-center">
          <p className="text-base font-bold text-gray-900">{문구.맞히기.정답_제목}</p>
          {/* 창 제목이 이미 "◯◯님이 산 책은 무엇일까요?"인 경우가 있어 닉네임을
              한 번 더 넣으면 같은 말이 두 줄 반복된다. */}
          <p className="mt-3 text-sm text-gray-500">{문구.맞히기.정답_이산의이름은}</p>
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
            placeholder={문구.맞히기.답_예시}
            autoFocus
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            placeholder={문구.맞히기.이름_예시}
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          />

          {result && !correct && (
            <p className="text-sm text-gray-500">
              {result.ok
                ? 문구.맞히기.틀림
                : result.reason === 'rate_limited'
                  ? 문구.맞히기.너무빠름
                  : 문구.맞히기.맞힐수없음}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-300 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              {문구.공통.닫기}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!guess.trim() || sending}
              className="flex-1 rounded-xl bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-40"
            >
              {sending ? 문구.맞히기.보내는중 : 문구.맞히기.보내기}
            </button>
          </div>
        </div>
      )}

      {correct && (
        <button
          type="button"
          onClick={() => {
            if (result?.ok && result.title) onReveal?.(bookId, result.title)
            onClose()
          }}
          className="mt-5 w-full rounded-xl bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          {문구.맞히기.지도에서보기}
        </button>
      )}
    </Modal>
  )
}
