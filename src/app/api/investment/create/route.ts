// app/api/investments/create/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const user_id = body.user_id as string | undefined
    const source_transaction_id = body.source_transaction_id as
      | string
      | undefined

    // Accept either package_id OR plan_id (DB column is package_id)
    const package_id = (body.package_id ?? body.plan_id) as string | undefined

    // amount is optional from client, but we will always use plan.amount as canonical
    const clientAmount = body.amount as number | undefined

    if (!user_id || !package_id) {
      return NextResponse.json({ status: false, message: 'Invalid data' })
    }

    // 0) Idempotency: if investment already exists for this source transaction, return it
    if (source_transaction_id) {
      const { data: existing, error: existingErr } = await supabaseServer
        .from('investments')
        .select('*')
        .eq('source_transaction_id', source_transaction_id)
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

    // 1) Load plan so we can snapshot plan.amount + plan.daily_return
    const { data: plan, error: planErr } = await supabaseServer
      .from('investment_plans')
      .select('id, amount, daily_return')
      .eq('id', package_id)
      .single()

    if (planErr || !plan) {
      console.error('plan fetch error', planErr)
      return NextResponse.json({
        status: false,
        message: planErr?.message || 'Investment plan not found',
      })
    }

    // 2) (Recommended) If client passed amount, validate it matches plan.amount
    if (
      typeof clientAmount === 'number' &&
      Number(clientAmount) !== Number(plan.amount)
    ) {
      return NextResponse.json({
        status: false,
        message: 'Amount mismatch for selected plan',
      })
    }

    // Canonical values
    const finalAmount = Number(plan.amount)
    const dailyReturn = Number(plan.daily_return ?? 0)

    // 3) 30-day validity window (start now, end 30 days later)
    const startAt = new Date()
    const endAt = new Date(startAt.getTime() + 30 * 24 * 60 * 60 * 1000)

    // 4) Create investment row
    const { data: investment, error: investError } = await supabaseServer
      .from('investments')
      .insert({
        user_id,
        package_id, // points to investment_plans.id
        amount: finalAmount,
        source_transaction_id: source_transaction_id ?? null,

        status: 'active',
        start_at: startAt.toISOString(), // ✅ correct column name
        end_at: endAt.toISOString(), // ✅ correct column name
        daily_return: dailyReturn,
        last_paid_at: null,
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
