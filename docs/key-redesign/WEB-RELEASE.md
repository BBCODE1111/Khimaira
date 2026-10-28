# KEY / BACKBONE website update — 2026-10-28

One KEY control in the playback strip; explicit transposition, AUTO/LOCKED and pitch-preserving reinterpretation. GENERATE develops the backbone, INSPIRE explores compatible examples/fusions, example LOAD keeps the backbone, RESTORE returns to it in the current key, and KEEP requires confirmation. Website MIDI retains the user's tempo. Old local storage and piano rendering remain compatible.

Additional transition audit: 4,320 repeated transpositions; 24 keys × 49 styles including LOW/MEDIUM/HIGH, examples, INSPIRE, RESTORE/UNDO/recall; 3,528 generated-score mode conversions; 48 real-browser key/mode transitions, 144 GENERATE clicks and 48 INSPIRE/RESTORE/UNDO/reloads. Tests found and fixed unsupported minor 6/9 and sharp-11 spellings after mode conversion. Derived chords are validated before changing the website's active state.

Deployment contains website code and tests only. Native 1.4 transport work is a separate local change, not part of this publication.
