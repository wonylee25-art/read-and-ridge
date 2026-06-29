'use client'

import { useState } from 'react'
import { updateProgress, changeStatus, deleteBook, saveMemo } from '@/app/dashboard/books/actions'
import { Trash2, CheckCircle, StickyNote } from 'lucide-react'

type Book = {
  id: string
  title: string
  author: string | null
  total_pages: number | null
  current_page: number
  status: string
  started_at: string | null
  memo: string | null
}

const STATUS_OPTIONS = [
  { value: 'reading',   label: '읽는 중' },
  { value: 'paused',    label: '잠시 멈춤' },
  { value: 'completed', label: '완독' },
]

const statusColor: Record<string, string> = {
  reading:   'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  paused:    'bg-gray-100 text-gray-500',
}

export default function BookCard({ book }: { book: Book }) {
  const [page, setPage] = useState(book.current_page)
  const [status, setStatus] = useState(book.status)
  const [isUpdating, setIsUpdating] = useState(false)
  const [justCompleted, setJustCompleted] = useState(false)
  const [memoOpen, setMemoOpen] = useState(false)
  const [memo, setMemo] = useState(book.memo ?? '')
  const [memoSaving, setMemoSaving] = useState(false)
  const [memoSaved, setMemoSaved] = useState(false)

  const total = book.total_pages ?? 0
  const progress = total > 0 ? Math.min(Math.round((page / total) * 100), 100) : 0

  async function handleUpdateProgress() {
    if (!book.total_pages) return
    setIsUpdating(true)
    await updateProgress(book.id, page)

    // 완독 자동 전환 감지
    if (page >= book.total_pages) {
      setStatus('completed')
      setJustCompleted(true)
      setTimeout(() => setJustCompleted(false), 3000)
    }
    setIsUpdating(false)
  }

  async function handleMemoSave() {
    setMemoSaving(true)
    await saveMemo(book.id, memo)
    setMemoSaving(false)
    setMemoSaved(true)
    setTimeout(() => setMemoSaved(false), 2000)
  }

  async function handleStatusChange(newStatus: string) {
    setStatus(newStatus)
    if (newStatus === 'completed' && book.total_pages) {
      setPage(book.total_pages)
    }
    await changeStatus(book.id, newStatus)
  }

  return (
    <div className={`bg-white border rounded-2xl p-5 shadow-sm transition-all ${
      justCompleted ? 'border-green-300 shadow-green-100' : 'border-gray-100 hover:shadow-md'
    }`}>

      {/* 완독 축하 메시지 */}
      {justCompleted && (
        <div className="flex items-center gap-1.5 text-green-600 text-xs font-medium mb-3 bg-green-50 rounded-lg px-3 py-2">
          <CheckCircle size={13} />
          완독 완료! 🎉
        </div>
      )}

      {/* 상단: 제목 + 컨트롤 */}
      <div className="flex justify-between items-start mb-3 gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 truncate">{book.title}</h4>
          {book.author && <p className="text-xs text-gray-400 mt-0.5">{book.author}</p>}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* 상태 변경 드롭다운 */}
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className={`text-xs px-2 py-0.5 rounded-full font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-200 ${statusColor[status]}`}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* 메모 토글 */}
          <button
            onClick={() => setMemoOpen((v) => !v)}
            className={`transition-colors ${memo ? 'text-amber-400' : 'text-gray-300 hover:text-amber-400'}`}
            title="메모"
          >
            <StickyNote size={14} />
          </button>

          {/* 삭제 */}
          <form action={() => deleteBook(book.id)}>
            <button type="submit" className="text-gray-300 hover:text-red-400 transition-colors">
              <Trash2 size={14} />
            </button>
          </form>
        </div>
      </div>

      {/* 진행률 바 */}
      {book.total_pages && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>{page} / {book.total_pages} 페이지</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                status === 'completed' ? 'bg-green-400' :
                status === 'paused'    ? 'bg-gray-300' :
                'bg-blue-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* 페이지 업데이트 — 완독이 아닐 때 */}
      {book.total_pages && status !== 'completed' && (
        <div className="flex items-center gap-2 mt-3">
          <input
            type="number"
            min={0}
            max={book.total_pages}
            value={page}
            onChange={(e) => setPage(Number(e.target.value))}
            onKeyDown={(e) => e.key === 'Enter' && handleUpdateProgress()}
            className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          <button
            onClick={handleUpdateProgress}
            disabled={isUpdating}
            className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-40"
          >
            {isUpdating ? '저장 중...' : '업데이트'}
          </button>
        </div>
      )}

      {book.started_at && (
        <p className="text-xs text-gray-300 mt-3">시작: {book.started_at}</p>
      )}

      {/* 메모 영역 */}
      {memoOpen && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleMemoSave()
            }}
            placeholder="메모를 입력하세요… (⌘+Enter로 저장)"
            rows={3}
            className="w-full text-xs text-gray-700 border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-amber-200 placeholder-gray-300"
          />
          <div className="flex items-center justify-end gap-2 mt-1.5">
            {memoSaved && (
              <span className="text-xs text-green-500">저장됨 ✓</span>
            )}
            <button
              onClick={handleMemoSave}
              disabled={memoSaving}
              className="text-xs px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition-colors disabled:opacity-40"
            >
              {memoSaving ? '저장 중…' : '저장'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
