/* eslint-disable react-hooks/immutability */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { LogOut, ChevronRight } from 'lucide-react'

export default function ProfilePage() {
  const router = useRouter()

  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return router.push('/login')

    setUser(user)

    const { data } = await supabase
      .from('users')
      .select('first_name, last_name, avatar_url, email')
      .eq('id', user.id)
      .single()

    setProfile(data)
  }

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
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

        {/* LINKS */}
        <div className='mt-8 bg-white rounded-2xl shadow divide-y'>
          {/* Edit Profile */}
          <button
            onClick={() => router.push('/profile/edit')}
            className='w-full flex justify-between items-center p-4 text-left'
          >
            <span className='font-medium'>Edit Profile</span>
            <ChevronRight className='w-5 h-5 text-gray-500' />
          </button>

          {/* Change Avatar */}
          <button
            onClick={() => router.push('/profile/avatar')}
            className='w-full flex justify-between items-center p-4 text-left'
          >
            <span className='font-medium'>Change Profile Picture</span>
            <ChevronRight className='w-5 h-5 text-gray-500' />
          </button>

          {/* Change Password */}
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
