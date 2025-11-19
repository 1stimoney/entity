export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
import { ReactNode } from 'react'

export default function SuccessLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
