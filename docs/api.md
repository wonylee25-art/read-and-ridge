# API 레퍼런스

## GET /api/books/search

외부 도서 API 프록시. 국립중앙도서관 인증키를 서버에서 안전하게 사용하기 위해 클라이언트에서 직접 호출하지 않고 이 라우트를 통해 중계한다.

---

### ISBN으로 책 정보 조회

```
GET /api/books/search?isbn={isbn}
```

**파라미터**

| 이름 | 타입 | 설명 |
|------|------|------|
| isbn | string | 13자리 ISBN (978... 또는 979...) |

**응답 (성공 200)**

```json
{
  "book": {
    "title": "책 제목",
    "authors": "저자명",
    "publisher": "출판사",
    "total_pages": 320,
    "isbn": "9791234567890"
  }
}
```

**응답 (실패 404)**

```json
{ "error": "책 정보를 찾을 수 없어요" }
```

**데이터 소스**: 1순위 국립중앙도서관 서지정보(SEOJI) API (`nl.go.kr/seoji/SearchApi.do`), 페이지 수 미제공 시 Open Library API (`openlibrary.org/api/books`)로 보완. 국립중앙도서관 조회에 실패하면 Open Library로 전체 폴백.

응답 캐시: Open Library 폴백 호출은 `next: { revalidate: 86400 }` (24시간)

---

### 제목으로 책 검색

```
GET /api/books/search?q={query}
```

**파라미터**

| 이름 | 타입 | 설명 |
|------|------|------|
| q | string | 검색어 (책 제목) |

**응답 (200)**

```json
{
  "documents": [
    {
      "title": "책 제목",
      "authors": "저자명",
      "publisher": "출판사",
      "isbn": "9791234567890",
      "thumbnail": "https://...",
      "datetime": "2023",
      "total_pages": null
    }
  ]
}
```

`NL_API_KEY` 환경변수가 없으면 빈 배열 반환.

**데이터 소스**: 국립중앙도서관 서지정보(SEOJI) API (`nl.go.kr/seoji/SearchApi.do`), `title` 파라미터로 제목 검색.

ISBN 필드: 응답의 `EA_ISBN` 필드가 `"ISBN13 ISBN13"` 형식으로 여러 값을 포함할 수 있어 space split 후 첫 번째 값 사용. 페이지 수는 `PAGE` 필드(예: `"312 p."`)에서 숫자만 추출.

---

## Server Actions

API Route가 아닌 Next.js Server Action으로 구현된 DB 조작.

### 독서 (`app/dashboard/books/actions.ts`)

| 함수 | 설명 |
|------|------|
| `addBook(formData)` | 책 추가. `revalidatePath` 호출 |
| `updateProgress(bookId, currentPage)` | 현재 페이지 업데이트 |
| `deleteBook(bookId)` | 책 삭제 |

### 등산 (`app/dashboard/hikes/actions.ts`)

| 함수 | 설명 |
|------|------|
| `addHike(formData)` | 등산 기록 추가 |
| `deleteHike(hikeId)` | 등산 기록 삭제 |

모든 Server Action은 `'use server'` 지시어 포함, 내부에서 Supabase 서버 클라이언트로 유저 인증 확인 후 실행.
