import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight, Download, CheckCircle, Loader2, FileText } from 'lucide-react'
import type { TaskItem } from '../../api'

interface Props {
  taskId: number
  items: TaskItem[]
  onBack: () => void
  onError?: (msg: string) => void
  onNextPhase: () => void
}

export default function StepExportList({ taskId: _taskId, items, onBack, onError: _onError, onNextPhase }: Props) {
  const { t } = useTranslation()
  const [generating, setGenerating] = useState(false)
  const [completed, setCompleted] = useState(false)

  const handleGenerate = async () => {
    setGenerating(true)
    // TODO: call backend to generate C-CMAX import list
    // For now simulate with a short delay
    await new Promise((r) => setTimeout(r, 800))
    setCompleted(true)
    setGenerating(false)
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-800 mb-1">{t('exportList.title')}</h2>
      <p className="text-sm text-slate-500 mb-6">{t('exportList.desc')}</p>

      {/* Summary */}
      <div className="bg-slate-50 rounded-lg p-5 mb-6">
        <h3 className="font-medium text-slate-700 mb-3">{t('exportList.summary')}</h3>
        <div className="text-sm mb-4">
          <span className="text-slate-500">{t('exportList.itemCount')}:</span>
          <span className="ml-2 font-semibold text-slate-800">{items.length}</span>
        </div>

        {/* Preview table */}
        <h3 className="font-medium text-slate-700 mb-2">{t('exportList.preview')}</h3>
        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
          <div className="max-h-[280px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-slate-600">{t('config.itemNo')}</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-600">{t('config.altStructure')}</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-600">{t('config.component')}</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-600">{t('config.weldCan')}</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-600">{t('config.moldCan')}</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-600">{t('config.packCan')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="border-t border-slate-100">
                    <td className="px-3 py-1.5 font-mono">{item.item_no}</td>
                    <td className="px-3 py-1.5">{item.alt_structure}</td>
                    <td className="px-3 py-1.5 font-mono">{item.component}</td>
                    <td className="px-3 py-1.5">{item.weld_can || '-'}</td>
                    <td className="px-3 py-1.5">{item.mold_can || '-'}</td>
                    <td className="px-3 py-1.5">{item.pack_can || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Actions */}
      {completed ? (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 text-green-600">
            <CheckCircle size={22} />
            <span className="text-lg font-semibold">{t('exportList.completed')}</span>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition-colors">
              <Download size={16} />
              {t('exportList.download')}
            </button>
            <button
              onClick={onNextPhase}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg font-medium text-sm hover:bg-primary-700 transition-colors"
            >
              {t('exportList.nextPhase')}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-5 py-2.5 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft size={16} />
            {t('exportList.prev')}
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {generating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {t('exportList.generating')}
              </>
            ) : (
              <>
                <FileText size={16} />
                {t('exportList.generateBtn')}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
