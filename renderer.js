// DOM Elements
const urlInput = document.getElementById('urlInput');
const pasteBtn = document.getElementById('pasteBtn');
const convertBtn = document.getElementById('convertBtn');
const cancelBtn = document.getElementById('cancelBtn');
const chooseFolderBtn = document.getElementById('chooseFolderBtn');
const outputFolderPath = document.getElementById('outputFolderPath');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const statusLog = document.getElementById('statusLog');
const lastConverted = document.getElementById('lastConverted');
const lastConvertedLink = document.getElementById('lastConvertedLink');
const errorModal = document.getElementById('errorModal');
const errorTitle = document.getElementById('errorTitle');
const errorMessage = document.getElementById('errorMessage');
const errorCloseBtn = document.getElementById('errorCloseBtn');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Test IPC connection
  if (window.api && window.api.ping) {
    try {
      const result = await window.api.ping();
      console.log('IPC connection established:', result);
    } catch (err) {
      console.error('IPC connection failed:', err);
      showError('Connection Error', 'Failed to establish connection with the app. Please restart the application.');
    }
  }

  // Get app version
  if (window.api && window.api.getAppVersion) {
    try {
      const version = await window.api.getAppVersion();
      console.log('App version:', version);
    } catch (err) {
      console.error('Failed to get app version:', err);
    }
  }

  // Load saved output folder
  loadOutputFolder();

  // Check FFmpeg on startup
  checkFfmpegOnStartup();

  setupEventListeners();
});

async function checkFfmpegOnStartup() {
  if (window.api && window.api.checkFfmpeg) {
    try {
      const result = await window.api.checkFfmpeg();
      if (!result.available) {
        // Show a warning but don't block the app
        console.warn('FFmpeg is not available. Conversion may fail.');
        // Optionally show a notification to the user
        // showError('FFmpeg Not Found', 'FFmpeg is not installed. Please install it before converting.');
      }
    } catch (err) {
      console.error('Failed to check FFmpeg:', err);
    }
  }
}

async function loadOutputFolder() {
  if (window.api && window.api.getOutputFolder) {
    try {
      const folder = await window.api.getOutputFolder();
      outputFolderPath.textContent = folder;
    } catch (err) {
      console.error('Failed to load output folder:', err);
      outputFolderPath.textContent = 'Downloads';
    }
  }
}

function setupEventListeners() {
  // Paste button
  pasteBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      urlInput.value = text;
      validateUrl();
    } catch (err) {
      console.error('Failed to read clipboard:', err);
    }
  });

  // URL input validation
  urlInput.addEventListener('input', validateUrl);
  urlInput.addEventListener('paste', () => {
    setTimeout(validateUrl, 10);
  });
  
  // Drag and drop handling
  setupDragAndDrop();

  // Convert button
  convertBtn.addEventListener('click', handleConvert);
  
  // Cancel button
  cancelBtn.addEventListener('click', handleCancel);
  
  // Choose folder button
  chooseFolderBtn.addEventListener('click', handleChooseFolder);
  
  // Setup progress listener
  if (window.api && window.api.onProgress) {
    window.api.onProgress(handleProgress);
  }
  
  // Error modal close
  const modalClose = document.querySelector('.modal-close');
  modalClose.addEventListener('click', () => {
    errorModal.style.display = 'none';
  });
  errorCloseBtn.addEventListener('click', () => {
    errorModal.style.display = 'none';
  });
}

let isConverting = false;

async function handleChooseFolder() {
  if (!window.api || !window.api.chooseOutput) {
    return;
  }
  
  try {
    const result = await window.api.chooseOutput();
    if (result.success && result.folder) {
      outputFolderPath.textContent = result.folder;
    }
  } catch (error) {
    showError('Folder Selection Error', error.message || 'Failed to select output folder');
  }
}

