// WorldMap 리팩토링(2026.07.12) — PNG 내보내기(완독 맵 파노라마 / 정상 인증샷)
// 전용 렌더 함수 모음. 화면(rAF 루프)과는 완전히 별개로, 오프스크린 캔버스에
// 한 번만 그려서 즉시 다운로드하는 정적 이미지 생성기. 로직·값은 기존
// WorldMap.tsx에서 그대로 옮겨왔다.

import { type WorldMapBook, TARGET_TROPHY } from './worldmap-utils'
import {
  PX,
  CANVAS_H,
  GROUND_H,
  MAX_MTN_W,
  PANO_GAP,
  CAPTURE_SIZE,
  CAPTURE_BURST_PEAK_MS,
  SIDE_MOUNTAIN_GAP,
  BURST_PARTICLE_COUNT,
  BURST_COLORS,
  TREE_ROWS,
  TREE_COLORS,
  CHERRY_TREE_COLORS,
} from './constants'
import { getSky, makeStars } from './sky-weather'
import {
  mulberry32,
  countByTheme,
  getFlagColor,
  getMountainVisual,
  getStripBaseX,
  sideMountainWidth,
} from './geometry'
import {
  drawPixelSun,
  drawStar,
  drawSprite,
  drawMountainBody,
  drawFlag,
  drawCampfire,
  drawMountainTitle,
  drawMemoBubble,
  drawKdcBadge,
  drawWatermark,
  drawBackgroundRange,
  drawSideMountain,
  drawDanceChar,
  drawClearPixelText,
  drawBurstParticles,
} from './drawing'

export function todayFileDateKey(): string {
  return new Date().toISOString().slice(0, 10)
}

