'use client'

import { useRef, useState, useTransition } from 'react'
import * as XLSX from 'xlsx'
import { Upload, Download, FileSpreadsheet, CheckCircle, AlertTriangle, Loader2, X } from 'lucide-react'
import { bulkImportProducts, type ProductImportRow } from '@/app/actions/superadmin'

interface Props {
  tenantId: string
  onImported?: (count: number) => void
}

const REQUIRED = ['nombre', 'precio_venta'] as const
const ALL_COLS  = ['nombre', 'categoria', 'precio_compra', 'precio_venta', 'stock', 'stock_minimo', 'sku', 'descripcion', 'unidad'] as const

type Row = Record<string, string | number>

function normalizeKey(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '_').trim()
}

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    [...ALL_COLS],
    ['Camiseta Básica', 'Ropa', 5000, 12000, 50, 5, 'CAM-001', 'Camiseta algodón', 'unidad'],
    ['Pantalón Jeans',  'Ropa', 15000, 35000, 20, 3, 'PAN-002', '',               'unidad'],
  ])
  ws['!cols'] = ALL_COLS.map(() => ({ wch: 18 }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Productos')
  XLSX.writeFile(wb, 'plantilla_nexo.xlsx')
}

export default function ProductImport({ tenantId, onImported }: Props) {
  const ref = useRef<HTMLInputElement>(null)

  const [fileName,   setFileName]   = useState<string | null>(null)
  const [headers,    setHeaders]    = useState<string[]>([])
  const [preview,    setPreview]    = useState<Row[]>([])
  const [rows,       setRows]       = useState<ProductImportRow[]>([])
  const [valErrors,  setValErrors]  = useState<string[]>([])
  const [result,     setResult]     = useState<{ imported: number; errors: string[] } | null>(null)
  const [srvError,   setSrvError]   = useState<string | null>(null)
  const [, startImport] = useTransition()

  const clearFile = () => {
    setFileName(null); setHeaders([]); setPreview([]); setRows([])
    setValErrors([]); setSrvError(null)
    if (ref.current) ref.current.value = ''
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name); setResult(null); setSrvError(null)

    const reader = new FileReader()
    reader.onload = ev => {
      const wb  = XLSX.read(ev.target?.result, { type: 'binary' })
      const ws  = wb.Sheets[wb.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json<Row>(ws, { defval: '' })

      if (!raw.length) { setValErrors(['Archivo vacío']); return }

      const origKeys = Object.keys(raw[0])
      const keyMap: Record<string, string> = {}
      origKeys.forEach(k => { keyMap[k] = normalizeKey(k) })

      const normalized: Row[] = raw.map(r => {
        const out: Row = {}
        Object.entries(r).forEach(([k, v]) => { out[keyMap[k]] = v })
        return out
      })

      const normKeys = Object.values(keyMap)
      const missing  = REQUIRED.filter(c => !normKeys.includes(c))
      if (missing.length) { setValErrors([`Columnas requeridas faltantes: ${missing.join(', ')}`]); setPreview([]); return }

      const mapped: ProductImportRow[] = normalized.map(r => ({
        nombre:        String(r.nombre ?? ''),
        categoria:     r.categoria  ? String(r.categoria)  : undefined,
        precio_compra: Number(r.precio_compra) || 0,
        precio_venta:  Number(r.precio_venta)  || 0,
        stock:         Number(r.stock)         || 0,
        stock_minimo:  Number(r.stock_minimo)  || 0,
        sku:           r.sku         ? String(r.sku)         : undefined,
        descripcion:   r.descripcion ? String(r.descripcion) : undefined,
        unidad:        r.unidad      ? String(r.unidad)      : undefined,
      }))

      setHeaders(ALL_COLS.filter(c => normKeys.includes(c)))
      setPreview(normalized.slice(0, 5))
      setRows(mapped)
      setValErrors([])
    }
    reader.readAsBinaryString(file)
  }

  const handleImport = () => {
    setSrvError(null)
    startImport(async () => {
      const r = await bulkImportProducts(tenantId, rows)
      if (r.error) { setSrvError(r.error); return }
      const res = r.data ?? { imported: 0, errors: [] }
      setResult(res)
      onImported?.(res.imported)
      clearFile()
    })
  }

  return (
    <div className="space-y-4">

      {/* Result banner */}
      {result && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="mt-0.5 size-5 shrink-0 text-green-500" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-green-800">{result.imported} productos importados correctamente</p>
              {result.errors.map((e, i) => <p key={i} className="mt-0.5 text-xs text-orange-700">• {e}</p>)}
            </div>
            <button onClick={() => setResult(null)} className="text-green-400 hover:text-green-600"><X className="size-4" /></button>
          </div>
        </div>
      )}

      {/* Upload card */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Importar desde Excel / CSV</h2>
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-[13px] font-medium text-gray-600 hover:bg-gray-50"
          >
            <Download className="size-3.5" /> Descargar plantilla
          </button>
        </div>

        {/* Column guide */}
        <div className="mb-4 rounded-lg bg-gray-50 p-3">
          <p className="mb-1.5 text-[12px] font-semibold text-gray-600">Columnas</p>
          <div className="flex flex-wrap gap-1.5">
            {ALL_COLS.map(col => {
              const req = REQUIRED.includes(col as typeof REQUIRED[number])
              return (
                <span
                  key={col}
                  className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${req ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'}`}
                >
                  {col}{req ? ' *' : ''}
                </span>
              )
            })}
          </div>
          <p className="mt-1.5 text-[11px] text-gray-400">* requeridas</p>
        </div>

        {/* Drop zone or selected file */}
        {!fileName ? (
          <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-6 py-10 transition-colors hover:border-blue-400 hover:bg-blue-50/40">
            <FileSpreadsheet className="size-9 text-gray-300" />
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">Seleccionar archivo</p>
              <p className="text-xs text-gray-400">.xlsx, .xls o .csv</p>
            </div>
            <input ref={ref} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
          </label>
        ) : (
          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet className="size-5 text-green-500" />
              <div>
                <p className="text-[13px] font-medium text-gray-900">{fileName}</p>
                <p className="text-[11px] text-gray-400">{rows.length} filas</p>
              </div>
            </div>
            <button onClick={clearFile} className="rounded p-1 text-gray-400 hover:bg-gray-200"><X className="size-4" /></button>
          </div>
        )}

        {/* Validation errors */}
        {valErrors.length > 0 && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 p-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-500" />
            <ul>{valErrors.map((e, i) => <li key={i} className="text-xs text-red-600">{e}</li>)}</ul>
          </div>
        )}
      </div>

      {/* Preview + import */}
      {preview.length > 0 && (
        <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
          <div className="border-b border-gray-100 px-4 py-3">
            <h3 className="text-[13px] font-semibold text-gray-900">
              Vista previa
              <span className="ml-1 font-normal text-gray-400">(primeras {preview.length} de {rows.length} filas)</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {headers.map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {preview.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {headers.map(h => (
                      <td key={h} className="px-3 py-2 text-[13px] text-gray-700">{String(row[h] ?? '—')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-gray-100 p-4">
            {srvError && <p className="mb-3 text-xs text-red-500">{srvError}</p>}
            <button
              onClick={handleImport}
              disabled={!rows.length}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-60 sm:w-auto sm:px-6"
            >
              <Upload className="size-4" />
              Importar {rows.length} productos
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
