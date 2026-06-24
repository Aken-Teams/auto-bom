import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import clsx from 'clsx'

interface Option {
  value: string
  label: string
}

interface Props {
  value: string
  onChange: (value: string) => void
  options: Option[]
  className?: string
  ariaLabel?: string
}

/** A compact, fully self-drawn dropdown with a styled option menu. */
export default function Select({ value, onChange, options, className, ariaLabel }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value)

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className={clsx('relative inline-flex', className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          'flex w-full items-center gap-1 pl-2.5 pr-2 py-1.5 text-xs text-left rounded-md border bg-white text-slate-700 cursor-pointer transition-colors',
          open
            ? 'border-primary-400 ring-2 ring-primary-500/30'
            : 'border-slate-200 hover:border-slate-300',
        )}
      >
        <span className="flex-1 truncate">{selected?.label ?? ''}</span>
        <ChevronDown
          size={14}
          className={clsx('shrink-0 text-slate-400 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute left-0 top-full z-30 mt-1 min-w-full w-max max-w-[24rem] max-h-60 overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
        >
          {options.map((o) => {
            const isSel = o.value === value
            return (
              <li key={o.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSel}
                  onClick={() => {
                    onChange(o.value)
                    setOpen(false)
                  }}
                  className={clsx(
                    'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-left transition-colors',
                    isSel
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-slate-700 hover:bg-slate-100',
                  )}
                >
                  <span className="flex-1 truncate">{o.label}</span>
                  {isSel && <Check size={14} className="shrink-0 text-primary-600" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
