'use client'

import { useRef, useState, useTransition } from 'react'
import * as XLSX from 'xlsx'
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  Loader2,
  X,
} from 'lucide-react'
import { bulkImportProducts, type ProductImportRow } from '@/app/actions/superadmin'

interface Props {
  tenantId: string
}

const REQUIRED_COLUMNS = ['nombre', 'precio_venta'] as const
const ALL_COLUMNS = ['nombre', 'categoria', 'precio_compra', 'precio_venta', 'stock', 'stock_minimo', 'sku', 'descripcion', 'unidad'] as const

type PreviewRow = Record<string, string | number>

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    [...ALL_COLUMNS],
    ['Camiseta Básica', 'Ropa', 5000, 12000, 50, 5, 'CAM-001', 'Camiseta 100% algodón', 'unidad'],
    ['Pantalón Jeans', 'Ropa', 15000, 35000, 20, 3, 'PAN-002', '', 'unidad'],
  ])
  ws['!cols'] = ALL_COLUMNS.map(() => ({ wch: 18 }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Productos')
  XLSX.writeFile(wb, 'plantilla_productos_nexo.xlsx')
}

function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '_')
    .trim()
}

export default function ProductImport({ tenantId }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [parsedRows, setParsedRows] = useState<ProductImportRow[]>([])
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [, startImport] = useTransition()

  const reset = () => {
    setFileName(null)
    setPreview([])
    setHeaders([])
    setParsedRows([])
    setValidationErrors([])
    setResult(null)
    setServerError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setResult(null)
    setServerError(null)

    const reader = new FileReader()
    reader.onload = (ev) => {
      const data = ev.target?.result
      const wb = XLSX.read(data, { type: 'binary' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const raw: PreviewRow[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

      if (!raw.length) {
        setValidationErrors(['El archivo está vacío o no tiene filas de datos'])
        setPreview([])
        return
      }

      // Normalize headers
      const originalHeaders = Object.keys(raw[0])
      const normalizedMap: Record<string, string> = {}
      originalHeaders.forEach((h) => {
        normalizedMap[h] = normalizeHeader(h)
      })

      // Remap rows to normalized headers
      const normalized: PreviewRow[] = raw.map((row) => {
        const newRow: PreviewRow = {}
        Object.entries(row).forEach(([k, v]) => {
          newRow[normalizedMap[k]] = v as string | number
        })
        return newRow
      })

      // Validate required columns
      const normalizedHeaders = Object.values(normalizedMap)
      const missing = REQUIRED_COLUMNS.filter((c) => !normalizedHeaders.includes(c))
      if (missing.length) {
        setValidationErrors([`Columnas requeridas faltantes: ${missing.join(', ')}`])
        setPreview([])
        return
      }

      // Map to typed rows
      const mapped: ProductImportRow[] = normalized.map((row) => ({
        nombre: String(row.nombre ?? ''),
        categoria: row.categoria ? String(row.categoria) : undefined,
        precio_compra: Number(row.precio_compra) || 0,
        precio_venta: Number(row.precio_venta) || 0,
        stock: Number(row.stock) || 0,
        stock_minimo: Number(row.stock_minimo) || 0,
        sku: row.sku ? String(row.sku) : undefined,
        descripcion: row.descripcion ? String(row.descripcion) : undefined,
        unidad: row.unidad ? String(row.unidad) : undefined,
      }))

      setHeaders(ALL_COLUMNS.filter((c) => normalizedHeaders.includes(c)))
      setPreview(normalized.slice(0, 5))
      setParsedRows(mapped)
      setValidationErrors([])
    }
    reader.readAsBinaryString(file)
  }

  const handleImport = () => {
    setServerError(null)
    startImport(async () => {
      const res = await bulkImportProducts(tenantId, parsedRows)
      if (res.error) {
        setServerError(res.error)
      } else {
        setResult(res.data ?? null)
        setParsedRows([])
        setPreview([])
        setFileName(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Success result */}
      {result && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="mt-0.5 size-5 shrink-0 text-green-500" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-green-800">
                Importación completada — {result.imported} productos importados
              </p>
              {result.errors.length > 0 && (
                <ul className="mt-2 space-y-0.5">
                  {result.errors.map((e, i) => (
                    <li key={i} className="text-xs text-orange-700">• {e}</li>
                  ))}
                </ul>
              )}
            </div>
            <button onClick={() => setResult(null)} className="shrink-0 text-green-400 hover:text-green-600">
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* Upload zone */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Importar productos desde Excel</h2>
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-[13px] font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            <Download className="size-3.5" />
            Descargar plantilla
          </button>
        </div>

        {/* Accepted columns info */}
        <div className="mb-4 rounded-lg bg-blue-50 p-3">
          <p className="mb-1.5 text-[12px] font-semibold text-blue-700">Columnas aceptadas</p>
          <div className="flex flex-wrap gap-1.5">
            {ALL_COLUMNS.map((col) => (
              <span
                key={col}
                className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                  REQUIRED_COLUMNS.includes(col as typeof REQUIRED_COLUMNS[number])
                    ? 'bg-blue-200 text-blue-800'
                    : 'bg-blue-100 text-blue-600'
                }`}
              >
                {col}
                {REQUIRED_COLUMNS.includes(col as typeof REQUIRED_COLUMNS[number]) ? ' *' : ''}
              </span>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-blue-600">* requeridas</p>
        </div>

        {/* Drop zone */}
        {!fileName ? (
          <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-10 transition-colors hover:border-blue-400 hover:bg-blue-50">
            <FileSpreadsheet className="size-10 text-gray-300" />
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">
                Haz clic para seleccionar un archivo
              </p>
              <p className="mt-0.5 text-xs text-gray-400">.xlsx o .csv — máximo 10.000 filas</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv,.xls"
              onChange={handleFile}
              className="hidden"
            />
          </label>
        ) : (
          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet className="size-5 text-green-500" />
              <div>
                <p className="text-[13px] font-medium text-gray-900">{fileName}</p>
                <p className="text-[11px] text-gray-400">{parsedRows.length} filas encontradas</p>
              </div>
            </div>
            <button onClick={reset} className="rounded-lg p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600">
              <X className="size-4" />
            </button>
          </div>
        )}

        {/* Validation errors */}
        {validationErrors.length > 0 && (
          <div className="mt-3 rounded-lg border border-red-100 bg-red-50 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-500" />
              <ul className="space-y-0.5">
                {validationErrors.map((e, i) => (
                  <li key={i} className="text-xs text-red-600">{e}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Preview */}
      {preview.length > 0 && (
        <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h3 className="text-[13px] font-semibold text-gray-900">
              Vista previa <span className="font-normal text-gray-400">(primeras {preview.length} filas de {parsedRows.length})</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {headers.map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {preview.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {headers.map((h) => (
                      <td key={h} className="px-3 py-2 text-[13px] text-gray-700">
                        {String(row[h] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Import button */}
          <div className="border-t border-gray-100 p-4">
            {serverError && (
              <p className="mb-3 text-xs text-red-500">{serverError}</p>
            )}
            <button
              onClick={handleImport}
              disabled={!parsedRows.length}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600 disabled:opacity-60 sm:w-auto sm:px-6"
            >
              <Upload className="size-4" />
              Importar {parsedRows.length} productos
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
