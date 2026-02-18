/**
 * Audio and video format constants
 */

export const AUDIO_FORMATS = [
  { value: 'best', label: 'Best Quality' },
  { value: 'mp3', label: 'MP3' },
  { value: 'm4a', label: 'M4A' },
  { value: 'flac', label: 'FLAC' },
  { value: 'wav', label: 'WAV' },
  { value: 'aac', label: 'AAC' },
  { value: 'opus', label: 'Opus' },
  { value: 'vorbis', label: 'Vorbis' },
  { value: 'alac', label: 'ALAC' },
];

export const VIDEO_FORMATS = [
  { value: 'mp4', label: 'MP4' },
  { value: 'mkv', label: 'MKV' },
  { value: 'webm', label: 'WebM' },
  { value: 'mov', label: 'MOV' },
  { value: 'avi', label: 'AVI' },
  { value: 'flv', label: 'FLV' },
  { value: 'gif', label: 'GIF' },
];

export const QUALITY_OPTIONS = [
  { value: 'best', label: 'Best', description: 'Highest available quality' },
  { value: 'high', label: 'High', description: '1080p / 192kbps' },
  { value: 'medium', label: 'Medium', description: '720p / 128kbps' },
  { value: 'low', label: 'Low', description: '480p / 96kbps' },
];

// Simple arrays for settings dialogs
export const AUDIO_FORMAT_VALUES = ['mp3', 'm4a', 'flac', 'wav', 'aac', 'opus', 'vorbis', 'alac'];
export const VIDEO_FORMAT_VALUES = ['mp4', 'mkv', 'webm', 'mov', 'avi'];
