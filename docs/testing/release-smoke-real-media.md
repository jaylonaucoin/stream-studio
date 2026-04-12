# Release smoke: real media (beyond mocked E2E)

Pull-request CI runs Playwright with `STREAM_STUDIO_E2E=1` and usually `STREAM_STUDIO_E2E_MOCK_CONVERT=1` so conversion does not depend on **yt-dlp**, **network**, or **real ffmpeg** behavior. That keeps CI fast and deterministic.

Before a release (or when touching download/conversion/ffmpeg paths), run this **manual** checklist on at least **one** target OS (the one you ship first).

## Preconditions

- Built app or `npm run electron:dev` with renderer built as needed.
- **Unset** `STREAM_STUDIO_E2E_MOCK_CONVERT` for real conversion checks (or use a production-like build where mocks are off).

## Checklist (about 5–10 minutes)

1. **Paste URL**: Use a short, stable public URL (e.g. a well-known test video). Confirm fetch/info progress and that output file appears in the chosen output folder.
2. **Cancel**: Start a longer download/conversion and use **Cancel**; confirm UI returns to idle without crash.
3. **Format**: Switch output format (e.g. audio vs video) and confirm output extension matches.
4. **Local File**: Pick a small local media file; confirm conversion completes.
5. **FFmpeg**: If you changed paths or packaging, confirm **no** “FFmpeg is not available” warning when ffmpeg is expected to be bundled or on `PATH`.
6. **Library batch** (if you changed batch-local): Add two small files, run a minimal convert or tag-only flow as appropriate.

## Optional: heavier automation

- A **scheduled** or **manual** workflow could run Playwright **without** `STREAM_STUDIO_E2E_MOCK_CONVERT`, with a pinned test asset or local file only, on a self-hosted runner with ffmpeg/yt-dlp. This is optional and costs more maintenance than the checklist above.
