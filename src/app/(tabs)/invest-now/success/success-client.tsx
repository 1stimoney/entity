/* eslint-disable react-hooks/set-state-in-effect */
'use client'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

export default function InvestSuccessPage() {
  const router = useRouter()
  const params = useSearchParams()
  const [status, setStatus] = useState<'checking' | 'success' | 'failed'>(
    'checking'
  )

  useEffect(() => {
    const transaction_id = params.get('transaction_id')
    const tx_ref = params.get('tx_ref')

    if (!transaction_id || !tx_ref) {
      setStatus('failed')
      return
    }

    async function verify() {
      try {
        const res = await fetch('/api/verify-flutterwave', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transaction_id, tx_ref }),
        })

        const json = await res.json()
        if (json.status) {
          setStatus('success')
        } else {
          setStatus('failed')
          console.error('verify failed:', json)
        }
      } catch (err) {
        console.error('verify error:', err)
        setStatus('failed')
      }
      // auto-redirect to dashboard in 2s
      setTimeout(() => router.push('/dashboard'), 2000)
    }

    verify()
  }, [params])

  return (
    <div className='p-8 text-center'>
      {status === 'checking' && <p>Verifying payment…</p>}
      {status === 'success' && (
        <>
          <h1 className='text-2xl font-bold text-green-600'>
            Payment verified!
          </h1>
          <p>Your investment is now recorded. Redirecting to dashboard…</p>
        </>
      )}
      {status === 'failed' && (
        <>
          <h1 className='text-2xl font-bold text-red-600'>
            Verification failed
          </h1>
          <p>Please contact support or try again.</p>
        </>
      )}
    </div>
  )
}
