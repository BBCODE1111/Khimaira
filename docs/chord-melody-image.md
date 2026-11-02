# Chord melody image export

The website’s Chord Melody panel offers a PNG download of the current score and its displayed guitar voicings. With no current arrangement, the existing generator runs once and the result stays visible. Subsequent exports preserve those exact frets. A score edit invalidates the arrangement through the existing flow; the next export generates from the new score.

The export snapshots the score, voicings, language, key and tempo before asynchronous work. It includes each chord occurrence, its position and duration, complete chord tones as defined by the existing shared theory, separate slash bass, actual voicing tones and highest melody pitch. Rest bars and missing voicings remain explicit. Shared theory and guitar generation are unchanged; no Seiren or native plug-in changes.

Canvas renders a single opaque PNG using local system fonts and vector drawing, without external images, uploads or an image service. A multirow sheet includes all 64 positions in the maximum 16-bar score. Resolution adapts within 15 million pixels and 16,000 pixels per side for mobile canvas support. The exporter is loaded only on demand.

Verification: dedicated model tests cover exact voicings, extended-chord omissions, spelling, slash bass, repeated chords, timing, rests, stale voicings and all 64 slots. The browser test downloads real Chinese/English PNGs, compares repeat exports byte for byte, confirms state preservation and automatic generation, regenerates after score changes, and checks mobile layout and maximum canvas dimensions. Artifacts are saved outside the checkout. The full release gate is the shared-asset check, web-asset check, ESLint, Node tests and browser suite.

2026-11-03 local validation passed: both asset checks, ESLint, 402 Node tests and all six browser-suite entry points in Chrome. The downloaded Chinese sheet and the mixed-chord English sheet were visually inspected; the button was also used in the browser UI. Website version: 1.0.13. GitHub Pages and the live download are verified separately after publication.
