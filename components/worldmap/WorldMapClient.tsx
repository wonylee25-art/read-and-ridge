'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import WorldMap, { type WorldMapBook } from './WorldMap'
import ProgressModal from './ProgressModal'
import AddBookBar from '@/components/books/AddBookBar'
import { signInWithGoogle } from '@/lib/auth/signInWithGoogle'

export default function WorldMapClient({
  books,
  authenticated = true,
}: {
  books: WorldMapBook[]
  // 비로그인(예시 지형도) 상태 — 산 클릭으로 게이지를 만져볼 순 있지만
  // 저장하려 하거나 책을 추가하려 하면 구글 로그인으로 유도한다.
  authenticated?: boolean
}) {
  const [selectedBook, setSelectedBook] = useState<WorldMapBook | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const router = useRouter()

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
      signInWithGoogle()
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

      <WorldMap books={books} onBookClick={handleBookClick} onAddBook={handleAddBookTrigger} />
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
