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
    const res: any = await Promise.race([
      supabase.auth.getUser(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('auth timeout')), 2000)),
    ])

    const user = res?.data?.user
    if (user) redirect('/dashboard')
  } catch (e) {
    // 실패 시 로그인으로 폴백
    console.error('Supabase auth error or timeout, redirecting to /login', e)
  }

  redirect('/login')
}
