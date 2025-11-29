import { apiService } from './api'
import type { FileMetadata, ChunkUploadResult } from '../types'

const CHUNK_SIZE = 1024 * 1024 // 1MB
const MAX_RETRIES = 3
const RETRY_DELAY_BASE = 1000 // 1 second

export class UploadService {
  private activeUploads = new Map<string, AbortController>()

  async uploadFile(
    fileMetadata: FileMetadata,
    onProgress: (progress: number, uploadedChunks: number[]) => void,
    onError: (error: string) => void,
    onComplete: () => void,
    onFinalizing?: () => void
  ): Promise<void> {
    const { file, id } = fileMetadata
    let totalChunks = fileMetadata.totalChunks || Math.ceil(file.size / CHUNK_SIZE)

    try {
      let upload_id = fileMetadata.uploadId

      if (!upload_id) {
        const response = await apiService.initiateUpload({
          filename: file.name,
          file_size: file.size,
          mime_type: file.type,
          total_chunks: totalChunks
        })
        upload_id = response.upload_id
        fileMetadata.uploadId = upload_id
        fileMetadata.totalChunks = totalChunks
      }

      const abortController = new AbortController()
      this.activeUploads.set(id, abortController)

      let uploadedChunks = fileMetadata.uploadedChunks || []
      const existingProgress = fileMetadata.progress || 0
      
      if (upload_id) {
        try {
          const status = await apiService.getUploadStatus(upload_id)
          const missingChunks = status.missing_chunks || []
          const totalChunksFromBackend = status.total_chunks
          
          // Use backend's total_chunks as the source of truth
          totalChunks = totalChunksFromBackend
          fileMetadata.totalChunks = totalChunks
          
          const backendUploadedChunks: number[] = []
          for (let i = 0; i < totalChunksFromBackend; i++) {
            if (!missingChunks.includes(i)) {
              backendUploadedChunks.push(i)
            }
          }
          
          // Calculate progress from backend data
          const backendProgress = (backendUploadedChunks.length / totalChunksFromBackend) * 100
          
          // Only use backend data if it shows equal or higher progress (prevents backward jumps)
          // This handles cases where resumeUpload already set correct progress, but backend fetch
          // returns slightly different data due to timing or inconsistencies
          if (backendProgress >= existingProgress || uploadedChunks.length === 0) {
            uploadedChunks = backendUploadedChunks
            fileMetadata.uploadedChunks = backendUploadedChunks
          }
          // Otherwise, keep the existing uploadedChunks to maintain progress
        } catch (error) {
          console.warn('Failed to verify chunks with backend', error)
        }
      }
      
      await this.uploadChunks(
        file,
        upload_id!,
        totalChunks,
        uploadedChunks,
        onProgress,
        abortController.signal,
        fileMetadata  // pass fileMetadata so we can update it
      )
      
      try {
        const finalStatus = await apiService.getUploadStatus(upload_id!)
        const finalMissingChunks = finalStatus.missing_chunks || []
        
        if (finalMissingChunks.length > 0) {
          for (const chunkIndex of finalMissingChunks) {
            if (abortController.signal.aborted) throw new Error('Upload cancelled')
            
            const start = chunkIndex * CHUNK_SIZE
            const end = Math.min(start + CHUNK_SIZE, file.size)
            const chunk = file.slice(start, end)
            
            await apiService.uploadChunk(upload_id!, chunkIndex, chunk)
          }
          
          await new Promise(resolve => setTimeout(resolve, 300))
        }
      } catch (error) {
        console.warn('Final verification failed', error)
      }
      
      // Notify that finalization is starting
      // This happens after all chunks are uploaded but before server processes them
      if (onFinalizing) {
        onFinalizing()
      }
      
      await apiService.finalizeUpload(upload_id!)

      this.activeUploads.delete(id)
      onComplete()
    } catch (error: any) {
      this.activeUploads.delete(id)
      
      if (error.name === 'AbortError' || error.message === 'Upload cancelled') {
        onError('Upload cancelled')
      } else {
        onError(error.response?.data?.message || error.message || 'Upload failed')
      }
    }
  }

