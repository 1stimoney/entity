'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import AuthGuard from '@/components/AuthGuard'

export default function LoginPage() {
  const router = useRouter()
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [showReset, setShowReset] = useState(false)

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMsg('')
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setErrorMsg(error.message)
      setLoading(false)
      return
    }

    setLoading(false)
    router.push('/dashboard')
  }

  const handleReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const email = formData.get('reset_email') as string

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/update-password',
    })

    if (error) {
      alert(error.message)
      return
    }

    alert('Password reset link sent to your email.')
    setShowReset(false)
  }

  return (
    <AuthGuard>
      <div className='flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4'>
        <Card className='p-8 w-full max-w-md space-y-6 shadow-2xl rounded-2xl border border-gray-200'>
          <div className='text-center space-y-2'>
            <h1 className='text-3xl font-bold text-blue-600'>
              Welcome Back to Entity
            </h1>
            <p className='text-gray-600'>
              Login to your account and continue investing
            </p>
          </div>
          {errorMsg && (
            <p className='text-red-500 text-sm text-center'>{errorMsg}</p>
          )}

          {!showReset ? (
            <form onSubmit={handleLogin} className='space-y-4'>
              <Input type='email' name='email' placeholder='Email' required />
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
                {loading ? 'Logging In...' : 'Login'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleReset} className='space-y-4'>
              <Input
                type='email'
                name='reset_email'
                placeholder='Enter your email'
                required
              />
              <Button type='submit' className='w-full py-3 text-lg'>
                Send Reset Link
              </Button>
              <p className='text-right text-sm'>
                <button
                  type='button'
                  onClick={() => setShowReset(false)}
                  className='text-gray-600 hover:underline'
                >
                  Back to Login
                </button>
              </p>
            </form>
          )}

          <p className='text-center text-gray-500 text-sm'>
            Don&apos;t have an account?{' '}
            <a
              href='/sign-up'
              className='text-blue-600 font-medium hover:underline'
            >
              Sign Up
            </a>
          </p>
          {!showReset && (
            <p className='text-center text-sm mt-2'>
              <button
                type='button'
                onClick={() => setShowReset(true)}
                className='text-blue-600 hover:underline'
              >
                Forgot Password?
              </button>
            </p>
          )}
        </Card>
      </div>
    </AuthGuard>
  )
}
