'use client'

import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react'
// 타입·순수 유틸(toWorldMapBooks, TARGET_TROPHY)은 Server Component에서도 직접 호출해야 해서
// 'use client'가 없는 별도 파일로 분리돼 있음 (worldmap-utils.ts 상단 설명 참고).
// 기존 import 경로(`from './WorldMap'`)를 그대로 쓰는 다른 파일들을 위해 여기서 재수출한다.
import { type WorldMapBook, toWorldMapBooks, TARGET_TROPHY } from './worldmap-utils'
import { isAuroraBook } from '@/lib/aurora-books'
import AuroraOverlay from '@/components/effects/AuroraOverlay'
import SlideToCapture from './SlideToCapture'
import { Camera } from 'lucide-react'

// WorldMap 리팩토링(2026.07.12) — 원래 이 파일 하나(2128줄)에 있던 상수/픽셀 드로잉/
// 좌표 계산/날씨/PNG 캡처 로직을 역할별 모듈로 나눴다(docs/verification.md
// "🔧 리팩토링 대상" 항목 처리). 이 파일엔 이제 React 컴포넌트(상태 관리 +
// requestAnimationFrame 루프 + JSX)만 남는다. 동작·화면 결과는 이전과 동일하다.
//   - constants.ts    — 상수·픽셀 데이터(색상, 크기, 스프라이트 등)
//   - geometry.ts     — 좌표/크기/시드 계산(순수 함수)
//   - sky-weather.ts  — 하늘/날씨/별/구름 상태 계산
//   - drawing.ts      — 캔버스에 실제로 그리는 함수
//   - capture.ts      — PNG 내보내기(완독 맵/정상 인증샷) 전용 렌더 함수
import {
  CANVAS_H,
  GROUND_H,
  GAP,
  TARGET_FOREGROUND,
  STATUS_LABEL,
  BURST_DURATION_MS,
  COMPLETION_GRACE_MS,
  CHAR_ROWS_A,
  CPX,
  TREE_ROWS,
  TREE_COLORS,
  FLOWER_ROWS,
  FLOWER_COLORS,
  MUSHROOM_ROWS,
  MUSHROOM_COLORS,
  DEMO_BOOKS,
  PX,
} from './constants'
import {
  hashString,
  mulberry32,
  computeSlotW,
  getMountainVisual,
  getStripBaseX,
  getMountainRects,
  getAddButtonAnchor,
  getAddButtonRect,
  buildSnowMask,
  getFlagColor,
  isRecentlyCompleted,
} from './geometry'
import {
  type SkyConfig,
  getSky,
  type WeatherKind,
  getTodaysWeather,
  type RainDrop,
  type SnowFlake,
  makeRainDrops,
  makeSnowFlakes,
  type CloudState,
  makeCloudStates,
  makeStars,
} from './sky-weather'
import {
  type Burst,
  makeBurstParticles,
  drawSprite,
  drawMountainBody,
  drawChar,
  drawDanceChar,
  drawCloud,
  drawPixelSun,
  drawFlag,
  drawCampfire,
  drawBackgroundRange,
  truncateMemo,
  drawStar,
  drawWeatherTint,
  drawRain,
  drawSnow,
  drawMountainTitle,
  drawMemoBubble,
  drawClearPixelText,
  drawBurstParticles,
  drawTutorialLabel,
} from './drawing'
import { renderCompletedPanorama, renderCompletionCapture, todayFileDateKey } from './capture'

