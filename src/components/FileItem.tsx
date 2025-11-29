import { useState, useEffect } from 'react'
import { Play, Pause, X, RotateCw, CheckCircle, AlertCircle, Image, Video } from 'lucide-react'
import { useUploadStore } from '../store/uploadStore'
import { uploadQueueManager } from '../services/uploadQueueManager'
import { formatFileSize, formatDuration } from '../utils/fileUtils'
import styles from './FileItem.module.css'
import type { FileMetadata } from '../types'

interface Props {
  file: FileMetadata
}

export function FileItem({ file }: Props) {
  const { updateFile, removeFile, addToHistory } = useUploadStore()
  const [elapsedTime, setElapsedTime] = useState(0)

  useEffect(() => {
    if (file.status === 'uploading') {
      // Calculate initial elapsed time immediately
      const pausedDuration = file.pausedDuration || 0
      setElapsedTime(Date.now() - file.startTime - pausedDuration)
      
      // Then update every second
      const interval = setInterval(() => {
        const pausedDuration = file.pausedDuration || 0
        setElapsedTime(Date.now() - file.startTime - pausedDuration)
      }, 1000)
      return () => clearInterval(interval)
    } else if (file.status === 'paused' && file.endTime) {
      // Show paused duration when paused
      const pausedDuration = file.pausedDuration || 0
      setElapsedTime(file.endTime - file.startTime - pausedDuration)
    } else {
      // Reset elapsed time when not uploading or paused
      setElapsedTime(0)
    }
  }, [file.status, file.startTime, file.pausedDuration, file.endTime])

  const handleStart = () => {
    // Resume upload through queue manager
    uploadQueueManager.resumeUpload(file)
  }

  const handlePause = () => {
    uploadQueueManager.pauseUpload(file.id)
    // Status will be updated by queue manager after pause completes
  }

  const handleResume = () => {
    // Resume upload through queue manager
    uploadQueueManager.resumeUpload(file)
  }

  const handleCancel = () => {
    uploadQueueManager.cancelUpload(file.id, file.uploadId)
    removeFile(file.id)
  }

  const handleRetry = () => {
    updateFile(file.id, { 
      status: 'pending', 
      progress: 0, 
      uploadedChunks: [], 
      error: undefined,
      startTime: Date.now(),
      pausedDuration: 0,
      pausedAt: undefined,
      endTime: undefined
    })
    // Add to queue for retry
    uploadQueueManager.resumeUpload(file)
  }

  const getStatusIcon = () => {
    switch (file.status) {
      case 'completed':
        return <CheckCircle size={20} className={styles.iconSuccess} />
      case 'error':
        return <AlertCircle size={20} className={styles.iconError} />
      case 'uploading':
      case 'finalizing':
        return <div className={styles.spinner} />
      default:
        return file.mimeType.startsWith('image/') ? <Image size={20} /> : <Video size={20} />
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.preview}>
        {file.preview ? (
          file.mimeType.startsWith('image/') ? (
            <img src={file.preview} alt={file.filename} />
          ) : (
            <video src={file.preview} />
          )
        ) : (
          getStatusIcon()
        )}
      </div>

      <div className={styles.content}>
        <div className={styles.info}>
          <h3 className={styles.filename}>{file.filename}</h3>
          <span className={styles.size}>{formatFileSize(file.size)}</span>
          {file.status === 'uploading' && (
            <span className={styles.time}>{formatDuration(elapsedTime)}</span>
          )}
          {file.status === 'finalizing' && (
            <span className={styles.time} style={{ color: 'var(--primary)', fontWeight: 500 }}>
              Finalizing...
            </span>
          )}
          {(file.status === 'paused' || file.status === 'completed' || file.status === 'error') && file.endTime && (
            <span className={styles.time}>
              {formatDuration(Math.max(0, file.endTime - file.startTime - (file.pausedDuration || 0)))}
            </span>
          )}
        </div>

        {file.status !== 'completed' && (
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${file.progress}%` }} />
            <span className={styles.progressText}>
              {file.status === 'finalizing' ? (
                <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>Finalizing...</span>
              ) : (
                `${Math.round(file.progress)}%`
              )}
            </span>
          </div>
        )}

        {file.error && (
          <div className={styles.error}>
            <AlertCircle size={16} />
            <span>{file.error}</span>
          </div>
        )}

        {file.status === 'completed' && (
          <div className={styles.success}>Upload completed successfully!</div>
        )}
      </div>

      <div className={styles.actions}>
        {file.status === 'pending' && (
          <button onClick={handleStart} className={styles.actionButton} title="Start upload">
            <Play size={18} />
          </button>
        )}

        {file.status === 'uploading' && (
          <button onClick={handlePause} className={styles.actionButton} title="Pause upload">
            <Pause size={18} />
          </button>
        )}

        {file.status === 'paused' && (
          <button onClick={handleResume} className={styles.actionButton} title="Resume upload">
            <Play size={18} />
          </button>
        )}

        {file.status === 'error' && (
          <button onClick={handleRetry} className={styles.actionButton} title="Retry upload">
            <RotateCw size={18} />
          </button>
        )}

        {file.status !== 'completed' && (
          <button onClick={handleCancel} className={`${styles.actionButton} ${styles.cancelButton}`} title="Cancel">
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  )
}

