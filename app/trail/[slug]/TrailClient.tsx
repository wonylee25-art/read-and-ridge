'use client'

// 남의 지형도를 구경하는 화면. /dashboard의 WorldMapClient와는 일부러 별개로 뒀다 —
// 저쪽은 진행률 모달·책 추가 바처럼 "내 기록을 고치는" 기능이 붙어 있어서,
// 조건부로 끄는 것보다 읽기 전용 화면을 따로 두는 쪽이 실수로 새어나갈 여지가 없다.
import { useEffect, useMemo, useRef, useState } from 'react'
import { HelpCircle } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import WorldMap from '@/components/worldmap/WorldMap'
import type { WorldMapBook } from '@/components/worldmap/worldmap-utils'
import { TARGET_TROPHY } from '@/components/worldmap/worldmap-utils'
import { signInWithGoogle } from '@/lib/auth/signInWithGoogle'
import type { PublicBook, PublicTrail } from '@/lib/trail/public-books'
import GuessModal from './GuessModal'
import { loadRevealed, saveRevealed, type RevealedTitles } from '@/lib/trail/revealed'

export default function TrailClient({ slug, trail }: { slug: string; trail: PublicTrail }) {
  const [guessTarget, setGuessTarget] = useState<PublicBook | null>(null)
  const [tapped, setTapped] = useState<PublicBook | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)

  // 이 방문자가 맞힌 산들(책 id → 제목). 서버가 아니라 이 브라우저에만 남는다 —
  // 이유는 lib/trail/revealed.ts 주석 참고.
  const [revealed, setRevealed] = useState<RevealedTitles>({})
  // 방금 맞힌 산 하나 — 이름표가 넘어가는 연출은 한 번만 돌고 끝난다.
  const [flipId, setFlipId] = useState<string | null>(null)
  const flipTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // localStorage는 서버 렌더에 없으므로 마운트 후에 읽는다(hydration 불일치 방지).
  useEffect(() => {
    setRevealed(loadRevealed(slug))
  }, [slug])

  useEffect(() => () => {
    if (flipTimer.current) clearTimeout(flipTimer.current)
  }, [])

  function handleReveal(bookId: string, title: string) {
    setRevealed((prev) => {
      const next = { ...prev, [bookId]: title }
      saveRevealed(slug, next)
      return next
    })
    setFlipId(bookId)
    if (flipTimer.current) clearTimeout(flipTimer.current)
    // 애니메이션(640ms)이 끝나면 강조 테두리를 걷어 평범한 이름표로 남긴다.
    flipTimer.current = setTimeout(() => setFlipId(null), 900)
  }

  // 맞힌 산은 물음표 대신 제목 팻말을 세운다. 제목 길이가 LONG_TITLE_THRESHOLD를
  // 넘나드는지는 maskTitle이 이미 보존하고 있어서, 제목이 바뀌어도 산 모양은 그대로다.
  // (쪽수는 가린 값 그대로 둔다 — 정답을 맞혔다고 주인의 정확한 진도까지 풀 이유는 없다.)
  const applyRevealed = (list: PublicBook[]): PublicBook[] =>
    list.map((b) => (b.isQuiz && revealed[b.id] ? { ...b, title: revealed[b.id], isQuiz: false } : b))

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const books = useMemo(() => applyRevealed(trail.books), [trail.books, revealed])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const completed = useMemo(() => applyRevealed(trail.completed), [trail.completed, revealed])

  // 산을 탭했을 때 — 맞춰보세요 책이면 맞히기 모달, 아니면 제목만 알려주는 가벼운 안내.
  // (WorldMap 자체의 말풍선은 onBookTap이 있으면 뜨지 않는다.)
  function handleBookTap(book: WorldMapBook) {
    const pb = book as PublicBook
    if (pb.isQuiz) setGuessTarget(pb)
    else setTapped(pb)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* 설명을 (?)로 접어두고 머리말은 이름·숫자만 남긴다 — 놀러 온 사람이 가장
            먼저 보고 싶은 건 사용법이 아니라 "이 사람이 뭘 얼마나 걸었나"다. */}
        <header className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-gray-400">산책또산책</p>
            <h1 className="text-2xl font-bold text-gray-900 mt-1 truncate">
              {trail.nickname}님의 등반지도
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            aria-label="이 지도 읽는 법"
            className="shrink-0 mt-1 rounded-full p-1.5 text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <HelpCircle size={20} />
          </button>
        </header>

        <section className="grid grid-cols-3 gap-3 mb-8">
          <Stat label="산책 수" value={String(trail.stats.totalBooks)} />
          <Stat label="발걸음 수" value={trail.stats.stepsWalked.toLocaleString()} />
          <Stat label="완독거리" value={`${trail.stats.totalKm.toFixed(1)}km`} />
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-sm font-semibold text-gray-700">산책기록</h2>
          {/* ⚠ books는 반드시 명시적으로 넘긴다 — WorldMap의 기본값이 데모 산이라,
              undefined를 넘기면 남에게 데모 데이터가 그 사람 기록인 것처럼 보인다. */}
          <WorldMap
            books={books}
            mode="home"
            readOnly
            nameplates
            onBookTap={handleBookTap}
            flipNameplateId={flipId}
          />
        </section>

        {trail.completed.length > 0 && (
          <section className="space-y-3 mb-8">
            <h2 className="text-sm font-semibold text-gray-700">완등기록</h2>
            <WorldMap
              books={completed}
              mode="trophy"
              readOnly
              nameplates
              onBookTap={handleBookTap}
              flipNameplateId={flipId}
            />
            {trail.completed.length > TARGET_TROPHY && (
              <p className="text-xs text-gray-400">
                최근 완등한 {TARGET_TROPHY}권만 지도에 표시돼요.
              </p>
            )}
          </section>
        )}

        <div className="rounded-2xl bg-white border border-gray-200 p-6 text-center shadow-sm">
          <p className="text-sm text-gray-700 font-medium">나도 내 산 만들기</p>
          <p className="text-xs text-gray-500 mt-1">
            읽는 책이 산이 되고, 다 읽으면 정상에 깃발이 꽂혀요.
          </p>
          <button
            type="button"
            onClick={() => signInWithGoogle()}
            className="mt-4 px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 active:scale-95 transition-all"
          >
            시작하기
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">© 2026 산책또산책</p>
      </div>

      {helpOpen && (
        <Modal onClose={() => setHelpOpen(false)}>
          <h2 className="text-lg font-bold text-gray-900">이 지도 읽는 법</h2>
          <ul className="mt-3 space-y-2.5 text-sm text-gray-600 leading-relaxed">
            <li>책 한 권이 산 하나예요. 두꺼운 책일수록 높은 산이 됩니다.</li>
            <li>읽은 만큼 마루가 산을 오릅니다. 산중턱의 캐릭터가 지금 읽고 있는 자리예요.</li>
            <li>
              팻말에 이름이 적힌 산은 눌러서 제목을 볼 수 있고,{' '}
              <span className="inline-flex items-center rounded bg-violet-600 px-1.5 py-0.5 text-[11px] font-bold text-white align-middle">
                ?
              </span>{' '}
              팻말이 선 산은 무슨 책인지 맞혀보는 산이에요.
            </li>
            <li>산기슭의 텐트와 모닥불은 그 책을 소장하고 있다는 표시입니다.</li>
            <li>다 오른 산은 아래 완등기록으로 옮겨가고, 그때 감춰뒀던 이름도 드러납니다.</li>
          </ul>
          <button
            type="button"
            onClick={() => setHelpOpen(false)}
            className="mt-5 w-full rounded-xl bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            닫기
          </button>
        </Modal>
      )}

      {guessTarget && (
        <GuessModal
          slug={slug}
          bookId={guessTarget.id}
          nickname={trail.nickname}
          status={guessTarget.status}
          hints={trail.quizHints[guessTarget.id]}
          onClose={() => setGuessTarget(null)}
          onReveal={handleReveal}
        />
      )}

      {/* 산을 누르면 그 책 이야기 — 제목만 알려주던 자리다. 놀러 온 사람이 가장
          궁금해하는 건 "이 책 뭐지"이고, 거기서 "나도 읽어볼까"로 넘어간다.
          바닥에서 올라오는 판이라 지도를 가리지 않는다. */}
      {tapped && <BookSheet book={tapped} onClose={() => setTapped(null)} />}
    </div>
  )
}

