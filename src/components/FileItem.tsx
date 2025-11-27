import { useState, useEffect } from 'react'
import { Play, Pause, X, RotateCw, CheckCircle, AlertCircle, Image, Video } from 'lucide-react'
import { useUploadStore } from '../store/uploadStore'
import { uploadService } from '../services/uploadService'
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
      const interval = setInterval(() => {
        setElapsedTime(Date.now() - file.startTime)
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [file.status, file.startTime])

  const handleStart = async () => {
    updateFile(file.id, { status: 'uploading', error: undefined })

    await uploadService.uploadFile(
      file,
      (progress, uploadedChunks) => {
        updateFile(file.id, { progress, uploadedChunks })
      },
      (error) => {
        updateFile(file.id, { status: 'error', error, endTime: Date.now() })
        addToHistory({
          id: file.id,
          filename: file.filename,
          size: file.size,
          mimeType: file.mimeType,
          status: 'failed',
          timestamp: Date.now(),
          duration: Date.now() - file.startTime
        })
      },
      () => {
        const endTime = Date.now()
        updateFile(file.id, { status: 'completed', progress: 100, endTime })
        addToHistory({
          id: file.id,
          filename: file.filename,
          size: file.size,
          mimeType: file.mimeType,
          status: 'completed',
          timestamp: endTime,
          duration: endTime - file.startTime
        })
      }
    )
  }

  const handlePause = () => {
    uploadService.pauseUpload(file.id)
    updateFile(file.id, { status: 'paused' })
  }

  const handleResume = async () => {
    try {
      updateFile(file.id, { status: 'uploading', error: undefined })
      
      // Resume from where we left off
      await uploadService.uploadFile(
        file,
        (progress, uploadedChunks) => {
          updateFile(file.id, { progress, uploadedChunks })
        },
        (error) => {
          updateFile(file.id, { status: 'error', error, endTime: Date.now() })
        },
        () => {
          const endTime = Date.now()
          updateFile(file.id, { status: 'completed', progress: 100, endTime })
          addToHistory({
            id: file.id,
            filename: file.filename,
            size: file.size,
            mimeType: file.mimeType,
            status: 'completed',
            timestamp: endTime,
            duration: endTime - file.startTime
          })
        }
      )
    } catch (error: any) {
      updateFile(file.id, { status: 'error', error: error.message })
    }
  }

  const handleCancel = () => {
    uploadService.cancelUpload(file.id, file.uploadId)
    removeFile(file.id)
  }

  const handleRetry = () => {
    updateFile(file.id, { 
      status: 'pending', 
      progress: 0, 
      uploadedChunks: [], 
      error: undefined,
      startTime: Date.now()
    })
    handleStart()
  }

  const getStatusIcon = () => {
    switch (file.status) {
      case 'completed':
        return <CheckCircle size={20} className={styles.iconSuccess} />
      case 'error':
        return <AlertCircle size={20} className={styles.iconError} />
      case 'uploading':
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
          {file.endTime && (
            <span className={styles.time}>{formatDuration(file.endTime - file.startTime)}</span>
          )}
        </div>

        {file.status !== 'completed' && (
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${file.progress}%` }} />
            <span className={styles.progressText}>{Math.round(file.progress)}%</span>
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

