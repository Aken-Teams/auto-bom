import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import FileUploadBox from '../../components/FileUploadBox'
import { uploadBomBase, uploadCanTemplate } from '../../api'
import type { BomItem } from '../../api'

interface Props {
  onComplete: (items: BomItem[], uploadId: number) => void
  onError?: (msg: string) => void
}

export default function StepUpload({ onComplete, onError }: Props) {
  const { t } = useTranslation()
  const [bomResult, setBomResult] = useState<{ filename: string; row_count: number } | null>(null)
  const [canResult, setCanResult] = useState<{ filename: string; row_count: number } | null>(null)
  const [bomItems, setBomItems] = useState<BomItem[]>([])
  const [uploadId, setUploadId] = useState<number>(0)

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-800 mb-1">{t('upload.title')}</h2>
      <p className="text-sm text-slate-500 mb-6">{t('phase.one')}</p>

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <FileUploadBox
          label={t('upload.bomBase')}
          description={t('upload.bomBaseDesc')}
          result={bomResult}
          onError={onError}
          onUpload={async (file) => {
            const res = await uploadBomBase(file)
            setBomResult({ filename: res.data.filename, row_count: res.data.row_count })
            setBomItems(res.data.items)
            setUploadId(res.data.id)
          }}
        />
        <FileUploadBox
          label={t('upload.canTemplate')}
          description={t('upload.canTemplateDesc')}
          result={canResult}
          onError={onError}
          onUpload={async (file) => {
            const res = await uploadCanTemplate(file)
            setCanResult({ filename: '罐头模板', row_count: res.data.count })
          }}
        />
      </div>

      <div className="flex justify-end">
        <button
          disabled={!bomResult}
          onClick={() => onComplete(bomItems, uploadId)}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg font-medium text-sm hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {t('upload.next')}
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}
