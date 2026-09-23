// 로그인 뒤에 돌아갈 자리("next").
//
// 로그인은 늘 무언가를 하려다 막혀서 누르는 버튼이다(책 추가·진도 저장·남의 지도에서
// "시작하기"). 예전엔 전부 /dashboard로 떨어져서, 돌아온 사람이 하려던 일을 다시 찾아야
// 했다. 그래서 로그인 직전에 갈 곳을 적어두고 콜백에서 꺼내 쓴다.
//
// 쿼리(?next=)가 아니라 쿠키에 싣는 이유 — Supabase의 Redirect URL 허용 목록은
// redirectTo를 통째로 비교하므로, 쿼리를 붙이면 허용 목록 설정에 따라 로그인 자체가
// 막힐 수 있다. 콜백 주소를 그대로 두면 그런 설정을 건드릴 필요가 없다.
//
// ⚠️ 이 값은 브라우저에서 온 것이라 그대로 redirect에 넣으면 열린 리다이렉트가 된다
// (예: "@evil.com" → https://우리도메인@evil.com). 반드시 safeNext를 거칠 것.
export const NEXT_COOKIE = 'sanchaek_next'
export const DEFAULT_NEXT = '/dashboard'

// 같은 사이트 안의 경로만 통과시킨다. 아니면 기본값.
export function safeNext(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_NEXT
  // "//host", "/\host"는 브라우저가 다른 도메인으로 읽는다
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return DEFAULT_NEXT
  try {
    const base = 'http://local.invalid'
    const url = new URL(raw, base)
    if (url.origin !== base) return DEFAULT_NEXT
    // 콜백으로 되돌아가면 코드 없이 다시 들어와 로그인 실패 화면이 뜬다
    if (url.pathname.startsWith('/auth/')) return DEFAULT_NEXT
    return url.pathname + url.search + url.hash
  } catch {
    return DEFAULT_NEXT
  }
}

// 로그인 뒤 책 추가 창이 열린 채로 산책기록에 도착하는 주소.
// (app/dashboard/page.tsx가 add=1을 읽어 WorldMapClient에 넘긴다)
export const ADD_BOOK_NEXT = '/dashboard?add=1'
