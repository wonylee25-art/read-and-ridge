import { NextRequest, NextResponse } from 'next/server'

// 국립중앙도서관 서지정보(SEOJI) API 응답 문서 형태 (필요한 필드만)
interface NLBookDoc {
  TITLE?: string
  AUTHOR?: string
  PUBLISHER?: string
  EA_ISBN?: string
  PAGE?: string
  TITLE_URL?: string
  PUBLISH_PREDATE?: string
}

// Open Library 저자 객체 형태
interface OpenLibraryAuthor {
  name?: string
}

// "312 p." 같은 형식에서 페이지 숫자만 추출
function parsePageCount(page?: string): number | null {
  if (!page) return null
  const match = page.match(/\d+/)
  return match ? Number(match[0]) : null
}

// 서지정보 API 응답에서 결과 배열 추출 (정상 응답은 docs 필드에 배열이 담김)
function extractDocs(data: unknown): NLBookDoc[] {
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    if (Array.isArray(obj.docs)) return obj.docs as NLBookDoc[]
    const firstArray = Object.values(obj).find((v) => Array.isArray(v))
    if (firstArray) return firstArray as NLBookDoc[]
  }
  return []
}

// 국립중앙도서관 서지정보(SEOJI) API — ISBN 또는 제목으로 검색
async function fetchNL(params: { isbn?: string; title?: string }, size = 10) {
  const key = process.env.NL_API_KEY?.trim()
  if (!key) return []

  const search = new URLSearchParams({
    cert_key: key,
    result_style: 'json',
    page_no: '1',
    page_size: String(size),
  })
  if (params.isbn) search.set('isbn', params.isbn)
  if (params.title) search.set('title', params.title)

  try {
    const res = await fetch(
      `https://www.nl.go.kr/seoji/SearchApi.do?${search}`,
      {
        // 일부 공공 API는 브라우저가 아닌 요청(User-Agent 없음)을 차단하거나
        // 다르게 처리하는 경우가 있어 명시적으로 지정한다.
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'application/json',
        },
        cache: 'no-store',
      }
    )

    if (!res.ok) {
      console.error('[NL API] HTTP', res.status, await res.text().catch(() => '(no body)'))
      return []
    }

    const raw = await res.text()
    let data: unknown
    try {
      data = JSON.parse(raw)
    } catch (e) {
      console.error('[NL API] JSON 파싱 실패:', e, '| 원본 응답:', raw.slice(0, 500))
      return []
    }

    if ((data as { RESULT?: string })?.RESULT === 'ERROR') {
      console.error('[NL API] RESULT ERROR:', JSON.stringify(data))
      return []
    }

    return extractDocs(data).map((d: NLBookDoc) => ({
      title: d.TITLE ?? '',
      authors: d.AUTHOR ?? '',
      publisher: d.PUBLISHER ?? '',
      isbn: d.EA_ISBN?.split(' ')[0] ?? '',
      thumbnail: d.TITLE_URL ?? '',
      datetime: d.PUBLISH_PREDATE?.slice(0, 4) ?? '',
      total_pages: parsePageCount(d.PAGE),
    }))
  } catch (e) {
    console.error('[NL API] fetch 자체가 실패함 (네트워크/DNS/TLS 등):', e)
    return []
  }
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
    // 1순위: 국립중앙도서관 서지정보에서 ISBN으로 검색 (한국 도서 커버리지 우수)
    const nlResults = await fetchNL({ isbn }, 1)

    if (nlResults.length > 0) {
      const book = nlResults[0]

      // 서지정보에 페이지 수가 없으면 Open Library에서 보완
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
    const documents = await fetchNL({ title: query }, 10)
    return NextResponse.json({ documents })
  }

  return NextResponse.json({ documents: [] })
}
