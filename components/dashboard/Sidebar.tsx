'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Mountain, LayoutDashboard } from 'lucide-react'
import LogoutButton from '@/components/auth/LogoutButton'

const nav = [
  { href: '/dashboard', label: '홈', icon: LayoutDashboard },
  { href: '/dashboard/books', label: '독서', icon: BookOpen },
  { href: '/dashboard/hikes', label: '등산', icon: Mountain },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex flex-col w-56 h-screen bg-white border-r border-gray-100 px-4 py-6 shrink-0">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">
          Read &amp; Ridge
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">책과 산</p>
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

      <LogoutButton />
    </aside>
  )
}
