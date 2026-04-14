'use client'

import { useState, useRef, useEffect } from 'react'
import { useUserHotels, useSwitchHotel } from '@/features/identity/hooks/use-active-hotel'
import { useRouter } from 'next/navigation'
import { Building2, ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HotelSwitcherProps {
  currentHotelName: string
  currentHotelId: string
}

export function HotelSwitcher({ currentHotelName, currentHotelId }: HotelSwitcherProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { data: hotels } = useUserHotels()
  const switchHotel = useSwitchHotel()
  const router = useRouter()

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Solo mostrar si hay más de un hotel
  if (!hotels || hotels.length <= 1) {
    return (
      <div className="flex items-center gap-2 text-sm text-text-primary">
        <Building2 className="h-4 w-4 text-text-secondary" />
        <span>{currentHotelName}</span>
      </div>
    )
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-text-primary hover:bg-bg-hover"
      >
        <Building2 className="h-4 w-4 text-text-secondary" />
        <span>{currentHotelName}</span>
        <ChevronDown className={cn('h-4 w-4 text-text-muted transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-md border border-border bg-bg-card py-1 shadow-lg">
          {hotels.map((hotel) => (
            <button
              key={hotel.hotel_id}
              onClick={() => {
                if (hotel.hotel_id !== currentHotelId) {
                  switchHotel.mutate(hotel.hotel_id, {
                    onSuccess: () => {
                      // Decisión D9: redirect a dashboard on hotel switch
                      router.push('/dashboard')
                      router.refresh()
                    },
                  })
                }
                setOpen(false)
              }}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-left text-sm',
                hotel.hotel_id === currentHotelId
                  ? 'text-accent'
                  : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
              )}
            >
              {hotel.hotel_id === currentHotelId && <Check className="h-4 w-4" />}
              {hotel.hotel_id !== currentHotelId && <span className="w-4" />}
              <span>{hotel.hotel_name}</span>
              <span className="ml-auto text-xs text-text-muted">{hotel.role}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
