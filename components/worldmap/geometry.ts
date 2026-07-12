// WorldMap 리팩토링(2026.07.12) — 좌표/크기/시드 계산(순수 함수)만 모은 모듈.
// 캔버스에 실제로 그리는 코드는 없음(그건 drawing.ts). 값은 전부 기존 WorldMap.tsx
// 에서 그대로 옮겨왔고, 동작 변화는 없다.
//
// ⚠ getMountainVisual / getStripBaseX 는 이번 리팩토링에서 새로 추가한 함수다.
// 기존엔 "레벨→스텝→테마→실루엣→프로필→산 폭/높이/정상칼럼" 계산과
// "baseX = 24 + i*slotW + (MAX_MTN_W-mtnW)/2" 좌표 공식이 WorldMap.tsx 안에서만
// 6곳 넘게 복붙돼 있었다(docs/verification.md "🔧 리팩토링 대상" 항목).
// 이 두 함수로 통합해서 모든 호출부가 항상 같은 계산 결과를 쓰도록 했다 — 반환값은
// 기존 복붙 코드들과 완전히 동일한 공식으로 계산되므로 화면 결과는 바뀌지 않는다.

import type { WorldMapBook } from './worldmap-utils'
import { isAuroraBook } from '@/lib/aurora-books'
import {
  PX,
  STEPS_BY_LEVEL,
  MAX_MTN_W,
  MIN_SLOT_W,
  MAX_COMPRESS_COUNT,
  GAP,
  GROUND_H,
  KDC_THEME,
  type KdcThemeKey,
  INDEX_THEME_KEYS,
  LONG_TITLE_THRESHOLD,
  FLAG_COLORS,
  AURORA_FLAG_COLORS,
  COMPLETION_GRACE_MS,
  SIDE_MOUNTAIN_SCALE,
} from './constants'

// ─── 시드 기반 결정론적 랜덤 ───────────────────────────────────────────────────
// 책 id를 시드로 써서, 매 렌더마다 값이 바뀌지 않고 "그 책은 항상 같은 결과"가
// 나오게 함. 진짜 Math.random()을 쓰면 리렌더될 때마다 눈 패턴/깃발 색이
// 바뀌어 버려서(표류), 결과물이 불안정해 보이는 원인이 됨.

export function hashString(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  return h
}

