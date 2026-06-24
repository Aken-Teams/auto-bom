import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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

const MAX_MENU_H = 256

/** A compact dropdown with a self-drawn, height-capped menu rendered in a portal
 *  (so it is never clipped by scrollable/overflow ancestors). */
export default function Select({ value, onChange, options, className, ariaLabel }: Props) {
  const [open, setOpen] = useState(false)
  const [style, setStyle] = useState<React.CSSProperties>({})
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)
  const selected = options.find((o) => o.value === value)

  const place = () => {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const margin = 4
    const spaceBelow = window.innerHeight - r.bottom
    const spaceAbove = r.top
    if (spaceBelow >= 180 || spaceBelow >= spaceAbove) {
      setStyle({
        position: 'fixed',
        top: r.bottom + margin,
        left: r.left,
        width: r.width,
        maxHeight: Math.min(MAX_MENU_H, spaceBelow - margin - 8),
      })
    } else {
      setStyle({
        position: 'fixed',
        bottom: window.innerHeight - r.top + margin,
        left: r.left,
        width: r.width,
        maxHeight: Math.min(MAX_MENU_H, spaceAbove - margin - 8),
      })
    }
  }

  useLayoutEffect(() => {
    if (open) place()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    const onScrollResize = () => setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScrollResize, true)
    window.addEventListener('resize', onScrollResize)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScrollResize, true)
      window.removeEventListener('resize', onScrollResize)
    }
  }, [open])

  return (
    <div className={clsx('relative inline-flex', className)}>
      <button
        ref={triggerRef}
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

      {open &&
        createPortal(
          <ul
            ref={menuRef}
            role="listbox"
            style={style}
            className="z-50 overflow-y-auto overflow-x-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
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
          </ul>,
          document.body,
        )}
    </div>
  )
}
