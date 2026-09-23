'use client'

import { useState, useCallback, useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import WorldMap, { type WorldMapBook } from './WorldMap'
import ProgressModal from './ProgressModal'
import AddBookBar from '@/components/books/AddBookBar'
import { signInWithGoogle } from '@/lib/auth/signInWithGoogle'
import { ADD_BOOK_NEXT } from '@/lib/auth/next'

export default function WorldMapClient({
  books,
  authenticated = true,
  nickname,
  initialAddOpen = false,
}: {
  books: WorldMapBook[]
  // 비로그인(예시 지형도) 상태 — 산 클릭으로 게이지를 만져볼 순 있지만
  // 저장하려 하거나 책을 추가하려 하면 구글 로그인으로 유도한다.
  authenticated?: boolean
  nickname?: string // WorldMap PNG 캡처(정상 인증샷/완독 맵) 워터마크용
  // 책을 추가하려다 로그인하고 돌아온 경우(?add=1) — 하던 일을 이어서 하도록 창을 열어둔다
  initialAddOpen?: boolean
}) {
  const [selectedBook, setSelectedBook] = useState<WorldMapBook | null>(null)
  const [addOpen, setAddOpen] = useState(initialAddOpen)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // add=1은 한 번 열고 나면 주소에서 걷어낸다 — 남겨두면 새로고침할 때마다 창이 다시 열린다.
  // (from 같은 다른 값은 그대로 둔다)
  useEffect(() => {
    if (searchParams.get('add') !== '1') return
    const rest = new URLSearchParams(searchParams.toString())
    rest.delete('add')
    const query = rest.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [searchParams, pathname, router])

  const handleBookClick = useCallback((book: WorldMapBook) => {
    if (book.status === 'reading') setSelectedBook(book)
  }, [])

  function handleSaved() {
    // 모달은 닫지 않고 페이지 데이터만 백그라운드 갱신
    router.refresh()
  }

  // 하늘 우측 상단 해/별(책 추가 버튼) — 비로그인이면 폼을 열지 않고 바로 로그인 유도
  function handleAddBookTrigger() {
    if (!authenticated) {
      signInWithGoogle(ADD_BOOK_NEXT)
      return
    }
    setAddOpen(true)
  }

  return (
    <>
      {/* 눈에 띄는 책 추가 버튼 — 닫혀 있을 땐 버튼만, 열리면 검색/스캔 폼 + 왼쪽 설명문으로 확장.
          해/별을 눌러도(onAddBook) 같은 상태를 열어서 동일한 폼이 뜸.
          바 자체(버튼/폼/설명문)는 AddBookBar로 공용화 — 완등기록 페이지에서도 재사용. */}
      <AddBookBar open={addOpen} onOpenChange={setAddOpen} authenticated={authenticated} />

      <WorldMap books={books} onBookClick={handleBookClick} onAddBook={handleAddBookTrigger} demo={!authenticated} nickname={nickname} />
      {selectedBook && (
        <ProgressModal
          book={selectedBook}
          onClose={() => setSelectedBook(null)}
          onSaved={handleSaved}
          authenticated={authenticated}
        />
      )}
    </>
  )
}
