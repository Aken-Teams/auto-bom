import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload, CheckCircle, Loader2 } from 'lucide-react'
import clsx from 'clsx'

interface Props {
  label: string
  description: string
  onUpload: (file: File) => Promise<void>
  onError?: (message: string) => void
  result?: { filename: string; row_count: number } | null
}

export default function FileUploadBox({ label, description, onUpload, onError, result }: Props) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        onError?.(t('toast.invalidFormat'))
        return
      }
      setLoading(true)
      try {
        await onUpload(file)
      } catch (err: any) {
        const msg = err?.response?.data?.detail || err?.message || t('toast.uploadFailed')
        onError?.(msg)
      } finally {
        setLoading(false)
      }
    },
    [onUpload, onError, t],
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const onSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  return (
    <div
      className={clsx(
        'border-2 border-dashed rounded-xl p-6 text-center transition-colors',
        dragOver && 'border-primary-400 bg-primary-50',
        result && 'border-green-300 bg-green-50',
        !dragOver && !result && 'border-slate-200 hover:border-slate-300',
      )}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <div className="mb-2 font-semibold text-slate-700">{label}</div>
      <p className="text-sm text-slate-500 mb-4">{description}</p>

      {loading ? (
        <Loader2 size={32} className="mx-auto text-primary-500 animate-spin" />
      ) : result ? (
        <div className="flex items-center justify-center gap-2 text-green-600">
          <CheckCircle size={20} />
          <span className="text-sm font-medium">
            {t('upload.uploaded')}: {result.filename} ({result.row_count} {t('upload.rows')})
          </span>
        </div>
      ) : (
        <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
          <Upload size={16} />
          {t('upload.dragDrop')}
          <input
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={onSelect}
          />
        </label>
      )}
    </div>
  )
}
