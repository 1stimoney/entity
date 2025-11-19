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
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

interface Transaction {
  id: number
  amount: number
  reference: string
  status: string
  created_at: string
}

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [totalInvested, setTotalInvested] = useState(0)
  const [balance, setBalance] = useState(0)

  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const userEmail = sessionData.session?.user?.email
      if (!userEmail) return

      // Fetch transactions
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_email', userEmail)
        .order('created_at', { ascending: false })

      if (txError) console.error('Failed to fetch transactions:', txError)
      else if (txData) {
        setTransactions(txData)
        setTotalInvested(txData.reduce((acc, tx) => acc + tx.amount, 0))
      }

      // Fetch user balance
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('balance')
        .eq('email', userEmail)
        .single()

      if (profileError) console.error('Failed to fetch balance:', profileError)
      else if (profileData) setBalance(profileData.balance)

      setLoading(false)
    }

    fetchData()
  }, [])

  const recentTransactions = transactions.slice(0, 3)

  return (
    <ProtectedRoute>
      <div className='p-6 max-w-5xl mx-auto space-y-6'>
        <h1 className='text-3xl font-bold text-blue-600'>Dashboard</h1>

        {loading ? (
          <p className='text-gray-500'>Loading...</p>
        ) : (
          <>
            {/* Summary Cards */}
            <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
              <Card className='border border-gray-200 shadow-sm'>
                <CardHeader>
                  <CardTitle>Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className='text-2xl font-bold'>
                    ₦{balance.toLocaleString()}
                  </p>
                </CardContent>
              </Card>

              <Card className='border border-gray-200 shadow-sm'>
                <CardHeader>
                  <CardTitle>Total Invested</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className='text-2xl font-bold'>
                    ₦{totalInvested.toLocaleString()}
                  </p>
                </CardContent>
              </Card>

              <Card className='border border-gray-200 shadow-sm flex flex-col justify-center items-center'>
                <Button onClick={() => router.push('/withdraw')}>
                  Withdraw Funds
                </Button>
              </Card>
            </div>

            {/* Recent Transactions */}
            <div>
              <h2 className='text-xl font-semibold mb-4'>
                Recent Transactions
              </h2>
              {recentTransactions.length === 0 ? (
                <p className='text-gray-500'>No transactions yet.</p>
              ) : (
                <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                  {recentTransactions.map((tx) => (
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
                          Reference:{' '}
                          <span className='font-mono'>{tx.reference}</span>
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  )
}
