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

    // 1) Load plan so we can snapshot its fixed daily return
    // IMPORTANT: this is what powers your "auto-credit every 24h for 30 days"
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

    // 2) (Recommended) Validate amount matches plan.amount if amount was provided
    // This prevents someone from calling this route directly with a fake amount.
    if (typeof amount === 'number' && Number(amount) !== Number(plan.amount)) {
      return NextResponse.json({
        status: false,
        message: 'Amount mismatch for selected plan',
      })
    }

    // Use plan amount as canonical
    const finalAmount = Number(plan.amount)

    // 3) Initialize payout window: 30 days
    const startsAt = new Date()
    const endsAt = new Date(startsAt.getTime() + 30 * 24 * 60 * 60 * 1000)

    // 4) Create investment row
    // NOTE: "package_id" is your DB column, but it points to investment_plans.id
    const { data: investment, error: investError } = await supabaseServer
      .from('investments')
      .insert({
        user_id,
        package_id,
        amount: finalAmount,
        source_transaction_id: source_transaction_id ?? null,

        // payout engine fields
        status: 'active',
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        daily_return: Number(plan.daily_return ?? 0),
        days_paid: 0,
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
