'use client'

import { useState, useEffect } from 'react'
import { User } from 'lucide-react'
import ProfileModal, { type ProfileStats } from './ProfileModal'

// 시간대별 인사 문구 — 2시간 단위 12구간, 구간마다 후보 2개 중 하나를 랜덤으로 보여준다.
// 배열 인덱스 = Math.floor(hour / 2) (0시~2시 → 0, 2시~4시 → 1, ... 22시~24시 → 11).
const GREETING_PHRASES: [string, string][] = [
  ['위로가 필요하신가요?', '밤이 깊어가네요'], // 00:00 ~ 02:00
  ['고요한 새벽이네요', '책장 넘기는 소리가 들리네요'], // 02:00 ~ 04:00
  ['이른 시작이네요', '첫 페이지를 열어볼까요?'], // 04:00 ~ 06:00
  ['기분 좋은 아침이에요', '아침 첫 문장을 만나볼까요?'], // 06:00 ~ 08:00
  ['새소리가 들리나요?', '가볍게 출발해 볼까요?'], // 08:00 ~ 10:00
  ['하늘을 올려다봐요', '싱그러운 바람을 즐겨요'], // 10:00 ~ 12:00
  ['잠시 숨 고를 시간이에요', '잠시 책갈피를 꽂아둘까요?'], // 12:00 ~ 14:00
  ['나른한 시간이죠?', '달콤한 충전이 필요해요'], // 14:00 ~ 16:00
  ['슬슬 기지개를 켜볼까요?', '마음에 닿은 문장이 있나요?'], // 16:00 ~ 18:00
  ['노을이 참 예쁘네요', '오늘 하늘 보셨나요?'], // 18:00 ~ 20:00
  ['오늘도 고생 많았어요', '온전히 나만의 시간을 보내볼까요'], // 20:00 ~ 22:00
  ['밤바람이 선선하죠?', '오래 남을 문장을 만났나요?'], // 22:00 ~ 24:00
]

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
}: {
  nickname: string
  stats: ProfileStats
}) {
  const [open, setOpen] = useState(false)

  // 기본값 '반가워요'는 서버 렌더/마운트 직후에 잠깐 보이는 값 — 브라우저 로컬 시각
  // 기준으로 문구를 골라야 해서(서버 시각을 쓰면 사용자 시간대와 어긋남), 실제
  // 시간대별 문구는 마운트 후 useEffect에서 계산해 교체한다(WorldMap 하늘 시각과 동일한 원칙).
  const [phrase, setPhrase] = useState('반가워요')
  useEffect(() => {
    setPhrase(pickGreetingPhrase(new Date().getHours()))
  }, [])

  return (
    <>
      <div className="flex justify-end items-center gap-2">
        <span className="text-sm text-gray-500">{nickname}님, {phrase}</span>
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
