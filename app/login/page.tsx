'use client'

import { signInWithGoogle } from '@/lib/auth/signInWithGoogle'
import { DEFAULT_NEXT } from '@/lib/auth/next'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { 문구 } from '@/lib/copy'

function LoginContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  // 여기서 기본값을 안 주면 "지금 화면"(/login)으로 돌아오게 된다
  const handleGoogleLogin = () => signInWithGoogle(searchParams.get('next') ?? DEFAULT_NEXT)

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6">
      <h1 className="text-3xl font-bold">Read &amp; Ridge</h1>
      <p className="text-gray-500">{문구.로그인.부제}</p>

      {error && (
        <p className="text-sm text-red-500">
          {문구.로그인.오류}
        </p>
      )}

      <button
        onClick={handleGoogleLogin}
        className="flex items-center gap-3 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
      >
        {문구.로그인.구글버튼}
      </button>

      <div className="flex items-center gap-2 text-xs text-gray-400">
        <Link href="/privacy" className="hover:text-gray-600 transition-colors">
          {문구.메뉴.개인정보처리방침}
        </Link>
        <span className="text-gray-200">·</span>
        <Link href="/terms" className="hover:text-gray-600 transition-colors">
          {문구.메뉴.이용약관}
        </Link>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
