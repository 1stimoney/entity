import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export async function POST(req: Request) {
  try {
    const { transaction_id, tx_ref } = await req.json()

    if (!transaction_id && !tx_ref) {
      return NextResponse.json({
        status: false,
        message: 'Missing identifiers',
      })
    }

    // 1) Flutterwave verification requires transaction_id
    if (!transaction_id) {
      return NextResponse.json({
        status: false,
        message: 'Missing transaction_id (Flutterwave verify requires it)',
      })
    }

    const verifyUrl = `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(
      transaction_id
    )}/verify`

    const flwRes = await fetch(verifyUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}` },
    })

    const flwJson = await flwRes.json()

    if (!flwRes.ok || !flwJson || flwJson.status !== 'success') {
      console.error('Flutterwave verify failed:', flwJson)
      return NextResponse.json({
        status: false,
        message: flwJson?.message || 'Flutterwave verification failed',
        data: flwJson,
      })
    }

    const fwData = flwJson.data
    const fwStatus = fwData?.status // "successful"
    const returnedTxRef = fwData?.tx_ref

    if (fwStatus !== 'successful') {
      const lookup = tx_ref || returnedTxRef
      if (lookup) {
        await supabaseServer
          .from('transactions')
          .update({ status: 'failed' })
          .eq('flutterwave_ref', lookup)
      }

      return NextResponse.json({
        status: false,
        message: `Payment not successful (status: ${fwStatus})`,
      })
    }

    // 2) Find local transaction by flutterwave_ref
    const lookupRef = tx_ref || returnedTxRef
    if (!lookupRef) {
      return NextResponse.json({
        status: false,
        message: 'Missing tx_ref from both client and Flutterwave response',
      })
    }

    const { data: foundTrx, error: trxErr } = await supabaseServer
      .from('transactions')
      .select('*')
      .eq('flutterwave_ref', lookupRef)
      .single()

    if (trxErr || !foundTrx) {
      console.error('Local transaction not found:', trxErr, lookupRef)
      return NextResponse.json({
        status: false,
        message: 'Transaction not found in database',
      })
    }

    // 3) Mark transaction success (safe to run multiple times)
    await supabaseServer
      .from('transactions')
      .update({
        status: 'success',
        provider_transaction_id: fwData?.id ?? null,
        provider_ref: fwData?.flw_ref ?? null,
      })
      .eq('id', foundTrx.id)

    // 4) Create investment DIRECTLY (no internal fetch)
    const packageOrPlanId = foundTrx.package_id ?? foundTrx.plan_id
    if (!packageOrPlanId) {
      return NextResponse.json({
        status: false,
        message: 'Transaction missing plan_id/package_id',
      })
    }

    // idempotency: if investment already exists for this transaction, return it
    const { data: existingInv, error: existingErr } = await supabaseServer
      .from('investments')
      .select('*')
      .eq('source_transaction_id', foundTrx.id)
      .maybeSingle()

    if (existingErr) {
      console.error('Investment idempotency lookup error:', existingErr)
      return NextResponse.json({
        status: false,
        message: existingErr.message,
      })
    }

    let investment = existingInv

    if (!investment) {
      const { data: createdInv, error: invErr } = await supabaseServer
        .from('investments')
        .insert({
          user_id: foundTrx.user_id,
          package_id: packageOrPlanId, // keep DB column name
          amount: foundTrx.amount,
          source_transaction_id: foundTrx.id,
        })
        .select('*')
        .single()

      if (invErr || !createdInv) {
        console.error('Investment insert error:', invErr)
        return NextResponse.json({
          status: false,
          message: invErr?.message || 'Failed to create investment',
        })
      }

      investment = createdInv
    }

    // 5) Referral bonus (optional) - don't fail verification if it errors
    try {
      await supabaseServer.rpc('credit_referral_reward', {
        p_referred_user: foundTrx.user_id,
        p_investment_id: investment.id,
      })
    } catch (e) {
      console.error('credit_referral_reward error:', e)
    }

    return NextResponse.json({
      status: true,
      message: 'Payment verified and investment created',
      data: { payment: fwData, investment },
    })
  } catch (err) {
    console.error('verify route error', err)
    return NextResponse.json({ status: false, message: 'Server error' })
  }
}
