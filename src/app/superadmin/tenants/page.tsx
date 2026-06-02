'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Plus, ChevronRight, Loader2, CheckCircle, XCircle, Search, Package, Users,
} from 'lucide-react'
import { getTenants, toggleTenantStatus, type TenantRow } from '@/app/actions/superadmin'

export default function TenantsPage() {
  const [tenants, setTenants]   = useState<TenantRow[]>([])
  const [filtered, setFiltered] = useState<TenantRow[]>([])
  const [query, setQuery]       = useState('')
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)
  const [, startT] = useTransition()

  useEffect(() => {
    setLoading(true)
    getTenants().then(r => {
      setLoading(false)
      if (r.error) { setError(r.error); return }
      setTenants(r.data ?? [])
      setFiltered(r.data ?? [])
    })
  }, [])

  useEffect(() => {
    const q = query.toLowerCase()
    setFiltered(
      q
        ? tenants.filter(t =>
            t.name.toLowerCase().includes(q) ||
            t.email.toLowerCase().includes(q) ||
            (t.admin_email ?? '').toLowerCase().includes(q))
        : tenants,
    )
  }, [query, tenants])

  const handleToggle = (t: TenantRow) => {
    setToggling(t.id)
    startT(async () => {
      await toggleTenantStatus(t.id, !t.active)
      setTenants(prev => prev.map(x => x.id === t.id ? { ...x, active: !x.active } : x))
      setToggling(null)
    })
  }

  return (
    <div className="space-y-5 p-4 sm:p-6">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Clientes</h1>
          <p className="mt-0.5 text-[13px] text-gray-500">
            {tenants.length} {tenants.length === 1 ? 'cliente' : 'clientes'}
          </p>
        </div>
        <Link
          href="/superadmin/tenants/new"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 sm:w-auto"
        >
          <Plus className="size-4" /> Nuevo cliente
        </Link>
      </div>

      {/* Search */}
      <div className="relative sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar por nombre o email…"
          className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-4 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="size-6 animate-spin text-blue-500" /></div>
      ) : error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-[#E5E7EB] bg-white py-14 text-center text-sm text-gray-500">
          {query ? 'Sin resultados' : 'No hay clientes registrados'}
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-sm lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Negocio', 'Email admin', 'Registro', 'Usuarios', 'Productos', 'Estado', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {t.logo_url
                          ? <img src={t.logo_url} alt="" className="size-7 rounded-md object-cover" />
                          : <div className="flex size-7 items-center justify-center rounded-md bg-blue-100 text-xs font-bold text-blue-700">{t.name.slice(0,2).toUpperCase()}</div>
                        }
                        <span className="font-medium text-gray-900">{t.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{t.admin_email ?? t.email}</td>
                    <td className="px-4 py-3 text-gray-500">{format(new Date(t.created_at), 'd MMM yyyy', { locale: es })}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <span className="flex items-center gap-1"><Users className="size-3 text-gray-400" />{t.user_count}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <span className="flex items-center gap-1"><Package className="size-3 text-gray-400" />{t.product_count}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggle(t)}
                        disabled={toggling === t.id}
                        className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                          t.active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {toggling === t.id
                          ? <Loader2 className="size-3 animate-spin" />
                          : t.active ? <CheckCircle className="size-3" /> : <XCircle className="size-3" />}
                        {t.active ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/superadmin/tenants/${t.id}`} className="flex items-center gap-1 text-[13px] font-medium text-blue-500 hover:text-blue-700">
                        Gestionar <ChevronRight className="size-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
            {filtered.map(t => (
              <div key={t.id} className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    {t.logo_url
                      ? <img src={t.logo_url} alt="" className="size-9 rounded-md object-cover" />
                      : <div className="flex size-9 items-center justify-center rounded-md bg-blue-100 text-sm font-bold text-blue-700">{t.name.slice(0,2).toUpperCase()}</div>
                    }
                    <div>
                      <p className="text-[13px] font-semibold text-gray-900">{t.name}</p>
                      <p className="text-[11px] text-gray-400">{t.admin_email ?? t.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggle(t)}
                    disabled={toggling === t.id}
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${t.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                  >
                    {t.active ? 'Activo' : 'Inactivo'}
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-gray-100 pt-3 text-center">
                  <div><p className="text-[11px] text-gray-400">Usuarios</p><p className="text-sm font-semibold">{t.user_count}</p></div>
                  <div><p className="text-[11px] text-gray-400">Productos</p><p className="text-sm font-semibold">{t.product_count}</p></div>
                </div>
                <p className="mt-1.5 text-center text-[11px] text-gray-400">Desde {format(new Date(t.created_at), 'd MMM yyyy', { locale: es })}</p>
                <Link
                  href={`/superadmin/tenants/${t.id}`}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-50"
                >
                  Gestionar <ChevronRight className="size-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