// 완독한 산만 모아 가로 파노라마로 그린 새 캔버스를 반환(화면엔 그리지 않고 다운로드 전용).
// 최근 완독순 TARGET_TROPHY(5)개만 선명한 전경 산으로 그리고, 나머지는 drawBackgroundRange로
// 흐릿한 능선 실루엣만 깔아 "산맥" 느낌을 준다 — 이러면 책이 몇 권이든 캔버스 폭이 전경
// 개수(최대 5개) 기준으로만 정해져서 가로로 무한정 길어지지 않고, 제목도 서로 안 겹친다.
export function renderCompletedPanorama(
  completedBooks: WorldMapBook[],
  hour: number,
  nickname?: string
): HTMLCanvasElement {
  // completedBooks는 호출 측에서 이미 최근 완독순(내림차순)으로 정렬해서 넘겨줌.
  const front = completedBooks.slice(0, TARGET_TROPHY)
  const back = completedBooks.slice(TARGET_TROPHY)

  const slotW = MAX_MTN_W + PANO_GAP
  const canvasW = Math.max(front.length * slotW + 64, 360)
  const canvasH = CANVAS_H

  const canvas = document.createElement('canvas')
  canvas.width = canvasW
  canvas.height = canvasH
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false

  // 하늘 — 저장 버튼을 누른 시점에 화면에 보이던 것과 같은 시각(hour)으로 그려서,
  // 지금 보고 있는 모습 그대로 캡처되게 함 (밤에 저장하면 밤하늘로 저장됨).
  const sky = getSky(hour)
  const skyGrad = ctx.createLinearGradient(0, 0, 0, canvasH - GROUND_H)
  skyGrad.addColorStop(0, sky.topColor)
  skyGrad.addColorStop(1, sky.bottomColor)
  ctx.fillStyle = skyGrad
  ctx.fillRect(0, 0, canvasW, canvasH - GROUND_H)

  if (sky.daytime) {
    drawPixelSun(ctx, canvasW - 64, 28)
  } else if (sky.stars) {
    makeStars(60).forEach((st) => {
      drawStar(ctx, st.xRatio * canvasW, st.yRatio * canvasH, st.r, st.opacity)
    })
  }

  // 지면
  const groundTopY = canvasH - GROUND_H
  const groundGrad = ctx.createLinearGradient(0, groundTopY, 0, canvasH)
  groundGrad.addColorStop(0, '#2c5423')
  groundGrad.addColorStop(1, '#1d3a18')
  ctx.fillStyle = groundGrad
  ctx.fillRect(0, groundTopY, canvasW, GROUND_H)
  ctx.fillStyle = '#55a141'
  ctx.fillRect(0, groundTopY, canvasW, 6)

  const mountainBaseY = groundTopY

  // ── 배경 능선 (전경에 못 든 나머지 완독 책들 — 흐릿하고 식별 불가, "산맥" 볼륨감용) ──
  drawBackgroundRange(ctx, back, canvasW, mountainBaseY)

  // ── 배경 장식 (나무 · 벚꽃나무) — 산보다 먼저 그려서 산 뒤로 살짝 가려 보이게 함.
  // 좌측 끝 + 산 사이 경계마다 배치, 짝수/홀수로 초록 나무·벚꽃나무를 번갈아 씀.
  const decoBlock = 6
  drawSprite(ctx, TREE_ROWS, TREE_COLORS, 4, mountainBaseY, decoBlock)
  drawSprite(ctx, TREE_ROWS, CHERRY_TREE_COLORS, 40, mountainBaseY, decoBlock)
  for (let i = 0; i < front.length - 1; i++) {
    const slotBoundary = 24 + (i + 1) * slotW - PANO_GAP / 2
    const colorsA = i % 2 === 0 ? TREE_COLORS : CHERRY_TREE_COLORS
    const colorsB = i % 2 === 0 ? CHERRY_TREE_COLORS : TREE_COLORS
    drawSprite(ctx, TREE_ROWS, colorsA, slotBoundary - 40, mountainBaseY, decoBlock)
    drawSprite(ctx, TREE_ROWS, colorsB, slotBoundary + 4, mountainBaseY, decoBlock)
  }

  front.forEach((book, i) => {
    const { steps, theme, profile, mtnW, mtnH, peakCol, seed } = getMountainVisual(book)
    const baseX = getStripBaseX(i, slotW, mtnW)
    const baseY = mountainBaseY - mtnH

    // 산 본체 (완독 산엔 눈 패턴 없음 — WorldMap 본 렌더와 동일한 규칙, drawMountainBody 공유)
    drawMountainBody(ctx, profile, steps, theme, baseX, baseY)

    // 정상 깃발 (오로라 이스터에그 책이면 자동으로 오로라 팔레트 — getFlagColor 참고)
    drawFlag(ctx, baseX + peakCol * PX + PX / 2, baseY, getFlagColor(book.id, book.isbn))

    // 자축 모닥불 — trophy 모드와 동일하게 항상 켜둠(정적 이미지라 프레임 고정)
    const FIRE_X_RATIOS = [0.12, 0.28, 0.68, 0.82]
    const fireRatio = FIRE_X_RATIOS[Math.abs(seed) % FIRE_X_RATIOS.length]
    drawCampfire(ctx, baseX + mtnW * fireRatio - 4, mountainBaseY - 14, 1)

    // 땅과 산이 맞닿는 지점에 책 제목 각인
    drawMountainTitle(ctx, book.title, baseX + mtnW / 2, mountainBaseY, mtnW)
    // 메모가 있는 책만 정상(깃발 위)에 말풍선으로 — 웹페이지 지도의 memoBubbles와 같은 스타일
    if (book.memo && book.memo.trim()) {
      drawMemoBubble(ctx, book.memo, baseX + peakCol * PX + PX / 2, baseY, mtnW)
    }
  })

  // 왼쪽 상단 KDC 뱃지 — 완등기록 캡처는 "완독한 산만" 기준으로 집계(viral-capture.md).
  // 화면(전경 front)엔 TARGET_TROPHY개만 그려지지만, 뱃지 숫자는 캡과 무관하게
  // completedBooks(호출 측이 넘겨준 전체 완독 목록) 전부를 기준으로 해야
  // "화면에 그려진 것만 세면 다독자일수록 숫자가 작아지는" 역설을 피할 수 있다.
  drawKdcBadge(ctx, countByTheme(completedBooks), 16, 16)

  drawWatermark(ctx, canvasW, canvasH, nickname)

  return canvas
}

