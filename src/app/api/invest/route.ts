import { supabaseServer } from '@/lib/supabaseServer'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { user_email, package_id } = await req.json()

  if (!user_email || !package_id) {
    return NextResponse.json({ status: false, message: 'Invalid data' })
  }

  // get package
  const { data: pkg } = await supabaseServer
    .from('investment_packages')
    .select('*')
    .eq('id', package_id)
    .single()

  if (!pkg)
    return NextResponse.json({ status: false, message: 'Package not found' })

  const flutterwave_ref = `inv-${Date.now()}`

  // create pending transaction
  const { data: trx } = await supabaseServer
    .from('transactions')
    .insert({
      user_email: user_email,
      package_id,
      amount: pkg.amount,
      flutterwave_ref,
      status: 'pending',
    })
    .select()
    .single()

  const payload = {
    tx_ref: flutterwave_ref,
    amount: pkg.amount,
    currency: 'NGN',
    redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/invest-now/success`,
    customer: { user_email },
    meta: { transaction_id: trx.id },
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

  if (response.status === 'success') {
    return NextResponse.json({ status: true, link: response.data.link })
  }

  return NextResponse.json({ status: false, message: response.message })
}
