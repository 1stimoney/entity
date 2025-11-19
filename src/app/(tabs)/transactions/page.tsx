'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import ProtectedRoute from '@/components/ProtectedRoute'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'

interface Transaction {
  id: number
  amount: number
  reference: string
  status: string
  created_at: string
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTransactions = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const userEmail = sessionData.session?.user?.email
      if (!userEmail) return

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_email', userEmail)
        .order('created_at', { ascending: false })

      if (error) console.error(error)
      else setTransactions(data)

      setLoading(false)
    }

    fetchTransactions()
  }, [])

  return (
    <ProtectedRoute>
      <div className='p-6 max-w-5xl mx-auto'>
        <h1 className='text-3xl font-bold mb-6 text-blue-600'>
          Your Transactions
        </h1>

        {loading ? (
          <p className='text-gray-500'>Loading transactions...</p>
        ) : transactions.length === 0 ? (
          <p className='text-gray-500'>You haven’t made any investments yet.</p>
        ) : (
          <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
            {transactions.map((tx) => (
              <Card
                key={tx.id}
                className='border border-gray-200 shadow-sm hover:shadow-lg transition-shadow'
              >
                <CardHeader>
                  <CardTitle>₦{tx.amount.toLocaleString()}</CardTitle>
                  <CardDescription className='text-gray-500'>
                    {new Date(tx.created_at).toLocaleDateString()} -{' '}
                    {tx.status.toUpperCase()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className='text-gray-700 break-words'>
                    Reference: <span className='font-mono'>{tx.reference}</span>
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
