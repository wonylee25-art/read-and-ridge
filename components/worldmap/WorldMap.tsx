'use client'

import React, { useEffect, useRef, useMemo } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorldMapBook = {
  id: string
  title: string
  total_pages: number | null
  current_page: number
  status: 'reading' | 'completed' | 'paused'
  kdc?: string | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PX = 10 // 1 "pixel" = 10px on canvas

const STEPS_BY_LEVEL: Record<1 | 2 | 3 | 4, number> = {
  1: 5,
  2: 7,
  3: 9,
  4: 11,
}

// ─── KDC 색상 — 고채도 게임 팔레트 ────────────────────────────────────────────

const KDC_THEME: Record<string, { fill: string; edge: string; snow: string; base: string }> = {
  // 총류/철학/종교 — 청회 계열
  mystery: { fill: '#5b8dd9', edge: '#2c4d8a', snow: '#e8f0ff', base: '#1e3560' },
  // 사회/예술/역사 — 황토/브라운 계열
  earth:   { fill: '#c97b2e', edge: '#7a4010', snow: '#fff0cc', base: '#5a2e08' },
  // 과학/기술 — 에메랄드 그린
  nature:  { fill: '#2db86a', edge: '#166b3a', snow: '#d4ffea', base: '#0d4022' },
  // 어학/문학 — 라벤더/보라
  fantasy: { fill: '#9b59d0', edge: '#5a1f8a', snow: '#f0e0ff', base: '#3b1060' },
  // KDC 없을 때
  default: { fill: '#3aac6e', edge: '#1a6640', snow: '#d6f5e6', base: '#0e4228' },
}

const INDEX_THEMES = [
  KDC_THEME.nature,
  KDC_THEME.earth,
  KDC_THEME.fantasy,
  KDC_THEME.mystery,
]

function getTheme(kdc: string | null | undefined, index: number) {
  if (kdc) {
    const d = kdc[0]
    if ('012'.includes(d)) return KDC_THEME.mystery
    if ('379'.includes(d)) return KDC_THEME.earth
    if ('45'.includes(d))  return KDC_THEME.nature
    if ('68'.includes(d))  return KDC_THEME.fantasy
  }
  return INDEX_THEMES[index % INDEX_THEMES.length]
}

function getLevel(pages: number | null): 1 | 2 | 3 | 4 {
  if (!pages) return 2
  if (pages < 200) return 1
  if (pages < 400) return 2
  if (pages < 600) return 3
  return 4
}

// ─── Sky ─────────────────────────────────────────────────────────────────────

type SkyConfig = {
  topColor: string
  bottomColor: string
  stars: boolean
  daytime: boolean
  sunColor: string
  sunX: number // 0~1
}

function getSky(hour: number): SkyConfig {
  const sunX = Math.min(Math.max((hour - 6) / 12, 0), 1)
  if (hour < 6)  return { topColor: '#060b22', bottomColor: '#0d1540', stars: true,  daytime: false, sunColor: '#ffffff', sunX }
  if (hour < 16) return { topColor: '#1a6bbf', bottomColor: '#6ec6f0', stars: false, daytime: true,  sunColor: '#ffe040', sunX }
  if (hour < 19) return { topColor: '#c03010', bottomColor: '#f07040', stars: false, daytime: false, sunColor: '#ff9933', sunX }
  return { topColor: '#0e1248', bottomColor: '#141840', stars: true, daytime: false, sunColor: '#ffffff', sunX }
}

// ─── Cloud shapes (relative pixel offsets) ────────────────────────────────────

// 각 구름은 픽셀 블록 좌표 배열로 정의 (PX 단위)
const CLOUD_SHAPES = [
  // 구름 A (작은 것)
  [
    [1,1],[2,1],[3,1],
    [0,2],[1,2],[2,2],[3,2],[4,2],
    [1,3],[2,3],[3,3],
  ],
  // 구름 B (중간)
  [
    [2,0],[3,0],[4,0],
    [1,1],[2,1],[3,1],[4,1],[5,1],
    [0,2],[1,2],[2,2],[3,2],[4,2],[5,2],[6,2],
    [1,3],[2,3],[3,3],[4,3],[5,3],
  ],
  // 구름 C (넓은 것)
  [
    [1,0],[2,0],[3,0],
    [0,1],[1,1],[2,1],[3,1],[4,1],[5,1],
    [0,2],[1,2],[2,2],[3,2],[4,2],[5,2],[6,2],
    [1,3],[2,3],[3,3],[4,3],[5,3],
    [2,4],[3,4],[4,4],
  ],
]

// 캐릭터 픽셀 맵 (5×5)
const CHAR_ROWS_A = ['.XXX.', 'XXXXX', 'XX.XX', '.X.X.', '.X.X.']
const CHAR_ROWS_B = ['.XXX.', 'XXXXX', 'XX.XX', 'X.X.X', 'X.X.X'] // bounce frame B

const CPX = 3

// ─── Draw helpers ─────────────────────────────────────────────────────────────

function drawPixel(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, size = PX) {
  ctx.fillStyle = color
  ctx.fillRect(Math.round(x), Math.round(y), size, size)
}

function drawChar(ctx: CanvasRenderingContext2D, cx: number, cy: number, frame: number) {
  const rows = frame % 2 === 0 ? CHAR_ROWS_A : CHAR_ROWS_B
  const w = 5 * CPX
  const h = 5 * CPX
  rows.forEach((row, ri) => {
    row.split('').forEach((cell, ci) => {
      if (cell === 'X') {
        ctx.fillStyle = '#1a1a1a'
        ctx.fillRect(
          Math.round(cx - w / 2 + ci * CPX),
          Math.round(cy - h + ri * CPX),
          CPX,
          CPX
        )
      }
    })
  })
}

function drawCloud(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  shapeIdx: number,
  opacity: number
) {
  const shape = CLOUD_SHAPES[shapeIdx % CLOUD_SHAPES.length]
  const blockSize = 6
  ctx.globalAlpha = opacity
  shape.forEach(([cx, cy]) => {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(Math.round(x + cx * blockSize), Math.round(y + cy * blockSize), blockSize, blockSize)
    // 약간의 그림자 느낌
    ctx.fillStyle = '#d8eaf8'
    ctx.fillRect(Math.round(x + cx * blockSize), Math.round(y + cy * blockSize + blockSize - 2), blockSize, 2)
  })
  ctx.globalAlpha = 1
}

function drawCampfire(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number) {
  const fireColors = ['#ff6600', '#ff9900', '#ffcc00']
  // 장작
  ctx.fillStyle = '#8b4513'
  ctx.fillRect(Math.round(x), Math.round(y), 4, 4)
  ctx.fillRect(Math.round(x + 4), Math.round(y), 4, 4)
  // 불꽃
  ctx.fillStyle = fireColors[frame % 3]
  ctx.fillRect(Math.round(x + 2), Math.round(y - 4), 4, 4)
  ctx.fillStyle = fireColors[(frame + 1) % 3]
  ctx.fillRect(Math.round(x + 1), Math.round(y - 8), 2, 4)
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, opacity: number) {
  ctx.globalAlpha = opacity
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return { r, g, b }
}

// ─── Star positions (stable, seeded) ─────────────────────────────────────────

function makeStars(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    xRatio: ((i * 137.508) % 100) / 100,
    yRatio: ((i * 97.31) % 55) / 100,
    r: (i % 3) + 1,
    opacity: +(0.3 + (i % 7) * 0.1).toFixed(2),
  }))
}

