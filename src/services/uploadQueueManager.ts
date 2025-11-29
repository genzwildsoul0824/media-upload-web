import { uploadService } from './uploadService'
import type { FileMetadata } from '../types'

const MAX_CONCURRENT_FILE_UPLOADS = 3

class UploadQueueManager {
  private activeUploads = new Set<string>()
  private pausedUploads = new Set<string>() // Track manually paused uploads
  private cancelledUploads = new Set<string>() // Track manually cancelled uploads
  private queue: FileMetadata[] = []
  private updateCallback: ((id: string, updates: Partial<FileMetadata>) => void) | null = null
  private historyCallback: ((item: any) => void) | null = null

  setCallbacks(
    updateFile: (id: string, updates: Partial<FileMetadata>) => void,
    addToHistory: (item: any) => void
  ) {
    this.updateCallback = updateFile
    this.historyCallback = addToHistory
  }

  addToQueue(files: FileMetadata[]) {
    // Add files to queue

    const newFiles = files.filter(
      (f) =>
        !this.activeUploads.has(f.id) &&
        !this.queue.some((q) => q.id === f.id)
    )

    if (newFiles.length === 0) return

    this.queue.push(...newFiles)
    // Process queue
    this.processQueue()
  }

  private async processQueue() {
    // Start uploads up to MAX_CONCURRENT_FILE_UPLOADS
    while (
      this.activeUploads.size < MAX_CONCURRENT_FILE_UPLOADS &&
      this.queue.length > 0
    ) {
      const file = this.queue.shift()
      // Accept both 'pending' and 'paused' status files (paused files are set to 'pending' in resumeUpload)
      if (file && (file.status === 'pending' || file.status === 'paused')) {
        this.startUpload(file)
      }
    }
  }

  private async startUpload(file: FileMetadata) {
    if (this.activeUploads.has(file.id)) {
      return
    }

    if (!this.updateCallback || !this.historyCallback) {
      console.error('Callbacks not set')
      return
    }

    this.activeUploads.add(file.id)
    this.updateCallback(file.id, { status: 'uploading', error: undefined })

    try {
      await uploadService.uploadFile(
        file,
        // onProgress
        (progress, uploadedChunks) => {
          this.updateCallback?.(file.id, { progress, uploadedChunks })
        },
        // onError
        (error) => {
          this.activeUploads.delete(file.id)

          // Check if this was a manual cancel
          if (this.cancelledUploads.has(file.id)) {
            // Manual cancel - do NOT process queue, item is removed by UI
            this.cancelledUploads.delete(file.id)
            return
          }
          
          // Check if this was a manual pause (not an actual error)
          if (this.pausedUploads.has(file.id)) {
            // Manual pause - do NOT process queue
            // This ensures that when a file is paused, only the remaining active uploads continue
            // (e.g., if 3 files were uploading and 1 is paused, only 2 continue, queue does not start next file)
            this.pausedUploads.delete(file.id)
            const pausedAt = Date.now()
            this.updateCallback?.(file.id, { 
              status: 'paused', 
              pausedAt,
              endTime: pausedAt
            })
            // Explicitly do NOT call processQueue() here to maintain only active uploads (not 3 concurrent)
          } else {
            // Actual error - process queue to start next file
            this.updateCallback?.(file.id, { status: 'error', error, endTime: Date.now() })
            this.historyCallback?.({
              id: file.id,
              filename: file.filename,
              size: file.size,
              mimeType: file.mimeType,
              status: 'failed',
              timestamp: Date.now(),
              duration: Date.now() - file.startTime
            })
            // Process next in queue only on real errors
            this.processQueue()
          }
        },
        // onComplete
        () => {
          const endTime = Date.now()
          this.updateCallback?.(file.id, { status: 'completed', progress: 100, endTime })
          this.historyCallback?.({
            id: file.id,
            filename: file.filename,
            size: file.size,
            mimeType: file.mimeType,
            status: 'completed',
            timestamp: endTime,
            duration: endTime - file.startTime
          })
          this.activeUploads.delete(file.id)
          // Process next in queue
          this.processQueue()
        },
        // onFinalizing
        () => {
          // Set status to finalizing when all chunks are uploaded but server is still processing
          this.updateCallback?.(file.id, { status: 'finalizing', progress: 100 })
        }
      )
    } catch (error) {
      this.activeUploads.delete(file.id)
      
      // Check if this was a manual pause
      if (!this.pausedUploads.has(file.id)) {
        // Only process queue on actual errors, not manual pauses
        this.processQueue()
      } else {
        this.pausedUploads.delete(file.id)
      }
    }
  }

