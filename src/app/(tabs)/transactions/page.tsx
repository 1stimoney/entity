'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  FileText,
  Users,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type TransactionRow = {
  id: string
  type: 'investment' | 'withdrawal' | string
  amount: number
  status: string
  created_at: string
  // investments
  plan_id?: string | null
  plan_name?: string | null
  // withdrawals
  bank_name?: string | null
  account_number?: string | null
  account_name?: string | null
  // generic
  note?: string | null
  source?: 'transactions' | 'withdrawals'
}

// Illustration path (developer-provided file)
// You can move file to /public/illustrations and update this path accordingly.
const illustrationPath = '/illustration.png'

const PER_PAGE = 10

export default function TransactionsPage() {
  const [user, setUser] = useState<any | null>(null)
  const [plansMap, setPlansMap] = useState<Record<string, string>>({})
  const [items, setItems] = useState<TransactionRow[]>([])
  const [page, setPage] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [filter, setFilter] = useState<
    'all' | 'pending' | 'successful' | 'failed'
  >('all')
  const [search, setSearch] = useState('')
  const observerRef = useRef<HTMLDivElement | null>(null)

  // Load user & plans once
  useEffect(() => {
    async function loadUserAndPlans() {
      try {
        const { data } = await supabase.auth.getUser()
        if (!data?.user) {
          setUser(null)
        } else {
          setUser(data.user)
        }

        // load plans for plan name resolution
        const { data: plans } = await supabase
          .from('investment_plans')
          .select('id, name')
        const planMap: Record<string, string> = {}

        ;(plans || []).forEach((p: any) => {
          planMap[p.id] = p.name
        })

        setPlansMap(planMap)
      } catch (err) {
        console.error('init load error', err)
        toast.error('Failed to initialize transactions page.')
      }
    }

    loadUserAndPlans()
  }, [])

  // Helper - unify/normalize records
  const normalize = (trxRows: any[] = [], wdRows: any[] = []) => {
    const t: TransactionRow[] = []
    trxRows.forEach((r: any) => {
      t.push({
        id: r.id,
        type: r.type ?? 'investment',
        amount: Number(r.amount),
        status: r.status ?? 'pending',
        created_at: r.created_at,
        plan_id: r.plan_id ?? null,
        plan_name: r.plan_id ? plansMap[r.plan_id] ?? null : null,
        note: r.note ?? null,
        source: 'transactions',
      })
    })
    ;(wdRows || []).forEach((w: any) => {
      t.push({
        id: `wd-${w.id}`,
        type: 'withdrawal',
        amount: Number(w.amount),
        status: w.status ?? 'initiated',
        created_at: w.created_at,
        bank_name: w.bank_name ?? null,
        account_number: w.account_number ?? null,
        account_name: w.account_name ?? null,
        note: w.error ?? null,
        source: 'withdrawals',
      })
    })

    // merge by created_at desc
    t.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    return t
  }

  // Load combined page - uses range-based paging for each table and merges
  const loadPage = useCallback(
    async (pageIndex: number) => {
      try {
        if (pageIndex === 0) {
          setIsLoading(true)
        } else {
          setIsLoadingMore(true)
        }

        const start = pageIndex * PER_PAGE
        const end = start + PER_PAGE - 1

        // fetch transactions page
        const trxPromise = supabase
          .from('transactions')
          .select('*')
          .order('created_at', { ascending: false })
          .range(start, end)

        // fetch withdrawals page
        const wdPromise = supabase
          .from('withdrawals')
          .select('*')
          .order('created_at', { ascending: false })
          .range(start, end)

        const [trxRes, wdRes] = await Promise.all([trxPromise, wdPromise])
        if (trxRes.error) {
          console.error('trx fetch error', trxRes.error)
          toast.error('Failed to fetch transactions.')
        }
        if (wdRes.error) {
          console.error('wd fetch error', wdRes.error)
          toast.error('Failed to fetch withdrawals.')
        }

        const newItems = normalize(trxRes.data || [], wdRes.data || [])

        // If first page, replace; else append & dedupe by id
        setItems((prev) => {
          if (pageIndex === 0) return newItems
          const merged = [...prev, ...newItems]
          // dedupe by id preserving order
          const dedup: Record<string, boolean> = {}
          const out: TransactionRow[] = []
          for (const it of merged) {
            if (!dedup[it.id]) {
              dedup[it.id] = true
              out.push(it)
            }
          }
          return out
        })

        // Simple heuristic: if both results length < PER_PAGE then no more (not perfect but works)
        const more =
          (trxRes.data?.length || 0) >= PER_PAGE ||
          (wdRes.data?.length || 0) >= PER_PAGE
        setHasMore(Boolean(more))
      } catch (err) {
        console.error('loadPage error', err)
        toast.error('Failed loading data.')
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    [plansMap]
  )

  // Initial load + when filter/search changes reset to page 0
  useEffect(() => {
    setPage(0)
    loadPage(0)
  }, [loadPage, filter, search])

  // infinite scroll observer
  useEffect(() => {
    if (!observerRef.current) return
    const node = observerRef.current
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && hasMore && !isLoadingMore && !isLoading) {
            setPage((p) => {
              const next = p + 1
              loadPage(next)
              return next
            })
          }
        })
      },
      { root: null, rootMargin: '0px', threshold: 0.2 }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [hasMore, isLoadingMore, isLoading, loadPage])

  // Filtered & searched view (client side)
  const visibleItems = items.filter((it) => {
    if (
      filter === 'pending' &&
      it.status !== 'pending' &&
      it.status !== 'initiated' &&
      it.status !== 'processing'
    )
      return false
    if (
      filter === 'successful' &&
      !['success', 'completed'].includes(it.status)
    )
      return false
    if (filter === 'failed' && !['failed', 'error'].includes(it.status))
      return false
    if (
      search &&
      !JSON.stringify(it).toLowerCase().includes(search.toLowerCase())
    )
      return false
    return true
  })

  // Group by date: returns { label: string, items: TransactionRow[] }[]
  const grouped = (() => {
    const groups: Record<string, TransactionRow[]> = {}
    visibleItems.forEach((it) => {
      const d = new Date(it.created_at)
      const today = new Date()
      const yesterday = new Date()
      yesterday.setDate(today.getDate() - 1)

      const sameDay = (a: Date, b: Date) =>
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()

      let label = d.toLocaleDateString()
      if (sameDay(d, today)) label = 'Today'
      else if (sameDay(d, yesterday)) label = 'Yesterday'
      groups[label] = groups[label] || []
      groups[label].push(it)
    })

    // convert to array sorted by date descending
    const ordered = Object.keys(groups)
      .map((label) => ({ label, items: groups[label] }))
      // sort groups by latest item in group
      .sort((a, b) => {
        const ta = new Date(a.items[0].created_at).getTime()
        const tb = new Date(b.items[0].created_at).getTime()
        return tb - ta
      })

    return ordered
  })()

  // helpers
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(n)

  const typeIcon = (type: string) => {
    if (type === 'investment')
      return <ArrowUpRight className='w-5 h-5 text-green-600' />
    if (type === 'withdrawal')
      return <ArrowDownLeft className='w-5 h-5 text-red-600' />
    return <DollarSign className='w-5 h-5 text-gray-600' />
  }

  return (
    <div className='max-w-6xl mx-auto p-6 space-y-6'>
      {/* Header */}
      <div className='grid md:grid-cols-2 gap-6 items-center'>
        <div>
          <h1 className='text-3xl font-bold'>Transactions</h1>
          <p className='text-gray-600 mt-1'>
            Combined investment & withdrawal activity timeline.
          </p>
        </div>

        <div className='flex items-center gap-3 justify-end'>
          <input
            placeholder='Search transactions...'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='border p-2 rounded-lg w-72'
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className='border p-2 rounded-lg'
          >
            <option value='all'>All</option>
            <option value='pending'>Pending</option>
            <option value='successful'>Successful</option>
            <option value='failed'>Failed</option>
          </select>
        </div>
      </div>

      {/* Illustration */}
      <div className='w-full flex justify-center'>
        <div className='w-full max-w-md rounded-xl overflow-hidden shadow'>
          <Image
            src={illustrationPath}
            alt='transactions illustration'
            width={800}
            height={320}
            className='object-cover'
          />
        </div>
      </div>

      {/* Quick links */}
      <div className='flex gap-3'>
        <Link href='/dashboard'>
          <Button variant='ghost'>Back to Dashboard</Button>
        </Link>
        <Link href='/withdraw'>
          <Button>Withdraw</Button>
        </Link>
        <Link href='/invest-now'>
          <Button variant='outline'>Invest</Button>
        </Link>
      </div>

      {/* List groups */}
      <div className='space-y-6'>
        {grouped.length === 0 ? (
          <Card className='p-6 text-center'>
            <p className='text-gray-600'>No transactions match your query.</p>
          </Card>
        ) : (
          grouped.map((g) => (
            <div key={g.label} className='space-y-3'>
              <h3 className='text-sm text-gray-500 font-semibold'>{g.label}</h3>

              <div className='space-y-3'>
                <AnimatePresence initial={false}>
                  {g.items.map((it) => (
                    <motion.div
                      key={it.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                    >
                      <Card className='p-4 flex items-center justify-between'>
                        <div className='flex items-center gap-4 min-w-0'>
                          <div className='w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center'>
                            {typeIcon(it.type)}
                          </div>

                          <div className='min-w-0'>
                            <div className='flex items-center gap-2'>
                              <div className='font-semibold text-sm truncate'>
                                {it.type === 'investment'
                                  ? `Investment — ${it.plan_name ?? 'Plan'}`
                                  : 'Withdrawal'}
                              </div>

                              <Badge
                                variant={
                                  it.status === 'success' ||
                                  it.status === 'completed'
                                    ? 'default'
                                    : it.status === 'failed' ||
                                      it.status === 'error'
                                    ? 'destructive'
                                    : 'secondary'
                                }
                              >
                                {it.status}
                              </Badge>
                            </div>

                            <div className='text-xs text-gray-500 truncate'>
                              {it.source === 'transactions'
                                ? `Tx: ${it.id}`
                                : `Ref: ${it.id}`}
                              {it.type === 'withdrawal' && it.bank_name
                                ? ` • ${it.bank_name}`
                                : ''}
                              {it.type === 'investment' && it.plan_name
                                ? ` • ${it.plan_name}`
                                : ''}
                            </div>
                          </div>
                        </div>

                        {/* right column */}
                        <div className='text-right min-w-[140px]'>
                          <div
                            className={`font-semibold ${
                              it.type === 'withdrawal'
                                ? 'text-red-600'
                                : 'text-green-600'
                            }`}
                          >
                            {fmt(it.amount)}
                          </div>
                          <div className='text-xs text-gray-400 mt-1'>
                            {new Date(it.created_at).toLocaleString()}
                          </div>

                          {/* Expand details small */}
                          {it.type === 'withdrawal' && (
                            <div className='text-xs text-gray-500 mt-2'>
                              <div>{it.account_name ?? ''}</div>
                              <div className='truncate'>
                                {it.account_number ?? ''}
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))
        )}
      </div>

      {/* sentinel for infinite scroll */}
      <div ref={observerRef} />

      {/* loading more indicator */}
      {isLoadingMore && (
        <div className='py-6 text-center'>
          <Loader2 className='animate-spin mx-auto h-6 w-6 text-gray-600' />
        </div>
      )}

      {!hasMore && items.length > 0 && (
        <p className='text-center text-gray-500 py-6'>
          You&apos;ve reached the end.
        </p>
      )}
    </div>
  )
}
