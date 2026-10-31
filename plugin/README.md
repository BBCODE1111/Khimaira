# KHIMAIRA 1.5 Native Preview

A native JUCE desktop editor, standalone piano app, AU MIDI FX and VST3 instrument. The editor has no WebView, HTML or browser runtime. Its headless harmony engine bundles the current web 1.0.5 pure JavaScript modules; audio/MIDI scheduling and every visible control are native C++/JUCE.

This preview targets **Khimaira only**. The existing Seiren workspace and installed Khimaira 1.3 remain separate. Historical architecture: [previous native README](../docs/native-desktop-1.5/PREVIOUS-NATIVE-README.md). Current scope and verification: [desktop handoff](../docs/native-desktop-1.5/README.md).

## Build

Requires Node, CMake, a C++17 compiler, macOS 12.3+ and JUCE 8.0.15. Khimaira builds use fonts and piano samples inside this repository. JUCE is fetched from its official repository unless supplied with `-DJUCE_DIR=/path/to/JUCE`.

```sh
npm ci --prefix plugin
cmake -S plugin -B build-desktop -DCMAKE_BUILD_TYPE=Release
cmake --build build-desktop --parallel 6
ctest --test-dir build-desktop --output-on-failure
node --test tests/*.test.js
node --test plugin/tests/harmony-engine.test.mjs plugin/tests/native-contract.test.mjs
```

The last JavaScript parity suite also checks the historical Seiren adapter and expects the existing sibling `Seiren` checkout. The Khimaira CMake build itself does not require it.

## Formats

- Standalone: embedded Salamander piano preview, local tempo by default, project open/save, MIDI drag/export.
- AU MIDI FX: `aumi / Km15 / Khmr`, bundle `music.khimaira.preview15.midifx`. Place before a software instrument in Logic. This format has no audio bus or internal piano output.
- VST3: instrument/generator with MIDI output and an optional piano monitor (off by default). It is not a VST MIDI insert. MIDI routing depends on the host.
- Local macOS previews are ad-hoc signed. Developer ID signing/notarization and Windows/Intel builds are not part of this delivery.

## Controls and architecture

The score remains above the workspace, scrolls horizontally and highlights the playing chord independently of selection. Manual scrolling pauses follow until **Resume follow**. A fixed transport exposes preview/stop/loop, key/transpose/AUTO, tempo sync and DAW start anchors. The Harmony and Performance tabs use real reflow/scrolling at small sizes, with no affine scaling of tiny controls.

Harmony includes the web 1.0.5 backbone contract, MORPH switches, exploration/density, keyed examples, INSPIRE/KEEP/RESTORE/UNDO, six-result A/B history and per-chord editing/inversion/parallel/ii–V/source restoration. Performance includes native ARP automation and the 18 piano phrase/fill templates, voicing, groove/gate/human and MIDI pedal export.

The 14 existing APVTS parameter IDs/ranges/order are retained. Native project files serialize the shared harmony state, performance settings, automation and piano preferences. Preview identities deliberately do not replace old DAW instances.

Audio decoding occurs in `prepareToPlay`, never in `processBlock`. Piano voices are pre-created. MIDI generation still uses the existing sample/PPQ scheduler; editor timers only draw the playhead. The embedded engine adds a standard `findLast` compatibility implementation for JUCE's QuickJS. No browser shims are introduced.

See [THIRD-PARTY-NOTICES](../docs/native-desktop-1.5/THIRD-PARTY-NOTICES.md) for piano/font attribution.
