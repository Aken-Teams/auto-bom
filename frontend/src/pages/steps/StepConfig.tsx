import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight, Wand2, CheckCircle, AlertCircle } from 'lucide-react'
import clsx from 'clsx'
import { createTask, addTaskItems, autoMatchCans, getTask } from '../../api'
import type { TaskItem } from '../../api'

interface Props {
  items: TaskItem[]
  uploadId: number | null
  onBack: () => void
  onError?: (msg: string) => void
  onComplete: (taskId: number, items: TaskItem[]) => void
}

export default function StepConfig({ items, uploadId, onBack, onError: _onError, onComplete }: Props) {
  const { t } = useTranslation()
  const [taskItems, setTaskItems] = useState<TaskItem[]>(items)
  const [matching, setMatching] = useState(false)
  const [matchResult, setMatchResult] = useState<{ matched: number; unmatched: string[] } | null>(null)
  const [taskId, setTaskId] = useState<number | null>(null)

  const handleAutoMatch = async () => {
    setMatching(true)
    try {
      // Create task if not exists
      let tid = taskId
      if (!tid) {
        const ts = new Date().toISOString().slice(0, 16).replace('T', ' ')
        const res = await createTask(`BOM Task ${ts}`, uploadId ?? undefined)
        tid = res.data.id
        setTaskId(tid)
        await addTaskItems(tid, taskItems)
      }

      const res = await autoMatchCans(tid)
      setMatchResult(res.data)

      // Reload items with matched cans
      const taskRes = await getTask(tid)
      if (taskRes.data.items) {
        setTaskItems(taskRes.data.items)
      }
    } finally {
      setMatching(false)
    }
  }

  const updateField = (idx: number, field: keyof TaskItem, value: string) => {
    setTaskItems((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      return next
    })
  }

  const handleNext = async () => {
    let tid = taskId
    if (!tid) {
      const ts = new Date().toISOString().slice(0, 16).replace('T', ' ')
      const res = await createTask(`BOM Task ${ts}`, uploadId ?? undefined)
      tid = res.data.id
      setTaskId(tid)
      await addTaskItems(tid, taskItems)
    }
    onComplete(tid, taskItems)
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-800 mb-1">{t('config.title')}</h2>
      <p className="text-sm text-slate-500 mb-4">{t('config.desc')}</p>

      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={handleAutoMatch}
          disabled={matching}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50 transition-colors"
        >
          <Wand2 size={16} className={matching ? 'animate-spin' : ''} />
          {t('config.autoMatch')}
        </button>

        {matchResult && (
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle size={14} />
              {t('config.matched', { count: matchResult.matched })}
            </span>
            {matchResult.unmatched.length > 0 && (
              <span className="flex items-center gap-1 text-orange-500">
                <AlertCircle size={14} />
                {t('config.unmatched', { count: matchResult.unmatched.length })}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="border border-slate-200 rounded-lg overflow-hidden mb-6">
        <div className="max-h-[420px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="text-left px-3 py-2.5 font-medium text-slate-600">{t('config.itemNo')}</th>
                <th className="text-left px-3 py-2.5 font-medium text-slate-600">{t('config.component')}</th>
                <th className="text-left px-3 py-2.5 font-medium text-slate-600">{t('config.altStructure')}</th>
                <th className="text-left px-3 py-2.5 font-medium text-slate-600">{t('config.weldCan')}</th>
                <th className="text-left px-3 py-2.5 font-medium text-slate-600">{t('config.moldCan')}</th>
                <th className="text-left px-3 py-2.5 font-medium text-slate-600">{t('config.packCan')}</th>
              </tr>
            </thead>
            <tbody>
              {taskItems.map((item, idx) => {
                const hasWeld = !!item.weld_can
                const hasMold = !!item.mold_can
                const hasPack = !!item.pack_can
                return (
                  <tr key={item.id ?? idx} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-mono text-xs">{item.item_no}</td>
                    <td className="px-3 py-2 font-mono text-xs">{item.component}</td>
                    <td className="px-3 py-2">
                      <input
                        value={item.alt_structure || ''}
                        onChange={(e) => updateField(idx, 'alt_structure', e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={item.weld_can || ''}
                        onChange={(e) => updateField(idx, 'weld_can', e.target.value)}
                        className={clsx(
                          'w-full px-2 py-1 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary-500',
                          hasWeld ? 'border-green-300 bg-green-50' : 'border-orange-300 bg-orange-50',
                        )}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={item.mold_can || ''}
                        onChange={(e) => updateField(idx, 'mold_can', e.target.value)}
                        className={clsx(
                          'w-full px-2 py-1 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary-500',
                          hasMold ? 'border-green-300 bg-green-50' : 'border-slate-200',
                        )}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={item.pack_can || ''}
                        onChange={(e) => updateField(idx, 'pack_can', e.target.value)}
                        className={clsx(
                          'w-full px-2 py-1 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary-500',
                          hasPack ? 'border-green-300 bg-green-50' : 'border-slate-200',
                        )}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-2.5 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft size={16} />
          {t('config.prev')}
        </button>
        <button
          onClick={handleNext}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg font-medium text-sm hover:bg-primary-700 transition-colors"
        >
          {t('config.next')}
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}
