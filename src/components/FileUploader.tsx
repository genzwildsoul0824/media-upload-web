import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, AlertCircle } from 'lucide-react'
import { useUploadStore } from '../store/uploadStore'
import { validateFile, generateFilePreview } from '../utils/fileUtils'
import { FileList } from './FileList'
import styles from './FileUploader.module.css'
import type { FileMetadata } from '../types'

const CHUNK_SIZE = 1024 * 1024 // 1MB
const MAX_FILES = 10

export function FileUploader() {
  const { files, addFiles } = useUploadStore()
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setError(null)

      // Check file count
      if (files.length + acceptedFiles.length > MAX_FILES) {
        setError(`Maximum ${MAX_FILES} files allowed`)
        return
      }

      // Validate files
      const validFiles: File[] = []
      for (const file of acceptedFiles) {
        const validationError = validateFile(file)
        if (validationError) {
          setError(validationError)
          continue
        }
        validFiles.push(file)
      }

      if (validFiles.length === 0) {
        return
      }

      // Create metadata for files
      const fileMetadataList: FileMetadata[] = []
      
      for (const file of validFiles) {
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
        let preview: string | undefined

        try {
          preview = await generateFilePreview(file)
        } catch {
          // Preview generation failed, continue without preview
        }

        const metadata: FileMetadata = {
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          file,
          filename: file.name,
          size: file.size,
          mimeType: file.type,
          totalChunks,
          uploadedChunks: [],
          status: 'pending',
          progress: 0,
          startTime: Date.now(),
          preview
        }

        fileMetadataList.push(metadata)
      }

      addFiles(fileMetadataList)
    },
    [files.length, addFiles]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
      'video/*': ['.mp4', '.mpeg', '.mov', '.webm']
    },
    maxFiles: MAX_FILES - files.length,
    disabled: files.length >= MAX_FILES
  })

  return (
    <div className={styles.container}>
      <div
        {...getRootProps()}
        className={`${styles.dropzone} ${isDragActive ? styles.active : ''} ${
          files.length >= MAX_FILES ? styles.disabled : ''
        }`}
      >
        <input {...getInputProps()} />
        <Upload size={48} className={styles.icon} />
        {isDragActive ? (
          <p>Drop files here...</p>
        ) : (
          <>
            <p>Drag & drop files here, or click to select</p>
            <span className={styles.hint}>
              Supports images and videos • Max {MAX_FILES} files • Up to 500MB each
            </span>
          </>
        )}
      </div>

      {error && (
        <div className={styles.error}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {files.length > 0 && <FileList />}
    </div>
  )
}