export type { WorldMapBook }
export { toWorldMapBooks, TARGET_TROPHY }

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WorldMap({
  books = DEMO_BOOKS, // 실제 사용 시 books를 넘기면 데모 데이터는 무시됨
  onBookClick,
  onAddBook,           // 하늘 우측 상단 해(낮)/별(밤)을 눌렀을 때 — 책 추가 트리거
  fixedHour = null,   // null = 실제 시각 사용. 데모 스크린샷이 필요하면 10 등 특정 시각을 넘길 것.
  mode = 'home',       // 'home' = 전경/배경 분리 + 읽는 중 캐릭터. 'trophy' = 완등기록용 —
                        // 넘어온 책 전부를 그대로 보여주고(배경 없음), 산/나무/모닥불/깃발만
  demo = false,        // 비로그인 예시 지형도(랜딩페이지)에서만 true — 깜빡이는 TUTORIAL 라벨 노출
  nickname,            // PNG 캡처(완독 맵/정상 인증샷) 워터마크용. 없으면 앱 이름만 찍힘.
}: {
  books?: WorldMapBook[]
  onBookClick?: (book: WorldMapBook) => void
  onAddBook?: () => void
  fixedHour?: number | null
  mode?: 'home' | 'trophy'
  demo?: boolean
  nickname?: string
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

  // 산책기록 캡처(정상 인증샷) — 방금 completed로 바뀐 책 id를 잠깐(COMPLETION_GRACE_MS
  // 동안) 들고 있어서 좌하단 카메라 버튼이 "인증샷 찍기"로 동작하게 한다. mode='home'
  // 에서만 쓰임(viral-capture.md "산책기록 캡처" 트리거 = 세레모니 유예시간 중 버튼,
  // 2026.07.12 결정. 처음엔 산 위에 따로 버튼을 띄웠으나 메모 말풍선과 겹쳐 보기
  // 불편하다는 피드백으로 기존 카메라 버튼에 합침).
  const [justCompletedId, setJustCompletedId] = useState<string | null>(null)
  const captureHintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 완독 맵 공유(PNG) — foreground/background로 나뉘기 전의 books 원본에서 완독한
  // 책만 골라 최근 완독순(내림차순)으로 정렬해둔다. 호출 측(dashboard/hikes) 쿼리 정렬이
  // 서로 달라(하나는 created_at, 하나는 completed_at) 여기서 직접 정렬해야 안전함.
  // 파노라마에서 앞줄(선명한 산 TARGET_TROPHY개)/뒷줄(흐릿한 능선) 구분에 이 순서를 그대로 씀.
  const completedBooks = useMemo(() => {
    return books
      .filter((b) => b.status === 'completed')
      .sort((a, b) => new Date(b.completed_at ?? 0).getTime() - new Date(a.completed_at ?? 0).getTime())
  }, [books])

  const handleCaptureCompletedMap = useCallback(() => {
    if (completedBooks.length === 0) return
    // fixedHour가 지정돼 있으면 그 값을, 아니면 저장 버튼을 누른 실제 현재 시각을 사용 —
    // 지금 화면에 보이는 하늘(낮/밤)과 항상 같은 모습으로 저장되도록.
    const panorama = renderCompletedPanorama(completedBooks, fixedHour ?? new Date().getHours(), nickname)
    const link = document.createElement('a')
    link.href = panorama.toDataURL('image/png')
    link.download = `산책또산책_완독맵_${todayFileDateKey()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [completedBooks, fixedHour, nickname])

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

  // 산책기록(home) 페이지의 기본 카메라 동작 — 예전엔 이 버튼도 "완독한 책만" 그리는
  // 완독맵(renderCompletedPanorama)을 저장해서, 산책기록 화면에서 눌러도 완독맵이
  // 나오는 게 혼란스럽다는 피드백(2026.07.12)을 받음. 완독맵은 완등기록(trophy)
  // 페이지 전용으로 남기고, 산책기록에서는 지금 화면에 보이는 월드맵(읽는 중+완독+
  // 배경 산 전부, 날씨·전경 구성까지 그대로)을 캔버스 그대로 캡처해서 저장한다.
  //
  // 다만 라이브 화면(rAF 루프)은 일부러 책 제목·메모를 항상 그리지 않는다(탭해야
  // 뜨는 툴팁/오늘의 랜덤 말풍선으로만 노출 — "텍스트 정보 밀도 최소화" 원칙).
  // 그런데 저장한 PNG에는 책 제목/메모가 아예 안 보인다는 피드백(2026.07.12)으로,
  // 내보내기 순간에만 캔버스 위에 각 전경 산의 제목(항상)+메모(있는 책만)를 라이브
  // 루프와 동일한 위치 계산(computeSlotW/getStripBaseX)으로 한 번 덧그린 뒤 캡처한다.
  // toDataURL()까지 동기적으로 이어지므로 다음 rAF 프레임이 끼어들 틈 없이 안전하고,
  // 화면(라이브 캔버스)은 바로 다음 프레임에 평소 모습으로 다시 그려져 깜빡임도 없다.
  const handleCaptureHomeWorldMap = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const mountainBaseY = canvas.height - GROUND_H
    const slotW = computeSlotW(foreground.length, wrapRef.current?.clientWidth ?? canvas.width)
    foreground.forEach((book, i) => {
      const { mtnW, mtnH, peakCol } = getMountainVisual(book)
      const baseX = getStripBaseX(i, slotW, mtnW)
      const baseY = mountainBaseY - mtnH

      drawMountainTitle(ctx, book.title, baseX + mtnW / 2, mountainBaseY, mtnW)
      if (book.memo && book.memo.trim()) {
        drawMemoBubble(ctx, book.memo, baseX + peakCol * PX + PX / 2, baseY, mtnW)
      }
    })

    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = `산책또산책_산책기록월드맵_${todayFileDateKey()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [foreground])

  // 책마다 고정된 눈 패턴 (id + total_pages가 바뀔 때만 재계산 — 그 외엔 항상 동일)
  const snowMasks = useMemo(() => {
    const map = new Map<string, Set<string>>()
    foreground.forEach((book) => {
      const { steps, profile } = getMountainVisual(book)
      map.set(book.id, buildSnowMask(book, steps, profile))
    })
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foreground.map((b) => `${b.id}:${b.title}:${b.total_pages}:${b.status}`).join(',')])

  // 메모 있는 책 중 오늘(날짜 기준) 랜덤 2~3개만 뽑아 산 위에 말풍선으로 항상 띄운다.
  // 모두 다 띄우면 번잡스러우니 개수를 제한하고, 날짜를 시드로 써서 하루 동안은
  // 같은 책이 뽑히고 다음날엔 다시 섞이게 한다. 방금 완독해 폭죽(세레모니)이 터지는
  // 중인 산은 CLEAR!/댄스 캐릭터와 겹쳐 보기 어수선해지므로 후보에서 제외한다
  // (2026.07.12, 사용자 피드백 — "폭죽이 터질 때 메모는 없어지도록").
  const memoBubbles = useMemo(() => {
    const candidates = foreground.filter(
      (b) => b.memo && b.memo.trim() && b.id !== justCompletedId
    )
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
  }, [foreground.map((b) => `${b.id}:${!!b.memo}`).join(','), containerW, justCompletedId])

  // 방금 완독한 책 — 있으면(산책기록/home에서만) 좌하단 카메라 버튼이 평소 동작
  // 대신 "인증샷 찍기"로 바뀐다(viral-capture.md 트리거 결정: 산 위에 따로 뜨는
  // 버튼은 메모 말풍선과 겹쳐 보기 불편하다는 피드백으로 기존 카메라 버튼에 합침,
  // 2026.07.12). 세레모니 유예시간이 끝나 justCompletedId가 지워지면 자동으로
  // null이 되어 버튼도 원래(산책기록 월드맵 저장) 동작으로 돌아간다.
  const captureButtonTarget = useMemo(() => {
    if (mode !== 'home' || !justCompletedId) return null
    return foreground.find((b) => b.id === justCompletedId) ?? null
  }, [mode, justCompletedId, foreground])

  const handleCaptureCompletionShot = useCallback(
    (book: WorldMapBook) => {
      const shot = renderCompletionCapture(book, books, nickname ?? '산책자', fixedHour ?? new Date().getHours())
      const link = document.createElement('a')
      link.href = shot.toDataURL('image/png')
      link.download = `산책또산책_정상인증샷_${todayFileDateKey()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      // 슬라이드가 끝까지 밀린 모습을 잠깐 보여준 뒤 원래(완독 맵 저장) 버튼으로
      // 되돌린다 — 바로 지워버리면 다 밀었다는 확인 없이 버튼이 훅 바뀌어 버림.
      // 다시 인증샷이 필요하면 좌하단 "완독 맵 저장" 버튼으로 전체 완독 맵은 언제든 받을 수 있음.
      if (captureHintTimeoutRef.current) clearTimeout(captureHintTimeoutRef.current)
      captureHintTimeoutRef.current = setTimeout(() => setJustCompletedId(null), 500)
    },
    [books, nickname, fixedHour]
  )

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
          // 산책기록(home)에서만 "인증샷 찍기" 버튼을 세레모니 유예시간만큼 띄워둔다.
          if (mode === 'home') {
            if (captureHintTimeoutRef.current) clearTimeout(captureHintTimeoutRef.current)
            setJustCompletedId(b.id)
            captureHintTimeoutRef.current = setTimeout(() => setJustCompletedId(null), COMPLETION_GRACE_MS)
          }
        }
      })
    }
    prevStatusRef.current = new Map(books.map((b) => [b.id, b.status]))
  }, [books, mode])

  // 언마운트 시 캡처 버튼 타이머 정리
  useEffect(() => {
    return () => {
      if (captureHintTimeoutRef.current) clearTimeout(captureHintTimeoutRef.current)
    }
  }, [])

  // 오로라 이스터에그 트리거 — books prop이 갱신될 때마다 "이번에 새로 나타난 책 id"를
  // 찾아, 그중에 개발자 지정 오로라 책(lib/aurora-books.ts)이 있으면 WorldMap 안에서만
  // 10초짜리 오로라 연출을 띄운다. burst 감지와 같은 이유로 최초 마운트(prev가 없을 때)엔
  // 트리거하지 않음 — 안 그러면 이미 등록된 오로라 책이 있는 페이지를 열 때마다 매번 재생됨.
  // (AddBookForm 쪽에 심었던 이전 버전은 화면 전체를 덮는 문제가 있어서, 여기 WorldMap
  // 자체의 books 변화 감지로 옮겨 자연스럽게 이 캔버스 영역 안에만 갇히게 함.)
  const prevBookIdsRef = useRef<Set<string> | null>(null)
  const [auroraActive, setAuroraActive] = useState(false)
  useEffect(() => {
    const prevIds = prevBookIdsRef.current
    if (prevIds) {
      const justAdded = books.filter((b) => !prevIds.has(b.id))
      if (justAdded.some((b) => isAuroraBook(b.isbn))) {
        setAuroraActive(true)
      }
    }
    prevBookIdsRef.current = new Set(books.map((b) => b.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      const sky: SkyConfig = getSky(s.hour)
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
        const { steps, theme, profile, mtnW, mtnH, peakCol } = getMountainVisual(book)
        const baseX = getStripBaseX(i, slotW, mtnW)
        const baseY = mountainBaseY - mtnH
        const snowMask = book.status === 'paused' ? snowMasks.get(book.id) : undefined

        // 산 본체 + 베이스 2행 (실루엣별 칼럼 높이맵 기준 — renderCompletedPanorama와
        // drawMountainBody를 공유해서 PNG 내보내기와 실루엣이 어긋나지 않음)
        drawMountainBody(ctx, profile, steps, theme, baseX, baseY, snowMask)

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
          drawFlag(ctx, baseX + peakCol * PX + PX / 2, baseY, getFlagColor(book.id, book.isbn))
        }

        if (burstActive && burst) {
          const peakX = baseX + peakCol * PX + PX / 2
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
          const charCX = baseX + peakCol * PX + PX / 2
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
          mode === 'trophy' ? '완등한 산이 이곳으로 옮겨옵니다 🚩' : '책을 추가하면 여기에 산이 생겨요 ⛰',
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

      // ── 튜토리얼 라벨 (비로그인 예시 지형도 전용) — 하늘 중앙에 항상 맨 위로 오버레이 ─
      // ⚠ "완등한 산이 이곳으로 옮겨옵니다" 문구는 여기(캔버스 안)에 넣으면 예시 산과
      // 겹쳐서 지저분해 보여 뺐음 — 페이지 하단 캡션으로만 노출(app/dashboard/page.tsx).
      if (demo) {
        drawTutorialLabel(ctx, timestamp, W / 2, 40)
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
  }, [foreground, background, stars, snowMasks, onBookClick, onAddBook, fixedHour, mode, weather, demo])

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

        {/* 오로라 이스터에그 — WorldMap 컨테이너(wrap) 안에만 갇히도록 여기(캔버스를
            스크롤시키는 내부 div 바깥, wrap 바로 안쪽)에 둔다. wrap의 overflow-hidden
            덕분에 화면 전체가 아니라 정확히 이 지도 영역 안에서만 보인다. */}
        {auroraActive && <AuroraOverlay onDone={() => setAuroraActive(false)} />}

        {/* 캡처 — 왼쪽 하단, 스크롤되는 내부 div가 아니라 바깥 wrap(고정 크기) 기준으로
            둬서 산이 많아 가로 스크롤이 생겨도 항상 화면 왼쪽 아래 같은 자리에
            고정된다("+ 책 추가" 버튼과 동일한 원칙). 방금 완독한 책이 있으면
            (captureButtonTarget) 아이폰 "밀어서 잠금해제" 알약 모양 SlideToCapture로,
            없으면 평소처럼 탭 한 번으로 저장 — 산 위에 따로 뜨는 버튼은 메모 말풍선과
            겹쳐 보기 불편하다는 피드백으로 여기로 합쳤음(2026.07.12). SlideToCapture는
            비주얼만 슬라이드 스타일이고 실제 조작은 트랙 전체를 한 번 누르면 바로
            확정(정확히 썸을 잡고 드래그해야 하는 방식은 번거롭다는 후속 피드백으로 단순화).
            평소 탭 동작은 모드별로 다름 — 완등기록(trophy)은 "완독 맵"(완독한 책만
            모은 파노라마), 산책기록(home)은 "산책기록 월드맵"(지금 화면 그대로, 읽는
            중+완독+배경 산 전부)을 저장한다. 산책기록에서 눌러도 완독맵만 나온다는
            피드백(2026.07.12)으로 분리함. */}
        {(mode === 'trophy' ? completedBooks.length > 0 : books.length > 0) && (
          <div className="absolute left-3 bottom-3 z-20">
            {captureButtonTarget ? (
              <SlideToCapture
                label="인증샷 찍기"
                onConfirm={() => handleCaptureCompletionShot(captureButtonTarget)}
              />
            ) : (
              <button
                type="button"
                onClick={mode === 'trophy' ? handleCaptureCompletedMap : handleCaptureHomeWorldMap}
                title={mode === 'trophy' ? '완독 맵 PNG로 저장' : '산책기록 월드맵 PNG로 저장'}
                aria-label={mode === 'trophy' ? '완독 맵 PNG로 저장' : '산책기록 월드맵 PNG로 저장'}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-white/90 shadow-md hover:bg-white active:scale-95 transition-all"
              >
                <Camera size={18} className="text-gray-700" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
