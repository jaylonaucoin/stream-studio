import { Box, TextField, FormControl, InputLabel, Select, MenuItem, Typography } from '@mui/material';

// GENRES list - sorted once at module level
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

export function MetadataFormFields({
  metadata,
  onChange,
  errors = {},
  showTrackNumbers = false,
  totalTracksDisplay = null,
  hideTitle = false,
}) {
  return (
    <>
      {!hideTitle && (
        <TextField
          fullWidth
          label="Title"
          value={metadata.title || ''}
          onChange={(e) => onChange('title', e.target.value)}
          margin="normal"
          error={!!errors.title}
          helperText={errors.title}
        />
      )}
      <TextField
        fullWidth
        label="Artist"
        value={metadata.artist || ''}
        onChange={(e) => onChange('artist', e.target.value)}
        margin="normal"
        error={!!errors.artist}
        helperText={errors.artist}
      />
      <TextField
        fullWidth
        label="Album"
        value={metadata.album || ''}
        onChange={(e) => onChange('album', e.target.value)}
        margin="normal"
        error={!!errors.album}
        helperText={errors.album}
      />
      <TextField
        fullWidth
        label="Album Artist"
        value={metadata.albumArtist || ''}
        onChange={(e) => onChange('albumArtist', e.target.value)}
        margin="normal"
        error={!!errors.albumArtist}
        helperText={errors.albumArtist}
      />
      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        <FormControl fullWidth>
          <InputLabel>Genre</InputLabel>
          <Select
            value={metadata.genre || ''}
            label="Genre"
            onChange={(e) => onChange('genre', e.target.value)}
            error={!!errors.genre}
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
          value={metadata.year || ''}
          onChange={(e) => onChange('year', e.target.value)}
          type="number"
          error={!!errors.year}
          helperText={errors.year}
        />
      </Box>
      {showTrackNumbers && (
        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <TextField
            fullWidth
            label="Track Number"
            value={metadata.trackNumber || ''}
            onChange={(e) => onChange('trackNumber', e.target.value)}
            type="number"
            error={!!errors.trackNumber}
            helperText={errors.trackNumber}
          />
          <TextField
            fullWidth
            label="Total Tracks"
            value={metadata.totalTracks || ''}
            onChange={(e) => onChange('totalTracks', e.target.value)}
            type="number"
          />
        </Box>
      )}
      {totalTracksDisplay !== null && (
        <Box sx={{ mt: 2, mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Track numbers will auto-increment. Total tracks: {totalTracksDisplay} (automatic)
          </Typography>
        </Box>
      )}
      <TextField
        fullWidth
        label="Composer"
        value={metadata.composer || ''}
        onChange={(e) => onChange('composer', e.target.value)}
        margin="normal"
        error={!!errors.composer}
        helperText={errors.composer}
      />
      <TextField
        fullWidth
        label="Publisher"
        value={metadata.publisher || ''}
        onChange={(e) => onChange('publisher', e.target.value)}
        margin="normal"
        error={!!errors.publisher}
        helperText={errors.publisher}
      />
      <TextField
        fullWidth
        label="Comment"
        value={metadata.comment || ''}
        onChange={(e) => onChange('comment', e.target.value)}
        margin="normal"
        multiline
        rows={2}
        error={!!errors.comment}
        helperText={errors.comment}
      />
      <TextField
        fullWidth
        label="Description"
        value={metadata.description || ''}
        onChange={(e) => onChange('description', e.target.value)}
        margin="normal"
        multiline
        rows={3}
        error={!!errors.description}
        helperText={errors.description}
      />
      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        <TextField
          fullWidth
          label="Language"
          value={metadata.language || ''}
          onChange={(e) => onChange('language', e.target.value)}
          error={!!errors.language}
          helperText={errors.language}
        />
        <TextField
          fullWidth
          label="BPM"
          value={metadata.bpm || ''}
          onChange={(e) => onChange('bpm', e.target.value)}
          type="number"
          error={!!errors.bpm}
          helperText={errors.bpm}
        />
      </Box>
      <TextField
        fullWidth
        label="Copyright"
        value={metadata.copyright || ''}
        onChange={(e) => onChange('copyright', e.target.value)}
        margin="normal"
        error={!!errors.copyright}
        helperText={errors.copyright}
      />
    </>
  );
}
