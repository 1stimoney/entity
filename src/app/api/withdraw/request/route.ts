import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

const TAX_RATE = 0.04
const MIN_WITHDRAWAL = 2000

function roundNaira(n: number) {
  return Math.max(0, Math.round(n))
}

export async function POST(req: Request) {
  try {
    const {
      user_id,
      email,
      amount,
      bank_code,
      bank_name,
      account_number,
      account_name,
    } = await req.json()

    const grossAmount = Number(amount)

    if (!user_id || !email || !bank_code || !account_number) {
      return NextResponse.json({ status: false, message: 'Missing data' })
    }

    if (!Number.isFinite(grossAmount) || grossAmount <= 0) {
      return NextResponse.json({ status: false, message: 'Invalid amount' })
    }

    if (grossAmount < MIN_WITHDRAWAL) {
      return NextResponse.json({
        status: false,
        message: `Minimum withdrawal is ₦${MIN_WITHDRAWAL.toLocaleString()}`,
      })
    }

    // ✅ Fee + net (what user receives)
    const fee = roundNaira(grossAmount * TAX_RATE)
    const netAmount = roundNaira(grossAmount - fee)

    if (netAmount <= 0) {
      return NextResponse.json({
        status: false,
        message: 'Net amount must be greater than ₦0',
      })
    }

    // 1) Fetch profile balance (server-side)
    const { data: profile, error: profErr } = await supabaseServer
      .from('users')
      .select('balance')
      .eq('email', email)
      .single()

    if (profErr) {
      console.error('profile fetch error:', profErr)
      return NextResponse.json({
        status: false,
        message: profErr.message || 'Failed to load profile',
      })
    }

    const currentBalance = Number(profile?.balance ?? 0)

    if (currentBalance < grossAmount) {
      return NextResponse.json({
        status: false,
        message: 'Insufficient balance',
      })
    }

    /**
     * ✅ 2) Atomic balance deduction (prevents race conditions)
     * We'll create/use an RPC: withdraw_balance(email, amount_to_subtract)
     * If you already have add_balance, this is the same idea.
     */
    const { error: rpcErr } = await supabaseServer.rpc('withdraw_balance', {
      p_email: email,
      p_amount: grossAmount,
    })

    if (rpcErr) {
      console.error('withdraw_balance rpc error:', rpcErr)
      return NextResponse.json({
        status: false,
        message: rpcErr.message || 'Failed to deduct balance',
      })
    }

    // 3) Insert withdrawal record (store gross + fee + net)
    const { data: trx, error: trxErr } = await supabaseServer
      .from('withdrawals')
      .insert({
        email,
        user_id,
        amount: grossAmount, // gross
        fee, // store fee
        net_amount: netAmount, // store what user receives
        bank_code,
        bank_name,
        account_number,
        account_name,
        status: 'initiated',
      })
      .select()
      .single()

    if (trxErr || !trx) {
      console.error('Insert withdrawal error:', trxErr)

      // rollback via RPC (add back the gross amount)
      await supabaseServer.rpc('add_balance_by_email', {
        p_email: email,
        p_amount: grossAmount,
      })

      return NextResponse.json({
        status: false,
        message: 'Failed to create withdrawal',
      })
    }

    // 4) Initiate transfer to recipient — ✅ send NET amount to Flutterwave
    const transferPayload = {
      account_bank: bank_code,
      account_number: account_number,
      amount: netAmount, // ✅ send net
      currency: 'NGN',
      narration: `Withdrawal (net). Fee: ₦${fee}`,
      reference: `wd-${trx.id}-${Date.now()}`,
    }

    const flwRes = await fetch('https://api.flutterwave.com/v3/transfers', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transferPayload),
    })

    const flwJson = await flwRes.json()

    // If Flutterwave rejects transfer, refund gross immediately
    if (!flwJson || flwJson.status !== 'success') {
      console.error('Flutterwave transfer error:', flwJson)

      // refund gross (what we deducted from balance)
      await supabaseServer.rpc('add_balance_by_email', {
        p_email: email,
        p_amount: grossAmount,
      })

      await supabaseServer
        .from('withdrawals')
        .update({
          status: 'failed',
          error: flwJson?.message ?? 'Transfer failed',
        })
        .eq('id', trx.id)

      return NextResponse.json({
        status: false,
        message: flwJson?.message || 'Transfer failed',
        data: flwJson,
      })
    }

    // 5) Update withdrawal with flutterwave reference and set status processing
    const transferRef = flwJson.data?.reference || flwJson.data?.id || null

    await supabaseServer
      .from('withdrawals')
      .update({
        flutterwave_ref: transferRef,
        status: 'processing',
      })
      .eq('id', trx.id)

    return NextResponse.json({
      status: true,
      message: 'Withdrawal initiated',
      data: {
        withdrawal_id: trx.id,
        gross_amount: grossAmount,
        fee,
        net_amount: netAmount,
        flutterwave: flwJson.data,
      },
    })
  } catch (err) {
    console.error('withdraw request error:', err)
    return NextResponse.json({ status: false, message: 'Server error' })
  }
}
