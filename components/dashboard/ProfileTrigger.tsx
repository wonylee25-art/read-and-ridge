'use client'

import { useState } from 'react'
import { User } from 'lucide-react'
import ProfileModal, { type ProfileStats } from './ProfileModal'

// 산책기록·완등기록 양쪽 상단(레이아웃 레벨)에 항상 표시. "산책자 증표" 팝업이
// 두 페이지 데이터(내가 산 책/발걸음 수 + 완등기록/완등거리)를 함께 보여주므로
// 트리거도 페이지 하나에 묶지 않고 DashboardLayout에서 공통으로 렌더링한다.
export default function ProfileTrigger({
  nickname,
  stats,
}: {
  nickname: string
  stats: ProfileStats
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="flex justify-end items-center gap-2">
        <span className="text-sm text-gray-500">{nickname}님, 반가워요</span>
        <button
          onClick={() => setOpen(true)}
          className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors shrink-0"
          title="산책자 증표"
          aria-label="산책자 증표 열기"
        >
          <User size={15} className="text-gray-600" />
        </button>
      </div>
      {open && <ProfileModal nickname={nickname} stats={stats} onClose={() => setOpen(false)} />}
    </>
  )
}
