'use client'

// 책별 공개 범위를 한 화면에서 한 번에 정리하는 모달.
//
// 책 카드의 아이콘 순환(공개 → 맞춰보세요 → 비공개)은 한두 권 고칠 때는 편하지만,
// 공유를 켜기 직전에 "숨길 것부터 전부 정리"하려면 카드를 하나씩 찾아 눌러야 해서
// 번거롭다. 그 흐름을 위한 화면이라 "산책자 증표"의 공개 토글 바로 아래에 둔다.
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Globe, HelpCircle, Lock } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { updateVisibilityBulk } from '@/app/dashboard/books/actions'

export type Visibility = 'public' | 'quiz' | 'private'

export type VisibilityBook = {
  id: string
  title: string
  visibility: Visibility
}

const OPTIONS: { value: Visibility; label: string; Icon: typeof Globe; active: string }[] = [
  { value: 'public', label: '공개', Icon: Globe, active: 'bg-gray-900 text-white' },
  { value: 'quiz', label: '맞춰보세요', Icon: HelpCircle, active: 'bg-violet-600 text-white' },
  { value: 'private', label: '비공개', Icon: Lock, active: 'bg-gray-600 text-white' },
]

export default function VisibilityModal({
  books,
  onClose,
}: {
  books: VisibilityBook[]
  onClose: () => void
}) {
  const router = useRouter()
  const [draft, setDraft] = useState<Record<string, Visibility>>(
    () => Object.fromEntries(books.map((b) => [b.id, b.visibility]))
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)

  // 실제로 바뀐 것만 서버로 보낸다
  const changed = useMemo(
    () => books.filter((b) => draft[b.id] !== b.visibility).map((b) => ({ id: b.id, visibility: draft[b.id] })),
    [books, draft]
  )

  function setAll(visibility: Visibility) {
    setDraft(Object.fromEntries(books.map((b) => [b.id, visibility])))
  }

  async function handleSave() {
    if (!changed.length || saving) return
    setSaving(true)
    setError(false)
    const res = await updateVisibilityBulk(changed)
    setSaving(false)
    if (res.error) {
      setError(true)
      return
    }
    router.refresh() // 책 카드의 아이콘도 같이 갱신되도록
    onClose()
  }

  return (
    <Modal onClose={onClose} maxWidth="max-w-md">
      <h2 className="text-lg font-bold text-gray-900">책별 공개 범위</h2>
      <p className="text-xs text-gray-500 mt-1 leading-relaxed">
        공유 링크에서 각 책을 어떻게 보여줄지 정합니다. 비공개로 둔 책은 지도에서 빠지지만
        내 기록과 누적 숫자에는 그대로 남아요.
      </p>

      <div className="flex items-center gap-1.5 mt-3">
        <span className="text-[11px] text-gray-400 mr-0.5">전체를</span>
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setAll(opt.value)}
            className="text-[11px] px-2 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="mt-3 max-h-72 overflow-y-auto -mx-1 px-1 divide-y divide-gray-100">
        {books.length === 0 && (
          <p className="text-xs text-gray-400 py-6 text-center">아직 등록한 책이 없어요.</p>
        )}
        {books.map((book) => (
          <div key={book.id} className="py-2.5">
            <p className="text-xs text-gray-700 truncate mb-1.5">{book.title}</p>
            <div className="flex gap-1">
              {OPTIONS.map((opt) => {
                const on = draft[book.id] === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, [book.id]: opt.value }))}
                    aria-pressed={on}
                    className={`flex-1 flex items-center justify-center gap-1 text-[11px] py-1.5 rounded-lg transition-colors ${
                      on ? opt.active : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                    }`}
                  >
                    <opt.Icon size={11} />
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <p className="text-xs text-red-500 mt-2">저장하지 못했어요. 잠시 후 다시 시도해주세요.</p>
      )}

      <div className="flex gap-2 mt-4">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-xl border border-gray-300 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          닫기
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!changed.length || saving}
          className="flex-1 rounded-xl bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-40"
        >
          {saving ? '저장 중…' : changed.length ? `${changed.length}권 저장` : '변경 없음'}
        </button>
      </div>
    </Modal>
  )
}
