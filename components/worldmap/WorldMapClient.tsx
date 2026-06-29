'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import WorldMap, { type WorldMapBook } from './WorldMap'
import ProgressModal from './ProgressModal'

export default function WorldMapClient({ books }: { books: WorldMapBook[] }) {
  const [selectedBook, setSelectedBook] = useState<WorldMapBook | null>(null)
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
      <WorldMap books={books} onBookClick={handleBookClick} />
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
