# MORPH website release — 2026-10-28

Example LOAD now adopts the selected keyed progression as the backbone. MORPH preserves authored chord onsets, roots and slash basses, changes colour and inserts approaches that resolve to the actual next chord. RESTORE returns to that backbone and UNDO can undo LOAD. INSPIRE stays a preview; KEEP explicitly adopts it. AUTO/LOCK is retained.

This website includes the previously validated bar-grid repair, genre rhythm templates, stable AUTO chord entry and tap input. Existing performance settings are recalled; new genre templates apply when the user selects a performance pattern.

Validation before publication: KHIMAIRA 279/279 (including native JavaScript integration), SEIREN 32/32, shared-source verification 23 files, native CTest 5/5. Website coverage includes 3,924 keyed examples, all 49 genres, multi-chord/inversion/rest/density matrices, 36 real-browser key/level cases, full workflow regression, audio playback and 137 BPM MIDI export. Two Claude reviews completed; the final review reported no P0/P1 issues after protecting dominant and minor-dominant colour.

The Pages workflow runs the complete website test suite and uploads only dist/. Native plug-in source/builds are not part of this website publication. Logic and auval remain unverified for the separate 1.4 native work.

Tests intentionally replace former expectations that example LOAD retained an older backbone, that lower density could delete an authored ii, and that every seed must change inversions. Current acceptance requires original-onset root/bass preservation, at least 75% of each authored chord duration, valid target resolution and an honest exhausted-variation notice for restricted palettes. Existing golden fixtures were not regenerated.
