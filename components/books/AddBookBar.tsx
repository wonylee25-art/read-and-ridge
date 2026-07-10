'use client'

import { useState } from 'react'
import AddBookForm from './AddBookForm'

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
}

export default function AddBookBar({ open: openProp, onOpenChange, variant = 'home' }: Props = {}) {
  const [openState, setOpenState] = useState(false)
  const open = openProp ?? openState
  const setOpen = onOpenChange ?? setOpenState

  return (
    <div className="flex flex-col items-end md:flex-row md:items-start md:justify-end gap-4 mb-3">
      {open && (
        <div className="w-full md:max-w-xs bg-gray-50 md:bg-transparent rounded-2xl p-4 md:p-0 text-sm text-gray-500 leading-relaxed">
          {variant === 'home' ? (
            <>
              <p className="font-semibold text-gray-700 mb-3">산책을 떠나봅시다!</p>
              <div className="space-y-3">
                <p>
                  <span className="mr-1">⛰️</span>
                  제목을 검색하거나 ISBN 바코드를 스캔하면<br />
                  책 정보가 자동으로 입력돼요. 페이지는 산의 크기가<br />
                  돼요. 읽고 있는 책만 지도에 산으로 솟아나요.
                </p>
                <p>
                  <span className="mr-1">🚶</span>
                  솟아난 산을 눌러 읽은 쪽을 기록해주세요.<br />
                  마루가 산책을 떠납니다! 읽는 중인 책은 &apos;산책기록&apos;에서<br />
                  완독한 책은 &apos;완등기록&apos;에서 볼 수 있어요.
                </p>
                <p>
                  <span className="mr-1">🏠</span>
                  소장하는 책은 텐트에 불이 켜져요. 메모도 더해봐요.
                </p>
              </div>
            </>
          ) : (
            <>
              <p className="font-semibold text-gray-700 mb-3">완등을 기록해봅시다!</p>
              <div className="space-y-3">
                <p>
                  <span className="mr-1">🚩</span>
                  완독하면 정상에 깃발이 꽂혀요.<br />
                  완등기록은 지도 아래 차곡차곡 쌓입니다.
                </p>
                <p>
                  <span className="mr-1">⛰️</span>
                  완등은 읽은 책의 수와 거리로도 기록됩니다.<br />
                  마루와 함께한 길의 길이라 할 수 있죠.
                </p>
                <p>
                  <span className="mr-1">👟</span>
                  자 이제 다음 산은 어디죠?<br />
                  마루는 이미 운동화 끈을 묶었답니다!
                </p>
              </div>
            </>
          )}
        </div>
      )}
      <div className="shrink-0">
        <AddBookForm open={open} onOpenChange={setOpen} />
      </div>
    </div>
  )
}
