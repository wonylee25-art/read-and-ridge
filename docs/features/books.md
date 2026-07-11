# 독서 기록 기능

페이지: `/dashboard/books`

## 구성 컴포넌트

```
app/dashboard/books/page.tsx   (Server Component)
  ├─ components/books/AddBookForm.tsx   (Client)
  │    └─ components/books/BarcodeScanner.tsx   (Client, dynamic import)
  └─ components/books/BookCard.tsx   (Client)
```

---

## 책 추가 (`AddBookForm.tsx`)

### 두 가지 입력 방식

**1. 제목 검색**
- 입력창에 타이핑 → 400ms 디바운스 후 `/api/books/search?q={query}` 호출
- 국립중앙도서관 서지정보(SEOJI) API 결과를 드롭다운으로 표시 (썸네일, 저자, 출판사)
- 선택 시 제목/저자/ISBN이 자동 입력됨

**2. 바코드 스캔**
- 카메라 버튼 클릭 → `BarcodeScanner` 모달 열림
- `@zxing/browser`의 `BrowserMultiFormatReader`로 실시간 바코드 인식
- 978/979 시작 13자리 EAN 감지 시 → `/api/books/search?isbn={isbn}` 호출
- 국립중앙도서관 API로 우선 조회하고, 페이지 수가 없으면 Open Library API로 보완

### 폼 필드

| 필드 | 필수 | 기본값 |
|------|------|--------|
| title (hidden) | ✓ | 검색/스캔 결과 자동 입력 |
| author (hidden) | - | 검색/스캔 결과 자동 입력 |
| total_pages | - | 검색 결과 자동 입력 가능 |
| status | ✓ | `reading` |
| started_at | - | 비어있음 |
| owned (소장 중 체크박스) | - | 체크됨 (true) |

> `current_page`는 추가 폼에서 입력받지 않음. 신규 등록 시 항상 0에서 시작하고, 이후 `BookCard`의 페이지 업데이트로 갱신한다.

### 소장 여부 & 중복 경고

- `owned`는 열람 상태(`status`)와 독립적인 필드. 소장 여부와 무관하게 모든 등록 책은 동일하게 읽기 상태·진행률을 관리한다.
- 중복 검사는 `owned`/`status`와 무관하게 항상 실행된다. ISBN이 있으면 동일 사용자의 동일 ISBN을 바로 중복으로 판단.
  ISBN이 없으면 동일 사용자의 동일 제목(대소문자·공백 무시, `ilike`) 후보를 뽑은 뒤, 저자까지 비교한다:
  신규/기존 양쪽 다 저자 정보가 있으면 저자까지 같아야 중복으로 판단(제목만 같고 저자가 다른
  "동명이서"는 다른 책으로 취급), 어느 한쪽이라도 저자 정보가 없으면 정보 부족을 감안해 제목만으로 판단.
  (⚠ 이전엔 "신규 등록이 `owned=true`이고 기존도 `owned=true`일 때"만 검사해서, ISBN 없이
  등록하거나 `owned=false`로 등록하면 같은 책이 그냥 중복 등록되는 문제가 있었음 — 확장 수정됨.)
- 조건에 걸리면 저장하지 않고 **"OO, 또 산 책이 됩니다!"** 메시지로 막는다(`AddBookForm`의 `duplicateError` 상태 + shake 애니메이션). 등록을 진행하려면 다른 책을 선택하거나 제목을 다르게 입력해야 한다.

### 제출

`addBook(formData)` Server Action 호출 → Supabase insert → `revalidatePath('/dashboard/books')` 및 `/dashboard`

---

## 바코드 스캐너 (`BarcodeScanner.tsx`)

- `dynamic(() => import('./BarcodeScanner'), { ssr: false })`로 임포트 (카메라 API는 서버에서 실행 불가)
- `useEffect`에서 `BrowserMultiFormatReader.decodeFromVideoDevice()` 시작
- 컴포넌트 언마운트 시 `decodeFromVideoDevice`가 반환한 `IScannerControls.stop()`으로 카메라 스트림 정리 (구버전 `reader.reset()`은 @zxing/browser v0.2에서 제거됨)
- UI: 전체화면 모달, 스캔 가이드 박스, 스캔라인 애니메이션 (`@keyframes scanline`)
- 에러 처리: 카메라 권한 거부 시 에러 메시지 표시

