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
  Collapse,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Switch,
  FormControlLabel,
  CircularProgress,
  Snackbar,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import ImageIcon from '@mui/icons-material/Image';
import CropIcon from '@mui/icons-material/Crop';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ThumbnailCropper from './ThumbnailCropper';
import { MetadataFormFields } from './MetadataFormFields';

// PlaylistVideoItem must be defined outside the component to prevent remounting on parent re-renders
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

// Sort GENRES once at module level to avoid sorting on every render
const GENRES = [
  'African',
  'African Dancehall',
  'African Reggae',
  'Afrikaans',
  'Afro House',
  'Afro Soul',
  'Afro-Beat',
  'Afro-folk',
  'Afro-fusion',
  'Afro-Pop',
  'Afrobeats',
  'Alte',
  'Amapiano',
  'Benga',
  'Bongo-Flava',
  'Chimurenga',
  'Coupé-Décalé',
  'Fuji',
  'Genge',
  'Gqom',
  'Highlife',
  'Kizomba',
  'Kuduro',
  'Kwaito',
  'Kwassa',
  'Mapouka',
  'Maskandi',
  'Mbalax',
  'Ndombolo',
  'Shangaan Electro',
  'Soukous',
  'Taarab',
  'Zouglou',
  'Alternative',
  'Chinese Alt',
  'College Rock',
  'EMO',
  'Goth Rock',
  'Grunge',
  'Indie Egyptian',
  'Indie Levant',
  'Indie Maghreb',
  'Indie Pop',
  'Indie Rock',
  'Korean Indie',
  'New Wave',
  'Pop Punk',
  'Punk',
  'Turkish Alternative',
  'Anime',
  'Arabic',
  'Arabic Pop',
  'Islamic',
  'Khaleeji',
  'Khaleeji Jalsat',
  'Khaleeji Shailat',
  'Levant',
  'Dabke',
  'Maghreb Rai',
  'North African',
  'Blues',
  'Acoustic Blues',
  'Chicago Blues',
  'Classic Blues',
  'Contemporary Blues',
  'Country Blues',
  'Delta Blues',
  'Electric Blues',
  'Brazilian',
  'Axé',
  'Baile Funk',
  'Bossa Nova',
  'Choro',
  'Forró',
  'Frevo',
  'MPB',
  'Pagode',
  'Samba',
  'Sertanejo',
  "Children's Music",
  'Lullabies',
  'Sing-Along',
  'Stories',
  'Chinese',
  'Chinese Classical',
  'Chinese Flute',
  'Chinese Opera',
  'Chinese Orchestral',
  'Chinese Regional Folk',
  'Chinese Strings',
  'Taiwanese Folk',
  'Tibetan Native Music',
  'Christian & Gospel',
  'CCM',
  'Christian Metal',
  'Christian Pop',
  'Christian Rap',
  'Christian Rock',
  'Classic Christian',
  'Contemporary Gospel',
  'Gospel',
  'Praise & Worship',
  'Southern Gospel',
  'Traditional Gospel',
  'Classical',
  'Art Song',
  'Avant-Garde',
  'Baroque Era',
  'Brass & Woodwinds',
  'Cantata',
  'Cello',
  'Chamber Music',
  'Chant',
  'Choral',
  'Classical Crossover',
  'Classical Era',
  'Contemporary Era',
  'Electronic',
  'Guitar',
  'Impressionist',
  'Medieval Era',
  'Minimalism',
  'Modern Era',
  'Opera',
  'Oratorio',
  'Orchestral',
  'Percussion',
  'Piano',
  'Renaissance',
  'Romantic Era',
  'Sacred',
  'Solo Instrumental',
  'Violin',
  'Comedy',
  'Novelty',
  'Standup Comedy',
  'Country',
  'Alternative Country',
  'Americana',
  'Bluegrass',
  'Contemporary Bluegrass',
  'Contemporary Country',
  'Country Gospel',
  'Country Hip-Hop/Rap',
  'Honky Tonk',
  'Outlaw Country',
  'Thai Country',
  'Traditional Bluegrass',
  'Traditional Country',
  'Urban Cowboy',
  'Cuban',
  'Bolero',
  'Chachacha',
  'Guajira',
  'Guaracha',
  'Mambo',
  'Son',
  'Timba',
  'Dance',
  'Breakbeat',
  'Garage',
  'Hardcore',
  'House',
  "Jungle/Drum'n'bass",
  'Maghreb Dance',
  'Techno',
  'Trance',
  'Disney',
  'Easy Listening',
  'Lounge',
  'Swing',
  'Ambient',
  'Bass',
  'Downtempo',
  'Dubstep',
  "Electro-Cha'abi",
  'Electronica',
  'IDM/Experimental',
  'Industrial',
  'Levant Electronic',
  'Maghreb Electronic',
  'Enka',
  'Fitness & Workout',
  'Folk',
  'Iraqi Folk',
  'Khaleeji Folk',
  'French Pop',
  'German Folk',
  'German Pop',
  'Hip Hop/Rap',
  'Alternative Rap',
  'Chinese Hip-Hop',
  'Dirty South',
  'East Coast Rap',
  'Egyptian Hip-Hop',
  'Gangsta Rap',
  'Ghanaian Drill',
  'Hardcore Rap',
  'Hip-Hop',
  'Khaleeji Hip-Hop',
  'Korean Hip-Hop',
  'Latin Rap',
  'Levant Hip-Hop',
  'Maghreb Hip-Hop',
  'Old School Rap',
  'Rap',
  'Russian Hip-Hop',
  'South African Hip-Hop',
  'Turkish Hip-Hop/Rap',
  'UK Hip Hop',
  'Underground Rap',
  'West Coast Rap',
  'Holiday',
  'Christmas',
  "Christmas: Children's",
  'Christmas: Classic',
  'Christmas: Classical',
  'Christmas: Country',
  'Christmas: Jazz',
  'Christmas: Modern',
  'Christmas: Pop',
  'Christmas: R&B',
  'Christmas: Religious',
  'Christmas: Rock',
  'Easter',
  'Halloween',
  'Thanksgiving',
  'Hörspiele',
  'Indian',
  'Bollywood',
  'Devotional & Spiritual',
  'Ghazals',
  'Indian Classical',
  'Carnatic Classical',
  'Hindustani Classical',
  'Indian Folk',
  'Indian Pop',
  'Regional Indian',
  'Assamese',
  'Bengali',
  'Rabindra Sangeet',
  'Bhojpuri',
  'Gujarati',
  'Haryanvi',
  'Kannada',
  'Malayalam',
  'Marathi',
  'Odia',
  'Punjabi',
  'Punjabi Pop',
  'Rajasthani',
  'Tamil',
  'Telugu',
  'Urdu',
  'Sufi',
  'Inspirational',
  'Instrumental',
  'J-Pop',
  'Jazz',
  'Avant-Garde Jazz',
  'Bebop',
  'Big Band',
  'Contemporary Jazz',
  'Cool Jazz',
  'Crossover Jazz',
  'Dixieland',
  'Ethio Jazz',
  'Fusion',
  'Hard Bop',
  'Latin Jazz',
  'Mainstream Jazz',
  'Ragtime',
  'Smooth Jazz',
  'Trad Jazz',
  'Vocal Jazz',
  'Jewish',
  'Jewish Holidays',
  'Klezmer',
  'Karaoke',
  'Kayokyoku',
  'Korean',
  'Korean Traditional',
  'Latin',
  'Alternative & Rock in Spanish',
  'Baladas y Boleros',
  'Contemporary Latin',
  'Latin Urban',
  'Pop in Spanish',
  'Raices',
  'Regional Mexicano',
  'Salsa y Tropical',
  'Marching Bands',
  'New Age',
  'Healing',
  'Meditation',
  'Nature',
  'Relaxation',
  'Travel',
  'Yoga',
  'Pop',
  'Adult Contemporary',
  'Britpop',
  'Cantopop',
  'Egyptian Pop',
  'Indo Pop',
  'Iraqi Pop',
  'K-Pop',
  'Khaleeji Pop',
  'Korean Folk-Pop',
  'Levant Pop',
  'Maghreb Pop',
  'Malaysian Pop',
  'Mandopop',
  'Manilla Sound',
  'Oldies',
  'Original Pilipino Music',
  'Pinoy Pop',
  'Pop/Rock',
  'Russian Pop',
  'Shows',
  'Soft Rock',
  'T-Pop',
  'Tai-Pop',
  'Teen Pop',
  'Thai Pop',
  'Turkish Pop',
  'R&B/Soul',
  'Contemporary R&B',
  'Disco',
  'Doo Wop',
  'Funk',
  'Motown',
  'Neo-Soul',
  'Soul',
  'Reggae',
  'Dub',
  'Lovers Rock',
  'Modern Dancehall',
  'Roots Reggae',
  'Ska',
  'Rock',
  'Adult Alternative',
  'American Trad Rock',
  'Arena Rock',
  'Blues-Rock',
  'British Invasion',
  'Chinese Rock',
  'Death Metal/Black Metal',
  'Glam Rock',
  'Hair Metal',
  'Hard Rock',
  'Heavy Metal',
  'Jam Bands',
  'Korean Rock',
  'Prog-Rock/Art Rock',
  'Psychedelic',
  'Rock & Roll',
  'Rockabilly',
  'Roots Rock',
  'Russian Rock',
  'Singer/Songwriter',
  'Southern Rock',
  'Surf',
  'Tex-Mex',
  'Turkish Rock',
  'Russian',
  'Russian Bard',
  'Russian Chanson',
  'Russian Romance',
  'Alternative Folk',
  'Contemporary Folk',
  'Contemporary Singer/Songwriter',
  'Folk-Rock',
  'New Acoustic',
  'Traditional Folk',
  'Soundtrack',
  'Foreign Cinema',
  'Musicals',
  'Original Score',
  'Sound Effects',
  'TV Soundtrack',
  'Video Game',
  'Spoken Word',
  'Tarab',
  'Egyptian Tarab',
  'Iraqi Tarab',
  'Khaleeji Tarab',
  'Turkish',
  'Arabesk',
  'Fantezi',
  'Halk',
  'Religious',
  'Sanat',
  'Özgün',
  'Vocal',
  'Standards',
  'Traditional Pop',
  'Trot',
  'Vocal Pop',
  'Worldwide',
  'Asia',
  'Australia',
  'Cajun',
  'Calypso',
  'Caribbean',
  'Celtic',
  'Celtic Folk',
  'Contemporary Celtic',
  'Dangdut',
  'Dini',
  'Europe',
  'Fado',
  'Farsi',
  'Flamenco',
  'France',
  'Hawaii',
  'Iberia',
  'Indonesian Religious',
  'Israeli',
  'Japan',
  'North America',
  'Polka',
  'Soca',
  'South Africa',
  'South America',
  'Tango',
  'Traditional Celtic',
  'Worldbeat',
  'Zydeco',
].sort();

