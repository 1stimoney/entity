/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Loader2, Timer, Layers, Coins } from 'lucide-react'

const VALIDITY_DAYS = 30

type InvestmentRow = {
  id: string
  created_at: string
  amount: number | null
  package_id: string
  user_id: string
  status: string | null
  source_transaction_id: string | null

  // optional (if you added these later)
  daily_return?: number | null
  start_at?: string | null
  end_at?: string | null
}

type PlanRow = {
  id: string
  name: string | null
  amount: number | null
  daily_return: number | null
}

type PayoutRow = {
  id: string
  investment_id: string
  amount: number | null
}

function fmtNGN(n: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(n)
}

function addDays(dateIso: string, days: number) {
  const d = new Date(dateIso)
  d.setDate(d.getDate() + days)
  return d
}

function daysLeft(createdAtIso: string, days: number) {
  const expiry = addDays(createdAtIso, days).getTime()
  const now = Date.now()
  const diff = expiry - now
  if (diff <= 0) return 0
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function isActive(createdAtIso: string, days: number, status?: string | null) {
  const s = (status ?? '').toLowerCase()
  if (['cancelled', 'canceled', 'failed', 'error'].includes(s)) return false
  return Date.now() < addDays(createdAtIso, days).getTime()
}

function statusVariant(status?: string | null) {
  const s = (status ?? '').toLowerCase()
  if (['active', 'running', 'success', 'successful', 'completed'].includes(s))
    return 'default'
  if (['cancelled', 'canceled', 'failed', 'error'].includes(s))
    return 'destructive'
  return 'secondary'
}

export default function MyInvestmentsPage() {
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  const [investments, setInvestments] = useState<InvestmentRow[]>([])
  const [plansMap, setPlansMap] = useState<Record<string, PlanRow>>({})
  const [earnedMap, setEarnedMap] = useState<Record<string, number>>({})

  useEffect(() => {
    ;(async () => {
      setLoading(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setUserId(null)
        setLoading(false)
        return
      }

      setUserId(user.id)

      // 1) Load investments
      const invRes = await supabase
        .from('investments')
        .select(
          'id,created_at,amount,package_id,user_id,status,source_transaction_id,daily_return,start_at,end_at'
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      const inv = (invRes.data ?? []) as InvestmentRow[]
      setInvestments(inv)

      // 2) Load plans referenced by investments
      const planIds = Array.from(new Set(inv.map((i) => i.package_id))).filter(
        Boolean
      )

      if (planIds.length) {
        const plansRes = await supabase
          .from('investment_plans')
          .select('id,name,amount,daily_return')
          .in('id', planIds)

        const map: Record<string, PlanRow> = {}
        ;(plansRes.data ?? []).forEach((p: any) => {
          map[p.id] = p as PlanRow
        })
        setPlansMap(map)
      } else {
        setPlansMap({})
      }

      // 3) Load payouts for these investments (total earned)
      const invIds = inv.map((i) => i.id)
      if (invIds.length) {
        const payoutsRes = await supabase
          .from('investment_payouts')
          .select('id,investment_id,amount')
          .eq('user_id', user.id)
          .in('investment_id', invIds)

        const earn: Record<string, number> = {}
        ;(payoutsRes.data ?? []).forEach((p: any) => {
          const key = String(p.investment_id)
          earn[key] = (earn[key] || 0) + Number(p.amount ?? 0)
        })
        setEarnedMap(earn)
      } else {
        setEarnedMap({})
      }

      setLoading(false)
    })()
  }, [])

  const totals = useMemo(() => {
    const totalInvested = investments.reduce(
      (sum, i) => sum + Number(i.amount ?? plansMap[i.package_id]?.amount ?? 0),
      0
    )
    const totalEarned = Object.values(earnedMap).reduce((a, b) => a + b, 0)
    const activeCount = investments.filter((i) =>
      isActive(i.created_at, VALIDITY_DAYS, i.status)
    ).length

    return { totalInvested, totalEarned, activeCount }
  }, [investments, plansMap, earnedMap])

  return (
    <ProtectedRoute>
      <div className='mx-auto max-w-4xl p-6 space-y-6'>
        {/* Header */}
        <div className='flex items-start justify-between gap-4'>
          <div>
            <Link href='/dashboard'>
              <Button variant='ghost' size='sm' className='gap-2'>
                <ArrowLeft className='h-4 w-4' />
                Back to Dashboard
              </Button>
            </Link>

            <h1 className='text-3xl font-bold mt-2'>My Investments</h1>
            <p className='text-sm text-slate-600 mt-1'>
              Track your active plans, daily returns and earnings.
            </p>
          </div>

          <Link href='/invest-now'>
            <Button className='rounded-xl'>New Investment</Button>
          </Link>
        </div>

        {/* Summary */}
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
          <Card className='rounded-2xl'>
            <CardHeader>
              <CardTitle className='text-sm text-slate-600 flex items-center gap-2'>
                <Layers className='h-4 w-4' /> Active investments
              </CardTitle>
            </CardHeader>
            <CardContent className='text-2xl font-bold'>
              {loading ? '…' : totals.activeCount}
            </CardContent>
          </Card>

          <Card className='rounded-2xl'>
            <CardHeader>
              <CardTitle className='text-sm text-slate-600 flex items-center gap-2'>
                <Coins className='h-4 w-4' /> Total invested
              </CardTitle>
            </CardHeader>
            <CardContent className='text-xl font-bold'>
              {loading ? '…' : fmtNGN(totals.totalInvested)}
            </CardContent>
          </Card>

          <Card className='rounded-2xl'>
            <CardHeader>
              <CardTitle className='text-sm text-slate-600 flex items-center gap-2'>
                <Coins className='h-4 w-4' /> Total earned
              </CardTitle>
            </CardHeader>
            <CardContent className='text-xl font-bold text-green-700'>
              {loading ? '…' : fmtNGN(totals.totalEarned)}
            </CardContent>
          </Card>
        </div>

        {/* List */}
        <Card className='rounded-2xl overflow-hidden'>
          <CardHeader>
            <CardTitle>Investments</CardTitle>
          </CardHeader>

          <Separator />

          <CardContent className='p-0'>
            {loading ? (
              <div className='p-6 flex items-center gap-2 text-slate-600'>
                <Loader2 className='h-5 w-5 animate-spin' /> Loading
                investments…
              </div>
            ) : investments.length === 0 ? (
              <div className='p-6 text-slate-600'>
                You have no investments yet.
                <div className='mt-3'>
                  <Link href='/invest-now'>
                    <Button>Start investing</Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className='divide-y'>
                {investments.map((inv) => {
                  const plan = plansMap[inv.package_id]
                  const planName = plan?.name ?? 'Investment Plan'
                  const invested = Number(inv.amount ?? plan?.amount ?? 0)
                  const earned = Number(earnedMap[inv.id] ?? 0)
                  const active = isActive(
                    inv.created_at,
                    VALIDITY_DAYS,
                    inv.status
                  )
                  const left = daysLeft(inv.created_at, VALIDITY_DAYS)
                  const daily =
                    Number(inv.daily_return ?? plan?.daily_return ?? 0) || 0
                  const expires = addDays(inv.created_at, VALIDITY_DAYS)

                  return (
                    <div key={inv.id} className='p-5'>
                      <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4'>
                        <div className='min-w-0'>
                          <div className='flex items-center gap-2'>
                            <div className='font-semibold text-lg truncate'>
                              {planName}
                            </div>
                            <Badge variant={active ? 'default' : 'secondary'}>
                              {active ? 'Active' : 'Expired'}
                            </Badge>
                            <Badge variant={statusVariant(inv.status)}>
                              {inv.status ?? 'active'}
                            </Badge>
                          </div>

                          <div className='text-sm text-slate-600 mt-1'>
                            Invested:{' '}
                            <span className='font-medium'>
                              {fmtNGN(invested)}
                            </span>
                            {' • '}
                            Daily return:{' '}
                            <span className='font-medium text-green-700'>
                              {fmtNGN(daily)}
                            </span>
                          </div>

                          <div className='text-xs text-slate-500 mt-2 flex items-center gap-2'>
                            <Timer className='h-4 w-4' />
                            {active ? (
                              <span>
                                Days left:{' '}
                                <span className='font-medium'>{left}</span>
                              </span>
                            ) : (
                              <span>
                                Expired on:{' '}
                                <span className='font-medium'>
                                  {expires.toLocaleDateString()}
                                </span>
                              </span>
                            )}
                          </div>

                          <div className='text-[11px] text-slate-400 mt-2 break-all'>
                            Investment ID: {inv.id}
                          </div>
                        </div>

                        <div className='sm:text-right'>
                          <div className='text-sm text-slate-500'>
                            Total earned
                          </div>
                          <div className='text-xl font-bold text-green-700'>
                            {fmtNGN(earned)}
                          </div>

                          {inv.source_transaction_id ? (
                            <div className='text-xs text-slate-500 mt-2'>
                              Source Tx:{' '}
                              {String(inv.source_transaction_id).slice(0, 12)}…
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Small note */}
        {userId ? (
          <p className='text-xs text-slate-500'>
            Payouts are credited daily. If you just invested, your first payout
            will appear after the next run.
          </p>
        ) : null}
      </div>
    </ProtectedRoute>
  )
}
