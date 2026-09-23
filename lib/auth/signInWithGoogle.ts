'use client'

import { createClient } from '@/lib/supabase/client'
import { NEXT_COOKIE, safeNext } from '@/lib/auth/next'

// 비로그인 상태에서 로그인이 필요한 액션(책 추가/게이지 저장/CSV 내려받기/
// 회원 탈퇴/사이드바 로그인 메뉴/남의 지도에서 "시작하기")을 눌렀을 때 공통으로 쓰는
// 구글 로그인 트리거.
//
// next — 로그인 뒤에 돌아올 자리. 안 넘기면 지금 보던 화면으로 돌아온다.
// 하려던 일이 따로 있으면(책 추가 등) 그 일이 열린 주소를 넘긴다. (lib/auth/next.ts)
export async function signInWithGoogle(next?: string) {
  const target = safeNext(next ?? window.location.pathname + window.location.search)
  const supabase = createClient()

  // 이미 로그인한 사람(남의 지도에서 "시작하기"를 누른 기존 사용자 등)은 구글을
  // 한 바퀴 돌 필요 없이 바로 보낸다.
  const { data } = await supabase.auth.getSession()
  if (data.session) {
    window.location.assign(target)
    return
  }

  // 구글 다녀오는 동안만 쓰는 값이라 10분이면 충분하다. 콜백이 읽고 지운다.
  const secure = window.location.protocol === 'https:' ? '; secure' : ''
  document.cookie = `${NEXT_COOKIE}=${encodeURIComponent(target)}; path=/; max-age=600; samesite=lax${secure}`

  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })
}
