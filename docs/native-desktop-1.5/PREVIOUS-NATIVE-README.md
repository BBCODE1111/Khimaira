# Khimaira / Seiren 1.3 native MIDI FX — development build

JUCE native controls, using the existing product artwork. Khimaira retains its blue temple, emblem, Georgia title and bronze-bordered controls; Seiren retains its ivory/green palette, siren artwork and bundled Cinzel/DM Sans fonts. No HTML/CSS/WebView is loaded by the editor. `plugin/web` remains only as the historical 1.2 reference and regression source.

Both products use this native shell. Seiren's entry point is `../Seiren/plugin/CMakeLists.txt`; its headless music bundle uses Seiren's own melody-aware generation and protected piano rendering. Khimaira uses its own chord generation and performances. Shared theory/piano sources remain maintained through the existing music sync workflow.

- AU MIDI FX: `aumi / Km13 / Khmr` (Khimaira), `aumi / Sm13 / Khmr` (Seiren), inserted before an instrument in Logic.
- VST3: silent instrument with MIDI output; requires host routing to an instrument. Not a VST MIDI-insert effect.
- Standalone: MIDI generator/exporter; no synthesizer or piano sound engine.
- Separate 1.3 identities preserve the installed 1.2 plugin and existing Logic projects. No automatic replacement of 1.2 instances.

## Controls

ARP exposes presets, all 11 modes, six rates, four octave ranges, accent, phase, foundation, gate, swing, humanize and step display. Its ten APVTS parameters support host automation; swing starts at zero and is independent of piano groove swing. Live ARP parameter changes apply at the next step. The MIDI scheduler keeps the 1.2 host timing/480-tick normalization behavior.

The 18 piano POP/TEXTURE patterns use the current website renderers, with phrase/fills/voicing and optional CC64 export. Old piano revision state remains supported. Seiren imports PPQ MIDI melodies or supplies its demo; audio transcription and the website piano-roll editor are not included in this native build. Multi-track MIDI currently selects the track with the most notes; use a melody-only MIDI file.

HOST follows the project clock; PLAY auditions through the host instrument while the host is stopped. BPM is read-only in HOST mode. Click DRAG MIDI to save in Documents, or drag it to a host track. The editor is 900×650 and scales to 760×560 without scrolling.

## Build and test

Keep Khimaira and Seiren as sibling folders. Requires Node, CMake and JUCE 8.0.15 (downloaded by CMake or supplied via JUCE_DIR).

```sh
npm ci --prefix plugin --ignore-scripts
cmake -S plugin -B build-native -DCMAKE_BUILD_TYPE=Release
cmake --build build-native --config Release --parallel 4
ctest --test-dir build-native -C Release --output-on-failure
node --test tests/*.test.js
node scripts/sync-music-core.mjs --check --seiren ../Seiren
# From Seiren:
cmake -S plugin -B build-native -DCMAKE_BUILD_TYPE=Release
cmake --build build-native --config Release --parallel 4
ctest --test-dir build-native -C Release --output-on-failure
node --test tests/seiren-harness/*.test.mjs
```

Khimaira outputs are in `build-native/{Khimaira,KhimairaMidiFX}_artefacts/Release`; Seiren outputs are in `build-native/native/{Seiren,SeirenMidiFX}_artefacts/Release`. Tested local builds are macOS arm64, ad-hoc signed, not notarized distribution packages. Other architectures/hosts require validation.

The configure step bundles headless source modules and records their hashes in `engine.js.manifest.json`; it also derives 3,168 ARP fixtures directly from the website engine. Tests cover native MIDI scheduling, looping/live parameter changes, JS/C++ parity, 18 piano renders, legacy migration, state recall, CC64 export and actual JUCE screenshots.

For actual Logic recording verification (8-bar Cmaj7–Am7–Dm7–G7–Em7–A7–Dm7–G7, close voicing, UP/DN, 1/16, two octaves, beat accent, flow, foundation off, humanize 0, gate 82, seed 1):

```sh
node plugin/scripts/verify-logic.mjs recording.mid 0 --arp
node plugin/scripts/verify-logic.mjs recording-swing.mid 0 --arp --swing 16
node plugin/scripts/verify-logic.mjs seiren-recording.mid 0 --arp --seiren
```

The optional numeric argument chooses the first of three consecutive cycles. The original Jazz verification remains available without `--arp`. Processor capture files are unit-test evidence, **not** Logic recordings. See [acceptance status](../docs/plugin-1.3/README.md) before releasing.

Additional macOS host integration test (both 1.3 AU components must be installed):

```sh
clang++ -std=c++17 -fobjc-arc plugin/tests/native/AuHost.mm \
  -framework Foundation -framework AudioToolbox -framework CoreMIDI \
  -o build-native/au_host_test
build-native/au_host_test
```

This opens the installed AU binaries through Apple's host API. It checks all ten parameter lanes independently against actual MIDI output, state recall, legacy JSON migration, straight timing and live note release. It does not drive Logic or certify Logic's automation recording UI.
