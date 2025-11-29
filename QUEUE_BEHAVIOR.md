# Upload Queue Behavior

## Overview

The upload queue automatically manages concurrent file uploads with smart queue processing.

## Configuration

- **Max Concurrent Uploads**: 3 files
- **Queue Processing**: Automatic

## Behavior Scenarios

### Scenario 1: Normal Upload Flow

```
Drop 5 files
    ↓
[File 1] ← Uploading (Auto-start)
[File 2] ← Uploading (Auto-start)
[File 3] ← Uploading (Auto-start)
[File 4] ← Queued (waiting)
[File 5] ← Queued (waiting)
    ↓
File 1 completes successfully
    ↓
[File 4] ← Uploading (Auto-start) ✅
[File 2] ← Still uploading
[File 3] ← Still uploading
[File 5] ← Queued (waiting)
```

**Result**: Next file in queue starts automatically

---

### Scenario 2: User Pauses Upload (Manual)

```
Drop 5 files
    ↓
[File 1] ← Uploading (Auto-start)
[File 2] ← Uploading (Auto-start)
[File 3] ← Uploading (Auto-start)
[File 4] ← Queued (waiting)
[File 5] ← Queued (waiting)
    ↓
User clicks PAUSE on File 1
    ↓
[File 1] ← Paused ⏸️
[File 2] ← Still uploading
[File 3] ← Still uploading
[File 4] ← Queued (waiting) ⚠️ Does NOT start
[File 5] ← Queued (waiting)
```

**Result**: Queue does NOT process. File 4 stays queued.

**Reason**: User manually paused, so we respect their intent to reduce active uploads. Only 2 concurrent uploads continue (File 2 and File 3), maintaining exactly 2 active uploads instead of starting File 4 to reach 3.

---

### Scenario 3: Upload Fails (Automatic Error)

```
Drop 5 files
    ↓
[File 1] ← Uploading (Auto-start)
[File 2] ← Uploading (Auto-start)
[File 3] ← Uploading (Auto-start)
[File 4] ← Queued (waiting)
[File 5] ← Queued (waiting)
    ↓
File 1 encounters error (network, server, validation, etc.)
    ↓
[File 1] ← Error ❌
[File 4] ← Uploading (Auto-start) ✅
[File 2] ← Still uploading
[File 3] ← Still uploading
[File 5] ← Queued (waiting)
```

**Result**: Next file in queue starts automatically

**Reason**: Failed upload frees up a slot, so queue processes next file.

---

### Scenario 4: User Resumes Paused Upload

```
[File 1] ← Paused
[File 2] ← Still uploading
[File 3] ← Still uploading
[File 4] ← Queued (waiting)
[File 5] ← Queued (waiting)
    ↓
User clicks RESUME on File 1
    ↓
[File 1] ← Uploading (Resumed) ✅
[File 2] ← Still uploading
[File 3] ← Still uploading
[File 4] ← Queued (waiting)
[File 5] ← Queued (waiting)
```

**Result**: Paused file resumes, added to front of queue

**Note**: File 1 takes priority over File 4

---

### Scenario 5: User Retries Failed Upload

```
[File 1] ← Error ❌
[File 2] ← Still uploading
[File 3] ← Still uploading
[File 4] ← Uploading (auto-started after File 1 failed)
[File 5] ← Queued (waiting)
    ↓
User clicks RETRY on File 1
    ↓
[File 1] ← Uploading (Retrying) ✅ (if slot available)
     OR
[File 1] ← Queued (waiting) (if 3 uploads active)
[File 2] ← Still uploading
[File 3] ← Still uploading
[File 4] ← Still uploading
[File 5] ← Queued (waiting)
```

**Result**: Retry is added to queue and processed when slot available

---

## Error Types and Queue Behavior

| Error Type | Queue Processes? | Reason |
|------------|------------------|---------|
| Network error | ✅ Yes | Automatic failure |
| Server error (500) | ✅ Yes | Automatic failure |
| Rate limit (429) | ✅ Yes | Automatic failure |
| Validation error | ✅ Yes | Automatic failure |
| Chunk upload failure | ✅ Yes | Automatic failure |
| User pause | ❌ No | Manual action |
| User cancel | ❌ No | Manual action |

---

## Implementation Details

### Queue Manager (`uploadQueueManager.ts`)

- **activeUploads**: Set of file IDs currently uploading
- **pausedUploads**: Set of file IDs that were manually paused
- **queue**: Array of files waiting to upload

### Key Logic

```typescript
// On Error callback
if (pausedUploads.has(fileId)) {
  // Manual pause - do NOT process queue
  status = 'paused'
} else {
  // Actual error - DO process queue
  status = 'error'
  processQueue() // Start next file
}
```

### Pause Flow

1. User clicks pause button
2. `pausedUploads.add(fileId)` - Mark as manually paused
3. `uploadService.pauseUpload(fileId)` - Abort upload
4. Upload service triggers error callback
5. Queue manager checks `pausedUploads` - finds it
6. Sets status to 'paused'
7. Does NOT call `processQueue()`

### Error Flow

1. Upload encounters error (network, server, etc.)
2. Upload service triggers error callback
3. Queue manager checks `pausedUploads` - NOT found
4. Sets status to 'error'
5. CALLS `processQueue()` - Next file starts

---

## User Controls

| Action | Button | Effect on Queue |
|--------|--------|-----------------|
| Pause | ⏸️ | Pauses upload, queue holds |
| Resume | ▶️ | Resumes upload, added to front of queue |
| Cancel | ✖️ | Cancels upload, removed from queue |
| Retry | 🔄 | Retries failed upload, added to queue |

---

## Benefits

1. **Automatic**: No manual clicking needed
2. **Smart**: Respects user intent (pause vs error)
3. **Efficient**: Always maintains 3 concurrent uploads
4. **Predictable**: Consistent behavior across scenarios
5. **User-friendly**: Manual controls still work as expected

