'use client'

// 남의 지형도를 구경하는 화면. /dashboard의 WorldMapClient와는 일부러 별개로 뒀다 —
// 저쪽은 진행률 모달·책 추가 바처럼 "내 기록을 고치는" 기능이 붙어 있어서,
// 조건부로 끄는 것보다 읽기 전용 화면을 따로 두는 쪽이 실수로 새어나갈 여지가 없다.
import { useState } from 'react'
import { HelpCircle } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import WorldMap from '@/components/worldmap/WorldMap'
import type { WorldMapBook } from '@/components/worldmap/worldmap-utils'
import { TARGET_TROPHY } from '@/components/worldmap/worldmap-utils'
import { signInWithGoogle } from '@/lib/auth/signInWithGoogle'
import type { PublicTrail } from '@/lib/trail/public-books'
import GuessModal from './GuessModal'

type PublicBook = WorldMapBook & { isQuiz: boolean }

export default function TrailClient({ slug, trail }: { slug: string; trail: PublicTrail }) {
  const [guessTarget, setGuessTarget] = useState<PublicBook | null>(null)
  const [tapped, setTapped] = useState<PublicBook | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)

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
          <WorldMap books={trail.books} mode="home" readOnly nameplates onBookTap={handleBookTap} />
        </section>

        {trail.completed.length > 0 && (
          <section className="space-y-3 mb-8">
            <h2 className="text-sm font-semibold text-gray-700">완등기록</h2>
            <WorldMap
              books={trail.completed}
              mode="trophy"
              readOnly
              nameplates
              onBookTap={handleBookTap}
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
        />
      )}

      {tapped && (
        <button
          type="button"
          onClick={() => setTapped(null)}
          className="fixed inset-x-0 bottom-0 z-50 p-4"
          aria-label="닫기"
        >
          <span className="block mx-auto max-w-sm rounded-xl bg-gray-900/90 text-white text-sm px-4 py-3 text-center">
            {tapped.title}
          </span>
        </button>
      )}
    </div>
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
