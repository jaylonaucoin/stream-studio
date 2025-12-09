# Binaries Directory

This directory contains binary dependencies for the YouTube to MP3 Converter.

## Automatic Download

**Binaries are automatically downloaded** when you run `npm install` via the postinstall script.

The following binaries will be downloaded:
- **yt-dlp**: Downloaded for your platform (Windows, macOS, or Linux)
- **ffmpeg.exe**: Downloaded for Windows only (Mac/Linux users should install FFmpeg system-wide)

## Manual Download (if automatic download fails)

If the automatic download fails, you can manually download the binaries:

### yt-dlp
- **Windows**: `yt-dlp.exe`
- **Mac/Linux**: `yt-dlp`
- Download from: https://github.com/yt-dlp/yt-dlp/releases

### ffmpeg (Windows only)
- **Windows**: `ffmpeg.exe`
- Download from: https://github.com/BtbN/FFmpeg-Builds/releases/latest
  - Look for `ffmpeg-*-win64-gpl-shared.zip`
  - Extract and copy `ffmpeg.exe` from the `bin` folder to this directory

For Mac/Linux, install FFmpeg system-wide:
- **macOS**: `brew install ffmpeg`
- **Linux (Ubuntu/Debian)**: `sudo apt install ffmpeg`
- **Linux (Fedora)**: `sudo dnf install ffmpeg`

## Notes
- On Mac/Linux, the yt-dlp binary is automatically made executable
- The app will first check for bundled binaries, then fall back to system PATH
- To re-download binaries manually, run: `npm run download-binaries`

