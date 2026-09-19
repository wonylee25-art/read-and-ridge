// WorldMap 리팩토링(2026.07.12) — 원래 WorldMap.tsx 한 파일(2128줄)에 있던 상수/고정
// 데이터를 역할별로 나눈 것 중 "순수 상수·픽셀 데이터" 모음. 로직은 없음.
// 값 자체는 전부 기존 WorldMap.tsx에서 그대로 옮겨온 것이라 동작 변화는 없다.

import type { WorldMapBook } from './worldmap-utils'

// ─── 기본 치수 ─────────────────────────────────────────────────────────────────

export const PX = 10 // 1 "pixel" = 10px on canvas

// ─── 산 높이(스텝) 계산 — 페이지 수에 연속적으로 비례 ──────────────────────────
// 예전엔 200/400/600쪽 4단계 구간(getLevel→STEPS_BY_LEVEL)으로만 나눠서, 같은
// 구간 안이면(예: 212쪽 vs 304쪽, 둘 다 200~399쪽 구간) 두께 차이가 있어도 산
// 높이가 완전히 똑같아 보이는 문제가 있었다(2026.07.12 사용자 피드백). PAGES_PER_STEP
// 쪽마다 스텝이 하나씩 늘어나는 연속식(getSteps, geometry.ts)으로 바꿔서, 페이지
// 수 차이가 항상 눈에 보이는 높이 차이로 이어지게 함.
export const STEPS_BASE = 4 // pages=0(=MIN_STEPS)일 때의 스텝(스케일 전 원값)
export const PAGES_PER_STEP = 40 // 이만큼 두꺼워질 때마다 스텝 +1(스케일 전 원값)
export const RAW_MIN_STEPS = 4
export const RAW_MAX_STEPS = 16
// 위 raw 공식 그대로 쓰니 산이 전체적으로 너무 커 보인다는 피드백(2026.07.12,
// v0.4.18 배포 후) — raw 스텝을 구한 뒤 이 배율만큼 한 번 더 줄인다. 높이(steps)를
// 줄이면 폭(numCols = 2*steps±1)도 같은 비율로 같이 줄어들어서 산 전체(높이+폭)가
// 비율 그대로 축소된다.
// ⚠ 0.75로도 여전히 크다는 추가 피드백(2026.07.12, 완등기록 겹침 수정 직후) —
// 0.75 → 0.6으로 더 낮춤(기존 대비 약 20% 추가 축소).
export const SIZE_SCALE = 0.6
export const MIN_STEPS = 4
export const MAX_STEPS = Math.round(RAW_MAX_STEPS * SIZE_SCALE) // 16*0.6=10 (예전 0.75일 땐 12)
export const DEFAULT_PAGES = 250 // 페이지 수를 모를 때 가정하는 평균 두께

export const CANVAS_H = 440

// 모바일 지형도 높이 — 좁은 화면(아래 COMPACT_MAX_W 미만)에서는 440px가 세로의
// 54%를 잡아먹어 통계 카드 등이 화면 밖으로 밀렸다(피드백: "모바일에서 쓰긴 많이
// 불편해"). 산 크기는 그대로 두고 빈 하늘만 줄이는 값이라 픽셀아트가 뭉개지지 않음.
// 440의 1/5을 덜어낸 값. PC는 세로 공간이 넉넉하니 440을 그대로 쓴다(오로라 연출도
// 지금 그대로 유지됨 — getSkyRowsLimit 참고).
export const CANVAS_H_COMPACT = 352

// 이 폭 미만이면 CANVAS_H_COMPACT 사용. Tailwind의 md(768px) 분기와 맞춰둠 —
// 사이드바가 햄버거로 바뀌는 지점과 같아야 레이아웃이 따로 놀지 않는다.
export const COMPACT_MAX_W = 768
export const GROUND_H = 52
export const GAP = 20
// 실루엣 중 쌍봉(twin)이 가장 넓으므로(폭 +2칸, getMountainProfile 참고) 최대
// 스텝(MAX_STEPS) 기준 쌍봉 폭을 기준으로 잡는다 — 다른 실루엣은 이보다 좁아서
// 슬롯 안에서 중앙 정렬됨.
export const MAX_MTN_W = (2 * MAX_STEPS + 1) * PX

