# YouTube Media Converter

A modern desktop application built with Electron and React that converts YouTube videos to audio (MP3, FLAC, WAV, etc.) or video (MP4, MKV, WebM, etc.) formats using yt-dlp and FFmpeg. For personal use only.

## Features

- **Audio & Video Downloads**: Convert YouTube videos to various audio or video formats
- **Multiple Format Support**:
  - Audio: MP3, M4A, FLAC, WAV, AAC, Opus, Vorbis, ALAC
  - Video: MP4, MKV, WebM, MOV, AVI, FLV, GIF
- **Modern Dark UI**: Beautiful Material-UI interface with dark theme
- **Real-time Progress**: Live conversion progress with detailed logs
- **Conversion History**: Track all your past conversions
- **System Notifications**: Get notified when conversions complete
- **Drag & Drop Support**: Simply drag URLs into the app
- **Custom Output Folder**: Choose where to save converted files
- **Persistent Settings**: Your preferences are saved between sessions
- **Window State Persistence**: App remembers its size and position
- **Cross-platform**: Works on Windows, macOS, and Linux

## Screenshots

The app features a sleek dark interface with red accents, providing:
- Easy URL input with paste button
- Mode toggle (Audio/Video)
- Format selection dropdown
- Progress indicator with percentage
- Expandable conversion logs
- Quick access to conversion history

## Requirements

- Node.js 18+ (LTS version recommended)
- npm or yarn
- yt-dlp binary (auto-downloaded on install)
- FFmpeg (bundled for Windows, system installation required for Mac/Linux)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Binary Dependencies

Binary dependencies (yt-dlp and FFmpeg for Windows) are **automatically downloaded** when you run `npm install`. The postinstall script will:

- Download `yt-dlp` for your platform
- Download `ffmpeg.exe` for Windows (Mac/Linux users should install FFmpeg system-wide)

**Manual Download (if automatic download fails):**

#### yt-dlp
Download from [yt-dlp releases](https://github.com/yt-dlp/yt-dlp/releases):
- **Windows**: `bin/yt-dlp.exe`
- **Mac/Linux**: `bin/yt-dlp` (make executable: `chmod +x bin/yt-dlp`)

#### FFmpeg (Windows only)
Download from [BtbN/FFmpeg-Builds](https://github.com/BtbN/FFmpeg-Builds/releases):
- Extract and place `ffmpeg.exe` in the `bin/` folder

**macOS/Linux:**
Install FFmpeg system-wide:
```bash
# macOS
brew install ffmpeg

# Linux (Ubuntu/Debian)
sudo apt install ffmpeg

# Linux (Fedora)
sudo dnf install ffmpeg
```

### 3. Add App Icon

Place an app icon at `assets/icon.png` (256x256 pixels or larger recommended).

## Development

### Run the Application

```bash
# Start development server with hot reload
npm run electron:dev

# Or start Electron directly (requires manual vite dev server)
npm run dev    # In one terminal
npm start      # In another terminal
```

### Linting and Formatting

```bash
# Check for linting errors
npm run lint

# Fix linting errors
npm run lint:fix

# Check formatting
npm run format:check

# Fix formatting
npm run format
```

### Build for Production

Build for current platform:
```bash
npm run build
```

Build for specific platforms:
```bash
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

Built installers will be in the `dist/` folder.

## Project Structure

```
youtube-media-converter/
├── main.js                 # Electron main process
├── preload.js              # Preload script (contextBridge API)
├── index.html              # HTML entry point
├── package.json            # Project configuration
├── vite.config.js          # Vite build configuration
├── .eslintrc.json          # ESLint configuration
├── .prettierrc             # Prettier configuration
├── assets/                 # App icons and assets
│   └── icon.png
├── bin/                    # Binary dependencies (auto-downloaded)
│   ├── yt-dlp              # (Mac/Linux)
│   ├── yt-dlp.exe          # (Windows)
│   └── ffmpeg.exe          # (Windows only)
├── scripts/                # Utility scripts
│   └── download-binaries.js
├── src/                    # React source files
│   ├── App.jsx             # Main app component
│   ├── index.jsx           # React entry point
│   ├── components/         # React components
│   │   ├── ConversionForm.jsx
│   │   ├── ErrorDialog.jsx
│   │   ├── HistoryPanel.jsx
│   │   ├── LogViewer.jsx
│   │   ├── OutputFolderSelector.jsx
│   │   ├── ProgressIndicator.jsx
│   │   └── SettingsDialog.jsx
│   └── styles/
│       └── theme.js        # MUI theme configuration
├── styles.css              # Legacy styles (unused)
└── dist/                   # Build output (generated)
```

## Usage

1. Launch the application
2. Paste a YouTube URL into the input field (or drag and drop)
3. Select mode: **Audio** or **Video**
4. Choose your desired output format
5. Click **Convert**
6. Wait for conversion to complete
7. Click **Open Location** to find your file

### Keyboard Shortcuts

- **Enter** — Start conversion
- **Escape** — Cancel conversion
- **Ctrl+V / Cmd+V** — Paste URL from clipboard

### Settings

Access settings via the gear icon in the top-right corner:
- Enable/disable system notifications
- Set default conversion mode and formats
- Configure history size

### History

Access conversion history via the clock icon in the top-right corner:
- View all past conversions
- Open file locations
- Copy original URLs
- Clear history

## Security

- Uses `contextBridge` for secure IPC communication
- No `nodeIntegration` in renderer process
- Input sanitization before passing to child processes
- Uses `spawn` with args array (no shell injection vulnerabilities)

## Troubleshooting

### FFmpeg Not Found
- **Windows**: Ensure `ffmpeg.exe` is in the `bin/` folder or in system PATH
- **Mac/Linux**: Install FFmpeg system-wide using package manager

### yt-dlp Not Found
- Ensure the appropriate binary is in the `bin/` folder
- On Mac/Linux, ensure the binary is executable: `chmod +x bin/yt-dlp`

### Conversion Fails
- Check your internet connection
- Verify the YouTube URL is valid and accessible
- Ensure you have write permissions to the output folder
- Check that the video is not private or age-restricted

### Permission Errors
- Ensure you have write permissions to the output folder
- Try selecting a different output folder

### App Doesn't Start
- Delete `node_modules` and run `npm install` again
- Check the console for error messages

## License

MIT

## Disclaimer

This software is provided for personal use only. Users are responsible for ensuring their use of this software complies with YouTube's Terms of Service and applicable copyright laws.
