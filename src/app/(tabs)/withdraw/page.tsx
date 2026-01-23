/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Loader2, Search } from 'lucide-react'

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
import { Separator } from '@/components/ui/separator'

type Withdrawal = {
  id: string
  amount: number
  status: string
  bank_name?: string
  account_number?: string
  account_name?: string
  created_at?: string
}

const illustrationPath = '/illustration.png'

// ---- Withdrawal rules ----
const TAX_RATE = 0.04
const MIN_WITHDRAWAL = 2000

function fmtNGN(n: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(n)
}

export default function WithdrawPage() {
  const [user, setUser] = useState<any>(null)
  const [balance, setBalance] = useState<number>(0)

  const [banks, setBanks] = useState<any[]>([])
  const [bankSearch, setBankSearch] = useState('')
  const [bankCode, setBankCode] = useState('')

  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [amount, setAmount] = useState<number | ''>('')

  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [history, setHistory] = useState<Withdrawal[]>([])

  const selectedBankName = useMemo(() => {
    return banks.find((b) => b.code === bankCode)?.name ?? ''
  }, [banks, bankCode])

  const amountNumber = useMemo(() => {
    if (amount === '') return 0
    return Number(amount) || 0
  }, [amount])

  const fee = useMemo(() => {
    // round to whole naira
    return Math.max(0, Math.round(amountNumber * TAX_RATE))
  }, [amountNumber])

  const net = useMemo(() => {
    return Math.max(0, amountNumber - fee)
  }, [amountNumber, fee])

  const filteredBanks = useMemo(() => {
    const q = bankSearch.trim().toLowerCase()
    if (!q) return banks
    return banks.filter((b) =>
      String(b.name ?? '')
        .toLowerCase()
        .includes(q)
    )
  }, [banks, bankSearch])

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
    if (!bankCode) return
    if (accountNumber.trim().length < 10) return // NGN accounts are usually 10 digits

    setLoading(true)
    try {
      const res = await fetch('/api/withdraw/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bank_code: bankCode,
          account_number: accountNumber.trim(),
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
     Submit withdrawal
  -------------------------*/
  const submitWithdraw = async () => {
    if (!user) return toast.error('You must be logged in.')
    if (!bankCode) return toast.error('Select your bank.')
    if (!accountNumber.trim()) return toast.error('Enter account number.')
    if (!accountName) return toast.error('Resolve account first.')

    if (!amountNumber || amountNumber <= 0)
      return toast.error('Enter a valid amount.')

    if (amountNumber < MIN_WITHDRAWAL) {
      return toast.error(
        `Minimum withdrawal is ₦${MIN_WITHDRAWAL.toLocaleString()}.`
      )
    }

    if (amountNumber > balance) return toast.error('Insufficient balance.')

    if (net <= 0) {
      return toast.error('Net amount must be greater than ₦0.')
    }

    setLoading(true)
    try {
      const res = await fetch('/api/withdraw/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          email: user.email,

          // gross amount user requested
          amount: amountNumber,

          // extra fields (recommended to store)
          fee,
          net_amount: net,

          bank_code: bankCode,
          bank_name: selectedBankName,
          account_number: accountNumber.trim(),
          account_name: accountName,
        }),
      })

      const json = await res.json()

      if (json.status) {
        toast.success('Withdrawal initiated successfully.')

        // subtract the gross amount from UI balance (what user chose to withdraw)
        setBalance((prev) => prev - amountNumber)

        setAmount('')
        setBankCode('')
        setBankSearch('')
        setAccountNumber('')
        setAccountName('')

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

  const canSubmit =
    !!user &&
    !!bankCode &&
    accountNumber.trim().length >= 10 &&
    !!accountName &&
    amountNumber >= MIN_WITHDRAWAL &&
    amountNumber <= balance &&
    !loading

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

          <div className='flex flex-wrap gap-2 pt-1'>
            <Badge variant='secondary'>
              Minimum: ₦{MIN_WITHDRAWAL.toLocaleString()}
            </Badge>
            <Badge variant='secondary'>
              Fee: {Math.round(TAX_RATE * 100)}%
            </Badge>
          </div>
        </div>

        <div className='hidden md:flex justify-end items-center'>
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

            <Select
              value={bankCode}
              onValueChange={(val) => {
                setBankCode(val)
                // reset account details when bank changes
                setAccountName('')
              }}
            >
              <SelectTrigger className='w-full'>
                <SelectValue placeholder='Select bank' />
              </SelectTrigger>

              <SelectContent>
                {/* Search input inside dropdown */}
                <div className='p-2'>
                  <div className='relative'>
                    <Search className='absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500' />
                    <input
                      value={bankSearch}
                      onChange={(e) => setBankSearch(e.target.value)}
                      placeholder='Search bank...'
                      className='w-full rounded-md border bg-white px-8 py-2 text-sm outline-none'
                    />
                  </div>
                </div>

                <Separator />

                {banks.length === 0 ? (
                  <SelectItem value='__none__' disabled>
                    No banks available
                  </SelectItem>
                ) : filteredBanks.length === 0 ? (
                  <SelectItem value='__no_match__' disabled>
                    No bank matches “{bankSearch}”
                  </SelectItem>
                ) : (
                  filteredBanks.map((b) => (
                    <SelectItem key={b.code} value={b.code}>
                      {b.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            {bankCode && selectedBankName ? (
              <p className='text-xs text-slate-500 mt-1'>
                Selected:{' '}
                <span className='font-medium'>{selectedBankName}</span>
              </p>
            ) : null}
          </div>

          {/* Account Number */}
          <div>
            <label className='block text-sm font-medium mb-2'>
              Account Number
            </label>
            <Input
              value={accountNumber}
              onChange={(e) => {
                // digits only
                const v = e.target.value.replace(/\D/g, '')
                setAccountNumber(v)
                setAccountName('')
              }}
              onBlur={resolveAccount}
              placeholder='e.g. 0061234567'
              maxLength={10}
              inputMode='numeric'
            />
            <p className='text-xs text-slate-500 mt-1'>
              We’ll auto-resolve your account name after you finish typing.
            </p>
          </div>

          {/* Account name */}
          {accountName ? (
            <div className='text-sm text-green-600 font-medium'>
              {accountName}
            </div>
          ) : bankCode && accountNumber.trim().length === 10 ? (
            <div className='text-xs text-slate-500 flex items-center gap-2'>
              {loading ? <Loader2 className='h-4 w-4 animate-spin' /> : null}
              {loading
                ? 'Resolving account…'
                : 'Account name will appear here.'}
            </div>
          ) : null}

          {/* Amount */}
          <div>
            <label className='block text-sm font-medium mb-2'>Amount</label>
            <Input
              type='number'
              value={amount}
              onChange={(e) =>
                setAmount(e.target.value === '' ? '' : Number(e.target.value))
              }
              placeholder={`Minimum ₦${MIN_WITHDRAWAL.toLocaleString()}`}
              min={MIN_WITHDRAWAL}
            />

            <div className='mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm'>
              <div className='rounded-xl border p-3'>
                <div className='text-xs text-slate-500'>
                  Fee ({Math.round(TAX_RATE * 100)}%)
                </div>
                <div className='font-semibold'>{fmtNGN(fee)}</div>
              </div>

              <div className='rounded-xl border p-3'>
                <div className='text-xs text-slate-500'>You’ll receive</div>
                <div className='font-semibold text-green-700'>
                  {fmtNGN(net)}
                </div>
              </div>

              <div className='rounded-xl border p-3'>
                <div className='text-xs text-slate-500'>Max withdrawable</div>
                <div className='font-semibold'>{fmtNGN(balance)}</div>
              </div>
            </div>

            {amountNumber > 0 && amountNumber < MIN_WITHDRAWAL ? (
              <p className='text-xs text-red-600 mt-2'>
                Minimum withdrawal is ₦{MIN_WITHDRAWAL.toLocaleString()}.
              </p>
            ) : null}
          </div>

          {/* CTA */}
          <div className='flex items-center gap-3'>
            <Button
              onClick={submitWithdraw}
              disabled={!canSubmit}
              className='flex-1'
            >
              {loading ? (
                <span className='flex items-center gap-2'>
                  <Loader2 className='w-4 h-4 animate-spin' /> Processing...
                </span>
              ) : (
                `Withdraw ${amountNumber ? fmtNGN(amountNumber) : ''}`.trim()
              )}
            </Button>

            <Button
              variant='outline'
              onClick={() => {
                window.location.href = '/contact-us'
              }}
            >
              Need help?
            </Button>
          </div>

          <p className='text-xs text-slate-500'>
            By continuing, you agree that a {Math.round(TAX_RATE * 100)}%
            processing fee will be deducted and you will receive the net amount
            shown above.
          </p>
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
                  <div className='text-base font-semibold'>
                    ₦{Number(w.amount).toLocaleString()}
                  </div>
                  <div className='text-xs text-gray-500'>
                    to {w.account_name ?? w.account_number}
                  </div>
                  <div className='text-xs text-gray-500 mt-2'>
                    {w.bank_name}
                  </div>
                </div>

                <div className='text-right'>
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
