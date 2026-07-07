import { NextRequest, NextResponse } from 'next/server'

// 카카오 도서 API 응답 문서 형태 (필요한 필드만)
interface KakaoBookDoc {
  title?: string
  authors?: string[]
  publisher?: string
  isbn?: string
  thumbnail?: string
  datetime?: string
}

// Open Library 저자 객체 형태
interface OpenLibraryAuthor {
  name?: string
}

// 카카오 도서 API — ISBN 또는 제목으로 검색
async function fetchKakao(query: string, size = 10, target?: string) {
  const key = process.env.KAKAO_API_KEY
  if (!key) return []

  const params = new URLSearchParams({ query, size: String(size) })
  if (target) params.set('target', target)

  const res = await fetch(
    `https://dapi.kakao.com/v3/search/book?${params}`,
    { headers: { Authorization: `KakaoAK ${key}` } }
  )
  if (!res.ok) return []

  const data = await res.json()
  return (data.documents ?? []).map((d: KakaoBookDoc) => ({
    title: d.title,
    authors: d.authors?.join(', ') ?? '',
    publisher: d.publisher ?? '',
    isbn: d.isbn?.split(' ')[1] ?? d.isbn ?? '',   // "ISBN10 ISBN13" → ISBN13
    thumbnail: d.thumbnail ?? '',
    datetime: d.datetime?.slice(0, 4) ?? '',
    total_pages: null,
  }))
}

// Open Library — ISBN 전용 (페이지 수 확보용 폴백)
async function fetchOpenLibrary(isbn: string) {
  try {
    const res = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`,
      { next: { revalidate: 86400 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data[`ISBN:${isbn}`] ?? null
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const isbn  = req.nextUrl.searchParams.get('isbn')
  const query = req.nextUrl.searchParams.get('q')

  // ── ISBN 스캔으로 들어온 경우 ──────────────────────────────────────────
  if (isbn) {
    // 1순위: 카카오에서 ISBN으로 검색 (한국 도서 커버리지 우수)
    const kakaoResults = await fetchKakao(isbn, 1, 'isbn')

    if (kakaoResults.length > 0) {
      const book = kakaoResults[0]

      // 카카오에 페이지 수가 없으면 Open Library에서 보완
      if (!book.total_pages) {
        const ol = await fetchOpenLibrary(isbn)
        if (ol?.number_of_pages) book.total_pages = ol.number_of_pages
      }

      return NextResponse.json({ book })
    }

    // 2순위: Open Library 폴백
    const ol = await fetchOpenLibrary(isbn)
    if (ol) {
      return NextResponse.json({
        book: {
          title:       ol.title ?? '',
          authors:     ol.authors?.map((a: OpenLibraryAuthor) => a.name).join(', ') ?? '',
          publisher:   ol.publishers?.[0]?.name ?? '',
          total_pages: ol.number_of_pages ?? null,
          isbn,
        }
      })
    }

    return NextResponse.json(
      { error: '책 정보를 찾을 수 없어요' },
      { status: 404 }
    )
  }

  // ── 제목 검색으로 들어온 경우 ──────────────────────────────────────────
  if (query) {
    const documents = await fetchKakao(query, 10)
    return NextResponse.json({ documents })
  }

  return NextResponse.json({ documents: [] })
}
