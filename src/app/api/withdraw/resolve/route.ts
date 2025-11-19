import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { bank_code, account_number } = await req.json()

    const res = await fetch('https://api.flutterwave.com/v3/accounts/resolve', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        account_number,
        account_bank: bank_code,
      }),
    })

    const json = await res.json()

    if (!json)
      return NextResponse.json({ status: false, message: 'No response' })
    if (json.status !== 'success') {
      return NextResponse.json({
        status: false,
        message: json.message || 'Resolve failed',
      })
    }

    return NextResponse.json({
      status: true,
      account_name: json.data.account_name,
    })
  } catch (err) {
    console.error('Resolve error:', err)
    return NextResponse.json({ status: false, message: 'Server error' })
  }
}
