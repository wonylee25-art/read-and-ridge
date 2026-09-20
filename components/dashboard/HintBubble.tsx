'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

// 막히는 자리에 한 줄씩 뜨는 안내.
//
// 처음 들어온 사람에게 화면을 흐리게 덮고 3~4장을 순서대로 넘기는 방식은 쓰지 않는다.
// ① 이 앱은 "설명 대신 예시 지형도를 먼저 보여준다"는 선택을 이미 했고, 그 위에
// 오버레이를 덮으면 스스로 고른 방식을 가리는 셈이다. ② 사람이 막히는 지점은 기능을
// 못 찾아서가 아니라 아직 책이 없어서다 — 산이 0개인 화면에서 "여기를 누르면 진도를
// 입력해요"라고 가리켜봐야 가리킬 산이 없다.
//
// 그래서 한꺼번에가 아니라, 그 안내가 실제로 필요해지는 순간에 한 장씩 나타난다.
// 한 번 닫으면 그 기기에서는 다시 뜨지 않는다(localStorage).
const PREFIX = 'sanchaek:hint:'

export default function HintBubble({ id, children }: { id: string; children: React.ReactNode }) {
  // 서버 렌더에는 localStorage가 없다. 처음엔 무조건 숨겼다가 마운트 후에 결정해야
  // 이미 닫은 안내가 새로고침마다 한 번씩 번쩍이지 않는다.
  const [show, setShow] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(PREFIX + id) !== 'done') setShow(true)
    } catch {
      setShow(true) // localStorage를 못 쓰는 브라우저 — 안내는 보여주되 기억만 못 한다
    }
  }, [id])

  if (!show) return null

  function dismiss() {
    setShow(false)
    try {
      localStorage.setItem(PREFIX + id, 'done')
    } catch {
      // 못 적어도 이번 화면에서는 닫힌다
    }
  }

  return (
    <div className="flex items-start gap-2 rounded-xl bg-gray-900/90 px-3.5 py-2.5 text-white shadow-sm">
      <p className="flex-1 text-[13px] leading-relaxed">{children}</p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="안내 닫기"
        className="shrink-0 -mr-1 rounded-md p-1 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  )
}
