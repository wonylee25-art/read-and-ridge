'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import WorldMap, { type WorldMapBook } from './WorldMap'
import ProgressModal from './ProgressModal'
import AddBookBar from '@/components/books/AddBookBar'

export default function WorldMapClient({ books }: { books: WorldMapBook[] }) {
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

  return (
    <>
      {/* 눈에 띄는 책 추가 버튼 — 닫혀 있을 땐 버튼만, 열리면 검색/스캔 폼 + 왼쪽 설명문으로 확장.
          해/별을 눌러도(onAddBook) 같은 상태를 열어서 동일한 폼이 뜸.
          바 자체(버튼/폼/설명문)는 AddBookBar로 공용화 — 완등기록 페이지에서도 재사용. */}
      <AddBookBar open={addOpen} onOpenChange={setAddOpen} />

      <WorldMap books={books} onBookClick={handleBookClick} onAddBook={() => setAddOpen(true)} />
      {selectedBook && (
        <ProgressModal
          book={selectedBook}
          onClose={() => setSelectedBook(null)}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}
