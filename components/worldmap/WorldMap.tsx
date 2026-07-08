'use client'

import React, { useEffect, useRef, useMemo, useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorldMapBook = {
  id: string
  title: string
  total_pages: number | null
  current_page: number
  status: 'reading' | 'completed' | 'paused'
  kdc?: string | null
  completed_at?: string | null // 완독 처리된 시각 (ISO). WorldMap 노출 유예(COMPLETION_GRACE_MS) 판단용
  memo?: string | null
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
const MAX_MTN_W = (2 * STEPS_BY_LEVEL[4] - 1) * PX

// ─── 산이 많을 때 간격 압축 ───────────────────────────────────────────────────
// 산이 5개 이상이면 기본 슬롯 폭(MAX_MTN_W + GAP)으로는 화면에 다 안 들어옴.
// MAX_COMPRESS_COUNT개까지는 컨테이너 폭에 맞춰 슬롯을 좁혀서(필요하면 서로 겹쳐서)
// 최대한 많이 한 화면에 보이게 하고, 그보다 많으면 압축을 포기하고 기존처럼 가로 스크롤.
const MIN_SLOT_W = 140 // 이보다 좁아지면 산이 서로 너무 뭉개져서 알아보기 힘듦
const MAX_COMPRESS_COUNT = 10

// ─── 전경/배경 분리 ───────────────────────────────────────────────────────────
// 등록된 책이 아무리 많아도 첫 화면(전경)엔 3~5개 정도만 또렷하게 보여준다.
// 읽는 중인 책은 항상 전경, 부족분은 미시작(paused) 책 중 방문마다 랜덤으로 채운다.
// 전경에 못 들어간 미시작 책은 식별 불가능한 흐릿한 배경 설산으로만 존재하고,
// 완독 책은 정상석(완등기록)으로 옮겨가므로 WorldMap엔 아예 그리지 않는다.
const TARGET_FOREGROUND = 4

// 완등기록(trophy)에 보여줄 최근 완독 책 수 — 이 이상은 지도에서 잘라내고
// 아래 전체 목록(BookCard 그리드)에서만 확인 가능. 완독이 쌓일수록 지도가
// 무한정 길어지는 걸 막기 위함 (호출 측이 completed_at 내림차순으로 넘겨준다는 전제).
// hikes/page.tsx에서 안내 문구에 쓸 수 있도록 export.
export const TARGET_TROPHY = 5

function computeSlotW(count: number, containerW: number): number {
  const comfortable = MAX_MTN_W + GAP
  if (count <= 0 || count > MAX_COMPRESS_COUNT) return comfortable
  const fitAll = (containerW - 48) / count
  return Math.max(MIN_SLOT_W, Math.min(comfortable, fitAll))
}

// ─── KDC 색상 — 데모 스크린샷 기준 팔레트 ──────────────────────────────────────
// ⚠ 총류/철학/종교는 데모와 동일하게 "회색" (이전 버전의 파란색 아님)

// char: 산 색상의 보색 계열로 지정 — fill/edge와 같은 계통 색이면 캐릭터가
// 산 표면에 파묻혀 안 보이므로, 항상 산과 대비되는 색으로 골라야 함.
const KDC_THEME: Record<string, { fill: string; edge: string; snow: string; base: string; char: string }> = {
  // 총류/철학/종교 (KDC 0,1,2) — 회색/실버 산 → 따뜻한 주황 옷
  mystery: { fill: '#b9bdc1', edge: '#8b9095', snow: '#f4f6f8', base: '#6d7378', char: '#e0752f' },
  // 사회/예술/역사 (KDC 3,7,9) — 황토/머스터드 산 → 파란 옷
  earth:   { fill: '#c9992e', edge: '#8a6312', snow: '#ffefc2', base: '#5f430a', char: '#2f6fe0' },
  // 과학/기술 (KDC 4,5) — 청록 그린 산 → 핑크/레드 옷
  nature:  { fill: '#3cb489', edge: '#1e7d5a', snow: '#e0fbf0', base: '#124e37', char: '#e0527a' },
  // 문학/어학 (KDC 6,8) — 라이트 퍼플 산 → 라임 옷
  fantasy: { fill: '#c08ad6', edge: '#8a54a8', snow: '#f6e9fc', base: '#5c3374', char: '#8ac03f' },
  // KDC 없을 때 — 초록 산 → 자주색 옷
  default: { fill: '#3aac6e', edge: '#1a6640', snow: '#d6f5e6', base: '#0e4228', char: '#c04a8a' },
}

const INDEX_THEMES = [
  KDC_THEME.fantasy,
  KDC_THEME.earth,
  KDC_THEME.nature,
  KDC_THEME.mystery,
]

// ⚠ 예전엔 kdc가 없는 책의 색을 foreground 배열 안에서의 순번(index)으로 정했는데,
// 같은 책이라도 산책기록/완등기록에서 배열 구성·순서가 서로 달라서(등록순 vs
// 완독순, 개수도 다름) 페이지를 옮겨 다니면 색이 바뀌어 보이는 문제가 있었음.
// book.id를 시드로 쓰는 결정론적 해시로 바꿔서, kdc가 없어도 그 책은 어디서
// 봐도 항상 같은 색이 나오게 함(깃발 색과 동일한 방식 — getFlagColor 참고).
function getTheme(kdc: string | null | undefined, bookId: string) {
  if (kdc) {
    const d = kdc[0]
    if ('012'.includes(d)) return KDC_THEME.mystery
    if ('379'.includes(d)) return KDC_THEME.earth
    if ('45'.includes(d))  return KDC_THEME.nature
    if ('68'.includes(d))  return KDC_THEME.fantasy
  }
  const idx = Math.abs(hashString(bookId)) % INDEX_THEMES.length
  return INDEX_THEMES[idx]
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

// 완독 후 유예 시간 — 이 안엔 정상에 깃발(또는 세레모니 진행 중이면 댄스 캐릭터)이
// 꽂힌 채로 WorldMap(산책기록)에 남아있고, 지나면 완등기록(정상석)으로만 남고
// WorldMap에선 사라짐.
// ⚠ 예전엔 24시간이었는데, "산책기록 지도에 완독한 책이 계속 남아있지 않고 바로
// 빠졌으면 좋겠다"는 피드백을 받고 대폭 줄임 — 완등 세레모니(폭죽·CLEAR·정상 댄스,
// BURST_DURATION_MS=3200ms)가 다 재생될 시간만 확보하고 곧바로 사라지게 함.
// 값 자체를 BURST_DURATION_MS를 참조해 정의하고 싶지만 그 상수가 파일 뒤쪽에
// 선언돼 있어(TDZ 문제) 숫자를 직접 맞춰둠 — BURST_DURATION_MS를 바꾸면 이 값도
// 같이 조정할 것.
const COMPLETION_GRACE_MS = 3500

function isRecentlyCompleted(book: WorldMapBook): boolean {
  if (book.status !== 'completed' || !book.completed_at) return false
  const elapsed = Date.now() - new Date(book.completed_at).getTime()
  return elapsed >= 0 && elapsed < COMPLETION_GRACE_MS
}

// ─── Sky ─────────────────────────────────────────────────────────────────────
// 기본값은 실제 시각 기준 낮/밤 순환. 데모 스크린샷 등 특정 시각 고정이 필요하면
// <WorldMap fixedHour={10} /> 처럼 시간을 직접 넘길 것.

type SkyConfig = {
  topColor: string
  bottomColor: string
  stars: boolean
  daytime: boolean
}

function getSky(hour: number): SkyConfig {
  if (hour < 6)  return { topColor: '#060b22', bottomColor: '#0d1540', stars: true,  daytime: false }
  if (hour < 16) return { topColor: '#8fccf0', bottomColor: '#bfe4fa', stars: false, daytime: true }
  // 노을(16-18시) — 순빨강 대신 옐로우를 섞어 차분한 앰버/골드 톤으로
  if (hour < 19) return { topColor: '#d9772e', bottomColor: '#f5b95f', stars: false, daytime: false }
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

function drawChar(ctx: CanvasRenderingContext2D, cx: number, cy: number, frame: number, outfitColor?: string) {
  const rows = frame % 2 === 0 ? CHAR_ROWS_A : CHAR_ROWS_B
  const w = rows[0].length * CPX
  const h = rows.length * CPX
  rows.forEach((row, ri) => {
    row.split('').forEach((cell, ci) => {
      const color = cell === 'B' && outfitColor ? outfitColor : CHAR_COLORS[cell]
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

// 완독 깃발 (색은 호출 측에서 getFlagColor(book.id)로 전달 — 책마다 고정된 랜덤 색).
// 완독 유예(COMPLETION_GRACE_MS) 동안만 그려짐 — 그 이후엔 완등기록으로 옮겨가서 안 보임.
function drawFlag(ctx: CanvasRenderingContext2D, peakCenterX: number, peakTopY: number, color: string) {
  const poleH = 16
  ctx.fillStyle = '#5a5a5a'
  ctx.fillRect(Math.round(peakCenterX - 1), Math.round(peakTopY - poleH), 2, poleH)
  ctx.fillStyle = color
  ctx.fillRect(Math.round(peakCenterX + 1), Math.round(peakTopY - poleH), 9, 6)
}

// ─── 완등 세레모니 (산 정상 위 인라인 이펙트) ──────────────────────────────────
// 풀스크린 팝업 대신, 방금 완독된 책의 산 정상 위에서 직접 폭죽이 터지고
// 캐릭터가 양팔을 들고 춤추는 걸 보여준다. books prop이 갱신되며 어떤 책의
// status가 completed로 "막" 바뀐 걸 감지하면(아래 useEffect) 이 burst가 생성되고,
// BURST_DURATION_MS 동안만 정상 위에 그려진 뒤 사라진다(깃발은 이후에 정상 노출).

const BURST_DURATION_MS = 3200
const BURST_PARTICLE_COUNT = 22
const BURST_COLORS = ['#f0c040', '#e03e2f', '#2f6fe0', '#2fb573', '#e0527a', '#8ac03f', '#ffd23e']

type BurstParticle = { angle: number; speed: number; color: string; size: number }
type Burst = { startedAt: number; particles: BurstParticle[] }

function makeBurstParticles(): BurstParticle[] {
  return Array.from({ length: BURST_PARTICLE_COUNT }, () => ({
    angle: Math.random() * Math.PI * 2,
    speed: 0.7 + Math.random() * 1.5,
    color: BURST_COLORS[Math.floor(Math.random() * BURST_COLORS.length)],
    size: 3 + Math.floor(Math.random() * 3),
  }))
}

// 정상 좌표(peakX, peakY) 기준으로 사방으로 튀어올랐다가 중력에 끌려 떨어지는
// 폭죽 조각들. 매 프레임 elapsed(경과 ms)로부터 위치를 계산하는 방식이라
// 별도 프레임 상태 갱신 없이도 재생 가능(값만 읽으면 됨).
function drawBurstParticles(
  ctx: CanvasRenderingContext2D,
  burst: Burst,
  elapsed: number,
  peakX: number,
  peakY: number
) {
  const t = elapsed / 1000 // 초 단위
  const fade = Math.max(0, 1 - elapsed / BURST_DURATION_MS)
  burst.particles.forEach((p) => {
    const dist = p.speed * 42 * t
    const x = peakX + Math.cos(p.angle) * dist
    const y = peakY - Math.sin(p.angle) * dist * 0.7 - 18 + 70 * t * t
    ctx.globalAlpha = fade
    ctx.fillStyle = p.color
    ctx.fillRect(Math.round(x), Math.round(y), p.size, p.size)
  })
  ctx.globalAlpha = 1
}

// "CLEAR!" 픽셀 타이포 — 팝인(scale) 후 종료 직전 페이드아웃
function drawClearPixelText(ctx: CanvasRenderingContext2D, elapsed: number, cx: number, y: number) {
  const popProgress = Math.min(elapsed / 260, 1)
  const scale = 0.5 + 0.5 * popProgress
  const fadeStart = BURST_DURATION_MS - 500
  const alpha = elapsed > fadeStart ? Math.max(0, 1 - (elapsed - fadeStart) / 500) : 1
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(cx, y)
  ctx.scale(scale, scale)
  ctx.font = 'bold 15px monospace'
  ctx.textAlign = 'center'
  ctx.fillStyle = '#b0791a'
  ctx.fillText('CLEAR!', 2, 2)
  ctx.fillStyle = '#ffd23e'
  ctx.fillText('CLEAR!', 0, 0)
  ctx.restore()
  ctx.globalAlpha = 1
}

// 세레모니 전용 캐릭터 포즈(양팔을 번쩍 든 8열 스프라이트) — WorldMap 평상시
// 걷기/오르기 포즈(CHAR_ROWS_A/B, 6열)와는 별개. 정상에서만 잠깐 등장.
const DANCE_CHAR_ROWS_A = [
  '..HHHH..',
  'S.SSSS.S',
  '..BBBB..',
  '.BBBBBB.',
  '..BBBB..',
  '..BBBB..',
  '.L....L.',
  '.L....L.',
]
const DANCE_CHAR_ROWS_B = [
  '.SHHHHS.',
  '..SSSS..',
  '..BBBB..',
  '.BBBBBB.',
  '..BBBB..',
  '..BBBB..',
  '..LLLL..',
  '.L....L.',
]

function drawDanceChar(ctx: CanvasRenderingContext2D, cx: number, cy: number, frame: number, outfitColor?: string) {
  const rows = frame % 2 === 0 ? DANCE_CHAR_ROWS_A : DANCE_CHAR_ROWS_B
  const w = rows[0].length * CPX
  const h = rows.length * CPX
  rows.forEach((row, ri) => {
    row.split('').forEach((cell, ci) => {
      const color = cell === 'B' && outfitColor ? outfitColor : CHAR_COLORS[cell]
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

// 배경 설산 실루엣 — 전경 픽셀아트와 일부러 다르게(매끈한 삼각형 + 안개톤 단일색)
// 그려서 "이건 정보가 아니라 분위기"라는 걸 시각적으로 구분한다. 책마다 고정된
// 랜덤 높이만 주고 KDC색/식별 요소는 전혀 넣지 않음 — 겹쳐 보여도 상관없음.
function drawBackgroundRange(
  ctx: CanvasRenderingContext2D,
  bgBooks: WorldMapBook[],
  canvasW: number,
  mountainBaseY: number
) {
  if (bgBooks.length === 0) return
  const spacing = Math.max(16, canvasW / (bgBooks.length + 1))
  ctx.globalAlpha = 0.38
  ctx.fillStyle = '#dce8f5'
  bgBooks.forEach((book, i) => {
    const rand = mulberry32(hashString(book.id))
    const h = 36 + Math.floor(rand() * 28) // 36~64px, 책마다 고정된 랜덤
    const w = 44
    const cx = spacing * (i + 1)
    const baseY = mountainBaseY - 18
    ctx.beginPath()
    ctx.moveTo(cx - w / 2, baseY)
    ctx.lineTo(cx, baseY - h)
    ctx.lineTo(cx + w / 2, baseY)
    ctx.closePath()
    ctx.fill()
  })
  ctx.globalAlpha = 1
}

function truncateMemo(memo: string, max = 36): string {
  const trimmed = memo.trim()
  return trimmed.length > max ? trimmed.slice(0, max) + '…' : trimmed
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

// ─── 날씨 (벚꽃비/비/눈) ───────────────────────────────────────────────────────
// ⚠ 예전엔 방문(마운트)마다 매번 다시 랜덤을 굴려서, 하루 안에서도 새로고침할
// 때마다 날씨가 왔다갔다했음 — 그리고 계절 구분 없이 아무 때나 비/눈이 섞여 나왔음.
// 지금은 오늘 날짜(YYYY-MM-DD)를 시드로 써서 하루 동안은 항상 같은 결과가 나오고
// (memoBubbles와 동일한 패턴), 계절에 맞는 날씨 종류만 등장하게 바꿈:
//   - 4월: 벚꽃비(bloom) — 눈과 같은 낙하 파티클이지만 연보라색
//   - 5~11월: 비(rain)
//   - 12~3월: 눈(snow)
// 빈도는 한 달에 3~4번 정도만 나오도록 낮춤(대략 3.5/30일 ≈ 11.7%). 나머지는 맑음.
type WeatherKind = 'clear' | 'rain' | 'snow' | 'bloom'

const WEATHER_DAYS_PER_MONTH = 3.5
const WEATHER_CHANCE = WEATHER_DAYS_PER_MONTH / 30

function getSeasonalWeatherKind(month: number): 'bloom' | 'rain' | 'snow' {
  if (month === 4) return 'bloom'
  if (month >= 5 && month <= 11) return 'rain'
  return 'snow' // 12, 1, 2, 3월
}

function getTodaysWeather(now: Date = new Date()): WeatherKind {
  const dateKey = now.toISOString().slice(0, 10) // YYYY-MM-DD — 하루 동안 고정되는 시드
  const rand = mulberry32(hashString(dateKey))
  if (rand() >= WEATHER_CHANCE) return 'clear'
  return getSeasonalWeatherKind(now.getMonth() + 1) // getMonth()는 0~11
}

type RainDrop = { x: number; y: number; len: number; speed: number; opacity: number }
type SnowFlake = {
  x: number
  y: number
  size: number
  speed: number
  driftPhase: number
  driftSpeed: number
  opacity: number
}

function makeRainDrops(canvasW: number, canvasH: number): RainDrop[] {
  return Array.from({ length: 70 }, () => ({
    x: Math.random() * canvasW,
    y: Math.random() * canvasH,
    len: 10 + Math.random() * 8,
    speed: 7 + Math.random() * 5,
    opacity: 0.3 + Math.random() * 0.35,
  }))
}

function makeSnowFlakes(canvasW: number, canvasH: number): SnowFlake[] {
  return Array.from({ length: 50 }, () => ({
    x: Math.random() * canvasW,
    y: Math.random() * canvasH,
    size: 2 + Math.random() * 3,
    speed: 0.6 + Math.random() * 1.2,
    driftPhase: Math.random() * Math.PI * 2,
    driftSpeed: 0.01 + Math.random() * 0.02,
    opacity: 0.5 + Math.random() * 0.4,
  }))
}

// 날씨 있을 때 하늘을 살짝 물들여서 분위기를 더해줌 — 비는 흐린 청회색,
// 눈은 옅은 흰색 안개, 벚꽃비는 은은한 연보라 톤
function drawWeatherTint(ctx: CanvasRenderingContext2D, W: number, H: number, weather: WeatherKind) {
  if (weather === 'clear') return
  const tint =
    weather === 'rain' ? 'rgba(40,55,80,0.22)' :
    weather === 'bloom' ? 'rgba(216,180,254,0.12)' :
    'rgba(255,255,255,0.08)' // snow
  ctx.fillStyle = tint
  ctx.fillRect(0, 0, W, H)
}

function drawRain(ctx: CanvasRenderingContext2D, drops: RainDrop[], W: number, H: number) {
  ctx.strokeStyle = 'rgba(180,210,240,0.7)'
  ctx.lineWidth = 2
  drops.forEach((d) => {
    ctx.globalAlpha = d.opacity
    ctx.beginPath()
    ctx.moveTo(d.x, d.y)
    ctx.lineTo(d.x - 3, d.y + d.len)
    ctx.stroke()
    d.y += d.speed
    d.x -= 0.6
    if (d.y > H) {
      d.y = -d.len
      d.x = Math.random() * W
    }
  })
  ctx.globalAlpha = 1
}

// 눈과 벚꽃비 둘 다 같은 낙하 물리를 쓰고 색만 다름 (color 생략 시 흰 눈)
function drawSnow(ctx: CanvasRenderingContext2D, flakes: SnowFlake[], W: number, H: number, color = '#ffffff') {
  ctx.fillStyle = color
  flakes.forEach((f) => {
    ctx.globalAlpha = f.opacity
    ctx.fillRect(Math.round(f.x), Math.round(f.y), f.size, f.size)
    f.y += f.speed
    f.driftPhase += f.driftSpeed
    f.x += Math.sin(f.driftPhase) * 0.6
    if (f.y > H) {
      f.y = -f.size
      f.x = Math.random() * W
    }
  })
  ctx.globalAlpha = 1
}

// ─── Hit-test helper ─────────────────────────────────────────────────────────

function getMountainRects(books: WorldMapBook[], canvasH: number, containerW: number) {
  const mountainBaseY = canvasH - GROUND_H
  const slotW = computeSlotW(books.length, containerW)
  return books.map((book, i) => {
    const level = getLevel(book.total_pages)
    const steps = STEPS_BY_LEVEL[level]
    const mtnW = (2 * steps - 1) * PX
    const mtnH = (steps + 2) * PX
    const baseX = 24 + i * slotW + (MAX_MTN_W - mtnW) / 2
    const baseY = mountainBaseY - mtnH
    return { book, x: baseX, y: baseY, w: mtnW, h: mtnH + GROUND_H / 2 }
  })
}

// 하늘 우측 상단 해/별 위치 — drawPixelSun(ctx, W-64, 28)과 같은 자리를 씀.
// 낮엔 해, 밤엔 이 자리에 큰 별을 따로 그려서 "책 추가하기" 버튼 역할을 하게 함.
function getAddButtonAnchor(canvasW: number) {
  return { x: canvasW - 55, y: 37 }
}

function getAddButtonRect(canvasW: number) {
  const { x, y } = getAddButtonAnchor(canvasW)
  return { x: x - 20, y: y - 20, w: 40, h: 40 }
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
  onAddBook,           // 하늘 우측 상단 해(낮)/별(밤)을 눌렀을 때 — 책 추가 트리거
  fixedHour = null,   // null = 실제 시각 사용. 데모 스크린샷이 필요하면 10 등 특정 시각을 넘길 것.
  mode = 'home',       // 'home' = 전경/배경 분리 + 읽는 중 캐릭터. 'trophy' = 완등기록용 —
                        // 넘어온 책 전부를 그대로 보여주고(배경 없음), 산/나무/모닥불/깃발만
}: {
  books?: WorldMapBook[]
  onBookClick?: (book: WorldMapBook) => void
  onAddBook?: () => void
  fixedHour?: number | null
  mode?: 'home' | 'trophy'
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)

  // 완독/멈춤 산을 탭했을 때 뜨는 "제목 · 상태" 말풍선 (읽는 중인 산은 onBookClick으로
  // 바로 진행률 모달이 열리므로 이 툴팁을 쓰지 않음)
  const [tooltip, setTooltip] = useState<{ book: WorldMapBook; x: number; y: number } | null>(null)

  // 하늘 우측 상단 해/별에 마우스를 올렸을 때 뜨는 "책 추가하기" 힌트
  const [addHint, setAddHint] = useState<{ x: number; y: number } | null>(null)

  // 메모 말풍선 위치 계산용 — 캔버스와 별개로 컨테이너 실측 폭을 상태로도 들고 있음
  const [containerW, setContainerW] = useState(0)

  useEffect(() => {
    setTooltip(null)
    setAddHint(null)
  }, [books])

  const stars = useMemo(() => makeStars(60), [])

  // 날씨(벚꽃비/비/눈) — 오늘 날짜로 결정되므로 하루 동안은 재방문/새로고침해도 동일.
  // trophy(완등기록) 화면엔 굳이 날씨를 넣지 않고 항상 맑음으로 둠.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const weather = useMemo<WeatherKind>(() => (mode === 'home' ? getTodaysWeather() : 'clear'), [])

  // 완독 책은 완독 후 잠깐(세레모니 재생 시간만큼)만 정상에 깃발 꽂힌 채로 WorldMap에 남고,
  // 그 이후엔 완등기록(정상석)으로만 남아 WorldMap에서 완전히 사라진다.
  // 남은 책(읽는 중 + 미시작) 중 읽는 중은 항상 전경, 부족분은 미시작 책 중
  // 방문마다(= books prop이 바뀔 때마다) 랜덤으로 뽑아 전경을 채운다.
  // 전경에 못 든 미시작 책은 배경 설산으로만 존재.
  const { foreground, background } = useMemo(() => {
    // trophy 모드(완등기록)는 최신 TARGET_TROPHY개만 전경에 — 배경/랜덤 선정은 없지만
    // 완독이 쌓일수록 지도가 무한정 길어지지 않도록 최근 것만 자름 (나머지는 아래
    // 전체 목록에서 확인). books는 호출 측에서 이미 최신순으로 정렬해 넘겨준다는 전제.
    if (mode === 'trophy') return { foreground: books.slice(0, TARGET_TROPHY), background: [] as WorldMapBook[] }

    const reading = books.filter((b) => b.status === 'reading')
    const paused = books.filter((b) => b.status === 'paused')
    const recentlyCompleted = books.filter(isRecentlyCompleted)

    const need = Math.max(0, TARGET_FOREGROUND - reading.length - recentlyCompleted.length)
    const shuffled = [...paused].sort(() => Math.random() - 0.5)
    const bonusIds = new Set(shuffled.slice(0, need).map((b) => b.id))

    const fgIds = new Set(
      reading.map((b) => b.id)
        .concat(recentlyCompleted.map((b) => b.id))
        .concat(Array.from(bonusIds))
    )
    // 전경은 등록 순서(타임라인) 그대로 유지
    const fg = books.filter((b) => fgIds.has(b.id))
    const bg = paused.filter((b) => !bonusIds.has(b.id))

    return { foreground: fg, background: bg }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [books, mode])

  // 책마다 고정된 눈 패턴 (id + total_pages가 바뀔 때만 재계산 — 그 외엔 항상 동일)
  const snowMasks = useMemo(() => {
    const map = new Map<string, Set<string>>()
    foreground.forEach((book) => {
      const steps = STEPS_BY_LEVEL[getLevel(book.total_pages)]
      map.set(book.id, buildSnowMask(book, steps))
    })
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foreground.map((b) => `${b.id}:${b.total_pages}:${b.status}`).join(',')])

  // 메모 있는 책 중 오늘(날짜 기준) 랜덤 2~3개만 뽑아 산 위에 말풍선으로 항상 띄운다.
  // 모두 다 띄우면 번잡스러우니 개수를 제한하고, 날짜를 시드로 써서 하루 동안은
  // 같은 책이 뽑히고 다음날엔 다시 섞이게 한다.
  const memoBubbles = useMemo(() => {
    const candidates = foreground.filter((b) => b.memo && b.memo.trim())
    if (candidates.length === 0 || containerW === 0) return []

    const todayKey = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
    const rand = mulberry32(hashString(todayKey))

    const shuffled = [...candidates]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    const count = Math.min(shuffled.length, 2 + Math.floor(rand() * 2)) // 2~3개
    const picked = shuffled.slice(0, count)

    const rects = getMountainRects(foreground, CANVAS_H, containerW)
    return picked
      .map((book) => {
        const rect = rects.find((r) => r.book.id === book.id)
        if (!rect) return null
        return { book, x: rect.x + rect.w / 2, y: rect.y }
      })
      .filter((v): v is { book: WorldMapBook; x: number; y: number } => v !== null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foreground.map((b) => `${b.id}:${!!b.memo}`).join(','), containerW])

  const stateRef = useRef({
    hour: fixedHour ?? new Date().getHours(),
    bounceFrame: 0,
    charFrame: 0,
    fireFrame: 0,
    clouds: null as CloudState[] | null,
    cloudsForW: 0,
    lastBounceTime: 0,
    lastFireTime: 0,
    weatherParticles: null as RainDrop[] | SnowFlake[] | null,
    weatherForW: 0,
    // 완등 세레모니 — bookId별로 시작 시각(performance.now() 기준, rAF timestamp와
    // 같은 시계)과 폭죽 파티클을 들고 있음. 아래 감지 useEffect가 채워 넣고,
    // draw() 루프가 BURST_DURATION_MS 지나면 알아서 지운다.
    bursts: new Map<string, Burst>(),
  })

  // 완등 세레모니 트리거 — books prop이 갱신될 때마다 이전 상태와 비교해서
  // "이번에 막 completed로 바뀐 책"을 찾아 burst를 만든다. 최초 마운트(prev가 없을 때)엔
  // 절대 트리거하지 않음 — 안 그러면 이미 완독된 책이 있는 페이지를 처음 열 때마다
  // 세레모니가 뜨는 오작동이 생김.
  const prevStatusRef = useRef<Map<string, WorldMapBook['status']> | null>(null)
  useEffect(() => {
    const prev = prevStatusRef.current
    if (prev) {
      books.forEach((b) => {
        const prevStatus = prev.get(b.id)
        if (b.status === 'completed' && prevStatus && prevStatus !== 'completed') {
          stateRef.current.bursts.set(b.id, { startedAt: performance.now(), particles: makeBurstParticles() })
        }
      })
    }
    prevStatusRef.current = new Map(books.map((b) => [b.id, b.status]))
  }, [books])

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

    function draw(timestamp: number) {
      const s = stateRef.current

      // ⚠ 수정: 캔버스 크기를 마운트 시 한 번이 아니라 매 프레임 읽음.
      // (이전 버전은 리사이즈 후에도 옛 폭 기준으로 그려 오른쪽이 비는 버그가 있었음)
      const W = canvas!.width
      const H = canvas!.height
      // 컨테이너 실제 폭 기준으로 슬롯 폭 계산 (전경 산이 많으면 좁아지거나 겹침)
      const slotW = computeSlotW(foreground.length, wrapRef.current?.clientWidth ?? W)

      // 구름 초기화 / 폭 변경 시 재배치
      if (!s.clouds || s.cloudsForW !== W) {
        s.clouds = makeCloudStates(W)
        s.cloudsForW = W
      }

      // 날씨 파티클 초기화 / 폭 변경 시 재배치 (맑음이면 그냥 비워둠)
      if (weather !== 'clear' && (!s.weatherParticles || s.weatherForW !== W)) {
        s.weatherParticles = weather === 'rain' ? makeRainDrops(W, H) : makeSnowFlakes(W, H)
        s.weatherForW = W
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
        // 우측 상단 큰 별 — 낮의 해와 같은 자리, "책 추가하기" 버튼 역할 (home 모드에서만)
        if (mode === 'home') {
          const addAnchor = getAddButtonAnchor(W)
          drawStar(ctx, addAnchor.x, addAnchor.y, 6, 1)
        }
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

      // ── 배경 설산 (전경에 못 든 미시작 책들 — 흐릿하고 식별 불가) ──────────

      drawBackgroundRange(ctx, background, W, mountainBaseY)

      // ── 지상 데코 (꽃 · 나무 · 버섯) — 좌표 고정, 항상 동일 ────────────────

      const deco = 6
      // 좌측 끝 꽃밭 (첫 산 왼쪽)
      drawSprite(ctx, FLOWER_ROWS, FLOWER_COLORS, 4, mountainBaseY, deco)
      drawSprite(ctx, FLOWER_ROWS, FLOWER_COLORS, 40, mountainBaseY, deco)

      // 산 사이 간격마다 나무 2그루
      for (let i = 0; i < foreground.length - 1; i++) {
        const slotBoundary = 24 + (i + 1) * slotW - GAP / 2
        drawSprite(ctx, TREE_ROWS, TREE_COLORS, slotBoundary - 40, mountainBaseY, deco)
        drawSprite(ctx, TREE_ROWS, TREE_COLORS, slotBoundary + 4, mountainBaseY, deco)
      }

      // 세 번째 산 근처 버섯 (데모의 작은 빨간 포인트)
      if (foreground.length >= 3) {
        const mushX = 24 + 3 * slotW - GAP / 2 - 14
        drawSprite(ctx, MUSHROOM_ROWS, MUSHROOM_COLORS, mushX, mountainBaseY, 4)
      }

      // ── 산들 (전부 선명하게 — 이전 버전의 50% 딤/축소 제거) ────────────────

      foreground.forEach((book, i) => {
        const level = getLevel(book.total_pages)
        const steps = STEPS_BY_LEVEL[level]
        const theme = getTheme(book.kdc, book.id)
        const mid = steps - 1
        const mtnW = (2 * steps - 1) * PX
        const baseX = 24 + i * slotW + (MAX_MTN_W - mtnW) / 2
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

        // 완등 세레모니 진행 중인지 확인 — 진행 중이면 이번 프레임엔 깃발 대신
        // 정상 댄스 캐릭터 + CLEAR! + 폭죽을 그리고, 지속시간이 지나면 burst를
        // 지워서 이후 프레임부터는 평소처럼 깃발만 보이게 한다.
        const burst = stateRef.current.bursts.get(book.id)
        const burstElapsed = burst ? timestamp - burst.startedAt : 0
        const burstActive = !!burst && burstElapsed < BURST_DURATION_MS
        if (burst && !burstActive) {
          stateRef.current.bursts.delete(book.id)
        }

        // 완독(유예 시간 안) → 정상에 깃발 (색은 책마다 고정된 랜덤 색).
        // 세레모니가 진행 중인 동안엔 깃발 대신 댄스 캐릭터가 그 자리를 대신함.
        if (book.status === 'completed' && !burstActive) {
          drawFlag(ctx, baseX + mid * PX + PX / 2, baseY, getFlagColor(book.id))
        }

        if (burstActive && burst) {
          const peakX = baseX + mid * PX + PX / 2
          const s2 = stateRef.current
          const bounce = s2.bounceFrame < 10 ? -(s2.bounceFrame * 0.35) : -((20 - s2.bounceFrame) * 0.35)
          drawDanceChar(ctx, peakX, baseY + bounce, s2.charFrame, theme.char)
          drawClearPixelText(ctx, burstElapsed, peakX, baseY - 26)
          drawBurstParticles(ctx, burst, burstElapsed, peakX, baseY)
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
          // ⚠ 수정 1: 기존엔 (steps - 1)을 분모로 써서 0%가 산 몸통 마지막 행(row steps-1)
          // 에서 시작 — 실제로는 그 아래로 베이스 2행이 더 있어서 캐릭터가 지면보다
          // 3행(30px)이나 위에 떠서 시작하는 것처럼 보였음 → 발 기준점 하한을 지면
          // (mountainBaseY)까지 늘려서 0%가 산 밑동(지면)부터 시작하도록 수정.
          // ⚠ 수정 2: 발 기준점(charCY) 상한을 정상(baseY)으로 그대로 두면, 캐릭터
          // 스프라이트 키(charH)만큼 머리가 발보다 위로 그려지기 때문에 진행률이
          // 100%에 한참 못 미쳐도(예: 87%) 머리가 이미 산꼭대기 밖으로 튀어나와
          // "정상 위에 있는" 것처럼 보였음. 발이 도달해야 할 상한을 baseY가 아니라
          // baseY + charH(정상에 머리가 닿는 지점)로 낮춰서, 실제로 100%가 되어야만
          // 머리가 정상에 닿게 비율을 더 세밀하게(선형으로) 조정.
          const charH = CHAR_ROWS_A.length * CPX // 8행 × 3px = 24px (두 프레임 높이 동일)
          const climbRange = mountainBaseY - baseY // 이 산의 전체 높이(지면~정상)
          const travel = Math.max(climbRange - charH, 0) // 발이 실제로 이동하는 거리
          const charCX = baseX + mid * PX + PX / 2
          const s2 = stateRef.current
          const bounceY = s2.bounceFrame < 10
            ? -(s2.bounceFrame * 0.35)
            : -((20 - s2.bounceFrame) * 0.35)
          const charCY = mountainBaseY - progress * travel + bounceY
          drawChar(ctx, charCX, charCY, s2.charFrame, theme.char)

          // 야간이면 산 아래 모닥불 — 항상 정중앙이면 단조로우니 책마다 고정된
          // 랜덤 위치(왼쪽/오른쪽 치우침)로 베이스 라인 위에 배치
          if (sky.stars) {
            const FIRE_X_RATIOS = [0.12, 0.28, 0.68, 0.82]
            const fireRatio = FIRE_X_RATIOS[Math.abs(hashString(book.id)) % FIRE_X_RATIOS.length]
            drawCampfire(ctx, baseX + mtnW * fireRatio - 4, mountainBaseY - 14, s2.fireFrame)
          }
        }

        // trophy 모드 → 시간대와 무관하게 완등을 자축하는 모닥불을 항상 켜둠
        if (mode === 'trophy') {
          const FIRE_X_RATIOS = [0.12, 0.28, 0.68, 0.82]
          const fireRatio = FIRE_X_RATIOS[Math.abs(hashString(book.id)) % FIRE_X_RATIOS.length]
          drawCampfire(ctx, baseX + mtnW * fireRatio - 4, mountainBaseY - 14, stateRef.current.fireFrame)
        }
      })

      // ── 책 없음 안내 ──────────────────────────────────────────────────────

      if (foreground.length === 0 && background.length === 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.35)'
        ctx.font = '13px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(
          mode === 'trophy' ? '완독하면 여기에 정상석이 생겨요 🚩' : '책을 추가하면 여기에 산이 생겨요 ⛰',
          W / 2,
          H - 80
        )
      }

      // ── 날씨 (벚꽃비/비/눈) — 전체 장면 맨 위에 오버레이로 그림 ──────────────

      if (weather !== 'clear' && s.weatherParticles) {
        drawWeatherTint(ctx, W, H, weather)
        if (weather === 'rain') {
          drawRain(ctx, s.weatherParticles as RainDrop[], W, H)
        } else if (weather === 'bloom') {
          drawSnow(ctx, s.weatherParticles as SnowFlake[], W, H, '#d9b3f0') // 연보라 꽃잎
        } else {
          drawSnow(ctx, s.weatherParticles as SnowFlake[], W, H) // snow, 기본 흰색
        }
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)

    // ── 클릭 hit-test ──────────────────────────────────────────────────────

    const canvasEl = canvas as HTMLCanvasElement

    function toCanvasPoint(clientX: number, clientY: number) {
      const rect = canvasEl.getBoundingClientRect()
      const scaleX = canvasEl.width / rect.width
      const scaleY = canvasEl.height / rect.height
      return { cx: (clientX - rect.left) * scaleX, cy: (clientY - rect.top) * scaleY }
    }

    function hitTestMountain(cx: number, cy: number) {
      const hitTestContainerW = wrapRef.current?.clientWidth ?? canvasEl.width
      const rects = getMountainRects(foreground, CANVAS_H, hitTestContainerW)
      return rects.find((r) => cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h)
    }

    function hitTestAddButton(cx: number, cy: number) {
      if (mode !== 'home') return false // trophy 모드엔 책 추가 버튼이 없음
      const r = getAddButtonRect(canvasEl.width)
      return cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h
    }

    // 마우스 호버 → 산 위에 마우스만 올려도 "제목 · 상태" 말풍선, 해/별 위에선 "책 추가하기" 힌트
    function handleMouseMove(e: MouseEvent) {
      const { cx, cy } = toCanvasPoint(e.clientX, e.clientY)
      const hit = hitTestMountain(cx, cy)
      if (hit) {
        setTooltip({ book: hit.book, x: hit.x + hit.w / 2, y: hit.y })
        setAddHint(null)
        return
      }
      setTooltip(null)
      if (hitTestAddButton(cx, cy)) {
        const anchor = getAddButtonAnchor(canvasEl.width)
        setAddHint(anchor)
      } else {
        setAddHint(null)
      }
    }
    function handleMouseLeave() {
      setTooltip(null)
      setAddHint(null)
    }

    // 탭/클릭 → 터치 기기 대응 + 읽는 중인 산은 진행률 모달을 염
    function handleClick(e: MouseEvent) {
      const { cx, cy } = toCanvasPoint(e.clientX, e.clientY)
      const hit = hitTestMountain(cx, cy)
      if (hit) {
        if (hit.book.status === 'reading') {
          setTooltip(null)
          onBookClick?.(hit.book)
        } else {
          setTooltip({ book: hit.book, x: hit.x + hit.w / 2, y: hit.y })
        }
        return
      }
      setTooltip(null)
      if (hitTestAddButton(cx, cy)) {
        onAddBook?.()
      }
    }
    canvasEl.addEventListener('click', handleClick)
    canvasEl.addEventListener('mousemove', handleMouseMove)
    canvasEl.addEventListener('mouseleave', handleMouseLeave)
    canvasEl.style.cursor = 'pointer'

    return () => {
      cancelAnimationFrame(rafRef.current)
      clearInterval(clockInterval)
      canvasEl.removeEventListener('click', handleClick)
      canvasEl.removeEventListener('mousemove', handleMouseMove)
      canvasEl.removeEventListener('mouseleave', handleMouseLeave)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foreground, background, stars, snowMasks, onBookClick, onAddBook, fixedHour, mode, weather])

  // ── 캔버스 크기: 컨테이너 폭 측정 후 동기화 (전경 산 개수 기준) ────────────

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return

    function syncSize() {
      if (!wrap || !canvas) return
      const cw = wrap.clientWidth
      setContainerW(cw)
      const slotW = computeSlotW(foreground.length, cw)
      const contentW = foreground.length * slotW + 64
      canvas.width = Math.max(contentW, cw)
      canvas.height = CANVAS_H
    }

    syncSize()
    const ro = new ResizeObserver(syncSize)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [foreground])

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

          {tooltip && (
            <div
              className="absolute z-10 pointer-events-none whitespace-nowrap rounded-lg bg-white px-2.5 py-1.5 text-center shadow-md"
              style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, calc(-100% - 8px))' }}
            >
              <div className="text-xs font-semibold text-gray-900">{tooltip.book.title}</div>
              <div className="text-[10px] text-gray-400">{STATUS_LABEL[tooltip.book.status]}</div>
              <div
                className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-white"
              />
            </div>
          )}

          {addHint && (
            <div
              className="absolute z-10 pointer-events-none whitespace-nowrap rounded-lg bg-white px-2.5 py-1.5 text-center shadow-md"
              style={{ left: addHint.x, top: addHint.y, transform: 'translate(-50%, calc(-100% - 14px))' }}
            >
              <div className="text-xs font-semibold text-gray-900">책 추가하기</div>
              <div
                className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-white"
              />
            </div>
          )}

          {/* 메모 말풍선 — 오늘의 랜덤 2~3개, 항상 떠 있음. 마우스 올린 산은
              위의 제목·상태 툴팁이 대신 뜨니 중복 방지로 숨김 */}
          {memoBubbles
            .filter((m) => m.book.id !== tooltip?.book.id)
            .map((m) => (
              <div
                key={m.book.id}
                className="absolute z-10 pointer-events-none max-w-[160px] rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1.5 text-center shadow-md"
                style={{ left: m.x, top: m.y, transform: 'translate(-50%, calc(-100% - 8px))' }}
              >
                <div className="text-[10px] font-medium text-amber-700 truncate">{m.book.title}</div>
                <div className="text-[11px] text-amber-900 leading-snug break-words">
                  {truncateMemo(m.book.memo!)}
                </div>
                <div className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-amber-50 border-r border-b border-amber-200" />
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
