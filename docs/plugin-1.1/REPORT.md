# KHIMAIRA 1.1 validation

2026-10-27 · plug-in version 1.1.0 · web engine `web-v1.0.2` (`b954842`).

## Delivered behavior

- **KHIMAIRA 1.1** in the DAW menu, native window, web header and bundle names. Plugin manufacturer/type identifiers are preserved. New versioned filenames coexist with the older 0.3 MIDI FX/VST3 installation.
- Host-locked notes, looping, tempo changes, built-in piano, native MIDI output, drag/save MIDI and optional CC64. Chart/settings/CC64 selection are saved in the DAW project.
- The chord chart follows host bar/beat, including split chords, rests and negative preroll. Audition yields to host playback, then becomes available again when the host stops or sync is disabled.
- Starting or seeking into a held chord plays the remaining note duration. Channel changes send note-offs to the original channel before starting the new route.

## Checks

- 90 web unit tests passed.
- `tests/browser-plugin.cjs` passed in Chrome: 1.1 branding, split-chord cursor, rests, looping, preroll, audition-to-host handoff and audition after host stop.
- CTest: scheduler, pedal and processor/export/state all pass. New cases exercise mid-chord start at block sizes 64/512/4096, channel switching, and suppressing preview during host playback.
- Local Release builds: AU, VST3, Standalone (macOS arm64). Strict `auval` passed under **AudioUnit Name: KHIMAIRA 1.1**, version 1.1.0; see `auval.txt`.
- Standalone WKWebView loaded with 1.1 branding. PLAY advanced bar/beat; STOP returned to READY. Screenshot: `standalone.png`.
- Local arm64 installer was expanded; all three bundles reported version 1.1.0 and passed `codesign --verify --deep --strict`. Signing is ad-hoc, not Developer ID/notarization.
- Earlier Logic Pro 11.2.2 checks covered loading, 96 BPM host sync, looping, state restoration and CC64 MIDI export; see [milestone evidence](../plugin-development-20261027/REPORT.md). The user's active legacy MIDI FX session was left running during this update.

## Installation on the development Mac

- `~/Library/Audio/Plug-Ins/Components/KHIMAIRA 1.1.component`
- `~/Library/Audio/Plug-Ins/VST3/KHIMAIRA 1.1.vst3`
- `~/Applications/KHIMAIRA 1.1.app`
- Installer: `build-plugin/installers/KHIMAIRA-1.1.0-mac-arm64.pkg`.

The prior development-only `KHIMAIRA.component` is backed up under `build-plugin/previous-au/`. The legacy `KHIMAIRA MIDI FX.component` and `KHIMAIRA.vst3` are retained. Restart/rescan the DAW to see the new version.

## Cross-platform work

GitHub Actions builds Mac Universal and Windows x64 installers. The initial Windows run exposed a missing WebView2 include in the native processor test target; the target now requests the same WebView2 SDK integration as the plugin. Mac CI uses macOS 15 because [GitHub is retiring macOS 14 runners](https://github.com/actions/runner-images/issues/13518).

Windows DAW loading and Intel hardware testing have not been performed locally. Native MIDI tiles export one track; the web MIDI buttons retain optional bass/chord split tracks. CC64 applies to native host playback and native MIDI tiles; web previews/exports retain note-length pedal simulation. AAX is not included.
