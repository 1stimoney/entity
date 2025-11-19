/* eslint-disable react-hooks/immutability */
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

export default function AvatarUploadPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    getUser()
  }, [])

  const getUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return router.push('/login')

    setUserId(user.id)
  }

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return

    setPreview(URL.createObjectURL(file))
    setUploading(true)

    const filePath = `${userId}.png`

    await supabase.storage.from('avatars').upload(filePath, file, {
      upsert: true,
    })

    // Save URL in users table
    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)

    await supabase
      .from('users')
      .update({ avatar_url: data.publicUrl })
      .eq('id', userId)

    setUploading(false)
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
        <h1 className='text-xl font-semibold mb-4'>Upload Avatar</h1>

        {preview && (
          <img
            src={preview}
            className='w-32 h-32 rounded-full object-cover mx-auto mb-4'
          />
        )}

        <input
          type='file'
          accept='image/*'
          onChange={uploadAvatar}
          className='w-full p-3 border rounded-xl'
        />

        {uploading && (
          <p className='text-center text-gray-600 mt-2'>Uploading...</p>
        )}
      </div>
    </div>
  )
}
