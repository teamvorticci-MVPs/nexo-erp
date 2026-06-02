import SuperadminShell from '@/components/layout/SuperadminShell'

export const metadata = {
  title: 'Panel Operador — Nexo',
}

export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  return <SuperadminShell>{children}</SuperadminShell>
}