function MetadataEditor({
  open,
  onClose,
  onSave,
  videoInfo,
  playlistInfo,
  chapterInfo,
  selectedVideos, // For playlist selected mode
  segments, // For manual segmentation mode
  useSharedArtistForSegments, // Whether to use shared artist for segments
  customMetadata, // Previously saved metadata to restore
  mode = 'single', // 'single', 'playlist', 'chapter', 'segment'
}) {
  const [playlistEditMode, setPlaylistEditMode] = useState('bulk'); // 'bulk' or 'individual'
  const [useSharedArtist, setUseSharedArtist] = useState(true); // Toggle for shared vs per-video artist
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState(videoInfo?.thumbnail || '');
  const [customThumbnail, setCustomThumbnail] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [playlistPage, setPlaylistPage] = useState(0);
  const PLAYLIST_ITEMS_PER_PAGE = 20;

  // Track previous mode and open state to detect changes
  const prevModeRef = useRef(mode);
  const prevOpenRef = useRef(open);

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

  // Segment metadata (for manual segmentation mode)
  const [segmentMetadata, setSegmentMetadata] = useState({
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
    perSegmentMetadata: [], // Array of { title, artist } for each segment
  });

  // Reset state when dialog closes or mode changes
  useEffect(() => {
    if (!open && prevOpenRef.current) {
      // Dialog just closed - reset all state
      setMetadata({
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
      setPerFileMetadata([]);
      setPlaylistSharedMetadata({
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
      });
      setChapterMetadata({
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
      setSegmentMetadata({
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
        perSegmentMetadata: [],
      });
      setThumbnailUrl('');
      setCustomThumbnail(null);
      setPlaylistEditMode('bulk');
      setUseSharedArtist(true);
      setPlaylistPage(0);
      setValidationErrors({});
      setErrorMessage(null);
    }

    // Reset state when mode changes
    if (prevModeRef.current !== mode && open) {
      setMetadata({
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
      setPerFileMetadata([]);
      setPlaylistSharedMetadata({
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
      });
      setChapterMetadata({
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
      setSegmentMetadata({
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
        perSegmentMetadata: [],
      });
      setValidationErrors({});
    }

    prevModeRef.current = mode;
    prevOpenRef.current = open;
  }, [open, mode]);

  // Consolidated initialization effect
  // This runs when dialog opens or when videoInfo/playlistInfo changes
  useEffect(() => {
    if (!open) return;

    const currentYear = new Date().getFullYear();

    // If customMetadata exists, restore from it (user's previously saved changes)
    if (customMetadata) {
      if (customMetadata.type === 'single' && customMetadata.metadata) {
        // Restore single video metadata
        setMetadata(customMetadata.metadata);
        if (customMetadata.thumbnail) {
          setThumbnailUrl(customMetadata.thumbnail);
          setCustomThumbnail(customMetadata.thumbnail);
        }
      } else if (customMetadata.type === 'playlist') {
        if (customMetadata.mode === 'bulk' && customMetadata.bulkMetadata) {
          // Restore playlist bulk metadata
          setMetadata(customMetadata.bulkMetadata);
          if (customMetadata.thumbnail) {
            setThumbnailUrl(customMetadata.thumbnail);
            setCustomThumbnail(customMetadata.thumbnail);
          }
        } else if (customMetadata.mode === 'individual' && customMetadata.perFileMetadata) {
          // Restore playlist individual metadata
          // Extract shared metadata from first file (all files share the same metadata except title/artist/trackNumber)
          const firstFile = customMetadata.perFileMetadata[0];
          if (firstFile) {
            // Determine if artist is shared (all files have same artist)
            const artists = customMetadata.perFileMetadata
              .map((f) => f.artist || '')
              .filter(Boolean);
            const isSharedArtist = artists.length > 0 && new Set(artists).size === 1;

            const sharedMeta = { ...firstFile };
            // Remove per-file specific fields
            delete sharedMeta.title;
            delete sharedMeta.trackNumber;
            // If artist is shared, keep it in shared metadata; otherwise remove it
            if (!isSharedArtist) {
              delete sharedMeta.artist;
            }
            setPlaylistSharedMetadata(sharedMeta);
            setUseSharedArtist(isSharedArtist);

            // Extract per-file metadata
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
        // Restore chapter metadata
        setChapterMetadata(customMetadata.chapterMetadata);
        if (customMetadata.thumbnail) {
          setThumbnailUrl(customMetadata.thumbnail);
          setCustomThumbnail(customMetadata.thumbnail);
        }
      } else if (customMetadata.type === 'segment' && customMetadata.segmentMetadata) {
        // Restore segment metadata
        setSegmentMetadata(customMetadata.segmentMetadata);
        if (customMetadata.thumbnail) {
          setThumbnailUrl(customMetadata.thumbnail);
          setCustomThumbnail(customMetadata.thumbnail);
        }
      }
      return; // Don't initialize from videoInfo if we restored from customMetadata
    }

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
      setThumbnailUrl(videoInfo.thumbnail || '');
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
      const thumbnailToUse = playlistInfo?.videos?.[0]?.thumbnail || videoInfo?.thumbnail || '';
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

      setPlaylistSharedMetadata({
        artist: sharedArtist,
        album: playlistInfo.playlistTitle || '',
        albumArtist: sharedArtist,
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

      // Initialize per-file metadata for displayed videos
      // Use video's artist if available, otherwise use shared artist
      const perFile = videosToUse.map((video, index) => ({
        title: video.title || '',
        artist: video.artist || sharedArtist, // Use video's artist if available, otherwise shared
        trackNumber: (index + 1).toString(),
      }));
      setPerFileMetadata(perFile);
      setUseSharedArtist(true);

      // Set thumbnail to first video's thumbnail for individual mode
      const thumbnailToUse = playlistInfo.videos[0]?.thumbnail || videoInfo?.thumbnail || '';
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
        setThumbnailUrl(videoInfo.thumbnail);
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
        setThumbnailUrl(videoInfo.thumbnail);
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

  const handleChapterMetadataChange = useCallback((field, value) => {
    setChapterMetadata((prev) => ({
      ...prev,
      albumMetadata: {
        ...prev.albumMetadata,
        [field]: value,
      },
    }));
  }, []);

  const handleSegmentAlbumMetadataChange = useCallback((field, value) => {
    setSegmentMetadata((prev) => ({
      ...prev,
      albumMetadata: {
        ...prev.albumMetadata,
        [field]: value,
      },
    }));
  }, []);

  const handleSegmentPerTrackChange = useCallback((index, field, value) => {
    setSegmentMetadata((prev) => {
      const updated = [...prev.perSegmentMetadata];
      updated[index] = { ...updated[index], [field]: value };
      return {
        ...prev,
        perSegmentMetadata: updated,
      };
    });
  }, []);

  // Validation function
  const validateMetadata = useCallback((meta) => {
    const errors = {};
    const currentYear = new Date().getFullYear();

    if (meta.year) {
      const yearNum = parseInt(meta.year, 10);
      if (isNaN(yearNum) || yearNum < 1900 || yearNum > currentYear + 1) {
        errors.year = `Year must be between 1900 and ${currentYear + 1}`;
      }
    }

    if (meta.trackNumber && meta.totalTracks) {
      const trackNum = parseInt(meta.trackNumber, 10);
      const totalNum = parseInt(meta.totalTracks, 10);
      if (!isNaN(trackNum) && !isNaN(totalNum) && trackNum > totalNum) {
        errors.trackNumber = `Track number cannot exceed total tracks (${totalNum})`;
      }
    }

    if (meta.bpm) {
      const bpmNum = parseInt(meta.bpm, 10);
      if (isNaN(bpmNum) || bpmNum < 1 || bpmNum > 300) {
        errors.bpm = 'BPM must be between 1 and 300';
      }
    }

    return errors;
  }, []);

  const handleImageSelect = useCallback(async () => {
    if (window.api && window.api.selectImageFile) {
      setImageLoading(true);
      setErrorMessage(null);
      try {
        const result = await window.api.selectImageFile();
        if (result.success && result.dataUrl) {
          setThumbnailUrl(result.dataUrl);
          setCustomThumbnail(result.dataUrl);
        } else {
          setErrorMessage('Failed to select image. Please try again.');
        }
      } catch (err) {
        console.error('Failed to select image:', err);
        setErrorMessage('Failed to select image: ' + (err.message || 'Unknown error'));
      } finally {
        setImageLoading(false);
      }
    }
  }, []);

  const handleCropComplete = useCallback((croppedImageUrl) => {
    if (!croppedImageUrl) {
      console.error('No cropped image URL provided');
      setErrorMessage('Failed to crop image. Please try again.');
      return;
    }

    try {
      setThumbnailUrl(croppedImageUrl);
      setCustomThumbnail(croppedImageUrl);
      setCropDialogOpen(false);
      setErrorMessage(null);
    } catch (error) {
      console.error('Error saving cropped image:', error);
      setErrorMessage('Failed to save cropped image. Please try again.');
    }
  }, []);

  // Memoize totalTracks calculation
  const totalTracks = useMemo(() => {
    if (mode === 'playlist') {
      if (selectedVideos && selectedVideos.length > 0) {
        return selectedVideos.length;
      }
      if (playlistEditMode === 'individual') {
        // Get videos to display (filter by selectedVideos if provided)
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
    // Validate metadata
    let errors = {};
    if (mode === 'single' || (mode === 'playlist' && playlistEditMode === 'bulk')) {
      errors = validateMetadata(metadata, mode);
    } else if (mode === 'playlist' && playlistEditMode === 'individual') {
      // Validate shared metadata
      errors = validateMetadata(playlistSharedMetadata, 'playlist');
      // Validate per-file metadata
      perFileMetadata.forEach((fileMeta, index) => {
        const fileErrors = validateMetadata(
          {
            ...playlistSharedMetadata,
            ...fileMeta,
            totalTracks: totalTracks.toString(),
          },
          'playlist'
        );
        if (Object.keys(fileErrors).length > 0) {
          errors[`file_${index}`] = fileErrors;
        }
      });
    } else if (mode === 'chapter') {
      errors = validateMetadata(chapterMetadata.albumMetadata, 'chapter');
    } else if (mode === 'segment') {
      errors = validateMetadata(segmentMetadata.albumMetadata, 'segment');
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
        // Remove totalTracks from metadata since it's auto-calculated
        const { totalTracks: _, ...bulkMeta } = metadata;
        metadataToSave = {
          type: 'playlist',
          mode: 'bulk',
          bulkMetadata: { ...bulkMeta },
          thumbnail: customThumbnail || thumbnailUrl,
          totalTracks: totalTracks,
        };
      } else {
        // Merge shared metadata with per-file metadata
        // Use shared artist if useSharedArtist is true, otherwise use per-file artist
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
      // Merge album metadata with per-segment metadata
      const mergedPerSegment = segmentMetadata.perSegmentMetadata.map((seg, index) => ({
        ...segmentMetadata.albumMetadata,
        title: seg.title || '',
        artist: useSharedArtistForSegments ? segmentMetadata.albumMetadata.artist : seg.artist || '',
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
    validateMetadata,
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
              width: 200,
              height: 200,
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
            startIcon={imageLoading ? <CircularProgress size={16} /> : <CropIcon />}
            onClick={() => setCropDialogOpen(true)}
            disabled={!thumbnailUrl || imageLoading}
          >
            Crop
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={imageLoading ? <CircularProgress size={16} /> : <ImageIcon />}
            onClick={handleImageSelect}
            disabled={imageLoading}
          >
            Replace
          </Button>
        </Box>
      </Box>
    </Box>
  );

  const renderSingleVideoForm = () => (
    <Box>
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

  // Memoize videos to display for playlist individual mode
  const videosToDisplay = useMemo(() => {
    if (!playlistInfo || !playlistInfo.videos) return [];
    if (selectedVideos && selectedVideos.length > 0) {
      return playlistInfo.videos.filter((_, idx) => selectedVideos.includes(idx + 1));
    }
    return playlistInfo.videos;
  }, [playlistInfo?.videos, selectedVideos]);

  // Paginate videos for performance
  const paginatedVideos = useMemo(() => {
    const start = playlistPage * PLAYLIST_ITEMS_PER_PAGE;
    const end = start + PLAYLIST_ITEMS_PER_PAGE;
    return videosToDisplay.slice(start, end);
  }, [videosToDisplay, playlistPage]);

  const totalPages = Math.ceil(videosToDisplay.length / PLAYLIST_ITEMS_PER_PAGE);

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

        {renderThumbnailSection()}

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
            // Map page index to actual display index
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
          onChange={(e) => {
            setChapterMetadata((prev) => ({ ...prev, chapterTitleTemplate: e.target.value }));
          }}
        >
          <MenuItem value="{chapterTitle}">Use Original Chapter Title</MenuItem>
          <MenuItem value="{album} - {chapterTitle}">Album - Chapter Title</MenuItem>
          <MenuItem value="Track {trackNumber}: {chapterTitle}">Track N: Chapter Title</MenuItem>
        </Select>
      </FormControl>
      {renderThumbnailSection()}
    </Box>
  );

  const renderSegmentForm = () => (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        Album metadata will be applied to all segments. Each segment will be downloaded as a separate
        track with its own title.
      </Alert>
      <Typography variant="h6" gutterBottom>
        Album Metadata
      </Typography>
      <TextField
        fullWidth
        label="Artist"
        value={segmentMetadata.albumMetadata.artist}
        onChange={(e) => handleSegmentAlbumMetadataChange('artist', e.target.value)}
        margin="normal"
        helperText={useSharedArtistForSegments ? 'This artist will be applied to all segments' : 'Default artist (can be overridden per segment)'}
      />
      <TextField
        fullWidth
        label="Album"
        value={segmentMetadata.albumMetadata.album}
        onChange={(e) => handleSegmentAlbumMetadataChange('album', e.target.value)}
        margin="normal"
      />
      <TextField
        fullWidth
        label="Album Artist"
        value={segmentMetadata.albumMetadata.albumArtist}
        onChange={(e) => handleSegmentAlbumMetadataChange('albumArtist', e.target.value)}
        margin="normal"
      />
      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        <FormControl fullWidth>
          <InputLabel>Genre</InputLabel>
          <Select
            value={segmentMetadata.albumMetadata.genre}
            label="Genre"
            onChange={(e) => handleSegmentAlbumMetadataChange('genre', e.target.value)}
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
          value={segmentMetadata.albumMetadata.year}
          onChange={(e) => handleSegmentAlbumMetadataChange('year', e.target.value)}
          type="number"
        />
      </Box>
      <TextField
        fullWidth
        label="Composer"
        value={segmentMetadata.albumMetadata.composer}
        onChange={(e) => handleSegmentAlbumMetadataChange('composer', e.target.value)}
        margin="normal"
      />
      <TextField
        fullWidth
        label="Comment"
        value={segmentMetadata.albumMetadata.comment}
        onChange={(e) => handleSegmentAlbumMetadataChange('comment', e.target.value)}
        margin="normal"
        multiline
        rows={2}
      />

      <Divider sx={{ my: 2 }} />

      <Typography variant="h6" gutterBottom>
        Segment Titles ({segmentMetadata.perSegmentMetadata.length} segments)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Review and edit the title{!useSharedArtistForSegments && ' and artist'} for each segment.
      </Typography>

      <List sx={{ bgcolor: 'background.default', borderRadius: 1 }}>
        {segmentMetadata.perSegmentMetadata.map((seg, index) => (
          <ListItem key={index} sx={{ borderBottom: 1, borderColor: 'divider', py: 1.5 }}>
            <Box sx={{ width: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Track {index + 1}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                <TextField
                  fullWidth
                  label="Title"
                  value={seg.title}
                  onChange={(e) => handleSegmentPerTrackChange(index, 'title', e.target.value)}
                  size="small"
                />
                {!useSharedArtistForSegments && (
                  <TextField
                    label="Artist"
                    value={seg.artist}
                    onChange={(e) => handleSegmentPerTrackChange(index, 'artist', e.target.value)}
                    size="small"
                    sx={{ minWidth: 200 }}
                  />
                )}
              </Box>
            </Box>
          </ListItem>
        ))}
      </List>

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
          {mode === 'segment' && renderSegmentForm()}
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
