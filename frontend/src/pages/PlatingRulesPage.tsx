import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, X, Save, Loader2, Info, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import Select from '../components/Select'
import Toast from '../components/Toast'
import { getPlatingRules, savePlatingRules } from '../api'
import type { PlatingRule } from '../api'

const FIELDS = ['summary', 'item_no'] as const
const UMS = [8, 5] as const
const PAGE_SIZE = 10

export default function PlatingRulesPage() {
  const { t } = useTranslation()
  const [rules, setRules] = useState<PlatingRule[]>([])
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // search / filter / pagination
  const [search, setSearch] = useState('')
  const [fieldFilter, setFieldFilter] = useState('')
  const [umFilter, setUmFilter] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    getPlatingRules()
      .then((res) => setRules(res.data || []))
      .catch(() => setRules([]))
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rules.filter((r) => {
      if (fieldFilter && r.match_field !== fieldFilter) return false
      if (umFilter && String(r.target_um) !== umFilter) return false
      if (q && !(r.match_value || '').toLowerCase().includes(q)) return false
      return true
    })
  }, [rules, search, fieldFilter, umFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  useEffect(() => setPage(1), [search, fieldFilter, umFilter])
  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const addRule = () => {
    setSearch(''); setFieldFilter(''); setUmFilter('')
    setRules((prev) => [...prev, { match_field: 'summary', match_value: '', target_um: 8 }])
    setPage(Math.ceil((rules.length + 1) / PAGE_SIZE))
  }
  const removeRule = (target: PlatingRule) =>
    setRules((prev) => prev.filter((r) => r !== target))
  const updateRule = (target: PlatingRule, patch: Partial<PlatingRule>) =>
    setRules((prev) => prev.map((r) => (r === target ? { ...r, ...patch } : r)))

  const save = async () => {
    setSaving(true)
    try {
      const clean = rules.filter((r) => (r.match_value || '').trim())
      await savePlatingRules(clean)
      setRules(clean)
      setToast({ message: t('plating.saved'), type: 'success' })
    } catch {
      setToast({ message: t('plating.saveFailed'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <h2 className="text-2xl font-semibold text-slate-800 mb-1">{t('plating.title')}</h2>
      <p className="text-sm text-slate-500 mb-6">{t('plating.desc')}</p>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        {/* Hint */}
        <div className="flex items-start gap-2 rounded-lg bg-primary-50 border border-primary-100 px-4 py-3 mb-5 text-sm text-slate-600">
          <Info size={16} className="text-primary-500 mt-0.5 shrink-0" />
          <span>{t('plating.hint')}</span>
        </div>

        {/* Toolbar: search + filters */}
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="relative flex-1 min-w-[14rem]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('plating.search')}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <Select
            className="w-32"
            ariaLabel={t('plating.field')}
            value={fieldFilter}
            onChange={setFieldFilter}
            options={[{ value: '', label: t('plating.allFields') }, ...FIELDS.map((f) => ({ value: f, label: t(`plating.fields.${f}`) }))]}
          />
          <Select
            className="w-32"
            ariaLabel={t('plating.target')}
            value={umFilter}
            onChange={setUmFilter}
            options={[{ value: '', label: t('plating.allUm') }, ...UMS.map((u) => ({ value: String(u), label: `${u}um` }))]}
          />
          <span className="text-sm text-slate-500">{t('plating.count', { count: filtered.length })}</span>
        </div>

        {/* Rules table */}
        <div className="border border-slate-200 rounded-lg overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-slate-600 w-40">{t('plating.field')}</th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-600">{t('plating.valueCol')}</th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-600 w-40">{t('plating.target')}</th>
                <th className="px-4 py-2.5 w-14"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400">
                    {rules.length === 0 ? t('plating.empty') : t('plating.noMatch')}
                  </td>
                </tr>
              )}
              {paged.map((r) => (
                <tr key={r.id ?? `n${rules.indexOf(r)}`} className="border-t border-slate-100">
                  <td className="px-4 py-2.5">
                    <Select
                      className="w-full"
                      ariaLabel={t('plating.field')}
                      value={r.match_field}
                      onChange={(v) => updateRule(r, { match_field: v })}
                      options={FIELDS.map((f) => ({ value: f, label: t(`plating.fields.${f}`) }))}
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      value={r.match_value}
                      onChange={(e) => updateRule(r, { match_value: e.target.value })}
                      placeholder={t('plating.valuePlaceholder')}
                      className="w-full px-3 py-1.5 text-sm font-mono border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <Select
                      className="w-full"
                      ariaLabel={t('plating.target')}
                      value={String(r.target_um)}
                      onChange={(v) => updateRule(r, { target_um: Number(v) })}
                      options={UMS.map((u) => ({ value: String(u), label: `${u}um` }))}
                    />
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <button
                      type="button"
                      onClick={() => removeRule(r)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                      aria-label={t('plating.remove')}
                    >
                      <X size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add + pagination row */}
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={addRule}
            className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700"
          >
            <Plus size={15} />
            {t('plating.add')}
          </button>

          {totalPages > 1 && (
            <div className="flex items-center gap-1 text-sm text-slate-500">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-1">{t('plating.pageInfo', { page, total: totalPages })}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-slate-100 pt-5">
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg font-medium text-sm hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {t('plating.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
