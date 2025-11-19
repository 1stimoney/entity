/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/immutability */
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ContactPage() {
  const router = useRouter()

  const [user, setUser] = useState<any>(null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      setUser(user)

      const { data: profile } = await supabase
        .from('users')
        .select('first_name, last_name, email')
        .eq('id', user.id)
        .single()

      if (profile) {
        setFullName(`${profile.first_name} ${profile.last_name}`)
        setEmail(profile.email)
      }
    }
  }

  const sendMessage = async () => {
    if (!fullName || !email || !message) return alert('Please fill all fields.')

    setLoading(true)

    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user?.id || null,
        full_name: fullName,
        email,
        message,
      }),
    })

    const json = await res.json()
    setLoading(false)

    if (json.status) {
      alert("Message sent. We'll get back to you shortly.")
      setMessage('')
    } else {
      alert(json.message || 'Failed to send message.')
    }
  }

  return (
    <div className='min-h-screen bg-gray-100 p-6 flex justify-center'>
      <div className='w-full max-w-lg space-y-6'>
        <h1 className='text-3xl font-bold'>Contact Us</h1>
        <p className='text-gray-600 -mt-3'>
          Have any questions or need support? Send us a message.
        </p>

        <div className='bg-white p-6 rounded-2xl shadow space-y-4'>
          {/* Full Name */}
          <div>
            <label className='text-sm font-medium'>Full Name</label>
            <input
              className='w-full p-3 border rounded-lg mt-1'
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder='Enter your name'
            />
          </div>

          {/* Email */}
          <div>
            <label className='text-sm font-medium'>Email</label>
            <input
              className='w-full p-3 border rounded-lg mt-1'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder='Enter your email'
            />
          </div>

          {/* Message */}
          <div>
            <label className='text-sm font-medium'>Message</label>
            <textarea
              rows={5}
              className='w-full p-3 border rounded-lg mt-1'
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder='Write your message...'
            />
          </div>

          {/* Submit */}
          <button
            onClick={sendMessage}
            disabled={loading}
            className='w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-900 transition'
          >
            {loading ? 'Sending...' : 'Send Message'}
          </button>
        </div>
      </div>
    </div>
  )
}
