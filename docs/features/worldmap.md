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

| 테마 | fill | edge | snow | KDC |
|------|------|------|------|-----|
| mystery | #b8ccd8 | #607080 | #f0f4f8 | 0,1,2 (총류/철학/종교) |
| earth | #c8a870 | #805830 | #f0e8d0 | 3,7,9 (사회/예술/역사) |
| nature | #70c888 | #386848 | #e8f8ec | 4,5 (과학/기술) |
| fantasy | #c890d0 | #885098 | #f8eaf8 | 6,8 (어학/문학) |
| default | #88b888 | #487048 | #eaf4ea | kdc 없음 |

kdc가 없으면 index % 4로 테마를 순환 배정.

---

## 하늘 색상 (시간대)

| 시간 | 상단 | 하단 | 별 |
|------|------|------|-----|
| 0–5시 | #060b22 | #0d1540 | ✓ |
| 6–15시 | #2980b9 | #87ceeb | - |
| 16–18시 | #d04010 | #f08050 | - |
| 19–23시 | #0e1248 | #141840 | ✓ |

하늘은 CSS `linear-gradient` + `transition: background 4s ease`로 부드럽게 전환. 1분마다 시간 갱신.

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

const charRow = Math.round((1 - progress) * (steps - 1))
// 0% → 맨 아래(steps-1행), 100% → 0행(정상)
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
