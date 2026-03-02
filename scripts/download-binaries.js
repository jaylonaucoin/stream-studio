const fs = require('fs');
const path = require('path');
const https = require('https');

const binDir = path.join(__dirname, '..', 'bin');
const platform = process.platform;
const arch = process.arch;

// Ensure bin directory exists
if (!fs.existsSync(binDir)) {
  fs.mkdirSync(binDir, { recursive: true });
}

// Helper function to make HTTP request
function httpsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, options, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return httpsRequest(response.headers.location, options).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        return reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
      }
      resolve(response);
    }).on('error', reject);
  });
}

// Helper function to download file
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    httpsRequest(url).then((response) => {
      const file = fs.createWriteStream(dest);
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
      file.on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    }).catch(reject);
  });
}

async function downloadYtDlp() {
  let url, filename;
  
  if (platform === 'win32') {
    filename = 'yt-dlp.exe';
    url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
  } else if (platform === 'darwin') {
    filename = 'yt-dlp';
    url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos';
  } else {
    filename = 'yt-dlp';
    url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';
  }
  
  const destPath = path.join(binDir, filename);
  
  // Skip if already exists
  if (fs.existsSync(destPath)) {
    // Ensure executable permission on Unix
    if (platform !== 'win32') {
      fs.chmodSync(destPath, 0o755);
    }
    return true;
  }
  
  
  try {
    await downloadFile(url, destPath);
    
    // Make executable on Unix systems
    if (platform !== 'win32') {
      fs.chmodSync(destPath, 0o755);
    }
    
    return true;
  } catch (error) {
    console.error(`✗ Failed to download ${filename}:`, error.message);
    return false;
  }
}

async function downloadFfmpeg() {
  const destName = platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
  const destPath = path.join(binDir, destName);

  if (fs.existsSync(destPath)) {
    if (platform !== 'win32') fs.chmodSync(destPath, 0o755);
    return true;
  }

  try {
    const srcPath = require('ffmpeg-static');
    if (!srcPath || !fs.existsSync(srcPath)) {
      console.warn('ffmpeg-static binary not found; install with npm install');
      return true; // non-fatal, user can use system ffmpeg
    }
    fs.copyFileSync(srcPath, destPath);
    if (platform !== 'win32') fs.chmodSync(destPath, 0o755);
    return true;
  } catch (err) {
    console.warn('Could not copy ffmpeg from ffmpeg-static:', err.message);
    return true; // non-fatal
  }
}

async function main() {
  
  const results = await Promise.all([
    downloadYtDlp(),
    downloadFfmpeg()
  ]);
  
  const success = results.every(r => r);
  
  if (success) {
  } else {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

