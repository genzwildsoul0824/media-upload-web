import { describe, it, expect } from 'vitest'
import { formatFileSize, formatDuration, validateFile } from './fileUtils'

describe('fileUtils', () => {
  describe('formatFileSize', () => {
    it('formats bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 B')
      expect(formatFileSize(1024)).toBe('1 KB')
      expect(formatFileSize(1048576)).toBe('1 MB')
      expect(formatFileSize(1073741824)).toBe('1 GB')
    })

    it('formats decimal values', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB')
      expect(formatFileSize(2621440)).toBe('2.5 MB')
    })
  })

  describe('formatDuration', () => {
    it('formats seconds correctly', () => {
      expect(formatDuration(5000)).toBe('5s')
      expect(formatDuration(30000)).toBe('30s')
    })

    it('formats minutes correctly', () => {
      expect(formatDuration(60000)).toBe('1m 0s')
      expect(formatDuration(90000)).toBe('1m 30s')
    })

    it('formats hours correctly', () => {
      expect(formatDuration(3600000)).toBe('1h 0m')
      expect(formatDuration(5400000)).toBe('1h 30m')
    })
  })

  describe('validateFile', () => {
    it('accepts valid image files', () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' })
      Object.defineProperty(file, 'size', { value: 1048576 })
      
      expect(validateFile(file)).toBeNull()
    })

    it('accepts valid video files', () => {
      const file = new File([''], 'test.mp4', { type: 'video/mp4' })
      Object.defineProperty(file, 'size', { value: 10485760 })
      
      expect(validateFile(file)).toBeNull()
    })

    it('rejects invalid file types', () => {
      const file = new File([''], 'test.txt', { type: 'text/plain' })
      Object.defineProperty(file, 'size', { value: 1024 })
      
      expect(validateFile(file)).toContain('Invalid file type')
    })

    it('rejects files that are too large', () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' })
      Object.defineProperty(file, 'size', { value: 600 * 1024 * 1024 })
      
      expect(validateFile(file)).toContain('exceeds')
    })
  })
})

