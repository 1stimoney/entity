'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Home, CreditCard, User, List, Mail } from 'lucide-react'

export function Navbar() {
  const pathname = usePathname()
  const [hidden, setHidden] = useState(false)
  const [lastScrollY, setLastScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > lastScrollY) {
        setHidden(true)
      } else {
        setHidden(false)
      }
      setLastScrollY(window.scrollY)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/invest-now', label: 'Invest', icon: CreditCard },
    { href: '/transactions', label: 'Transactions', icon: List },
    { href: '/contact-us', label: 'Contact', icon: Mail },
    { href: '/profile', label: 'Profile', icon: User },
  ]

  return (
    <nav
      className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white/80 backdrop-blur-md shadow-lg rounded-full px-6 py-3 flex justify-between items-center w-[90%] max-w-md transition-transform duration-300 ${
        hidden ? 'translate-y-32' : 'translate-y-0'
      }`}
    >
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center transition-colors ${
              isActive ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'
            }`}
          >
            <Icon size={24} />
            <span className='text-xs'>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
