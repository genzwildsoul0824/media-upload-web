import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FileMetadata, UploadHistoryItem } from '../types'

interface UploadStore {
  files: FileMetadata[]
  history: UploadHistoryItem[]
  addFiles: (files: FileMetadata[]) => void
  updateFile: (id: string, updates: Partial<FileMetadata>) => void
  removeFile: (id: string) => void
  clearCompleted: () => void
  addToHistory: (item: UploadHistoryItem) => void
  clearHistory: () => void
}

export const useUploadStore = create<UploadStore>()(
  persist(
    (set) => ({
      files: [],
      history: [],

      addFiles: (newFiles) =>
        set((state) => ({
          files: [...state.files, ...newFiles]
        })),

      updateFile: (id, updates) =>
        set((state) => ({
          files: state.files.map((file) =>
            file.id === id ? { ...file, ...updates } : file
          )
        })),

      removeFile: (id) =>
        set((state) => ({
          files: state.files.filter((file) => file.id !== id)
        })),

      clearCompleted: () =>
        set((state) => ({
          files: state.files.filter(
            (file) => file.status !== 'completed' && file.status !== 'error'
          )
        })),

      addToHistory: (item) =>
        set((state) => ({
          history: [item, ...state.history].slice(0, 100) // Keep last 100 items
        })),

      clearHistory: () => set({ history: [] })
    }),
    {
      name: 'upload-storage',
      partialize: (state) => ({ history: state.history })
    }
  )
)

