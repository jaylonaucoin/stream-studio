# Binaries Directory

This directory should contain the following binaries:

## Required Binaries

### yt-dlp
- **Windows**: `yt-dlp.exe`
- **Mac/Linux**: `yt-dlp`

Download from: https://github.com/yt-dlp/yt-dlp/releases

### ffmpeg (Windows only)
- **Windows**: `ffmpeg.exe`

**Recommended: Download from BtbN/FFmpeg-Builds** (Pre-built Windows binaries):
1. Go to https://github.com/BtbN/FFmpeg-Builds/releases
2. Download the latest `ffmpeg-master-latest-win64-gpl-shared.zip` file
   - `gpl-shared` includes all codecs and shared libraries (recommended)
   - `gpl` is static build (larger, but self-contained)
3. Extract the ZIP file
4. Navigate to the `bin` folder inside the extracted archive
5. Copy `ffmpeg.exe` to this directory (`youtube-to-mp3/bin/`)

**Alternative: Official FFmpeg builds**
- Download from: https://ffmpeg.org/download.html
- For Windows, look for "Windows builds from gyan.dev" or other Windows build providers

For Mac/Linux, ffmpeg should be installed system-wide and available in PATH.

## Notes
- On Mac/Linux, you may need to make the yt-dlp binary executable: `chmod +x bin/yt-dlp`
- The app will first check for bundled binaries, then fall back to system PATH