export function mulberry32(seed: number) {
  let a = seed | 0
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function computeSlotW(count: number, containerW: number): number {
  const comfortable = MAX_MTN_W + GAP
  if (count <= 0 || count > MAX_COMPRESS_COUNT) return comfortable
  const fitAll = (containerW - 48) / count
  return Math.max(MIN_SLOT_W, Math.min(comfortable, fitAll))
}

// ⚠ 예전엔 kdc가 없는 책의 색을 foreground 배열 안에서의 순번(index)으로 정했는데,
// 같은 책이라도 산책기록/완등기록에서 배열 구성·순서가 서로 달라서(등록순 vs
// 완독순, 개수도 다름) 페이지를 옮겨 다니면 색이 바뀌어 보이는 문제가 있었음.
// book.id를 시드로 쓰는 결정론적 해시로 바꿔서, kdc가 없어도 그 책은 어디서
// 봐도 항상 같은 색이 나오게 함(깃발 색과 동일한 방식 — getFlagColor 참고).
// 키(문자열)로 먼저 결정하고 getTheme()이 그 위에서 실제 색 객체를 반환하는 얇은
// wrapper인 이유는, 바이럴 캡처의 KDC 뱃지(countByTheme)가 색 객체가 아니라
// "어느 테마인지"만 필요해서 — 색 4종의 참조 동일성 비교보다 키 비교가 안전함.
export function getThemeKey(kdc: string | null | undefined, bookId: string): KdcThemeKey {
  if (kdc) {
    const d = kdc[0]
    if ('012'.includes(d)) return 'mystery'
    if ('379'.includes(d)) return 'earth'
    if ('45'.includes(d))  return 'nature'
    if ('68'.includes(d))  return 'fantasy'
  }
  const idx = Math.abs(hashString(bookId)) % INDEX_THEME_KEYS.length
  return INDEX_THEME_KEYS[idx]
}

export function getTheme(kdc: string | null | undefined, bookId: string) {
  return KDC_THEME[getThemeKey(kdc, bookId)]
}

// 책 목록을 KDC 테마별 개수로 집계 — 바이럴 캡처 왼쪽 상단 컬러 뱃지용
// (viral-capture.md "왼쪽 상단 컬러 뱃지" 참고. 라벨 없이 색+숫자만 노출).
export function countByTheme(books: WorldMapBook[]): Record<KdcThemeKey, number> {
  const counts: Record<KdcThemeKey, number> = { mystery: 0, earth: 0, nature: 0, fantasy: 0 }
  books.forEach((b) => {
    counts[getThemeKey(b.kdc, b.id)]++
  })
  return counts
}

export function getLevel(pages: number | null): 1 | 2 | 3 | 4 {
  if (!pages) return 2
  if (pages < 200) return 1
  if (pages < 400) return 2
  if (pages < 600) return 3
  return 4
}

// ─── 산 실루엣 다양화 ─────────────────────────────────────────────────────────
// 색(KDC 테마)은 분류를 고정으로 나타내고, 실루엣(모양)은 책 하나하나를 구분하는
// 용도(design-style.md "산 모양 다양화" 참고). 제목이 길면 폭이 가장 넓은 쌍봉
// (twin)을 배정해 산 아래 제목이 덜 잘리게 하고, 그 외에는 책 id 시드로
// 뾰족/비대칭/고원 중 하나를 결정론적으로 골라 "같은 분야도 다른 실루엣"을 만든다.
export type MountainShape = 'sharp' | 'skew' | 'twin' | 'plateau'

export function getMountainShape(book: WorldMapBook): MountainShape {
  if (book.title && book.title.trim().length >= LONG_TITLE_THRESHOLD) return 'twin'
  const others: MountainShape[] = ['sharp', 'skew', 'plateau']
  return others[Math.abs(hashString(book.id)) % others.length]
}

export type MountainProfile = {
  numCols: number
  heights: number[] // 칼럼별 쌓인 블록 수(1~steps) — 산 몸통 렌더링·hit-test가 모두 이 값을 기준으로 함
  peakCols: number[] // 정상(snow) 칼럼. 쌍봉/고원은 2개 이상.
}

// 실루엣별 컬럼 높이맵을 계산. numCols(=산 폭 ÷ PX)는 실루엣마다 달라질 수 있음
// (쌍봉만 더 넓게 잡아 긴 제목이 들어갈 공간을 확보). seed는 비대칭(skew)의
// 치우침 방향/정도를 책마다 다르게 주기 위한 값(호출 측이 hashString(book.id)로 넘김).
export function getMountainProfile(shape: MountainShape, steps: number, seed: number): MountainProfile {
  if (shape === 'twin') {
    const numCols = 2 * steps + 1
    const mid = steps
    const peakOffset = Math.max(2, Math.floor(steps / 2))
    const leftPeak = mid - peakOffset
    const rightPeak = mid + peakOffset
    const heights = Array.from({ length: numCols }, (_, c) =>
      Math.max(1, steps - Math.abs(c - leftPeak), steps - Math.abs(c - rightPeak))
    )
    return { numCols, heights, peakCols: [leftPeak, rightPeak] }
  }

  const numCols = 2 * steps - 1
  const mid = steps - 1

  if (shape === 'plateau') {
    const flatHalf = Math.max(0, Math.floor(steps / 3))
    const flatStart = mid - flatHalf
    const flatEnd = mid + flatHalf
    const heights = Array.from({ length: numCols }, (_, c) =>
      c >= flatStart && c <= flatEnd ? steps : steps - Math.abs(c - mid)
    )
    const peakCols = Array.from({ length: flatEnd - flatStart + 1 }, (_, i) => flatStart + i)
    return { numCols, heights, peakCols }
  }

  if (shape === 'skew') {
    const magnitude = 1 + (Math.abs(seed) % Math.max(1, Math.floor(steps / 3)))
    const dir = seed % 2 === 0 ? 1 : -1
    const peakCol = Math.min(numCols - 2, Math.max(1, mid + dir * magnitude))
    const heights = Array.from({ length: numCols }, (_, c) => {
      if (c <= peakCol) return 1 + Math.round((steps - 1) * (c / peakCol))
      return 1 + Math.round((steps - 1) * ((numCols - 1 - c) / (numCols - 1 - peakCol)))
    })
    return { numCols, heights, peakCols: [peakCol] }
  }

  // sharp — 좌우대칭 삼각형(기본형)
  const heights = Array.from({ length: numCols }, (_, c) => steps - Math.abs(c - mid))
  return { numCols, heights, peakCols: [mid] }
}

// 미시작 산의 랜덤 눈덮임 패턴 — book.id로 시드 고정, 위쪽일수록 눈 확률 ↑ (설선 효과).
// profile(실루엣별 높이맵) 기준으로 실제 채워진 칼럼에만 눈을 흩뿌려서, 실루엣이
// 달라져도(쌍봉·고원 등) 항상 산 몸통 안쪽에만 패턴이 생기게 한다.
export function buildSnowMask(book: WorldMapBook, steps: number, profile: MountainProfile): Set<string> {
  const mask = new Set<string>()
  if (book.status !== 'paused') return mask
  const rand = mulberry32(hashString(book.id))
  for (let row = 1; row < steps; row++) {
    const snowChance = Math.max(0.05, 0.78 - (row / steps) * 0.75)
    for (let col = 0; col < profile.numCols; col++) {
      if (profile.heights[col] < steps - row) continue // 이 칼럼은 이 row에서 아직 안 채워짐
      if (rand() < snowChance) mask.add(`${row}:${col}`)
    }
  }
  return mask
}

export function getFlagColor(id: string, isbn?: string | null): string {
  if (isAuroraBook(isbn)) {
    const idx = Math.abs(hashString(id)) % AURORA_FLAG_COLORS.length
    return AURORA_FLAG_COLORS[idx]
  }
  const idx = Math.abs(hashString(id)) % FLAG_COLORS.length
  return FLAG_COLORS[idx]
}

export function isRecentlyCompleted(book: WorldMapBook): boolean {
  if (book.status !== 'completed' || !book.completed_at) return false
  const elapsed = Date.now() - new Date(book.completed_at).getTime()
  return elapsed >= 0 && elapsed < COMPLETION_GRACE_MS
}

// ─── 책 한 권의 "위치 무관" 시각 계산 통합 (리팩토링 신규) ─────────────────────
// 레벨→스텝→테마→실루엣(시드 포함)→프로필→산 폭/높이/정상칼럼까지, 화면 어디에
// 그려지든 항상 같은 이 계산 블록이 기존 코드에 6곳 넘게 복붙돼 있었다. 여기 하나로
// 모아서 모든 렌더 경로(본 렌더 루프·완독맵 파노라마·정상 인증샷·산책기록 캡처·
// 옆산 렌더)가 동일한 값을 쓰게 한다.
export type MountainVisual = {
  level: 1 | 2 | 3 | 4
  steps: number
  theme: { fill: string; edge: string; snow: string; base: string; char: string }
  shape: MountainShape
  seed: number
  profile: MountainProfile
  mtnW: number
  mtnH: number
  peakCol: number
}

export function getMountainVisual(book: WorldMapBook): MountainVisual {
  const level = getLevel(book.total_pages)
  const steps = STEPS_BY_LEVEL[level]
  const theme = getTheme(book.kdc, book.id)
  const shape = getMountainShape(book)
  const seed = hashString(book.id)
  const profile = getMountainProfile(shape, steps, seed)
  const mtnW = profile.numCols * PX
  const mtnH = (steps + 2) * PX
  const peakCol = profile.peakCols[profile.peakCols.length - 1]
  return { level, steps, theme, shape, seed, profile, mtnW, mtnH, peakCol }
}

// 가로 스트립 레이아웃(전경 산이 왼쪽부터 순서대로 늘어선 형태)에서 i번째 산의
// baseX. getMountainRects·본 렌더 루프·완독맵 파노라마·handleCaptureHomeWorldMap
// 4곳에 똑같이 복붙돼 있던 공식(docs/verification.md 리팩토링 대상 1번)을 통합.
export function getStripBaseX(index: number, slotW: number, mtnW: number): number {
  return 24 + index * slotW + (MAX_MTN_W - mtnW) / 2
}

// ─── Hit-test helper ─────────────────────────────────────────────────────────

export function getMountainRects(books: WorldMapBook[], canvasH: number, containerW: number) {
  const mountainBaseY = canvasH - GROUND_H
  const slotW = computeSlotW(books.length, containerW)
  return books.map((book, i) => {
    const v = getMountainVisual(book)
    const baseX = getStripBaseX(i, slotW, v.mtnW)
    const baseY = mountainBaseY - v.mtnH
    return { book, x: baseX, y: baseY, w: v.mtnW, h: v.mtnH + GROUND_H / 2 }
  })
}

// 하늘 우측 상단 해/별 위치 — drawPixelSun(ctx, W-64, 28)과 같은 자리를 씀.
// 낮엔 해, 밤엔 이 자리에 큰 별을 따로 그려서 "책 추가하기" 버튼 역할을 하게 함.
export function getAddButtonAnchor(canvasW: number) {
  return { x: canvasW - 55, y: 37 }
}

export function getAddButtonRect(canvasW: number) {
  const { x, y } = getAddButtonAnchor(canvasW)
  return { x: x - 20, y: y - 20, w: 40, h: 40 }
}

// ─── 산책기록 캡처(정상 인증샷)의 "옆산" 크기 ──────────────────────────────────
export function sideMountainNumCols(book: WorldMapBook): number {
  return getMountainVisual(book).profile.numCols
}

// zoom — 주인공 산이 커지는 배율에 맞춰 옆산도 함께 커지도록 하는 배수(기본 1 =
// 기존 SIDE_MOUNTAIN_SCALE 그대로). 2026.07.12 "다른 산이나 해도 같이 커지는
// 방식은 어려워?" 피드백 반영.
export function sideMountainWidth(book: WorldMapBook, zoom: number = 1): number {
  return sideMountainNumCols(book) * PX * SIDE_MOUNTAIN_SCALE * zoom
}
