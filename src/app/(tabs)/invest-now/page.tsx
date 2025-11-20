/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Loader2, Info, Star, MessageSquare, Clock } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import Link from 'next/link'

// ---------- Types ----------
type Plan = {
  id: string
  name: string
  amount: number
  description?: string | null
  created_at?: string
  tags?: string[]
  benefits?: string[]
}

type User = {
  id: string
  email: string
}

// ---------- Component ----------
export default function InvestNowPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)

  // UI state
  const [loginOpen, setLoginOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activePlan, setActivePlan] = useState<Plan | null>(null)

  // Illustration path (uploaded file)
  const illustrationPath = '/globe.svg'

  useEffect(() => {
    // load session user
    async function loadUser() {
      const { data } = await supabase.auth.getUser()
      if (data?.user)
        setUser({ id: data.user.id, email: data.user.email ?? '' })
      else setUser(null)
    }

    // load packages
    async function loadPlans() {
      const { data, error } = await supabase
        .from('investment_plans')
        .select('*')
        .order('amount', { ascending: true })

      if (error) {
        console.error('loadPlans error', error)
        toast.error('Could not load plans.')
        setPlans([])
      } else {
        const enriched = (data || []).map((p: any, i: number) => ({
          id: p.id,
          name: p.name,
          amount: p.amount,
          description: p.description ?? null,
          created_at: p.created_at,
          // default tags/benefits if not present
          tags:
            p.tags ??
            (i === 0
              ? ['Beginner']
              : i === Math.floor((data || []).length / 2)
              ? ['Popular']
              : []),
          benefits:
            p.benefits && p.benefits.length > 0
              ? p.benefits
              : ['Automatic returns', 'Secure escrow', 'No hidden fees'],
        })) as Plan[]

        setPlans(enriched)
      }
      setLoading(false)
    }

    loadUser()
    loadPlans()
  }, [])

  // best / popular plan selection
  const bestValueId = plans.length ? plans[plans.length - 1].id : null
  const popularId =
    plans.length > 1 ? plans[Math.floor(plans.length / 2)].id : null

  const openDetails = (plan: Plan) => {
    setActivePlan(plan)
    setDrawerOpen(true)
  }

  // invest handler
  const handleInvest = async (plan: Plan) => {
    if (!user) {
      setLoginOpen(true)
      return
    }

    try {
      setProcessingId(plan.id)

      const { data: trx, error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          user_email: user.email,
          plan_id: plan.id,
          amount: plan.amount,
          status: 'pending',
          type: 'investment',
        })
        .select()
        .single()

      if (error || !trx) {
        console.error('Create trx error:', error)
        toast.error('Failed to create transaction.')
        setProcessingId(null)
        return
      }

      // ensure Flutterwave script loaded in layout
      // @ts-ignore
      const FlutterwaveCheckout = (window as any).FlutterwaveCheckout
      if (!FlutterwaveCheckout) {
        toast.error('Payment script not loaded.')
        setProcessingId(null)
        return
      }

      // open inline checkout
      FlutterwaveCheckout({
        public_key: process.env.NEXT_PUBLIC_FLW_PUBLIC_KEY,
        tx_ref: trx.id,
        amount: plan.amount,
        currency: 'NGN',
        customer: { email: user.email },
        customizations: {
          title: plan.name,
          description: plan.description ?? 'Investment',
        },
        callback: function (response: any) {
          window.location.href = `/invest-now/success?transaction_id=${response.transaction_id}&tx_ref=${response.tx_ref}`
        },
        onclose: function () {
          setProcessingId(null)
        },
      })
    } catch (err) {
      console.error('handleInvest error:', err)
      toast.error('Something went wrong.')
      setProcessingId(null)
    }
  }

  if (loading) {
    return (
      <div className='p-8 max-w-6xl mx-auto'>
        <div className='animate-pulse h-8 bg-gray-200 rounded w-1/3 mb-6' />
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {[1, 2, 3].map((i) => (
            <div key={i} className='h-48 rounded-2xl bg-gray-100' />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className='max-w-6xl mx-auto p-6 space-y-10'>
      {/* HERO */}
      <section className='grid md:grid-cols-2 gap-8 items-center'>
        <div className='space-y-4'>
          <h1 className='text-4xl md:text-5xl font-bold leading-tight'>
            Investment Packages
          </h1>
          <p className='text-gray-600 max-w-xl'>
            Choose a plan that suits your goals. Each plan is managed
            professionally and processed through secure payment providers.
          </p>

          <div className='flex gap-3 mt-4'>
            <Link href='/sign-up'>
              <Button>Get Started</Button>
            </Link>
            <Link href='/login'>
              <Button variant='outline'>Log In</Button>
            </Link>
            <Link href='/dashboard'>
              <Button variant='ghost'>My Dashboard</Button>
            </Link>
          </div>

          {/* quick small features row */}
          <div className='mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3'>
            <div className='flex items-start gap-2'>
              <Star className='w-5 h-5 text-yellow-500 mt-1' />
              <div>
                <div className='text-sm font-semibold'>Trusted</div>
                <div className='text-xs text-gray-500'>Bank-grade security</div>
              </div>
            </div>

            <div className='flex items-start gap-2'>
              <Clock className='w-5 h-5 text-blue-500 mt-1' />
              <div>
                <div className='text-sm font-semibold'>Fast Payouts</div>
                <div className='text-xs text-gray-500'>Quick processing</div>
              </div>
            </div>

            <div className='flex items-start gap-2'>
              <MessageSquare className='w-5 h-5 text-green-500 mt-1' />
              <div>
                <div className='text-sm font-semibold'>Support</div>
                <div className='text-xs text-gray-500'>24/7 help</div>
              </div>
            </div>
          </div>
        </div>

        <div className='flex justify-center'>
          <div className='w-full max-w-md rounded-xl overflow-hidden shadow-lg'>
            <Image
              src={illustrationPath}
              alt='investment illustration'
              width={720}
              height={480}
              className='object-cover'
            />
          </div>
        </div>
      </section>

      {/* PLANS GRID */}
      <section>
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
          {plans.map((p) => {
            const isProcessing = processingId === p.id
            const isBest = p.id === bestValueId
            const isPopular = p.id === popularId

            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ translateY: -8 }}
              >
                <Card
                  className={`relative p-6 rounded-2xl border shadow-lg ${
                    isBest ? 'ring-2 ring-yellow-200' : ''
                  }`}
                >
                  {/* badges */}
                  <div className='absolute right-4 top-4 flex gap-2'>
                    {isBest && (
                      <Badge className='flex items-center gap-1'>
                        <Star className='h-3 w-3 text-yellow-500' /> Best value
                      </Badge>
                    )}
                    {isPopular && <Badge variant='secondary'>Popular</Badge>}
                    {p.tags?.map((t) => (
                      <Badge key={t} variant='outline'>
                        {t}
                      </Badge>
                    ))}
                  </div>

                  <div className='flex items-start justify-between gap-4'>
                    <div className='flex-1 min-w-0'>
                      <h3 className='text-xl font-semibold flex items-center gap-2'>
                        {p.name}
                        <button
                          onClick={() => openDetails(p)}
                          title='View details'
                          className='p-1 rounded hover:bg-slate-100'
                        >
                          <Info className='w-4 h-4 text-gray-500' />
                        </button>
                      </h3>
                      <p className='text-gray-500 mt-1 truncate'>
                        {p.description ?? 'Short plan overview.'}
                      </p>

                      {/* benefits */}
                      <ul className='mt-3 space-y-1'>
                        {p.benefits?.slice(0, 3).map((b, i) => (
                          <li key={i} className='text-sm text-gray-600'>
                            • {b}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className='text-right mt-5'>
                      <div className='text-2xl font-bold'>
                        ₦{Number(p.amount).toLocaleString()}
                      </div>
                      <div className='text-xs text-gray-400'>one-time</div>
                    </div>
                  </div>

                  {/* actions */}
                  <div className='mt-6 flex items-center gap-3'>
                    <Button
                      onClick={() => handleInvest(p)}
                      disabled={Boolean(processingId) && !isProcessing}
                      className='flex-1'
                    >
                      {isProcessing ? (
                        <span className='flex items-center gap-2'>
                          <Loader2 className='w-4 h-4 animate-spin' /> Opening
                          payment...
                        </span>
                      ) : (
                        'Invest Now'
                      )}
                    </Button>

                    <Button variant='outline' onClick={() => openDetails(p)}>
                      Details
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* BENEFITS & DISCLAIMER */}
      <section className='grid md:grid-cols-2 gap-6 mt-6'>
        <div className='bg-white p-6 rounded-2xl shadow'>
          <h3 className='text-lg font-semibold mb-2'>Why Invest with Us</h3>
          <ul className='text-gray-600 space-y-2'>
            <li>• Professional fund management</li>
            <li>• Secure escrow for all investments</li>
            <li>• Regular payouts based on plan terms</li>
          </ul>
        </div>

        <div className='bg-white p-6 rounded-2xl shadow'>
          <h3 className='text-lg font-semibold mb-2'>
            Important — Please Read
          </h3>
          <p className='text-sm text-gray-600'>
            Investments carry risk. Payouts depend on plan terms and market
            conditions. We do our best to process withdrawals quickly, but
            processing times vary.
          </p>
        </div>
      </section>

      {/* FAQ (under plans) */}
      <section className='mt-6 bg-white p-6 rounded-2xl shadow'>
        <h3 className='text-lg font-semibold mb-4'>Investment FAQ</h3>

        <div className='space-y-3'>
          <details className='p-3 rounded-lg border'>
            <summary className='font-medium cursor-pointer'>
              How do payouts work?
            </summary>
            <p className='mt-2 text-sm text-gray-600'>
              Payouts are processed automatically by our payment provider. You
              will receive a webhook update and the status will change when the
              payout completes.
            </p>
          </details>

          <details className='p-3 rounded-lg border'>
            <summary className='font-medium cursor-pointer'>
              Can I withdraw anytime?
            </summary>
            <p className='mt-2 text-sm text-gray-600'>
              Withdrawals depend on plan rules. Some plans are fixed-term;
              others allow early withdrawal with conditions.
            </p>
          </details>

          <details className='p-3 rounded-lg border'>
            <summary className='font-medium cursor-pointer'>
              Is my money safe?
            </summary>
            <p className='mt-2 text-sm text-gray-600'>
              We use secure payment processors and escrow mechanisms to protect
              investor funds.
            </p>
          </details>
        </div>
      </section>

      {/* Floating Support Button & History Shortcut */}
      <div>
        <Link href='/contact-us'>
          <span className='fixed right-4 bottom-6 bg-blue-600 text-white p-4 rounded-full shadow-lg flex items-center justify-center'>
            <MessageSquare className='w-5 h-5' />
          </span>
        </Link>
      </div>

      {/* Drawer for Plan Details */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className='p-6'>
          <div className='max-w-2xl mx-auto'>
            <h3 className='text-2xl font-bold mb-3'>{activePlan?.name}</h3>
            <p className='text-gray-600 mb-4'>{activePlan?.description}</p>

            <div className='bg-gray-50 p-4 rounded-lg mb-4'>
              <div className='flex justify-between'>
                <span className='text-sm text-gray-500'>Amount</span>
                <span className='font-semibold'>
                  ₦{activePlan?.amount?.toLocaleString()}
                </span>
              </div>
            </div>

            <div className='space-y-3'>
              <h4 className='font-semibold'>Benefits</h4>
              <ul className='list-disc list-inside text-gray-600'>
                {activePlan?.benefits?.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>

            <div className='mt-6 flex gap-3'>
              <Button onClick={() => activePlan && handleInvest(activePlan)}>
                Invest
              </Button>
              <Button variant='outline' onClick={() => setDrawerOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Login dialog */}
      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Please log in to continue</DialogTitle>
          </DialogHeader>

          <div className='mt-4 space-y-3'>
            <p className='text-gray-600'>
              You must be logged in to start an investment.
            </p>
            <div className='flex gap-3 mt-4'>
              <Link href='/login'>
                <Button onClick={() => setLoginOpen(false)}>Log In</Button>
              </Link>
              <Link href='/sign-up'>
                <Button variant='outline' onClick={() => setLoginOpen(false)}>
                  Sign Up
                </Button>
              </Link>
            </div>
          </div>

          <DialogFooter>
            <Button variant='ghost' onClick={() => setLoginOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
