import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight, Wand2, CheckCircle, AlertCircle, Plus, X } from 'lucide-react'
import clsx from 'clsx'
import { createTask, addTaskItems, autoMatchCans, getTask, getCanOptions } from '../../api'
import type { TaskItem, CanOption, CanRule } from '../../api'
import Select from '../../components/Select'

const MATCH_FIELDS = ['item_no', 'type_name', 'family', 'package', 'component'] as const
const MATCH_OPS = ['all', 'contains', 'equals', 'regex'] as const

interface Props {
  items: TaskItem[]
  uploadId: number | null
  canUploadId: number | null
  onBack: () => void
  onError?: (msg: string) => void
  onComplete: (taskId: number, items: TaskItem[]) => void
}

export default function StepConfig({ items, uploadId, canUploadId, onBack, onError: _onError, onComplete }: Props) {
  const { t } = useTranslation()
  const [taskItems, setTaskItems] = useState<TaskItem[]>(items)
  const [matching, setMatching] = useState(false)
  const [matchResult, setMatchResult] = useState<{
    matched_weld: number
    matched_mold: number
    matched_pack: number
    unmatched: string[]
  } | null>(null)
  const [taskId, setTaskId] = useState<number | null>(null)
  const [canOptions, setCanOptions] = useState<CanOption[]>([])
  const [rules, setRules] = useState<CanRule[]>([])

  const moldOptions = canOptions.filter((o) => o.can_type === 'mold')
  const packOptions = canOptions.filter((o) => o.can_type === 'pack')

  // Load general can options from the uploaded file and seed default rules.
  // Rules are NOT persisted — they are re-seeded from the current file each time,
  // since each run's BOM base + can file (and thus the rules) may differ.
  useEffect(() => {
    let cancelled = false
    getCanOptions()
      .then((optRes) => {
        if (cancelled) return
        const opts = optRes.data || []
        setCanOptions(opts)
        const seeded: CanRule[] = []
        const molds = opts.filter((o) => o.can_type === 'mold')
        const packs = opts.filter((o) => o.can_type === 'pack')
        // Single mold -> apply to all; multiple -> first is default, rest need a condition
        molds.forEach((o, i) => {
          seeded.push({
            can_type: 'mold',
            match_field: 'item_no',
            match_op: i === molds.length - 1 ? 'all' : 'contains',
            match_value: '',
            can_code: o.can_code,
          })
        })
        // Two packs -> suggest R1 / R2 split as a starting point for discussion
        const guesses = packs.length === 2 ? ['_R1_', '_R2_'] : packs.map(() => '')
        packs.forEach((o, i) => {
          seeded.push({
            can_type: 'pack',
            match_field: 'item_no',
            match_op: 'contains',
            match_value: guesses[i] ?? '',
            can_code: o.can_code,
          })
        })
        setRules(seeded)
      })
      .catch(() => {
        /* options are optional; panel just stays empty */
      })
    return () => {
      cancelled = true
    }
  }, [])

  const addRule = (canType: 'mold' | 'pack') => {
    const opts = canType === 'mold' ? moldOptions : packOptions
    setRules((prev) => [
      ...prev,
      {
        can_type: canType,
        match_field: 'item_no',
        match_op: 'contains',
        match_value: '',
        can_code: opts[0]?.can_code ?? '',
      },
    ])
  }

  const removeRule = (target: CanRule) => {
    setRules((prev) => prev.filter((r) => r !== target))
  }

  const updateRule = (target: CanRule, patch: Partial<CanRule>) => {
    setRules((prev) => prev.map((r) => (r === target ? { ...r, ...patch } : r)))
  }

  const handleAutoMatch = async () => {
    setMatching(true)
    try {
      // Create task if not exists
      let tid = taskId
      if (!tid) {
        const ts = new Date().toISOString().slice(0, 16).replace('T', ' ')
        const res = await createTask(`BOM Task ${ts}`, uploadId ?? undefined, canUploadId ?? undefined)
        tid = res.data.id
        setTaskId(tid)
        await addTaskItems(tid, taskItems)
      }

      const res = await autoMatchCans(tid, rules)
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
      const res = await createTask(`BOM Task ${ts}`, uploadId ?? undefined, canUploadId ?? undefined)
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

      {/* Can-matching rule panel */}
      {canOptions.length > 0 && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
          <p className="mb-2 text-sm font-semibold text-slate-700">{t('config.rules.title')}</p>
          <p className="mb-3 text-xs text-slate-500">• {t('config.rules.weldInfo')}</p>

          {(['mold', 'pack'] as const).map((ct) => {
            const opts = ct === 'mold' ? moldOptions : packOptions
            if (opts.length === 0) return null
            const typeRules = rules.filter((r) => r.can_type === ct)
            return (
              <div key={ct} className="mb-3 last:mb-0">
                <p className="mb-1.5 text-xs font-medium text-slate-600">{t(`config.rules.${ct}`)}</p>
                <div className="space-y-1.5">
                  {typeRules.map((r, i) => (
                    <div
                      key={i}
                      className="flex flex-wrap items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1.5"
                    >
                      <Select
                        ariaLabel={t('config.rules.field.item_no')}
                        value={r.match_field}
                        onChange={(v) => updateRule(r, { match_field: v })}
                        options={MATCH_FIELDS.map((f) => ({ value: f, label: t(`config.rules.field.${f}`) }))}
                      />
                      <Select
                        ariaLabel={t('config.rules.op.contains')}
                        value={r.match_op}
                        onChange={(v) => updateRule(r, { match_op: v })}
                        options={MATCH_OPS.map((o) => ({ value: o, label: t(`config.rules.op.${o}`) }))}
                      />
                      {r.match_op !== 'all' && (
                        <input
                          value={r.match_value || ''}
                          onChange={(e) => updateRule(r, { match_value: e.target.value })}
                          placeholder={t('config.rules.valuePlaceholder')}
                          className="w-28 px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-colors"
                        />
                      )}
                      <span className="px-0.5 text-slate-400">→</span>
                      <Select
                        ariaLabel={t(`config.rules.${ct}`)}
                        className="min-w-[15rem] flex-1"
                        value={r.can_code}
                        onChange={(v) => updateRule(r, { can_code: v })}
                        options={opts.map((o) => ({
                          value: o.can_code,
                          label: o.label ? `${o.can_code} (${o.label})` : o.can_code,
                        }))}
                      />
                      <button
                        type="button"
                        onClick={() => removeRule(r)}
                        className="ml-auto text-slate-400 hover:text-red-500 transition-colors"
                        aria-label={t('config.rules.remove')}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addRule(ct)}
                    className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
                  >
                    <Plus size={12} />
                    {t('config.rules.add')}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

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
              {t('config.matchedDetail', {
                weld: matchResult.matched_weld,
                mold: matchResult.matched_mold,
                pack: matchResult.matched_pack,
              })}
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