// 가장 큰 산의 높이 — geometry.ts의 mtnH = (steps + 2) * PX 와 같은 식.
export const MAX_MTN_H = (MAX_STEPS + 2) * PX

// 오로라(AuroraOverlay)가 산을 뚫지 않고 하늘에만 그려질 수 있는 행 수.
// 예전엔 AuroraOverlay.tsx에 24로 하드코딩돼 있어서 캔버스 높이를 바꿀 때마다 손으로
// 맞춰줘야 했고, 안 맞추면 오로라가 산을 가로질렀다. 캔버스 높이에서 땅과 가장 큰
// 산을 뺀 만큼으로 자동 계산한다(여유 2칸은 기존 값 24와 동일하게 맞추기 위한 마진 —
// canvasH=440이면 (440-52-120)/10 - 2 = 24).
export function getSkyRowsLimit(canvasH: number) {
  return Math.max(1, Math.floor((canvasH - GROUND_H - MAX_MTN_H) / PX) - 2)
}

// ─── 산이 많을 때 간격 압축 ───────────────────────────────────────────────────
// 산이 5개 이상이면 기본 슬롯 폭(MAX_MTN_W + GAP)으로는 화면에 다 안 들어옴.
// MAX_COMPRESS_COUNT개까지는 컨테이너 폭에 맞춰 슬롯을 좁히되, 실제 산이 겹쳐 보이진
// 않게(computeSlotW가 "이번 세트의 최대 산 폭 + 여백"을 하한으로 같이 반영, 2026.07.12
// 겹침 피드백 반영) 최대한 많이 한 화면에 보이게 하고, 그래도 안 맞으면 압축을 포기하고
// 기존처럼 가로 스크롤.
export const MIN_SLOT_W = 140 // 산 폭 하한과 별개로 두는 기본 바닥값(작은 산들만 있을 때 너무 다닥다닥 붙지 않도록)
export const MAX_COMPRESS_COUNT = 10

// ─── 전경/배경 분리 ───────────────────────────────────────────────────────────
// 등록된 책이 아무리 많아도 첫 화면(전경)엔 3~5개 정도만 또렷하게 보여준다.
// 읽는 중인 책은 항상 전경, 부족분은 미시작(paused) 책 중 방문마다 랜덤으로 채운다.
// 전경에 못 들어간 미시작 책은 식별 불가능한 흐릿한 배경 설산으로만 존재하고,
// 완독 책은 정상석(완등기록)으로 옮겨가므로 WorldMap엔 아예 그리지 않는다.
export const TARGET_FOREGROUND = 4

// ─── KDC 색상 — 데모 스크린샷 기준 팔레트 ──────────────────────────────────────
// ⚠ 총류/철학/종교는 한때 "그냥 회색"으로 의도적으로 바꾼 적이 있으나(데모 화면과
// 맞추기 위함), 채도가 너무 낮아 화면에서 청회색 의도가 안 읽힌다는 피드백으로
// 2026.07.12 다시 파란기가 또렷한 청회색/슬레이트 톤으로 조정함.

