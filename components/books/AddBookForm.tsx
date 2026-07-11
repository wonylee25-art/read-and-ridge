'use client'

import { useEffect, useRef, useState } from 'react'
import { addBook } from '@/app/dashboard/books/actions'
import { Plus, X, Search, BookOpen, Camera, AlertCircle } from 'lucide-react'
import dynamic from 'next/dynamic'

const BarcodeScanner = dynamic(() => import('./BarcodeScanner'), { ssr: false })

type BookInfo = {
  title: string
  authors: string
  publisher: string
  isbn?: string
  thumbnail?: string
  datetime?: string
  total_pages?: number | null
}

type Props = {
  // 외부(예: WorldMap 해/별 클릭)에서 열고 닫기를 제어하고 싶을 때 사용.
  // 안 넘기면 기존처럼 내부 상태로 알아서 동작(비제어 모드).
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export default function AddBookForm({ open: openProp, onOpenChange }: Props = {}) {
  const [openState, setOpenState] = useState(false)
  const open = openProp ?? openState
  const setOpen = onOpenChange ?? setOpenState
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<BookInfo[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<BookInfo | null>(null)
  const [authorInput, setAuthorInput] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [duplicateError, setDuplicateError] = useState<string | null>(null)
  const [shake, setShake] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 저자가 여러 명이면 문자열이 한없이 길어질 수 있어 30자로 자름 (팝업 높이 고정 유지)
  function truncateAuthors(authors: string, max = 30) {
    return authors.length > max ? authors.slice(0, max) + '...' : authors
  }

  // 제목 검색 (debounce)
  useEffect(() => {
    if (!query.trim() || selected) { setResults([]); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/books/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(data.documents ?? [])
      } finally {
        setSearching(false)
      }
    }, 400)
  }, [query, selected])

  // ISBN 스캔 결과 처리
  async function handleISBN(isbn: string) {
    setScanning(false)
    setScanError(null)
    setDuplicateError(null)
    setSearching(true)

    try {
      const res = await fetch(`/api/books/search?isbn=${isbn}`)
      if (!res.ok) {
        setScanError('책 정보를 찾지 못했어요. 제목으로 직접 검색해보세요.')
        return
      }
      const data = await res.json()
      const book: BookInfo = data.book
      setSelected(book)
      setQuery(book.title)
      setAuthorInput(truncateAuthors(book.authors ?? ''))
    } catch {
      setScanError('오류가 발생했어요. 다시 시도해주세요.')
    } finally {
      setSearching(false)
    }
  }

  function selectBook(book: BookInfo) {
    setSelected(book)
    setQuery(book.title)
    setResults([])
    setDuplicateError(null)
    setAuthorInput(truncateAuthors(book.authors ?? ''))
  }

  function reset() {
    setOpen(false)
    setSelected(null)
    setQuery('')
    setResults([])
    setScanError(null)
    setDuplicateError(null)
    setShake(false)
    setAuthorInput('')
  }

  function triggerShake() {
    setShake(true)
    setTimeout(() => setShake(false), 600)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setDuplicateError(null)
    const result = await addBook(new FormData(e.currentTarget))

    if (result?.error === 'duplicate') {
      triggerShake()
      setDuplicateError(
        `"${result.title}", 또 산 책이 됩니다!`
      )
      return
    }

    reset()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm rounded-xl hover:bg-gray-700 transition-colors"
      >
        <Plus size={16} /> 책 추가
      </button>
    )
  }

  return (
    <>
      {/* 바코드 스캐너 모달 */}
      {scanning && (
        <BarcodeScanner
          onDetected={handleISBN}
          onClose={() => setScanning(false)}
        />
      )}

      <div
        className={`bg-white border border-gray-200 rounded-2xl p-6 shadow-sm ${shake ? 'animate-shake' : ''}`}
        style={shake ? { animation: 'shake 0.5s ease-in-out' } : {}}
      >
        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            15%       { transform: translateX(-8px); }
            30%       { transform: translateX(8px); }
            45%       { transform: translateX(-6px); }
            60%       { transform: translateX(6px); }
            75%       { transform: translateX(-3px); }
            90%       { transform: translateX(3px); }
          }
        `}</style>

        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">새 책 추가</h3>
          <button onClick={reset} className="text-gray-400 hover:text-gray-700">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">

          {/* 검색 입력 + 카메라 버튼 */}
          <div className="col-span-2 relative">
            <label className="block text-xs text-gray-500 mb-1">책 검색 또는 바코드 스캔</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setSelected(null); setDuplicateError(null) }}
                  placeholder="제목으로 검색..."
                  className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
                {searching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
                )}
              </div>
              <button
                type="button"
                onClick={() => { setScanError(null); setDuplicateError(null); setScanning(true) }}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors shrink-0"
              >
                <Camera size={15} />
                스캔
              </button>
            </div>

            {/* 스캔 에러 */}
            {scanError && (
              <p className="mt-1.5 text-xs text-red-500">{scanError}</p>
            )}

            {/* 중복 에러 */}
            {duplicateError && (
              <div className="mt-2 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <AlertCircle size={13} className="shrink-0" />
                {duplicateError}
              </div>
            )}

            {/* 검색 결과 드롭다운 */}
            {results.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full max-h-72 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg">
                {results.map((book, i) => (
                  <li
                    key={i}
                    onClick={() => selectBook(book)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
                  >
                    {book.thumbnail ? (
                      <img src={book.thumbnail} alt="" className="w-8 h-11 object-cover rounded shrink-0" />
                    ) : (
                      <div className="w-8 h-11 bg-gray-100 rounded flex items-center justify-center shrink-0">
                        <BookOpen size={12} className="text-gray-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{book.title}</div>
                      <div className="text-xs text-gray-400 truncate">{book.authors} · {book.publisher}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 선택된 책 미리보기 */}
          {selected && (
            <div className="col-span-2 flex items-center gap-3 bg-gray-50 rounded-xl p-3">
              {selected.thumbnail && (
                <img src={selected.thumbnail} alt="" className="w-10 h-14 object-cover rounded shrink-0" />
              )}
              <div className="text-xs text-gray-600 min-w-0">
                <div className="font-medium text-gray-900 truncate">{selected.title}</div>
                {selected.authors && <div className="truncate">{selected.authors}</div>}
                {selected.publisher && <div className="truncate">{selected.publisher}{selected.datetime ? ` · ${selected.datetime}` : ''}</div>}
                {selected.isbn && <div className="text-gray-400">ISBN: {selected.isbn}</div>}
              </div>
            </div>
          )}

          {/* 숨겨진 필드 */}
          <input type="hidden" name="title" value={selected?.title ?? query} />
          <input type="hidden" name="isbn" value={selected?.isbn ?? ''} />

          {/* 저자 — 검색 결과를 고르면 자동으로 채워지지만, 검색에 안 걸리는 책도
              직접 입력해서 남길 수 있게 항상 편집 가능한 입력창으로 둠.
              (예전엔 숨김 필드라 검색 결과를 안 고르면 저자가 영영 비어 저장됐음) */}
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">저자</label>
            <input
              name="author"
              value={authorInput}
              onChange={(e) => setAuthorInput(e.target.value)}
              placeholder="저자 이름 (검색 결과를 고르면 자동 입력돼요)"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          {/* 총 페이지 수 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">총 페이지 수</label>
            <input
              name="total_pages"
              type="number"
              min="1"
              defaultValue={selected?.total_pages ?? ''}
              placeholder="비워두면 150쪽으로 등록돼요"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          {/* 소장 여부 */}
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                name="owned"
                type="checkbox"
                defaultChecked
                className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-2 focus:ring-gray-900"
              />
              소장 중이에요
            </label>
          </div>

          {/* 상태 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">상태</label>
            <select
              name="status"
              defaultValue="reading"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="reading">읽는 중</option>
              <option value="completed">완독</option>
              <option value="paused">잠시 멈춤</option>
            </select>
          </div>

          {/* 시작일 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">시작일</label>
            <input
              name="started_at"
              type="date"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          <div className="col-span-2 flex justify-end gap-2 mt-1">
            <button type="button" onClick={reset} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
              취소
            </button>
            <button
              type="submit"
              disabled={!selected && !query.trim()}
              className="px-4 py-2 bg-gray-900 text-white text-sm rounded-xl hover:bg-gray-700 disabled:opacity-40 transition-colors"
            >
              추가
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
