'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { updateProgress } from '@/app/dashboard/books/actions'
import type { WorldMapBook } from './WorldMap'
import { signInWithGoogle } from '@/lib/auth/signInWithGoogle'

// ─── 모달 ────────────────────────────────────────────────────────────────────

type Props = {
  book: WorldMapBook
  onClose: () => void
  onSaved: () => void
  // 비로그인(예시 지형도) 상태 — 게이지를 만져보는 것 자체는 되지만,
  // 저장을 누르면 실제 저장 대신 구글 로그인으로 유도한다.
  authenticated?: boolean
}

const GAUGE_H = 220

export default function ProgressModal({ book, onClose, onSaved, authenticated = true }: Props) {
  const total = book.total_pages ?? 0
  const initPct = total > 0 ? Math.min(book.current_page / total, 1) : 0

  const [pct, setPct] = useState(initPct)
  const [page, setPage] = useState(book.current_page)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const gaugeRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const pctClamped = Math.min(Math.max(pct, 0), 1)
  const displayPct = Math.round(pctClamped * 100)
  const displayPage = total > 0 ? Math.round(pctClamped * total) : page

  // 게이지 드래그
  const calcPct = useCallback((clientY: number) => {
    const el = gaugeRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const raw = 1 - (clientY - rect.top) / rect.height
    setPct(Math.min(Math.max(raw, 0), 1))
  }, [])

  // 숫자 ↔ 게이지 동기화
  useEffect(() => {
    if (total > 0) setPage(Math.round(pctClamped * total))
  }, [pctClamped, total])

  function handlePageInput(v: string) {
    const n = Math.min(parseInt(v) || 0, total || 999999)
    setPage(n)
    if (total > 0) setPct(n / total)
  }

  useEffect(() => {
    function onMove(e: MouseEvent) { if (dragging.current) calcPct(e.clientY) }
    function onUp() { dragging.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [calcPct])

  useEffect(() => {
    function onMove(e: TouchEvent) { if (dragging.current) calcPct(e.touches[0].clientY) }
    function onUp() { dragging.current = false }
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onUp)
    return () => { window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onUp) }
  }, [calcPct])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSave() {
    if (!authenticated) {
      signInWithGoogle()
      return
    }
    setSaving(true)
    try {
      const result = await updateProgress(book.id, displayPage)
      setSaved(true)
      onSaved()
      if (result?.justCompleted) {
        // 완독 세레모니(폭죽·CLEAR·정상 댄스)는 WorldMap이 books 갱신을 감지해서
        // 그 책의 산 정상 위에 직접 그려줌 — 여기서는 그걸 바로 볼 수 있게
        // 모달만 잠깐 뒤 자동으로 닫아준다 (풀스크린 팝업으로 가리지 않기 위함)
        setTimeout(onClose, 650)
      } else {
        setTimeout(() => setSaved(false), 2000)
      }
    } finally {
      setSaving(false)
    }
  }

  const title = book.title.length > 28 ? book.title.slice(0, 27) + '…' : book.title

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="relative flex flex-col items-center gap-3 rounded-2xl select-none"
        style={{
          background: '#111a11',
          border: '2px solid #2a4428',
          padding: '28px 24px 24px',
          boxShadow: '0 8px 48px rgba(0,0,0,0.8)',
        }}
      >
        {/* 닫기 */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 font-mono text-white/30 hover:text-white/70 leading-none"
          style={{ fontSize: 18 }}
        >
          ×
        </button>

        {/* 책 제목 — 능선 위치 미리보기를 없앤 자리만큼 더 크고 넓게 */}
        <p style={{ color: '#88cc88', fontSize: 16, fontWeight: 600, fontFamily: 'monospace', letterSpacing: 0.5, maxWidth: 260, textAlign: 'center' }}>
          {title}
        </p>

        {/* % 표시 */}
        <span style={{ color: '#ccffcc', fontSize: 22, fontWeight: 700, fontFamily: 'monospace' }}>
          {displayPct}%
        </span>

        {/* 수직 게이지 */}
        <div style={{ position: 'relative' }}>
          <div
            ref={gaugeRef}
            style={{
              width: 28,
              height: GAUGE_H,
              background: '#1a2a1a',
              border: '2px solid #2a4428',
              borderRadius: 6,
              position: 'relative',
              cursor: 'ns-resize',
            }}
            onMouseDown={(e) => { dragging.current = true; calcPct(e.clientY) }}
            onTouchStart={(e) => { dragging.current = true; calcPct(e.touches[0].clientY) }}
          >
            {/* 채움 */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              height: `${displayPct}%`,
              background: displayPct >= 100 ? '#f0c040' : '#2db86a',
              borderRadius: '3px 3px 0 0',
              transition: 'height 0.04s',
            }} />
            {/* 눈금 */}
            {[25, 50, 75].map(t => (
              <div key={t} style={{
                position: 'absolute', bottom: `${t}%`, left: 0, right: 0,
                height: 1, background: 'rgba(255,255,255,0.1)',
              }} />
            ))}
            {/* 핸들 */}
            <div style={{
              position: 'absolute',
              bottom: `calc(${displayPct}% - 5px)`,
              left: '50%', transform: 'translateX(-50%)',
              width: 18, height: 10,
              background: displayPct >= 100 ? '#f0c040' : '#5add90',
              borderRadius: 3,
              border: '1px solid rgba(255,255,255,0.25)',
              cursor: 'ns-resize',
            }} />
          </div>
        </div>

        {/* 페이지 입력 — 능선 위치 미리보기를 없앤 만큼 더 크게 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <input
            type="number"
            min={0}
            max={total || undefined}
            value={displayPage}
            onChange={(e) => handlePageInput(e.target.value)}
            onFocus={(e) => e.target.select()}
            style={{
              width: 90, textAlign: 'center', fontFamily: 'monospace', fontSize: 18,
              background: '#1a2a1a', border: '1px solid #2a4428',
              color: '#ccffcc', padding: '6px 8px', borderRadius: 6, outline: 'none',
            }}
          />
          {total > 0 && (
            <span style={{ color: '#446644', fontSize: 12, fontFamily: 'monospace' }}>/{total}p</span>
          )}
        </div>

        {/* 저장 버튼 */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            marginTop: 4,
            background: saved ? '#1a5a2a' : displayPct >= 100 ? '#b08020' : '#1e6a38',
            color: '#ccffcc', border: 'none',
            padding: '7px 20px', borderRadius: 6,
            fontFamily: 'monospace', fontSize: 11, letterSpacing: 1,
            cursor: saving ? 'wait' : 'pointer',
            opacity: saving ? 0.6 : 1,
            transition: 'background 0.2s',
          }}
        >
          {saving ? '저장 중…' : saved ? '저장됨 ✓' : displayPct >= 100 ? '🏔 완독!' : '저장'}
        </button>
      </div>
    </div>
  )
}
