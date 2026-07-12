'use client'

import { useRef, useState } from 'react'
import { Camera } from 'lucide-react'

// 아이폰 "밀어서 잠금해제" 알약 트랙 + 원형 썸 비주얼은 그대로 두되, 조작은 트랙
// 전체를 한 번 누르면 바로 확정되도록 단순화함(2026.07.12, 사용자 요청 — 정확히
// 썸을 잡고 끝까지 드래그해야 하는 방식은 조작이 번거롭다는 피드백). 눌렀을 때
// 썸이 끝까지 스르륵 미끄러지는 애니메이션만 재생해 "슬라이드" 느낌을 낸다.
//
// 라벨 글씨를 메뉴바 제목("산책기록" 등, text-2xl font-bold)과 같은 크기로 키우고
// 양옆 여백은 기존의 약 1/3로 좁혔었으나(2026.07.12), 다시 너무 크다는 피드백으로
// 그 크기의 약 절반(text-2xl(24px) → text-xs(12px))으로 줄이고 여백도 그에 맞춰
// 절반으로 축소(2026.07.12). 트랙은 고정 폭 대신 라벨 내용에 맞춰 자연스럽게
// 늘어나는 구조 유지. 슬라이드 거리(MAX_X)는 클릭 시점에 실제 렌더된 버튼 폭을
// 측정해서 계산한다.
const THUMB_SIZE = 40
const TRACK_PAD = 2
const THUMB_TEXT_GAP = 5 // 썸-텍스트 사이 여백 — 직전 값의 약 1/2
const TEXT_RIGHT_PAD = 11 // 텍스트-오른쪽 끝 여백 — 직전 값의 약 1/2

export default function SlideToCapture({
  label,
  onConfirm,
}: {
  label: string
  onConfirm: () => void
}) {
  const trackRef = useRef<HTMLButtonElement>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [maxX, setMaxX] = useState(0)

  function handlePress() {
    if (confirmed) return
    if (trackRef.current) {
      setMaxX(trackRef.current.offsetWidth - THUMB_SIZE - TRACK_PAD * 2)
    }
    setConfirmed(true)
    onConfirm()
  }

  return (
    <button
      ref={trackRef}
      type="button"
      onClick={handlePress}
      aria-label={label}
      className="relative inline-flex items-center rounded-full bg-amber-100 shadow-md select-none active:scale-[0.98] transition-transform"
      style={{
        height: THUMB_SIZE + TRACK_PAD * 2,
        paddingLeft: THUMB_SIZE + TRACK_PAD * 2 + THUMB_TEXT_GAP,
        paddingRight: TEXT_RIGHT_PAD,
      }}
    >
      <span
        className="text-xs font-bold text-amber-800 whitespace-nowrap pointer-events-none"
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
          transform: `translateX(${confirmed ? maxX : 0}px)`,
          transition: 'transform 300ms ease-out',
        }}
      >
        <Camera size={18} className="text-white" />
      </div>
    </button>
  )
}
