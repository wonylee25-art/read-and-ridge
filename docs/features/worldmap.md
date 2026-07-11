# WorldMap 컴포넌트

파일: `components/worldmap/WorldMap.tsx`

메인 대시보드(`/dashboard`)에 표시되는 픽셀 아트 산 전경. 책 목록을 시각화한다.

---

## 개념

- 책 한 권 = 픽셀 산 하나
- 페이지 수 → 산 크기 (level 1~4)
- 읽기 진행률 → 산 위의 캐릭터 위치
- 현재 시각 → 하늘 색상 (새벽/낮/저녁/밤)
- KDC 분류 → 산 색상 테마

---

## 산 크기 레벨

| Level | 페이지 수 | 피라미드 행 수 |
|-------|---------|-------------|
| 1 | 200p 미만 | 5행 |
| 2 | 200–399p | 7행 |
| 3 | 400–599p | 9행 |
| 4 | 600p 이상 | 11행 |

산 너비: `(2 × steps - 1) × 10px`

---

## 색상 테마 (KDC 기반)

> 고채도 게임 팔레트 (2026.06.29 Canvas 재구현 기준). 코드: `KDC_THEME` in `WorldMap.tsx`.

| 테마 | fill | edge | snow | base | KDC |
|------|------|------|------|------|-----|
| mystery | #5b8dd9 | #2c4d8a | #e8f0ff | #1e3560 | 0,1,2 (총류/철학/종교) |
| earth | #c97b2e | #7a4010 | #fff0cc | #5a2e08 | 3,7,9 (사회/예술/역사) |
| nature | #2db86a | #166b3a | #d4ffea | #0d4022 | 4,5 (과학/기술) |
| fantasy | #9b59d0 | #5a1f8a | #f0e0ff | #3b1060 | 6,8 (어학/문학) |
| default | #3aac6e | #1a6640 | #d6f5e6 | #0e4228 | kdc 없음 |

kdc가 없으면 `index % 4`로 테마 순환 배정 (`INDEX_THEMES`: nature→earth→fantasy→mystery).

