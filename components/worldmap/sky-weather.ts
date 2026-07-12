// WorldMap 리팩토링(2026.07.12) — 하늘/날씨/별/구름 상태 계산 모듈.
// 캔버스에 그리는 코드(drawStar/drawCloud 등)는 drawing.ts로 분리했고, 여기는
// "지금 몇 시니까 하늘이 어떤 색인지", "오늘 날씨가 뭔지", "파티클 위치가 어딘지"
// 같은 상태/데이터 계산만 담당한다. 값은 기존 WorldMap.tsx에서 그대로 옮겨왔다.

import { WEATHER_CHANCE } from './constants'
import { hashString, mulberry32 } from './geometry'

// ─── Sky ─────────────────────────────────────────────────────────────────────
// 기본값은 실제 시각 기준 낮/밤 순환. 데모 스크린샷 등 특정 시각 고정이 필요하면
// <WorldMap fixedHour={10} /> 처럼 시간을 직접 넘길 것.

export type SkyConfig = {
  topColor: string
  bottomColor: string
  stars: boolean
  daytime: boolean
}

export function getSky(hour: number): SkyConfig {
  if (hour < 6)  return { topColor: '#060b22', bottomColor: '#0d1540', stars: true,  daytime: false }
  if (hour < 16) return { topColor: '#8fccf0', bottomColor: '#bfe4fa', stars: false, daytime: true }
  // 노을(16-18시) — 순빨강 대신 옐로우를 섞어 차분한 앰버/골드 톤으로
  if (hour < 19) return { topColor: '#d9772e', bottomColor: '#f5b95f', stars: false, daytime: false }
  return { topColor: '#0e1248', bottomColor: '#141840', stars: true, daytime: false }
}

// ─── Star positions (stable, seeded) ─────────────────────────────────────────

export function makeStars(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    xRatio: ((i * 137.508) % 100) / 100,
    yRatio: ((i * 97.31) % 55) / 100,
    r: (i % 3) + 1,
    opacity: +(0.3 + (i % 7) * 0.1).toFixed(2),
  }))
}

// ─── Cloud state ─────────────────────────────────────────────────────────────

export type CloudState = {
  x: number
  y: number
  speed: number
  shapeIdx: number
  opacity: number
  resetX: number
}

export function makeCloudStates(canvasW: number): CloudState[] {
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
export type WeatherKind = 'clear' | 'rain' | 'snow' | 'bloom'

export function getSeasonalWeatherKind(month: number): 'bloom' | 'rain' | 'snow' {
  if (month === 4) return 'bloom'
  if (month >= 5 && month <= 11) return 'rain'
  return 'snow' // 12, 1, 2, 3월
}

export function getTodaysWeather(now: Date = new Date()): WeatherKind {
  const dateKey = now.toISOString().slice(0, 10) // YYYY-MM-DD — 하루 동안 고정되는 시드
  const rand = mulberry32(hashString(dateKey))
  if (rand() >= WEATHER_CHANCE) return 'clear'
  return getSeasonalWeatherKind(now.getMonth() + 1) // getMonth()는 0~11
}

export type RainDrop = { x: number; y: number; len: number; speed: number; opacity: number }
export type SnowFlake = {
  x: number
  y: number
  size: number
  speed: number
  driftPhase: number
  driftSpeed: number
  opacity: number
}

export function makeRainDrops(canvasW: number, canvasH: number): RainDrop[] {
  return Array.from({ length: 70 }, () => ({
    x: Math.random() * canvasW,
    y: Math.random() * canvasH,
    len: 10 + Math.random() * 8,
    speed: 7 + Math.random() * 5,
    opacity: 0.3 + Math.random() * 0.35,
  }))
}

export function makeSnowFlakes(canvasW: number, canvasH: number): SnowFlake[] {
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
