'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { updateProgress } from '@/app/dashboard/books/actions'
import type { WorldMapBook } from './WorldMap'

// ─── 미니 픽셀 산 (모달 내부용) ──────────────────────────────────────────────

const MINI_PX = 6        // 1블록 = 6px
const MINI_STEPS = 7     // 고정 7행 (중간 크기)
const CHAR_ROWS = ['.XXX.', 'XXXXX', 'XX.XX', '.X.X.', '.X.X.']
const CPX = 2            // 캐릭터 픽셀 크기

// 능선 X좌표 (row별): 왼쪽 edge 픽셀의 col 인덱스
// row 0 = 정상(mid), row N-1 = 기슭(0 ~ 2*N-2)
function getRidgeX(row: number, steps: number, mid: number): number[] {
  const xs: number[] = []
  for (let col = mid - row; col <= mid + row; col++) {
    const isEdge = col === mid - row || col === mid + row
    if (isEdge || row === 0) xs.push(col)
  }
  return xs
}

function MiniMountain({ pct, bounceFrame }: { pct: number; bounceFrame: number }) {
  const steps = MINI_STEPS
  const mid = steps - 1
  const W = (2 * steps - 1) * MINI_PX
  const H = (steps + 2) * MINI_PX

  // 캐릭터 row: 0%(기슭) → steps-1, 100%(정상) → 0
  const charRow = Math.round((1 - pct) * (steps - 1))
  // 왼쪽 능선(대각선 경사면) edge col 위에 캐릭터 배치
  const leftEdgeCol = mid - charRow
  const charX = leftEdgeCol * MINI_PX + MINI_PX / 2
  const bounceY = bounceFrame < 10 ? -(bounceFrame * 0.3) : -((20 - bounceFrame) * 0.3)
  const charY = charRow * MINI_PX + bounceY

  const cells: React.ReactNode[] = []

  // 산 본체
  for (let row = 0; row < steps; row++) {
    for (let col = mid - row; col <= mid + row; col++) {
      const isTop  = row === 0
      const isEdge = col === mid - row || col === mid + row
      cells.push(
        <rect
          key={`m_${row}_${col}`}
          x={col * MINI_PX}
          y={row * MINI_PX}
          width={MINI_PX}
          height={MINI_PX}
          fill={isTop ? '#d4ffea' : isEdge ? '#166b3a' : '#2db86a'}
        />
      )
    }
  }

  // 베이스 2행
  for (let r = 0; r < 2; r++) {
    for (let col = 0; col < 2 * steps - 1; col++) {
      cells.push(
        <rect
          key={`b_${r}_${col}`}
          x={col * MINI_PX}
          y={(steps + r) * MINI_PX}
          width={MINI_PX}
          height={MINI_PX}
          fill="#166b3a"
        />
      )
    }
  }

  // 캐릭터 (5×5)
  const charW = 5 * CPX
  const charH = 5 * CPX
  const charPixels: React.ReactNode[] = []
  CHAR_ROWS.forEach((row, ri) => {
    row.split('').forEach((cell, ci) => {
      if (cell === 'X') {
        charPixels.push(
          <rect
            key={`c_${ri}_${ci}`}
            x={Math.round(charX - charW / 2 + ci * CPX)}
            y={Math.round(charY - charH + ri * CPX)}
            width={CPX}
            height={CPX}
            fill={pct >= 1 ? '#f0c040' : '#1a1a1a'}
          />
        )
      }
    })
  })

  return (
    <svg
      width={W}
      height={H + 4}
      style={{ imageRendering: 'pixelated', overflow: 'visible' }}
    >
      {cells}
      {charPixels}
    </svg>
  )
}

// ─── 모달 ────────────────────────────────────────────────────────────────────

type Props = {
  book: WorldMapBook
  onClose: () => void
  onSaved: () => void
}

const GAUGE_H = 220

export default function ProgressModal({ book, onClose, onSaved }: Props) {
  const total = book.total_pages ?? 0
  const initPct = total > 0 ? Math.min(book.current_page / total, 1) : 0

  const [pct, setPct] = useState(initPct)
  const [page, setPage] = useState(book.current_page)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [bounceFrame, setBounceFrame] = useState(0)
  const gaugeRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const pctClamped = Math.min(Math.max(pct, 0), 1)
  const displayPct = Math.round(pctClamped * 100)
  const displayPage = total > 0 ? Math.round(pctClamped * total) : page

  // 캐릭터 바운스
  useEffect(() => {
    const t = setInterval(() => setBounceFrame((f) => (f + 1) % 20), 80)
    return () => clearInterval(t)
  }, [])

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
    setSaving(true)
    try {
      await updateProgress(book.id, displayPage)
      setSaved(true)
      onSaved()
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const title = book.title.length > 16 ? book.title.slice(0, 15) + '…' : book.title

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="relative flex gap-5 rounded-2xl select-none"
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

        {/* 왼쪽: 게이지 */}
        <div className="flex flex-col items-center gap-3">
          {/* 책 제목 */}
          <p style={{ color: '#88cc88', fontSize: 10, fontFamily: 'monospace', letterSpacing: 1, maxWidth: 80, textAlign: 'center' }}>
            {title}
          </p>

          {/* % 표시 */}
          <span style={{ color: '#ccffcc', fontSize: 22, fontWeight: 700, fontFamily: 'monospace' }}>
            {displayPct}%
          </span>

          {/* 수직 게이지 */}
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', color: '#55885a', fontSize: 9, fontFamily: 'monospace' }}>100</span>
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
            <span style={{ position: 'absolute', bottom: -14, left: '50%', transform: 'translateX(-50%)', color: '#55885a', fontSize: 9, fontFamily: 'monospace' }}>0</span>
          </div>

          {/* 페이지 입력 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
            <input
              type="number"
              min={0}
              max={total || undefined}
              value={displayPage}
              onChange={(e) => handlePageInput(e.target.value)}
              style={{
                width: 52, textAlign: 'center', fontFamily: 'monospace', fontSize: 12,
                background: '#1a2a1a', border: '1px solid #2a4428',
                color: '#ccffcc', padding: '3px 4px', borderRadius: 4, outline: 'none',
              }}
            />
            {total > 0 && (
              <span style={{ color: '#446644', fontSize: 9, fontFamily: 'monospace' }}>/{total}p</span>
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

        {/* 오른쪽: 미니 픽셀 산 + 캐릭터 */}
        <div className="flex flex-col items-center justify-end" style={{ paddingBottom: 8 }}>
          <p style={{ color: '#446644', fontSize: 9, fontFamily: 'monospace', marginBottom: 6 }}>
            능선 위치
          </p>
          <MiniMountain pct={pctClamped} bounceFrame={bounceFrame} />
        </div>
      </div>
    </div>
  )
}
