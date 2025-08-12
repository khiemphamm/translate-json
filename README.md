# JSON Translation Tool

A powerful web application for translating large JSON files while preserving their structure, using LibreTranslate API with Docker.

## ✨ Features

- **Large File Support**: Handle JSON files up to 10,000+ lines
- **Structure Preservation**: Translates only string values, keeps keys and structure intact
- **Smart Translation**: Auto-detects URLs, hex codes, email addresses, and other non-translatable content
- **Batching & Rate Limiting**: Efficient API usage with configurable batch sizes
- **Deduplication**: Reduces API calls by translating unique strings only once
- **Caching**: Uses localStorage and IndexedDB for persistent caching
- **Resume Functionality**: Pause and resume translations without losing progress
- **Real-time Progress**: Live progress tracking with detailed logs
- **Diff Viewer**: Visual comparison between original and translated content
- **Multiple Download Options**: Full translated file or patch format
- **Retry Logic**: Automatic retry with exponential backoff for failed translations
- **Source Language Detection**: Auto-detect source language or manual selection

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Docker (for LibreTranslate)

### 1. Start LibreTranslate with Docker

```bash
# Option 1: Basic setup (CPU only)
docker run -ti --rm -p 5000:5000 libretranslate/libretranslate

# Option 2: With persistent models and API key
docker run -ti --rm -p 5000:5000 \
  -v libretranslate_data:/app/db \
  -e LT_API_KEYS=true \
  -e LT_API_KEYS_DB_PATH=/app/db/api_keys.db \
  libretranslate/libretranslate

# Option 3: GPU acceleration (if you have NVIDIA GPU)
docker run -ti --rm --gpus all -p 5000:5000 libretranslate/libretranslate
```

### 2. Install and Run the Application

```bash
# Clone or extract the project
cd translate-json-final

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env.local

# Start development server
npm run dev
```

### 3. Open in Browser

