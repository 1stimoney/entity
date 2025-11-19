/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/verify-flutterwave/route.ts
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase' // we will use supabase client here to update the row
// NOTE: using client anon key to update is only okay if your RLS allows;
// if you prefer server-to-server DB updates here, create a server client with service role.

export async function POST(req: Request) {
  try {
    const { transaction_id, tx_ref } = await req.json()
    if (!transaction_id || !tx_ref) {
      return NextResponse.json({ status: false, message: 'Missing parameters' })
    }

    // Verify with Flutterwave using transaction_id
    const verifyRes = await fetch(
      `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
        },
      }
    )

    const verifyJson = await verifyRes.json()

    if (!verifyJson || verifyJson.status !== 'success') {
      console.error('Flutterwave verify error:', verifyJson)
      return NextResponse.json({
        status: false,
        message: 'Flutterwave verification failed',
        data: verifyJson,
      })
    }

    // Check that the tx_ref matches the one we opened
    const returned_tx_ref = verifyJson.data.tx_ref

    if (returned_tx_ref !== tx_ref) {
      console.warn('tx_ref mismatch', returned_tx_ref, tx_ref)
      // still continue: update row using tx_ref anyway
    }

    // update transaction row in DB (set status = paid and save flutterwave_ref)
    const { data, error } = await supabase
      .from('transactions')
      .update({
        status: 'paid',
        flutterwave_ref: transaction_id,
      })
      .eq('id', tx_ref)
      .select()
      .single()

    if (error) {
      console.error('Supabase update error:', error)
      return NextResponse.json({
        status: false,
        message: 'DB update failed',
        error,
      })
    }

    return NextResponse.json({ status: true, data: verifyJson.data })
  } catch (err) {
    console.error('verify route error:', err)
    return NextResponse.json({
      status: false,
      message: 'Server error',
      error: (err as any).message,
    })
  }
}
