import { Outlet, NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, History, Globe } from 'lucide-react'
import clsx from 'clsx'

const langs = ['zh-CN', 'zh-TW', 'en'] as const

export default function Layout() {
  const { t, i18n } = useTranslation()

  const switchLang = (lng: string) => {
    i18n.changeLanguage(lng)
    localStorage.setItem('lang', lng)
  }

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
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">AB</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900 leading-tight">
                {t('app.title')}
              </h1>
            </div>
          </div>

          <nav className="flex items-center gap-2">
            {link('/', t('nav.newTask'), Plus)}
            {link('/history', t('nav.history'), History)}

            {/* Language Switcher */}
            <div className="ml-4 pl-4 border-l border-slate-200 flex items-center gap-1">
              <Globe size={16} className="text-slate-400" />
              <select
                value={i18n.language}
                onChange={(e) => switchLang(e.target.value)}
                className="text-sm text-slate-600 bg-transparent border-none outline-none cursor-pointer py-1"
              >
                {langs.map((lng) => (
                  <option key={lng} value={lng}>
                    {t(`lang.${lng}`)}
                  </option>
                ))}
              </select>
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