function BookSheet({ book, onClose }: { book: PublicBook; onClose: () => void }) {
  const total = book.total_pages ?? 0
  const read = Math.min(book.current_page ?? 0, total || Infinity)
  const percent = total > 0 ? Math.round((read / total) * 100) : null

  const state =
    book.status === 'completed' ? '다 오른 산' : book.status === 'paused' ? '잠시 멈춘 산' : '오르는 중'

  return (
    <>
      {/* 바깥을 누르면 닫힌다. 지도를 계속 보고 싶어 하는 화면이라 어둡게 덮지 않는다. */}
      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        className="fixed inset-0 z-40 cursor-default"
      />
      <div className="fixed inset-x-0 bottom-0 z-50 p-4 pointer-events-none">
        <div className="pointer-events-auto mx-auto max-w-sm rounded-2xl bg-white border border-gray-200 shadow-lg p-4">
          <p className="text-base font-bold text-gray-900 leading-snug">{book.title}</p>
          {book.author && <p className="mt-1 text-sm text-gray-500">{book.author}</p>}

          <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
            <span className="rounded-full bg-gray-100 px-2 py-0.5">{state}</span>
            {percent !== null && (
              <span>
                {read.toLocaleString()} / {total.toLocaleString()}쪽 · {percent}%
              </span>
            )}
          </div>

          {percent !== null && (
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-gray-800" style={{ width: `${percent}%` }} />
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="mt-4 w-full rounded-xl border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            닫기
          </button>
        </div>
      </div>
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white border border-gray-200 p-4 shadow-sm">
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}
