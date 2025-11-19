'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface AuthGuardProps {
  children: React.ReactNode
  redirectTo?: string
}

export default function AuthGuard({
  children,
  redirectTo = '/dashboard',
}: AuthGuardProps) {
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session) {
        router.replace(redirectTo)
      } else {
        setLoading(false)
      }
    }
    checkAuth()
  }, [router, redirectTo])

  if (loading) return null // or a loading spinner

  return <>{children}</>
}
