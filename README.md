# YouTube to MP3 Converter

A desktop application built with Electron that converts YouTube videos to MP3 files using yt-dlp and ffmpeg. For personal use only.

## Features

- Convert YouTube videos to MP3 format
- Simple, intuitive user interface
- Real-time conversion progress
- Drag and drop URL support
- Custom output folder selection
- Cross-platform support (Windows, macOS, Linux)

## Requirements

- Node.js (LTS version recommended)
- npm or yarn
- yt-dlp binary (included in `bin/` folder)
- FFmpeg (bundled for Windows, system installation required for Mac/Linux)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Add Required Binaries

#### yt-dlp
Download the appropriate binary for your platform from [yt-dlp releases](https://github.com/yt-dlp/yt-dlp/releases) and place it in the `bin/` folder:

- **Windows**: `bin/yt-dlp.exe`
- **Mac/Linux**: `bin/yt-dlp` (make it executable: `chmod +x bin/yt-dlp`)

#### FFmpeg

**Windows:**
- **Recommended**: Download from [BtbN/FFmpeg-Builds](https://github.com/BtbN/FFmpeg-Builds/releases)
  - Download the latest `ffmpeg-master-latest-win64-gpl-shared.zip`
  - Extract the ZIP and copy `ffmpeg.exe` from the `bin` folder to your project's `bin/` folder
- **Alternative**: Download from [ffmpeg.org](https://ffmpeg.org/download.html)
  - Extract and place `ffmpeg.exe` in the `bin/` folder

**macOS:**
```bash
brew install ffmpeg
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt install ffmpeg
```

**Linux (Fedora):**
```bash
sudo dnf install ffmpeg
```

### 3. Add App Icon

Place an app icon at `assets/icon.png` (256x256 pixels or larger recommended).

## Development

### Run the Application

```bash
npm start
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
youtube-to-mp3/
├── main.js           # Electron main process
├── preload.js        # Preload script (contextBridge API)
├── index.html        # UI markup
├── renderer.js       # Renderer process logic
├── styles.css        # Application styles
├── package.json      # Project configuration
├── assets/           # App icons and assets
│   └── icon.png
├── bin/              # Binary dependencies
│   ├── yt-dlp        # (Mac/Linux)
│   ├── yt-dlp.exe    # (Windows)
│   └── ffmpeg.exe    # (Windows only)
└── dist/             # Build output (generated)
```

## Usage

1. Launch the application
2. Paste a YouTube URL into the input field (or drag and drop a URL)
3. Optionally choose an output folder (defaults to Downloads)
4. Click "Convert"
5. Wait for conversion to complete
6. Click the link to open the converted file location

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

## License

MIT

## Disclaimer

This software is provided for personal use only. Users are responsible for ensuring their use of this software complies with YouTube's Terms of Service and applicable copyright laws.
