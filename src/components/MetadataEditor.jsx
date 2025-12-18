import { useState, useEffect, useCallback } from 'react';
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
  Tabs,
  Tab,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  Collapse,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Switch,
  FormControlLabel,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import ImageIcon from '@mui/icons-material/Image';
import CropIcon from '@mui/icons-material/Crop';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ThumbnailCropper from './ThumbnailCropper';

const GENRES = [
  'African', 'African Dancehall', 'African Reggae', 'Afrikaans', 'Afro House', 'Afro Soul', 
  'Afro-Beat', 'Afro-folk', 'Afro-fusion', 'Afro-Pop', 'Afrobeats', 'Alte', 'Amapiano', 
  'Benga', 'Bongo-Flava', 'Chimurenga', 'Coupé-Décalé', 'Fuji', 'Genge', 'Gqom', 'Highlife', 
  'Kizomba', 'Kuduro', 'Kwaito', 'Kwassa', 'Mapouka', 'Maskandi', 'Mbalax', 'Ndombolo', 
  'Shangaan Electro', 'Soukous', 'Taarab', 'Zouglou', 'Alternative', 'Chinese Alt', 
  'College Rock', 'EMO', 'Goth Rock', 'Grunge', 'Indie Egyptian', 'Indie Levant', 
  'Indie Maghreb', 'Indie Pop', 'Indie Rock', 'Korean Indie', 'New Wave', 'Pop Punk', 
  'Punk', 'Turkish Alternative', 'Anime', 'Arabic', 'Arabic Pop', 'Islamic', 'Khaleeji', 
  'Khaleeji Jalsat', 'Khaleeji Shailat', 'Levant', 'Dabke', 'Maghreb Rai', 'North African',
  'Blues', 'Acoustic Blues', 'Chicago Blues', 'Classic Blues', 'Contemporary Blues', 
  'Country Blues', 'Delta Blues', 'Electric Blues', 'Brazilian', 'Axé', 'Baile Funk', 
  'Bossa Nova', 'Choro', 'Forró', 'Frevo', 'MPB', 'Pagode', 'Samba', 'Sertanejo', 
  "Children's Music", 'Lullabies', 'Sing-Along', 'Stories', 'Chinese', 'Chinese Classical', 
  'Chinese Flute', 'Chinese Opera', 'Chinese Orchestral', 'Chinese Regional Folk', 
  'Chinese Strings', 'Taiwanese Folk', 'Tibetan Native Music', 'Christian & Gospel', 'CCM', 
  'Christian Metal', 'Christian Pop', 'Christian Rap', 'Christian Rock', 'Classic Christian', 
  'Contemporary Gospel', 'Gospel', 'Praise & Worship', 'Southern Gospel', 'Traditional Gospel',
  'Classical', 'Art Song', 'Avant-Garde', 'Baroque Era', 'Brass & Woodwinds', 'Cantata', 
  'Cello', 'Chamber Music', 'Chant', 'Choral', 'Classical Crossover', 'Classical Era', 
  'Contemporary Era', 'Electronic', 'Guitar', 'Impressionist', 'Medieval Era', 'Minimalism', 
  'Modern Era', 'Opera', 'Oratorio', 'Orchestral', 'Percussion', 'Piano', 'Renaissance', 
  'Romantic Era', 'Sacred', 'Solo Instrumental', 'Violin', 'Comedy', 'Novelty', 'Standup Comedy', 
  'Country', 'Alternative Country', 'Americana', 'Bluegrass', 'Contemporary Bluegrass', 
  'Contemporary Country', 'Country Gospel', 'Country Hip-Hop/Rap', 'Honky Tonk', 'Outlaw Country', 
  'Thai Country', 'Traditional Bluegrass', 'Traditional Country', 'Urban Cowboy', 'Cuban', 
  'Bolero', 'Chachacha', 'Guajira', 'Guaracha', 'Mambo', 'Son', 'Timba', 'Dance', 'Breakbeat', 
  'Garage', 'Hardcore', 'House', "Jungle/Drum'n'bass", 'Maghreb Dance', 'Techno', 'Trance', 
  'Disney', 'Easy Listening', 'Lounge', 'Swing', 'Ambient', 'Bass', 'Downtempo', 'Dubstep', 
  "Electro-Cha'abi", 'Electronica', 'IDM/Experimental', 'Industrial', 'Levant Electronic', 
  'Maghreb Electronic', 'Enka', 'Fitness & Workout', 'Folk', 'Iraqi Folk', 'Khaleeji Folk', 
  'French Pop', 'German Folk', 'German Pop', 'Hip Hop/Rap', 'Alternative Rap', 'Chinese Hip-Hop', 
  'Dirty South', 'East Coast Rap', 'Egyptian Hip-Hop', 'Gangsta Rap', 'Ghanaian Drill', 
  'Hardcore Rap', 'Hip-Hop', 'Khaleeji Hip-Hop', 'Korean Hip-Hop', 'Latin Rap', 'Levant Hip-Hop', 
  'Maghreb Hip-Hop', 'Old School Rap', 'Rap', 'Russian Hip-Hop', 'South African Hip-Hop', 
  'Turkish Hip-Hop/Rap', 'UK Hip Hop', 'Underground Rap', 'West Coast Rap', 'Holiday', 'Christmas', 
  "Christmas: Children's", 'Christmas: Classic', 'Christmas: Classical', 'Christmas: Country', 
  'Christmas: Jazz', 'Christmas: Modern', 'Christmas: Pop', 'Christmas: R&B', 'Christmas: Religious', 
  'Christmas: Rock', 'Easter', 'Halloween', 'Thanksgiving', 'Hörspiele', 'Indian', 'Bollywood', 
  'Devotional & Spiritual', 'Ghazals', 'Indian Classical', 'Carnatic Classical', 'Hindustani Classical', 
  'Indian Folk', 'Indian Pop', 'Regional Indian', 'Assamese', 'Bengali', 'Rabindra Sangeet', 'Bhojpuri', 
  'Gujarati', 'Haryanvi', 'Kannada', 'Malayalam', 'Marathi', 'Odia', 'Punjabi', 'Punjabi Pop', 
  'Rajasthani', 'Tamil', 'Telugu', 'Urdu', 'Sufi', 'Inspirational', 'Instrumental', 'J-Pop', 'Jazz', 
  'Avant-Garde Jazz', 'Bebop', 'Big Band', 'Contemporary Jazz', 'Cool Jazz', 'Crossover Jazz', 'Dixieland', 
  'Ethio Jazz', 'Fusion', 'Hard Bop', 'Latin Jazz', 'Mainstream Jazz', 'Ragtime', 'Smooth Jazz', 
  'Trad Jazz', 'Vocal Jazz', 'Jewish', 'Jewish Holidays', 'Klezmer', 'Karaoke', 'Kayokyoku', 'Korean', 
  'Korean Traditional', 'Latin', 'Alternative & Rock in Spanish', 'Baladas y Boleros', 'Contemporary Latin', 
  'Latin Urban', 'Pop in Spanish', 'Raices', 'Regional Mexicano', 'Salsa y Tropical', 'Marching Bands', 
  'New Age', 'Healing', 'Meditation', 'Nature', 'Relaxation', 'Travel', 'Yoga', 'Pop', 'Adult Contemporary', 
  'Britpop', 'Cantopop', 'Egyptian Pop', 'Indo Pop', 'Iraqi Pop', 'K-Pop', 'Khaleeji Pop', 'Korean Folk-Pop', 
  'Levant Pop', 'Maghreb Pop', 'Malaysian Pop', 'Mandopop', 'Manilla Sound', 'Oldies', 'Original Pilipino Music', 
  'Pinoy Pop', 'Pop/Rock', 'Russian Pop', 'Shows', 'Soft Rock', 'T-Pop', 'Tai-Pop', 'Teen Pop', 'Thai Pop', 
  'Turkish Pop', 'R&B/Soul', 'Contemporary R&B', 'Disco', 'Doo Wop', 'Funk', 'Motown', 'Neo-Soul', 'Soul', 
  'Reggae', 'Dub', 'Lovers Rock', 'Modern Dancehall', 'Roots Reggae', 'Ska', 'Rock', 'Adult Alternative', 
  'American Trad Rock', 'Arena Rock', 'Blues-Rock', 'British Invasion', 'Chinese Rock', 'Death Metal/Black Metal', 
  'Glam Rock', 'Hair Metal', 'Hard Rock', 'Heavy Metal', 'Jam Bands', 'Korean Rock', 'Prog-Rock/Art Rock', 
  'Psychedelic', 'Rock & Roll', 'Rockabilly', 'Roots Rock', 'Russian Rock', 'Singer/Songwriter', 'Southern Rock', 
  'Surf', 'Tex-Mex', 'Turkish Rock', 'Russian', 'Russian Bard', 'Russian Chanson', 'Russian Romance', 
  'Alternative Folk', 'Contemporary Folk', 'Contemporary Singer/Songwriter', 'Folk-Rock', 'New Acoustic', 
  'Traditional Folk', 'Soundtrack', 'Foreign Cinema', 'Musicals', 'Original Score', 'Sound Effects', 'TV Soundtrack', 
  'Video Game', 'Spoken Word', 'Tarab', 'Egyptian Tarab', 'Iraqi Tarab', 'Khaleeji Tarab', 'Turkish', 'Arabesk', 
  'Fantezi', 'Halk', 'Religious', 'Sanat', 'Özgün', 'Vocal', 'Standards', 'Traditional Pop', 'Trot', 'Vocal Pop', 
  'Worldwide', 'Asia', 'Australia', 'Cajun', 'Calypso', 'Caribbean', 'Celtic', 'Celtic Folk', 'Contemporary Celtic', 
  'Dangdut', 'Dini', 'Europe', 'Fado', 'Farsi', 'Flamenco', 'France', 'Hawaii', 'Iberia', 'Indonesian Religious', 
  'Israeli', 'Japan', 'North America', 'Polka', 'Soca', 'South Africa', 'South America', 'Tango', 'Traditional Celtic', 
  'Worldbeat', 'Zydeco',
].sort();

