'use client'

import { useEffect, useRef, useState } from 'react'
import { updateProgress, changeStatus, deleteBook, saveMemo, updateOwned, updateAuthor, updateTitle, updateTotalPages } from '@/app/dashboard/books/actions'
import { Trash2, CheckCircle, StickyNote, Home, Pencil } from 'lucide-react'
import { formatAuthor } from '@/lib/formatAuthor'
import DeleteConfirmModal from '@/components/books/DeleteConfirmModal'

type Book = {
  id: string
  title: string
  author: string | null
  total_pages: number | null
  current_page: number
  status: string
  started_at: string | null
  memo: string | null
  owned?: boolean | null
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
  const [owned, setOwned] = useState(!!book.owned)
  const memoRef = useRef<HTMLTextAreaElement>(null)

  // 저자 인라인 수정 — 검색 결과를 안 고르고 추가한 책은 저자가 비어 저장되므로,
  // 나중에 여기서 채우거나 고칠 수 있게 함. 메모 편집(StickyNote)과는 아이콘·위치를
  // 분리해서(저자 텍스트 바로 옆의 연필 아이콘) 서로 헷갈리지 않게 함.
  const [authorValue, setAuthorValue] = useState(book.author ?? '')
  const [authorEditing, setAuthorEditing] = useState(false)
  const [authorDraft, setAuthorDraft] = useState(authorValue)
  const [authorSaving, setAuthorSaving] = useState(false)

  // 제목 인라인 수정 — 등록 시 오타가 났거나 검색 결과를 안 고르고 직접 입력한 경우
  // 나중에 고칠 수 있게 함. 저자 수정과 동일한 패턴.
  const [titleValue, setTitleValue] = useState(book.title)
  const [titleEditing, setTitleEditing] = useState(false)
  const [titleDraft, setTitleDraft] = useState(titleValue)
  const [titleSaving, setTitleSaving] = useState(false)

  // 전체 쪽수 인라인 수정 — 등록 시 자동 채워진 값(검색 결과 또는 기본 150쪽)이 실제
  // 책과 다르면 진행률이 부정확해지는데, 지금까지는 등록 후 고칠 방법이 없었음.
  const [totalPagesValue, setTotalPagesValue] = useState(book.total_pages)
  const [totalPagesEditing, setTotalPagesEditing] = useState(false)
  const [totalPagesDraft, setTotalPagesDraft] = useState(String(totalPagesValue ?? ''))
  const [totalPagesSaving, setTotalPagesSaving] = useState(false)

  // 삭제 확인 팝업 — 실수로 바로 삭제되던 걸 막기 위해 확인 단계를 추가.
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const total = totalPagesValue ?? 0
  const progress = total > 0 ? Math.min(Math.round((page / total) * 100), 100) : 0

  // 메모 텍스트영역 자동 높이 조절 — 내용이 길어지면 내부 스크롤 대신
  // 카드 자체가 커지도록, 스크롤 높이만큼 실제 높이를 늘려줌.
  function autoResizeMemo() {
    const el = memoRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  useEffect(() => {
    if (memoOpen) autoResizeMemo()
  }, [memoOpen])

  async function handleUpdateProgress() {
    if (!totalPagesValue) return
    setIsUpdating(true)
    const result = await updateProgress(book.id, page)

    // 완독 자동 전환 감지 — 서버가 판단한 justCompleted를 그대로 신뢰 (클라이언트에서
    // page >= total_pages만 보고 판단하면, 이미 완독된 책을 재저장할 때도 다시 뜸)
    if (result?.justCompleted) {
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
    // 저장 후 "저장됨 ✓"을 잠깐 보여주고 편집 영역을 자동으로 닫아
    // 하단 미리보기(이미 최신 memo 상태를 보여줌)로 돌아가게 함.
    // ⚠ 이전엔 저장해도 편집 영역이 계속 열려 있어서, 반영된 걸 보려면
    // 사용자가 직접 새로고침해야 하는 문제가 있었음.
    setTimeout(() => {
      setMemoSaved(false)
      setMemoOpen(false)
    }, 700)
  }

  async function handleAuthorSave() {
    setAuthorSaving(true)
    await updateAuthor(book.id, authorDraft)
    const saved = authorDraft.trim()
    setAuthorValue(saved)
    setAuthorDraft(saved)
    setAuthorSaving(false)
    setAuthorEditing(false)
  }

  async function handleTitleSave() {
    const trimmed = titleDraft.trim()
    if (!trimmed) return
    setTitleSaving(true)
    const result = await updateTitle(book.id, trimmed)
    if (!result?.error) {
      setTitleValue(trimmed)
      setTitleDraft(trimmed)
      setTitleEditing(false)
    }
    setTitleSaving(false)
  }

  async function handleTotalPagesSave() {
    const parsed = Number(totalPagesDraft)
    if (!Number.isFinite(parsed) || parsed < 1) return
    setTotalPagesSaving(true)
    const result = await updateTotalPages(book.id, parsed)
    if (!result?.error) {
      const applied = Math.round(parsed)
      setTotalPagesValue(applied)
      if (typeof result.currentPage === 'number') setPage(result.currentPage)
      if (result.justCompleted) {
        setStatus('completed')
        setJustCompleted(true)
        setTimeout(() => setJustCompleted(false), 3000)
      }
      setTotalPagesEditing(false)
    }
    setTotalPagesSaving(false)
  }

  async function handleDelete() {
    setDeleting(true)
    await deleteBook(book.id)
    // 성공하면 revalidatePath로 목록에서 이 카드가 사라지므로 별도 정리는 불필요.
  }

  async function handleToggleOwned() {
    const next = !owned
    setOwned(next)
    await updateOwned(book.id, next)
  }

  async function handleStatusChange(newStatus: string) {
    const wasCompleted = status === 'completed'
    setStatus(newStatus)
    if (newStatus === 'completed' && totalPagesValue) {
      setPage(totalPagesValue)
    }
    await changeStatus(book.id, newStatus)
    // 드롭다운으로 직접 "완독"을 골랐을 때도(자동 전환이 아니라 수동이어도) 축하 배너
    if (newStatus === 'completed' && !wasCompleted) {
      setJustCompleted(true)
      setTimeout(() => setJustCompleted(false), 3000)
    }
  }

  return (
    <div className={`bg-white border rounded-2xl p-5 shadow-sm transition-all mb-4 break-inside-avoid ${
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
          {titleEditing ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTitleSave()
                  if (e.key === 'Escape') { setTitleDraft(titleValue); setTitleEditing(false) }
                }}
                className="flex-1 min-w-0 font-semibold text-gray-900 text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
              <button
                onClick={handleTitleSave}
                disabled={titleSaving}
                className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-40 shrink-0"
              >
                {titleSaving ? '저장 중' : '저장'}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 min-w-0">
              <h4 className="font-semibold text-gray-900 truncate">{titleValue}</h4>
              <button
                onClick={() => { setTitleDraft(titleValue); setTitleEditing(true) }}
                className="text-gray-300 hover:text-gray-500 transition-colors shrink-0"
                title="제목 수정"
                aria-label="제목 수정"
              >
                <Pencil size={11} />
              </button>
            </div>
          )}

          {authorEditing ? (
            <div className="flex items-center gap-1.5 mt-1">
              <input
                autoFocus
                value={authorDraft}
                onChange={(e) => setAuthorDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAuthorSave()
                  if (e.key === 'Escape') { setAuthorDraft(authorValue); setAuthorEditing(false) }
                }}
                placeholder="저자 이름"
                className="flex-1 min-w-0 text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
              <button
                onClick={handleAuthorSave}
                disabled={authorSaving}
                className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-40 shrink-0"
              >
                {authorSaving ? '저장 중' : '저장'}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 mt-0.5 min-w-0">
              <p className={`text-xs truncate ${formatAuthor(authorValue) ? 'text-gray-400' : 'text-gray-300 italic'}`}>
                {formatAuthor(authorValue) ?? '저자 정보 없음'}
              </p>
              <button
                onClick={() => { setAuthorDraft(authorValue); setAuthorEditing(true) }}
                className="text-gray-300 hover:text-gray-500 transition-colors shrink-0"
                title="저자 수정"
                aria-label="저자 수정"
              >
                <Pencil size={11} />
              </button>
            </div>
          )}
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

          {/* 소장 여부 토글 */}
          <button
            onClick={handleToggleOwned}
            className={`transition-colors ${owned ? 'text-amber-500' : 'text-gray-300 hover:text-amber-400'}`}
            title={owned ? '소장 중이에요 (클릭하면 해제)' : '소장 중이 아니에요 (클릭하면 소장으로)'}
          >
            <Home size={14} />
          </button>

          {/* 메모 토글 */}
          <button
            onClick={() => setMemoOpen((v) => !v)}
            className={`transition-colors ${memo ? 'text-amber-400' : 'text-gray-300 hover:text-amber-400'}`}
            title="메모"
          >
            <StickyNote size={14} />
          </button>

          {/* 삭제 — 바로 지우지 않고 확인 팝업을 먼저 띄움 */}
          <button
            onClick={() => setConfirmingDelete(true)}
            className="text-gray-300 hover:text-red-400 transition-colors"
            title="삭제"
            aria-label="삭제"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* 진행률 바 + 전체 쪽수 수정 */}
      <div className="mb-3">
        <div className="flex justify-between items-center text-xs text-gray-400 mb-1 gap-2">
          {totalPagesEditing ? (
            <div className="flex items-center gap-1.5">
              <span>{page} /</span>
              <input
                autoFocus
                type="number"
                min={1}
                value={totalPagesDraft}
                onChange={(e) => setTotalPagesDraft(e.target.value)}
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTotalPagesSave()
                  if (e.key === 'Escape') { setTotalPagesDraft(String(totalPagesValue ?? '')); setTotalPagesEditing(false) }
                }}
                className="w-16 border border-gray-200 rounded-lg px-1.5 py-0.5 text-xs focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
              <span>페이지</span>
              <button
                onClick={handleTotalPagesSave}
                disabled={totalPagesSaving}
                className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-40"
              >
                {totalPagesSaving ? '저장 중' : '저장'}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span>{page} / {totalPagesValue ?? '미입력'}{totalPagesValue ? ' 페이지' : ''}</span>
              <button
                onClick={() => { setTotalPagesDraft(String(totalPagesValue ?? '')); setTotalPagesEditing(true) }}
                className="text-gray-300 hover:text-gray-500 transition-colors"
                title="전체 쪽수 수정"
                aria-label="전체 쪽수 수정"
              >
                <Pencil size={11} />
              </button>
            </div>
          )}
          {totalPagesValue ? <span>{progress}%</span> : null}
        </div>
        {totalPagesValue ? (
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
        ) : (
          <p className="text-xs text-gray-300 italic">전체 쪽수를 입력하면 진행률이 표시돼요</p>
        )}
      </div>

      {/* 페이지 업데이트 — 완독이 아닐 때 */}
      {totalPagesValue && status !== 'completed' && (
        <div className="flex items-center gap-2 mt-3">
          <input
            type="number"
            min={0}
            max={totalPagesValue}
            value={page}
            onChange={(e) => setPage(Number(e.target.value))}
            onFocus={(e) => e.target.select()}
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

      {/* 메모 미리보기 — 편집 중이 아닐 땐 항상 하단에 보여줌.
          최근 5권만 지도에 뜨는 완등기록에서도 메모는 이 카드로 확인 가능.
          길이 제한 없이 그대로 보여줘서, 메모가 길면 카드도 자연히 늘어남
          (whitespace-pre-wrap으로 줄바꿈도 유지) */}
      {!memoOpen && memo && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <p className="text-xs text-gray-500 whitespace-pre-wrap break-words leading-relaxed">
            {memo}
          </p>
        </div>
      )}

      {/* 메모 영역 */}
      {memoOpen && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <textarea
            ref={memoRef}
            value={memo}
            onChange={(e) => { setMemo(e.target.value); autoResizeMemo() }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleMemoSave()
            }}
            placeholder="메모를 입력하세요… (⌘+Enter로 저장)"
            rows={3}
            className="w-full text-xs text-gray-700 border border-gray-200 rounded-lg px-3 py-2 resize-none overflow-hidden focus:outline-none focus:ring-2 focus:ring-amber-200 placeholder-gray-300"
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

      {confirmingDelete && (
        <DeleteConfirmModal
          title={book.title}
          deleting={deleting}
          onClose={() => setConfirmingDelete(false)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  )
}
