'use client'

import { useRouter, useParams } from 'next/navigation'
import { LogOut } from 'lucide-react'

export function LogoutButton() {
  const router = useRouter()
  const params = useParams<{ lang: string }>()
  const lang = params?.lang ?? 'el'

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push(`/${lang}/login`)
    router.refresh()
  }

  return (
    <button
      onClick={logout}
      className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-600"
    >
      <LogOut size={18} strokeWidth={2} />
      Αποσύνδεση
    </button>
  )
}
