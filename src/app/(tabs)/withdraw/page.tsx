/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'

type Withdrawal = {
  id: string
  amount: number
  status: string
  bank_name?: string
  account_number?: string
  account_name?: string
  created_at?: string
}

type Bank = {
  code: string
  name: string
}

const illustrationPath = '/illustration.png'

// ✅ Business rules
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

  const [banks, setBanks] = useState<Bank[]>([])
  const [bankCode, setBankCode] = useState('')
  const [bankOpen, setBankOpen] = useState(false)

  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [amount, setAmount] = useState<number | ''>('')

  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [history, setHistory] = useState<Withdrawal[]>([])

  const selectedBank = useMemo(
    () => banks.find((b) => b.code === bankCode) ?? null,
    [banks, bankCode]
  )

  // ✅ Live fee/net preview (UI-only; server is source of truth)
  const fee = useMemo(() => {
    const a = Number(amount)
    if (!Number.isFinite(a) || a <= 0) return 0
    return Math.max(0, Math.round(a * TAX_RATE))
  }, [amount])

  const netReceive = useMemo(() => {
    const a = Number(amount)
    if (!Number.isFinite(a) || a <= 0) return 0
    return Math.max(0, Math.round(a - fee))
  }, [amount, fee])

  const amountNum = useMemo(() => {
    const a = Number(amount)
    return Number.isFinite(a) ? a : 0
  }, [amount])

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
        const list = (json.data || json.banks || []) as any[]
        setBanks(
          list
            .map((b) => ({
              code: String(b.code),
              name: String(b.name),
            }))
            .filter((b) => b.code && b.name)
        )
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
    if (!bankCode) return toast.error('Select a bank first.')
    if (accountNumber.trim().length < 6) return

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
    if (!accountName.trim()) return toast.error('Resolve account first.')

    if (!amountNum || amountNum <= 0) return toast.error('Enter valid amount.')
    if (amountNum < MIN_WITHDRAWAL)
      return toast.error(
        `Minimum withdrawal is ₦${MIN_WITHDRAWAL.toLocaleString()}`
      )
    if (amountNum > balance) return toast.error('Insufficient balance.')

    // UI note: Server decides final net/fee. This is just display.
    if (netReceive <= 0)
      return toast.error('Net amount must be greater than ₦0.')

    setLoading(true)
    try {
      const res = await fetch('/api/withdraw/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          email: user.email,
          amount: amountNum, // ✅ GROSS amount user typed; server sends NET to Flutterwave
          bank_code: bankCode,
          bank_name: selectedBank?.name ?? '',
          account_number: accountNumber.trim(),
          account_name: accountName.trim(),
        }),
      })

      const json = await res.json()

      if (json.status) {
        toast.success('Withdrawal initiated successfully.')

        // balance decreases by gross amount
        setBalance((prev) => prev - amountNum)

        setAmount('')
        setBankCode('')
        setAccountNumber('')
        setAccountName('')
        setBankOpen(false)

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
          {/* Bank (Searchable Combobox) */}
          <div>
            <label className='block text-sm font-medium mb-2'>Bank</label>

            <Popover open={bankOpen} onOpenChange={setBankOpen}>
              <PopoverTrigger asChild>
                <Button
                  type='button'
                  variant='outline'
                  className='w-full justify-between'
                >
                  {selectedBank ? selectedBank.name : 'Select bank'}
                  <ChevronsUpDown className='ml-2 h-4 w-4 opacity-60' />
                </Button>
              </PopoverTrigger>

              <PopoverContent
                className='w-[--radix-popover-trigger-width] p-0'
                align='start'
              >
                <Command>
                  <CommandInput placeholder='Search bank...' />
                  <CommandList>
                    <CommandEmpty>No bank found.</CommandEmpty>
                    <CommandGroup>
                      {banks.map((b) => (
                        <CommandItem
                          key={b.code}
                          value={`${b.name} ${b.code}`}
                          onSelect={() => {
                            setBankCode(b.code)
                            setBankOpen(false)
                            // Reset resolved name when bank changes
                            setAccountName('')
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              bankCode === b.code ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          {b.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <p className='text-xs text-gray-500 mt-2'>
              Minimum withdrawal:{' '}
              <span className='font-semibold'>{fmtNGN(MIN_WITHDRAWAL)}</span>
            </p>
          </div>

          {/* Account Number */}
          <div>
            <label className='block text-sm font-medium mb-2'>
              Account Number
            </label>
            <Input
              value={accountNumber}
              onChange={(e) => {
                setAccountNumber(e.target.value)
                setAccountName('')
              }}
              onBlur={resolveAccount}
              placeholder='e.g. 0061234567'
            />
            <p className='text-xs text-gray-500 mt-2'>
              Tip: enter number then click outside to resolve.
            </p>
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
              min={MIN_WITHDRAWAL}
            />

            <div className='mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2'>
              <div className='rounded-xl border p-3'>
                <div className='text-xs text-gray-500'>Fee (4%)</div>
                <div className='font-semibold'>{fmtNGN(fee)}</div>
              </div>

              <div className='rounded-xl border p-3'>
                <div className='text-xs text-gray-500'>You’ll receive</div>
                <div className='font-semibold text-green-700'>
                  {fmtNGN(netReceive)}
                </div>
              </div>

              <div className='rounded-xl border p-3'>
                <div className='text-xs text-gray-500'>Max withdrawable</div>
                <div className='font-semibold'>{fmtNGN(balance)}</div>
              </div>
            </div>
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
                  <div className='text-base font-semibold'>
                    ₦{Number(w.amount).toLocaleString()}
                  </div>
                  <div className='text-xs text-gray-500 mt-1'>
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
