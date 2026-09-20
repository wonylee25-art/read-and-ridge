import type { MetadataRoute } from 'next'

// 홈 화면에 추가했을 때의 앱 정보.
//
// 기록하러 들어오는 길이 "브라우저 열기 → 주소창 → 산책또산책 → 산 누르기"라서,
// 실제로 며칠 안 열게 되는 이유의 상당 부분이 이 앞쪽 세 단계에 있었다. 홈 화면
// 아이콘이 생기면 그게 한 번으로 줄어든다.
//
// start_url이 '/'가 아니라 '/dashboard'인 이유 — '/'는 어차피 /dashboard로
// 리다이렉트하는 페이지라, 아이콘에서 띄울 때마다 한 번 더 돌아가게 둘 이유가 없다.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '산책또산책',
    short_name: '산책또산책',
    description: '책과 산, 나만의 기록 공간',
    start_url: '/dashboard',
    display: 'standalone',
    orientation: 'portrait',
    lang: 'ko',
    // 앱 화면의 배경(gray-50)과 같은 색 — 띄우는 순간 흰 화면이 번쩍이지 않게.
    background_color: '#f9fafb',
    theme_color: '#f9fafb',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      // maskable — 안드로이드가 아이콘을 원형·둥근사각형으로 잘라내는 경우.
      // 산이 가운데 있고 하늘이 여백이라 잘려도 형태가 남는다.
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