  private async uploadChunks(
    file: File,
    uploadId: string,
    totalChunks: number,
    uploadedChunks: number[],
    onProgress: (progress: number, uploadedChunks: number[]) => void,
    signal: AbortSignal,
    fileMetadata: FileMetadata   // <‑‑ added
  ): Promise<void> {
    
    const chunksToUpload = Array.from({ length: totalChunks }, (_, i) => i)
      .filter(i => !uploadedChunks.includes(i))

    const uploaded = [...uploadedChunks].sort((a, b) => a - b)

    if (uploaded.length > 0) {
      const initialProgress = (uploaded.length / totalChunks) * 100
      
      // Only update progress if it's higher than current progress (prevents backward jumps on resume)
      // This ensures that if resumeUpload already set the correct progress, we don't overwrite it with a lower value
      const currentProgress = fileMetadata.progress || 0
      if (initialProgress >= currentProgress) {
        onProgress(initialProgress, uploaded)
      } else {
        // If calculated progress is lower, use the current progress to maintain the correct state
        onProgress(currentProgress, uploaded)
      }

      // FIX: keep fileMetadata uploadedChunks updated
      fileMetadata.uploadedChunks = [...uploaded]
    }

    for (const chunkIndex of chunksToUpload) {
      if (signal.aborted) throw new Error('Upload cancelled')

      const result = await this.uploadChunkWithRetry(
        file,
        uploadId,
        chunkIndex,
        totalChunks,
        signal
      )

      if (result.success) {
        uploaded.push(result.chunkIndex)
        uploaded.sort((a, b) => a - b)
        const progress = (uploaded.length / totalChunks) * 100

        // FIX: update metadata chunk state every upload
        fileMetadata.uploadedChunks = [...uploaded]

        onProgress(progress, uploaded)
      } else {
        throw new Error(result.error || 'Chunk upload failed')
      }
    }
  }

  private async uploadChunkWithRetry(
    file: File,
    uploadId: string,
    chunkIndex: number,
    totalChunks: number,
    signal: AbortSignal,
    attempt: number = 0
  ): Promise<ChunkUploadResult> {
    try {
      if (signal.aborted) throw new Error('Upload cancelled')

      const start = chunkIndex * CHUNK_SIZE
      const end = Math.min(start + CHUNK_SIZE, file.size)
      const chunk = file.slice(start, end)

      const result = await apiService.uploadChunk(uploadId, chunkIndex, chunk)

      return {
        success: true,
        chunkIndex,
        progress: result.progress
      }
    } catch (error: any) {
      if (signal.aborted || error.message === 'Upload cancelled') {
        throw error
      }

      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_BASE * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
        
        return this.uploadChunkWithRetry(
          file,
          uploadId,
          chunkIndex,
          totalChunks,
          signal,
          attempt + 1
        )
      }

      return {
        success: false,
        chunkIndex,
        progress: 0,
        error: error?.message || 'Chunk upload failed'
      }
    }
  }

  pauseUpload(fileId: string): void {
    const controller = this.activeUploads.get(fileId)
    if (controller) {
      controller.abort()
      this.activeUploads.delete(fileId)
    }
  }

  cancelUpload(fileId: string, uploadId?: string): void {
    this.pauseUpload(fileId)
    
    if (uploadId) {
      apiService.cancelUpload(uploadId).catch(console.error)
    }
  }

  async resumeUpload(fileMetadata: FileMetadata): Promise<{ uploadedChunks: number[]; totalChunks: number }> {
    if (!fileMetadata.uploadId) {
      throw new Error('No upload ID found')
    }

    try {
      const status = await apiService.getUploadStatus(fileMetadata.uploadId)
      const missingChunks = status.missing_chunks || []
      const totalChunks = status.total_chunks
      
      const uploadedChunks: number[] = []
      for (let i = 0; i < totalChunks; i++) {
        if (!missingChunks.includes(i)) uploadedChunks.push(i)
      }
      
      return { uploadedChunks, totalChunks }
    } catch (error: any) {
      console.error('resumeUpload: Failed to fetch upload status', error)
      throw new Error(`Failed to resume upload: ${error?.message || 'Unknown error'}`)
    }
  }
}

export const uploadService = new UploadService()