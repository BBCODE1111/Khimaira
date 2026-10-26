# KHIMAIRA 1.2.0 — Native MIDI generator

Rebuilt from the local 0.3 MIDI FX shell (the surviving source tree has a 0.4 installer-preview version). The compact UI and native MIDI drag workflow are retained. Only the dependency closure of the fixed website engines is copied, byte for byte. `dist/index.html`, the website app, BeatPlayer, preview IPC scheduling and piano samples are excluded.

- **Logic AU:** KHIMAIRA 1.2 MIDI FX, `aumi / Km12 / Khmr`, bundle `music.khimaira.v12.midifx`; insert before Serum or a Logic instrument.
- **VST3:** KHIMAIRA 1.2, `Kh12`, bundle `music.khimaira.v12.instrument`; silent instrument with MIDI output, routed to a second instrument track.
- **Standalone:** compact MIDI editor/exporter, no built-in sound.
- macOS 12.3+, or Windows 10/11 x64 with WebView2. 0.3 and 1.1 identities are preserved.

HOST follows project PPQ and BPM, chart bar 1 aligned to project bar 1. PLAY runs a native callback clock at the host BPM while the host is stopped. STOP followed by PLAY restarts at zero. Whole-pattern updates switch at the next bar and release old notes. The browser only generates patterns and displays state; it does not schedule notes.

The primary controls fit a 900×650 editor and its 760×560 minimum. Advanced settings open a compact dialog. Longer charts use four-bar pages.

## Build and test

```sh
node --test tests/*.test.js
cmake -S plugin -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release --parallel 4
node plugin/scripts/fixtures.mjs build/webstage build/fixtures.json
node plugin/tests/session.test.mjs build/webstage
ctest --test-dir build -C Release --output-on-failure
```

Optional `-DJUCE_DIR=/absolute/path/to/JUCE` uses an existing JUCE 8.0.15 checkout. Mac universal builds use `-DCMAKE_OSX_ARCHITECTURES="arm64;x86_64"`. The AU is in `build/KhimairaMidiFX_artefacts/Release/AU`; VST3/App are under `build/Khimaira_artefacts/Release`.

[Validation report and screenshots](../docs/plugin-1.2/README.md). Actual host acceptance limits are recorded there; native tests alone do not certify a DAW.
