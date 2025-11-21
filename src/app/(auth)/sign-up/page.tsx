/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import AuthGuard from '@/components/AuthGuard'

export default function SignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [referralInput, setReferralInput] = useState('')
  const [referrer, setReferrer] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) {
      setReferrer(ref)
      setReferralInput(ref) // autofill input
    }
  }, [searchParams])

  const generateReferralCode = (first_name: string) => {
    return (
      first_name.slice(0, 3).toUpperCase() +
      Math.floor(100000 + Math.random() * 900000)
    )
  }

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

    const age = Math.floor((Date.now() - new Date(dob).getTime()) / 3.15576e10)
    if (age < 18) {
      setErrorMsg('You must be at least 18 years old to register.')
      setLoading(false)
      return
    }

    // Find referrer (from URL OR manual input)
    let referred_by = null
    if (referralInput.trim() !== '') {
      const { data: refUser } = await supabase
        .from('users')
        .select('id')
        .eq('referral_code', referralInput.trim())
        .single()

      if (refUser) referred_by = refUser.id
    }

    // Signup the user in auth
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

    // Create referral code for this new user
    const referral_code = generateReferralCode(first_name)

    // Insert user entry
    await supabase.from('users').insert({
      id: data.user?.id,
      first_name,
      last_name,
      email,
      dob,
      referral_code,
      referred_by,
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

            {/* Referral Code Field */}
            <Input
              type='text'
              name='referral_code'
              placeholder='Referral Code (Optional)'
              value={referralInput}
              onChange={(e) => setReferralInput(e.target.value)}
              disabled={!!referrer} // disable if link was used
              className={referrer ? 'bg-gray-100 cursor-not-allowed' : ''}
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
