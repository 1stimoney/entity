'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

export default function ChangePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const updatePassword = async () => {
    setLoading(true)

    const { error } = await supabase.auth.updateUser({
      password,
    })

    setLoading(false)

    if (!error) router.push('/profile')
  }

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className='min-h-screen bg-gray-100'>
      <div className='flex justify-end p-4'>
        <button onClick={logout}>
          <LogOut className='w-6 h-6 text-gray-700' />
        </button>
      </div>

      <div className='max-w-lg mx-auto bg-white p-6 rounded-2xl shadow mt-10'>
        <h1 className='text-xl font-semibold mb-4'>Change Password</h1>

        <input
          type='password'
          placeholder='New password'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className='w-full p-3 border rounded-xl'
        />

        <button
          onClick={updatePassword}
          className='w-full py-3 bg-black text-white rounded-xl mt-4'
        >
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </div>
    </div>
  )
}
