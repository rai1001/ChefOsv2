import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Rutas que no requieren auth
  const authFreePaths = ['/login', '/signup', '/forgot-password', '/callback']
  const isAuthFreePath = authFreePaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  )

  // Onboarding requiere auth pero no hotel
  const isOnboarding = request.nextUrl.pathname.startsWith('/onboarding')

  if (!user && !isAuthFreePath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Usuarios autenticados en páginas de auth (excepto callback y onboarding) → redirect a home
  if (user && isAuthFreePath && request.nextUrl.pathname !== '/callback') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
