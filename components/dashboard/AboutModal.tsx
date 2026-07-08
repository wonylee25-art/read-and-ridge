'use client'

import { X } from 'lucide-react'

export default function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">산책또산책에 대하여</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={18} />
          </button>
        </div>

        <div className="text-sm text-gray-600 space-y-3 leading-relaxed">
          <p>
            옮긴이도 출판사도 기획자도 참여한 모든 이들을 기록하고 싶지만 데이터 양을 줄여야 하다 보니
            압축적인 정보만 전달하게 되었어요.
          </p>
          <p>어떻게 쓰고 있는지 알려주신다면 기쁠 거예요.</p>
          <p>
            오류 제보, 기능 제안은 편히 남겨주세요. 단번에 완벽해질 수 없답니다. 업데이트는 열린
            마음으로(천천히) 기다려주세요. 저도 노력하고 있답니다. 이해해주세요.
          </p>
          <p>
            저는 책은 한 번에 여러 권을 읽지만 노래는 한 곡을 여러 번 듣는답니다. 읽는 것을 가만히
            들여다보면 서로 공통된 것들이 보일 때가 있어요. 주제일 수도, 소재일 수도, 장소일 수도,
            어떤 것도 될 수 있죠. 그걸 발견하는 재미도 느껴보시길.
          </p>
          <p>클로드를 적극적으로 사용했습니다.</p>
        </div>
      </div>
    </div>
  )
}
