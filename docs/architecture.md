# 아키텍처

## 디렉토리 구조

```
read-and-ridge/
├── app/
│   ├── layout.tsx                    # 루트 레이아웃
│   ├── page.tsx                      # 루트 → /dashboard 리다이렉트 (또는 랜딩)
│   ├── globals.css
│   ├── login/
│   │   └── page.tsx                  # 구글 로그인 페이지
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts              # OAuth 콜백 처리
│   ├── dashboard/
│   │   ├── layout.tsx                # 사이드바 포함 레이아웃
│   │   ├── page.tsx                  # 홈: WorldMap + 통계
│   │   ├── books/
│   │   │   ├── page.tsx              # 독서 목록 (Server Component)
│   │   │   └── actions.ts            # Server Actions: addBook, updateProgress, deleteBook
│   │   └── hikes/
│   │       ├── page.tsx              # 등산 목록 (Server Component)
│   │       └── actions.ts            # Server Actions: addHike, deleteHike
│   └── api/
│       └── books/
│           └── search/
│               └── route.ts          # GET /api/books/search?isbn= 또는 ?q=
├── components/
│   ├── auth/
│   │   └── LogoutButton.tsx
│   ├── dashboard/
│   │   └── Sidebar.tsx
│   ├── books/
│   │   ├── AddBookForm.tsx           # 책 추가 폼 (검색 + 바코드 스캔)
│   │   ├── BookCard.tsx              # 개별 책 카드 (진행률 + 업데이트)
│   │   └── BarcodeScanner.tsx        # 카메라 바코드 스캐너 모달
│   ├── hikes/
│   │   └── AddHikeForm.tsx
│   └── worldmap/
│       └── WorldMap.tsx              # 픽셀 아트 산 전경 (메인 비주얼)
├── lib/
│   └── supabase/
│       ├── client.ts                 # 브라우저용 Supabase 클라이언트
│       └── server.ts                 # 서버용 Supabase 클라이언트 (SSR)
└── docs/                             # 이 문서들
```

## 렌더링 패턴

| 파일 | 패턴 | 이유 |
|------|------|------|
| `app/dashboard/books/page.tsx` | Server Component | Supabase에서 직접 데이터 fetch |
| `app/dashboard/hikes/page.tsx` | Server Component | 동일 |
| `app/dashboard/page.tsx` | Server Component | 홈 대시보드 |
| `components/books/AddBookForm.tsx` | Client Component | 폼 상태, 디바운스 검색, 바코드 |
| `components/books/BookCard.tsx` | Client Component | 페이지 업데이트 인터랙션 |
| `components/books/BarcodeScanner.tsx` | Client Component | 카메라 접근 (Web API) |
| `components/worldmap/WorldMap.tsx` | Client Component | 애니메이션, 시간 기반 하늘 |

## 데이터 흐름

```
사용자 액션
  └─ Server Action (actions.ts)
       └─ Supabase DB 쓰기
            └─ revalidatePath('/dashboard/books')
                 └─ Server Component 재실행 → 최신 데이터 표시
```

바코드 스캔 흐름:
```
BarcodeScanner (카메라)
  └─ ISBN 감지
       └─ AddBookForm.handleISBN()
            └─ GET /api/books/search?isbn={isbn}
                 └─ Open Library API
                      └─ 책 정보 자동 입력
```

## Server Actions vs API Route

- **Server Actions** (`actions.ts`): DB 쓰기 (추가/수정/삭제). Form action으로 직접 연결.
- **API Route** (`/api/books/search`): 외부 API 프록시 역할. 카카오 API 키가 서버에만 있어야 해서 클라이언트에서 직접 호출 불가.