async function handleConvert() {
  if (!validateUrl() || isConverting) {
    return;
  }
  
  const url = urlInput.value.trim();
  
  // Get output folder from saved preference
  let outputFolder = null;
  if (window.api && window.api.getOutputFolder) {
    try {
      outputFolder = await window.api.getOutputFolder();
    } catch (err) {
      console.error('Failed to get output folder:', err);
    }
  }
  
  // Reset UI
  isConverting = true;
  convertBtn.disabled = true;
  cancelBtn.disabled = false;
  urlInput.disabled = true;
  progressBar.style.display = 'block';
  progressFill.style.width = '0%';
  progressText.textContent = 'Starting conversion...';
  statusLog.textContent = '';
  lastConverted.style.display = 'none';
  
  try {
    const result = await window.api.convert(url, { outputFolder });
    
    if (result.success) {
      progressFill.style.width = '100%';
      progressText.textContent = 'Conversion complete!';
      statusLog.textContent += '\n✓ Conversion completed successfully';
      
      // Show last converted file link
      if (result.filePath) {
        lastConverted.style.display = 'block';
        lastConvertedLink.textContent = `Open: ${result.fileName}`;
        lastConvertedLink.onclick = async (e) => {
          e.preventDefault();
          if (window.api && window.api.openFileLocation) {
            try {
              await window.api.openFileLocation(result.filePath);
            } catch (err) {
              console.error('Failed to open file location:', err);
              showError('File Location Error', 'Failed to open file location. File saved at: ' + result.filePath);
            }
          }
        };
      }
    }
  } catch (error) {
    showError('Conversion Failed', error.message || 'An error occurred during conversion');
    progressText.textContent = 'Conversion failed';
    statusLog.textContent += `\n✗ Error: ${error.message}`;
  } finally {
    isConverting = false;
    convertBtn.disabled = !validateUrl();
    cancelBtn.disabled = true;
    urlInput.disabled = false;
  }
}

async function handleCancel() {
  if (!isConverting) {
    return;
  }
  
  try {
    await window.api.cancel();
    progressText.textContent = 'Conversion cancelled';
    statusLog.textContent += '\n⚠ Conversion cancelled by user';
  } catch (error) {
    console.error('Failed to cancel:', error);
  } finally {
    isConverting = false;
    convertBtn.disabled = !validateUrl();
    cancelBtn.disabled = true;
    urlInput.disabled = false;
  }
}

function handleProgress(data) {
  if (!data) return;
  
  switch (data.type) {
    case 'progress':
      if (data.percent !== undefined) {
        progressFill.style.width = `${data.percent}%`;
        progressText.textContent = `Converting... ${data.percent.toFixed(1)}%`;
      }
      if (data.message) {
        statusLog.textContent += `\n${data.message}`;
        statusLog.scrollTop = statusLog.scrollHeight;
      }
      break;
      
    case 'status':
    case 'info':
      if (data.message) {
        statusLog.textContent += `\n${data.message}`;
        statusLog.scrollTop = statusLog.scrollHeight;
      }
      break;
      
    case 'cancelled':
      progressText.textContent = 'Cancelled';
      if (data.message) {
        statusLog.textContent += `\n${data.message}`;
      }
      isConverting = false;
      convertBtn.disabled = !validateUrl();
      cancelBtn.disabled = true;
      urlInput.disabled = false;
      break;
  }
}

function validateUrl() {
  const url = urlInput.value.trim();
  
  // Enhanced YouTube URL validation
  const youtubePatterns = [
    /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
    /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]+/,
    /^https?:\/\/youtu\.be\/[\w-]+/,
    /^https?:\/\/(www\.)?youtube\.com\/v\/[\w-]+/
  ];
  
  const isValid = url.length > 0 && youtubePatterns.some(pattern => pattern.test(url));
  
  convertBtn.disabled = !isValid;
  urlInput.classList.toggle('invalid', !isValid && url.length > 0);
  
  // Show validation hint
  if (!isValid && url.length > 0) {
    urlInput.title = 'Please enter a valid YouTube URL (e.g., https://www.youtube.com/watch?v=...)';
  } else {
    urlInput.title = '';
  }
  
  return isValid;
}

function setupDragAndDrop() {
  const container = document.querySelector('.container');
  
  // Prevent default drag behaviors
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    container.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
  });
  
  // Highlight drop area
  ['dragenter', 'dragover'].forEach(eventName => {
    container.addEventListener(eventName, highlight, false);
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
    container.addEventListener(eventName, unhighlight, false);
  });
  
  // Handle dropped files/text
  container.addEventListener('drop', handleDrop, false);
  
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  function highlight(e) {
    container.classList.add('drag-over');
  }
  
  function unhighlight(e) {
    container.classList.remove('drag-over');
  }
  
  function handleDrop(e) {
    const dt = e.dataTransfer;
    const text = dt.getData('text/plain');
    
    if (text) {
      // If text/URL was dropped
      urlInput.value = text.trim();
      validateUrl();
    } else if (dt.files && dt.files.length > 0) {
      // If files were dropped, we could handle this in the future
      // For now, just show an error
      showError('Invalid Drop', 'Please drop a YouTube URL text, not a file.');
    }
    
    unhighlight(e);
  }
}

function showError(title, message) {
  errorTitle.textContent = title;
  errorMessage.textContent = message;
  errorModal.style.display = 'block';
}

