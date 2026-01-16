// app/api/invest/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export async function POST(req: Request) {
  try {
    const { user_email, package_id } = await req.json()
    if (!user_email || !package_id) {
      return NextResponse.json({ status: false, message: 'Invalid data' })
    }

    // Resolve user_id from email (must exist)
    const { data: userRow, error: userErr } = await supabaseServer
      .from('users')
      .select('id')
      .eq('email', user_email)
      .single()

    if (userErr || !userRow) {
      return NextResponse.json({ status: false, message: 'User not found' })
    }
    const user_id = userRow.id

    // get package
    const { data: pkg, error: pkgErr } = await supabaseServer
      .from('investment_packages')
      .select('*')
      .eq('id', package_id)
      .single()

    if (pkgErr || !pkg) {
      return NextResponse.json({ status: false, message: 'Package not found' })
    }

    const flutterwave_ref = `inv-${Date.now()}-${Math.floor(
      Math.random() * 9999
    )}`

    // create pending transaction (store user_id + type)
    const { data: trx, error: trxErr } = await supabaseServer
      .from('transactions')
      .insert({
        user_id,
        user_email,
        package_id,
        amount: pkg.amount,
        flutterwave_ref,
        status: 'pending',
        type: 'investment',
      })
      .select('*')
      .single()

    if (trxErr || !trx) {
      console.error('trx insert error', trxErr)
      return NextResponse.json({
        status: false,
        message: trxErr?.message || 'Failed to create transaction',
      })
    }

    // Prepare Flutterwave payload
    const payload = {
      tx_ref: flutterwave_ref,
      amount: pkg.amount,
      currency: 'NGN',
      redirect_url: `${
        process.env.NEXT_PUBLIC_APP_URL
      }/invest-now/success?tx_ref=${encodeURIComponent(flutterwave_ref)}`,
      customer: { email: user_email },
      meta: { transaction_id: trx.id }, // helpful if returned
      customizations: { title: pkg.name, description: 'Investment payment' },
    }

    const flw = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const response = await flw.json()

    if (response.status === 'success' && response.data?.link) {
      return NextResponse.json({ status: true, link: response.data.link })
    }

    console.error('flw create error', response)
    return NextResponse.json({
      status: false,
      message: response.message || 'Failed to create payment link',
    })
  } catch (err) {
    console.error('invest route error', err)
    return NextResponse.json({ status: false, message: 'Server error' })
  }
}
