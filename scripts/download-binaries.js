const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

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

// Helper function to get JSON from API
function getJson(url) {
  return new Promise((resolve, reject) => {
    httpsRequest(url, {
      headers: {
        'User-Agent': 'youtube-to-mp3-download-script',
        'Accept': 'application/vnd.github.v3+json'
      }
    }).then((response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Invalid JSON response'));
        }
      });
    }).catch(reject);
  });
}

// Helper function to extract ZIP file (Windows only)
function extractZip(zipPath, extractTo) {
  try {
    // Use PowerShell to extract ZIP on Windows
    if (platform === 'win32') {
      execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractTo}' -Force"`, {
        stdio: 'inherit'
      });
    } else {
      // On Unix, try unzip command
      execSync(`unzip -o '${zipPath}' -d '${extractTo}'`, { stdio: 'inherit' });
    }
    return true;
  } catch (error) {
    console.error('Failed to extract ZIP:', error.message);
    return false;
  }
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
    console.log(`✓ ${filename} already exists, skipping download`);
    // Ensure executable permission on Unix
    if (platform !== 'win32') {
      fs.chmodSync(destPath, 0o755);
    }
    return true;
  }
  
  console.log(`Downloading ${filename}...`);
  
  try {
    await downloadFile(url, destPath);
    
    // Make executable on Unix systems
    if (platform !== 'win32') {
      fs.chmodSync(destPath, 0o755);
    }
    
    console.log(`✓ Downloaded ${filename}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to download ${filename}:`, error.message);
    return false;
  }
}

async function downloadFfmpeg() {
  // Only download FFmpeg for Windows
  if (platform !== 'win32') {
    console.log('Skipping FFmpeg download (not Windows). Please install FFmpeg system-wide.');
    return true;
  }
  
  const ffmpegPath = path.join(binDir, 'ffmpeg.exe');
  
  // Skip if already exists
  if (fs.existsSync(ffmpegPath)) {
    console.log('✓ ffmpeg.exe already exists, skipping download');
    return true;
  }
  
  console.log('Downloading FFmpeg...');
  
  try {
    // Get latest release from GitHub API
    const releasesUrl = 'https://api.github.com/repos/BtbN/FFmpeg-Builds/releases/latest';
    const release = await getJson(releasesUrl);
    
    // Find the Windows GPL static build (self-contained, no DLLs needed)
    const asset = release.assets.find(a => 
      a.name.includes('win64') && 
      a.name.includes('gpl') && 
      !a.name.includes('shared') &&
      a.name.endsWith('.zip')
    );
    
    if (!asset) {
      throw new Error('Could not find FFmpeg Windows build in latest release');
    }
    
    const zipPath = path.join(binDir, asset.name);
    await downloadFile(asset.browser_download_url, zipPath);
    console.log('✓ Downloaded FFmpeg ZIP');
    
    // Extract ZIP
    const extractDir = path.join(binDir, 'ffmpeg-temp');
    if (fs.existsSync(extractDir)) {
      fs.rmSync(extractDir, { recursive: true, force: true });
    }
    fs.mkdirSync(extractDir, { recursive: true });
    
    if (extractZip(zipPath, extractDir)) {
      // Find ffmpeg.exe recursively in extracted folder
      function findFile(dir, filename) {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        for (const file of files) {
          const fullPath = path.join(dir, file.name);
          if (file.isDirectory()) {
            const found = findFile(fullPath, filename);
            if (found) return found;
          } else if (file.name === filename) {
            return fullPath;
          }
        }
        return null;
      }
      
      const ffmpegPath = findFile(extractDir, 'ffmpeg.exe');
      
      if (ffmpegPath) {
        fs.copyFileSync(ffmpegPath, path.join(binDir, 'ffmpeg.exe'));
        console.log('✓ Extracted and installed ffmpeg.exe');
        // Clean up
        fs.rmSync(extractDir, { recursive: true, force: true });
        fs.unlinkSync(zipPath);
        return true;
      } else {
        console.error('✗ Could not find ffmpeg.exe in extracted archive');
        return false;
      }
    } else {
      console.error('✗ Failed to extract FFmpeg ZIP');
      return false;
    }
  } catch (error) {
    console.error('✗ Failed to download FFmpeg:', error.message);
    console.error('  Please manually download FFmpeg from:');
    console.error('  https://github.com/BtbN/FFmpeg-Builds/releases/latest');
    return false;
  }
}

async function main() {
  console.log('Setting up binary dependencies...');
  console.log(`Platform: ${platform} (${arch})\n`);
  
  const results = await Promise.all([
    downloadYtDlp(),
    downloadFfmpeg()
  ]);
  
  const success = results.every(r => r);
  
  if (success) {
    console.log('\n✓ All binaries downloaded successfully!');
  } else {
    console.log('\n⚠ Some binaries failed to download. Please check the errors above.');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

