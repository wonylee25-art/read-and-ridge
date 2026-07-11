'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Mountain, Menu, X } from 'lucide-react'
import LogoutButton from '@/components/auth/LogoutButton'
import AboutModal from '@/components/dashboard/AboutModal'
import DeleteAccountModal from '@/components/dashboard/DeleteAccountModal'
import { deleteAccount } from '@/app/dashboard/account-actions'
import { APP_VERSION, LAST_UPDATED } from '@/lib/version'

// 홈과 산책기록(구 독서 페이지)을 하나로 합쳐서, 메뉴는 산책기록/완등기록 2개만 남김
const nav = [
  { href: '/dashboard', label: '산책기록', icon: BookOpen },
  { href: '/dashboard/hikes', label: '완등기록', icon: Mountain },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [aboutOpen, setAboutOpen] = useState(false)
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* 모바일 전용 상단 바 — md 이상에서는 숨김. 사이드바가 화면을 항상 차지하면
          좁은 화면에서 본문이 눌리므로, 모바일에서는 이 바 + 아래 드로어로 대체 */}
      <header className="flex items-center justify-between w-full px-4 py-3 bg-white border-b border-gray-100 md:hidden">
        <h1 className="flex items-center gap-1.5 text-lg font-bold text-gray-900 tracking-tight">
          산책또산책
          <span className="px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 bg-amber-100 rounded">
            BETA
          </span>
        </h1>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="메뉴 열기"
          className="p-2 -mr-2 text-gray-600"
        >
          <Menu size={22} />
        </button>
      </header>

      {/* 드로어 열렸을 때 배경 딤 처리 — 클릭하면 닫힘 */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`flex flex-col w-64 md:w-56 h-screen bg-white border-r border-gray-100 px-4 py-6 shrink-0
          fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          md:static md:translate-x-0`}
      >
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              산책또산책
            </h1>
            <p className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
              Read &amp; Ridge
              <span className="px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 bg-amber-100 rounded">
                BETA
              </span>
            </p>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="메뉴 닫기"
            className="p-1 -mr-1 text-gray-400 md:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
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
      </div>

      {/* 버전/업데이트 정보 — 메뉴 하단에 늘 고정되도록 별도 블록으로 분리 (mt-auto) */}
      <div className="mt-auto pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-300">© 2026 산책또산책</p>
        <p className="text-[11px] text-gray-300">v{APP_VERSION} · {LAST_UPDATED} 업데이트</p>
      </div>
      </aside>

      {/* aside에 transform이 걸려있어(모바일 슬라이드용) 그 안에 fixed 모달을 두면
          뷰포트가 아니라 aside 기준으로 위치가 잡혀버림(CSS containing block 이슈).
          그래서 모달은 aside 바깥, 최상위에서 렌더링해야 화면 중앙에 제대로 뜸. */}
      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
      {deleteAccountOpen && (
        <DeleteAccountModal
          onClose={() => setDeleteAccountOpen(false)}
          onConfirm={deleteAccount}
        />
      )}
    </>
  )
}
