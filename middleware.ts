import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If environment variables are missing on host, pass through safely without 500 crash
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // Refresh session without blocking public routes
    const { data: { user } } = await supabase.auth.getUser()

    const url = request.nextUrl.clone()
    const pathname = url.pathname

    // Public routes: QR confirmation page, order tracking (/track and /track/*), and auth pages
    const publicRoutes = ['/c/', '/track', '/auth/', '/api/']
    const isPublic = publicRoutes.some(p => pathname.startsWith(p) || pathname === p) || pathname === '/'

    // Dashboard routes require auth
    if (!isPublic && !user) {
      url.pathname = '/auth/login'
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }

    // Authenticated users on auth pages → redirect to dashboard
    if (user && pathname.startsWith('/auth/')) {
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    return supabaseResponse
  } catch (err) {
    console.error('Middleware execution error:', err)
    return NextResponse.next({ request })
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
