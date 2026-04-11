import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  Typography,
  IconButton,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  List,
  Switch,
  FormControlLabel,
  Snackbar,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import { MetadataFormFields } from './MetadataFormFields';
import {
  ThumbnailSection,
  ChapterMetadataForm,
  SegmentMetadataForm,
  PlaylistVideoItem,
  CatalogLinkSection,
  pickAlbumSharedFields,
} from './metadata';
import {
  GENRES,
  DEFAULT_METADATA,
  DEFAULT_PLAYLIST_SHARED_METADATA,
  DEFAULT_CHAPTER_METADATA,
  DEFAULT_SEGMENT_METADATA,
  PLAYLIST_ITEMS_PER_PAGE,
} from '../constants';
import { validateMetadata } from '../utils';

function MetadataEditor({
  open,
  onClose,
  onSave,
  videoInfo,
  playlistInfo,
  chapterInfo,
  selectedVideos,
  segments,
  useSharedArtistForSegments,
  customMetadata,
  mode = 'single',
}) {
  const [playlistEditMode, setPlaylistEditMode] = useState('bulk');
  const [useSharedArtist, setUseSharedArtist] = useState(true);
  const [thumbnailUrl, setThumbnailUrl] = useState(videoInfo?.thumbnail || '');
  const [customThumbnail, setCustomThumbnail] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [playlistPage, setPlaylistPage] = useState(0);
  const [catalogTracklistNotice, setCatalogTracklistNotice] = useState(null);

  // Track previous mode and open state to detect changes
  const prevModeRef = useRef(mode);
  const prevOpenRef = useRef(open);
  const skipNextYoutubePlaylistInitRef = useRef(false);

  // Single video / Bulk playlist metadata
  const [metadata, setMetadata] = useState({ ...DEFAULT_METADATA });

  // Per-file metadata for playlist individual mode
  const [perFileMetadata, setPerFileMetadata] = useState([]);

  // Shared metadata for playlist individual mode
  const [playlistSharedMetadata, setPlaylistSharedMetadata] = useState({
    ...DEFAULT_PLAYLIST_SHARED_METADATA,
  });

  // Chapter metadata
  const [chapterMetadata, setChapterMetadata] = useState({ ...DEFAULT_CHAPTER_METADATA });

  // Segment metadata
  const [segmentMetadata, setSegmentMetadata] = useState({ ...DEFAULT_SEGMENT_METADATA });

  // Reset state when dialog closes or mode changes
  useEffect(() => {
    if (!open && prevOpenRef.current) {
      // Dialog just closed - reset all state
      setMetadata({ ...DEFAULT_METADATA });
      setPerFileMetadata([]);
      setPlaylistSharedMetadata({ ...DEFAULT_PLAYLIST_SHARED_METADATA });
      setChapterMetadata({ ...DEFAULT_CHAPTER_METADATA });
      setSegmentMetadata({ ...DEFAULT_SEGMENT_METADATA });
      setThumbnailUrl('');
      setCustomThumbnail(null);
      setPlaylistEditMode('bulk');
      setUseSharedArtist(true);
      setPlaylistPage(0);
      setValidationErrors({});
      setErrorMessage(null);
      setCatalogTracklistNotice(null);
      skipNextYoutubePlaylistInitRef.current = false;
    }

    // Reset state when mode changes
    if (prevModeRef.current !== mode && open) {
      setMetadata({ ...DEFAULT_METADATA });
      setPerFileMetadata([]);
      setPlaylistSharedMetadata({ ...DEFAULT_PLAYLIST_SHARED_METADATA });
      setChapterMetadata({ ...DEFAULT_CHAPTER_METADATA });
      setSegmentMetadata({ ...DEFAULT_SEGMENT_METADATA });
      setValidationErrors({});
      setCatalogTracklistNotice(null);
      skipNextYoutubePlaylistInitRef.current = false;
    }

    prevModeRef.current = mode;
    prevOpenRef.current = open;
  }, [open, mode]);

  // Consolidated initialization effect
  useEffect(() => {
    if (!open) return;

    const currentYear = new Date().getFullYear();

    // If customMetadata exists, restore from it
    if (customMetadata) {
      if (customMetadata.type === 'single' && customMetadata.metadata) {
        setMetadata(customMetadata.metadata);
        if (customMetadata.thumbnail) {
          setThumbnailUrl(customMetadata.thumbnail);
          setCustomThumbnail(customMetadata.thumbnail);
        }
      } else if (customMetadata.type === 'playlist') {
        if (customMetadata.mode === 'bulk' && customMetadata.bulkMetadata) {
          setMetadata(customMetadata.bulkMetadata);
          if (customMetadata.thumbnail) {
            setThumbnailUrl(customMetadata.thumbnail);
            setCustomThumbnail(customMetadata.thumbnail);
          }
        } else if (customMetadata.mode === 'individual' && customMetadata.perFileMetadata) {
          const firstFile = customMetadata.perFileMetadata[0];
          if (firstFile) {
            const artists = customMetadata.perFileMetadata
              .map((f) => f.artist || '')
              .filter(Boolean);
            const isSharedArtist = artists.length > 0 && new Set(artists).size === 1;

            const sharedMeta = { ...firstFile };
            delete sharedMeta.title;
            delete sharedMeta.trackNumber;
            if (!isSharedArtist) {
              delete sharedMeta.artist;
            }
            setPlaylistSharedMetadata(sharedMeta);
            setUseSharedArtist(isSharedArtist);

            const perFile = customMetadata.perFileMetadata.map((fileMeta) => ({
              title: fileMeta.title || '',
              artist: fileMeta.artist || '',
              trackNumber: fileMeta.trackNumber || '',
            }));
            setPerFileMetadata(perFile);
          }
          if (customMetadata.thumbnail) {
            setThumbnailUrl(customMetadata.thumbnail);
            setCustomThumbnail(customMetadata.thumbnail);
          }
        }
      } else if (customMetadata.type === 'chapter' && customMetadata.chapterMetadata) {
        setChapterMetadata(customMetadata.chapterMetadata);
        if (customMetadata.thumbnail) {
          setThumbnailUrl(customMetadata.thumbnail);
          setCustomThumbnail(customMetadata.thumbnail);
        }
      } else if (customMetadata.type === 'segment' && customMetadata.segmentMetadata) {
        setSegmentMetadata(customMetadata.segmentMetadata);
        if (customMetadata.thumbnail) {
          setThumbnailUrl(customMetadata.thumbnail);
          setCustomThumbnail(customMetadata.thumbnail);
        }
      }
      return;
    }

    // Helper to get first thumbnail URL from thumbnail (string or array)
    // This is needed because playlist first video thumbnail can be an array
    const getFirstThumbnailUrl = (thumbnail) => {
      if (!thumbnail) return '';
      if (Array.isArray(thumbnail)) return thumbnail[0] || '';
      return thumbnail;
    };

    // No customMetadata exists, initialize from videoInfo/playlistInfo/chapterInfo
    // Initialize single video metadata
    if (videoInfo && mode === 'single') {
      // Prefer artist field over uploader (artist is more accurate for music)
      const artist = videoInfo.artist || videoInfo.uploader || '';
      setMetadata({
        title: videoInfo.title || '',
        artist: artist,
        album: '', // Single videos typically don't have an album
        albumArtist: artist,
        genre: '',
        year: videoInfo.uploadDate ? videoInfo.uploadDate.substring(0, 4) : currentYear.toString(),
        trackNumber: '',
        totalTracks: '',
        composer: '',
        publisher: '',
        comment: '',
        description: videoInfo.description || '',
        language: '',
        copyright: '',
        bpm: '',
      });
      setThumbnailUrl(getFirstThumbnailUrl(videoInfo.thumbnail));
      setCustomThumbnail(null);
    }

    // Initialize playlist bulk metadata - works even if videoInfo is null
    // For albums/playlists, prioritize playlist metadata over individual video metadata
    if (mode === 'playlist' && playlistEditMode === 'bulk') {
      // Prefer artist field from first video over uploader/channel
      // For playlists, try to get artist from first video, fallback to playlist uploader
      const firstVideoArtist = playlistInfo?.videos?.[0]?.artist || null;
      const videoArtist = videoInfo?.artist || null;
      const playlistArtist = playlistInfo?.playlistUploader || null;
      const videoUploader = videoInfo?.uploader || null;

      // Priority: first video artist > video artist > playlist uploader > video uploader
      const artist = firstVideoArtist || videoArtist || playlistArtist || videoUploader || '';

      // Set metadata prioritizing playlist info (album metadata)
      // Title is left empty for bulk mode since each track will have its own title
      setMetadata({
        title: '', // Empty for bulk mode - each track gets its own title
        artist: artist, // Use actual artist name, not "Release - Topic"
        album: playlistInfo?.playlistTitle || '', // Album name (playlist title)
        albumArtist: artist, // Album artist (same as artist for consistency)
        genre: '',
        year: videoInfo?.uploadDate ? videoInfo.uploadDate.substring(0, 4) : currentYear.toString(),
        trackNumber: '',
        totalTracks: '',
        composer: '',
        publisher: '',
        comment: '',
        description: playlistInfo?.playlistTitle
          ? `Playlist: ${playlistInfo.playlistTitle}`
          : videoInfo?.description || '',
        language: '',
        copyright: '',
        bpm: '',
      });
      // Always try to set thumbnail from playlist first video, fallback to videoInfo
      const thumbnailToUse =
        getFirstThumbnailUrl(playlistInfo?.videos?.[0]?.thumbnail) ||
        getFirstThumbnailUrl(videoInfo?.thumbnail) ||
        '';
      setThumbnailUrl(thumbnailToUse);
      setCustomThumbnail(null);
    }

    // Initialize playlist individual mode
    if (
      playlistInfo &&
      playlistInfo.videos &&
      playlistEditMode === 'individual' &&
      mode === 'playlist'
    ) {
      // Get videos to display (filter by selectedVideos if provided)
      const videosToUse =
        selectedVideos && selectedVideos.length > 0
          ? playlistInfo.videos.filter((_, idx) => selectedVideos.includes(idx + 1))
          : playlistInfo.videos;

      // Prefer artist field over uploader (artist is more accurate for music)
      const sharedArtist =
        videoInfo?.artist || videoInfo?.uploader || playlistInfo?.playlistUploader || '';

      if (!skipNextYoutubePlaylistInitRef.current) {
        setPlaylistSharedMetadata({
          artist: sharedArtist,
          album: playlistInfo.playlistTitle || '',
          albumArtist: sharedArtist,
          genre: '',
          year: videoInfo?.uploadDate
            ? videoInfo.uploadDate.substring(0, 4)
            : currentYear.toString(),
          composer: '',
          publisher: '',
          comment: '',
          description: '',
          language: '',
          copyright: '',
          bpm: '',
        });
      } else {
        skipNextYoutubePlaylistInitRef.current = false;
      }

      setPerFileMetadata((prev) => {
        if (prev.length === videosToUse.length && prev.length > 0) {
          return prev;
        }
        return videosToUse.map((video, index) => ({
          title: video.title || '',
          artist: video.artist || sharedArtist,
          trackNumber: (index + 1).toString(),
        }));
      });
      setUseSharedArtist(true);

      // Set thumbnail to first video's thumbnail for individual mode
      const thumbnailToUse =
        getFirstThumbnailUrl(playlistInfo.videos[0]?.thumbnail) ||
        getFirstThumbnailUrl(videoInfo?.thumbnail) ||
        '';
      setThumbnailUrl(thumbnailToUse);
      setCustomThumbnail(null);
    }

    // Initialize chapter metadata
    if (chapterInfo && mode === 'chapter') {
      // Prefer artist field over uploader (artist is more accurate for music)
      const artist = videoInfo?.artist || videoInfo?.uploader || '';
      setChapterMetadata((prev) => ({
        ...prev,
        albumMetadata: {
          ...prev.albumMetadata,
          artist: artist,
          album: videoInfo?.title || '',
          albumArtist: artist,
          year: videoInfo?.uploadDate
            ? videoInfo.uploadDate.substring(0, 4)
            : currentYear.toString(),
        },
      }));
      // Set thumbnail for chapters
      if (videoInfo?.thumbnail) {
        setThumbnailUrl(getFirstThumbnailUrl(videoInfo.thumbnail));
        setCustomThumbnail(null);
      }
    }

    // Initialize segment metadata
    if (segments && segments.length > 0 && mode === 'segment') {
      // Prefer artist field over uploader (artist is more accurate for music)
      const artist = videoInfo?.artist || videoInfo?.uploader || '';
      setSegmentMetadata((prev) => ({
        ...prev,
        albumMetadata: {
          ...prev.albumMetadata,
          artist: artist,
          album: videoInfo?.title || '',
          albumArtist: artist,
          year: videoInfo?.uploadDate
            ? videoInfo.uploadDate.substring(0, 4)
            : currentYear.toString(),
        },
        perSegmentMetadata: segments.map((seg, index) => ({
          title: seg.title || '',
          artist: seg.artist || '',
          trackNumber: index + 1,
        })),
      }));
      // Set thumbnail for segments
      if (videoInfo?.thumbnail) {
        setThumbnailUrl(getFirstThumbnailUrl(videoInfo.thumbnail));
        setCustomThumbnail(null);
      }
    }
  }, [
    videoInfo,
    playlistInfo,
    chapterInfo,
    segments,
    open,
    mode,
    playlistEditMode,
    selectedVideos,
    customMetadata,
  ]);

  const handleMetadataChange = useCallback((field, value) => {
    setMetadata((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handlePerFileMetadataChange = useCallback((index, field, value) => {
    setPerFileMetadata((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const handlePlaylistSharedMetadataChange = useCallback((field, value) => {
    setPlaylistSharedMetadata((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handlePlaylistCatalogTracklistLoaded = useCallback(
    (tracks, catalogMetaFull = {}) => {
      if (!tracks?.length || mode !== 'playlist' || !playlistInfo?.videos) return;
      const videosToUse =
        selectedVideos && selectedVideos.length > 0
          ? playlistInfo.videos.filter((_, idx) => selectedVideos.includes(idx + 1))
          : playlistInfo.videos;
      const n = videosToUse.length;
      const m = tracks.length;
      const k = Math.min(n, m);
      const albumPatch = pickAlbumSharedFields(catalogMetaFull);

      skipNextYoutubePlaylistInitRef.current = true;

      setPlaylistSharedMetadata((prev) => ({ ...prev, ...albumPatch }));

      setPlaylistEditMode((prevMode) => {
        if (prevMode === 'bulk') {
          return 'individual';
        }
        return prevMode;
      });

      const sharedArtistLine =
        albumPatch.artist ||
        videoInfo?.artist ||
        videoInfo?.uploader ||
        playlistInfo?.playlistUploader ||
        '';

      const nextPerFile = videosToUse.map((video, i) => {
        const baseArtist = video.artist || sharedArtistLine;
        const row = {
          title: video.title || '',
          artist: baseArtist,
          trackNumber: String(i + 1),
        };
        if (i >= k) return row;
        const t = tracks[i];
        const title = (t.title || '').trim();
        if (t.trackNumber != null && String(t.trackNumber).trim() !== '') {
          row.trackNumber = String(t.trackNumber);
        }
        if (title) {
          row.title = title;
        }
        if (!useSharedArtist && (t.artist || '').trim()) {
          row.artist = (t.artist || '').trim();
        }
        return row;
      });

      setPerFileMetadata(nextPerFile);

      queueMicrotask(() => {
        if (m !== n) {
          setCatalogTracklistNotice(
            `Applied first ${k} tracks. Catalog has ${m} tracks; playlist has ${n}.`
          );
        } else {
          setCatalogTracklistNotice(null);
        }
      });
    },
    [mode, playlistInfo, selectedVideos, videoInfo, useSharedArtist]
  );

  const handleThumbnailChange = useCallback((newUrl) => {
    setThumbnailUrl(newUrl);
    setCustomThumbnail(newUrl);
    setErrorMessage(null);
  }, []);

  // Memoize totalTracks calculation
  const totalTracks = useMemo(() => {
    if (mode === 'playlist') {
      if (selectedVideos && selectedVideos.length > 0) {
        return selectedVideos.length;
      }
      if (playlistEditMode === 'individual') {
        const videosToUse =
          selectedVideos && selectedVideos.length > 0
            ? playlistInfo?.videos?.filter((_, idx) => selectedVideos.includes(idx + 1)) || []
            : playlistInfo?.videos || [];
        return videosToUse.length || playlistInfo?.playlistVideoCount || perFileMetadata.length;
      }
      return playlistInfo?.playlistVideoCount || perFileMetadata.length;
    }
    return 0;
  }, [mode, selectedVideos, playlistInfo, playlistEditMode, perFileMetadata.length]);

  const handleSave = useCallback(() => {
    let errors = {};
    if (mode === 'single' || (mode === 'playlist' && playlistEditMode === 'bulk')) {
      errors = validateMetadata(metadata);
    } else if (mode === 'playlist' && playlistEditMode === 'individual') {
      errors = validateMetadata(playlistSharedMetadata);
      perFileMetadata.forEach((fileMeta, index) => {
        const fileErrors = validateMetadata({
          ...playlistSharedMetadata,
          ...fileMeta,
          totalTracks: totalTracks.toString(),
        });
        if (Object.keys(fileErrors).length > 0) {
          errors[`file_${index}`] = fileErrors;
        }
      });
    } else if (mode === 'chapter') {
      errors = validateMetadata(chapterMetadata.albumMetadata);
    } else if (mode === 'segment') {
      errors = validateMetadata(segmentMetadata.albumMetadata);
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setErrorMessage('Please fix validation errors before saving.');
      return;
    }

    setValidationErrors({});
    setErrorMessage(null);

    let metadataToSave = null;

    if (mode === 'single') {
      metadataToSave = {
        type: 'single',
        metadata: { ...metadata },
        thumbnail: customThumbnail || thumbnailUrl,
      };
    } else if (mode === 'playlist') {
      if (playlistEditMode === 'bulk') {
        // eslint-disable-next-line no-unused-vars -- destructure to exclude totalTracks from bulkMeta
        const { totalTracks, ...bulkMeta } = metadata;
        metadataToSave = {
          type: 'playlist',
          mode: 'bulk',
          bulkMetadata: { ...bulkMeta },
          thumbnail: customThumbnail || thumbnailUrl,
          totalTracks: totalTracks,
        };
      } else {
        const mergedPerFile = perFileMetadata.map((fileMeta, index) => ({
          ...playlistSharedMetadata,
          title: fileMeta.title || '',
          artist: useSharedArtist ? playlistSharedMetadata.artist : fileMeta.artist || '',
          trackNumber: fileMeta.trackNumber || (index + 1).toString(),
          totalTracks: totalTracks.toString(),
        }));

        metadataToSave = {
          type: 'playlist',
          mode: 'individual',
          perFileMetadata: mergedPerFile,
          thumbnail: customThumbnail || thumbnailUrl,
        };
      }
    } else if (mode === 'chapter') {
      metadataToSave = {
        type: 'chapter',
        chapterMetadata: { ...chapterMetadata },
        thumbnail: customThumbnail || thumbnailUrl,
      };
    } else if (mode === 'segment') {
      const mergedPerSegment = segmentMetadata.perSegmentMetadata.map((seg, index) => ({
        ...segmentMetadata.albumMetadata,
        title: seg.title || '',
        artist: useSharedArtistForSegments
          ? segmentMetadata.albumMetadata.artist
          : seg.artist || '',
        trackNumber: (index + 1).toString(),
        totalTracks: segmentMetadata.perSegmentMetadata.length.toString(),
      }));

      metadataToSave = {
        type: 'segment',
        segmentMetadata: {
          albumMetadata: { ...segmentMetadata.albumMetadata },
          perSegmentMetadata: mergedPerSegment,
        },
        thumbnail: customThumbnail || thumbnailUrl,
      };
    }

    if (metadataToSave) {
      onSave(metadataToSave);
      onClose();
    }
  }, [
    mode,
    metadata,
    playlistEditMode,
    perFileMetadata,
    playlistSharedMetadata,
    useSharedArtist,
    chapterMetadata,
    segmentMetadata,
    useSharedArtistForSegments,
    customThumbnail,
    thumbnailUrl,
    totalTracks,
    onSave,
    onClose,
  ]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, handleSave, onClose]);

  // Memoize videos to display for playlist individual mode
  const videosToDisplay = useMemo(() => {
    if (!playlistInfo || !playlistInfo.videos) return [];
    if (selectedVideos && selectedVideos.length > 0) {
      return playlistInfo.videos.filter((_, idx) => selectedVideos.includes(idx + 1));
    }
    return playlistInfo.videos;
  }, [playlistInfo, selectedVideos]);

  // Paginate videos for performance
  const paginatedVideos = useMemo(() => {
    const start = playlistPage * PLAYLIST_ITEMS_PER_PAGE;
    const end = start + PLAYLIST_ITEMS_PER_PAGE;
    return videosToDisplay.slice(start, end);
  }, [videosToDisplay, playlistPage]);

  const totalPages = Math.ceil(videosToDisplay.length / PLAYLIST_ITEMS_PER_PAGE);

  const renderSingleVideoForm = () => (
    <Box>
      <CatalogLinkSection
        variant="full"
        onMetadataLoaded={(m) => setMetadata((prev) => ({ ...prev, ...m }))}
        onCoverLoaded={(dataUrl) => {
          if (dataUrl) {
            setThumbnailUrl(dataUrl);
            setCustomThumbnail(dataUrl);
          }
        }}
        onTracklistLoaded={mode === 'playlist' ? handlePlaylistCatalogTracklistLoaded : undefined}
        onError={(msg) => msg && setErrorMessage(msg)}
      />
      <MetadataFormFields
        metadata={metadata}
        onChange={handleMetadataChange}
        errors={validationErrors}
        showTrackNumbers={mode !== 'playlist'}
        totalTracksDisplay={
          mode === 'playlist'
            ? selectedVideos && selectedVideos.length > 0
              ? selectedVideos.length
              : playlistInfo?.playlistVideoCount || 0
            : null
        }
        hideTitle={mode === 'playlist' && playlistEditMode === 'bulk'}
      />
      <ThumbnailSection
        thumbnailUrl={thumbnailUrl}
        onThumbnailChange={handleThumbnailChange}
        onError={setErrorMessage}
      />
    </Box>
  );

  const renderPlaylistBulkForm = () => (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        This metadata will be applied to all videos in the playlist. Track numbers will
        auto-increment.
      </Alert>
      {renderSingleVideoForm()}
    </Box>
  );

  const renderPlaylistIndividualForm = () => {
    if (!playlistInfo || !playlistInfo.videos) return null;

    return (
      <Box>
        <Alert severity="info" sx={{ mb: 2 }}>
          Shared metadata (genre, album, album artist, etc.) applies to all videos. Title and track
          number can be customized per video.
        </Alert>
        {videosToDisplay.length > 20 && (
          <Alert
            severity="warning"
            sx={{ mb: 2 }}
            action={
              <Button size="small" onClick={() => setPlaylistEditMode('bulk')}>
                Switch to Bulk
              </Button>
            }
          >
            Large playlist detected ({videosToDisplay.length} videos). Consider using bulk mode for
            better performance.
          </Alert>
        )}

        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
          Shared Album Metadata
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <CatalogLinkSection
          variant="albumShared"
          onMetadataLoaded={(m) => setPlaylistSharedMetadata((prev) => ({ ...prev, ...m }))}
          onCoverLoaded={(dataUrl) => {
            if (dataUrl) {
              setThumbnailUrl(dataUrl);
              setCustomThumbnail(dataUrl);
            }
          }}
          onTracklistLoaded={handlePlaylistCatalogTracklistLoaded}
          onError={(msg) => msg && setErrorMessage(msg)}
        />
        {catalogTracklistNotice && (
          <Alert severity="info" sx={{ mb: 2 }} onClose={() => setCatalogTracklistNotice(null)}>
            {catalogTracklistNotice}
          </Alert>
        )}

        <Box sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
          <FormControlLabel
            control={
              <Switch
                checked={useSharedArtist}
                onChange={(e) => setUseSharedArtist(e.target.checked)}
              />
            }
            label={
              <Box>
                <Typography variant="body2" fontWeight="medium">
                  Use same artist for all songs
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {useSharedArtist
                    ? 'All songs will use the shared artist below'
                    : 'Each song can have its own artist (for compilations)'}
                </Typography>
              </Box>
            }
          />
        </Box>

        {useSharedArtist && (
          <TextField
            fullWidth
            label="Artist"
            value={playlistSharedMetadata.artist}
            onChange={(e) => handlePlaylistSharedMetadataChange('artist', e.target.value)}
            margin="normal"
            helperText="This artist will be applied to all songs in the playlist"
          />
        )}

        <TextField
          fullWidth
          label="Album"
          value={playlistSharedMetadata.album}
          onChange={(e) => handlePlaylistSharedMetadataChange('album', e.target.value)}
          margin="normal"
        />
        <TextField
          fullWidth
          label="Album Artist"
          value={playlistSharedMetadata.albumArtist}
          onChange={(e) => handlePlaylistSharedMetadataChange('albumArtist', e.target.value)}
          margin="normal"
        />
        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Genre</InputLabel>
            <Select
              value={playlistSharedMetadata.genre}
              label="Genre"
              onChange={(e) => handlePlaylistSharedMetadataChange('genre', e.target.value)}
            >
              <MenuItem value="">None</MenuItem>
              {GENRES.map((genre) => (
                <MenuItem key={genre} value={genre}>
                  {genre}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Year"
            value={playlistSharedMetadata.year}
            onChange={(e) => handlePlaylistSharedMetadataChange('year', e.target.value)}
            type="number"
            error={!!validationErrors.year}
            helperText={validationErrors.year}
          />
        </Box>
        <TextField
          fullWidth
          label="Composer"
          value={playlistSharedMetadata.composer}
          onChange={(e) => handlePlaylistSharedMetadataChange('composer', e.target.value)}
          margin="normal"
        />
        <TextField
          fullWidth
          label="Publisher"
          value={playlistSharedMetadata.publisher}
          onChange={(e) => handlePlaylistSharedMetadataChange('publisher', e.target.value)}
          margin="normal"
        />
        <TextField
          fullWidth
          label="Comment"
          value={playlistSharedMetadata.comment}
          onChange={(e) => handlePlaylistSharedMetadataChange('comment', e.target.value)}
          margin="normal"
          multiline
          rows={2}
        />
        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <TextField
            fullWidth
            label="Language"
            value={playlistSharedMetadata.language}
            onChange={(e) => handlePlaylistSharedMetadataChange('language', e.target.value)}
          />
          <TextField
            fullWidth
            label="BPM"
            value={playlistSharedMetadata.bpm}
            onChange={(e) => handlePlaylistSharedMetadataChange('bpm', e.target.value)}
            type="number"
            error={!!validationErrors.bpm}
            helperText={validationErrors.bpm}
          />
        </Box>
        <TextField
          fullWidth
          label="Copyright"
          value={playlistSharedMetadata.copyright}
          onChange={(e) => handlePlaylistSharedMetadataChange('copyright', e.target.value)}
          margin="normal"
        />
        <Box sx={{ mt: 2, mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Total Tracks: {totalTracks} (automatic)
          </Typography>
        </Box>

        <ThumbnailSection
          thumbnailUrl={thumbnailUrl}
          onThumbnailChange={handleThumbnailChange}
          onError={setErrorMessage}
        />

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>
          Individual Video Titles{' '}
          {selectedVideos && selectedVideos.length > 0 && `(${videosToDisplay.length} selected)`}
        </Typography>
        {videosToDisplay.length > PLAYLIST_ITEMS_PER_PAGE && (
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
          >
            <Typography variant="body2" color="text.secondary">
              Showing {playlistPage * PLAYLIST_ITEMS_PER_PAGE + 1}-
              {Math.min((playlistPage + 1) * PLAYLIST_ITEMS_PER_PAGE, videosToDisplay.length)} of{' '}
              {videosToDisplay.length}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                onClick={() => setPlaylistPage((p) => Math.max(0, p - 1))}
                disabled={playlistPage === 0}
              >
                Previous
              </Button>
              <Button
                size="small"
                onClick={() => setPlaylistPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={playlistPage >= totalPages - 1}
              >
                Next
              </Button>
            </Box>
          </Box>
        )}
        <List>
          {paginatedVideos.map((video, pageIndex) => {
            const displayIndex = playlistPage * PLAYLIST_ITEMS_PER_PAGE + pageIndex;
            const fileMeta = perFileMetadata[displayIndex] || {};
            return (
              <PlaylistVideoItem
                key={video.index || displayIndex}
                video={video}
                index={displayIndex}
                fileMeta={fileMeta}
                onMetadataChange={handlePerFileMetadataChange}
                totalTracks={totalTracks}
                useSharedArtist={useSharedArtist}
              />
            );
          })}
        </List>
        {videosToDisplay.length > PLAYLIST_ITEMS_PER_PAGE && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Page {playlistPage + 1} of {totalPages}
            </Typography>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EditIcon />
              <Typography variant="h6">Edit Metadata</Typography>
            </Box>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {mode === 'playlist' && (
            <Box sx={{ mb: 2 }}>
              <ToggleButtonGroup
                value={playlistEditMode}
                exclusive
                onChange={(e, newMode) => {
                  if (newMode !== null) {
                    setPlaylistEditMode(newMode);
                  }
                }}
                fullWidth
              >
                <ToggleButton value="bulk">Bulk (Apply to All)</ToggleButton>
                <ToggleButton value="individual">Individual</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          )}
          {mode === 'single' && renderSingleVideoForm()}
          {mode === 'playlist' && playlistEditMode === 'bulk' && renderPlaylistBulkForm()}
          {mode === 'playlist' &&
            playlistEditMode === 'individual' &&
            renderPlaylistIndividualForm()}
          {mode === 'chapter' && (
            <ChapterMetadataForm
              chapterMetadata={chapterMetadata}
              onChapterMetadataChange={setChapterMetadata}
              thumbnailUrl={thumbnailUrl}
              onThumbnailChange={handleThumbnailChange}
              onError={setErrorMessage}
            />
          )}
          {mode === 'segment' && (
            <SegmentMetadataForm
              segmentMetadata={segmentMetadata}
              onSegmentMetadataChange={setSegmentMetadata}
              useSharedArtistForSegments={useSharedArtistForSegments}
              thumbnailUrl={thumbnailUrl}
              onThumbnailChange={handleThumbnailChange}
              onError={setErrorMessage}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            Apply
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={!!errorMessage}
        autoHideDuration={6000}
        onClose={() => setErrorMessage(null)}
        message={errorMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  );
}

export default MetadataEditor;
