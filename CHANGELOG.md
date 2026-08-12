# Changelog

All notable changes to **AkiConvert** are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

## [2.2.0] - 2026-08-12

### Changed
- Output directory selection is deferred to convert time: importing or
  dropping files no longer prompts for a save location; the folder picker
  appears once when starting a conversion without a chosen directory.
- When "Auto" concurrency is enabled, the manual max-concurrency slider is
  disabled and greyed out (previously adjustable despite being overridden).

### Fixed
- `ncmDecrypt` `readUint32LE` deduplicated into the shared decoder utils
  (single source of truth; re-exported for compatibility).
- Documented why `ncmDecrypt.detectAudioFormat` intentionally stays local
  (returns an `AudioFormat` object with MIME vs. the utils string variant).
- Dependency upgrades: i18next `^24 → ^26.3.6`, react-i18next `^15 → ^17.0.11`
  (app uses none of the removed v26 APIs; runtime-verified).

### Quality
- 285 tests passing across 21 files; typecheck + build clean.
- CI runs on every push/PR.

---

## [2.0.0] - 2026-08-08

### Added
- **KGG decryption end-to-end** — decrypt Kugou `.kgg` (V5) files, import key
  databases, and auto-scan known KuGou installation paths (Windows/macOS).
- **Manual lyrics attachment** — attach a companion `.lrc` / `.txt` file per
  source file; it is embedded during conversion.
- **First-run language auto-detection** — language follows the OS locale on
  first launch and is persisted; an explicit user choice always wins.
- **Main-process error i18n** — conversion failures now surface as translated
  error keys instead of raw English strings.
- **`outputDir` persistence** — the output directory survives restarts
  (hydrated on launch, persisted on change).

### Changed
- Toolchain upgraded to current majors: Electron 43, Vite 7, electron-vite 5,
  Vitest 4, TypeScript 5.7.
- App icons compressed (~85 % smaller, 1.87 MB → 270 KB).
- README restructured into a unified bilingual format (full EN, then full CN).

### Fixed
- **Security**
  - QMCv1 mask index corrected to `i % 32768` (off-by-one decryption flaw).
  - ZIP entry names sanitized against path traversal (`../`, backslashes).
  - `settings.json` loading rejects unknown keys and prototype-pollution keys
    (`__proto__`, `constructor`, `prototype`).
  - Output format runtime whitelist prevents format-string path escape.
  - Renderer sandbox enabled (`sandbox: true`); preload uses only whitelisted
    Electron APIs.
- **Stability / correctness**
  - Batch conversion is pause/cancel-safe and rejection-proof.
  - IPC progress listeners no longer leak on pause/resume.
  - Multi-extension encrypted sources (e.g. `.kgg.flac`) classified correctly.
  - Player file URLs encoded; stale play promises guarded.
  - Manual concurrency clamped to 1–10.
  - `basenameFromPath` handles trailing separators; duplicated helper removed.
  - Windows control characters stripped in filename sanitizer.
  - File-open dialog includes plain audio formats (mp3, flac, …).
  - Dead `audioHash` MD5 computation removed.
  - `HistoryStore.clear()` serialized through the write chain (race-safe).
  - KGG drive scan switched from blocking `execSync` to async `execFile`
    (5 s timeout) — main process stays responsive.
  - FFmpeg stderr buffer bounded to a 64 KiB tail.
  - Single shared `HistoryStore` instance across IPC modules.
  - Native dialog titles localized per user language.
- **i18n / UX**
  - Locale key parity enforced by test (227/227 keys).
  - Preload `convert:file` result type includes `errorKey`.

### Tests
- 21 test files / 285 tests covering decoders, template engine, settings
  hardening, history store, locale parity, IPC boundary, and more.
- GitHub Actions CI runs typecheck + tests + build on every push/PR; release
  workflow builds Windows/macOS/Linux installers on tag push.

---

## [2.0.1] - 2026-08-08

### Fixed
- Accept mobile-client NCM version bytes (2-byte version field).

---

## [2.0.0] - 2026-08-08

Major milestone release: full KGG support groundwork, toolchain upgrades, and
a comprehensive feature set including multi-format decryption, batch
conversion, metadata preservation, audio preview, and bilingual UI.

[Unreleased]: https://github.com/AkiroMusic/AkiConvert/compare/v2.2.0...HEAD
[2.2.0]: https://github.com/AkiroMusic/AkiConvert/compare/v2.1.0...v2.2.0
[2.1.0]: https://github.com/AkiroMusic/AkiConvert/compare/v2.0.1...v2.1.0
[2.0.1]: https://github.com/AkiroMusic/AkiConvert/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/AkiroMusic/AkiConvert/releases/tag/v2.0.0
