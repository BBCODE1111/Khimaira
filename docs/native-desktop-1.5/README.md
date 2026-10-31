# KHIMAIRA 1.5 Native Preview — 2026-10-31

## Delivered scope

A new native desktop workspace built on the previous 1.4 JUCE/QuickJS architecture, using web **1.0.5** at `846c2a4548be382a3daf91ae038664b7f0a5f14a` as the music source. The older native work was imported from the preserved local workspace; `native-1.4-baseline.json` records that starting point. No website DOM/CSS is loaded. Shared music-core and web files remain unchanged.

- Native horizontal score, per-chord playhead/progress and separate selection, drag/wheel/scrollbar navigation, manual follow suspension and explicit resume.
- Fixed transport; Harmony and Performance workspaces, readable controls and scrolling at 760×560 rather than shrinking the entire editor. Default 1120×820. Existing temple/emblem art, Cinzel/DM Sans and translucent panels.
- Current backbone/MORPH semantics, all 49 harmonic styles, exploration/density, inversion/parallel/ii–V switches, bass preservation, keyed examples, INSPIRE/KEEP/RESTORE/UNDO, six-result A/B history and per-source restore. Inspector acts on the selected chord, including a second chord within a bar.
- All existing 18 piano patterns plus genre patterns and native ARP; phrase/fills, voicing, groove/gate/human, 14 existing host parameters.
- Embedded offline piano preview in standalone and optional VST3 monitoring; AU remains a MIDI processor before a host instrument.
- Native `.khimaira` project save/open and MIDI save/drag. Space toggles preview, Escape stops, Left/Right changes selection, Cmd-S saves.
- Separate Preview identities and install paths preserve existing 1.3 projects/plugins. Native source changes are on `native/desktop-1.5`.

## Verified

- Web regression: **315 / 315** tests pass, with no web/core source edits.
- Headless native/website contracts: **16 / 16** tests pass, including 1,470 style/key/mutation comparisons, legacy/current pattern parity, R02 A/B/source restore and exact chord actions. QuickJS's missing `Array.findLast` is explicitly covered by removing it from the test VM.
- CTest: **5 / 5** suites pass. Includes 3,168 native/JS ARP cases, 18 actual JUCE piano patterns, three 8-bar loops / 384 notes / **0 tick** grid error, note pairing, parameter recall and CC64 export.
- Start position: 120 cases, maximum 0.0108844 tick; tempo: 48 ramp/step/realtime/offline cases, maximum 0.0217687 tick.
- Embedded MP3 decoder/sampler produces finite nonzero PCM (test peak 0.0967221); disabled piano produces exact silence. Enabling sound does not change generated MIDI bytes or sample positions.
- Actual native editor tests cover 16-bar follow, manual suspension, resume and second-chord editing. Real JUCE component screenshots inspected at 1120×820, 900×650 and 760×560, plus an inspector/playhead state.
- Installed AU `aumi / Km15 / Khmr` passes Apple **strict auval**. App/AU/VST3 bundles pass ad-hoc codesign verification.

Evidence is retained on the host under `reviews/native-desktop-20261031/`, outside the public source tree. Interactive OS accessibility inspection timed out for the standalone app; it launched and its main event loop was confirmed responsive by process sampling. UI claims above refer to actual JUCE component renders/callback tests, not a completed manual Logic session.

## Next loop — concrete remaining work

1. In Logic, insert **KHIMAIRA 1.5 Preview MIDI FX** before a software instrument. Verify stopped preview, play at an arbitrary project bar, cycle, seek, tempo ramps and live automation in a disposable session. Strict auval and processor tests are not substitutes for this host session.
2. Audition the standalone on the user's selected audio device; test actual Finder open/save dialogs and physical MIDI drag into Logic. Native commands/export and serialized recall are covered, but these OS interactions were not fully exercised.
3. Review visual balance and workflow at the user's actual screen scale, especially horizontal drag and the smaller-window workspace scroll. The score/transport must remain visible; do not reintroduce affine downscaling or a WebView.
4. Add native split Bass/Chords MIDI export, chord-only export choices, and any desired guitar/teaching views. This first preview exports the complete performance on MIDI channel 1; it does not claim parity with every website export mode/view.
5. Add preview seek from a chosen bar if desired; currently manual preview starts at bar 1 while DAW start anchors follow the tested FROM PLAY/LOCK TO BAR contract.
6. Production distribution: Developer ID/notarization, broader DAW/VST3 compatibility and Intel/Windows builds remain separate work. Current tested binary is Apple Silicon macOS 12.3+.

## Reproduction

See `plugin/README.md` for build/test commands. Keep the source branch, baseline manifest and engine manifest together. Do not run the historic 1.3 installer against this preview. Do not edit the old `Khimaira` dirty working directory or Seiren to continue this task.
