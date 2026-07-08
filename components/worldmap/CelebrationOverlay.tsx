'use client'

import { useEffect, useRef, useState } from 'react'

// ─── 완등 세레모니 ────────────────────────────────────────────────────────────
// 책을 완독(진행률 100%로 저장)한 순간에만 잠깐 뜨는 축하 연출.
// 8비트 CLEAR! 타이포 + 폭죽 파티클 + 캐릭터 정상 댄스 루프로 구성.
// ProgressModal에서 updateProgress()가 justCompleted:true를 반환할 때만 띄운다
// (이미 완독된 책을 다시 저장하거나, 완독 없이 진행률만 바꿀 땐 뜨지 않음).

// 걷기/오르기용 캐릭터(WorldMap.tsx의 CHAR_ROWS_A/B)와는 별개로, 양팔을 번쩍 든
// 세레모니 전용 포즈 — 8열 폭이라 팔이 몸통 옆으로 뻗어나갈 공간이 있음
const DANCE_COLORS: Record<string, string> = {
  H: '#5a3a22', // 머리카락
  S: '#f1c9a5', // 피부(얼굴/손)
  B: '#4a7fc0', // 옷
  L: '#3a3a3a', // 다리
}
const DANCE_ROWS_A = [
  '..HHHH..',
  'S.SSSS.S',
  '..BBBB..',
  '.BBBBBB.',
  '..BBBB..',
  '..BBBB..',
  '.L....L.',
  '.L....L.',
]
const DANCE_ROWS_B = [
  '.SHHHHS.',
  '..SSSS..',
  '..BBBB..',
  '.BBBBBB.',
  '..BBBB..',
  '..BBBB..',
  '..LLLL..',
  '.L....L.',
]

const CONFETTI_COLORS = ['#f0c040', '#e03e2f', '#2f6fe0', '#2fb573', '#e0527a', '#8ac03f', '#ffd23e']

type ConfettiPiece = {
  left: number
  delay: number
  duration: number
  color: string
  size: number
  rotate: number
}

function makeConfetti(count: number): ConfettiPiece[] {
  return Array.from({ length: count }, () => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 1.5 + Math.random() * 1.1,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    size: 6 + Math.floor(Math.random() * 6),
    rotate: Math.random() * 360,
  }))
}

const DANCE_BLOCK = 8
const AUTO_CLOSE_MS = 2600
const FRAME_MS = 220

export default function CelebrationOverlay({
  title,
  onDone,
}: {
  title: string
  onDone: () => void
}) {
  const [frame, setFrame] = useState(0)
  // 파티클 좌표는 매 렌더마다 다시 뽑으면 등장할 때마다 위치가 튀므로 마운트 시 한 번만 고정
  const confetti = useRef(makeConfetti(46)).current

  useEffect(() => {
    const frameInterval = setInterval(() => setFrame((f) => (f + 1) % 2), FRAME_MS)
    const closeTimeout = setTimeout(onDone, AUTO_CLOSE_MS)
    return () => {
      clearInterval(frameInterval)
      clearTimeout(closeTimeout)
    }
  }, [onDone])

  const rows = frame === 0 ? DANCE_ROWS_A : DANCE_ROWS_B

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden select-none"
      style={{ background: 'rgba(8, 14, 8, 0.9)', cursor: 'pointer' }}
      onClick={onDone}
    >
      {confetti.map((c, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            top: -20,
            left: `${c.left}%`,
            width: c.size,
            height: c.size,
            background: c.color,
            transform: `rotate(${c.rotate}deg)`,
            animation: `celebration-fall ${c.duration}s ${c.delay}s ease-in forwards`,
          }}
        />
      ))}

      <div
        style={{
          fontFamily: 'monospace',
          fontSize: 44,
          fontWeight: 800,
          letterSpacing: 4,
          color: '#ffd23e',
          textShadow: '4px 4px 0 #b0791a, -2px -2px 0 #fff8dc',
          animation: 'celebration-pop 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        CLEAR!
      </div>

      <p
        style={{
          color: '#ccffcc',
          fontFamily: 'monospace',
          fontSize: 14,
          marginTop: 10,
          maxWidth: 280,
          textAlign: 'center',
        }}
      >
        {title}
      </p>
      <p style={{ color: '#7fae7f', fontFamily: 'monospace', fontSize: 11, marginTop: 4 }}>
        완등을 축하해요 🚩
      </p>

      <div
        style={{
          marginTop: 20,
          position: 'relative',
          width: rows[0].length * DANCE_BLOCK,
          height: rows.length * DANCE_BLOCK,
          animation: 'celebration-bounce 0.44s ease-in-out infinite alternate',
        }}
      >
        {rows.map((row, ri) =>
          row.split('').map((cell, ci) => {
            const color = DANCE_COLORS[cell]
            if (!color) return null
            return (
              <span
                key={`${ri}-${ci}`}
                style={{
                  position: 'absolute',
                  left: ci * DANCE_BLOCK,
                  top: ri * DANCE_BLOCK,
                  width: DANCE_BLOCK,
                  height: DANCE_BLOCK,
                  background: color,
                }}
              />
            )
          })
        )}
      </div>

      <p style={{ color: '#446644', fontFamily: 'monospace', fontSize: 10, marginTop: 24 }}>
        (탭하면 바로 닫혀요)
      </p>

      <style jsx>{`
        @keyframes celebration-fall {
          from {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          to {
            transform: translateY(110vh) rotate(360deg);
            opacity: 0.9;
          }
        }
        @keyframes celebration-pop {
          0% {
            transform: scale(0.3);
            opacity: 0;
          }
          60% {
            transform: scale(1.15);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes celebration-bounce {
          from {
            transform: translateY(0);
          }
          to {
            transform: translateY(-10px);
          }
        }
      `}</style>
    </div>
  )
}
