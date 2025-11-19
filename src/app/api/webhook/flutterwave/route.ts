import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('verif-hash')
    const rawBody = await req.text()

    // Validate Flutterwave signature
    const hash = crypto
      .createHmac('sha256', process.env.FLW_SECRET_HASH!)
      .update(rawBody)
      .digest('hex')

    if (hash !== signature) {
      return NextResponse.json(
        { message: 'Invalid signature' },
        { status: 401 }
      )
    }

    const event = JSON.parse(rawBody)

    // We only care about transfer (withdrawal) events
    if (event.event !== 'transfer.completed') {
      return NextResponse.json({ message: 'Ignored' })
    }

    const data = event.data
    const withdrawalId = data.meta?.withdrawal_id
    const status = data.status // SUCCESSFUL | FAILED

    if (!withdrawalId) {
      return NextResponse.json({ message: 'Missing withdrawal ID' })
    }

    // Get withdrawal
    const { data: withdrawal, error: wErr } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('id', withdrawalId)
      .single()

    if (wErr || !withdrawal) {
      return NextResponse.json({ message: 'Withdrawal not found' })
    }

    // Update withdrawal status
    await supabase.from('withdrawals').update({ status }).eq('id', withdrawalId)

    // Refund wallet if failed
    if (status === 'FAILED') {
      await supabase.rpc('increment_wallet_balance', {
        user_id_input: withdrawal.user_id,
        amount_input: withdrawal.amount,
      })
    }

    return NextResponse.json({ message: 'Webhook processed' })
  } catch (err) {
    console.error('Webhook Error:', err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
