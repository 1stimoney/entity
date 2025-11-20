'use client'

import AuthGuard from '@/components/AuthGuard'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { motion } from 'framer-motion'
import { ShieldCheck, Wallet, Repeat, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function HomePage() {
  return (
    <AuthGuard>
      <div className='min-h-screen bg-white'>
        {/* HERO SECTION */}
        <section className='pt-24 pb-32 px-6 bg-gradient-to-b from-black to-gray-900 text-white'>
          <div className='max-w-5xl mx-auto text-center space-y-6'>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className='text-5xl font-bold leading-tight'
            >
              The Smarter Way to <span className='text-gray-300'>Invest</span> &
              <span className='text-gray-300'> Manage Money</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className='text-lg text-gray-300 max-w-2xl mx-auto'
            >
              Secure investments, easy withdrawals, and a clean dashboard.
              Finance made simple for everyone.
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className='flex justify-center gap-4 mt-8'
            >
              <Link href='/sign-up'>
                <Button className='px-6 py-3 text-lg'>Get Started</Button>
              </Link>

              <Link href='/login'>
                <Button
                  variant='secondary'
                  className='px-6 py-3 text-lg bg-white text-black'
                >
                  Login
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section className='py-24 px-6'>
          <div className='max-w-6xl mx-auto'>
            <h2 className='text-3xl font-bold text-center mb-14'>
              Why Choose Us?
            </h2>

            <div className='grid md:grid-cols-3 gap-8'>
              <Card className='shadow-lg border'>
                <CardContent className='p-6 space-y-3 text-center'>
                  <ShieldCheck className='mx-auto h-10 w-10 text-black' />
                  <h3 className='text-xl font-semibold'>Secure Platform</h3>
                  <p className='text-gray-600'>
                    Bank-grade security for all transactions.
                  </p>
                </CardContent>
              </Card>

              <Card className='shadow-lg border'>
                <CardContent className='p-6 space-y-3 text-center'>
                  <Wallet className='mx-auto h-10 w-10 text-black' />
                  <h3 className='text-xl font-semibold'>Easy Withdrawals</h3>
                  <p className='text-gray-600'>
                    Fast, reliable payouts powered by Flutterwave.
                  </p>
                </CardContent>
              </Card>

              <Card className='shadow-lg border'>
                <CardContent className='p-6 space-y-3 text-center'>
                  <Repeat className='mx-auto h-10 w-10 text-black' />
                  <h3 className='text-xl font-semibold'>
                    Automated Investments
                  </h3>
                  <p className='text-gray-600'>Grow your money effortlessly.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className='py-24 bg-gray-50 px-6'>
          <div className='max-w-5xl mx-auto text-center space-y-10'>
            <h2 className='text-3xl font-bold'>How It Works</h2>

            <div className='grid md:grid-cols-3 gap-10'>
              <div className='space-y-3'>
                <h3 className='text-xl font-semibold'>1. Create an Account</h3>
                <p className='text-gray-600'>
                  Start by signing up with your email.
                </p>
              </div>

              <div className='space-y-3'>
                <h3 className='text-xl font-semibold'>2. Fund & Invest</h3>
                <p className='text-gray-600'>
                  Choose an investment package that fits you.
                </p>
              </div>

              <div className='space-y-3'>
                <h3 className='text-xl font-semibold'>3. Withdraw Anytime</h3>
                <p className='text-gray-600'>
                  Safe and reliable payouts to your bank.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className='py-24 px-6'>
          <div className='max-w-6xl mx-auto space-y-10'>
            <h2 className='text-3xl font-bold text-center'>What People Say</h2>

            <div className='grid md:grid-cols-3 gap-8'>
              <Card className='p-6 shadow border'>
                <p className='text-gray-700'>
                  “Very clean platform. I got my withdrawal in minutes!”
                </p>
                <p className='mt-4 font-semibold'>— David A.</p>
              </Card>

              <Card className='p-6 shadow border'>
                <p className='text-gray-700'>
                  “Investing has never been this easy.”
                </p>
                <p className='mt-4 font-semibold'>— Sarah K.</p>
              </Card>

              <Card className='p-6 shadow border'>
                <p className='text-gray-700'>
                  “Reliable payouts. Amazing user experience.”
                </p>
                <p className='mt-4 font-semibold'>— Michael T.</p>
              </Card>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className='border-t py-10 text-center text-gray-600'>
          <p>© {new Date().getFullYear()} Entity Inc. All rights reserved.</p>
        </footer>
      </div>
    </AuthGuard>
  )
}
