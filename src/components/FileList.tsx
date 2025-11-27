import { FileItem } from './FileItem'
import { useUploadStore } from '../store/uploadStore'
import { Trash2, CheckCircle } from 'lucide-react'
import styles from './FileList.module.css'

export function FileList() {
  const { files, clearCompleted } = useUploadStore()

  const hasCompleted = files.some(
    (file) => file.status === 'completed' || file.status === 'error'
  )

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Upload Queue ({files.length})</h2>
        {hasCompleted && (
          <button onClick={clearCompleted} className={styles.clearButton}>
            <Trash2 size={16} />
            Clear Completed
          </button>
        )}
      </div>

      <div className={styles.list}>
        {files.map((file) => (
          <FileItem key={file.id} file={file} />
        ))}
      </div>

      <div className={styles.summary}>
        <div className={styles.stat}>
          <CheckCircle size={16} />
          <span>
            {files.filter((f) => f.status === 'completed').length} completed
          </span>
        </div>
        <div className={styles.stat}>
          <span>
            {files.filter((f) => f.status === 'uploading').length} uploading
          </span>
        </div>
        <div className={styles.stat}>
          <span>
            {files.filter((f) => f.status === 'pending' || f.status === 'paused').length} pending
          </span>
        </div>
      </div>
    </div>
  )
}

