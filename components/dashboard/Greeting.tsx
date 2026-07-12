'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { updateNickname } from '@/app/dashboard/account-actions'

// 산책기록(/dashboard)에서만 [책 추가] 버튼 위에 표시되는 인사말.
// WorldMap의 하늘 시간대 구간(design-style.md 기준: 새벽 0~6 / 주간 6~16 /
// 황혼 16~19 / 야간 19~24)과 동일한 기준으로 문구를 바꿔, 앱 안의 시간 감각과
// 어긋나지 않게 함. 접속할 때 한 번만 계산하면 충분해서 매분 갱신하는 타이머는
// 두지 않음(WorldMap 하늘과 달리 텍스트라 실시간 정확도가 중요하지 않음).
function getGreeting(hour: number, name: string) {
  if (hour < 6) return `${name}님, 이 새벽에도 와주셨네요`
  if (hour < 16) return `${name}님, 안녕하세요`
  if (hour < 19) return `${name}님, 노을이 예뻐요`
  return `${name}님, 오늘 하루도 고생하셨어요`
}

export default function Greeting({ nickname }: { nickname: string }) {
  const [name, setName] = useState(nickname)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(nickname)
  const [saving, setSaving] = useState(false)

  function openEdit() {
    setDraft(name)
    setEditing(true)
  }

  function cancelEdit() {
    setDraft(name)
    setEditing(false)
  }

  async function handleSave() {
    const trimmed = draft.trim()
    if (!trimmed) return
    setSaving(true)
    const result = await updateNickname(trimmed)
    setSaving(false)
    if (!result?.error) {
      setName(trimmed)
      setEditing(false)
    }
  }

  // 마운트 시점(=페이지를 연 시점) 기준 1회 계산. 브라우저 로컬 시각 사용 —
  // WorldMap 하늘 색상도 동일하게 클라이언트 로컬 시각 기준으로 동작함.
  const [hour] = useState(() => new Date().getHours())

  return (
    <div className="flex justify-end mb-2">
      {editing ? (
        <div className="flex items-center gap-1.5">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
              if (e.key === 'Escape') cancelEdit()
            }}
            placeholder="닉네임"
            className="w-28 text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-40"
          >
            {saving ? '저장 중' : '저장'}
          </button>
          <button
            onClick={cancelEdit}
            disabled={saving}
            className="text-xs px-2 py-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40"
          >
            취소
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <span>{getGreeting(hour, name)}</span>
          <button
            onClick={openEdit}
            className="text-gray-300 hover:text-gray-500 transition-colors shrink-0"
            title="닉네임 수정"
            aria-label="닉네임 수정"
          >
            <Pencil size={11} />
          </button>
        </div>
      )}
    </div>
  )
}
