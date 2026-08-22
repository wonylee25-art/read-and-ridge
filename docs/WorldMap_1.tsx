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

const CANVAS_H = 440
const GROUND_H = 52
const GAP = 20

// ─── KDC 색상 — 데모 스크린샷 기준 팔레트 ──────────────────────────────────────
// ⚠ 총류/철학/종교는 데모와 동일하게 "회색" (이전 버전의 파란색 아님)

const KDC_THEME: Record<string, { fill: string; edge: string; snow: string; base: string }> = {
  // 총류/철학/종교 (KDC 0,1,2) — 회색/실버
  mystery: { fill: '#b9bdc1', edge: '#8b9095', snow: '#f4f6f8', base: '#6d7378' },
  // 사회/예술/역사 (KDC 3,7,9) — 황토/머스터드
  earth:   { fill: '#c9992e', edge: '#8a6312', snow: '#ffefc2', base: '#5f430a' },
  // 과학/기술 (KDC 4,5) — 청록 그린
  nature:  { fill: '#3cb489', edge: '#1e7d5a', snow: '#e0fbf0', base: '#124e37' },
  // 문학/어학 (KDC 6,8) — 라이트 퍼플
  fantasy: { fill: '#c08ad6', edge: '#8a54a8', snow: '#f6e9fc', base: '#5c3374' },
  // KDC 없을 때
  default: { fill: '#3aac6e', edge: '#1a6640', snow: '#d6f5e6', base: '#0e4228' },
}

