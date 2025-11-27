import { useState, useEffect } from 'react'
import { apiService } from '../services/api'
import { formatFileSize } from '../utils/fileUtils'
import { Activity, HardDrive, Upload, TrendingUp, RefreshCw, AlertCircle } from 'lucide-react'
import styles from './MonitoringDashboard.module.css'
import type { MonitoringStats } from '../types'

export function MonitoringDashboard() {
  const [stats, setStats] = useState<MonitoringStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiService.getMonitoringStats()
      setStats(data)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch stats')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [])

  if (loading && !stats) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Loading monitoring data...</p>
      </div>
    )
  }

  if (error && !stats) {
    return (
      <div className={styles.error}>
        <AlertCircle size={48} />
        <h2>Failed to Load Stats</h2>
        <p>{error}</p>
        <button onClick={fetchStats} className={styles.retryButton}>
          <RefreshCw size={16} />
          Retry
        </button>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>System Monitoring</h2>
        <button onClick={fetchStats} className={styles.refreshButton} disabled={loading}>
          <RefreshCw size={16} className={loading ? styles.spinning : ''} />
          Refresh
        </button>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <HardDrive size={24} />
            <h3>Storage</h3>
          </div>
          <div className={styles.cardContent}>
            <div className={styles.stat}>
              <span className={styles.label}>Total Size</span>
              <span className={styles.value}>{formatFileSize(stats.storage.total_size)}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.label}>File Count</span>
              <span className={styles.value}>{stats.storage.file_count.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <Upload size={24} />
            <h3>Active Uploads</h3>
          </div>
          <div className={styles.cardContent}>
            <div className={styles.bigNumber}>{stats.active_uploads}</div>
            <span className={styles.label}>Currently uploading</span>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <TrendingUp size={24} />
            <h3>Success Rate</h3>
          </div>
          <div className={styles.cardContent}>
            <div className={styles.bigNumber}>{stats.metrics.success_rate.toFixed(1)}%</div>
            <span className={styles.label}>
              {stats.metrics.successful_uploads} / {stats.metrics.total_uploads} uploads
            </span>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <Activity size={24} />
            <h3>Total Uploads</h3>
          </div>
          <div className={styles.cardContent}>
            <div className={styles.bigNumber}>{stats.metrics.total_uploads.toLocaleString()}</div>
            <span className={styles.label}>All time</span>
          </div>
        </div>
      </div>

      {stats.upload_details.length > 0 && (
        <div className={styles.activeUploads}>
          <h3>Active Upload Details</h3>
          <div className={styles.uploadList}>
            {stats.upload_details.map((upload) => (
              <div key={upload.upload_id} className={styles.uploadItem}>
                <div className={styles.uploadInfo}>
                  <span className={styles.uploadFilename}>{upload.filename}</span>
                  <span className={styles.uploadId}>{upload.upload_id}</span>
                </div>
                <div className={styles.uploadProgress}>
                  <div className={styles.uploadProgressBar}>
                    <div
                      className={styles.uploadProgressFill}
                      style={{ width: `${upload.progress}%` }}
                    />
                  </div>
                  <span className={styles.uploadProgressText}>{upload.progress.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

