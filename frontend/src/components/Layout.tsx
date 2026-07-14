import { useState, useRef, useEffect } from 'react'
import { Outlet, NavLink, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, History, Globe, Check, ChevronDown, SlidersHorizontal } from 'lucide-react'
import clsx from 'clsx'

const langs = ['zh-CN', 'zh-TW', 'en'] as const

export default function Layout() {
  const { t, i18n } = useTranslation()
  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)

  const switchLang = (lng: string) => {
    i18n.changeLanguage(lng)
    localStorage.setItem('lang', lng)
    setLangOpen(false)
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const link = (to: string, label: string, Icon: typeof Plus) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary-600 text-white shadow-sm'
            : 'text-slate-600 hover:bg-slate-100',
        )
      }
    >
      <Icon size={18} />
      {label}
    </NavLink>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-3 rounded-lg -mx-1 px-1 hover:opacity-80 transition-opacity"
            aria-label={t('app.title')}
          >
            <img src="/logo.png" alt="Auto-BOM" className="w-9 h-9" />
            <h1 className="text-lg font-semibold text-slate-900 leading-tight">
              {t('app.title')}
            </h1>
          </Link>

          <nav className="flex items-center gap-2">
            {link('/', t('nav.newTask'), Plus)}
            {link('/history', t('nav.history'), History)}
            {link('/plating-rules', t('nav.platingRules'), SlidersHorizontal)}

            {/* Language Switcher */}
            <div className="ml-4 pl-4 border-l border-slate-200 relative" ref={langRef}>
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <Globe size={16} className="text-slate-400" />
                <span>{t(`lang.${i18n.language}`)}</span>
                <ChevronDown
                  size={14}
                  className={clsx('text-slate-400 transition-transform', langOpen && 'rotate-180')}
                />
              </button>

              {langOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
                  {langs.map((lng) => (
                    <button
                      key={lng}
                      onClick={() => switchLang(lng)}
                      className={clsx(
                        'w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors',
                        i18n.language === lng
                          ? 'text-primary-600 bg-primary-50 font-medium'
                          : 'text-slate-600 hover:bg-slate-50',
                      )}
                    >
                      {t(`lang.${lng}`)}
                      {i18n.language === lng && <Check size={15} className="text-primary-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
