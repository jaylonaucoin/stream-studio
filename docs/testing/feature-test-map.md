# Feature → test map

Use this when changing a feature: update tests in the same PR, or note **manual** if intentionally uncovered.

| User-visible feature | Primary E2E (Playwright) | Unit / component (Vitest) |
| --- | --- | --- |
| App launches; React root; preload `ping` / `getAppVersion` | [smoke.spec.cjs](../../e2e/specs/smoke.spec.cjs) | — |
| Paste URL tab: input, validation, format selector, convert control | [conversion-flow.spec.cjs](../../e2e/specs/conversion-flow.spec.cjs), [error-handling.spec.cjs](../../e2e/specs/error-handling.spec.cjs) | [ConversionForm.test.jsx](../../src/components/ConversionForm.test.jsx), [validation.test.js](../../src/utils/validation.test.js) |
| Mocked end-to-end conversion (CI) | [conversion-success.spec.cjs](../../e2e/specs/conversion-success.spec.cjs) | [conversion.test.js](../../main/services/conversion.test.js) |
| Search tab (multi-site search) | [input-modes.spec.cjs](../../e2e/specs/input-modes.spec.cjs) | [YouTubeSearchPanel.test.jsx](../../src/components/YouTubeSearchPanel.test.jsx) |
| Local File tab (drop zone) | [input-modes.spec.cjs](../../e2e/specs/input-modes.spec.cjs) | [ConversionForm.test.jsx](../../src/components/ConversionForm.test.jsx) |
| Library tab (batch metadata / local batch) | [input-modes.spec.cjs](../../e2e/specs/input-modes.spec.cjs) | [LocalLibraryBatchView.test.jsx](../../src/components/LocalLibraryBatchView.test.jsx), [batch-local.test.js](../../main/services/batch-local.test.js) |
| Batch queue panel open/close/empty | [queue-management.spec.cjs](../../e2e/specs/queue-management.spec.cjs), [journeys.spec.cjs](../../e2e/specs/journeys.spec.cjs) | [QueuePanel.test.jsx](../../src/components/QueuePanel.test.jsx), [queueStorage.test.js](../../src/lib/queueStorage.test.js) |
| Conversion history panel | [history-panel.spec.cjs](../../e2e/specs/history-panel.spec.cjs) | [HistoryPanel.test.jsx](../../src/components/HistoryPanel.test.jsx), [history.test.js](../../main/services/history.test.js) |
| Settings dialog + persistence | [settings-persistence.spec.cjs](../../e2e/specs/settings-persistence.spec.cjs), [journeys.spec.cjs](../../e2e/specs/journeys.spec.cjs) | [SettingsDialog.test.jsx](../../src/components/SettingsDialog.test.jsx), [settings.test.js](../../main/services/settings.test.js) |
| Keyboard shortcuts dialog | [keyboard-shortcuts.spec.cjs](../../e2e/specs/keyboard-shortcuts.spec.cjs) | [KeyboardShortcutsDialog.test.jsx](../../src/components/KeyboardShortcutsDialog.test.jsx), [useKeyboardShortcuts.test.jsx](../../src/hooks/useKeyboardShortcuts.test.jsx) |
| Error / invalid URL UX | [error-handling.spec.cjs](../../e2e/specs/error-handling.spec.cjs) | [ErrorDialog.test.jsx](../../src/components/ErrorDialog.test.jsx) |
| Preload ↔ main IPC invoke wiring | — (contract) | [ipc-channel-contract.test.js](../../tests/ipc-channel-contract.test.js) |
| Preload progress events (`conversion-progress`, `batch-job-progress`) | — (contract) | [ipc-channel-contract.test.js](../../tests/ipc-channel-contract.test.js) |
| **Real ffmpeg / yt-dlp / network downloads** | **manual / release** — see [release-smoke-real-media.md](./release-smoke-real-media.md) | [ffmpeg.test.js](../../main/services/ffmpeg.test.js), [videoInfo.test.js](../../main/services/videoInfo.test.js) (mocked) |

## Gaps (by design)

- **Real media pipeline**: PR CI uses `STREAM_STUDIO_E2E_MOCK_CONVERT=1` for stable E2E. Validate real output with the release checklist, not every PR.
- **OS-specific UI** (native file dialogs): CI is Linux + XVFB; macOS/Windows file pickers are not automated here.
