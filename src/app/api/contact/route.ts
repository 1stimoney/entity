import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export async function POST(req: Request) {
  try {
    const { user_id, full_name, email, message } = await req.json()

    if (!full_name || !email || !message)
      return NextResponse.json({
        status: false,
        message: 'Please fill out all fields',
      })

    const { error } = await supabaseServer.from('contact_messages').insert({
      user_id,
      full_name,
      email,
      message,
    })

    if (error) {
      console.error(error)
      return NextResponse.json({
        status: false,
        message: 'Failed to send message',
      })
    }

    return NextResponse.json({
      status: true,
      message: 'Message sent successfully!',
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ status: false, message: 'Server error' })
  }
}