const INDEX_THEMES = [
  KDC_THEME.fantasy,
  KDC_THEME.earth,
  KDC_THEME.nature,
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

function kdcCategoryLabel(kdc: string | null | undefined, fallback: string) {
  if (kdc) {
    const d = kdc[0]
    if ('012'.includes(d)) return '총류/철학/종교 (KDC 0,1,2)'
    if ('379'.includes(d)) return '사회/예술/역사 (KDC 3,7,9)'
    if ('45'.includes(d))  return '과학/기술 (KDC 4,5)'
    if ('68'.includes(d))  return '문학/어학 (KDC 6,8)'
  }
  return fallback
}

const STATUS_LABEL: Record<WorldMapBook['status'], string> = {
  completed: '완독',
  reading: '독서중',
  paused: '미시작',
}

function getLevel(pages: number | null): 1 | 2 | 3 | 4 {
  if (!pages) return 2
  if (pages < 200) return 1
  if (pages < 400) return 2
  if (pages < 600) return 3
  return 4
}

// ─── 시드 기반 결정론적 랜덤 ───────────────────────────────────────────────────
// 책 id를 시드로 써서, 매 렌더마다 값이 바뀌지 않고 "그 책은 항상 같은 결과"가
// 나오게 함. 진짜 Math.random()을 쓰면 리렌더될 때마다 눈 패턴/깃발 색이
// 바뀌어 버려서(표류), 결과물이 불안정해 보이는 원인이 됨.

function hashString(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  return h
}

function mulberry32(seed: number) {
  let a = seed | 0
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// 미시작 산의 랜덤 눈덮임 패턴 — book.id로 시드 고정, 위쪽일수록 눈 확률 ↑ (설선 효과)
function buildSnowMask(book: WorldMapBook, steps: number): Set<string> {
  const mask = new Set<string>()
  if (book.status !== 'paused') return mask
  const rand = mulberry32(hashString(book.id))
  const mid = steps - 1
  for (let row = 1; row < steps; row++) {
    const snowChance = Math.max(0.05, 0.78 - (row / steps) * 0.75)
    for (let col = mid - row; col <= mid + row; col++) {
      if (rand() < snowChance) mask.add(`${row}:${col}`)
    }
  }
  return mask
}

// 완독 깃발 색 — book.id로 시드 고정, 매번 같은 책은 같은 색
const FLAG_COLORS = ['#e03e2f', '#2f6fe0', '#e0a72f', '#7d3fe0', '#2fb573', '#e0527a']
function getFlagColor(id: string): string {
  const idx = Math.abs(hashString(id)) % FLAG_COLORS.length
  return FLAG_COLORS[idx]
}

// ─── Sky ─────────────────────────────────────────────────────────────────────
// fixedHour(기본 10시)로 하늘을 고정 → 실행 시각과 무관하게 항상 데모와 동일.
// 낮/밤 순환을 원하면 <WorldMap fixedHour={null} />로 이전 동작 복원.

type SkyConfig = {
  topColor: string
  bottomColor: string
  stars: boolean
  daytime: boolean
}

function getSky(hour: number): SkyConfig {
  if (hour < 6)  return { topColor: '#060b22', bottomColor: '#0d1540', stars: true,  daytime: false }
  if (hour < 16) return { topColor: '#8fccf0', bottomColor: '#bfe4fa', stars: false, daytime: true }
  if (hour < 19) return { topColor: '#c03010', bottomColor: '#f07040', stars: false, daytime: false }
  return { topColor: '#0e1248', bottomColor: '#141840', stars: true, daytime: false }
}

// ─── Cloud shapes (relative pixel offsets) ────────────────────────────────────

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

// 캐릭터 픽셀 맵 (6×8)
const CHAR_COLORS: Record<string, string> = {
  H: '#5a3a22', // 머리카락
  S: '#f1c9a5', // 피부
  B: '#4a7fc0', // 옷
  L: '#3a3a3a', // 다리
}
const CHAR_ROWS_A = [
  '.HHHH.',
  '.SSSS.',
  '..BB..',
  'BBBBBB',
  '.BBBB.',
  '.BBBB.',
  '.L..L.',
  '.L..L.',
]
const CHAR_ROWS_B = [
  '.HHHH.',
  '.SSSS.',
  '..BB..',
  'BBBBBB',
  '.BBBB.',
  '.BBBB.',
  'LL..LL',
  'L....L',
]

const CPX = 3

// ─── 스프라이트: 나무 / 꽃 / 버섯 (고정 데이터 — 매번 동일하게 렌더) ──────────

const TREE_ROWS = [
  '.AAA.',
  'AGGGA',
  'GGGGG',
  '..T..',
  '..T..',
]
const TREE_COLORS: Record<string, string> = {
  A: '#43a852', // 밝은 잎
  G: '#2e8b3d', // 잎
  T: '#6b4226', // 줄기
}

const FLOWER_ROWS = [
  '.P.P.',
  'PPPPP',
  '.GGG.',
]
const FLOWER_COLORS: Record<string, string> = {
  P: '#f3a6c8', // 꽃잎 (핑크)
  G: '#3f9448', // 잎
}

const MUSHROOM_ROWS = [
  '.RR.',
  'RRRR',
  '.WW.',
]
const MUSHROOM_COLORS: Record<string, string> = {
  R: '#d8402c',
  W: '#f5efe6',
}

function drawSprite(
  ctx: CanvasRenderingContext2D,
  rows: string[],
  colors: Record<string, string>,
  x: number,
  bottomY: number,
  block: number
) {
  const h = rows.length * block
  rows.forEach((row, ri) => {
    row.split('').forEach((cell, ci) => {
      const color = colors[cell]
      if (color) {
        ctx.fillStyle = color
        ctx.fillRect(
          Math.round(x + ci * block),
          Math.round(bottomY - h + ri * block),
          block,
          block
        )
      }
    })
  })
}

// ─── Draw helpers ─────────────────────────────────────────────────────────────

function drawPixel(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, size = PX) {
  ctx.fillStyle = color
  ctx.fillRect(Math.round(x), Math.round(y), size, size)
}

function drawChar(ctx: CanvasRenderingContext2D, cx: number, cy: number, frame: number) {
  const rows = frame % 2 === 0 ? CHAR_ROWS_A : CHAR_ROWS_B
  const w = rows[0].length * CPX
  const h = rows.length * CPX
  rows.forEach((row, ri) => {
    row.split('').forEach((cell, ci) => {
      const color = CHAR_COLORS[cell]
      if (color) {
        ctx.fillStyle = color
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
    ctx.fillStyle = '#d8eaf8'
    ctx.fillRect(Math.round(x + cx * blockSize), Math.round(y + cy * blockSize + blockSize - 2), blockSize, 2)
  })
  ctx.globalAlpha = 1
}

// 픽셀 스타일 태양 (원형+글로우 → 사각 블록으로 교체, 데모와 동일)
function drawPixelSun(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const b = 6
  // 광선 (연노랑)
  ctx.fillStyle = '#ffe27a'
  const rays: [number, number][] = [
    [1, -1], [1, 3], [-1, 1], [3, 1],   // 상하좌우
    [-1, -1], [3, -1], [-1, 3], [3, 3], // 대각
  ]
  rays.forEach(([rx, ry]) => {
    ctx.fillRect(Math.round(x + rx * b), Math.round(y + ry * b), b, b)
  })
  // 본체 3×3 (진노랑)
  ctx.fillStyle = '#ffd23e'
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      ctx.fillRect(Math.round(x + c * b), Math.round(y + r * b), b, b)
    }
  }
  // 중앙 하이라이트
  ctx.fillStyle = '#fff3b0'
  ctx.fillRect(Math.round(x + b), Math.round(y + b), b, b)
}

// 완독 깃발 (색은 호출 측에서 getFlagColor(book.id)로 전달 — 책마다 고정된 랜덤 색)
function drawFlag(ctx: CanvasRenderingContext2D, peakCenterX: number, peakTopY: number, color: string) {
  const poleH = 16
  ctx.fillStyle = '#5a5a5a'
  ctx.fillRect(Math.round(peakCenterX - 1), Math.round(peakTopY - poleH), 2, poleH)
  ctx.fillStyle = color
  ctx.fillRect(Math.round(peakCenterX + 1), Math.round(peakTopY - poleH), 9, 6)
}

function drawCampfire(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number) {
  const fireColors = ['#ff6600', '#ff9900', '#ffcc00']
  ctx.fillStyle = '#8b4513'
  ctx.fillRect(Math.round(x), Math.round(y), 4, 4)
  ctx.fillRect(Math.round(x + 4), Math.round(y), 4, 4)
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
  x: number
  y: number
  speed: number
  shapeIdx: number
  opacity: number
  resetX: number
}

function makeCloudStates(canvasW: number): CloudState[] {
  return [
    { x: canvasW * 0.15, y: 30,  speed: 0.18, shapeIdx: 1, opacity: 0.88, resetX: canvasW + 80 },
    { x: canvasW * 0.45, y: 55,  speed: 0.12, shapeIdx: 0, opacity: 0.75, resetX: canvasW + 50 },
    { x: canvasW * 0.70, y: 25,  speed: 0.22, shapeIdx: 2, opacity: 0.80, resetX: canvasW + 100 },
    { x: canvasW * 0.88, y: 60,  speed: 0.15, shapeIdx: 1, opacity: 0.70, resetX: canvasW + 80 },
  ]
}

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

// ─── 데모 데이터 (props 없이 단독 실행될 때 사용 — 미리보기/스토리북용) ────────

const DEMO_BOOKS: WorldMapBook[] = [
  { id: 'demo-1', title: '문학 책',   total_pages: 150, current_page: 0,   status: 'paused',    kdc: '8' },
  { id: 'demo-2', title: '역사 책',   total_pages: 300, current_page: 300, status: 'completed', kdc: '9' },
  { id: 'demo-3', title: '과학 책',   total_pages: 500, current_page: 210, status: 'reading',   kdc: '4' },
  { id: 'demo-4', title: '철학 책',   total_pages: 700, current_page: 0,   status: 'paused',    kdc: '1' },
]

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WorldMap({
  books = DEMO_BOOKS, // 실제 사용 시 books를 넘기면 데모 데이터는 무시됨
  onBookClick,
  fixedHour = 10,   // 데모 스크린샷 기준(오전 10시)으로 하늘 고정. null이면 실제 시각 사용.
  showLegend = true,
}: {
  books?: WorldMapBook[]
  onBookClick?: (book: WorldMapBook) => void
  fixedHour?: number | null
  showLegend?: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)

  const stars = useMemo(() => makeStars(60), [])

  // 책마다 고정된 눈 패턴 (id + total_pages가 바뀔 때만 재계산 — 그 외엔 항상 동일)
  const snowMasks = useMemo(() => {
    const map = new Map<string, Set<string>>()
    books.forEach((book) => {
      const steps = STEPS_BY_LEVEL[getLevel(book.total_pages)]
      map.set(book.id, buildSnowMask(book, steps))
    })
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [books.map((b) => `${b.id}:${b.total_pages}:${b.status}`).join(',')])

  const stateRef = useRef({
    hour: fixedHour ?? new Date().getHours(),
    bounceFrame: 0,
    charFrame: 0,
    fireFrame: 0,
    clouds: null as CloudState[] | null,
    cloudsForW: 0,
    lastBounceTime: 0,
    lastFireTime: 0,
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx: CanvasRenderingContext2D = canvas.getContext('2d')!
    if (!ctx) return

    ctx.imageSmoothingEnabled = false

    // 시각 업데이트 — fixedHour가 지정되면 항상 그 값 유지 (렌더 결과 고정)
    const clockInterval = setInterval(() => {
      stateRef.current.hour = fixedHour ?? new Date().getHours()
    }, 60_000)
    stateRef.current.hour = fixedHour ?? new Date().getHours()

    const MAX_MTN_W = (2 * STEPS_BY_LEVEL[4] - 1) * PX

    function draw(timestamp: number) {
      const s = stateRef.current

      // ⚠ 수정: 캔버스 크기를 마운트 시 한 번이 아니라 매 프레임 읽음.
      // (이전 버전은 리사이즈 후에도 옛 폭 기준으로 그려 오른쪽이 비는 버그가 있었음)
      const W = canvas!.width
      const H = canvas!.height

      // 구름 초기화 / 폭 변경 시 재배치
      if (!s.clouds || s.cloudsForW !== W) {
        s.clouds = makeCloudStates(W)
        s.cloudsForW = W
      }

      if (timestamp - s.lastBounceTime > 80) {
        s.bounceFrame = (s.bounceFrame + 1) % 20
        s.charFrame = (s.charFrame + 1) % 4
        s.lastBounceTime = timestamp
      }
      if (timestamp - s.lastFireTime > 200) {
        s.fireFrame = (s.fireFrame + 1) % 3
        s.lastFireTime = timestamp
      }

      const sky = getSky(s.hour)
      const clouds = s.clouds!

      if (sky.daytime) {
        clouds.forEach((c) => {
          c.x -= c.speed
          if (c.x < -120) c.x = c.resetX
        })
      }

      // ── 하늘 ─────────────────────────────────────────────────────────────

      const grad = ctx.createLinearGradient(0, 0, 0, H - GROUND_H)
      grad.addColorStop(0, sky.topColor)
      grad.addColorStop(1, sky.bottomColor)
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, H - GROUND_H)

      // ── 별 (야간) ─────────────────────────────────────────────────────────

      if (sky.stars) {
        stars.forEach((st) => {
          drawStar(ctx, st.xRatio * W, st.yRatio * H, st.r, st.opacity)
        })
      }

      // ── 태양 (주간, 우측 상단 픽셀 스타일 — 데모와 동일 위치) ─────────────

      if (sky.daytime) {
        drawPixelSun(ctx, W - 64, 28)
        clouds.forEach((c) => {
          drawCloud(ctx, c.x, c.y, c.shapeIdx, c.opacity)
        })
      }

      // ── 지면 (밝은 잔디선 + 짙은 녹색 — 데모와 동일) ──────────────────────

      const groundTopY = H - GROUND_H
      const groundGrad = ctx.createLinearGradient(0, groundTopY, 0, H)
      groundGrad.addColorStop(0, '#2c5423')
      groundGrad.addColorStop(1, '#1d3a18')
      ctx.fillStyle = groundGrad
      ctx.fillRect(0, groundTopY, W, GROUND_H)
      // 잔디 하이라이트 스트립
      ctx.fillStyle = '#55a141'
      ctx.fillRect(0, groundTopY, W, 6)

      const mountainBaseY = groundTopY

      // ── 지상 데코 (꽃 · 나무 · 버섯) — 좌표 고정, 항상 동일 ────────────────

      const deco = 6
      // 좌측 끝 꽃밭 (첫 산 왼쪽)
      drawSprite(ctx, FLOWER_ROWS, FLOWER_COLORS, 4, mountainBaseY, deco)
      drawSprite(ctx, FLOWER_ROWS, FLOWER_COLORS, 40, mountainBaseY, deco)

      // 산 사이 간격마다 나무 2그루
      for (let i = 0; i < books.length - 1; i++) {
        const slotBoundary = 24 + (i + 1) * (MAX_MTN_W + GAP) - GAP / 2
        drawSprite(ctx, TREE_ROWS, TREE_COLORS, slotBoundary - 40, mountainBaseY, deco)
        drawSprite(ctx, TREE_ROWS, TREE_COLORS, slotBoundary + 4, mountainBaseY, deco)
      }

      // 세 번째 산 근처 버섯 (데모의 작은 빨간 포인트)
      if (books.length >= 3) {
        const mushX = 24 + 3 * (MAX_MTN_W + GAP) - GAP / 2 - 14
        drawSprite(ctx, MUSHROOM_ROWS, MUSHROOM_COLORS, mushX, mountainBaseY, 4)
      }

      // ── 산들 (전부 선명하게 — 이전 버전의 50% 딤/축소 제거) ────────────────

      books.forEach((book, i) => {
        const level = getLevel(book.total_pages)
        const steps = STEPS_BY_LEVEL[level]
        const theme = getTheme(book.kdc, i)
        const mid = steps - 1
        const mtnW = (2 * steps - 1) * PX
        const baseX = 24 + i * (MAX_MTN_W + GAP) + (MAX_MTN_W - mtnW) / 2
        const baseY = mountainBaseY - (steps + 2) * PX
        const snowMask = book.status === 'paused' ? snowMasks.get(book.id) : undefined

        // 산 본체
        for (let row = 0; row < steps; row++) {
          for (let col = mid - row; col <= mid + row; col++) {
            const px = baseX + col * PX
            const py = baseY + row * PX
            const isTop = row === 0
            const isEdge = col === mid - row || col === mid + row
            // 미시작 상태 → 랜덤(고정 시드) 눈 패턴이 edge/fill보다 우선 적용
            const isSnowPatch = row > 0 && !!snowMask?.has(`${row}:${col}`)
            const color = isTop || isSnowPatch ? theme.snow : isEdge ? theme.edge : theme.fill
            drawPixel(ctx, px, py, color)
          }
        }

        // 베이스 2행
        for (let r = 0; r < 2; r++) {
          for (let col = 0; col < 2 * steps - 1; col++) {
            drawPixel(ctx, baseX + col * PX, baseY + steps * PX + r * PX, theme.edge)
          }
        }

        // 완독 → 정상에 깃발 (색은 책마다 고정된 랜덤 색)
        if (book.status === 'completed') {
          drawFlag(ctx, baseX + mid * PX + PX / 2, baseY, getFlagColor(book.id))
        }

        // 독서중 → 진행도(current_page / total_pages)에 비례해 캐릭터가 산을 오름
        // total_pages: 책 메타데이터에서 가져온 값 / current_page: 사용자가 직접 입력하는 값
        if (book.status === 'reading') {
          const progress = book.total_pages
            ? Math.min(Math.max(book.current_page / book.total_pages, 0), 1)
            : 0
          // ⚠ 이전 버전은 Math.round로 계단 한 칸씩 툭툭 이동 → 정수 행으로 스냅되어
          // 페이지를 조금 읽어도 캐릭터가 안 움직이는 것처럼 보였음.
          // 연속값으로 바꿔 진행도가 그대로 높이에 반영되게 함(부드러운 등반감).
          const climbRow = (1 - progress) * (steps - 1)
          const charCX = baseX + mid * PX + PX / 2
          const s2 = stateRef.current
          const bounceY = s2.bounceFrame < 10
            ? -(s2.bounceFrame * 0.35)
            : -((20 - s2.bounceFrame) * 0.35)
          const charCY = baseY + climbRow * PX + bounceY
          drawChar(ctx, charCX, charCY, s2.charFrame)

          // 야간이면 산 아래 모닥불
          if (sky.stars) {
            drawCampfire(ctx, baseX + mtnW / 2 - 4, mountainBaseY - 14, s2.fireFrame)
          }
        }
      })

      // ── 책 없음 안내 ──────────────────────────────────────────────────────

      if (books.length === 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.35)'
        ctx.font = '13px monospace'
        ctx.textAlign = 'center'
        ctx.fillText('책을 추가하면 여기에 산이 생겨요 ⛰', W / 2, H - 80)
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)

    // ── 클릭 hit-test ──────────────────────────────────────────────────────

    const canvasEl = canvas as HTMLCanvasElement
    function handleClick(e: MouseEvent) {
      if (!onBookClick) return
      const rect = canvasEl.getBoundingClientRect()
      const scaleX = canvasEl.width / rect.width
      const scaleY = canvasEl.height / rect.height
      const cx = (e.clientX - rect.left) * scaleX
      const cy = (e.clientY - rect.top) * scaleY
      const rects = getMountainRects(books, CANVAS_H)
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [books, stars, snowMasks, onBookClick, fixedHour])

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
    <div className="w-full">
      <div
        ref={wrapRef}
        className="relative w-full rounded-2xl overflow-hidden select-none"
        style={{ height: CANVAS_H, background: '#8fccf0' }}
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

      {showLegend && books.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
          {books.map((book, i) => {
            const theme = getTheme(book.kdc, i)
            return (
              <span key={book.id} className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-[2px]"
                  style={{ background: theme.fill }}
                />
                {kdcCategoryLabel(book.kdc, book.title)} — {STATUS_LABEL[book.status]}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