  pauseUpload(fileId: string) {
    // Mark as paused so we don't process queue when error callback is triggered
    // This ensures that pausing a file does NOT start the next file in queue
    // Result: Only the remaining active uploads continue (e.g., 2 concurrent if 1 of 3 is paused)
    this.pausedUploads.add(fileId)
    uploadService.pauseUpload(fileId)
    // Remove from queue if it's waiting
    this.queue = this.queue.filter(f => f.id !== fileId)
    // Note: activeUploads will be deleted in the error callback, but processQueue() will NOT be called
  }

  cancelUpload(fileId: string, uploadId?: string) {
    // Mark as cancelled so we don't process queue when error callback is triggered
    this.cancelledUploads.add(fileId)
    uploadService.cancelUpload(fileId, uploadId)
    this.activeUploads.delete(fileId)
    // Remove from queue if it's there
    this.queue = this.queue.filter(f => f.id !== fileId)
  }

  async resumeUpload(file: FileMetadata) {
    if (this.activeUploads.has(file.id)) return

    // If already in queue, do nothing
    if (this.queue.some(f => f.id === file.id)) return

    // Clear paused status if it was paused
    this.pausedUploads.delete(file.id)

    // Calculate paused duration and add to cumulative paused time
    let pausedDuration = file.pausedDuration || 0
    if (file.pausedAt) {
      pausedDuration += (Date.now() - file.pausedAt)
    }

    // If file has an uploadId, fetch the current uploaded chunks from backend
    if (file.uploadId) {
      try {
        const { uploadedChunks, totalChunks } = await uploadService.resumeUpload(file)
        
        // Use backend's totalChunks as the source of truth
        // Update file metadata with uploaded chunks and calculate progress
        const progress = (uploadedChunks.length / totalChunks) * 100
        
        // IMPORTANT: Update the file object FIRST before updating via callback
        // This ensures the file object has the correct uploadedChunks when startUpload is called
        file.uploadedChunks = uploadedChunks
        file.totalChunks = totalChunks
        file.progress = progress
        file.pausedDuration = pausedDuration
        file.pausedAt = undefined
        file.endTime = undefined
        
        // Then update via callback to sync with store
        this.updateCallback?.(file.id, {
          uploadedChunks,
          totalChunks,
          progress,
          status: 'pending',
          error: undefined,
          pausedDuration,
          pausedAt: undefined,
          endTime: undefined // Clear endTime when resuming
        })
      } catch (error) {
        console.error('Failed to fetch upload status for resume:', error)
        // Continue anyway - will try to upload from beginning
        // Still update paused duration
        file.pausedDuration = pausedDuration
        file.pausedAt = undefined
        file.endTime = undefined
        
        this.updateCallback?.(file.id, {
          pausedDuration,
          pausedAt: undefined,
          endTime: undefined
        })
      }
    } else {
      // No uploadId yet, just update paused duration
      file.pausedDuration = pausedDuration
      file.pausedAt = undefined
      file.endTime = undefined
      
      this.updateCallback?.(file.id, {
        pausedDuration,
        pausedAt: undefined,
        endTime: undefined
      })
    }

    // Add to front of queue for immediate processing
    // The file object now has the correct uploadedChunks
    this.queue.unshift(file)
    this.processQueue()
  }

  getActiveCount(): number {
    return this.activeUploads.size
  }

  getQueueLength(): number {
    return this.queue.length
  }
}

export const uploadQueueManager = new UploadQueueManager()

