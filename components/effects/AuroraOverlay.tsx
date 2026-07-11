'use client'

import { useEffect } from 'react'

// 오로라 이스터에그 — 개발자가 지정한 책(lib/aurora-books.ts)을 갤러리에 추가한
// "그 순간"에만 화면 전체에 10초간 재생되는 숨겨진 연출. 일회성(재생 후 다시 안 뜸)이며
// 공유 대상이 아니라 순전히 개인적인 발견의 순간이라, 별도 상태 저장 없이 부모가
// 이 컴포넌트를 마운트하는 것 자체로 트리거하고 onDone에서 언마운트한다.
const DURATION_MS = 10000

export default function AuroraOverlay({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, DURATION_MS)
    return () => clearTimeout(timer)
  }, [onDone])

  return (
    <div
      className="fixed inset-0 z-[200] pointer-events-none overflow-hidden"
      style={{ animation: `auroraFade ${DURATION_MS}ms ease-in-out forwards` }}
      aria-hidden="true"
    >
      <style>{`
        @keyframes auroraFade {
          0%   { opacity: 0; }
          8%   { opacity: 1; }
          82%  { opacity: 1; }
          100% { opacity: 0; }
        }
        /* 커튼이 위→아래로 물결치듯 넘실거리는 느낌을 주기 위해
           각 밴드를 서로 다른 주기·딜레이로 살짝씩 기울이며 흔든다. */
        @keyframes auroraDrift {
          0%   { transform: translate3d(-6%, -14%, 0) skewX(-6deg); }
          50%  { transform: translate3d(5%, 12%, 0) skewX(5deg); }
          100% { transform: translate3d(-6%, -14%, 0) skewX(-6deg); }
        }
        .aurora-band {
          position: absolute;
          left: -12%;
          width: 124%;
          mix-blend-mode: screen;
          filter: blur(20px);
          background: linear-gradient(
            180deg,
            rgba(64, 224, 160, 0.55) 0%,
            rgba(120, 110, 230, 0.45) 55%,
            rgba(140, 80, 230, 0.2) 80%,
            transparent 100%
          );
          animation-name: auroraDrift;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
      `}</style>
      <div className="aurora-band" style={{ top: '-18%', height: '55%', animationDuration: '6.5s' }} />
      <div
        className="aurora-band"
        style={{ top: '2%', height: '60%', animationDuration: '8s', animationDelay: '-2.2s', opacity: 0.85 }}
      />
      <div
        className="aurora-band"
        style={{ top: '22%', height: '65%', animationDuration: '7.2s', animationDelay: '-4.4s', opacity: 0.7 }}
      />
    </div>
  )
}
