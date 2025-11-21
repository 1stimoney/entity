/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

/* shadcn-style UI imports (Option A) */
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

type Withdrawal = {
  id: string
  amount: number
  status: string
  bank_name?: string
  account_number?: string
  account_name?: string
  created_at?: string
}

/**
 * Illustration path (developer-uploaded). You can transform this to a public URL,
 * or move the file to /public/illustrations and change the path later.
 */
const illustrationPath = '/illustration.png'

export default function WithdrawPage() {
  const [user, setUser] = useState<any>(null)
  const [balance, setBalance] = useState<number>(0)
  const [banks, setBanks] = useState<any[]>([])
  const [bankCode, setBankCode] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [amount, setAmount] = useState<number | ''>('')

  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [history, setHistory] = useState<Withdrawal[]>([])

  /* -------------------------
     Load user & balance
  -------------------------*/
  useEffect(() => {
    ;(async () => {
      try {
        const { data } = await supabase.auth.getUser()
        const u = data?.user ?? null
        setUser(u)

        if (u?.email) {
          const { data: profile, error } = await supabase
            .from('users')
            .select('balance')
            .eq('email', u.email)
            .single()

          if (error) {
            console.error('profile load error:', error)
            toast.error('Failed to load profile.')
          } else {
            setBalance(Number(profile?.balance ?? 0))
          }
        }
      } catch (err) {
        console.error(err)
        toast.error('Could not load user.')
      }
    })()
  }, [])

  /* -------------------------
     Load banks
  -------------------------*/
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/withdraw/banks')
        const json = await res.json()
        setBanks(json.data || json.banks || [])
      } catch (err) {
        console.error('banks fetch error:', err)
        toast.error('Failed to load banks.')
      }
    })()
  }, [])

  /* -------------------------
     Resolve account
  -------------------------*/
  const resolveAccount = async () => {
    if (!bankCode || accountNumber.length < 6) return
    setLoading(true)
    try {
      const res = await fetch('/api/withdraw/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bank_code: bankCode,
          account_number: accountNumber,
        }),
      })
      const json = await res.json()
      if (json.status) {
        setAccountName(json.account_name)
        toast.success('Account resolved — confirm the name.')
      } else {
        setAccountName('')
        toast.error(json.message || 'Could not resolve account.')
      }
    } catch (err) {
      console.error('resolve error:', err)
      toast.error('Server error resolving account.')
    } finally {
      setLoading(false)
    }
  }

  /* -------------------------
     Submit withdrawal
  -------------------------*/
  const submitWithdraw = async () => {
    if (!user) return toast.error('You must be logged in.')
    if (!bankCode || !accountNumber || !accountName)
      return toast.error('Confirm account details first.')
    if (!amount || Number(amount) <= 0)
      return toast.error('Enter valid amount.')
    if (Number(amount) > balance) return toast.error('Insufficient balance.')

    setLoading(true)
    try {
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

      if (json.status) {
        toast.success('Withdrawal initiated successfully.')
        setBalance((prev) => prev - Number(amount))

        setAmount('')
        setBankCode('')
        setAccountNumber('')
        setAccountName('')

        // reload history
        loadHistory()
      } else {
        console.error('withdraw request failed', json)
        toast.error(json.message || 'Withdrawal failed.')
      }
    } catch (err) {
      console.error('submitWithdraw error:', err)
      toast.error('Server error while initiating withdrawal.')
    } finally {
      setLoading(false)
    }
  }

  /* -------------------------
     Load history
  -------------------------*/
  const loadHistory = async () => {
    if (!user?.email) return
    setLoadingHistory(true)
    try {
      const { data, error } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('email', user.email)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('history load error:', error)
        toast.error('Failed to load history.')
        setHistory([])
      } else {
        setHistory(data || [])
      }
    } catch (err) {
      console.error('history fetch error:', err)
      toast.error('Failed to load history.')
    } finally {
      setLoadingHistory(false)
    }
  }

  useEffect(() => {
    if (user?.email) loadHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  /* -------------------------
       UI Render
  -------------------------*/
  return (
    <div className='max-w-3xl mx-auto p-6 space-y-8'>
      {/* HEADER */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6 items-center'>
        <div className='md:col-span-2 space-y-2'>
          <h1 className='text-3xl font-bold'>Withdraw Funds</h1>
          <p className='text-sm text-gray-600'>
            Available Balance:{' '}
            <span className='font-semibold text-black'>
              ₦{balance.toLocaleString()}
            </span>
          </p>
        </div>

        <div className='hidden md:flex justify-end items-center'>
          {/* small illustration on the right */}
          <div className='w-36 h-24 rounded-lg overflow-hidden shadow-sm'>
            <Image
              src={illustrationPath}
              alt='withdraw illustration'
              width={360}
              height={240}
              className='object-cover'
            />
          </div>
        </div>
      </div>

      {/* FORM CARD */}
      <Card className='p-6 rounded-2xl'>
        <CardHeader>
          <CardTitle className='text-lg font-semibold'>
            Make a Withdrawal
          </CardTitle>
        </CardHeader>

        <CardContent className='space-y-4'>
          {/* Bank */}
          <div>
            <label className='block text-sm font-medium mb-2'>Bank</label>
            <Select onValueChange={(val) => setBankCode(val)}>
              <SelectTrigger className='w-full'>
                <SelectValue placeholder='Select bank' />
              </SelectTrigger>
              <SelectContent>
                {banks.length === 0 ? (
                  <SelectItem value='Select bank'>
                    No banks available
                  </SelectItem>
                ) : (
                  banks.map((b) => (
                    <SelectItem key={b.code} value={b.code}>
                      {b.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Account Number */}
          <div>
            <label className='block text-sm font-medium mb-2'>
              Account Number
            </label>
            <Input
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              onBlur={resolveAccount}
              placeholder='e.g. 0061234567'
            />
          </div>

          {/* Account name */}
          {accountName && (
            <div className='text-sm text-green-600 font-medium'>
              {accountName}
            </div>
          )}

          {/* Amount */}
          <div>
            <label className='block text-sm font-medium mb-2'>Amount</label>
            <Input
              type='number'
              value={amount}
              onChange={(e) =>
                setAmount(e.target.value === '' ? '' : Number(e.target.value))
              }
              placeholder='Enter amount'
            />
            <p className='text-xs text-gray-500 mt-1'>
              Max withdrawable:{' '}
              <span className='font-semibold'>₦{balance.toLocaleString()}</span>
            </p>
          </div>

          {/* CTA */}
          <div className='flex items-center gap-3'>
            <Button
              onClick={submitWithdraw}
              disabled={loading}
              className='flex-1'
            >
              {loading ? (
                <span className='flex items-center gap-2'>
                  <Loader2 className='w-4 h-4 animate-spin' /> Processing...
                </span>
              ) : (
                'Withdraw'
              )}
            </Button>

            <Button
              variant='outline'
              onClick={() => {
                // quick refill demo - open contact page (or replace with top-up logic)
                window.location.href = '/contact-us'
              }}
            >
              Need help?
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* HISTORY */}
      <div className='space-y-4'>
        <h2 className='text-xl font-semibold'>Withdrawal History</h2>

        {loadingHistory ? (
          <div className='grid gap-4'>
            <Skeleton className='h-20 rounded-lg' />
            <Skeleton className='h-20 rounded-lg' />
          </div>
        ) : history.length === 0 ? (
          <Card className='p-6 text-center'>
            <p className='text-gray-600'>No withdrawals yet.</p>
            <p className='text-sm text-gray-500 mt-2'>
              Make a withdrawal and it&apos;ll show up here.
            </p>
          </Card>
        ) : (
          <div className='grid gap-4'>
            {history.map((w) => (
              <Card key={w.id} className='p-4 flex justify-between items-start'>
                <div>
                  <div className='flex items-center gap-3'>
                    <div>
                      <div className='text-base font-semibold'>
                        ₦{Number(w.amount).toLocaleString()}
                      </div>
                      <div className='text-xs text-gray-500'>
                        to {w.account_name ?? w.account_number}
                      </div>
                    </div>
                  </div>

                  <div className='text-xs text-gray-500 mt-2'>
                    {w.bank_name}
                  </div>
                </div>

                <div className='text-right'>
                  <div>
                    <Badge
                      variant={
                        w.status === 'success'
                          ? 'default'
                          : w.status === 'failed'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {w.status}
                    </Badge>
                  </div>

                  <div className='text-xs text-gray-400 mt-2'>
                    {w.created_at
                      ? new Date(w.created_at).toLocaleDateString()
                      : ''}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
