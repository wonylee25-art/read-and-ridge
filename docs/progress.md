# 개발 진행 상황 및 계획

> 마지막 업데이트: 2026.06.29

---

## 🆕 최근 작업 (2026.06.29)

- [x] **인수인계 / Phase 1 점검** — Node v22 설치, Next.js 14.2.35 구조, Supabase 연동 모두 기존재 확인. Phase 1은 사실상 완료 상태로, Vercel 배포 연결만 미확정.
- [x] **`docs/design-style.md` 보강** — 디자인 토큰, 반응형/브레이크포인트, 상태별 UI(로딩/빈/에러), 모션·접근성(prefers-reduced-motion, 색맹 대비, 스크린리더), 다크모드 정책, 로케일/카피 톤 섹션 추가.
- [x] **`docs/design-style.md` 모순 정리** — 실제 `WorldMap.tsx`가 이미 Canvas로 재구현됐는데 문서는 "현재 SVG → 목표 Canvas"로 서술돼 있어, 낡은 SVG 차이표·저채도 색상표·시스템폰트 서술 등 코드와 배치되는 내용 삭제/수정.

### ⚠️ Git 미커밋 경고
현재 작업물 대부분이 아직 커밋되지 않음 (`git log`에 `api/`, `dashboard/`, `components/`, `docs/` 없음). 마지막 커밋은 `add supabase google auth`. **작업 유실 방지를 위해 커밋·푸시 필요.**

---

## ✅ 완료된 것들

### 인프라 / 인증
- [x] Next.js 14 App Router 프로젝트 세팅
- [x] Supabase 연동 (PostgreSQL DB + Auth)
- [x] Google OAuth 소셜 로그인 (`/login`)
- [x] OAuth 콜백 처리 (`/auth/callback`)
- [x] 로그아웃

### 레이아웃 / 내비게이션
- [x] 사이드바 (`Sidebar.tsx`) — 홈 / 독서 / 등산 탭
- [x] 대시보드 레이아웃 (`dashboard/layout.tsx`)

### 독서 기록 (`/dashboard/books`)
- [x] Supabase `books` 테이블 연동
- [x] 상태별 그룹 노출 (읽는 중 / 완독 / 잠시 멈춤)
- [x] 책 카드 (`BookCard.tsx`) — 진행률 바 + 페이지 업데이트
- [x] 책 추가 폼 (`AddBookForm.tsx`) — 제목 검색 (카카오 API) + 결과 드롭다운
- [x] 바코드 스캐너 (`BarcodeScanner.tsx`) — ZXing, 실시간 ISBN 감지
- [x] API 라우트 (`/api/books/search`) — 카카오 제목 검색 + Open Library ISBN 조회
- [x] Server Actions: `addBook`, `updateProgress`, `deleteBook`

### 등산 기록 (`/dashboard/hikes`)
- [x] Supabase `hikes` 테이블 연동
- [x] 등산 추가 폼 (`AddHikeForm.tsx`)
- [x] 요약 통계 바 (총 거리 / 총 시간 / 최고 고도)
- [x] 등산 카드 목록
- [x] Server Actions: `addHike`, `deleteHike`

### 월드맵 (`WorldMap.tsx`)
- [x] 픽셀 산 렌더링 (4단계 높이 — 페이지 수 기반)
- [x] KDC 기반 색상 테마 4종 (mystery / earth / nature / fantasy)
- [x] 시간대별 하늘 색상 변화 (새벽/낮/황혼/밤)
- [x] 별 렌더링 (야간)
- [x] 태양 렌더링 (주간/황혼)
- [x] 캐릭터 2비트 바운스 애니메이션 (읽는 중)
- [x] 모닥불 애니메이션 (야간 + 읽는 중)
- [x] 완독/미시작 산 흐림 처리 (opacity 0.5, scale 0.82)
- [x] 정상석 (completed 시 정상에 회색 픽셀 바위)
- [x] 가로 스크롤 (산이 많을 때)
- [x] **HTML5 Canvas + requestAnimationFrame 재구현** (2026.06.29)
- [x] **산 색상 고채도 교체** — mystery/earth/nature/fantasy 원색 계열 (2026.06.29)
- [x] **픽셀 구름 오브젝트** — 주간 좌측 흐름 애니메이션 (2026.06.29)
- [x] **산 클릭 → 수직형 진도 입력 모달** — 게이지 드래그, 능선 위 캐릭터 (2026.06.29)
- [x] **BookCard 상태 변경** — 드롭다운으로 reading/paused/completed 전환 (2026.06.29)
- [x] **완독 자동 처리** — `current_page >= total_pages`시 자동 completed (2026.06.29)
- [x] **책 메모 기능** — BookCard 메모 입력/저장 (DB memo 컬럼 추가) (2026.06.29)

