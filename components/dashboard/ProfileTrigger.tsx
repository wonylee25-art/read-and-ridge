'use client'

import { useState, useEffect } from 'react'
import { User } from 'lucide-react'
import type { VisibilityBook } from '@/components/dashboard/VisibilityModal'
import ProfileModal, { type ProfileStats } from './ProfileModal'
import { 문구 } from '@/lib/copy'

// 시간대별 인사 문구 — 2시간 단위 12구간, 구간마다 후보 2개 중 하나를 랜덤으로 보여준다.
// 배열 인덱스 = Math.floor(hour / 2) (0시~2시 → 0, 2시~4시 → 1, ... 22시~24시 → 11).
const GREETING_PHRASES = 문구.산책자증표.인사_시간대별

function pickGreetingPhrase(hour: number): string {
  const band = GREETING_PHRASES[Math.min(GREETING_PHRASES.length - 1, Math.floor(hour / 2))]
  return band[Math.random() < 0.5 ? 0 : 1]
}

// 산책기록·완등기록 양쪽 상단(레이아웃 레벨)에 항상 표시. "산책자 증표" 팝업이
// 두 페이지 데이터(내가 산 책/발걸음 수 + 완등기록/완등거리)를 함께 보여주므로
// 트리거도 페이지 하나에 묶지 않고 DashboardLayout에서 공통으로 렌더링한다.
export default function ProfileTrigger({
  nickname,
  stats,
  shareSlug,
  shareEnabled,
  visibilityBooks,
}: {
  nickname: string
  stats: ProfileStats
  shareSlug: string | null
  shareEnabled: boolean
  visibilityBooks: VisibilityBook[]
}) {
  const [open, setOpen] = useState(false)

  // 기본값 '반가워요'는 서버 렌더/마운트 직후에 잠깐 보이는 값 — 브라우저 로컬 시각
  // 기준으로 문구를 골라야 해서(서버 시각을 쓰면 사용자 시간대와 어긋남), 실제
  // 시간대별 문구는 마운트 후 useEffect에서 계산해 교체한다(WorldMap 하늘 시각과 동일한 원칙).
  const [phrase, setPhrase] = useState(문구.산책자증표.인사_기본)
  useEffect(() => {
    setPhrase(pickGreetingPhrase(new Date().getHours()))
  }, [])

  return (
    <>
      <div className="flex justify-end items-center gap-2 min-w-0">
        {/* 모바일 좁은 화면에서는 페이지 제목과 같은 줄에서 겹쳐 보인다는 피드백
            (2026.07.12)으로, 인사 문구는 생략하고 닉네임만 노출한다. */}
        <span className="text-sm text-gray-500 truncate">
          <span className="sm:hidden">{문구.산책자증표.이름표시_모바일(nickname)}</span>
          <span className="hidden sm:inline">{문구.산책자증표.이름표시(nickname, phrase)}</span>
        </span>
        <button
          onClick={() => setOpen(true)}
          className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors shrink-0"
          title={문구.산책자증표.제목}
          aria-label={문구.산책자증표.열기}
        >
          <User size={15} className="text-gray-600" />
        </button>
      </div>
      {open && (
        <ProfileModal
          nickname={nickname}
          stats={stats}
          shareSlug={shareSlug}
          shareEnabled={shareEnabled}
          visibilityBooks={visibilityBooks}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
