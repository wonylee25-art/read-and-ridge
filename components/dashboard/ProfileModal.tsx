'use client'

import { useState } from 'react'
import { X, BookOpen, Footprints, Mountain, TrendingUp, Link2, Check } from 'lucide-react'
import { updateNickname, updateShareEnabled } from '@/app/dashboard/account-actions'
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
  shareSlug,
  onClose,
}: {
  nickname: string
  stats: ProfileStats
  shareSlug: string | null
  onClose: () => void
}) {
  const [name, setName] = useState(nickname)
  const [draft, setDraft] = useState(nickname)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [slug, setSlug] = useState(shareSlug)
  const [shareBusy, setShareBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const shareUrl = slug && typeof window !== 'undefined' ? `${window.location.origin}/trail/${slug}` : ''

  // 공개 토글. 끄면 slug가 지워져 기존 링크가 즉시 404가 된다.
  // 다시 켤 때 예전 slug가 남아 있으면 그대로 재사용한다 — 한 번 공유한 링크가
  // 토글 한 번에 영영 죽으면 곤란하기 때문(updateShareEnabled 주석 참고).
  async function handleToggleShare() {
    if (shareBusy) return
    setShareBusy(true)
    const res = await updateShareEnabled(!slug)
    if (!res.error) setSlug(res.slug)
    setShareBusy(false)
  }

  async function handleCopy() {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // 클립보드 권한이 없는 브라우저 — 주소가 화면에 그대로 보이므로 직접 복사하면 된다
    }
  }

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

      {/* 공개 지형도 링크 — 기본은 꺼짐. 켜는 건 항상 명시적 행동이어야 한다. */}
      <div className="border-t border-gray-100 pt-3 mb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-700">내 지형도 공개하기</p>
            <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
              링크를 아는 사람이면 로그인 없이 볼 수 있어요. 메모는 공개되지 않고,
              책별로 비공개·맞춰보세요를 따로 정할 수 있어요.
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggleShare}
            disabled={shareBusy}
            role="switch"
            aria-checked={!!slug}
            aria-label="내 지형도 공개하기"
            className={`shrink-0 mt-0.5 w-10 h-6 rounded-full transition-colors disabled:opacity-40 ${
              slug ? 'bg-gray-900' : 'bg-gray-200'
            }`}
          >
            <span
              className={`block w-4 h-4 rounded-full bg-white shadow transition-transform ${
                slug ? 'translate-x-5' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {slug && (
          <div className="mt-2.5 flex items-center gap-2">
            <code className="flex-1 min-w-0 truncate text-[11px] text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
              {shareUrl || `/trail/${slug}`}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
            >
              {copied ? <Check size={12} /> : <Link2 size={12} />}
              {copied ? '복사됨' : '복사'}
            </button>
          </div>
        )}
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
