import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, FileSpreadsheet, Database, ChevronDown, ChevronUp } from 'lucide-react'
import clsx from 'clsx'
import { getTasks, getDownloadUrl } from '../api'
import type { Task } from '../api'

interface TaskWithUploads extends Task {
  bom_upload?: { filename: string; row_count: number; uploaded_at: string } | null
  std_upload?: { filename: string; row_count: number; uploaded_at: string } | null
}

export default function HistoryPage() {
  const { t } = useTranslation()
  const [tasks, setTasks] = useState<TaskWithUploads[]>([])
  const [expandedId, setExpandedId] = useState<number | null>(null)

  useEffect(() => {
    getTasks().then((res) => setTasks(res.data))
  }, [])

  const statusBadge = (status: string) => {
    const cls = {
      draft: 'bg-slate-100 text-slate-600',
      processing: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
    }[status] || 'bg-slate-100 text-slate-600'

    return (
      <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', cls)}>
        {t(`history.${status}`)}
      </span>
    )
  }

  const toggle = (id: number) => setExpandedId(expandedId === id ? null : id)

  return (
    <div>
      <h2 className="text-2xl font-semibold text-slate-800 mb-1">{t('history.title')}</h2>
      <p className="text-sm text-slate-500 mb-6">{t('history.desc')}</p>

      {tasks.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center text-slate-400">
          {t('history.noTasks')}
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div key={task.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              {/* Task header row */}
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => toggle(task.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-semibold text-slate-800 truncate">{task.name}</span>
                    {statusBadge(task.status)}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>{t('history.items')}: {task.item_count}</span>
                    <span>{task.created_at ? new Date(task.created_at).toLocaleString() : ''}</span>
                  </div>
                </div>

                {/* Download buttons */}
                <div className="flex gap-1 shrink-0 flex-wrap justify-end">
                  {(task as any).has_cmax && (
                    <a
                      href={getDownloadUrl(task.id, 'cmax')}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                    >
                      <Download size={13} />
                      C-CMAX
                    </a>
                  )}
                  {(task as any).has_output && ['bom', 'routing', 'sequence'].map((type) => (
                    <a
                      key={type}
                      href={getDownloadUrl(task.id, type)}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    >
                      <Download size={13} />
                      {type}
                    </a>
                  ))}
                </div>

                {expandedId === task.id
                  ? <ChevronUp size={18} className="text-slate-400 shrink-0" />
                  : <ChevronDown size={18} className="text-slate-400 shrink-0" />}
              </div>

              {/* Expanded detail */}
              {expandedId === task.id && (
                <div className="border-t border-slate-100 px-5 py-4 bg-slate-50">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                    {t('history.sourceFiles')}
                  </h4>
                  <div className="grid gap-3 md:grid-cols-2">
                    {/* BOM base upload */}
                    <div className="flex items-start gap-3 bg-white rounded-lg px-4 py-3 border border-slate-200">
                      <FileSpreadsheet size={18} className="text-blue-500 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-slate-500 mb-0.5">
                          {t('history.fileType_bom_base')}
                        </div>
                        {task.bom_upload ? (
                          <>
                            <div className="text-sm text-slate-800 truncate">{task.bom_upload.filename}</div>
                            <div className="text-xs text-slate-400">
                              {task.bom_upload.row_count.toLocaleString()} {t('upload.rows')}
                            </div>
                          </>
                        ) : (
                          <div className="text-sm text-slate-400">-</div>
                        )}
                      </div>
                    </div>

                    {/* Std operations upload */}
                    <div className="flex items-start gap-3 bg-white rounded-lg px-4 py-3 border border-slate-200">
                      <Database size={18} className="text-amber-500 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-slate-500 mb-0.5">
                          {t('history.fileType_std_operation')}
                        </div>
                        {task.std_upload ? (
                          <>
                            <div className="text-sm text-slate-800 truncate">{task.std_upload.filename}</div>
                            <div className="text-xs text-slate-400">
                              {task.std_upload.row_count.toLocaleString()} {t('upload.rows')}
                            </div>
                          </>
                        ) : (
                          <div className="text-sm text-slate-400">-</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Completion info */}
                  {task.completed_at && (
                    <div className="mt-3 text-xs text-slate-500">
                      {t('history.completedAt')}: {new Date(task.completed_at).toLocaleString()}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
