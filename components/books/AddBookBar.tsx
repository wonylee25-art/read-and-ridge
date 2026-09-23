'use client'

import { useState } from 'react'
import AddBookForm from './AddBookForm'
import { 문구 } from '@/lib/copy'

// 책 추가 버튼 + 폼 + (열렸을 때) 왼쪽 설명문을 묶은 바.
// 산책기록(WorldMapClient)과 완등기록(hikes) 양쪽에서 공통으로 씀.
// open/onOpenChange를 넘기면 외부에서 제어(예: WorldMap 해/별 클릭으로 열기),
// 안 넘기면 내부 상태로 알아서 동작(비제어 모드) — AddBookForm과 동일한 패턴.
// variant로 페이지별 설명문을 다르게 보여줌: home(산책기록) / trophy(완등기록).
type Variant = 'home' | 'trophy'

type Props = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  variant?: Variant
  authenticated?: boolean
}

export default function AddBookBar({ open: openProp, onOpenChange, variant = 'home', authenticated = true }: Props = {}) {
  const [openState, setOpenState] = useState(false)
  const open = openProp ?? openState
  const setOpen = onOpenChange ?? setOpenState

  return (
    <div className="flex flex-col items-end md:flex-row md:items-start md:justify-end gap-4 mb-3">
      {open && (
        <div className="w-full md:max-w-xs bg-gray-50 md:bg-transparent rounded-2xl p-4 md:p-0 text-sm text-gray-500 leading-relaxed">
          {/* 문단 안의 \n은 그 자리에서 줄을 바꾼다(whitespace-pre-line) */}
          {(() => {
            const 안내 = variant === 'home' ? 문구.책추가.안내_산책기록 : 문구.책추가.안내_완등기록
            return (
              <>
                <p className="font-semibold text-gray-700 mb-3">{안내.제목}</p>
                <div className="space-y-3 whitespace-pre-line">
                  {안내.문단.map((문단) => (
                    <p key={문단}>{문단}</p>
                  ))}
                </div>
              </>
            )
          })()}
        </div>
      )}
      <div className="shrink-0">
        <AddBookForm open={open} onOpenChange={setOpen} authenticated={authenticated} />
      </div>
    </div>
  )
}
