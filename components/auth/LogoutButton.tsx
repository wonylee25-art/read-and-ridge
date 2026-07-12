'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    // 로그아웃 후에도 로그인 페이지 대신 예시 지형도가 있는 /dashboard로 이동.
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
    >
      로그아웃
    </button>
  )
}
