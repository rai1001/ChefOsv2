'use client'

import { HotelSwitcher } from './hotel-switcher'
import { NotificationBell } from './notification-bell'
import { useAuth } from '@/features/identity/hooks/use-auth'
import { LogOut, User } from 'lucide-react'
import type { ActiveHotel } from '@/features/identity/hooks/use-active-hotel'

interface TopbarProps {
  hotel: ActiveHotel
}

export function Topbar({ hotel }: TopbarProps) {
  const { signOut } = useAuth()

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-bg-primary px-4">
      <HotelSwitcher
        currentHotelName={hotel.hotel_name}
        currentHotelId={hotel.hotel_id}
      />

      <div className="flex items-center gap-2">
        {/* Notifications — con badge en tiempo real */}
        <NotificationBell hotelId={hotel.hotel_id} />

        {/* User menu */}
        <button
          onClick={signOut}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary"
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <User className="h-5 w-5" aria-hidden="true" />
          <LogOut className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}
