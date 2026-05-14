import { useEffect } from 'react'
import { AlertCircle, CheckCircle, X } from 'lucide-react'
import clsx from 'clsx'

interface ToastProps {
  message: string
  type: 'success' | 'error'
  onClose: () => void
}

export default function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="fixed top-6 right-6 z-[100] animate-slide-in">
      <div
        className={clsx(
          'flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg border max-w-md',
          type === 'error' && 'bg-red-50 border-red-200 text-red-800',
          type === 'success' && 'bg-green-50 border-green-200 text-green-800',
        )}
      >
        {type === 'error' ? (
          <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
        ) : (
          <CheckCircle size={20} className="text-green-500 shrink-0 mt-0.5" />
        )}
        <p className="text-sm flex-1">{message}</p>
        <button onClick={onClose} className="shrink-0 hover:opacity-70">
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
