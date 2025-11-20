/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowDownLeft, ArrowUpRight, Wallet, Loader2 } from 'lucide-react'
import ProtectedRoute from '@/components/ProtectedRoute'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      const u = data?.user
      setUser(u)

      if (u?.email) {
        const { data: profile } = await supabase
          .from('users')
          .select('first_name, last_name, balance')
          .eq('email', u.email)
          .single()

        setBalance(profile?.balance || 0)
      }

      setLoading(false)
    })()
  }, [])

  return (
    <ProtectedRoute>
      <div className='p-6 space-y-8 max-w-3xl mx-auto'>
        {/* HEADER */}
        <div>
          <h1 className='text-3xl font-bold'>
            Hello,{' '}
            {loading
              ? '...'
              : `${user?.user_metadata?.first_name || ''} ${
                  user?.user_metadata?.last_name || ''
                }`}
          </h1>
          <p className='text-gray-500 mt-1'>Welcome back 👋</p>
        </div>

        {/* BALANCE CARD */}
        <Card className='border shadow-sm rounded-2xl'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-lg'>
              <Wallet className='h-5 w-5' />
              Available Balance
            </CardTitle>
          </CardHeader>

          <CardContent>
            {loading ? (
              <p className='text-3xl font-bold flex items-center gap-2'>
                <Loader2 className='h-6 w-6 animate-spin' /> Loading…
              </p>
            ) : (
              <p className='text-4xl font-bold'>₦{balance.toLocaleString()}</p>
            )}

            <div className='mt-4 flex gap-3'>
              <Link href='/withdraw'>
                <Button className='w-full bg-black text-white rounded-xl py-5 text-base'>
                  Withdraw Funds
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* QUICK ACTIONS */}
        <div>
          <h2 className='text-xl font-semibold mb-2'>Quick Actions</h2>
          <div className='grid grid-cols-2 gap-4'>
            <Link href='/invest-now'>
              <Card className='p-5 rounded-2xl hover:shadow-md transition cursor-pointer'>
                <CardContent className='flex flex-col items-center gap-3'>
                  <ArrowUpRight className='h-6 w-6 text-green-600' />
                  <p className='font-semibold'>Invest</p>
                </CardContent>
              </Card>
            </Link>

            <Link href='/withdraw'>
              <Card className='p-5 rounded-2xl hover:shadow-md transition cursor-pointer'>
                <CardContent className='flex flex-col items-center gap-3'>
                  <ArrowDownLeft className='h-6 w-6 text-red-600' />
                  <p className='font-semibold'>Withdraw</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* RECENT ACTIVITY */}
        <div className='space-y-3'>
          <h2 className='text-xl font-semibold'>Recent Transactions</h2>

          <Card className='rounded-2xl border shadow-sm'>
            <CardContent className='py-5 text-center text-gray-500'>
              (Coming soon)
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  )
}