---

## 🔧 구현됐지만 목표와 차이나는 것들

| 항목 | 현재 상태 | 목표 |
|------|---------|------|
| 앱 진입점 | `/dashboard` (사이드바 레이아웃) | **`/`가 메인 월드맵 Canvas 풀스크린** |
| 도서 API | 카카오 + Open Library | **국립중앙도서관 API** |
| Z 레이어 시각 | opacity + scale만 | 드롭 섀도 (전경) / 안개 레이어 (원경) |
| 로그인 | Google OAuth만 | **카카오 로그인 추가** |
| 페이지 구조 | `/dashboard/*` | `/`, `/mypage`, `/shop` 구조로 개편 |

> 위 항목들은 `design-style.md`에 설계 방향이 문서화돼 있으나, 코드 구현은 미완. 표 내용은 코드 기준 여전히 유효.

---

---

## 8단계 개발 로드맵 (목표 전체 계획)

로드맵 출처: PRD v1.1 기반 기획 문서

| Phase | 작업 내용 | 예상 기간 | 주요 기술 |
|-------|---------|---------|---------|
| **1** | 개발 환경 설정 (Node.js, VS Code, Next.js, Vercel 배포 연결) | 0.5일 | Next.js, Vercel |
| **2** | Supabase 설정 + 카카오/구글 소셜 로그인 + 로그인/회원가입 UI | 1일 | Supabase Auth |
| **3** | 도서 등록 — 국립중앙도서관 API 연동, 도서 검색 UI, 등록 플로우 | 1~2일 | 국립중앙도서관 API, Next.js API Routes |
| **4** | 픽셀 월드맵 — **HTML5 Canvas 렌더링**, 산 높이 시스템, KDC 자동 채색, 시간대 배경 | 3~5일 | HTML5 Canvas, JavaScript |
| **5** | 캐릭터 애니메이션 + 진도 입력 — 바운스 애니메이션, 수직 모달 UI, 실시간 슬라이딩 | 2~3일 | Canvas Animation |
| **6** | 완등 세레모니 + 정상석 갤러리 — CLEAR 이펙트, 폭죽 파티클, 갤러리 그리드 | 2일 | Canvas, CSS |
| **7** | 이미지 내보내기 — 1:1 PNG 저장, 와이드 파노라마 캡처, 워터마크 삽입 | 1~2일 | Canvas toDataURL |
| **8** | 토스페이먼츠 결제 연동 + 프리미엄 기능 게이팅 | 2일 | 토스페이먼츠 SDK |

---

## 목표 앱 구조 (로드맵 기준)

```
[Vercel — Next.js 14]
├── /              → 메인 픽셀 월드맵 (Canvas 풀스크린)
├── /login         → 카카오 / 구글 소셜 로그인
├── /mypage        → 마이페이지 + 정상석 갤러리
├── /shop          → 픽셀 아이템샵
└── /api/
    ├── /api/books    → 국립중앙도서관 API 프록시 (CORS 우회)
    └── /api/payment  → 토스페이먼츠 결제 웹훅 처리

[Supabase 클라우드]
├── Auth      → 카카오/구글 소셜 로그인 처리
├── Database  → 도서 기록, 읽기 진도, 유저 정보, 정상석 데이터
└── Storage   → 커스텀 픽셀 에셋 (캐릭터 스킨, 테마 이미지)
```

