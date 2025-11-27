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

      <nav className={styles.nav}>
        <button
          className={`${styles.navButton} ${activeTab === 'upload' ? styles.active : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          <Upload size={20} />
          Upload
        </button>
        <button
          className={`${styles.navButton} ${activeTab === 'history' ? styles.active : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History size={20} />
          History
        </button>
        <button
          className={`${styles.navButton} ${activeTab === 'monitoring' ? styles.active : ''}`}
          onClick={() => setActiveTab('monitoring')}
        >
          <Activity size={20} />
          Monitoring
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

