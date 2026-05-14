import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Download, CheckCircle, Loader2, FileSpreadsheet, Home, AlertTriangle } from 'lucide-react'
import FileUploadBox from '../../components/FileUploadBox'
import { uploadStdOps, generateFiles, getDownloadUrl } from '../../api'
import type { TaskItem } from '../../api'

interface Props {
  taskId: number
  items: TaskItem[]
  onBack: () => void
  onError?: (msg: string) => void
}

export default function StepGenerate({ taskId, items, onBack, onError }: Props) {
  const { t } = useTranslation()
  const [stdResult, setStdResult] = useState<{ filename: string; row_count: number } | null>(null)
  const [generating, setGenerating] = useState(false)
  const [completed, setCompleted] = useState(false)

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      await generateFiles(taskId)
      setCompleted(true)
    } finally {
      setGenerating(false)
    }
  }

  const downloadFile = (type: string) => {
    window.open(getDownloadUrl(taskId, type), '_blank')
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-800 mb-1">{t('generate.title')}</h2>
      <p className="text-sm text-slate-500 mb-6">{t('generate.desc')}</p>

      {/* Hint banner */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6">
        <AlertTriangle size={18} className="text-amber-500 mt-0.5 shrink-0" />
        <div className="text-sm text-amber-800">
          <span className="font-semibold">{t('generate.hint')}</span>
          <span className="ml-1">{t('generate.hintDesc')}</span>
        </div>
      </div>

      {/* Input section: C-CMAX list (ready) + Std Ops (upload) */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        {/* C-CMAX list ready indicator */}
        <div className="border-2 border-green-300 bg-green-50 rounded-xl p-6 text-center">
          <div className="mb-2 font-semibold text-slate-700">{t('generate.listReady')}</div>
          <div className="flex items-center justify-center gap-2 text-green-600">
            <CheckCircle size={20} />
            <span className="text-sm font-medium">
              {t('generate.listReadyDesc', { count: items.length })}
            </span>
          </div>
        </div>

        {/* Upload std operations */}
        <FileUploadBox
          label={t('generate.stdOps')}
          description={t('generate.stdOpsDesc')}
          result={stdResult}
          onError={onError}
          onUpload={async (file) => {
            const res = await uploadStdOps(file)
            setStdResult({ filename: res.data.filename, row_count: res.data.row_count })
          }}
        />
      </div>

      {/* Output files section */}
      <div className="bg-slate-50 rounded-lg p-5 mb-6">
        <h3 className="font-medium text-slate-700 mb-3">{t('generate.outputFiles')}</h3>
        <div className="space-y-2">
          {[
            { key: 'bom', label: t('generate.bomLoader') },
            { key: 'routing', label: t('generate.routings') },
            { key: 'sequence', label: t('generate.sequences') },
          ].map((f) => (
            <div
              key={f.key}
              className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-slate-200"
            >
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={18} className={completed ? 'text-green-600' : 'text-slate-300'} />
                <span className="text-sm">{f.label}</span>
              </div>
              {completed && (
                <button
                  onClick={() => downloadFile(f.key)}
                  className="flex items-center gap-1 px-3 py-1 text-xs text-primary-600 hover:bg-primary-50 rounded transition-colors"
                >
                  <Download size={14} />
                  {t('generate.download')}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      {completed ? (
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-green-600 mb-4">
            <CheckCircle size={24} />
            <span className="text-lg font-semibold">{t('generate.completed')}</span>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 mx-auto px-6 py-2.5 bg-primary-600 text-white rounded-lg font-medium text-sm hover:bg-primary-700 transition-colors"
          >
            <Home size={16} />
            {t('generate.backToHome')}
          </button>
        </div>
      ) : (
        <div className="flex justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-5 py-2.5 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft size={16} />
            {t('generate.prev')}
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating || !stdResult}
            className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {generating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {t('generate.generating')}
              </>
            ) : (
              t('generate.generateBtn')
            )}
          </button>
        </div>
      )}
    </div>
  )
}
