/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Plan = {
  id: string
  name: string
  amount: number
  description?: string | null
  created_at?: string
}

type User = {
  id: string
  email: string
}

export default function InvestNowPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    // load session user
    async function loadUser() {
      const { data } = await supabase.auth.getUser()
      if (data?.user) {
        setUser({ id: data.user.id, email: data.user.email ?? '' })
      } else {
        setUser(null)
      }
    }
    // load packages
    async function loadPlans() {
      const { data, error } = await supabase
        .from('investment_plans')
        .select('*')
        .order('amount', { ascending: true })

      if (!error && data) setPlans(data as Plan[])
      setLoading(false)
    }

    loadUser()
    loadPlans()
  }, [])

  // When user clicks Invest:
  // 1) create a pending transaction row via supabase client
  // 2) open Flutterwave inline with tx_ref = trx.id (supabase-generated uuid)
  // 3) Flutterwave callback -> client will redirect to success page with transaction_id param
  const handleInvest = async (plan: Plan) => {
    if (!user) {
      alert('Please log in to invest.')
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
        alert('Failed to create transaction. Check console.')
        setProcessingId(null)
        return
      }

      // ensure Flutterwave script loaded in layout (you already did)
      // @ts-ignore
      const FlutterwaveCheckout = (window as any).FlutterwaveCheckout
      if (!FlutterwaveCheckout) {
        alert('Payment script not loaded.')
        setProcessingId(null)
        return
      }

      FlutterwaveCheckout({
        public_key: process.env.NEXT_PUBLIC_FLW_PUBLIC_KEY,
        tx_ref: trx.id, // use supabase txn id as tx_ref
        amount: plan.amount,
        currency: 'NGN',
        customer: {
          email: user.email,
        },
        customizations: {
          title: plan.name,
          description: plan.description ?? 'Investment',
        },
        callback: function (response: any) {
          // response.transaction_id & response.tx_ref
          // redirect to client success page (we verify server-side there)
          window.location.href = `/invest-now/success?transaction_id=${response.transaction_id}&tx_ref=${response.tx_ref}`
        },
        onclose: function () {
          // Do nothing — user closed popup
          setProcessingId(null)
        },
      })
    } catch (err) {
      console.error('handleInvest error:', err)
      alert('Something went wrong.')
      setProcessingId(null)
    }
  }

  if (loading) return <div className='p-6'>Loading plans…</div>

  return (
    <div className='max-w-3xl mx-auto p-6'>
      <h1 className='text-2xl font-bold mb-4'>Investment Packages</h1>

      {plans.length === 0 && <p>No plans available</p>}

      <div className='grid gap-4'>
        {plans.map((p) => (
          <div key={p.id} className='p-4 border rounded'>
            <h2 className='text-lg font-semibold'>{p.name}</h2>
            <p className='text-gray-600 mt-1'>{p.description}</p>
            <p className='font-bold mt-2'>₦{p.amount.toLocaleString()}</p>

            <button
              onClick={() => handleInvest(p)}
              disabled={processingId !== null}
              className='mt-3 bg-blue-600 text-white px-4 py-2 rounded'
            >
              {processingId === p.id ? 'Opening payment...' : 'Invest Now'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
