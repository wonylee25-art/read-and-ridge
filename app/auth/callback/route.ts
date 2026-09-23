export const runtime = 'nodejs'

import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { NEXT_COOKIE, safeNext } from '@/lib/auth/next'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // 돌아갈 자리 — signInWithGoogle이 쿠키에 적어둔 값. (?next=도 예전 방식 호환으로 받는다)
  // 어느 쪽이든 브라우저가 보낸 값이라 safeNext로 같은 사이트 경로인지 확인한다.
  const next = safeNext(searchParams.get('next') ?? request.cookies.get(NEXT_COOKIE)?.value)

  // 쿠키는 성공·실패와 무관하게 한 번 쓰고 버린다 — 남아 있으면 다음 로그인이 엉뚱한 데로 간다
  function redirect(to: string) {
    const res = NextResponse.redirect(`${origin}${to}`)
    res.cookies.delete(NEXT_COOKIE)
    return res
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return redirect(next)
    }
    // 실패 원인을 Vercel Function 로그에 남겨서 다음에 바로 원인을 볼 수 있게 함
    console.error('[auth/callback] exchangeCodeForSession failed:', {
      message: error.message,
      status: error.status,
      code: error.code,
    })
  } else {
    console.error('[auth/callback] no code param in callback URL')
  }

  return redirect('/login?error=auth_callback_failed')
}