// char: 산 색상의 보색 계열로 지정 — fill/edge와 같은 계통 색이면 캐릭터가
// 산 표면에 파묻혀 안 보이므로, 항상 산과 대비되는 색으로 골라야 함.
export const KDC_THEME: Record<string, { fill: string; edge: string; snow: string; base: string; char: string }> = {
  // 총류/철학/종교 (KDC 0,1,2) — 청회색/슬레이트 산 → 따뜻한 주황 옷
  mystery: { fill: '#8fa4c4', edge: '#526a89', snow: '#eaf2fb', base: '#2d3f54', char: '#e0752f' },
  // 사회/예술/역사 (KDC 3,7,9) — 황토/머스터드 산 → 파란 옷
  earth:   { fill: '#c9992e', edge: '#8a6312', snow: '#ffefc2', base: '#5f430a', char: '#2f6fe0' },
  // 과학/기술 (KDC 4,5) — 청록 그린 산 → 핑크/레드 옷
  nature:  { fill: '#3cb489', edge: '#1e7d5a', snow: '#e0fbf0', base: '#124e37', char: '#e0527a' },
  // 문학/어학 (KDC 6,8) — 라이트 퍼플 산 → 라임 옷
  fantasy: { fill: '#c08ad6', edge: '#8a54a8', snow: '#f6e9fc', base: '#5c3374', char: '#8ac03f' },
  // KDC 없을 때 — 초록 산 → 자주색 옷
  default: { fill: '#3aac6e', edge: '#1a6640', snow: '#d6f5e6', base: '#0e4228', char: '#c04a8a' },
}

export type KdcThemeKey = 'mystery' | 'earth' | 'nature' | 'fantasy'

export const INDEX_THEME_KEYS: KdcThemeKey[] = ['fantasy', 'earth', 'nature', 'mystery']

export const KDC_BADGE_ORDER: KdcThemeKey[] = ['mystery', 'earth', 'nature', 'fantasy']

export const STATUS_LABEL: Record<WorldMapBook['status'], string> = {
  completed: '완독',
  reading: '독서중',
  paused: '미시작',
}

// ─── 산 실루엣 다양화 ─────────────────────────────────────────────────────────
export const LONG_TITLE_THRESHOLD = 12 // 이 글자 수 이상이면 쌍봉(twin) 배정

// ─── 완독 깃발 색 ──────────────────────────────────────────────────────────────
// book.id로 시드 고정, 매번 같은 책은 같은 색.
// 개발자가 지정한 오로라 이스터에그 책(lib/aurora-books.ts)만 예외적으로 일반
// 6색 팔레트 대신 초록-보라 오로라 팔레트에서 골라, 완독 후에도 깃발 색에
// "그 책은 오로라를 봤었다"는 흔적이 정적으로 남는다.
export const FLAG_COLORS = ['#e03e2f', '#2f6fe0', '#e0a72f', '#7d3fe0', '#2fb573', '#e0527a']
export const AURORA_FLAG_COLORS = ['#3fe0a0', '#7d5ae0', '#4fd9c8', '#a25ae0']

// 완독 후 유예 시간 — 이 안엔 정상에 깃발(또는 세레모니 진행 중이면 댄스 캐릭터)이
// 꽂힌 채로 WorldMap(산책기록)에 남아있고, 지나면 완등기록(정상석)으로만 남고
// WorldMap에선 사라짐.
// ⚠ 예전엔 24시간이었는데, "산책기록 지도에 완독한 책이 계속 남아있지 않고 바로
// 빠졌으면 좋겠다"는 피드백을 받고 대폭 줄임 — 완등 세레모니(폭죽·CLEAR·정상 댄스,
// BURST_DURATION_MS=10000ms)가 다 재생될 시간만 확보하고 곧바로 사라지게 함.
// 값 자체를 BURST_DURATION_MS를 참조해 정의하고 싶지만 그 상수가 파일 뒤쪽에
// 선언돼 있어(TDZ 문제) 숫자를 직접 맞춰둠 — BURST_DURATION_MS를 바꾸면 이 값도
// 같이 조정할 것(BURST_DURATION_MS + 여유 500ms).
export const COMPLETION_GRACE_MS = 10500

// ─── 완등 세레모니 (산 정상 위 인라인 이펙트) ──────────────────────────────────
export const BURST_DURATION_MS = 10000
export const BURST_PARTICLE_COUNT = 22
export const BURST_COLORS = ['#f0c040', '#e03e2f', '#2f6fe0', '#2fb573', '#e0527a', '#8ac03f', '#ffd23e']

// ─── Cloud shapes (relative pixel offsets) ────────────────────────────────────

