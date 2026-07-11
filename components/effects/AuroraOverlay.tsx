'use client'

import { useEffect, useRef } from 'react'

// 오로라 이스터에그 — 개발자가 지정한 책(lib/aurora-books.ts)을 갤러리에 추가한
// "그 순간"에만 WorldMap 컨테이너 안에서만 10초간 재생되는 숨겨진 연출.
// WorldMap 본체(산/캐릭터/구름)와 같은 렌더링 방식(캔버스 + 블록 단위 픽셀)을 그대로
// 따라서, 얇은 대각선 선 5개를 한 다발로 묶어 오른쪽에서 왼쪽으로 가로질러 흐르는
// 모습으로 그린다 —
// WorldMap 산의 "1픽셀 = 10px" 그리드(PX)와 셀 크기를 맞춰서 같은 세계관의
// 이펙트처럼 보이게 함.
// 일회성(재생 후 다시 안 뜸)이며 공유 대상이 아니라 순전히 개인적인 발견의 순간이라,
// 별도 상태 저장 없이 부모(WorldMap)가 이 컴포넌트를 마운트하는 것 자체로 트리거하고
// 재생이 끝나면 스스로 onDone을 불러 언마운트를 요청한다.

const DURATION_MS = 10000
const CELL = 10 // WorldMap.tsx의 PX(산 1픽셀 크기)와 동일 — 같은 그리드 느낌

// 오로라가 산/땅을 가로지르지 않도록, WorldMap.tsx의 실제 치수(CANVAS_H=440,
// GROUND_H=52)와 가장 큰 산(level 4, steps=11 → 높이 (11+2)*PX=130px)을 기준으로
// "어떤 산 꼭대기보다도 확실히 위"인 행 수만 계산해서 그 이상은 절대 안 그림.
// 이 값은 WorldMap.tsx의 치수가 바뀌면 같이 맞춰줘야 함(둘이 직접 import하진 않음 —
// AuroraOverlay는 WorldMap 전용이 아니어도 되는 범용 이펙트로 두기 위해 하드코딩).
const SKY_ROWS_LIMIT = 24 // 240px — 가장 높은 산 꼭대기(약 258px)보다 위쪽만 사용

// 초록(위) → 보라(아래) — 완독 깃발의 AURORA_FLAG_COLORS와 같은 계열
const TOP_RGB: [number, number, number] = [64, 224, 160]
const BOTTOM_RGB: [number, number, number] = [130, 90, 230]

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

// 오로라 선 5개를 한 다발로 묶어서 같은 타이밍·같은 속도로 이동시키되, 서로 나란한
// 대각선(diagOffset만 다름)에 놓아 한 몸처럼 뭉쳐서 화면을 가로지르게 함.
// 가운데 선이 가장 굵고 밝고, 바깥쪽으로 갈수록 얇고 옅어져서 다발 느낌을 강조.
type AuroraLine = {
  diagOffset: number // 다발 중심 대각선으로부터 나란히 떨어진 거리(칸 단위)
  alpha: number
  widthCells: number
}

const BUNDLE_DELAY_SEC = 0.4 // 등장 시점(공통)
const BUNDLE_SPEED_MUL = 1 // 이동 속도(공통)

const LINES: AuroraLine[] = [
  { diagOffset: -4, alpha: 0.22, widthCells: 1 },
  { diagOffset: -2, alpha: 0.38, widthCells: 1 },
  { diagOffset: 0, alpha: 0.55, widthCells: 2 },
  { diagOffset: 2, alpha: 0.38, widthCells: 1 },
  { diagOffset: 4, alpha: 0.22, widthCells: 1 },
]

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

      const p = elapsed / DURATION_MS
      // 8%까지 페이드인, 82%부터 페이드아웃
      const fade = p < 0.08 ? p / 0.08 : p > 0.82 ? Math.max(0, (1 - p) / 0.18) : 1

      ctx!.clearRect(0, 0, canvas.width, canvas.height)

      const rows = Math.ceil(canvas.height / CELL)
      const cols = Math.ceil(canvas.width / CELL)
      const skyRows = Math.min(rows, SKY_ROWS_LIMIT)

      // 오른쪽 화면 밖(cols + 여유)에서 시작해 왼쪽 화면 밖(-skyRows - 여유)까지
      // 이동하는 데 걸리는 전체 거리 — 화면 폭에 따라 자동으로 맞춰짐.
      const startDiag = cols + 8
      const endDiag = -skyRows - 8
      const totalTravel = startDiag - endDiag
      const baseSpeed = totalTravel / 7 // 약 7초 안에 한 번 가로지르도록(페이드아웃 전에 끝나게)

      const bundleT = Math.max(0, elapsed / 1000 - BUNDLE_DELAY_SEC)
      const bundleDiag = startDiag - baseSpeed * BUNDLE_SPEED_MUL * bundleT

      LINES.forEach((line) => {
        const diagNow = bundleDiag + line.diagOffset
        if (diagNow < endDiag) return // 이미 화면 밖으로 다 빠져나감

        const alpha = line.alpha * fade
        if (alpha <= 0.01) return

        // col + row = diagNow인 대각선 위의 셀들만 — 행마다 정확히 한 지점(또는
        // widthCells만큼)만 칠해서 "선"으로 보이게 함(반복 줄무늬 아님). row가 클수록
        // (아래로 갈수록) col이 작아지는 "/" 방향 기울기 — 위쪽이 오른쪽, 아래쪽이
        // 왼쪽에 오도록 대각선을 반대로 뒤집음.
        for (let row = 0; row < skyRows; row++) {
          const colorT = row / rows
          const r = lerp(TOP_RGB[0], BOTTOM_RGB[0], colorT)
          const g = lerp(TOP_RGB[1], BOTTOM_RGB[1], colorT)
          const b = lerp(TOP_RGB[2], BOTTOM_RGB[2], colorT)
          const col = Math.round(diagNow - row)
          for (let w = 0; w < line.widthCells; w++) {
            const c = col + w
            if (c < 0 || c >= cols) continue
            ctx!.fillStyle = `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${alpha.toFixed(3)})`
            ctx!.fillRect(c * CELL, row * CELL, CELL, CELL)
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
