// WorldMap 리팩토링(2026.07.12) — 캔버스에 실제로 픽셀을 그리는 함수만 모은 모듈.
// "무엇을 어디에 그릴지" 계산(geometry.ts)과 "지금 상태가 뭔지"(sky-weather.ts)는
// 여기서 하지 않고 인자로만 받는다. 순서·색·오프셋 등은 전부 기존 WorldMap.tsx의
// 값을 그대로 옮겨온 것이라 화면 결과는 바뀌지 않는다.

import type { WorldMapBook } from './worldmap-utils'
import type { MountainProfile } from './geometry'
import type { RainDrop, SnowFlake, WeatherKind } from './sky-weather'
import { hashString, mulberry32, getMountainVisual } from './geometry'
import {
  PX,
  CPX,
  CHAR_COLORS,
  CHAR_ROWS_A,
  CHAR_ROWS_B,
  DANCE_CHAR_ROWS_A,
  DANCE_CHAR_ROWS_B,
  CLOUD_SHAPES,
  BURST_DURATION_MS,
  BURST_PARTICLE_COUNT,
  BURST_COLORS,
  KDC_THEME,
  KDC_BADGE_ORDER,
  type KdcThemeKey,
  SIDE_MOUNTAIN_SCALE,
  SIDE_MOUNTAIN_OPACITY,
} from './constants'

// ─── Draw helpers ─────────────────────────────────────────────────────────────

export function drawPixel(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, size = PX) {
  ctx.fillStyle = color
  ctx.fillRect(Math.round(x), Math.round(y), size, size)
}

