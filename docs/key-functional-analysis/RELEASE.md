# Functional key detection correction — 2026-10-28

The detector and Roman-function display now share `analyzeHarmony` in music-core 1.1.0. Secondary dominants, ii–V groups, loop resolution, borrowed cadences and tritone substitutes contribute to the same candidate-relative analysis. For example, `Dm | G | C | A7` is C major with `ii V I V7/ii`; GENERATE retains that key.

Generated substitutes resolving to Dm/Gm use Eb7#11/Ab7#11, preserving extensions. Inversion labels use note names (`ii11/G`, `Imaj7/D`); canonical bass degrees and legacy numeric input remain supported. Explicit A/B section ranges are analyzed independently, without transposition. There is no automatic section-boundary editor.

The original 28 cases, all five reported errors, all 17 theory examples and 36 new human-labelled cases pass. The new and reported cases also pass in all 12 transpositions (492 checks). Four A/B examples produce eight correct section results. The complete original 30-case list was not supplied, and RS 200 was not acquired; neither is claimed as verified.

Local validation: 186 combined website/native JS tests, 32 SEIREN tests, native CTest 5/5 for each product, 108 unchanged old native renders, nine focused browser scenarios, the existing eight website workflow groups, 48 browser key changes/144 GENERATE clicks, and an upgrade test with cached old JavaScript. Desktop/mobile screenshots were inspected before publication. Website MIDI still exports the selected 137 BPM. This website release does not install the development plug-ins or deploy SEIREN.

Specification: [key-detection-theory.md](../key-detection-theory.md). Fixed cases: [functional-key-cases.js](../../tests/functional-key-cases.js). Full local evidence is kept in the workspace's `docs/key-functional-analysis/` directory; external copyrighted corpora are not included.
