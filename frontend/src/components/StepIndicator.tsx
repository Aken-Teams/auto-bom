import { useTranslation } from 'react-i18next'
import { Upload, Filter, Settings, FileText, FileOutput } from 'lucide-react'
import clsx from 'clsx'

const steps = [
  { key: 'upload', icon: Upload, phase: 1 },
  { key: 'filter', icon: Filter, phase: 1 },
  { key: 'config', icon: Settings, phase: 1 },
  { key: 'exportList', icon: FileText, phase: 1 },
  { key: 'generateFiles', icon: FileOutput, phase: 2 },
] as const

export default function StepIndicator({ current }: { current: number }) {
  const { t } = useTranslation()

  return (
    <div className="mb-8">
      {/* Phase labels */}
      <div className="flex items-center justify-center gap-8 mb-3">
        <div className={clsx(
          'text-xs font-semibold px-3 py-1 rounded-full',
          current <= 3 ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-400'
        )}>
          {t('phase.one')}
        </div>
        <div className={clsx(
          'text-xs font-semibold px-3 py-1 rounded-full',
          current === 4 ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-400'
        )}>
          {t('phase.two')}
        </div>
      </div>

      {/* Steps */}
      <div className="flex items-center justify-center">
        {steps.map((step, idx) => {
          const Icon = step.icon
          const isActive = idx === current
          const isDone = idx < current

          return (
            <div key={step.key} className="flex items-center">
              {/* Phase divider */}
              {idx === 4 && (
                <div className="mx-3 w-px h-8 bg-slate-300" />
              )}

              <div className="flex flex-col items-center">
                <div
                  className={clsx(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
                    isActive && 'bg-primary-600 text-white shadow-md',
                    isDone && 'bg-primary-100 text-primary-700',
                    !isActive && !isDone && 'bg-slate-100 text-slate-400',
                  )}
                >
                  <Icon size={20} />
                </div>
                <span
                  className={clsx(
                    'text-xs mt-1.5 font-medium whitespace-nowrap',
                    isActive && 'text-primary-600',
                    isDone && 'text-primary-700',
                    !isActive && !isDone && 'text-slate-400',
                  )}
                >
                  {t(`steps.${step.key}`)}
                </span>
              </div>

              {idx < steps.length - 1 && idx !== 3 && (
                <div
                  className={clsx(
                    'w-14 h-0.5 mx-2 mt-[-16px]',
                    idx < current ? 'bg-primary-400' : 'bg-slate-200',
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