현재 구현(`/dashboard/*` 중심)은 이 구조와 다름. 향후 라우트 재편 필요.

---

## 🚧 미구현 — Phase 3~4 (핵심 비주얼 교정)

### [Phase 4] 월드맵 Canvas 재구현 ✅ 완료
- [x] **HTML5 Canvas 기반으로 WorldMap 재작성**
- [x] **산 색상 고채도로 교체**
- [x] **픽셀 구름 오브젝트 추가**
- [x] **산 클릭 → 수직형 진도 입력 모달** (능선 위 캐릭터 슬라이딩)
- [ ] **전경 드롭 섀도** (읽는 중 산이 앞으로 튀어나오는 느낌)
- [ ] **시간 슬라이더** — 하단 드래그 + Snap-back

### [Phase 3] 도서 API 교체
- [ ] **국립중앙도서관 API 연동** (`/api/books` 서버사이드 프록시)
  - 총 쪽수 / KDC 데이터 확보
  - 현재 카카오 + Open Library에서 전환
- [ ] **중복 ISBN 방어** — Shake 애니메이션 + 픽셀 말풍선

---

## 🚧 미구현 — Phase 5 (인터랙션)

- [x] **전경 산 터치 → 수직형 진도 입력 모달** (수직 게이지 바 + 능선 위 캐릭터 슬라이딩)
- [x] **BookCard 상태 변경** — 드롭다운으로 reading/paused/completed 전환
- [x] **완독 시 자동 상태 전환** — `current_page >= total_pages`이면 `completed`
- [x] **책 메모 입력** — BookCard 메모 textarea + 저장
- [ ] **카카오 로그인 추가** (현재 Google만 지원)

---

## 🚧 미구현 — Phase 6~7 (세레모니 + 공유)

- [ ] **8비트 CLEAR! 이펙트** — 레트로 타이포 + 폭죽 파티클
- [ ] **캐릭터 정상 댄스 루프** — 양팔 번쩍 + 점프 8비트 애니메이션
- [ ] **정상석 솟아오르기** — 책 제목 + 완독일 음각
- [ ] **정상석 갤러리 페이지** (`/mypage`) — Grid, KDC 컬러 상속
- [ ] **바이럴 캡처** — 1:1 PNG (인스타 피드) + 와이드 파노라마 + 워터마크
- [ ] **CSV 내보내기**
- [ ] **유저 닉네임 설정**

---

## 📋 미구현 — Phase 8 (비즈니스 모델)

- [ ] **토스페이먼츠 결제 연동** (`/api/payment` 웹훅)
- [ ] **Freemium 제한 로직** — Free: 동시 3권, 연간 24권, CSV 10개
- [ ] **Premium Ridge 패스** (₩4,900/월)
- [ ] **Pixel Item Shop** (`/shop`) — 캐릭터 스킨, 모닥불 커스텀, 갤러리 테마
- [ ] **Supabase Storage 연동** — 커스텀 에셋 저장
- [ ] **회원 탈퇴 및 데이터 Hard Delete**

---

## 다음 작업 권장 순서

```
0. ⚠️ [긴급] 현재 작업물 Git 커밋 + 푸시 (대부분 미커밋 상태 — 유실 위험)
1. ✅ [Phase 4] WorldMap → HTML5 Canvas 재구현 + 색상 고채도 교정 + 구름 추가
2. ✅ [Phase 5] 산 터치 → 수직형 진도 입력 모달 + BookCard 상태/메모
3. [Phase 1] Vercel 배포 연결 (계정 로그인 필요 — 미확정)
4. [Phase 3] 국립중앙도서관 API 교체
5. [Phase 6] 완등 세레모니 (CLEAR! 이펙트 + 정상석)
6. [Phase 7] 정상석 갤러리 (/mypage) + PNG 내보내기
7. [Phase 8] 토스페이먼츠 + 프리미엄 게이팅
```
