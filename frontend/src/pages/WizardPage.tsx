import { useCallback, useState } from 'react'
import StepIndicator from '../components/StepIndicator'
import Toast from '../components/Toast'
import StepUpload from './steps/StepUpload'
import StepFilter from './steps/StepFilter'
import StepConfig from './steps/StepConfig'
import StepExportList from './steps/StepExportList'
import StepGenerate from './steps/StepGenerate'
import type { BomItem, TaskItem } from '../api'

export default function WizardPage() {
  const [step, setStep] = useState(0)
  const [bomItems, setBomItems] = useState<BomItem[]>([])
  const [uploadId, setUploadId] = useState<number | null>(null)
  const [selectedItems, setSelectedItems] = useState<TaskItem[]>([])
  const [taskId, setTaskId] = useState<number | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showError = useCallback((msg: string) => {
    setToast({ message: msg, type: 'error' })
  }, [])


  return (
    <div>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <StepIndicator current={step} />

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        {/* Phase 1, Step 0: Upload BOM base */}
        {step === 0 && (
          <StepUpload
            onError={showError}
            onComplete={(items, uid) => {
              setBomItems(items)
              setUploadId(uid)
              setStep(1)
            }}
          />
        )}

        {/* Phase 1, Step 1: Filter items */}
        {step === 1 && (
          <StepFilter
            items={bomItems}
            onBack={() => setStep(0)}
            onComplete={(items) => {
              setSelectedItems(items)
              setStep(2)
            }}
          />
        )}

        {/* Phase 1, Step 2: Configure cans */}
        {step === 2 && (
          <StepConfig
            items={selectedItems}
            uploadId={uploadId}
            onError={showError}
            onBack={() => setStep(1)}
            onComplete={(tid, updatedItems) => {
              setTaskId(tid)
              setSelectedItems(updatedItems)
              setStep(3)
            }}
          />
        )}

        {/* Phase 1, Step 3: Export C-CMAX list */}
        {step === 3 && (
          <StepExportList
            taskId={taskId!}
            items={selectedItems}
            onError={showError}
            onBack={() => setStep(2)}
            onNextPhase={() => setStep(4)}
          />
        )}

        {/* Phase 2, Step 4: Upload std ops + generate 3 files */}
        {step === 4 && (
          <StepGenerate
            taskId={taskId!}
            items={selectedItems}
            onError={showError}
            onBack={() => setStep(3)}
          />
        )}
      </div>
    </div>
  )
}