Visit [http://localhost:3000](http://localhost:3000)

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file based on `.env.example`:

```env
# LibreTranslate API Configuration
NEXT_PUBLIC_LIBRETRANSLATE_URL=http://localhost:5000
LIBRETRANSLATE_API_KEY=

# Rate limiting (requests per minute)
NEXT_PUBLIC_MAX_REQUESTS_PER_MINUTE=60

# Batch processing
NEXT_PUBLIC_BATCH_SIZE=50
NEXT_PUBLIC_MAX_RETRIES=3

# Cache settings (milliseconds)
NEXT_PUBLIC_CACHE_TTL=86400000
```

### LibreTranslate Configuration Options

1. **Local Docker Instance** (Recommended for privacy):
   ```bash
   docker run -ti --rm -p 5000:5000 libretranslate/libretranslate
   ```

2. **Public Instance** (Requires API key):
   ```env
   NEXT_PUBLIC_LIBRETRANSLATE_URL=https://libretranslate.de
   LIBRETRANSLATE_API_KEY=your_api_key_here
   ```

3. **Custom Instance**:
   ```env
   NEXT_PUBLIC_LIBRETRANSLATE_URL=https://your-instance.com
   LIBRETRANSLATE_API_KEY=optional_key
   ```

## 📖 Usage Guide

### Basic Translation Workflow

1. **Upload JSON File**: Drag and drop or click to select your JSON file
2. **Configure Languages**: Select source language (or auto-detect) and target language
3. **Adjust Settings**: Optionally configure batch size and retry settings
4. **Start Translation**: Click "Start Translation" to begin the process
5. **Monitor Progress**: Watch real-time progress and logs
6. **Review Results**: Use the diff viewer to compare original vs translated
7. **Download**: Get the complete translated file or just the patch

### Advanced Features

#### Pause and Resume
- Click "Pause" during translation to safely stop
- Use "Resume" to continue from where you left off
- Translation state is preserved in browser storage

#### Smart Content Detection
The tool automatically skips translating:
- URLs and email addresses
- Hex color codes (#ffffff)
- Pure numbers and technical identifiers
- HTML tags and placeholders
- Variables and template strings

#### Batch Processing
- Configurable batch size (1-100)
- Rate limiting to respect API limits
- Automatic retry with exponential backoff
- Deduplication to reduce API calls

#### Caching System
- In-memory cache for active session
- IndexedDB for persistent storage
- Automatic cache cleanup
- Reduces duplicate API calls

## 📁 Example Files

### Input Example (`examples/input.json`)

```json
{
  "app": {
    "name": "MyApp",
    "version": "1.0.0",
    "description": "A sample application for demonstration",
    "url": "https://example.com",
    "contact": "support@example.com"
  },
  "ui": {
    "buttons": {
      "save": "Save",
      "cancel": "Cancel",
      "delete": "Delete"
    },
    "messages": {
      "welcome": "Welcome to our application!",
      "error": "An error occurred. Please try again.",
      "success": "Operation completed successfully."
    },
    "navigation": {
      "home": "Home",
      "about": "About Us",
      "contact": "Contact"
    }
  },
  "validation": {
    "required": "This field is required",
    "email": "Please enter a valid email address",
    "min_length": "Minimum length is {{min}} characters"
  },
  "colors": {
    "primary": "#3b82f6",
    "secondary": "#6b7280",
    "success": "#10b981"
  }
}
```

## 🛠️ Development

### Project Structure

```
src/
├── app/                    # Next.js app directory
│   └── page.tsx           # Main application page
├── components/            # React components
│   ├── FileUpload.tsx     # File upload component
│   ├── LanguageSelector.tsx
│   ├── ProgressIndicator.tsx
│   ├── LogViewer.tsx
│   ├── DiffViewer.tsx
│   └── FileDownload.tsx
├── services/              # Business logic services
│   ├── libreTranslateService.ts
│   ├── cacheService.ts
│   ├── rateLimiterService.ts
│   └── translationService.ts
├── types/                 # TypeScript type definitions
│   └── translation.ts
└── utils/                 # Utility functions
    └── jsonProcessor.ts
```

### Key Technologies

- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **State Management**: React hooks and context
- **Storage**: IndexedDB for caching, localStorage for session data
- **API Client**: Axios for HTTP requests
- **Icons**: Lucide React
- **File Handling**: react-dropzone
- **Utilities**: Lodash for data manipulation

### Building for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

### Testing LibreTranslate Connection

```bash
# Test basic connectivity
curl http://localhost:5000/languages

# Test translation
curl -X POST http://localhost:5000/translate \
  -H "Content-Type: application/json" \
  -d '{
    "q": "Hello, world!",
    "source": "en",
    "target": "vi"
  }'
```

## 🔒 Security & Privacy

- **Local Processing**: JSON files are processed entirely in your browser
- **No Data Persistence**: No data is stored on the server
- **Private LibreTranslate**: Use local Docker instance for complete privacy
- **Secure Caching**: All cached data stays in your browser's local storage

## 🐛 Troubleshooting

### Common Issues

1. **LibreTranslate Connection Failed**
   - Ensure Docker container is running: `docker ps`
   - Check port mapping: `-p 5000:5000`
   - Verify URL in `.env.local`

2. **Large File Processing Slow**
   - Reduce batch size in advanced settings
   - Check rate limiting configuration
   - Consider using a faster LibreTranslate instance

3. **Memory Issues with Large Files**
   - The application is optimized for files up to 10MB
   - For larger files, consider splitting them first

4. **Translation Quality Issues**
   - Verify source language detection is correct
   - Some technical terms may not translate well
   - Consider using specialized translation models

### Performance Tips

- Use smaller batch sizes for better responsiveness
- Enable caching to avoid re-translating duplicate content
- Use auto-detect only when necessary (manual selection is faster)
- Keep the browser tab active during translation for best performance

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [LibreTranslate](https://libretranslate.com/) for the free and open-source translation API
- [Next.js](https://nextjs.org/) for the excellent React framework
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework

---

**Note**: This tool is designed for development and localization purposes. For production applications, consider using professional translation services for critical content.
# translate-json
