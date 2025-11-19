/* eslint-disable react-hooks/immutability */
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

export default function EditProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return router.push('/login')

    const { data } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('email', user.email)
      .single()

    if (data) {
      setFirstName(data.first_name || '')
      setLastName(data.last_name || '')
    }

    setLoading(false)
  }

  const updateProfile = async () => {
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    await supabase
      .from('users')
      .update({
        first_name: firstName,
        last_name: lastName,
      })
      .eq('email', user?.email)

    setLoading(false)
    router.push('/profile')
  }

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className='min-h-screen bg-gray-100 flex flex-col'>
      {/* NAV */}
      <div className='flex justify-end p-4'>
        <button onClick={logout}>
          <LogOut className='w-6 h-6 text-gray-700' />
        </button>
      </div>

      <div className='max-w-xl mx-auto bg-white p-6 rounded-2xl shadow'>
        <h1 className='text-xl font-semibold mb-4'>Edit Profile</h1>

        <div className='space-y-4'>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder='First name'
            className='w-full p-3 border rounded-xl'
          />

          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder='Last name'
            className='w-full p-3 border rounded-xl'
          />

          <button
            onClick={updateProfile}
            className='w-full py-3 bg-black text-white rounded-xl'
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
