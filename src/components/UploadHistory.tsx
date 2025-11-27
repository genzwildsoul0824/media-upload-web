import { useUploadStore } from '../store/uploadStore'
import { formatFileSize, formatDuration } from '../utils/fileUtils'
import { CheckCircle, XCircle, Trash2, Image, Video, Calendar } from 'lucide-react'
import styles from './UploadHistory.module.css'

export function UploadHistory() {
  const { history, clearHistory } = useUploadStore()

  if (history.length === 0) {
    return (
      <div className={styles.empty}>
        <Calendar size={48} />
        <h2>No Upload History</h2>
        <p>Your completed uploads will appear here</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Upload History ({history.length})</h2>
        <button onClick={clearHistory} className={styles.clearButton}>
          <Trash2 size={16} />
          Clear History
        </button>
      </div>

      <div className={styles.list}>
        {history.map((item) => (
          <div key={item.id} className={styles.item}>
            <div className={styles.icon}>
              {item.mimeType.startsWith('image/') ? (
                <Image size={24} />
              ) : (
                <Video size={24} />
              )}
            </div>

            <div className={styles.content}>
              <h3 className={styles.filename}>{item.filename}</h3>
              <div className={styles.meta}>
                <span>{formatFileSize(item.size)}</span>
                <span>•</span>
                <span>{formatDuration(item.duration)}</span>
                <span>•</span>
                <span>{new Date(item.timestamp).toLocaleString()}</span>
              </div>
            </div>

            <div className={styles.status}>
              {item.status === 'completed' ? (
                <CheckCircle size={20} className={styles.success} />
              ) : (
                <XCircle size={20} className={styles.error} />
              )}
              <span className={item.status === 'completed' ? styles.success : styles.error}>
                {item.status === 'completed' ? 'Completed' : 'Failed'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

