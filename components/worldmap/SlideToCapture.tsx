'use client'

import { useState } from 'react'
import { Camera } from 'lucide-react'

// 아이폰 "밀어서 잠금해제" 알약 트랙 + 원형 썸 비주얼은 그대로 두되, 조작은 트랙
// 전체를 한 번 누르면 바로 확정되도록 단순화함(2026.07.12, 사용자 요청 — 정확히
// 썸을 잡고 끝까지 드래그해야 하는 방식은 조작이 번거롭다는 피드백). 눌렀을 때
// 썸이 끝까지 스르륵 미끄러지는 애니메이션만 재생해 "슬라이드" 느낌을 낸다.
const TRACK_WIDTH = 220
const THUMB_SIZE = 40
const TRACK_PAD = 2
const MAX_X = TRACK_WIDTH - THUMB_SIZE - TRACK_PAD * 2

export default function SlideToCapture({
  label,
  onConfirm,
}: {
  label: string
  onConfirm: () => void
}) {
  const [confirmed, setConfirmed] = useState(false)

  function handlePress() {
    if (confirmed) return
    setConfirmed(true)
    onConfirm()
  }

  return (
    <button
      type="button"
      onClick={handlePress}
      aria-label={label}
      className="relative block rounded-full bg-amber-100 shadow-md select-none active:scale-[0.98] transition-transform"
      style={{ width: TRACK_WIDTH, height: THUMB_SIZE + TRACK_PAD * 2 }}
    >
      <span
        className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-amber-700 pointer-events-none"
        style={{ opacity: confirmed ? 0 : 1, transition: 'opacity 300ms ease-out' }}
      >
        {label}
      </span>
      <div
        className="absolute rounded-full bg-amber-400 shadow flex items-center justify-center pointer-events-none"
        style={{
          width: THUMB_SIZE,
          height: THUMB_SIZE,
          top: TRACK_PAD,
          left: TRACK_PAD,
          transform: `translateX(${confirmed ? MAX_X : 0}px)`,
          transition: 'transform 300ms ease-out',
        }}
      >
        <Camera size={18} className="text-white" />
      </div>
    </button>
  )
}