export function drawSprite(
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

// 산 몸통(실루엣별 칼럼 높이맵 기준) + 베이스 2행을 그린다. WorldMap 본 렌더와
// renderCompletedPanorama(PNG 내보내기) 양쪽이 이 함수를 공유해서 실루엣 계산이
// 어긋나지 않게 함. row별로 실제 채워진 칼럼 중 맨 왼쪽/오른쪽을 능선(edge)으로,
// row 0(정상)에 걸리는 칼럼(들)을 snow로 칠한다 — 쌍봉·고원처럼 정상이 여러 칼럼
// 이어도 자동으로 전부 snow 처리됨. snowMask는 미시작(paused) 산의 랜덤 눈 패턴(선택).
export function drawMountainBody(
  ctx: CanvasRenderingContext2D,
  profile: MountainProfile,
  steps: number,
  theme: { fill: string; edge: string; snow: string },
  baseX: number,
  baseY: number,
  snowMask?: Set<string>
) {
  for (let row = 0; row < steps; row++) {
    const filledCols: number[] = []
    for (let col = 0; col < profile.numCols; col++) {
      if (profile.heights[col] >= steps - row) filledCols.push(col)
    }
    if (filledCols.length === 0) continue
    const rowMin = filledCols[0]
    const rowMax = filledCols[filledCols.length - 1]
    filledCols.forEach((col) => {
      const px = baseX + col * PX
      const py = baseY + row * PX
      const isTop = row === 0
      const isEdge = col === rowMin || col === rowMax
      // 미시작 상태 → 랜덤(고정 시드) 눈 패턴이 edge/fill보다 우선 적용
      const isSnowPatch = row > 0 && !!snowMask?.has(`${row}:${col}`)
      const color = isTop || isSnowPatch ? theme.snow : isEdge ? theme.edge : theme.fill
      drawPixel(ctx, px, py, color)
    })
  }
  // 베이스 2행 — 실루엣과 무관하게 항상 산 전체 폭을 꽉 채우는 어두운 띠
  for (let r = 0; r < 2; r++) {
    for (let col = 0; col < profile.numCols; col++) {
      drawPixel(ctx, baseX + col * PX, baseY + steps * PX + r * PX, theme.edge)
    }
  }
}

// 왼쪽 상단 KDC 색 구성 뱃지 — 바이럴 캡처(PNG) 전용. "문학 5권" 같은 라벨 없이
// 산 색 스와치 + 개수만 노출한다(design-style.md "KDC 값은 텍스트로 절대 노출하지
// 않는다" 원칙). 0권인 색은 뱃지 자체를 생략해 정보를 절제한다.
export function drawKdcBadge(
  ctx: CanvasRenderingContext2D,
  counts: Record<KdcThemeKey, number>,
  x: number,
  y: number
) {
  let cx = x
  KDC_BADGE_ORDER.forEach((key) => {
    const n = counts[key]
    if (n <= 0) return
    const theme = KDC_THEME[key]
    drawPixel(ctx, cx, y, theme.fill, 10)
    ctx.font = 'bold 11px monospace'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#fdf6e3'
    const label = String(n)
    ctx.fillText(label, cx + 14, y + 6)
    cx += 14 + ctx.measureText(label).width + 10
  })
}

// drawChar/drawDanceChar가 공유하는 렌더링 로직 — 프레임에 따라 A/B 두 포즈 중
// 하나를 골라 중심(cx, cy 하단) 기준으로 그려준다. 두 함수는 어떤 row 세트를
// 쓰는지만 다르므로 얇은 wrapper로 둠.
export function drawCharSprite(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  frame: number,
  rowsA: string[],
  rowsB: string[],
  outfitColor?: string
) {
  const rows = frame % 2 === 0 ? rowsA : rowsB
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

export function drawChar(ctx: CanvasRenderingContext2D, cx: number, cy: number, frame: number, outfitColor?: string) {
  drawCharSprite(ctx, cx, cy, frame, CHAR_ROWS_A, CHAR_ROWS_B, outfitColor)
}

export function drawCloud(
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
export function drawPixelSun(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number = 1) {
  const b = 6 * scale
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

// 완독 깃발 (색은 호출 측에서 getFlagColor(book.id, book.isbn)로 전달 — 책마다 고정된
// 랜덤 색. 오로라 이스터에그 책이면 오로라 팔레트로 자동 분기됨).
// 완독 유예(COMPLETION_GRACE_MS) 동안만 그려짐 — 그 이후엔 완등기록으로 옮겨가서 안 보임.
export function drawFlag(ctx: CanvasRenderingContext2D, peakCenterX: number, peakTopY: number, color: string) {
  const poleH = 16
  ctx.fillStyle = '#5a5a5a'
  ctx.fillRect(Math.round(peakCenterX - 1), Math.round(peakTopY - poleH), 2, poleH)
  ctx.fillStyle = color
  ctx.fillRect(Math.round(peakCenterX + 1), Math.round(peakTopY - poleH), 9, 6)
}

// ─── 완등 세레모니 (산 정상 위 인라인 이펙트) ──────────────────────────────────
// 풀스크린 팝업 대신, 방금 완독된 책의 산 정상 위에서 직접 폭죽이 터지고
// 캐릭터가 양팔을 들고 춤추는 걸 보여준다. books prop이 갱신되며 어떤 책의
// status가 completed로 "막" 바뀐 걸 감지하면(WorldMap.tsx의 useEffect) 이 burst가
// 생성되고, BURST_DURATION_MS 동안만 정상 위에 그려진 뒤 사라진다(깃발은 이후에 정상 노출).

export type BurstParticle = { angle: number; speed: number; color: string; size: number }
export type Burst = { startedAt: number; particles: BurstParticle[] }

export function makeBurstParticles(): BurstParticle[] {
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
// ⚠ 물리량을 실시간 초 단위가 아니라 BURST_DURATION_MS 대비 진행률(0~1)로 계산함 —
// 그래야 BURST_DURATION_MS를 늘리거나 줄여도 파티클이 항상 같은 화면 범위 안에서
// 퍼졌다 떨어지며, 지속시간만 늘렸을 때 화면 밖으로 날아가 버리는 걸 방지함.
export function drawBurstParticles(
  ctx: CanvasRenderingContext2D,
  burst: Burst,
  elapsed: number,
  peakX: number,
  peakY: number
) {
  const p = Math.min(elapsed / BURST_DURATION_MS, 1) // 0~1 진행률
  const outward = Math.min(p * 5, 1) // 처음 20%에서 빠르게 퍼지고 이후 그 자리 유지
  const drift = p * p // 전체 재생시간에 걸쳐 서서히 떨어짐(제곱으로 갈수록 가속)
  const fade = Math.max(0, 1 - p)
  burst.particles.forEach((particle) => {
    const dist = particle.speed * 70 * outward
    const x = peakX + Math.cos(particle.angle) * dist
    const y = peakY - Math.sin(particle.angle) * dist * 0.7 - 18 + 90 * drift
    ctx.globalAlpha = fade
    ctx.fillStyle = particle.color
    ctx.fillRect(Math.round(x), Math.round(y), particle.size, particle.size)
  })
  ctx.globalAlpha = 1
}

// "CLEAR!" 픽셀 타이포 — 팝인(scale) 후 종료 직전 페이드아웃
export function drawClearPixelText(ctx: CanvasRenderingContext2D, elapsed: number, cx: number, y: number) {
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

export function drawDanceChar(ctx: CanvasRenderingContext2D, cx: number, cy: number, frame: number, outfitColor?: string) {
  drawCharSprite(ctx, cx, cy, frame, DANCE_CHAR_ROWS_A, DANCE_CHAR_ROWS_B, outfitColor)
}

export function drawCampfire(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number) {
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
export function drawBackgroundRange(
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

export function truncateMemo(memo: string, max = 36): string {
  const trimmed = memo.trim()
  return trimmed.length > max ? trimmed.slice(0, max) + '…' : trimmed
}

export function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, opacity: number) {
  ctx.globalAlpha = opacity
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
}

// 날씨 있을 때 하늘을 살짝 물들여서 분위기를 더해줌 — 비는 흐린 청회색,
// 눈은 옅은 흰색 안개, 벚꽃비는 은은한 연보라 톤
export function drawWeatherTint(ctx: CanvasRenderingContext2D, W: number, H: number, weather: WeatherKind) {
  if (weather === 'clear') return
  const tint =
    weather === 'rain' ? 'rgba(40,55,80,0.22)' :
    weather === 'bloom' ? 'rgba(216,180,254,0.12)' :
    'rgba(255,255,255,0.08)' // snow
  ctx.fillStyle = tint
  ctx.fillRect(0, 0, W, H)
}

export function drawRain(ctx: CanvasRenderingContext2D, drops: RainDrop[], W: number, H: number) {
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
export function drawSnow(ctx: CanvasRenderingContext2D, flakes: SnowFlake[], W: number, H: number, color = '#ffffff') {
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

// 산 너비를 넘는 제목은 말줄임(…) — memo 말풍선의 truncateMemo와 같은 원칙이지만
// 여기는 폭 제한이 산마다 달라(레벨별로 다른 mtnW) 캔버스 실측 텍스트 폭 기준으로 자름.
export function truncateToWidth(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  const trimmed = text.trim()
  if (ctx.measureText(trimmed).width <= maxWidth) return trimmed
  let cut = trimmed
  while (cut.length > 1 && ctx.measureText(cut + '…').width > maxWidth) {
    cut = cut.slice(0, -1)
  }
  return cut + '…'
}

// 땅과 산이 맞닿는 지점(지면 시작선 바로 아래)에 책 제목을 각인. 초록 잔디 위에서
// 잘 보이도록 밝은 크림색 글자로, 외곽선 없이 얇게 그림(픽셀아트 톤과 어울리는 monospace).
export function drawMountainTitle(
  ctx: CanvasRenderingContext2D,
  title: string,
  cx: number,
  groundTopY: number,
  maxWidth: number
) {
  ctx.font = '11px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  const text = truncateToWidth(ctx, title, maxWidth + 14)
  // 산 밑동(groundTopY)과 제목 사이 여백 — 너무 붙어 보인다는 피드백(2026.07.12)으로
  // 7px → 12px로 살짝 띄움(닿지 않을 정도로만).
  const y = groundTopY + 12
  ctx.fillStyle = '#fdf6e3'
  ctx.fillText(text, cx, y)
}

// 둥근 사각형 경로 — 구형 브라우저 호환을 위해 ctx.roundRect 대신 직접 구현
// (arcTo 4번으로 네 모서리를 둥글림). fill/stroke는 호출 측에서 처리.
export function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// 메모 말풍선 — 웹페이지 지도(memoBubbles)와 같은 톤(amber 박스 + 아래 꼭짓점 포인터)으로
// 산 정상(깃발 위)에 떠 있게 그림. 예전엔 제목 아래 작은 텍스트 한 줄로만 넣었는데,
// 웹 버전과 스타일이 달라서 "메모가 안 보인다"는 오해를 샀음 — 웹과 동일한 말풍선
// 모양으로 맞춤.
export function drawMemoBubble(
  ctx: CanvasRenderingContext2D,
  memo: string,
  cx: number,
  peakTopY: number, // 산 정상 y좌표(깃발이 꽂히는 지점, drawFlag의 peakTopY와 동일)
  maxWidth: number
) {
  const FLAG_POLE_H = 16
  const pointerTipY = peakTopY - FLAG_POLE_H - 6 // 깃발 위로 살짝 띄운 지점
  const pointerHalf = 5
  const padX = 8
  const padY = 6
  const lineH = 12

  ctx.font = '10px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const cap = Math.min(maxWidth, 150)
  const text = truncateToWidth(ctx, memo, cap)
  const textW = Math.min(ctx.measureText(text).width, cap)

  const boxW = textW + padX * 2
  const boxH = lineH + padY * 2
  const boxX = cx - boxW / 2
  const boxY = pointerTipY - pointerHalf - boxH

  // 박스 (amber-50 배경 + amber-200 테두리 — 웹 memoBubbles와 동일 팔레트)
  roundRectPath(ctx, boxX, boxY, boxW, boxH, 6)
  ctx.fillStyle = '#fffbeb'
  ctx.fill()
  ctx.strokeStyle = '#fde68a'
  ctx.lineWidth = 1
  ctx.stroke()

  // 포인터(말풍선 꼭짓점)
  ctx.beginPath()
  ctx.moveTo(cx - pointerHalf, boxY + boxH - 1)
  ctx.lineTo(cx + pointerHalf, boxY + boxH - 1)
  ctx.lineTo(cx, pointerTipY)
  ctx.closePath()
  ctx.fillStyle = '#fffbeb'
  ctx.fill()

  // 텍스트 (amber-900)
  ctx.fillStyle = '#78350f'
  ctx.fillText(text, cx, boxY + boxH / 2)
}

// x는 축소 후 기준 "왼쪽 끝" 좌표. (x, mountainBaseY) 지점을 고정점으로 축소해서
// 그리므로, 산이 작아져도 밑동이 항상 지면(mountainBaseY)과 왼쪽 끝(x)에 붙어 있다.
export function drawSideMountain(
  ctx: CanvasRenderingContext2D,
  book: WorldMapBook,
  mountainBaseY: number,
  x: number,
  zoom: number = 1
) {
  const { steps, theme, profile, mtnH } = getMountainVisual(book)
  const baseY = mountainBaseY - mtnH
  const scale = SIDE_MOUNTAIN_SCALE * zoom

  ctx.save()
  ctx.globalAlpha = SIDE_MOUNTAIN_OPACITY
  ctx.translate(x, mountainBaseY)
  ctx.scale(scale, scale)
  ctx.translate(-x, -mountainBaseY)
  drawMountainBody(ctx, profile, steps, theme, x, baseY)
  ctx.restore()
}

// 튜토리얼 라벨 — 비로그인 상태의 예시 지형도(랜딩페이지)에서만 쓰는 깜빡이는 픽셀 글씨.
// CLEAR! 텍스트와 같은 방식(그림자+본문 이중 fillText)의 픽셀 타이포지만, sin 파형으로
// 알파값을 부드럽게 오르내려 "반짝이는" 느낌을 준다. 로그인 상태/완등기록에는 노출 안 함.
export function drawTutorialLabel(ctx: CanvasRenderingContext2D, timestamp: number, cx: number, y: number) {
  const alpha = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(timestamp / 450))
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.font = 'bold 42px monospace' // CLEAR! 텍스트(15px)와 같은 서체, 크기만 약 3배
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillStyle = '#7a4a12'
  ctx.fillText('TUTORIAL', cx + 2, y + 2)
  ctx.fillStyle = '#ffe27a'
  ctx.fillText('TUTORIAL', cx, y)
  ctx.restore()

  // TUTORIAL 바로 아래 안내 문구 — 같은 반짝임(alpha)을 공유해서 한 세트처럼 보이게 함.
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.font = '15px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  const subtitleY = y + 54 // TUTORIAL(42px) 높이만큼 아래로
  ctx.fillStyle = '#3a2a0a'
  ctx.fillText('로그인 후 책을 추가해보세요', cx + 1, subtitleY + 1)
  ctx.fillStyle = '#fff6df'
  ctx.fillText('로그인 후 책을 추가해보세요', cx, subtitleY)
  ctx.restore()
}

// PNG 우측 하단 워터마크 — drawMountainTitle과 같은 크림색 텍스트(외곽선 없음).
// 닉네임이 있으면 "산책또산책 | 닉네임" 형식으로 붙여서 "누구의 기록인지" 남긴다.
export function drawWatermark(ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number, nickname?: string) {
  const text = nickname ? `산책또산책 | ${nickname}` : '산책또산책'
  ctx.font = '12px monospace'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'bottom'
  const x = canvasW - 10
  const y = canvasH - 8
  ctx.fillStyle = '#fdf6e3'
  ctx.fillText(text, x, y)
}
