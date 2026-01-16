// app/api/investments/create/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const user_id = body.user_id as string | undefined
    const amount = body.amount as number | undefined
    const source_transaction_id = body.source_transaction_id as
      | string
      | undefined

    // Accept either package_id OR plan_id
    const package_id = (body.package_id ?? body.plan_id) as string | undefined

    if (!user_id || !package_id || !amount) {
      return NextResponse.json({ status: false, message: 'Invalid data' })
    }

    // 0) Idempotency: if investment already exists for this source transaction, return it
    if (source_transaction_id) {
      const { data: existing, error: existingErr } = await supabaseServer
        .from('investments')
        .select('*')
        .eq('source_transaction_id', source_transaction_id)
        .limit(1)
        .maybeSingle()

      if (existingErr) {
        console.error('idempotency check error', existingErr)
        return NextResponse.json({
          status: false,
          message: existingErr.message,
        })
      }

      if (existing) {
        return NextResponse.json({
          status: true,
          message: 'Already created',
          data: existing,
        })
      }
    }

    // 1) Create investment row
    const { data: investment, error: investError } = await supabaseServer
      .from('investments')
      .insert({
        user_id,
        package_id, // keep DB column name
        amount,
        source_transaction_id: source_transaction_id ?? null,
      })
      .select('*')
      .single()

    if (investError || !investment) {
      console.error('investment insert error', investError)
      return NextResponse.json({
        status: false,
        message: investError?.message || 'Failed to create investment',
      })
    }

    return NextResponse.json({
      status: true,
      message: 'Investment created',
      data: investment,
    })
  } catch (err) {
    console.error('create investment route error', err)
    return NextResponse.json({ status: false, message: 'Server error' })
  }
}
