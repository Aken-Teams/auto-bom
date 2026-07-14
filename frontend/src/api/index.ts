import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export interface BomItem {
  item_no: string
  summary?: string
  doc_no?: string
  category_l?: string
  category_m?: string
  alt_structure?: string
  max_alt_structure?: string
  type_name?: string
  family?: string
  package?: string
  line?: string
  function?: string
  seq_no?: string
  component?: string
  component_summary?: string
  bom_note?: string
}

export interface TaskItem {
  id?: number
  item_no: string
  summary?: string
  doc_no?: string
  type_name?: string
  family?: string
  package?: string
  line?: string
  function?: string
  alt_structure?: string
  component?: string
  component_summary?: string
  weld_can?: string
  mold_can?: string
  pack_can?: string
}

export interface Task {
  id: number
  name: string
  status: string
  item_count: number
  created_at?: string
  completed_at?: string
  output_bom_path?: string
  output_routing_path?: string
  output_sequence_path?: string
  items?: TaskItem[]
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface CanTemplate {
  id: number
  function: string
  waf_code: string
  supplier: string
  wafer_size: string
  mil: string
  weld_can: string
  weld_desc: string
  mold_can: string
  mold_desc: string
  pack_can: string
  pack_desc: string
}

// A general (通用) can option — mold/pack cans not matched by WAF.
export interface CanOption {
  id?: number
  can_type: 'mold' | 'pack'
  can_code: string
  can_desc?: string
  label?: string
}

// A user-defined rule for assigning a general can to items.
export interface CanRule {
  can_type: 'mold' | 'pack'
  match_field: string // item_no | type_name | family | package | component
  match_op: string // all | contains | equals | regex
  match_value?: string
  can_code: string
}

// Upload
export const uploadBomBase = (file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post<{ id: number; filename: string; row_count: number; items: BomItem[] }>(
    '/upload/bom-base',
    fd,
  )
}

export const uploadStdOps = (file: File, taskId?: number) => {
  const fd = new FormData()
  fd.append('file', file)
  if (taskId != null) fd.append('task_id', String(taskId))
  return api.post<{ id: number; filename: string; row_count: number }>(
    '/upload/std-operations',
    fd,
  )
}

export const uploadCanTemplate = (file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post<{ id: number; count: number; weld_count: number; templates: CanTemplate[]; options: CanOption[] }>(
    '/upload/can-template',
    fd,
  )
}

export const getCanTemplates = () => api.get<CanTemplate[]>('/upload/can-templates')

export const getCanOptions = () => api.get<CanOption[]>('/upload/can-options')

export const getCanRules = () => api.get<CanRule[]>('/can-rules')

// Electroplating thickness (5um/8um) rules
export interface PlatingRule {
  id?: number
  match_field: string // summary | item_no
  match_value: string
  target_um: number // 5 | 8
}
export const getPlatingRules = () => api.get<PlatingRule[]>('/plating-rules')
export const savePlatingRules = (rules: PlatingRule[]) => api.put('/plating-rules', rules)

export const getUploadRecords = () => api.get('/upload/records')

// Tasks
export const createTask = (name: string, upload_id?: number, can_upload_id?: number) =>
  api.post<{ id: number; name: string; status: string }>('/tasks', { name, upload_id, can_upload_id })

export const getTasks = (page = 1, pageSize = 10) =>
  api.get<PaginatedResponse<Task>>('/tasks', { params: { page, page_size: pageSize } })

export const deleteTask = (taskId: number) =>
  api.delete<{ ok: boolean; deleted_task_id: number }>(`/tasks/${taskId}`)

export const getTask = (id: number) => api.get<Task>(`/tasks/${id}`)

export const addTaskItems = (taskId: number, items: TaskItem[]) =>
  api.post(`/tasks/${taskId}/items`, items)

// Replace all items of a task (persists manual edits made after auto-match)
export const replaceTaskItems = (taskId: number, items: TaskItem[]) =>
  api.put(`/tasks/${taskId}/items`, items)

export const autoMatchCans = (taskId: number, rules: CanRule[] = []) =>
  api.post<{
    matched: number
    matched_weld: number
    matched_mold: number
    matched_pack: number
    unmatched: string[]
  }>(`/tasks/${taskId}/auto-match-cans`, { rules })

export const updateTaskItem = (taskId: number, itemId: number, data: TaskItem) =>
  api.put(`/tasks/${taskId}/items/${itemId}`, data)

export const generateCmaxList = (taskId: number) =>
  api.post<{ status: string; item_count: number }>(`/tasks/${taskId}/generate-cmax`)

export const generateFiles = (taskId: number) =>
  api.post<{ status: string; files: Record<string, string> }>(`/tasks/${taskId}/generate`)

export const getDownloadUrl = (taskId: number, fileType: string) =>
  `/api/tasks/${taskId}/download/${fileType}`
