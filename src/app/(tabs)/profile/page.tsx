/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const router = useRouter()

  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      const authUser = data?.user ?? null

      if (!authUser) {
        router.push('/login')
        return
      }

      setUser(authUser)

      // Fetch profile
      const { data: profileData } = await supabase
        .from('users')
        .select('*')
        .eq('email', authUser.email)
        .single()

      setProfile(profileData)

      setFirstName(profileData?.first_name || '')
      setLastName(profileData?.last_name || '')

      setLoading(false)
    })()
  }, [])

  const saveProfile = async () => {
    if (!profile?.email) return

    setSaving(true)

    const { error } = await supabase
      .from('users')
      .update({
        first_name: firstName,
        last_name: lastName,
      })
      .eq('email', profile.email)

    setSaving(false)

    if (error) return alert('Failed to save changes')

    alert('Profile updated successfully!')
  }

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading)
    return <div className='p-6 text-center text-gray-500'>Loading profile…</div>

  return (
    <div className='max-w-lg mx-auto p-6 space-y-10'>
      {/* HEADER */}
      <div className='space-y-1'>
        <h1 className='text-3xl font-bold'>My Profile</h1>
        <p className='text-gray-500'>Manage your account information</p>
      </div>

      {/* PROFILE CARD */}
      <div className='bg-white shadow-sm border rounded-xl p-5 space-y-4'>
        {/* Email */}
        <div>
          <label className='block mb-1 text-sm font-medium'>Email</label>
          <input
            disabled
            value={user.email}
            className='w-full border rounded-lg p-2 bg-gray-100 text-gray-600'
          />
        </div>

        {/* First Name */}
        <div>
          <label className='block mb-1 text-sm font-medium'>First Name</label>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className='w-full border rounded-lg p-2'
            placeholder='Enter first name'
          />
        </div>

        {/* Last Name */}
        <div>
          <label className='block mb-1 text-sm font-medium'>Last Name</label>
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className='w-full border rounded-lg p-2'
            placeholder='Enter last name'
          />
        </div>

        {/* Balance */}
        <div>
          <p className='text-sm font-medium'>Wallet Balance</p>
          <p className='text-xl font-bold'>
            ₦{Number(profile.balance).toLocaleString()}
          </p>
        </div>

        {/* Save Button */}
        <button
          disabled={saving}
          onClick={saveProfile}
          className='w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-900 transition'
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {/* Logout */}
      <button
        onClick={logout}
        className='w-full border border-red-500 text-red-600 py-3 rounded-lg font-semibold'
      >
        Logout
      </button>
    </div>
  )
}
