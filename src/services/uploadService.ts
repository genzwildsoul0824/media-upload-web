import { apiService } from './api'
import type { FileMetadata, ChunkUploadResult } from '../types'

const CHUNK_SIZE = 1024 * 1024 // 1MB
const MAX_CONCURRENT_UPLOADS = 3
const MAX_RETRIES = 3
const RETRY_DELAY_BASE = 1000 // 1 second

export class UploadService {
  private activeUploads = new Map<string, AbortController>()

  async uploadFile(
    fileMetadata: FileMetadata,
    onProgress: (progress: number, uploadedChunks: number[]) => void,
    onError: (error: string) => void,
    onComplete: () => void
  ): Promise<void> {
    const { file, id } = fileMetadata
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE)

    try {
      // Initiate upload
      const { upload_id } = await apiService.initiateUpload({
        filename: file.name,
        file_size: file.size,
        mime_type: file.type,
        total_chunks: totalChunks
      })

      fileMetadata.uploadId = upload_id

      // Create abort controller for this upload
      const abortController = new AbortController()
      this.activeUploads.set(id, abortController)

      // Upload chunks with concurrency control
      await this.uploadChunks(
        file,
        upload_id,
        totalChunks,
        fileMetadata.uploadedChunks,
        onProgress,
        abortController.signal
      )

      // Finalize upload
      await apiService.finalizeUpload(upload_id)

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
    signal: AbortSignal
  ): Promise<void> {
    const chunksToUpload = Array.from({ length: totalChunks }, (_, i) => i).filter(
      i => !uploadedChunks.includes(i)
    )

    const uploaded = [...uploadedChunks]
    const queue = [...chunksToUpload]
    const activePromises: Promise<void>[] = []

    while (queue.length > 0 || activePromises.length > 0) {
      if (signal.aborted) {
        throw new Error('Upload cancelled')
      }

      // Fill up to MAX_CONCURRENT_UPLOADS
      while (activePromises.length < MAX_CONCURRENT_UPLOADS && queue.length > 0) {
        const chunkIndex = queue.shift()!
        const promise = this.uploadChunkWithRetry(
          file,
          uploadId,
          chunkIndex,
          totalChunks,
          signal
        )
          .then(result => {
            if (result.success) {
              uploaded.push(chunkIndex)
              uploaded.sort((a, b) => a - b)
              onProgress(result.progress, uploaded)
            } else {
              throw new Error(result.error || 'Chunk upload failed')
            }
          })
          .catch(error => {
            // Re-queue failed chunk
            queue.push(chunkIndex)
            throw error
          })

        activePromises.push(promise)
      }

      // Wait for at least one to complete
      if (activePromises.length > 0) {
        await Promise.race(activePromises)
        // Remove completed promises
        for (let i = activePromises.length - 1; i >= 0; i--) {
          const settled = await Promise.race([
            activePromises[i].then(() => true),
            Promise.resolve(false)
          ])
          if (settled) {
            activePromises.splice(i, 1)
          }
        }
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
      if (signal.aborted) {
        throw new Error('Upload cancelled')
      }

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
        // Exponential backoff
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
        error: error.message
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

  async resumeUpload(fileMetadata: FileMetadata): Promise<{ uploadedChunks: number[] }> {
    if (!fileMetadata.uploadId) {
      throw new Error('No upload ID found')
    }

    try {
      const status = await apiService.getUploadStatus(fileMetadata.uploadId)
      return {
        uploadedChunks: Array.from({ length: status.uploaded_chunks }, (_, i) => i).filter(
          i => !status.missing_chunks.includes(i)
        )
      }
    } catch (error) {
      throw new Error('Failed to resume upload')
    }
  }
}

export const uploadService = new UploadService()