function MetadataEditor({
  open,
  onClose,
  onSave,
  videoInfo,
  playlistInfo,
  chapterInfo,
  selectedChapters,
  selectedVideos, // For playlist selected mode
  mode = 'single', // 'single', 'playlist', 'chapter'
}) {
  const [activeTab, setActiveTab] = useState(0);
  const [playlistEditMode, setPlaylistEditMode] = useState('bulk'); // 'bulk' or 'individual'
  const [useSharedArtist, setUseSharedArtist] = useState(true); // Toggle for shared vs per-video artist
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState(videoInfo?.thumbnail || '');
  const [customThumbnail, setCustomThumbnail] = useState(null);

  // Single video / Bulk playlist metadata
  const [metadata, setMetadata] = useState({
    title: '',
    artist: '',
    album: '',
    albumArtist: '',
    genre: '',
    year: '',
    trackNumber: '',
    totalTracks: '',
    composer: '',
    publisher: '',
    comment: '',
    description: '',
    language: '',
    copyright: '',
    bpm: '',
  });

  // Per-file metadata for playlist individual mode (title, artist, and track number)
  const [perFileMetadata, setPerFileMetadata] = useState([]);

  // Shared metadata for playlist individual mode (genre, album, albumArtist, etc.)
  // Artist can be shared or per-video depending on useSharedArtist toggle
  const [playlistSharedMetadata, setPlaylistSharedMetadata] = useState({
    artist: '', // Only used when useSharedArtist is true
    album: '',
    albumArtist: '',
    genre: '',
    year: '',
    composer: '',
    publisher: '',
    comment: '',
    description: '',
    language: '',
    copyright: '',
    bpm: '',
  });

  // Chapter metadata
  const [chapterMetadata, setChapterMetadata] = useState({
    albumMetadata: {
      artist: '',
      album: '',
      albumArtist: '',
      genre: '',
      year: '',
      composer: '',
      publisher: '',
      comment: '',
      description: '',
      language: '',
      copyright: '',
      bpm: '',
    },
    useChapterTitles: true,
    chapterTitleTemplate: '{chapterTitle}',
  });

  // Load defaults from video info
  useEffect(() => {
    if (videoInfo && open) {
      const currentYear = new Date().getFullYear();
      setMetadata((prev) => ({
        ...prev,
        title: videoInfo.title || '',
        artist: videoInfo.uploader || '',
        year: videoInfo.uploadDate ? videoInfo.uploadDate.substring(0, 4) : currentYear.toString(),
        description: videoInfo.description || '',
      }));
      setThumbnailUrl(videoInfo.thumbnail || '');
      setCustomThumbnail(null);
    }
  }, [videoInfo, open]);

  // Initialize shared metadata and per-file metadata for playlist
  useEffect(() => {
    if (playlistInfo && playlistInfo.videos && playlistEditMode === 'individual' && open) {
      const currentYear = new Date().getFullYear();
      // Initialize shared metadata (artist can be shared or per-video based on toggle)
      setPlaylistSharedMetadata({
        artist: videoInfo?.uploader || '', // Default to shared artist
        album: playlistInfo.playlistTitle || '',
        albumArtist: videoInfo?.uploader || '',
        genre: '',
        year: videoInfo?.uploadDate ? videoInfo.uploadDate.substring(0, 4) : currentYear.toString(),
        composer: '',
        publisher: '',
        comment: '',
        description: '',
        language: '',
        copyright: '',
        bpm: '',
      });
      // Initialize per-file metadata (title, artist if not shared, and track number)
      const perFile = playlistInfo.videos.map((video, index) => ({
        title: video.title || '',
        artist: videoInfo?.uploader || '', // Default to uploader, but can be changed per video if not shared
        trackNumber: (index + 1).toString(),
      }));
      setPerFileMetadata(perFile);
      // Default to shared artist
      setUseSharedArtist(true);
    }
  }, [playlistInfo, playlistEditMode, open, videoInfo]);

  // Initialize chapter metadata
  useEffect(() => {
    if (chapterInfo && open && mode === 'chapter') {
      setChapterMetadata((prev) => ({
        ...prev,
        albumMetadata: {
          ...prev.albumMetadata,
          artist: videoInfo?.uploader || '',
          album: videoInfo?.title || '',
          albumArtist: videoInfo?.uploader || '',
          year: videoInfo?.uploadDate
            ? videoInfo.uploadDate.substring(0, 4)
            : new Date().getFullYear().toString(),
        },
      }));
    }
  }, [chapterInfo, open, mode, videoInfo]);

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

  const handleChapterMetadataChange = useCallback((field, value) => {
    setChapterMetadata((prev) => ({
      ...prev,
      albumMetadata: {
        ...prev.albumMetadata,
        [field]: value,
      },
    }));
  }, []);

  const handleImageSelect = useCallback(async () => {
    if (window.api && window.api.selectImageFile) {
      try {
        const result = await window.api.selectImageFile();
        if (result.success && result.dataUrl) {
          setThumbnailUrl(result.dataUrl);
          setCustomThumbnail(result.dataUrl);
        }
      } catch (err) {
        console.error('Failed to select image:', err);
      }
    }
  }, []);

  const handleCropComplete = useCallback((croppedImageUrl) => {
    setThumbnailUrl(croppedImageUrl);
    setCustomThumbnail(croppedImageUrl);
    setCropDialogOpen(false);
  }, []);

  const handleSave = useCallback(() => {
    let metadataToSave = null;

    if (mode === 'single') {
      metadataToSave = {
        type: 'single',
        metadata: { ...metadata },
        thumbnail: customThumbnail || thumbnailUrl,
      };
    } else if (mode === 'playlist') {
      // Calculate total tracks (use selected videos count if in selected mode, otherwise full playlist)
      const totalTracks =
        selectedVideos && selectedVideos.length > 0
          ? selectedVideos.length
          : playlistInfo?.playlistVideoCount || perFileMetadata.length;

      if (playlistEditMode === 'bulk') {
        // Remove totalTracks from metadata since it's auto-calculated
        const { totalTracks: _, ...bulkMeta } = metadata;
        metadataToSave = {
          type: 'playlist',
          mode: 'bulk',
          bulkMetadata: { ...bulkMeta },
          thumbnail: customThumbnail || thumbnailUrl,
          totalTracks: totalTracks, // Pass separately for auto-calculation
        };
      } else {
        // Merge shared metadata with per-file metadata (artist is per-file, not shared)
        const mergedPerFile = perFileMetadata.map((fileMeta, index) => ({
          ...playlistSharedMetadata,
          title: fileMeta.title || '',
          artist: fileMeta.artist || '', // Artist is per-video (for compilations)
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
    chapterMetadata,
    customThumbnail,
    thumbnailUrl,
    onSave,
    onClose,
  ]);

  const renderThumbnailSection = () => (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        Thumbnail / Album Art
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        {thumbnailUrl && (
          <Box
            component="img"
            src={thumbnailUrl}
            alt="Thumbnail"
            sx={{
              width: 150,
              height: 150,
              objectFit: 'cover',
              borderRadius: 1,
              border: 1,
              borderColor: 'divider',
            }}
          />
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<CropIcon />}
            onClick={() => setCropDialogOpen(true)}
            disabled={!thumbnailUrl}
          >
            Crop
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ImageIcon />}
            onClick={handleImageSelect}
          >
            Replace
          </Button>
        </Box>
      </Box>
    </Box>
  );

  const renderSingleVideoForm = () => (
    <Box>
      <TextField
        fullWidth
        label="Title"
        value={metadata.title}
        onChange={(e) => handleMetadataChange('title', e.target.value)}
        margin="normal"
      />
      <TextField
        fullWidth
        label="Artist"
        value={metadata.artist}
        onChange={(e) => handleMetadataChange('artist', e.target.value)}
        margin="normal"
      />
      <TextField
        fullWidth
        label="Album"
        value={metadata.album}
        onChange={(e) => handleMetadataChange('album', e.target.value)}
        margin="normal"
      />
      <TextField
        fullWidth
        label="Album Artist"
        value={metadata.albumArtist}
        onChange={(e) => handleMetadataChange('albumArtist', e.target.value)}
        margin="normal"
      />
      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        <FormControl fullWidth>
          <InputLabel>Genre</InputLabel>
          <Select
            value={metadata.genre}
            label="Genre"
            onChange={(e) => handleMetadataChange('genre', e.target.value)}
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
          value={metadata.year}
          onChange={(e) => handleMetadataChange('year', e.target.value)}
          type="number"
        />
      </Box>
      {mode !== 'playlist' && (
        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <TextField
            fullWidth
            label="Track Number"
            value={metadata.trackNumber}
            onChange={(e) => handleMetadataChange('trackNumber', e.target.value)}
            type="number"
          />
          <TextField
            fullWidth
            label="Total Tracks"
            value={metadata.totalTracks}
            onChange={(e) => handleMetadataChange('totalTracks', e.target.value)}
            type="number"
          />
        </Box>
      )}
      {mode === 'playlist' && (
        <Box sx={{ mt: 2, mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Track numbers will auto-increment. Total tracks:{' '}
            {selectedVideos && selectedVideos.length > 0
              ? selectedVideos.length
              : playlistInfo?.playlistVideoCount || 0}{' '}
            (automatic)
          </Typography>
        </Box>
      )}
      <TextField
        fullWidth
        label="Composer"
        value={metadata.composer}
        onChange={(e) => handleMetadataChange('composer', e.target.value)}
        margin="normal"
      />
      <TextField
        fullWidth
        label="Publisher"
        value={metadata.publisher}
        onChange={(e) => handleMetadataChange('publisher', e.target.value)}
        margin="normal"
      />
      <TextField
        fullWidth
        label="Comment"
        value={metadata.comment}
        onChange={(e) => handleMetadataChange('comment', e.target.value)}
        margin="normal"
        multiline
        rows={2}
      />
      <TextField
        fullWidth
        label="Description"
        value={metadata.description}
        onChange={(e) => handleMetadataChange('description', e.target.value)}
        margin="normal"
        multiline
        rows={3}
      />
      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        <TextField
          fullWidth
          label="Language"
          value={metadata.language}
          onChange={(e) => handleMetadataChange('language', e.target.value)}
        />
        <TextField
          fullWidth
          label="BPM"
          value={metadata.bpm}
          onChange={(e) => handleMetadataChange('bpm', e.target.value)}
          type="number"
        />
      </Box>
      <TextField
        fullWidth
        label="Copyright"
        value={metadata.copyright}
        onChange={(e) => handleMetadataChange('copyright', e.target.value)}
        margin="normal"
      />
      {renderThumbnailSection()}
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

  const PlaylistVideoItem = ({
    video,
    index,
    fileMeta,
    onMetadataChange,
    totalTracks,
    useSharedArtist,
  }) => {
    const [expanded, setExpanded] = useState(false);

    return (
      <ListItem disablePadding>
        <Box sx={{ width: '100%' }}>
          <ListItemButton onClick={() => setExpanded(!expanded)}>
            <ListItemText
              primary={`${video.title}`}
              secondary={`Track ${fileMeta.trackNumber || index + 1} of ${totalTracks}`}
            />
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </ListItemButton>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Box sx={{ p: 2, bgcolor: 'background.default' }}>
              <TextField
                fullWidth
                label="Title"
                value={fileMeta.title || ''}
                onChange={(e) => onMetadataChange(index, 'title', e.target.value)}
                margin="normal"
                size="small"
              />
              {!useSharedArtist && (
                <TextField
                  fullWidth
                  label="Artist"
                  value={fileMeta.artist || ''}
                  onChange={(e) => onMetadataChange(index, 'artist', e.target.value)}
                  margin="normal"
                  size="small"
                  helperText="Artist for this song (can be different for each song)"
                />
              )}
              <TextField
                fullWidth
                label="Track Number"
                value={fileMeta.trackNumber || ''}
                onChange={(e) => onMetadataChange(index, 'trackNumber', e.target.value)}
                type="number"
                margin="normal"
                size="small"
                helperText={`Total tracks: ${totalTracks} (automatic)`}
              />
            </Box>
          </Collapse>
        </Box>
      </ListItem>
    );
  };

  const renderPlaylistIndividualForm = () => {
    if (!playlistInfo || !playlistInfo.videos) return null;

    // Calculate total tracks (use selected videos count if in selected mode, otherwise full playlist)
    const totalTracks =
      selectedVideos && selectedVideos.length > 0
        ? selectedVideos.length
        : playlistInfo.playlistVideoCount;

    return (
      <Box>
        <Alert severity="info" sx={{ mb: 2 }}>
          Shared metadata (genre, album, album artist, etc.) applies to all videos. Title and track
          number can be customized per video.
        </Alert>
        {playlistInfo.videos.length > 20 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Large playlist detected. Consider using bulk mode for better performance.
          </Alert>
        )}

        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
          Shared Album Metadata
        </Typography>
        <Divider sx={{ mb: 2 }} />

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

        {renderThumbnailSection()}

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>
          Individual Video Titles
        </Typography>
        <List>
          {playlistInfo.videos.map((video, index) => {
            const fileMeta = perFileMetadata[index] || {};
            return (
              <PlaylistVideoItem
                key={video.index}
                video={video}
                index={index}
                fileMeta={fileMeta}
                onMetadataChange={handlePerFileMetadataChange}
                totalTracks={totalTracks}
                useSharedArtist={useSharedArtist}
              />
            );
          })}
        </List>
      </Box>
    );
  };

  const renderChapterForm = () => (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        Album metadata will be applied to all chapters. Track numbers will auto-increment based on
        selected chapters.
      </Alert>
      <Typography variant="h6" gutterBottom>
        Album Metadata
      </Typography>
      <TextField
        fullWidth
        label="Artist"
        value={chapterMetadata.albumMetadata.artist}
        onChange={(e) => handleChapterMetadataChange('artist', e.target.value)}
        margin="normal"
      />
      <TextField
        fullWidth
        label="Album"
        value={chapterMetadata.albumMetadata.album}
        onChange={(e) => handleChapterMetadataChange('album', e.target.value)}
        margin="normal"
      />
      <TextField
        fullWidth
        label="Album Artist"
        value={chapterMetadata.albumMetadata.albumArtist}
        onChange={(e) => handleChapterMetadataChange('albumArtist', e.target.value)}
        margin="normal"
      />
      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        <FormControl fullWidth>
          <InputLabel>Genre</InputLabel>
          <Select
            value={chapterMetadata.albumMetadata.genre}
            label="Genre"
            onChange={(e) => handleChapterMetadataChange('genre', e.target.value)}
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
          value={chapterMetadata.albumMetadata.year}
          onChange={(e) => handleChapterMetadataChange('year', e.target.value)}
          type="number"
        />
      </Box>
      <TextField
        fullWidth
        label="Composer"
        value={chapterMetadata.albumMetadata.composer}
        onChange={(e) => handleChapterMetadataChange('composer', e.target.value)}
        margin="normal"
      />
      <TextField
        fullWidth
        label="Comment"
        value={chapterMetadata.albumMetadata.comment}
        onChange={(e) => handleChapterMetadataChange('comment', e.target.value)}
        margin="normal"
        multiline
        rows={2}
      />
      <Divider sx={{ my: 2 }} />
      <Typography variant="h6" gutterBottom>
        Chapter Titles
      </Typography>
      <FormControl fullWidth margin="normal">
        <InputLabel>Title Template</InputLabel>
        <Select
          value={chapterMetadata.chapterTitleTemplate}
          label="Title Template"
          onChange={(e) =>
            setChapterMetadata((prev) => ({ ...prev, chapterTitleTemplate: e.target.value }))
          }
        >
          <MenuItem value="{chapterTitle}">Use Original Chapter Title</MenuItem>
          <MenuItem value="{album} - {chapterTitle}">Album - Chapter Title</MenuItem>
          <MenuItem value="Track {trackNumber}: {chapterTitle}">Track N: Chapter Title</MenuItem>
        </Select>
      </FormControl>
      {renderThumbnailSection()}
    </Box>
  );

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
          {mode === 'chapter' && renderChapterForm()}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            Apply
          </Button>
        </DialogActions>
      </Dialog>
      <ThumbnailCropper
        open={cropDialogOpen}
        imageUrl={thumbnailUrl}
        onClose={() => setCropDialogOpen(false)}
        onCropComplete={handleCropComplete}
      />
    </>
  );
}

export default MetadataEditor;
