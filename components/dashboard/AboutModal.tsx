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
            산책또산책은 산을 오르는 아버지에게 영감을 받아 탄생한 공간이에요. 등산하는 아버지와
            독서하는 딸이 서로의 접점을 차곡차곡 쌓아가는 일이라 할 수 있어요.
          </p>
          <p>
            산을 오르는 법과 책을 읽는 법에는 닮은 점이 있어요. 나의 현재 상태를 살피고 한 걸음씩
            천천히 내딛어야 한다는 거예요. 무리해선 안되죠. 완독과 완등의 순간도 기쁘지만, 오늘
            읽어 내려간 한 페이지 만큼의 발걸음으로도 충분하니까요. 이제 우리 마스코트 마루와 함께
            산책을 떠나볼까요? 책 추가 버튼을 눌러보세요.
          </p>

          <p className="pt-2 text-xs font-semibold text-gray-400 tracking-wide">
            &lt;덧붙이는 말&gt;
          </p>
          <p>
            산책또산책의 개발자는 여러 권의 책을 동시에 읽어요. (노래는 한 곡을 질릴 때까지
            반복해서 듣지만요.) 읽다보면 서로 다른 책들이 하나의 주제, 하나의 소재 혹은 뜻밖의
            장소로 연결되는 선물 같은 순간을 만나게 돼요. 책 사이를 산책하며 숨은 재미를 발견할 수
            있다면 좋겠어요.
          </p>
          <p>
            사실 개발자는 웹을 전혀 모른답니다. 클로드와 함께 서툴게도 이 공간을 만들었어요. 기대에
            미치지 못하더라도, 업데이트가 늦어지더라도 열린 마음으로 천천히 기다려주세요. 저도
            노력하고 있답니다. 칭찬을 먹고 자라는 초보 개발자라 &quot;잘한다&quot; 해주시면 참
            기쁠 것 같아요.
          </p>
        </div>
      </div>
    </div>
  )
}
