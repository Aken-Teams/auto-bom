import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight, Search, HelpCircle } from 'lucide-react'
import clsx from 'clsx'
import type { BomItem, TaskItem } from '../../api'

interface Props {
  items: BomItem[]
  onBack: () => void
  onComplete: (selected: TaskItem[]) => void
}

// A unique BOM line is identified by item_no + component (原件 WAF) + alt_structure (替代结构):
// the same item_no can map to multiple chip components, and the same item_no + component
// can still carry different replacement structures — each combination is a distinct line.
// Mirrors the alt value sent downstream in handleNext (max_alt_structure || alt_structure).
const lineKey = (item: BomItem) =>
  `${item.item_no}||${item.component || ''}||${item.max_alt_structure || item.alt_structure || ''}`

export default function StepFilter({ items, onBack, onComplete }: Props) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showHelp, setShowHelp] = useState(false)

  // Deduplicate by item_no + component (keep every distinct chip line)
  const uniqueItems = useMemo(() => {
    const map = new Map<string, BomItem>()
    for (const item of items) {
      const k = lineKey(item)
      if (!map.has(k)) map.set(k, item)
    }
    return Array.from(map.values())
  }, [items])

  const filtered = useMemo(() => {
    if (!search) return uniqueItems
    const q = search.toLowerCase()
    return uniqueItems.filter(
      (i) =>
        i.item_no.toLowerCase().includes(q) ||
        (i.summary || '').toLowerCase().includes(q) ||
        (i.type_name || '').toLowerCase().includes(q) ||
        (i.family || '').toLowerCase().includes(q),
    )
  }, [uniqueItems, search])

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(lineKey)))
    }
  }

  const toggle = (key: string) => {
    const next = new Set(selected)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setSelected(next)
  }

  const handleNext = () => {
    const selectedItems: TaskItem[] = uniqueItems
      .filter((i) => selected.has(lineKey(i)))
      .map((i) => ({
        item_no: i.item_no,
        summary: i.summary,
        doc_no: i.doc_no,
        type_name: i.type_name,
        family: i.family,
        package: i.package,
        line: i.line,
        function: i.function,
        alt_structure: i.max_alt_structure || i.alt_structure,
        component: i.component,
        component_summary: i.component_summary,
        unit_usage: i.unit_usage,
      }))
    onComplete(selectedItems)
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <h2 className="text-xl font-semibold text-slate-800">{t('filter.title')}</h2>
        <div className="relative">
          <button
            type="button"
            aria-label={t('filter.helpTitle')}
            onClick={() => setShowHelp((v) => !v)}
            className="text-slate-400 hover:text-primary-600 transition-colors"
          >
            <HelpCircle size={18} />
          </button>
          {showHelp && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowHelp(false)} />
              <div className="absolute left-0 top-7 z-20 w-80 rounded-lg border border-slate-200 bg-white p-4 shadow-lg">
                <p className="mb-1.5 text-sm font-semibold text-slate-800">{t('filter.helpTitle')}</p>
                <p className="whitespace-pre-line text-xs leading-relaxed text-slate-600">
                  {t('filter.helpBody')}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
      <p className="text-sm text-slate-500 mb-4">{t('filter.desc')}</p>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t('filter.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={toggleAll}
          className="px-4 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
        >
          {selected.size === filtered.length ? t('filter.deselectAll') : t('filter.selectAll')}
        </button>
        <span className="text-sm text-slate-500">
          {t('filter.selected', { count: selected.size })}
        </span>
      </div>

      <div className="border border-slate-200 rounded-lg overflow-hidden mb-6">
        <div className="max-h-[420px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="w-10 px-3 py-2.5"></th>
                <th className="text-left px-3 py-2.5 font-medium text-slate-600">{t('filter.itemNo')}</th>
                <th className="text-left px-3 py-2.5 font-medium text-slate-600">{t('filter.type')}</th>
                <th className="text-left px-3 py-2.5 font-medium text-slate-600">{t('filter.family')}</th>
                <th className="text-left px-3 py-2.5 font-medium text-slate-600">{t('filter.package')}</th>
                <th className="text-left px-3 py-2.5 font-medium text-slate-600">{t('filter.component')}</th>
                <th className="text-left px-3 py-2.5 font-medium text-slate-600">{t('filter.altStructure')}</th>
                <th className="text-left px-3 py-2.5 font-medium text-slate-600 max-w-[200px]">{t('filter.summary')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const key = lineKey(item)
                return (
                <tr
                  key={key}
                  onClick={() => toggle(key)}
                  className={clsx(
                    'cursor-pointer border-t border-slate-100 transition-colors',
                    selected.has(key)
                      ? 'bg-primary-50'
                      : 'hover:bg-slate-50',
                  )}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(key)}
                      readOnly
                      className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{item.item_no}</td>
                  <td className="px-3 py-2">{item.type_name}</td>
                  <td className="px-3 py-2">{item.family}</td>
                  <td className="px-3 py-2">{item.package}</td>
                  <td className="px-3 py-2 font-mono text-xs">{item.component}</td>
                  <td className="px-3 py-2 font-mono text-xs">{item.max_alt_structure || item.alt_structure}</td>
                  <td className="px-3 py-2 text-xs text-slate-500 max-w-[200px] truncate">{item.summary}</td>
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
          {t('filter.prev')}
        </button>
        <button
          disabled={selected.size === 0}
          onClick={handleNext}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg font-medium text-sm hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {t('filter.next')}
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}
