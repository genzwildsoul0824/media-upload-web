# Media Upload System - Web Client

Modern, responsive React web application for uploading media files with chunked transfer and advanced features.

## Features

✅ **File Management**
- Drag & drop file upload
- Multiple file selection (1-10 files)
- File type validation (images & videos)
- Real-time file previews
- File size validation (up to 500MB)

✅ **Upload Control**
- Chunked upload (1MB chunks)
- Pause/Resume functionality
- Cancel uploads
- Automatic retry with exponential backoff
- Concurrency control (max 3 parallel)

✅ **User Interface**
- Real-time progress tracking
- Individual file progress
- Overall upload progress
- Upload history with localStorage
- Responsive design (desktop/tablet/mobile)

✅ **Monitoring**
- Real-time system stats
- Active uploads dashboard
- Success rate metrics
- Storage usage tracking

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **Zustand** - State management
- **Axios** - HTTP client
- **React Dropzone** - Drag & drop
- **Lucide React** - Icons
- **Vitest** - Testing framework

## Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Development

```bash
# Run tests
npm run test

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage

# Lint code
npm run lint
```

## Configuration

The application expects the backend API to be running at `http://localhost:8000`. You can configure the proxy in `vite.config.ts`:

```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  }
})
```

## Project Structure

```
fe'/
├── src/
│   ├── components/          # React components
│   │   ├── FileUploader.tsx
│   │   ├── FileList.tsx
│   │   ├── FileItem.tsx
│   │   ├── UploadHistory.tsx
│   │   └── MonitoringDashboard.tsx
│   ├── services/            # API & upload services
│   │   ├── api.ts
│   │   └── uploadService.ts
│   ├── store/               # State management
│   │   └── uploadStore.ts
│   ├── types/               # TypeScript types
│   │   └── index.ts
│   ├── utils/               # Utility functions
│   │   └── fileUtils.ts
│   ├── App.tsx              # Main app component
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles
├── public/                  # Static assets
├── index.html              # HTML template
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript config
├── vite.config.ts          # Vite config
└── README.md               # This file
```

## Features in Detail

### File Upload Flow

1. **Select Files**: Drag & drop or click to select files
2. **Validation**: Instant validation of file type and size
3. **Preview**: Generate thumbnails for images/videos
4. **Queue**: Files added to upload queue
5. **Start Upload**: Click play button to start
6. **Chunking**: Files split into 1MB chunks
7. **Progress**: Real-time progress updates
8. **Completion**: Success notification & history update

### Pause/Resume

- **Pause**: Stops upload, maintains state
- **Resume**: Continues from last uploaded chunk
- **State Persistence**: Upload state saved in localStorage
- **Automatic Recovery**: Resumes on page reload

### Error Handling

- **Network Errors**: Automatic retry with exponential backoff
- **Validation Errors**: Clear error messages
- **Rate Limiting**: Handles 429 responses gracefully
- **Server Errors**: User-friendly error display

### Responsive Design

- **Desktop**: Full-featured interface with all controls
- **Tablet**: Optimized layout for medium screens
- **Mobile**: Touch-friendly interface with essential features

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)

## Performance

- **First Load**: <2s
- **Chunk Upload**: <300ms per chunk
- **Concurrent Uploads**: Max 3 parallel
- **State Updates**: Optimized with Zustand
- **Re-renders**: Minimized with React.memo

## Testing

```bash
# Run all tests
npm run test

# Watch mode
npm run test -- --watch

# Coverage report
npm run test:coverage
```

Tests include:
- Unit tests for utilities
- Component tests
- Integration tests
- E2E tests (with Playwright)

## Deployment

### Build for Production

```bash
npm run build
```

Output will be in `dist/` directory.

### Deploy to Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

### Deploy to Static Hosting

Build and upload the `dist/` directory to any static hosting service:
- AWS S3 + CloudFront
- Google Cloud Storage
- Azure Static Web Apps
- GitHub Pages

## Environment Variables

Create a `.env.local` file for local development:

```env
VITE_API_URL=http://localhost:8000/api
```

## Troubleshooting

### CORS Issues

Ensure the backend has proper CORS headers configured for your frontend domain.

### Upload Fails

1. Check backend is running
2. Verify Redis is running
3. Check browser console for errors
4. Verify file meets validation criteria

### Slow Performance

1. Check network connection
2. Reduce concurrent uploads
3. Clear browser cache
4. Check backend server resources

## Future Improvements

### Testing
- Add unit tests for uploadService
- Add unit tests for uploadQueueManager
- Add component tests with React Testing Library
- Add E2E tests for upload flow
- Add tests for pause/resume functionality
- Add tests for error handling scenarios
- Add tests for retry logic
- Increase test coverage to >80%

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT

