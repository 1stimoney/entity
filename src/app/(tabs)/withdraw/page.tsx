/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function WithdrawPage() {
  const [user, setUser] = useState<any>(null)
  const [balance, setBalance] = useState<number>(0)
  const [banks, setBanks] = useState<any[]>([])
  const [bankCode, setBankCode] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [amount, setAmount] = useState<number | ''>('')

  const [loading, setLoading] = useState(false)

  const [history, setHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  /* ------------------------------
        Load User + Balance
  -------------------------------*/
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

  /* ------------------------------
              Load Banks
  -------------------------------*/
  useEffect(() => {
    ;(async () => {
      const res = await fetch('/api/withdraw/banks')
      const json = await res.json()
      setBanks(json.data || json.banks || [])
    })()
  }, [])

  /* ------------------------------
       Resolve Account Details
  -------------------------------*/
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

  /* ------------------------------
          Submit Withdrawal
  -------------------------------*/
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
      alert('Withdrawal initiated successfully.')
      setBalance((prev) => prev - Number(amount))

      // Reset fields
      setAmount('')
      setBankCode('')
      setAccountNumber('')
      setAccountName('')

      // Reload history
      loadHistory()
    } else {
      alert(json.message || 'Withdrawal failed')
    }
  }

  /* ------------------------------
       Load Withdrawal History
  -------------------------------*/
  const loadHistory = async () => {
    if (!user?.email) return

    setLoadingHistory(true)

    const { data, error } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('email', user.email) // FIXED HERE
      .order('created_at', { ascending: false })

    if (!error) setHistory(data || [])
    setLoadingHistory(false)
  }

  useEffect(() => {
    if (user?.email) loadHistory()
  }, [user])

  /* ------------------------------
               UI
  -------------------------------*/
  return (
    <div className='p-6 max-w-lg mx-auto space-y-10'>
      {/* HEADER */}
      <div>
        <h1 className='text-3xl font-bold'>Withdraw Funds</h1>
        <p className='text-gray-500 mt-1'>
          Available Balance:{' '}
          <span className='font-semibold text-black'>
            ₦{balance.toLocaleString()}
          </span>
        </p>
      </div>

      {/* WITHDRAWAL FORM */}
      <div className='bg-white shadow-md border rounded-xl p-6 space-y-5'>
        {/* Bank Dropdown */}
        <div>
          <label className='block text-sm font-medium mb-1'>Bank</label>
          <select
            value={bankCode}
            onChange={(e) => setBankCode(e.target.value)}
            className='w-full border rounded-lg p-3 bg-gray-50'
          >
            <option value=''>Select bank</option>
            {banks.map((b) => (
              <option key={b.code} value={b.code}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Account Number */}
        <div>
          <label className='block text-sm font-medium mb-1'>
            Account Number
          </label>
          <input
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            onBlur={resolveAccount}
            className='w-full border rounded-lg p-3'
            placeholder='Enter account number'
          />
        </div>

        {/* Account Name */}
        {accountName && (
          <p className='text-green-600 text-sm font-semibold'>{accountName}</p>
        )}

        {/* Amount */}
        <div>
          <label className='block text-sm font-medium mb-1'>Amount</label>
          <input
            type='number'
            value={amount}
            onChange={(e) =>
              setAmount(e.target.value === '' ? '' : Number(e.target.value))
            }
            className='w-full border rounded-lg p-3'
            placeholder='Amount'
          />
        </div>

        {/* Withdraw Button */}
        <button
          disabled={loading}
          onClick={submitWithdraw}
          className='w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-900 transition disabled:opacity-40'
        >
          {loading ? 'Processing...' : 'Withdraw'}
        </button>
      </div>

      {/* WITHDRAWAL HISTORY */}
      <div className='space-y-4'>
        <h2 className='text-xl font-semibold'>Withdrawal History</h2>

        {loadingHistory ? (
          <p className='text-gray-500'>Loading history…</p>
        ) : history.length === 0 ? (
          <p className='text-gray-500'>No withdrawals yet.</p>
        ) : (
          <div className='space-y-3'>
            {history.map((w) => (
              <div
                key={w.id}
                className='border bg-white shadow-sm p-4 rounded-xl'
              >
                <div className='flex justify-between'>
                  <p className='font-semibold'>
                    ₦{Number(w.amount).toLocaleString()}
                  </p>

                  <span
                    className={`text-sm font-semibold ${
                      w.status === 'success'
                        ? 'text-green-600'
                        : w.status === 'failed'
                        ? 'text-red-600'
                        : 'text-orange-500'
                    }`}
                  >
                    {w.status}
                  </span>
                </div>

                <p className='text-sm text-gray-600'>{w.bank_name}</p>

                <p className='text-xs text-gray-500'>
                  {new Date(w.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
