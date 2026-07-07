export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
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

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
