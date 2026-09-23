'use client'

import { useState } from 'react'
import { X, BookOpen, Footprints, Mountain, TrendingUp, Link2, Check, RefreshCw, ExternalLink } from 'lucide-react'
import { updateNickname, updateShareEnabled, regenerateShareSlug } from '@/app/dashboard/account-actions'
import Modal from '@/components/ui/Modal'
import StatCard from '@/components/dashboard/StatCard'
import VisibilityModal, { type VisibilityBook } from '@/components/dashboard/VisibilityModal'
import { 문구 } from '@/lib/copy'

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
  shareEnabled,
  visibilityBooks,
  onClose,
}: {
  nickname: string
  stats: ProfileStats
  shareSlug: string | null
  shareEnabled: boolean
  visibilityBooks: VisibilityBook[]
  onClose: () => void
}) {
  const [name, setName] = useState(nickname)
  const [draft, setDraft] = useState(nickname)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [slug, setSlug] = useState(shareSlug)
  // 공개 여부는 slug 유무가 아니라 이 값이다 — 꺼도 slug는 남아 있다.
  const [enabled, setEnabled] = useState(shareEnabled)
  const [shareBusy, setShareBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  // "링크 새로 만들기"는 되돌릴 수 없어서 한 번 더 묻는다
  const [confirmingNewLink, setConfirmingNewLink] = useState(false)
  const [visibilityOpen, setVisibilityOpen] = useState(false)
  // 켜기 직전 확인 — 새 책은 기본이 '공개'라 토글 한 번에 제목이 전부 열린다
  const [confirmingEnable, setConfirmingEnable] = useState(false)

  // 켜면 방문자에게 어떻게 보일지. visibilityBooks는 "숨길 산 고르기"에서 저장하면
  // router.refresh로 새로 내려오므로, 확인 창을 열어둔 채 정리하고 와도 숫자가 맞는다.
  const counts = {
    public: visibilityBooks.filter((b) => b.visibility === 'public').length,
    quiz: visibilityBooks.filter((b) => b.visibility === 'quiz').length,
    private: visibilityBooks.filter((b) => b.visibility === 'private').length,
  }

  const shareUrl = slug && typeof window !== 'undefined' ? `${window.location.origin}/trail/${slug}` : ''

  // 공개 토글. 끄면 링크가 즉시 404가 되지만 주소 자체는 남아서, 다시 켜면 같은
  // 링크로 돌아온다. "잠깐 내려두기"라서 되돌릴 수 있어야 한다.
  async function handleToggleShare() {
    if (shareBusy) return
    // 켜는 쪽이고 제목이 그대로 보일 산이 있으면, 바로 켜지 않고 한 번 보여준다.
    // (끄는 쪽은 언제나 즉시 — 내려두는 데 망설일 이유가 없다)
    if (!enabled && counts.public > 0 && !confirmingEnable) {
      setConfirmingEnable(true)
      return
    }
    await setShare(!enabled)
  }

  async function setShare(next: boolean) {
    if (shareBusy) return
    setShareBusy(true)
    const res = await updateShareEnabled(next)
    if (!res.error) {
      setEnabled(next)
      setSlug(res.slug)
      setConfirmingNewLink(false)
      setConfirmingEnable(false)
    }
    setShareBusy(false)
  }

  // 링크 새로 만들기 — 지금 주소를 버리고 새로 받는다. 되돌릴 수 없다.
  async function handleRegenerate() {
    if (shareBusy) return
    setShareBusy(true)
    const res = await regenerateShareSlug()
    if (!res.error) {
      setSlug(res.slug)
      setEnabled(true)
      setCopied(false)
    }
    setConfirmingNewLink(false)
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
        <h3 className="font-semibold text-gray-900">{문구.산책자증표.제목}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
          <X size={18} />
        </button>
      </div>

      <label className="block text-xs text-gray-500 mb-1">{문구.산책자증표.닉네임_라벨}</label>
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
          {saved ? 문구.공통.저장됨 : saving ? 문구.공통.저장중 : 문구.공통.저장}
        </button>
      </div>

      <div className="border-t border-gray-100 pt-3 mb-4 text-xs text-gray-500 space-y-1.5">
        <div className="flex justify-between">
          <span>{문구.산책자증표.시작일}</span>
          <span className="text-gray-700">{formatDate(stats.createdAt)}</span>
        </div>
        <div className="flex justify-between">
          <span>{문구.산책자증표.최근산책일}</span>
          <span className="text-gray-700">{formatDate(stats.lastActiveAt)}</span>
        </div>
      </div>

      {/* 공개 지형도 링크 — 기본은 꺼짐. 켜는 건 항상 명시적 행동이어야 한다. */}
      <div className="border-t border-gray-100 pt-3 mb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-700">{문구.산책자증표.공개_토글}</p>
            <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
              {문구.산책자증표.공개_설명}
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggleShare}
            disabled={shareBusy}
            role="switch"
            aria-checked={enabled}
            aria-label={문구.산책자증표.공개_토글}
            className={`shrink-0 mt-0.5 w-10 h-6 rounded-full transition-colors disabled:opacity-40 ${
              enabled ? 'bg-gray-900' : 'bg-gray-200'
            }`}
          >
            <span
              className={`block w-4 h-4 rounded-full bg-white shadow transition-transform ${
                enabled ? 'translate-x-5' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {confirmingEnable && !enabled ? (
          <div className="mt-2.5 rounded-lg bg-gray-50 border border-gray-200 px-2.5 py-2">
            <p className="text-[11px] text-gray-700 font-medium">{문구.산책자증표.켜기확인_제목}</p>
            <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
              {문구.산책자증표.켜기확인_공개(counts.public)}
              {counts.quiz > 0 && 문구.산책자증표.켜기확인_맞춰보세요(counts.quiz)}
              {counts.private > 0 && 문구.산책자증표.켜기확인_비공개(counts.private)}
            </p>
            <div className="flex gap-1.5 mt-2">
              <button
                type="button"
                onClick={() => setVisibilityOpen(true)}
                className="flex-1 text-[11px] py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-white transition-colors"
              >
                {문구.산책자증표.켜기확인_먼저고르기}
              </button>
              <button
                type="button"
                onClick={() => setShare(true)}
                disabled={shareBusy}
                className="flex-1 text-[11px] py-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors disabled:opacity-40"
              >
                {shareBusy ? 문구.산책자증표.켜는중 : 문구.산책자증표.켜기확인_켜기}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setVisibilityOpen(true)}
            className="mt-2.5 w-full rounded-xl border border-gray-200 py-2 text-[11px] text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {문구.산책자증표.숨길산고르기}
          </button>
        )}

        {enabled && slug && (
          <>
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
                {copied ? 문구.산책자증표.복사됨 : 문구.산책자증표.복사}
              </button>
              {/* 놀러 온 사람이 보는 화면 그대로 — 가린 산이 정말 가려졌는지 직접 확인한다.
                  (여기서 맞혀본 답은 방명록에 안 남는다: guess-actions.ts) */}
              <a
                href={`/trail/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
              >
                <ExternalLink size={12} />
                {문구.산책자증표.열어보기}
              </a>
            </div>

            {/* 토글은 잠깐 내려두는 것(되돌릴 수 있음), 이쪽은 링크를 버리는 것
                (되돌릴 수 없음). 의도가 달라서 버튼을 나눠 뒀다. */}
            {confirmingNewLink ? (
              <div className="mt-2 rounded-lg bg-gray-50 border border-gray-200 px-2.5 py-2">
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  {문구.산책자증표.새링크_경고}
                </p>
                <div className="flex gap-1.5 mt-2">
                  <button
                    type="button"
                    onClick={() => setConfirmingNewLink(false)}
                    className="flex-1 text-[11px] py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-white transition-colors"
                  >
                    {문구.산책자증표.새링크_그대로}
                  </button>
                  <button
                    type="button"
                    onClick={handleRegenerate}
                    disabled={shareBusy}
                    className="flex-1 text-[11px] py-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors disabled:opacity-40"
                  >
                    {shareBusy ? 문구.산책자증표.새링크_만드는중 : 문구.산책자증표.새링크_만들기}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingNewLink(true)}
                className="mt-1.5 flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
              >
                <RefreshCw size={11} />
                {문구.산책자증표.새링크}
              </button>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <StatCard label={문구.산책자증표.통계.내가산책} value={stats.myBooksCount} icon={BookOpen} color="text-blue-400" bg="bg-blue-950/40" />
        <StatCard label={문구.산책자증표.통계.발걸음수} value={stats.stepsWalked.toLocaleString()} icon={Footprints} color="text-purple-400" bg="bg-purple-950/40" />
        <StatCard label={문구.산책자증표.통계.완등기록} value={stats.completedCount} icon={Mountain} color="text-green-400" bg="bg-green-950/40" />
        <StatCard label={문구.산책자증표.통계.완등거리} value={`${stats.completedKm.toFixed(1)}km`} icon={TrendingUp} color="text-purple-400" bg="bg-purple-950/40" />
      </div>
      {visibilityOpen && (
        <VisibilityModal books={visibilityBooks} onClose={() => setVisibilityOpen(false)} />
      )}
    </Modal>
  )
}
