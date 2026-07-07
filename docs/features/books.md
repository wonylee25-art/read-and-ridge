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
- 카카오 도서 API 결과를 드롭다운으로 표시 (썸네일, 저자, 출판사)
- 선택 시 제목/저자/ISBN이 자동 입력됨

**2. 바코드 스캔**
- 카메라 버튼 클릭 → `BarcodeScanner` 모달 열림
- `@zxing/browser`의 `BrowserMultiFormatReader`로 실시간 바코드 인식
- 978/979 시작 13자리 EAN 감지 시 → `/api/books/search?isbn={isbn}` 호출
- Open Library API로 책 정보 자동 입력 (카카오는 ISBN 직접 검색 미지원)

### 폼 필드

| 필드 | 필수 | 기본값 |
|------|------|--------|
| title (hidden) | ✓ | 검색/스캔 결과 자동 입력 |
| author (hidden) | - | 검색/스캔 결과 자동 입력 |
| total_pages | - | 검색 결과 자동 입력 가능 |
| current_page | - | 0 |
| status | ✓ | `reading` |
| started_at | - | 비어있음 |

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

### 페이지 업데이트

- `status === 'reading'`일 때만 입력 필드 + 업데이트 버튼 표시
- 입력값 변경 시 로컬 `useState`로 즉시 UI 반영
- 버튼 클릭 시 `updateProgress(book.id, page)` Server Action 호출

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

- `kdc` 필드가 DB에는 있지만 AddBookForm에서 입력받지 않음 → 카카오 API 응답에 KDC 없음. **국립중앙도서관 API 연동(Phase 3)**이 KDC 채색의 전제.
- **중복 ISBN 방어 미구현** — overview의 핵심 가치(중복 구매 방지)인데 재등록 차단 로직 없음. Shake + 말풍선 필요.
- **총 쪽수 누락 시 300쪽 기본값 미적용** — 현재 누락 도서는 진행률 0% 고정. 등록 파이프라인 보완 필요.

> 상세 검증은 `docs/verification.md` 참고.