// ─── Cloud state ─────────────────────────────────────────────────────────────

type CloudState = {
  x: number      // current x (canvas coords)
  y: number
  speed: number  // px per frame
  shapeIdx: number
  opacity: number
  resetX: number // when x < -maxW, teleport to resetX
}

function makeCloudStates(canvasW: number): CloudState[] {
  return [
    { x: canvasW * 0.15, y: 30,  speed: 0.18, shapeIdx: 1, opacity: 0.88, resetX: canvasW + 80 },
    { x: canvasW * 0.45, y: 55,  speed: 0.12, shapeIdx: 0, opacity: 0.75, resetX: canvasW + 50 },
    { x: canvasW * 0.70, y: 25,  speed: 0.22, shapeIdx: 2, opacity: 0.80, resetX: canvasW + 100 },
    { x: canvasW * 0.88, y: 60,  speed: 0.15, shapeIdx: 1, opacity: 0.70, resetX: canvasW + 80 },
  ]
}

// ─── Main Component ───────────────────────────────────────────────────────────

const CANVAS_H = 440
const GROUND_H = 52
const GAP = 20

// ─── Hit-test helper ─────────────────────────────────────────────────────────

function getMountainRects(books: WorldMapBook[], canvasH: number) {
  const MAX_MTN_W = (2 * STEPS_BY_LEVEL[4] - 1) * PX
  const mountainBaseY = canvasH - GROUND_H
  return books.map((book, i) => {
    const level = getLevel(book.total_pages)
    const steps = STEPS_BY_LEVEL[level]
    const mtnW = (2 * steps - 1) * PX
    const mtnH = (steps + 2) * PX
    const baseX = 24 + i * (MAX_MTN_W + GAP) + (MAX_MTN_W - mtnW) / 2
    const baseY = mountainBaseY - mtnH
    return { book, x: baseX, y: baseY, w: mtnW, h: mtnH + GROUND_H / 2 }
  })
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WorldMap({
  books,
  onBookClick,
}: {
  books: WorldMapBook[]
  onBookClick?: (book: WorldMapBook) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)

  // 안정적인 star 위치 (컴포넌트 생애주기 동안 고정)
  const stars = useMemo(() => makeStars(60), [])

  // 애니메이션 상태 (ref로 관리 — state 업데이트 없이 RAF 루프에서 직접 갱신)
  const stateRef = useRef({
    hour: new Date().getHours(),
    bounceFrame: 0,
    charFrame: 0,
    fireFrame: 0,
    clouds: null as CloudState[] | null,
    lastBounceTime: 0,
    lastFireTime: 0,
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx: CanvasRenderingContext2D = canvas.getContext('2d')!
    if (!ctx) return

    ctx.imageSmoothingEnabled = false

    const W = canvas.width
    const H = canvas.height

    // 구름 초기화
    if (!stateRef.current.clouds) {
      stateRef.current.clouds = makeCloudStates(W)
    }

    // 시각 업데이트 (1분마다)
    const clockInterval = setInterval(() => {
      stateRef.current.hour = new Date().getHours()
    }, 60_000)

    // ── 산 레이아웃 계산 ────────────────────────────────────────────────────

    const MAX_MTN_W = (2 * STEPS_BY_LEVEL[4] - 1) * PX
    const totalContentW = books.length * (MAX_MTN_W + GAP) + 48
    // 스크롤 오프셋 — 현재는 0 (추후 터치 스크롤 구현 시 확장)

    // ── 메인 드로우 함수 ────────────────────────────────────────────────────

    function draw(timestamp: number) {
      const s = stateRef.current

      // 바운스 타이밍 (80ms)
      if (timestamp - s.lastBounceTime > 80) {
        s.bounceFrame = (s.bounceFrame + 1) % 20
        s.charFrame = (s.charFrame + 1) % 4
        s.lastBounceTime = timestamp
      }
      // 불꽃 타이밍 (200ms)
      if (timestamp - s.lastFireTime > 200) {
        s.fireFrame = (s.fireFrame + 1) % 3
        s.lastFireTime = timestamp
      }

      const sky = getSky(s.hour)
      const clouds = s.clouds!

      // 구름 이동
      if (sky.daytime) {
        clouds.forEach((c) => {
          c.x -= c.speed
          if (c.x < -120) c.x = c.resetX
        })
      }

      // ── 하늘 그라디언트 ─────────────────────────────────────────────────

      const grad = ctx.createLinearGradient(0, 0, 0, H - GROUND_H)
      grad.addColorStop(0, sky.topColor)
      grad.addColorStop(1, sky.bottomColor)
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, H - GROUND_H)

      // ── 별 ──────────────────────────────────────────────────────────────

      if (sky.stars) {
        stars.forEach((st) => {
          drawStar(ctx, st.xRatio * W, st.yRatio * H, st.r, st.opacity)
        })
      }

      // ── 태양/달 ──────────────────────────────────────────────────────────

      if (!sky.stars || s.hour >= 19) {
        const sunX = sky.sunX * W * 0.9 + W * 0.05
        const sunY = 32
        const isDay = s.hour >= 6 && s.hour < 19
        const sunR = isDay ? 16 : 10

        if (isDay) {
          // 태양 글로우
          const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 2.5)
          const { r, g, b } = hexToRgb(sky.sunColor)
          glow.addColorStop(0, `rgba(${r},${g},${b},0.6)`)
          glow.addColorStop(1, `rgba(${r},${g},${b},0)`)
          ctx.fillStyle = glow
          ctx.beginPath()
          ctx.arc(sunX, sunY, sunR * 2.5, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.fillStyle = sky.sunColor
        ctx.beginPath()
        ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2)
        ctx.fill()
      }

      // ── 구름 (주간만) ────────────────────────────────────────────────────

      if (sky.daytime) {
        clouds.forEach((c) => {
          drawCloud(ctx, c.x, c.y, c.shapeIdx, c.opacity)
        })
      }

      // ── 지면 ─────────────────────────────────────────────────────────────

      const groundGrad = ctx.createLinearGradient(0, H - GROUND_H, 0, H)
      groundGrad.addColorStop(0, '#2a4828')
      groundGrad.addColorStop(1, '#182818')
      ctx.fillStyle = groundGrad
      ctx.fillRect(0, H - GROUND_H, W, GROUND_H)

      // ── 산들 ─────────────────────────────────────────────────────────────

      const mountainBaseY = H - GROUND_H  // 지면 상단

      books.forEach((book, i) => {
        const level = getLevel(book.total_pages)
        const steps = STEPS_BY_LEVEL[level]
        const theme = getTheme(book.kdc, i)
        const mid = steps - 1
        const mtnW = (2 * steps - 1) * PX
        const mtnH = (steps + 2) * PX
        const baseX = 24 + i * (MAX_MTN_W + GAP) + (MAX_MTN_W - mtnW) / 2
        const baseY = mountainBaseY - mtnH

        const isActive = book.status === 'reading'
        const opacity = isActive ? 1.0 : 0.5
        const scale = isActive ? 1.0 : 0.82

        ctx.save()
        ctx.globalAlpha = opacity

        // scale 변환: 산 바닥 중심 기준
        if (scale < 1) {
          const pivotX = baseX + mtnW / 2
          const pivotY = mountainBaseY
          ctx.translate(pivotX, pivotY)
          ctx.scale(scale, scale)
          ctx.translate(-pivotX, -pivotY)
        }

        // ── 산 본체 ───────────────────────────────────────────────────────

        for (let row = 0; row < steps; row++) {
          for (let col = mid - row; col <= mid + row; col++) {
            const px = baseX + col * PX
            const py = baseY + row * PX
            const isTop  = row === 0
            const isEdge = col === mid - row || col === mid + row
            const color  = isTop ? theme.snow : isEdge ? theme.edge : theme.fill
            drawPixel(ctx, px, py, color)
          }
        }

        // ── 베이스 2행 ────────────────────────────────────────────────────

        for (let r = 0; r < 2; r++) {
          for (let col = 0; col < 2 * steps - 1; col++) {
            drawPixel(ctx, baseX + col * PX, baseY + steps * PX + r * PX, theme.edge)
          }
        }

        // ── 완독 정상석 ───────────────────────────────────────────────────

        if (book.status === 'completed') {
          const stoneX = baseX + mid * PX - PX
          const stoneY = baseY - PX * 3
          ctx.fillStyle = '#909090'
          ctx.fillRect(Math.round(stoneX), Math.round(stoneY), PX * 2, PX * 2 + 4)
          ctx.fillStyle = '#666666'
          ctx.fillRect(Math.round(stoneX + 2), Math.round(stoneY + 4), PX * 2 - 4, 2)
          ctx.fillRect(Math.round(stoneX + 4), Math.round(stoneY + 8), PX * 2 - 8, 2)
        }

        // ── 캐릭터 (reading) ──────────────────────────────────────────────

        if (isActive) {
          const progress = book.total_pages
            ? Math.min(book.current_page / book.total_pages, 1)
            : 0
          const charRow = Math.round((1 - progress) * (steps - 1))
          const charCX = baseX + mid * PX + PX / 2
          const bounceY = s.bounceFrame < 10
            ? -(s.bounceFrame * 0.35)
            : -((20 - s.bounceFrame) * 0.35)
          const charCY = baseY + charRow * PX + bounceY

          drawChar(ctx, charCX, charCY, s.charFrame)
        }

        // ── 모닥불 (야간 + reading) ────────────────────────────────────────

        if (sky.stars && isActive) {
          const fireX = baseX + mtnW / 2 - 4
          const fireY = mountainBaseY - 14
          drawCampfire(ctx, fireX, fireY, s.fireFrame)
        }

        // ── 책 제목 레이블 ────────────────────────────────────────────────

        ctx.globalAlpha = isActive ? 1 : 0.5
        ctx.fillStyle = isActive ? '#ccffcc' : '#778877'
        ctx.font = '9px monospace'
        ctx.textAlign = 'center'
        const label = book.title.length > 10 ? book.title.slice(0, 9) + '…' : book.title
        ctx.fillText(label, baseX + mtnW / 2, mountainBaseY + 14)

        ctx.restore()
      })

      // ── 드롭 섀도 (전경 읽는 중 산) ──────────────────────────────────────
      // 읽는 중 산에 살짝 빛나는 효과
      books.forEach((book, i) => {
        if (book.status !== 'reading') return
        const level = getLevel(book.total_pages)
        const steps = STEPS_BY_LEVEL[level]
        const mtnW = (2 * steps - 1) * PX
        const baseX = 24 + i * (MAX_MTN_W + GAP) + (MAX_MTN_W - mtnW) / 2
        ctx.save()
        ctx.globalAlpha = 0.18
        ctx.shadowColor = '#88ffaa'
        ctx.shadowBlur = 20
        ctx.fillStyle = '#88ffaa'
        ctx.fillRect(baseX, mountainBaseY - (steps + 2) * PX - 4, mtnW, 4)
        ctx.restore()
      })

      // ── 시간 배지 ─────────────────────────────────────────────────────────

      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.font = '11px monospace'
      ctx.textAlign = 'right'
      ctx.fillText(
        `${String(s.hour).padStart(2, '0')}:00`,
        W - 12,
        18
      )

      // ── 책 없음 안내 ──────────────────────────────────────────────────────

      if (books.length === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.35)'
        ctx.font = '13px monospace'
        ctx.textAlign = 'center'
        ctx.fillText('책을 추가하면 여기에 산이 생겨요 ⛰', W / 2, H - 80)
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)

    // ── 클릭 hit-test ──────────────────────────────────────────────────────────
    const canvasEl = canvas as HTMLCanvasElement
    function handleClick(e: MouseEvent) {
      if (!onBookClick) return
      const rect = canvasEl.getBoundingClientRect()
      const scaleX = canvasEl.width / rect.width
      const scaleY = canvasEl.height / rect.height
      const cx = (e.clientX - rect.left) * scaleX
      const cy = (e.clientY - rect.top) * scaleY
      const rects = getMountainRects(books, H)
      for (const r of rects) {
        if (cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h) {
          onBookClick(r.book)
          break
        }
      }
    }
    canvasEl.addEventListener('click', handleClick)
    canvasEl.style.cursor = 'pointer'

    return () => {
      cancelAnimationFrame(rafRef.current)
      clearInterval(clockInterval)
      canvasEl.removeEventListener('click', handleClick)
    }
  // books가 바뀔 때마다 루프 재시작 (산 레이아웃 재계산)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [books, stars, onBookClick])

  // ── 캔버스 크기: 컨테이너 폭 측정 후 동기화 ─────────────────────────────────

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return

    function syncSize() {
      if (!wrap || !canvas) return
      const MAX_MTN_W = (2 * STEPS_BY_LEVEL[4] - 1) * PX
      const contentW = books.length * (MAX_MTN_W + GAP) + 64
      const containerW = wrap.clientWidth
      canvas.width = Math.max(contentW, containerW)
      canvas.height = CANVAS_H
    }

    syncSize()
    const ro = new ResizeObserver(syncSize)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [books])

  return (
    <div
      ref={wrapRef}
      className="relative w-full rounded-2xl overflow-hidden select-none"
      style={{ height: CANVAS_H, background: '#060b22' }}
    >
      <div
        className="absolute inset-0 overflow-x-auto overflow-y-hidden"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
      >
        <canvas
          ref={canvasRef}
          style={{
            display: 'block',
            imageRendering: 'pixelated',
          }}
        />
      </div>
    </div>
  )
}
