'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { NAV_BY_PROFILE } from './sidebar-config'
import type { UXProfile } from '@/features/identity/types'
import { ChefHat, PanelLeftClose, PanelLeft } from 'lucide-react'
import { useState } from 'react'

interface SidebarProps {
  profile: UXProfile
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const groups = NAV_BY_PROFILE[profile]

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-border bg-bg-sidebar transition-all duration-200',
        collapsed ? 'w-14' : 'w-[200px]'
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center justify-between px-4">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <ChefHat className="h-6 w-6 text-accent" />
            <span className="font-bold text-text-primary">ChefOS</span>
          </Link>
        )}
        {collapsed && (
          <Link href="/dashboard" className="mx-auto">
            <ChefHat className="h-6 w-6 text-accent" />
          </Link>
        )}
      </div>

      {/* Nav groups */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-4">
        {groups.map((group, gi) => (
          <div key={gi}>
            {group.title && !collapsed && (
              <p className="mb-1 px-2 text-xs font-medium uppercase tracking-wider text-text-muted">
                {group.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors',
                        active
                          ? 'bg-accent/10 text-accent'
                          : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-border p-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center rounded-md p-2 text-text-muted hover:bg-bg-hover hover:text-text-primary"
          aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
        >
          {collapsed ? (
            <PanelLeft className="h-5 w-5" />
          ) : (
            <PanelLeftClose className="h-5 w-5" />
          )}
        </button>
      </div>
    </aside>
  )
}