---

## 책 카드 (`BookCard.tsx`)

### 진행률 표시

```
현재 페이지 / 전체 페이지 → 퍼센트 계산
→ h-2 bg-gray-100 → bg-blue-500 progress bar
```

### 제목 / 전체 쪽수 인라인 수정

- 등록 시 자동 채워진 제목·전체 쪽수(검색 결과 오선택, 직접 입력 오타, 기본값 150쪽 등)가
  실제 책과 다를 수 있는데, 예전엔 등록 후 고칠 방법이 없었음(저자만 인라인 수정 가능했음).
- 저자 수정과 동일한 패턴: 제목 옆 연필 아이콘 클릭 → 입력 필드로 전환 → 저장.
  `updateTitle(book.id, title)` Server Action 호출.
- 전체 쪽수도 진행률 표시 줄의 연필 아이콘으로 동일하게 수정. 값이 없으면 "미입력"으로
  표시하고 진행률 바 대신 안내 문구를 보여줌. `updateTotalPages(book.id, totalPages)` 호출.
  - 이미 완독 상태였던 책은 쪽수를 고쳐도 계속 완독 유지 + 현재 페이지도 새 총 쪽수에 맞춤.
  - 완독 전 책인데 새 총 쪽수가 지금까지 읽은 페이지보다 작아지면 초과분을 잘라내고
    (clamp), 그 결과 현재==총 쪽수가 되면 `updateProgress`와 동일하게 자동 완독 처리.

### 페이지 업데이트

- `status === 'reading'`일 때만 입력 필드 + 업데이트 버튼 표시
- 입력값 변경 시 로컬 `useState`로 즉시 UI 반영
- 버튼 클릭 시 `updateProgress(book.id, page)` Server Action 호출

### 소장 여부 토글

- 상단 컨트롤 영역, 메모 버튼 왼쪽에 집 아이콘(`Home`, lucide-react) 버튼
- 소장 중이면 amber 색, 아니면 회색(호버 시 amber) — 클릭할 때마다 반전
- 클릭 시 로컬 상태 즉시 반영 + `updateOwned(book.id, owned)` Server Action 호출
- 등록 후에도 소장 여부를 자유롭게 고칠 수 있음(대출→구매, 구매→처분 등 상태 변화 반영용)

### 삭제

- 휴지통 버튼 → `deleteBook(book.id)` Server Action 호출
- `<form action={...}>` 패턴으로 Server Action 직접 연결

---

## 상태별 그룹

페이지에서 Supabase 데이터를 받아 세 그룹으로 분리:

```typescript
const reading   = books?.filter((b) => b.status === 'reading')   ?? []
const completed = books?.filter((b) => b.status === 'completed') ?? []
const paused    = books?.filter((b) => b.status === 'paused')    ?? []
```

각 그룹은 `grid-cols-1 sm:grid-cols-2`로 표시. 비어있는 그룹은 섹션 자체를 숨김.

---

## 구현 완료 (2026.06.29)

- ✅ `status` 변경 — BookCard 드롭다운으로 reading/paused/completed 전환
- ✅ 완독 자동 처리 — `current_page >= total_pages`이면 자동 `completed`
- ✅ 책 메모 — BookCard memo 입력/저장

## 현재 미구현 / 개선 포인트

- `kdc` 필드가 DB에는 있지만 AddBookForm/검색 결과 어디에서도 채워지지 않음 — 도서 검색은 이미 국립중앙도서관(SEOJI) API로 전환됐지만(Phase 3 완료), `/api/books/search`의 응답 매핑(`fetchNL`)이 KDC 필드를 추출·전달하지 않고 있어서 여전히 비어있음. KDC 채색 컨셉을 살리려면 이 매핑 보완이 필요.
- **`owned` DB 컬럼 미생성** — AddBookForm 체크박스와 서버 액션(actions.ts) 로직은 구현됨. Supabase `books` 테이블에 `owned` (boolean, default true) 컬럼을 추가해야 실제로 저장/조회가 동작한다. 컬럼 없이 저장 시도하면 insert 에러 발생.
- **총 쪽수 누락 시 300쪽 기본값 미적용** — 현재 누락 도서는 진행률 0% 고정. 등록 파이프라인 보완 필요.

> 상세 검증은 `docs/verification.md` 참고.