export const CLOUD_SHAPES = [
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
export const CHAR_COLORS: Record<string, string> = {
  H: '#5a3a22', // 머리카락
  S: '#f1c9a5', // 피부
  B: '#4a7fc0', // 옷
  L: '#3a3a3a', // 다리
}
export const CHAR_ROWS_A = [
  '.HHHH.',
  '.SSSS.',
  '..BB..',
  'BBBBBB',
  '.BBBB.',
  '.BBBB.',
  '.L..L.',
  '.L..L.',
]
export const CHAR_ROWS_B = [
  '.HHHH.',
  '.SSSS.',
  '..BB..',
  'BBBBBB',
  '.BBBB.',
  '.BBBB.',
  'LL..LL',
  'L....L',
]

export const CPX = 3

// 세레모니 전용 캐릭터 포즈(양팔을 번쩍 든 8열 스프라이트) — WorldMap 평상시
// 걷기/오르기 포즈(CHAR_ROWS_A/B, 6열)와는 별개. 정상에서만 잠깐 등장.
export const DANCE_CHAR_ROWS_A = [
  '..HHHH..',
  'S.SSSS.S',
  '..BBBB..',
  '.BBBBBB.',
  '..BBBB..',
  '..BBBB..',
  '.L....L.',
  '.L....L.',
]
export const DANCE_CHAR_ROWS_B = [
  '.SHHHHS.',
  '..SSSS..',
  '..BBBB..',
  '.BBBBBB.',
  '..BBBB..',
  '..BBBB..',
  '..LLLL..',
  '.L....L.',
]

// ─── 스프라이트: 나무 / 꽃 / 버섯 (고정 데이터 — 매번 동일하게 렌더) ──────────

export const TREE_ROWS = [
  '.AAA.',
  'AGGGA',
  'GGGGG',
  '..T..',
  '..T..',
]
export const TREE_COLORS: Record<string, string> = {
  A: '#43a852', // 밝은 잎
  G: '#2e8b3d', // 잎
  T: '#6b4226', // 줄기
}

// 완독맵 PNG 배경 장식용 벚꽃나무 — TREE_ROWS와 모양은 같고 잎 색만 벚꽃 톤으로 교체
export const CHERRY_TREE_COLORS: Record<string, string> = {
  A: '#fbd5e6', // 밝은 벚꽃잎
  G: '#f3a6c8', // 벚꽃잎
  T: '#6b4226', // 줄기
}

// 소장 중인 책(owned) 표시용 베이스캠프 텐트 — 산기슭에 세워둔다.
// "이 산은 내 책"이라는 단일 기호. 낮에는 텐트만, 밤에는 옆에 모닥불이 더해진다.
// (2026.09 — 그전까지 owned 값은 지형도에서 전혀 쓰이지 않았다. docs/ideation.md 참고)
export const TENT_ROWS = [
  '...T...',
  '..TTT..',
  '.TTTTT.',
  'TTTDTTT',
  'TTTDTTT',
]
// 천막 색 4벌. 어느 산이 어느 벌을 쓸지는 assignCampPalettes(geometry.ts)가 정한다.
// ⚠ 어느 벌이든 모닥불(#ff6600/#ff9900/#ffcc00)과 확실히 달라야 한다. 처음엔 주황 계열
// 천막 한 벌뿐이라 바로 옆 불꽃과 같은 색이었고, 텐트가 아니라 횃불처럼 보였다(피드백).
// ⚠ 천막은 테두리(능선)와 내부를 색으로 나누지 않는다 — 한 벌당 단색 한 가지다(피드백).
// ⚠ 4벌이 전부 옅은 파스텔이던 때는 산이 나란히 서면 "비슷한 색끼리 겹쳐 보인다"는
// 피드백이 있었다(2026.09.19). 그래서 명도만 살짝 다른 조합을 버리고 색상(hue) 자체를
// 크게 벌린 4벌로 교체 — 아이보리 / 청록 / 로즈 / 코발트. 주황·노랑(불꽃)과 산 팔레트
// (청회색·황토·청록산·연보라), 잔디는 계속 피한다.
//   T = 천막 전체(단색) / D = 입구(낮에는 어두운 안쪽, 밤엔 TENT_LIT_DOOR로 점등)
export const TENT_PALETTES: Record<string, string>[] = [
  { T: '#f0e4c4', D: '#3a3a44' }, // 아이보리
  { T: '#46bda6', D: '#243f3a' }, // 청록
  { T: '#ec7f9c', D: '#4a2130' }, // 로즈
  { T: '#5b95df', D: '#23344c' }, // 코발트
]

// 밤에 텐트 입구에 켜지는 등불 색 — 4벌 공통.
export const TENT_LIT_DOOR = '#ffcf70'

export const FLOWER_ROWS = [
  '.P.P.',
  'PPPPP',
  '.GGG.',
]
export const FLOWER_COLORS: Record<string, string> = {
  P: '#f3a6c8', // 꽃잎 (핑크)
  G: '#3f9448', // 잎
}

export const MUSHROOM_ROWS = [
  '.RR.',
  'RRRR',
  '.WW.',
]
export const MUSHROOM_COLORS: Record<string, string> = {
  R: '#d8402c',
  W: '#f5efe6',
}

// ─── 날씨 (벚꽃비/비/눈) ───────────────────────────────────────────────────────
export const WEATHER_DAYS_PER_MONTH = 3.5
export const WEATHER_CHANCE = WEATHER_DAYS_PER_MONTH / 30

// ─── 완독 맵 공유 (PNG 다운로드) ───────────────────────────────────────────────
// 산 사이 간격 — 화면 표시용 GAP(20)보다 좁게 잡아 PNG에서는 산끼리 더 붙어 보이게 함
export const PANO_GAP = 8

// ─── 산책기록 캡처 (정상 인증샷, 1:1 정사각형) ────────────────────────────────
export const CAPTURE_SIZE = 640

// "피크 프레임" 고정 시점 — drawBurstParticles 물리식 기준 outward(퍼짐)가 1.0에
// 도달하고 fade는 아직 0.8, drift(낙하)는 0.04뿐이라 폭죽이 가장 화려하고 아직
// 안 떨어진 순간. CLEAR! 텍스트도 260ms 안에 다 나타나 있어 문제없음(2026.07.12 결정).
export const CAPTURE_BURST_PEAK_MS = 2000

// 주인공 산 옆에 곁들이는 "다른 책들" — 축소 비율/투명도/간격. 흐릿한 배경 설산
// (drawBackgroundRange)과 달리 실제 실루엣·색을 그대로 축소해서 보여줘, 어떤 책들이
// 옆에 있는지 알아볼 수 있게 한다(2026.07.12, 사용자 피드백 반영).
export const SIDE_MOUNTAIN_SCALE = 0.7
export const SIDE_MOUNTAIN_OPACITY = 0.6
export const SIDE_MOUNTAIN_GAP = 14

// ─── 데모 데이터 (props 없이 단독 실행될 때 사용 — 미리보기/스토리북용) ────────

export const DEMO_BOOKS: WorldMapBook[] = [
  // owned는 산기슭 베이스캠프(텐트/모닥불) 노출 조건 — 예시 지도에서도 소장/비소장이
  // 섞여 보이도록 일부러 demo-4만 false로 둔다(빌린 책엔 캠프가 없다는 걸 보여주기 위함).
  { id: 'demo-1', title: '문학 책',   total_pages: 150, current_page: 0,   status: 'paused',    kdc: '8', owned: true },
  { id: 'demo-2', title: '역사 책',   total_pages: 300, current_page: 300, status: 'completed', kdc: '9', owned: true },
  { id: 'demo-3', title: '과학 책',   total_pages: 500, current_page: 210, status: 'reading',   kdc: '4', owned: true },
  { id: 'demo-4', title: '철학 책',   total_pages: 700, current_page: 0,   status: 'paused',    kdc: '1', owned: false },
]
