/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

export default function WithdrawPage() {
  const [user, setUser] = useState<any>(null)
  const [balance, setBalance] = useState<number>(0)
  const [banks, setBanks] = useState<any[]>([])
  const [bankCode, setBankCode] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [amount, setAmount] = useState<number | ''>('')
  const [loading, setLoading] = useState(false)

  // load session & profile
  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      const u = data?.user ?? null
      setUser(u)

      if (u?.email) {
        const { data: profile } = await supabase
          .from('users')
          .select('balance')
          .eq('email', u.email)
          .single()

        setBalance(Number(profile?.balance ?? 0))
      }
    })()
  }, [])

  // load transfer-supported banks (server route)
  useEffect(() => {
    ;(async () => {
      const res = await fetch('/api/withdraw/banks')
      const json = await res.json()
      // endpoint returns array in data.data or data
      setBanks(json.data || json.banks || [])
    })()
  }, [])

  // resolve account on blur
  const resolveAccount = async () => {
    if (!bankCode || accountNumber.length < 6) return
    setLoading(true)
    const res = await fetch('/api/withdraw/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bank_code: bankCode,
        account_number: accountNumber,
      }),
    })
    const json = await res.json()
    setLoading(false)
    if (json.status) {
      setAccountName(json.account_name)
    } else {
      alert(json.message || 'Could not resolve account')
      setAccountName('')
    }
  }

  // submit withdrawal
  const submitWithdraw = async () => {
    if (!user) return alert('You must be logged in')
    if (!bankCode || !accountNumber || !accountName)
      return alert('Confirm account details first.')
    if (!amount || Number(amount) <= 0) return alert('Enter valid amount')
    if (Number(amount) > balance) return alert('Insufficient balance')

    setLoading(true)
    const res = await fetch('/api/withdraw/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        email: user.email,
        amount: Number(amount),
        bank_code: bankCode,
        bank_name: banks.find((b) => b.code === bankCode)?.name ?? '',
        account_number: accountNumber,
        account_name: accountName,
      }),
    })
    const json = await res.json()
    setLoading(false)

    if (json.status) {
      alert('Withdrawal initiated. Check withdrawals page for status.')
      // update local balance
      setBalance((prev) => prev - Number(amount))
      setAmount('')
      setAccountNumber('')
      setAccountName('')
      setBankCode('')
    } else {
      alert(json.message || 'Withdrawal failed')
    }
  }

  return (
    <div className='p-6 max-w-md mx-auto space-y-4'>
      <h1 className='text-2xl font-bold'>Withdraw Funds</h1>
      <p>Available Balance: ₦{Number(balance).toLocaleString()}</p>

      <label className='block mt-2'>Select bank</label>
      <select
        value={bankCode}
        onChange={(e) => setBankCode(e.target.value)}
        className='w-full border p-2 rounded'
      >
        <option value=''>Choose bank</option>
        {banks.map((b: any) => (
          <option key={b.code} value={b.code}>
            {b.name} ({b.code})
          </option>
        ))}
      </select>

      <label className='block mt-2'>Account number</label>
      <input
        value={accountNumber}
        onChange={(e) => setAccountNumber(e.target.value)}
        onBlur={resolveAccount}
        className='w-full border p-2 rounded'
        placeholder='e.g. 0061234567'
      />

      {accountName && (
        <p className='text-green-600'>Account Name: {accountName}</p>
      )}

      <label className='block mt-2'>Amount</label>
      <input
        type='number'
        value={amount}
        onChange={(e) =>
          setAmount(e.target.value === '' ? '' : Number(e.target.value))
        }
        className='w-full border p-2 rounded'
        placeholder='Enter amount'
      />

      <button
        disabled={loading}
        onClick={submitWithdraw}
        className='mt-4 bg-black text-white px-4 py-2 rounded'
      >
        {loading ? 'Processing...' : 'Withdraw'}
      </button>
    </div>
  )
}
