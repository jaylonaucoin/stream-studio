# Media Converter

A modern desktop application built with Electron and React that converts online videos and audio from **1000+ supported sites** to various formats using yt-dlp and FFmpeg. For personal use only.

## Supported Sites

This app uses [yt-dlp](https://github.com/yt-dlp/yt-dlp) which supports **over 1000 websites** including:

### Video Platforms
- **YouTube** (youtube.com, youtu.be, YouTube Music, YouTube Shorts)
- **Vimeo** (vimeo.com)
- **Dailymotion** (dailymotion.com)
- **Twitch** (twitch.tv - clips, VODs, highlights)
- **Rumble** (rumble.com)
- **BitChute** (bitchute.com)
- **Odysee/LBRY** (odysee.com)
- **PeerTube** (various instances)
- **Streamable** (streamable.com)
- **Bilibili** (bilibili.com)
- **Niconico** (nicovideo.jp)

### Social Media
- **Twitter/X** (twitter.com, x.com)
- **Facebook** (facebook.com, fb.watch)
- **Instagram** (instagram.com - posts, reels, stories)
- **TikTok** (tiktok.com)
- **Reddit** (reddit.com - video posts)
- **Pinterest** (pinterest.com)
- **LinkedIn** (linkedin.com)
- **Snapchat** (snapchat.com)
- **Threads** (threads.net)

### Audio Platforms
- **SoundCloud** (soundcloud.com)
- **Bandcamp** (bandcamp.com)
- **Mixcloud** (mixcloud.com)
- **Audiomack** (audiomack.com)

### News & Media
- **BBC** (bbc.co.uk)
- **CNN** (cnn.com)
- **NBC** (nbc.com)
- **ABC News** (abcnews.go.com)
- **CBS** (cbs.com)
- **The Guardian** (theguardian.com)
- **Washington Post** (washingtonpost.com)

### Educational
- **TED** (ted.com)
- **Khan Academy** (khanacademy.org)
- **Udemy** (udemy.com)
- **Coursera** (coursera.org)

### Other
- **Flickr** (flickr.com)
- **Imgur** (imgur.com)
- **VK** (vk.com)
- **Coub** (coub.com)
- **Dropbox** (dropbox.com - shared videos)
- **Google Drive** (drive.google.com - shared videos)
- ...and many more!

For a complete list of supported sites, see the [yt-dlp supported sites](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md).

## Features

- **Universal Video Downloads**: Convert videos from 1000+ websites
- **Robust URL Handling**: Accepts URLs with or without `https://` prefix
- **Multiple Format Support**:
  - Audio: MP3, M4A, FLAC, WAV, AAC, Opus, Vorbis, ALAC
  - Video: MP4, MKV, WebM, MOV, AVI, FLV, GIF
- **Modern Dark UI**: Beautiful Material-UI interface with dark theme
- **Real-time Progress**: Live conversion progress with detailed logs
- **Batch Queue**: Process multiple URLs at once
- **Conversion History**: Track all your past conversions
- **System Notifications**: Get notified when conversions complete
- **Drag & Drop Support**: Simply drag URLs into the app
- **Custom Output Folder**: Choose where to save converted files
- **Persistent Settings**: Your preferences are saved between sessions
- **Window State Persistence**: App remembers its size and position
- **Cross-platform**: Works on Windows, macOS, and Linux

## Screenshots

The app features a sleek dark interface with red accents, providing:
- Easy URL input with paste button (accepts any video URL)
- Mode toggle (Audio/Video)
- Format selection dropdown
- Progress indicator with percentage
- Expandable conversion logs
- Quick access to conversion history
- Batch queue for multiple conversions

## Requirements

- Node.js 18+ (LTS version recommended)
- npm or yarn
- yt-dlp binary (auto-downloaded on install)
- FFmpeg (auto-populated from ffmpeg-static on all platforms via `npm run postinstall`)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Binary Dependencies

Binary dependencies (yt-dlp and FFmpeg) are **automatically downloaded** when you run `npm install`. The postinstall script will:

- Download `yt-dlp` for your platform
- Copy `ffmpeg` from the ffmpeg-static package to `bin/` (all platforms: Windows, macOS, Linux)

**Manual Download (if automatic download fails):**

#### yt-dlp
Download from [yt-dlp releases](https://github.com/yt-dlp/yt-dlp/releases):
- **Windows**: `bin/yt-dlp.exe`
- **Mac/Linux**: `bin/yt-dlp` (make executable: `chmod +x bin/yt-dlp`)

#### FFmpeg
The app uses [ffmpeg-static](https://www.npmjs.com/package/ffmpeg-static) which provides the binary during `npm install`. If the bundled `bin/ffmpeg` (or `bin/ffmpeg.exe` on Windows) is missing, you can install FFmpeg system-wide:

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
media-converter/
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
│   ├── ffmpeg              # (Mac/Linux, from ffmpeg-static)
│   └── ffmpeg.exe          # (Windows, from ffmpeg-static)
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
│   │   ├── QueuePanel.jsx
│   │   └── SettingsDialog.jsx
│   └── styles/
│       └── theme.js        # MUI theme configuration
├── styles.css              # Legacy styles (unused)
└── dist/                   # Build output (generated)
```

## Usage

1. Launch the application
2. Paste any video URL into the input field (or drag and drop)
   - YouTube, Vimeo, Twitter, TikTok, etc.
   - URL protocol (`https://`) is optional - it will be added automatically
3. Select mode: **Audio** or **Video**
4. Choose your desired output format
5. Click **Convert**
6. Wait for conversion to complete
7. Click **Open Location** to find your file

### Batch Conversion

1. Click the Queue icon in the top-right corner
2. Paste multiple URLs (one per line)
3. Click "Add to Queue"
4. Click "Start" to process all URLs

### URL Formats Accepted

The app accepts URLs in various formats:
- Full URL: `https://www.youtube.com/watch?v=VIDEO_ID`
- Without www: `https://youtube.com/watch?v=VIDEO_ID`
- Without protocol: `youtube.com/watch?v=VIDEO_ID`
- Short URLs: `youtu.be/VIDEO_ID`
- Mobile URLs: `m.youtube.com/watch?v=VIDEO_ID`

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
- Run `npm run postinstall` to copy the ffmpeg-static binary to `bin/`
- **Windows**: Ensure `bin/ffmpeg.exe` exists or FFmpeg is in system PATH
- **Mac/Linux**: Ensure `bin/ffmpeg` exists or install FFmpeg system-wide (e.g. `brew install ffmpeg`)

### yt-dlp Not Found
- Ensure the appropriate binary is in the `bin/` folder
- On Mac/Linux, ensure the binary is executable: `chmod +x bin/yt-dlp`

### Conversion Fails
- Check your internet connection
- Verify the URL is valid and accessible
- Ensure you have write permissions to the output folder
- Check that the content is not private or age-restricted
- Some sites may have DRM protection that prevents downloading

### "Unsupported URL" Error
- The site may not be supported by yt-dlp
- Check the [supported sites list](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md)
- The site's structure may have changed - try updating yt-dlp

### Permission Errors
- Ensure you have write permissions to the output folder
- Try selecting a different output folder

### App Doesn't Start
- Delete `node_modules` and run `npm install` again
- Check the console for error messages

## Updating yt-dlp

To get the latest site support and bug fixes, you can update yt-dlp:

```bash
# Re-download binaries
npm run download-binaries
```

Or manually download the latest version from [yt-dlp releases](https://github.com/yt-dlp/yt-dlp/releases).

## License

MIT

## Disclaimer

This software is provided for personal use only. Users are responsible for ensuring their use of this software complies with the Terms of Service of the websites they download from and applicable copyright laws. Do not use this software to download copyrighted content without permission.
