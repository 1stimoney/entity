import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

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

    if (!email || !amount || !bank_code || !account_number)
      return NextResponse.json({ status: false, message: 'Missing data' })

    // 1. get profile balance (server client)
    const { data: profile } = await supabaseServer
      .from('users')
      .select('balance')
      .eq('email', email)
      .single()

    const currentBalance = Number(profile?.balance ?? 0)

    if (currentBalance < amount) {
      return NextResponse.json({
        status: false,
        message: 'Insufficient balance',
      })
    }

    // 2. Deduct balance (atomic approach recommended via DB transaction is better)
    const { error: updateErr } = await supabaseServer
      .from('users')
      .update({ balance: currentBalance - amount })
      .eq('email', email)

    if (updateErr) {
      console.error('Balance update error:', updateErr)
      return NextResponse.json({
        status: false,
        message: 'Failed to deduct balance',
      })
    }

    // 3. Insert withdrawal record (pending)
    const { data: trx, error: trxErr } = await supabaseServer
      .from('withdrawals')
      .insert({
        email,
        user_id,
        amount,
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
      // rollback balance
      await supabaseServer
        .from('users')
        .update({ balance: currentBalance })
        .eq('email', email)
      return NextResponse.json({
        status: false,
        message: 'Failed to create withdrawal',
      })
    }

    // 4. Initiate transfer to recipient
    const transferPayload = {
      account_bank: bank_code,
      account_number: account_number,
      amount,
      currency: 'NGN',
      narration: 'User Withdrawal',
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

    // If Flutterwave rejects transfer (e.g. bank not supported), refund immediately
    if (!flwJson || flwJson.status !== 'success') {
      console.error('Flutterwave transfer error:', flwJson)
      // rollback: update profile balance and mark withdrawal failed
      await supabaseServer
        .from('users')
        .update({ balance: currentBalance })
        .eq('email', email)

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

    // 5. Update withdrawal with flutterwave reference and set status processing
    const transferRef = flwJson.data.reference || flwJson.data.id || null
    await supabaseServer
      .from('withdrawals')
      .update({ flutterwave_ref: transferRef, status: 'processing' })
      .eq('id', trx.id)

    return NextResponse.json({
      status: true,
      message: 'Withdrawal initiated',
      data: flwJson.data,
    })
  } catch (err) {
    console.error('withdraw request error:', err)
    return NextResponse.json({ status: false, message: 'Server error' })
  }
}