// ─── 산책기록 캡처 (정상 인증샷, 1:1 정사각형) ────────────────────────────────
// viral-capture.md "두 가지 캡처 모드" 중 산책기록 쪽. 완독 세레모니 유예시간
// (COMPLETION_GRACE_MS) 동안 뜨는 "인증샷 찍기" 버튼을 누르면 호출된다.
// 라이브 화면(rAF 루프)의 burst는 Math.random() 기반이라 매번 다르게 퍼지지만,
// 이 캡처는 다시 눌러도 항상 같은 사진이 나오도록 book.id로 시드 고정한 별도
// 파티클 세트를 새로 만든다(산 실루엣·눈 패턴 등 다른 요소와 같은 원칙).
export function renderCompletionCapture(
  book: WorldMapBook,
  allBooks: WorldMapBook[],
  nickname: string,
  hour: number
): HTMLCanvasElement {
  const size = CAPTURE_SIZE
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false

  // 하늘 — 캡처 버튼을 누른 시점의 실제 시각(hour)을 그대로 반영.
  const sky = getSky(hour)
  const groundTopY = size - GROUND_H
  const skyGrad = ctx.createLinearGradient(0, 0, 0, groundTopY)
  skyGrad.addColorStop(0, sky.topColor)
  skyGrad.addColorStop(1, sky.bottomColor)
  ctx.fillStyle = skyGrad
  ctx.fillRect(0, 0, size, groundTopY)

  // 지면
  const groundGrad = ctx.createLinearGradient(0, groundTopY, 0, size)
  groundGrad.addColorStop(0, '#2c5423')
  groundGrad.addColorStop(1, '#1d3a18')
  ctx.fillStyle = groundGrad
  ctx.fillRect(0, groundTopY, size, GROUND_H)
  ctx.fillStyle = '#55a141'
  ctx.fillRect(0, groundTopY, size, 6)

  const mountainBaseY = groundTopY

  const { steps, theme, profile, mtnW, mtnH: naturalHeight, peakCol, seed } = getMountainVisual(book)
  const heroCenterX = size / 2
  const baseX = heroCenterX - mtnW / 2
  const baseY = mountainBaseY - naturalHeight
  const peakX = baseX + peakCol * PX + PX / 2

  // 주인공 산 확대 — "산 정상이 캔버스 세로 1/2 지점까지 올라오고, 옆산은 화면
  // 밖으로 넘치면 그대로 잘려도 된다"는 피드백(2026.07.12)으로, 목표를 "산이
  // 세로 절반까지 닿는 높이"로 직접 계산한다. 옆산을 위한 가로 폭 상한은 더 이상
  // 두지 않는다 — 옆산이 캔버스 밖으로 나가면 캔버스가 자동으로 잘라내는 걸
  // 그대로 활용(잘리는 구도를 의도적으로 허용). 세로로만 늘리면 픽셀이
  // 찌그러지므로 가로세로 동일 배율(ctx.scale(S,S))로 확대한다.
  const HERO_TARGET_HEIGHT = mountainBaseY - size * 0.5 // 산 정상이 캔버스 세로 1/2 지점(y=size/2)까지 닿는 높이
  const HERO_MAX_SCALE = 4.5 // 너무 작은 책(steps 적음)이 과하게 블록져 보이지 않게 상한
  const rawHeroScale = Math.min(Math.max(HERO_TARGET_HEIGHT / naturalHeight, 1), HERO_MAX_SCALE)
  // "지금 여기서 3/4 정도 크기로만 줄여줄래?" 피드백(2026.07.12) — 위 목표치(정상이
  // 세로 절반까지)를 그대로 쓰면 너무 크므로, 최종 배율은 그 값의 3/4만 적용한다.
  const HERO_SCALE_ADJUST = 0.75
  const heroScale = Math.max(rawHeroScale * HERO_SCALE_ADJUST, 1)
  const zoom = heroScale // 옆산·해와 공유하는 장면 공통 확대 배율
  const scaledMtnW = mtnW * heroScale
  const scaledLeft = heroCenterX - scaledMtnW / 2
  const scaledRight = heroCenterX + scaledMtnW / 2

  // 하늘의 해/별 — 산이 커진 만큼(zoom) 같은 비율로 함께 키운다.
  if (sky.daytime) {
    drawPixelSun(ctx, size - 64, 28, zoom)
  } else if (sky.stars) {
    makeStars(40).forEach((st) => {
      drawStar(ctx, st.xRatio * size, st.yRatio * groundTopY, st.r, st.opacity)
    })
  }

  // 주인공 산 옆에 다른 책들도 실제 산으로(축소·반투명) 보여줘서 "혼자가 아니라
  // 책장 전체의 맥락 속 완독"이라는 느낌을 준다 — 흐릿한 실루엣 대신 진짜 실루엣/
  // 색을 축소해서 보여주는 쪽이 "다른 책도 옆에 나온다"는 걸 알아보기 쉬움.
  // 최대 3권, 왼쪽에 더 많이 배치. 주인공 산이 커진 만큼(scaledLeft/scaledRight)
  // 자리를 비켜서 배치하되, 캔버스 폭을 벗어나도 그리는 걸 멈추지 않는다 — 캔버스
  // 밖으로 나간 부분은 자동으로 잘려서 "옆산이 화면 끝에서 잘리는" 구도가 된다.
  const others = allBooks.filter((b) => b.id !== book.id && b.status !== 'completed').slice(0, 3)
  const leftSideBooks = others.filter((_, i) => i % 2 === 0)
  const rightSideBooks = others.filter((_, i) => i % 2 === 1)

  let cursorRight = scaledRight + SIDE_MOUNTAIN_GAP
  rightSideBooks.forEach((b) => {
    const w = sideMountainWidth(b, zoom)
    drawSideMountain(ctx, b, mountainBaseY, cursorRight, zoom)
    cursorRight += w + SIDE_MOUNTAIN_GAP
  })

  let cursorLeft = scaledLeft - SIDE_MOUNTAIN_GAP
  leftSideBooks.forEach((b) => {
    const w = sideMountainWidth(b, zoom)
    const x = cursorLeft - w
    drawSideMountain(ctx, b, mountainBaseY, x, zoom)
    cursorLeft = x - SIDE_MOUNTAIN_GAP
  })

  // 주인공 산 좌우로 나무 장식 — 커진 산 폭(scaledLeft/scaledRight) 기준으로 배치
  const decoBlock = 6
  drawSprite(ctx, TREE_ROWS, TREE_COLORS, scaledLeft - 44, mountainBaseY, decoBlock)
  drawSprite(ctx, TREE_ROWS, TREE_COLORS, scaledRight + 8, mountainBaseY, decoBlock)

  // 산 본체 + 세레모니 이펙트 — heroCenterX/mountainBaseY(지면)를 고정점으로 확대해서
  // 그린다. 이 transform 안에서는 원래(자연 크기) 좌표를 그대로 써도 자동으로
  // heroScale배 커진 위치/크기로 그려진다.
  ctx.save()
  ctx.translate(heroCenterX, mountainBaseY)
  ctx.scale(heroScale, heroScale)
  ctx.translate(-heroCenterX, -mountainBaseY)

  // 산 본체 — 실제 라이브 화면과 동일한 실루엣 계산(getMountainVisual 공유)
  drawMountainBody(ctx, profile, steps, theme, baseX, baseY)

  // 완등 세레모니 "피크 프레임" — 책 id로 시드 고정한 파티클로 항상 같은 구도 재현
  const burstRand = mulberry32(seed)
  const particles = Array.from({ length: BURST_PARTICLE_COUNT }, () => ({
    angle: burstRand() * Math.PI * 2,
    speed: 0.7 + burstRand() * 1.5,
    color: BURST_COLORS[Math.floor(burstRand() * BURST_COLORS.length)],
    size: 3 + Math.floor(burstRand() * 3),
  }))
  drawDanceChar(ctx, peakX, baseY, 0, theme.char)
  drawClearPixelText(ctx, CAPTURE_BURST_PEAK_MS, peakX, baseY - 26)
  drawBurstParticles(ctx, { startedAt: 0, particles }, CAPTURE_BURST_PEAK_MS, peakX, baseY)

  ctx.restore()

  // 책 제목 + 완독일만 최소 노출 (진행률 %, 페이지 수 등은 넣지 않음 — "정보 절제" 원칙)
  // 확대된 산 폭에 맞춰 텍스트 줄바꿈 기준 폭도 scaledMtnW로 넓혀준다.
  drawMountainTitle(ctx, book.title, heroCenterX, mountainBaseY, Math.max(scaledMtnW, 160))
  if (book.completed_at) {
    const dateLabel = new Date(book.completed_at).toISOString().slice(0, 10).replaceAll('-', '.')
    ctx.font = '10px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillStyle = 'rgba(253,246,227,0.75)'
    ctx.fillText(dateLabel, heroCenterX, mountainBaseY + 25)
  }

  // 왼쪽 상단 KDC 뱃지 — 산책기록 캡처는 "책장 전체(읽는 중+완독+미시작)" 기준
  drawKdcBadge(ctx, countByTheme(allBooks), 16, 16)

  drawWatermark(ctx, size, size, nickname)

  return canvas
}
