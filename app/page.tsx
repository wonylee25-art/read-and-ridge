export const runtime = 'nodejs'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  // 빠른 실패: Supabase 설정이 없으면 바로 로그인으로
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    redirect('/login')
  }

  const supabase = await createClient()

  try {
    // Supabase 호출이 지연될 경우 앱 로딩이 멈추므로 타임아웃을 둡니다.
    // 빌드 시 타입 에러를 방지하기 위해 응답 타입을 명시적으로 정의합니다.
    type SupabaseGetUserResult = { data?: { user?: { id?: string } | null } } | null

    const res = (await Promise.race([
      supabase.auth.getUser(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('auth timeout')), 2000)),
    ])) as SupabaseGetUserResult

    const user = res?.data?.user
    if (user) redirect('/dashboard')
  } catch (e) {
    // 실패 시 로그인으로 폴백
    console.error('Supabase auth error or timeout, redirecting to /login', e)
  }

  redirect('/login')
}
