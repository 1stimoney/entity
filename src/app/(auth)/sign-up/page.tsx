'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import AuthGuard from '@/components/AuthGuard'

export default function SignupPage() {
  const router = useRouter()
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMsg('')
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const first_name = formData.get('first_name') as string
    const last_name = formData.get('last_name') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const dob = formData.get('dob') as string

    // Age validation
    const age = Math.floor((Date.now() - new Date(dob).getTime()) / 3.15576e10)
    if (age < 18) {
      setErrorMsg('You must be at least 18 years old to register.')
      setLoading(false)
      return
    }

    // Sign up with Supabase
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name, last_name, dob },
      },
    })

    if (error) {
      setErrorMsg(error.message)
      setLoading(false)
      return
    }

    // Insert into public users table
    await supabase.from('users').insert({
      id: data.user?.id,
      first_name,
      last_name,
      email,
      dob,
    })

    setLoading(false)
    router.push('/dashboard')
  }

  return (
    <AuthGuard>
      <div className='flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4'>
        <Card className='p-8 w-full max-w-md space-y-6 shadow-2xl rounded-2xl border border-gray-200'>
          <div className='text-center space-y-2'>
            <h1 className='text-3xl font-bold text-blue-600'>
              Welcome to Entity
            </h1>
            <p className='text-gray-600'>
              Create your account and start investing securely
            </p>
          </div>
          {errorMsg && (
            <p className='text-red-500 text-sm text-center'>{errorMsg}</p>
          )}
          <form onSubmit={handleSignup} className='space-y-4'>
            <div className='flex gap-4'>
              <Input
                type='text'
                name='first_name'
                placeholder='First Name'
                required
              />
              <Input
                type='text'
                name='last_name'
                placeholder='Last Name'
                required
              />
            </div>
            <Input type='email' name='email' placeholder='Email' required />
            <Input
              type='date'
              name='dob'
              placeholder='Date of Birth'
              required
            />
            <Input
              type='password'
              name='password'
              placeholder='Password'
              required
            />
            <Button
              type='submit'
              className='w-full py-3 text-lg'
              disabled={loading}
            >
              {loading ? 'Signing Up...' : 'Sign Up'}
            </Button>
          </form>
          <p className='text-center text-gray-500 text-sm'>
            Already have an account?{' '}
            <a
              href='/login'
              className='text-blue-600 font-medium hover:underline'
            >
              Login
            </a>
          </p>
        </Card>
      </div>
    </AuthGuard>
  )
}
