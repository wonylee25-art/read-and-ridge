'use client'

import { createClient } from '@/lib/supabase/client'

// 비로그인 상태에서 로그인이 필요한 액션(책 추가/게이지 저장/CSV 내려받기/
// 회원 탈퇴/사이드바 로그인 메뉴)을 눌렀을 때 공통으로 쓰는 구글 로그인 트리거.
// app/login/page.tsx의 handleGoogleLogin과 동일한 로직을 여러 컴포넌트에서
// 재사용하기 위해 분리함.
export async function signInWithGoogle() {
  const supabase = createClient()
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })
}
