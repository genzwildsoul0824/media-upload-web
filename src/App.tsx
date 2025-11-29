import { useState } from 'react'
import { FileUploader } from './components/FileUploader'
import { UploadHistory } from './components/UploadHistory'
import { MonitoringDashboard } from './components/MonitoringDashboard'
import { Upload, History, Activity } from 'lucide-react'
import styles from './App.module.css'

type Tab = 'upload' | 'history' | 'monitoring'

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('upload')

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1>Media Upload System</h1>
        <p>Upload images and videos with advanced chunked transfer</p>
      </header>

      <nav className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'upload' ? styles.active : ''}`}
          onClick={() => setActiveTab('upload')}
          aria-selected={activeTab === 'upload'}
          role="tab"
        >
          <Upload size={18} />
          <span>New Upload</span>
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'history' ? styles.active : ''}`}
          onClick={() => setActiveTab('history')}
          aria-selected={activeTab === 'history'}
          role="tab"
        >
          <History size={18} />
          <span>History</span>
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'monitoring' ? styles.active : ''}`}
          onClick={() => setActiveTab('monitoring')}
          aria-selected={activeTab === 'monitoring'}
          role="tab"
        >
          <Activity size={18} />
          <span>Monitoring</span>
        </button>
      </nav>

      <main className={styles.main}>
        {activeTab === 'upload' && <FileUploader />}
        {activeTab === 'history' && <UploadHistory />}
        {activeTab === 'monitoring' && <MonitoringDashboard />}
      </main>

      <footer className={styles.footer}>
        <p>Media Upload System v1.0 | Built with React + Symfony</p>
      </footer>
    </div>
  )
}

export default App

