import { supabaseServer } from '@/lib/supabaseServer'
import { NextResponse } from 'next/server'

export async function GET() {
  const { data, error } = await supabaseServer
    .from('investment_packages')
    .select('*')
    .order('amount', { ascending: true })

  return NextResponse.json({ data })
}
