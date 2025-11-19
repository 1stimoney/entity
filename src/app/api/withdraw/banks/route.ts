import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // ask Flutterwave for transfer-enabled banks
    const res = await fetch(
      'https://api.flutterwave.com/v3/banks/NG?type=transfer',
      {
        headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}` },
      }
    )

    const json = await res.json()
    // json.data is usually the bank list
    return NextResponse.json(json)
  } catch (err) {
    console.error('Banks fetch error:', err)
    return NextResponse.json({ data: [], message: 'Failed to fetch banks' })
  }
}
