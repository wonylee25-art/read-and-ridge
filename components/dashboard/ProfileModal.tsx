'use client'

import { useState } from 'react'
import { X, BookOpen, Footprints, Mountain, TrendingUp } from 'lucide-react'
import { updateNickname } from '@/app/dashboard/account-actions'
import Modal from '@/components/ui/Modal'
import StatCard from '@/components/dashboard/StatCard'

export type ProfileStats = {
  createdAt: string
  lastActiveAt: string | null
  myBooksCount: number
  stepsWalked: number
  completedCount: number
  completedKm: number
}

// ISO 문자열 → YYYY.MM.DD (design-style.md의 날짜 표기 규칙과 통일)
function formatDate(iso: string | null) {
  if (!iso) return '-'
  return iso.slice(0, 10).replaceAll('-', '.')
}

export default function ProfileModal({
  nickname,
  stats,
  onClose,
}: {
  nickname: string
  stats: ProfileStats
  onClose: () => void
}) {
  const [name, setName] = useState(nickname)
  const [draft, setDraft] = useState(nickname)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    const trimmed = draft.trim()
    if (!trimmed || trimmed === name) return
    setSaving(true)
    const result = await updateNickname(trimmed)
    setSaving(false)
    if (!result?.error) {
      setName(trimmed)
      setDraft(trimmed)
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">산책자 증표</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
          <X size={18} />
        </button>
      </div>

      <label className="block text-xs text-gray-500 mb-1">닉네임</label>
      <div className="flex gap-1.5 mb-4">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          className="flex-1 min-w-0 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        <button
          onClick={handleSave}
          disabled={saving || !draft.trim() || draft.trim() === name}
          className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-40 shrink-0"
        >
          {saved ? '저장됨 ✓' : saving ? '저장 중' : '저장'}
        </button>
      </div>

      <div className="border-t border-gray-100 pt-3 mb-4 text-xs text-gray-500 space-y-1.5">
        <div className="flex justify-between">
          <span>산책 시작일</span>
          <span className="text-gray-700">{formatDate(stats.createdAt)}</span>
        </div>
        <div className="flex justify-between">
          <span>최근 산책일</span>
          <span className="text-gray-700">{formatDate(stats.lastActiveAt)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <StatCard label="내가 산 책" value={stats.myBooksCount} icon={BookOpen} color="text-blue-400" bg="bg-blue-950/40" />
        <StatCard label="발걸음 수" value={stats.stepsWalked.toLocaleString()} icon={Footprints} color="text-purple-400" bg="bg-purple-950/40" />
        <StatCard label="완등기록" value={stats.completedCount} icon={Mountain} color="text-green-400" bg="bg-green-950/40" />
        <StatCard label="완등거리" value={`${stats.completedKm.toFixed(1)}km`} icon={TrendingUp} color="text-purple-400" bg="bg-purple-950/40" />
      </div>
    </Modal>
  )
}
