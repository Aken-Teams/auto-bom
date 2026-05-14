import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, FileSpreadsheet, Upload } from 'lucide-react'
import clsx from 'clsx'
import { getTasks, getUploadRecords, getDownloadUrl } from '../api'
import type { Task } from '../api'

export default function HistoryPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<'tasks' | 'uploads'>('tasks')
  const [tasks, setTasks] = useState<Task[]>([])
  const [uploads, setUploads] = useState<any[]>([])

  useEffect(() => {
    getTasks().then((res) => setTasks(res.data))
    getUploadRecords().then((res) => setUploads(res.data))
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

  return (
    <div>
      <h2 className="text-2xl font-semibold text-slate-800 mb-1">{t('history.title')}</h2>
      <p className="text-sm text-slate-500 mb-6">{t('history.desc')}</p>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 mb-6 w-fit">
        <button
          onClick={() => setTab('tasks')}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
            tab === 'tasks' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700',
          )}
        >
          <FileSpreadsheet size={16} />
          {t('history.tasks')}
        </button>
        <button
          onClick={() => setTab('uploads')}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
            tab === 'uploads' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700',
          )}
        >
          <Upload size={16} />
          {t('history.uploads')}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {tab === 'tasks' ? (
          tasks.length === 0 ? (
            <div className="p-12 text-center text-slate-400">{t('history.noTasks')}</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">{t('history.taskName')}</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">{t('history.status')}</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">{t('history.items')}</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">{t('history.createdAt')}</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">{t('history.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{task.name}</td>
                    <td className="px-4 py-3">{statusBadge(task.status)}</td>
                    <td className="px-4 py-3">{task.item_count}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {task.created_at ? new Date(task.created_at).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {task.status === 'completed' && (
                        <div className="flex gap-1">
                          {['bom', 'routing', 'sequence'].map((type) => (
                            <a
                              key={type}
                              href={getDownloadUrl(task.id, type)}
                              className="flex items-center gap-1 px-2 py-1 text-xs text-primary-600 hover:bg-primary-50 rounded transition-colors"
                            >
                              <Download size={12} />
                              {type}
                            </a>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : uploads.length === 0 ? (
          <div className="p-12 text-center text-slate-400">{t('history.noUploads')}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">{t('history.filename')}</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">{t('history.fileType')}</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">{t('history.rowCount')}</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">{t('history.uploadedAt')}</th>
              </tr>
            </thead>
            <tbody>
              {uploads.map((u: any) => (
                <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">{u.filename}</td>
                  <td className="px-4 py-3">{u.file_type}</td>
                  <td className="px-4 py-3">{u.row_count}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {u.uploaded_at ? new Date(u.uploaded_at).toLocaleString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
