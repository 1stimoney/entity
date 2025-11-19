'use client'

import { Button } from './ui/button'

interface InvestmentCardProps {
  title: string
  description: string
  minAmount: number
  onInvest: (amount: number) => void
}

export function InvestmentCard({
  title,
  description,
  minAmount,
  onInvest,
}: InvestmentCardProps) {
  return (
    <div className='bg-white shadow-lg rounded-xl p-6 flex flex-col justify-between hover:shadow-2xl transition-shadow duration-300'>
      <div>
        <h2 className='text-xl font-bold text-gray-800'>{title}</h2>
        <p className='mt-2 text-gray-600'>{description}</p>
        <p className='mt-4 text-gray-700 font-medium'>
          Minimum Investment: ₦{minAmount.toLocaleString()}
        </p>
      </div>
      <Button className='mt-4 w-full py-2' onClick={() => onInvest(minAmount)}>
        Invest Now
      </Button>
    </div>
  )
}
