import axios, { AxiosInstance } from 'axios'
import type { UploadStatusResponse, MonitoringStats } from '../types'

class ApiService {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: '/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  async initiateUpload(metadata: {
    filename: string
    file_size: number
    mime_type: string
    total_chunks: number
    md5?: string
  }): Promise<{ upload_id: string }> {
    const response = await this.client.post('/upload/initiate', metadata)
    return response.data
  }

  async uploadChunk(
    uploadId: string,
    chunkIndex: number,
    chunk: Blob
  ): Promise<{ progress: number; uploaded_chunks: number; total_chunks: number }> {
    const formData = new FormData()
    formData.append('upload_id', uploadId)
    formData.append('chunk_index', chunkIndex.toString())
    formData.append('chunk', chunk)

    const response = await this.client.post('/upload/chunk', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    return response.data
  }

  async finalizeUpload(uploadId: string, userId?: string): Promise<{
    message: string
    file_path: string
    filename: string
    file_size: number
    md5: string
    is_duplicate: boolean
  }> {
    const response = await this.client.post('/upload/finalize', {
      upload_id: uploadId,
      user_id: userId
    })
    return response.data
  }

  async getUploadStatus(uploadId: string): Promise<UploadStatusResponse> {
    const response = await this.client.get(`/upload/status/${uploadId}`)
    return response.data
  }

  async cancelUpload(uploadId: string): Promise<void> {
    await this.client.delete(`/upload/cancel/${uploadId}`)
  }

  async getMonitoringStats(): Promise<MonitoringStats> {
    const response = await this.client.get('/monitoring/stats')
    return response.data
  }

  async healthCheck(): Promise<{ status: string; services: Record<string, string> }> {
    const response = await this.client.get('/monitoring/health')
    return response.data
  }
}

export const apiService = new ApiService()

