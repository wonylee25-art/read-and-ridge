'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Mountain } from 'lucide-react'
import LogoutButton from '@/components/auth/LogoutButton'
import AboutModal from '@/components/dashboard/AboutModal'
import DeleteAccountModal from '@/components/dashboard/DeleteAccountModal'
import { deleteAccount } from '@/app/dashboard/account-actions'

// 홈과 산책기록(구 독서 페이지)을 하나로 합쳐서, 메뉴는 산책기록/완등기록 2개만 남김
const nav = [
  { href: '/dashboard', label: '산책기록', icon: BookOpen },
  { href: '/dashboard/hikes', label: '완등기록', icon: Mountain },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [aboutOpen, setAboutOpen] = useState(false)
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false)

  return (
    <aside className="flex flex-col w-56 h-screen bg-white border-r border-gray-100 px-4 py-6 shrink-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          산책또산책
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">Read &amp; Ridge</p>
      </div>

      <nav className="flex-1 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="space-y-2.5 pt-4 mt-4 border-t border-gray-100">
        <button
          onClick={() => setAboutOpen(true)}
          className="block text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          산책또산책에 대하여
        </button>
        <a
          href="/api/books/export"
          className="block text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          CSV 내려받기
        </a>
        <div className="flex items-center gap-2 text-sm">
          <Link href="/privacy" className="text-gray-500 hover:text-gray-700 transition-colors">
            개인정보처리방침
          </Link>
          <span className="text-gray-200">·</span>
          <Link href="/terms" className="text-gray-500 hover:text-gray-700 transition-colors">
            이용약관
          </Link>
        </div>
        <LogoutButton />
        <button
          onClick={() => setDeleteAccountOpen(true)}
          className="block text-sm text-gray-300 hover:text-red-400 transition-colors"
        >
          회원 탈퇴
        </button>
        <p className="text-xs text-gray-300 pt-1">© 2026 산책또산책</p>
      </div>

      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
      {deleteAccountOpen && (
        <DeleteAccountModal
          onClose={() => setDeleteAccountOpen(false)}
          onConfirm={deleteAccount}
        />
      )}
    </aside>
  )
}
