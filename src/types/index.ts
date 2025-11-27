export interface FileMetadata {
  id: string
  file: File
  filename: string
  size: number
  mimeType: string
  totalChunks: number
  uploadedChunks: number[]
  status: 'pending' | 'uploading' | 'paused' | 'completed' | 'error' | 'cancelled'
  progress: number
  uploadId?: string
  error?: string
  startTime: number
  endTime?: number
  preview?: string
}

export interface UploadHistoryItem {
  id: string
  filename: string
  size: number
  mimeType: string
  status: 'completed' | 'failed'
  timestamp: number
  duration: number
  filePath?: string
}

export interface ChunkUploadResult {
  success: boolean
  chunkIndex: number
  progress: number
  error?: string
}

export interface UploadStatusResponse {
  upload_id: string
  filename: string
  file_size: number
  mime_type: string
  total_chunks: number
  uploaded_chunks: number
  missing_chunks: number[]
  progress: number
  status: string
  created_at: number
}

export interface MonitoringStats {
  storage: {
    total_size: number
    total_size_mb: number
    file_count: number
  }
  active_uploads: number
  upload_details: Array<{
    upload_id: string
    filename: string
    progress: number
    status: string
  }>
  metrics: {
    total_uploads: number
    successful_uploads: number
    success_rate: number
  }
}

