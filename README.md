# Stream Studio

[![License](https://img.shields.io/github/license/jaylonaucoin/stream-studio)](./LICENSE)
[![GitHub release](https://img.shields.io/github/v/release/jaylonaucoin/stream-studio)](https://github.com/jaylonaucoin/stream-studio/releases)

A modern desktop application built with Electron and React that converts online videos and audio from **1000+ supported sites** to various formats using yt-dlp and FFmpeg. Search, download, edit metadata, split by chapters or custom segments, and convert local files. For personal use only.

## Demo

<img src="https://github.com/jaylonaucoin/stream-studio/blob/main/assets/demo.gif" width="100%"></img>

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

### Input & Discovery
- **YouTube / multi-site search** — Search YouTube, SoundCloud, Bandcamp, Vimeo, TikTok, and 10+ other sites with audio preview
- **Paste URL** — Accepts URLs with or without `https://` prefix
- **Local file conversion** — Convert existing media files (MP3, MP4, M4A, etc.)
- **Drag & drop** — URLs and local files

### Conversion
- **Audio formats**: MP3, M4A, FLAC, WAV, AAC, Opus, Vorbis, ALAC (plus Best quality option)
- **Video formats**: MP4, MKV, WebM, MOV, AVI, FLV, GIF
- **Quality presets**: Best, High (1080p / 192kbps), Medium (720p / 128kbps), Low (480p / 96kbps)
- **Clip/trim** — Start and end time for URL or local file

### Advanced
- **Playlist support** — Download full playlist or select specific videos
- **Chapter support** — Split by chapters into separate files or download full video
- **Manual segments** — Define custom time ranges to split into separate files
- **Custom metadata** — Title, artist, album, thumbnail cropping (ID3 / MP4 tags)
- **Batch queue** — Multiple URLs with drag-and-drop reordering, persisted across sessions

### UI & UX
- **Dark / light / system theme**
- **Keyboard shortcuts** — Ctrl+K shortcuts, Ctrl+H history, Ctrl+B queue, Ctrl+, settings
- **Real-time progress** — Speed, ETA, file size
- **Conversion history** — View, open locations, copy URLs
- **System notifications** — When conversions complete
- **Cross-platform** — Windows, macOS (x64 + arm64), Linux

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

### 3. App Icon

An app icon is included at `assets/icon.png` (256x256 or larger recommended).

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
npm run lint
npm run lint:fix
npm run format:check
npm run format
```

### Build for Production

```bash
# Build for current platform
npm run build

# Build for specific platforms
npm run build:win    # Windows
npm run build:mac    # macOS (x64 + arm64)
npm run build:linux  # Linux
```

Built installers will be in the `dist/` folder.

### Pre-built Releases

Pre-built installers are available in the [Releases](https://github.com/jaylonaucoin/stream-studio/releases) section. The app is **unsigned** (no code signing certificate), so you may need to allow it to run—see below.

## Running Pre-built Installers (Unsigned Builds)

### macOS

macOS Gatekeeper may block the app on first open:

1. **Right-click** (or Control+click) the app
2. Select **Open**
3. Click **Open** in the confirmation dialog

Alternatively: **System Settings → Privacy & Security → Security** → choose "Open Anyway" for the blocked app.

### Windows

Windows SmartScreen may warn "Windows protected your PC":

1. Click **More info**
2. Click **Run anyway**

### Linux

No extra steps needed. AppImages and `.deb` packages generally run without security prompts.

## Project Structure

```
stream-studio/
├── main.js                    # Electron entry (delegates to main/)
├── preload.js                 # contextBridge API
├── index.html
├── package.json
├── vite.config.js
├── main/                      # Main process (modular)
│   ├── index.js
│   ├── window.js
│   ├── store.js
│   ├── ipc/                   # IPC handlers
│   │   ├── index.js
│   │   └── handlers/
│   │       ├── basic.js
│   │       ├── conversion.js
│   │       └── videoInfo.js
│   ├── services/              # Conversion, metadata, history, etc.
│   │   ├── conversion.js
│   │   ├── ffmpeg.js
│   │   ├── metadata.js
│   │   ├── videoInfo.js
│   │   └── ...
│   └── utils/
├── src/
│   ├── App.jsx
│   ├── index.jsx
│   ├── components/
│   │   ├── ConversionForm.jsx
│   │   ├── conversion/        # VideoPreviewCard, ChapterSelector, etc.
│   │   ├── metadata/          # ThumbnailSection, ChapterMetadataForm, etc.
│   │   ├── MetadataEditor.jsx
│   │   ├── SegmentEditor.jsx
│   │   ├── YouTubeSearchPanel.jsx
│   │   └── ...
│   ├── constants/
│   ├── hooks/
│   ├── lib/
│   ├── utils/
│   └── styles/
├── assets/
│   ├── icon.png
│   └── demo.mp4
├── bin/                       # yt-dlp, ffmpeg (auto-downloaded)
├── scripts/
│   └── download-binaries.js
└── dist/                      # Built installers
```

## Usage

### Input Modes

1. **Search** — Enter a query, select site(s) (YouTube, SoundCloud, etc.), choose a result, then convert or add to queue. Audio preview available.
2. **URL** — Paste any video URL (with or without `https://`).
3. **Local file** — Click or drag a local media file to convert.

### Basic Conversion

1. Enter URL, search result, or select local file
2. Select mode: **Audio** or **Video**
3. Choose format and quality
4. (Optional) Set start/end time to clip
5. Click **Convert**
6. Click **Open Location** when done

### Playlist

- For playlist URLs, choose **Full playlist** or **Select videos**
- Optionally split by **chapters** into separate files or download full video

### Manual Segments

- Add time ranges (e.g. 0:00–1:30, 2:00–4:00) to split into separate files
- Optionally use a shared artist for filenames

### Metadata

- Click the edit icon to set title, artist, album, and crop thumbnail (ID3/MP4 tags)

### Batch Queue

1. Click the Queue icon (or **Ctrl+B / Cmd+B**)
2. Paste multiple URLs (one per line) or add from search
3. Drag to reorder
4. Click **Start** to process all

### URL Formats Accepted

- Full URL: `https://www.youtube.com/watch?v=VIDEO_ID`
- Without protocol: `youtube.com/watch?v=VIDEO_ID`
- Short URLs: `youtu.be/VIDEO_ID`
- Mobile URLs: `m.youtube.com/watch?v=VIDEO_ID`

### Keyboard Shortcuts

- **Enter** — Start conversion
- **Escape** — Cancel conversion
- **Ctrl+V / Cmd+V** — Paste URL from clipboard
- **Ctrl+K / Cmd+K** — Show keyboard shortcuts
- **Ctrl+H / Cmd+H** — Open history
- **Ctrl+B / Cmd+B** — Open batch queue
- **Ctrl+, / Cmd+,** — Open settings

### Settings

Access via the gear icon:
- Theme (dark / light / system)
- Default mode, formats, quality
- Default search site and limit
- History size, notifications

### History

Access via the clock icon:
- View past conversions
- Open file locations
- Copy original URLs
- Clear history

## Security

- Uses `contextBridge` for secure IPC communication
- No `nodeIntegration` in renderer process
- Input sanitization before passing to child processes
- Uses `spawn` with args array (no shell injection)
- All IPC handlers (`convert`, `convertLocalFile`, `getVideoInfo`, `getChapterInfo`, `searchMultiSite`, etc.) go through preload API

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

### Playlist / Chapter / Segment Fails
- Ensure at least one video or segment is selected
- For chapters, some videos may not have chapter data
- For segments, verify time ranges are valid (start < end)

### "Unsupported URL" Error
- The site may not be supported by yt-dlp
- Check the [supported sites list](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md)
- The site's structure may have changed — try updating yt-dlp

### Permission Errors
- Ensure you have write permissions to the output folder
- Try selecting a different output folder

### App Doesn't Start
- Delete `node_modules` and run `npm install` again
- Check the console for error messages

## Updating yt-dlp

```bash
npm run download-binaries
```

Or manually download from [yt-dlp releases](https://github.com/yt-dlp/yt-dlp/releases).

## Publishing & Legal

This project is open source and safe to use and redistribute. It does not include API keys, secrets, or copyrighted sample content. The app wraps [yt-dlp](https://github.com/yt-dlp/yt-dlp) and FFmpeg—tools that are widely published and have been upheld as non-DRM-circumventing by platform providers. Responsibility for complying with platform Terms of Service (e.g., YouTube, TikTok) and copyright law lies with the user, not the tool.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

### Third-Party Dependencies

- **[yt-dlp](https://github.com/yt-dlp/yt-dlp)** — Unlicense (public domain)
- **[FFmpeg](https://ffmpeg.org/)** — LGPL/GPL (via ffmpeg-static)

## Disclaimer

This software is provided for personal use only. Users are responsible for ensuring their use of this software complies with the Terms of Service of the websites they download from and applicable copyright laws. Downloading copyrighted content without permission may violate platform ToS and copyright law. The developers do not condone such use.