> ⚠️ mystery는 design-style.md가 "밝은 회백색"으로 의도했으나 코드는 청색 계열(#5b8dd9). 정합 여부는 `docs/verification.md` 참고.

---

## 하늘 색상 (시간대)

| 시간 | 상단 | 하단 | 별 |
|------|------|------|-----|
| 0–5시 | #060b22 | #0d1540 | ✓ |
| 6–15시 | #1a6bbf | #6ec6f0 | - |
| 16–18시 | #d9772e | #f5b95f | - |
| 19–23시 | #0e1248 | #141840 | ✓ |

하늘은 CSS `linear-gradient` + `transition: background 4s ease`로 부드럽게 전환. 1분마다 시간 갱신.

---

## 날씨 (벚꽃비/비/눈)

`home` 모드에서 오늘 날짜(`YYYY-MM-DD`)를 시드로 결정 — 하루 동안은 재방문/새로고침해도
항상 같은 날씨. 한 달에 3~4번 정도만 나오도록 확률을 낮췄고(`WEATHER_CHANCE = 3.5/30 ≈ 11.7%`),
나머지는 맑음. 날씨가 뜨는 날엔 달(월)에 따라 종류가 정해진다(랜덤 아님):

| 시기 | 날씨 | 표현 |
|------|------|------|
| 4월 | 벚꽃비(`bloom`) | 눈과 같은 낙하 파티클이지만 연보라색(`#d9b3f0`), 하늘에 은은한 연보라 틴트 |
| 5~11월 | 비(`rain`) | 사선 빗줄기 70개, 하늘에 어두운 청회색 틴트 |
| 12~3월 | 눈(`snow`) | 흩날리는 눈송이 50개(사인파 드리프트, 흰색), 하늘에 옅은 흰색 틴트 |

코드: `getTodaysWeather`, `getSeasonalWeatherKind`, `WEATHER_CHANCE` in `WorldMap.tsx`.
`trophy`(완등기록) 화면에는 적용하지 않고 항상 맑음으로 고정.

---

## 완등기록(trophy) 표시 개수 제한

완독이 쌓일수록 지도가 무한정 길어지는 걸 막기 위해, `trophy` 모드는 넘어온 책(호출 측에서
이미 `completed_at` 내림차순 = 최신순으로 정렬해 넘김) 중 최근 `TARGET_TROPHY`(5)개만
지도에 그린다. 나머지는 `hikes/page.tsx` 아래 전체 목록(BookCard 그리드)에서만 확인 가능.
`TARGET_TROPHY`는 `WorldMap.tsx`에서 export되며, `hikes/page.tsx`가 안내 문구("최근
완등한 5권만 지도에 표시돼요...")에 그대로 재사용한다.

코드: `rollWeather`, `drawRain`, `drawSnow`, `drawWeatherTint` in `WorldMap.tsx`. 파티클은 캔버스 폭이 바뀔 때 재생성되며, 전체 장면 맨 위(오버레이)에 그려짐.

---

## 애니메이션

### 캐릭터 바운스 (80ms 인터벌)
5×5 픽셀 아트 캐릭터가 위아래로 살짝 움직임.
```
bounceY: 0 → -3.5px → 0 (20프레임 사이클)
```
`reading` 상태 책의 캐릭터만 활성화.

### 별 (useMemo, 60개)
황금비(137.508°) 기반 분산 알고리즘으로 리렌더링 시마다 위치 고정.

### 캠프파이어 (200ms 인터벌)
밤 + `reading` 상태 조합에서 산 기슭에 표시. 3가지 색상 순환 (#ff6600 → #ff9900 → #ffcc00).

---

## 책 상태별 시각 표현

| status | 캐릭터 | 산 불투명도 | 크기 | 정상석 |
|--------|--------|------------|------|--------|
| `reading` | 진행률 위치에 표시 | 100% | 100% | - |
| `completed` | 없음 | 50% | 82% | 정상에 표시 |
| `paused` | 없음 | 50% | 82% | - |

---

## 캐릭터 위치 계산

```typescript
const progress = book.total_pages
  ? Math.min(book.current_page / book.total_pages, 1)
  : 0

const charH = 24 // 캐릭터 스프라이트 높이(8행 × 3px)
const climbRange = mountainBaseY - baseY // 산 전체 높이(지면~정상)
const travel = Math.max(climbRange - charH, 0)
const charCY = mountainBaseY - progress * travel
// 0% → 발이 지면(mountainBaseY), 100% → 머리가 정상(baseY)에 닿는 지점
// 발 기준점의 이동 범위에서 캐릭터 키(charH)를 미리 빼서, 100%가 되어야만
// 머리가 실제로 정상에 닿도록(그 전엔 정상 위로 튀어나오지 않도록) 세밀하게 조정
```

---

## Props

```typescript
type WorldMapBook = {
  id: string
  title: string
  total_pages: number | null
  current_page: number
  status: 'reading' | 'completed' | 'paused'
  kdc?: string | null
}

<WorldMap books={WorldMapBook[]} />
```

데이터는 `dashboard/page.tsx`(Server Component)에서 Supabase에서 fetch 후 전달.

---

## 레이아웃

전체 컨테이너: 높이 440px, `overflow: hidden`.
산 스트립: `overflow-x: auto` + `scrollbar-width: none`으로 스크롤 가능하되 스크롤바 숨김.
책이 많아질수록 `totalW`가 자동 확장됨.

```typescript
const MAX_MTN_W = (2 * STEPS_BY_LEVEL[4] - 1) * PX  // level 4 최대 너비
const totalW = Math.max(books.length * (MAX_MTN_W + 20) + 64, 700)
```

---

## 완독 맵 공유 (PNG 다운로드) — 2026.07.11

WorldMap 컨테이너 왼쪽 하단에 카메라 아이콘 버튼(`mode`·화면과 무관하게, 완독한 책이
하나라도 있으면 노출). 클릭 시 별도 미리보기 없이 즉시 PNG가 다운로드된다.

- **대상**: 화면에 보이는 `foreground`/`background`가 아니라 `books` prop 원본에서
  `status === 'completed'`만 필터링. `dashboard/page.tsx`·`hikes/page.tsx` 둘 다
  이미 사용자의 전체 완독 목록을 넘겨주므로, trophy 화면의 `TARGET_TROPHY`(5개)
  표시 제한과 무관하게 파노라마엔 잘림 없이 전부 담긴다.
- **배치**: 완독한 산을 가로로 나란히, 압축 없는 넉넉한 간격(`MAX_MTN_W + GAP`)으로
  이어붙임 — 정해진 비율 없이 산맥 너비만큼 자연스럽게 길어짐.
- **텍스트 각인**: 땅과 산이 맞닿는 지점(`groundTopY` 바로 아래)에 책 제목을 각인.
  산 너비를 넘으면 캔버스 실측 텍스트 폭 기준으로 말줄임(…) 처리 (`truncateToWidth`).
- **버튼 고정 위치**: 스크롤되는 내부 div가 아니라 바깥 wrap(고정 크기) 기준으로 둬서,
  산이 많아 가로 스크롤이 생겨도 버튼은 항상 같은 자리에 고정됨("+ 책 추가" 버튼과
  동일한 원칙).
- **하늘 고정**: 캡처 시각에 따라 이미지가 매번 달라지지 않도록(drift 방지 원칙과 동일)
  항상 맑은 낮(`getSky(10)`)으로 고정.
- 파일명: `산책또산책_완독맵_YYYY-MM-DD.png`

코드: `renderCompletedPanorama`, `drawMountainTitle`, `truncateToWidth`,
`handleCaptureCompletedMap` in `WorldMap.tsx`. `dom-to-image`/`html-to-image` 같은
라이브러리 불필요 — WorldMap이 애초에 `<canvas>` 기반이라 오프스크린 캔버스를 새로
그려 `canvas.toDataURL('image/png')`로 바로 내보내면 됨(스크롤 밖 영역도 이미
비트맵에 포함돼 있어 화면 캡처 특유의 잘림 문제 자체가 없음).

---

## 오로라 이스터에그 — 2026.07.11

개발자가 `lib/aurora-books.ts`의 `AURORA_ISBNS`에 등록해둔 특정 책을 사용자가
갤러리에 추가하는 순간, 화면 전체에 10초짜리 초록-보라 오로라 커튼 연출
(`components/effects/AuroraOverlay.tsx`)이 1회 재생된다. 공유 대상이 아닌 순전히
개인적인 발견의 순간이라 서버에 상태를 남기지 않고, `addBook` 서버 액션의 반환값
(`{ aurora: boolean }`)을 `AddBookForm.tsx`가 받아 그 자리에서 트리거한다.

- **판별 기준**: ISBN (하이픈/공백 정규화 후 비교). 제목 대신 ISBN을 쓰는 이유는
  동명이서·번역판 오탐을 피하기 위함.
- **지속 효과**: 오로라 트리거 책은 완독 후 정상 깃발 색도 일반 6색 팔레트
  (`FLAG_COLORS`)가 아니라 오로라 팔레트(`AURORA_FLAG_COLORS`, 초록-보라 계열)로
  고정됨 — `getFlagColor(id, isbn)`이 `isAuroraBook(isbn)`으로 분기.
- **완독 증표(손수건/도장)에 정적 흔적을 남기는 부분**은 그 증표 자체의 노출 위치가
  아직 미정(보류 사항, `산책또산책 — 완독 기록 공유 기능 스펙 정리` 문서 참고)이라
  이번 구현 범위에서는 제외.

코드: `lib/aurora-books.ts`(`AURORA_ISBNS`, `isAuroraBook`),
`components/effects/AuroraOverlay.tsx`, `AddBookForm.tsx`의 `auroraActive` 상태,
`app/dashboard/books/actions.ts`의 `addBook` 반환값.
