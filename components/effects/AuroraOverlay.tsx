'use client'

import { useEffect, useRef } from 'react'

// 오로라 이스터에그 — 개발자가 지정한 책(lib/aurora-books.ts)을 갤러리에 추가한
// "그 순간"에만 WorldMap 컨테이너 안에서만 10초간 재생되는 숨겨진 연출.
// WorldMap 본체(산/캐릭터/구름)와 같은 렌더링 방식(캔버스 + 블록 단위 픽셀)을 그대로
// 따라서, CSS blur가 들어간 부드러운 그라데이션 대신 굵은 픽셀 블록으로 뭉게뭉게
// 움직이는 오로라를 그린다 — WorldMap 산의 "1픽셀 = 10px" 그리드(PX)와 셀 크기를
// 맞춰서 같은 세계관의 이펙트처럼 보이게 함.
// 일회성(재생 후 다시 안 뜸)이며 공유 대상이 아니라 순전히 개인적인 발견의 순간이라,
// 별도 상태 저장 없이 부모(WorldMap)가 이 컴포넌트를 마운트하는 것 자체로 트리거하고
// 재생이 끝나면 스스로 onDone을 불러 언마운트를 요청한다.

const DURATION_MS = 10000
const CELL = 10 // WorldMap.tsx의 PX(산 1픽셀 크기)와 동일 — 같은 그리드 느낌

// 초록(위) → 보라(아래) — 완독 깃발의 AURORA_FLAG_COLORS와 같은 계열
const TOP_RGB: [number, number, number] = [64, 224, 160]
const BOTTOM_RGB: [number, number, number] = [130, 90, 230]

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

type Band = {
  centerRow: number // 기준 중심 행(위에서부터)
  halfHeight: number // 중심에서 위아래로 퍼지는 행 수
  speed: number // 물결 속도
  colFreq: number // 가로 방향 물결 주기(칸마다 위상차)
  phase: number
  ampRows: number // 위아래로 넘실거리는 진폭(행 단위)
}

// 하늘 쪽(위)에 걸쳐 세 겹이 서로 다른 속도로 물결치며 겹쳐 보이게 — 산 몸통까지는
// 안 내려오고 배경(하늘~산 위쪽)에 머무는 정도로 센터/반높이를 잡음.
const BANDS: Band[] = [
  { centerRow: 6, halfHeight: 9, speed: 0.9, colFreq: 0.35, phase: 0, ampRows: 2.2 },
  { centerRow: 13, halfHeight: 11, speed: 1.25, colFreq: 0.28, phase: 2.1, ampRows: 2.6 },
  { centerRow: 20, halfHeight: 12, speed: 1.05, colFreq: 0.4, phase: 4.4, ampRows: 2.4 },
]

// 부드러운 그라데이션 대신 몇 단계로 끊어진 알파값을 써서(3단계) 픽셀아트 특유의
// "밴딩된" 느낌을 냄 — 매끄러운 블러가 아니라 계단식으로 흐려지는 블록.
function bandAlphaStep(distRatio: number): number {
  if (distRatio < 0.4) return 0.5
  if (distRatio < 0.75) return 0.3
  if (distRatio < 1) return 0.12
  return 0
}

export default function AuroraOverlay({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    const parent = canvas?.parentElement
    if (!canvas || !parent) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.imageSmoothingEnabled = false

    function syncSize() {
      if (!canvas || !parent) return
      canvas.width = parent.clientWidth
      canvas.height = parent.clientHeight
    }
    syncSize()
    const ro = new ResizeObserver(syncSize)
    ro.observe(parent)

    const start = performance.now()

    function draw(now: number) {
      if (!canvas) return
      const elapsed = now - start
      if (elapsed >= DURATION_MS) {
        ctx!.clearRect(0, 0, canvas.width, canvas.height)
        onDone()
        return
      }

      const t = elapsed / 1000
      const p = elapsed / DURATION_MS
      // 8%까지 페이드인, 82%부터 페이드아웃 — CSS 버전과 동일한 엔벨로프
      const fade = p < 0.08 ? p / 0.08 : p > 0.82 ? Math.max(0, (1 - p) / 0.18) : 1

      ctx!.clearRect(0, 0, canvas.width, canvas.height)

      const rows = Math.ceil(canvas.height / CELL)
      const cols = Math.ceil(canvas.width / CELL)

      BANDS.forEach((band) => {
        for (let col = 0; col < cols; col++) {
          const wave = Math.sin(t * band.speed + col * band.colFreq + band.phase)
          const centerRow = band.centerRow + wave * band.ampRows
          const from = Math.floor(centerRow - band.halfHeight)
          const to = Math.ceil(centerRow + band.halfHeight)
          for (let row = Math.max(0, from); row <= Math.min(rows - 1, to); row++) {
            const distRatio = Math.abs(row - centerRow) / band.halfHeight
            const alpha = bandAlphaStep(distRatio) * fade
            if (alpha <= 0.01) continue
            const colorT = Math.min(1, Math.max(0, row / rows))
            const r = lerp(TOP_RGB[0], BOTTOM_RGB[0], colorT)
            const g = lerp(TOP_RGB[1], BOTTOM_RGB[1], colorT)
            const b = lerp(TOP_RGB[2], BOTTOM_RGB[2], colorT)
            ctx!.fillStyle = `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${alpha.toFixed(3)})`
            ctx!.fillRect(col * CELL, row * CELL, CELL, CELL)
          }
        }
      })

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
    }
    // onDone은 최초 마운트 시점 것만 캡처해서 씀 — 컴포넌트는 한 번 재생되고
    // 언마운트되는 일회성이라 매 렌더 갱신될 필요가 없음.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-[15] pointer-events-none"
      style={{ mixBlendMode: 'screen', imageRendering: 'pixelated' }}
      aria-hidden="true"
    />
  )
}
