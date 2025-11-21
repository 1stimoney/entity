/* eslint-disable react-hooks/immutability */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { LogOut, ChevronRight, Copy } from 'lucide-react'

export default function ProfilePage() {
  const router = useRouter()

  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [referrals, setReferrals] = useState<any[]>([])
  const [referralCode, setReferralCode] = useState<string>('')

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return router.push('/login')
    setUser(user)

    // Load profile
    const { data } = await supabase
      .from('users')
      .select('first_name, last_name, avatar_url, email, referral_code')
      .eq('id', user.id)
      .single()

    setProfile(data)
    setReferralCode(data?.referral_code || '')

    // Load referred users (from users table)
    const { data: refList } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, created_at')
      .eq('referred_by', user.id)
      .order('created_at', { ascending: false })

    setReferrals(refList || [])
  }

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const copyLink = () => {
    navigator.clipboard.writeText(
      `${process.env.NEXT_PUBLIC_APP_URL}/sign-up?ref=${referralCode}`
    )
  }

  return (
    <div className='min-h-screen bg-gray-100'>
      {/* NAV */}
      <div className='flex justify-end p-4'>
        <button onClick={logout}>
          <LogOut className='w-6 h-6 text-gray-700' />
        </button>
      </div>

      {/* CONTENT */}
      <div className='max-w-lg mx-auto p-6'>
        {/* USER CARD */}
        <div className='bg-white rounded-2xl shadow p-6 text-center'>
          <img
            src={
              profile?.avatar_url ||
              'https://via.placeholder.com/150?text=Avatar'
            }
            className='w-24 h-24 rounded-full mx-auto object-cover'
          />

          <h1 className='text-xl font-semibold mt-3'>
            {profile?.first_name} {profile?.last_name}
          </h1>

          <p className='text-gray-500 text-sm mt-1'>{profile?.email}</p>
        </div>

        {/* REFERRAL SECTION */}
        <div className='bg-white shadow rounded-2xl p-6 mt-8'>
          <h2 className='text-lg font-semibold mb-2'>Referral Program</h2>

          {/* Referral Link */}
          <div className='bg-gray-100 p-3 rounded-lg flex justify-between items-center'>
            <p className='text-sm break-all'>
              {process.env.NEXT_PUBLIC_APP_URL}/sign-up?ref={referralCode}
            </p>
            <button onClick={copyLink}>
              <Copy className='w-5 h-5 text-black' />
            </button>
          </div>

          {/* Referral Code Only */}
          <p className='mt-3 text-center text-sm text-gray-600'>
            Your Referral Code:
          </p>
          <p className='text-center text-xl font-bold tracking-wider'>
            {referralCode}
          </p>

          <p className='text-gray-500 text-sm mt-2'>
            Earn ₦2,000 when someone signs up with your link and makes an
            investment.
          </p>

          {/* Referral List */}
          <h3 className='font-semibold mt-5 mb-3'>Your Referrals</h3>

          {referrals.length === 0 ? (
            <p className='text-gray-500 text-sm'>You have no referrals yet.</p>
          ) : (
            <div className='space-y-3'>
              {referrals.map((r) => (
                <div key={r.id} className='border p-4 rounded-lg bg-white'>
                  <p className='font-semibold'>
                    {r.first_name} {r.last_name}
                  </p>
                  <p className='text-sm text-gray-600'>{r.email}</p>
                  <p className='text-xs text-gray-500 mt-1'>
                    {new Date(r.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* LINKS */}
        <div className='mt-8 bg-white rounded-2xl shadow divide-y'>
          <button
            onClick={() => router.push('/profile/edit')}
            className='w-full flex justify-between items-center p-4 text-left'
          >
            <span className='font-medium'>Edit Profile</span>
            <ChevronRight className='w-5 h-5 text-gray-500' />
          </button>

          <button
            onClick={() => router.push('/profile/avatar')}
            className='w-full flex justify-between items-center p-4 text-left'
          >
            <span className='font-medium'>Change Profile Picture</span>
            <ChevronRight className='w-5 h-5 text-gray-500' />
          </button>

          <button
            onClick={() => router.push('/profile/password')}
            className='w-full flex justify-between items-center p-4 text-left'
          >
            <span className='font-medium'>Change Password</span>
            <ChevronRight className='w-5 h-5 text-gray-500' />
          </button>
        </div>
      </div>
    </div>
  )
}
