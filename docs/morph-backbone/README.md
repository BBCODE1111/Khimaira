# MORPH website release — 2026-10-28

Example LOAD now adopts the selected keyed progression as the backbone. MORPH preserves bar count, backbone order and authored onsets; mapped inversions, parallel borrowing and ii–V replacements may change roots and basses. Approaches resolve to the actual next target. RESTORE returns to that backbone and UNDO can undo LOAD. INSPIRE stays a preview; KEEP explicitly adopts it. AUTO/LOCK is retained.

This website includes the previously validated bar-grid repair, genre rhythm templates, stable AUTO chord entry and tap input. Existing performance settings are recalled; new genre templates apply when the user selects a performance pattern.

Validation before publication: KHIMAIRA 279/279 (including native JavaScript integration), SEIREN 32/32, shared-source verification 23 files, native CTest 5/5. Website coverage includes 3,924 keyed examples, all 49 genres, multi-chord/inversion/rest/density matrices, 36 real-browser key/level cases, full workflow regression, audio playback and 137 BPM MIDI export. Two Claude reviews completed; the final review reported no P0/P1 issues after protecting dominant and minor-dominant colour.

The Pages workflow runs the complete website test suite and uploads only dist/. Native plug-in source/builds are not part of this website publication. Logic and auval remain unverified for the separate 1.4 native work.

Tests intentionally replace former expectations that example LOAD retained an older backbone, that lower density could delete an authored ii, and that every seed must change inversions. Current acceptance requires mapped original onsets, preserved bar duration and valid target resolution; restricted palettes may exhaust their variations. Existing golden fixtures were not regenerated.

## 2026-10-31 approved replacement contract

The user explicitly superseded the 2026-10-28 root/slash-bass/75%-duration restrictions (brief, “使用者指定需求” §3). Historical validation counts above describe that release only.

MORPH acts on the entire backbone. EDIT / INVERT / COLOR / ii–V → NEXT act on the selected score chord. The number of bars, original slot order and each slot's starting beat remain fixed. Colour can coexist with inversions, same-degree parallel major/minor borrowing (including C-major Am→Ab, Em→Eb, G→Gm, Bdim→Bb), and a slot replaced by ii–V resolving to the next actual backbone target. There is no transposition, density-based deletion or skipping rests. When new techniques are used, a final backbone arrival retains its root, bass and defining core (colour-only/low keeps its root, bass and function), and the shared functional analysis identifies a cadence arrival to retain as well (including the loop-start tonic); ii–V replacement also protects its next target. Low/medium/high budgets for the new techniques are 0/25%/60% of slots (rounded down); existing colour and tail approaches keep their own density limits. Small phrases can therefore have no new technique at medium.

Each output event has `morph.source = {bar, chord, onset}` (zero-based, onset in quarter-note beats within the bar), `technique`, and, for approaches or ii–V replacements, `morph.target` in the same coordinate system. Replacements additionally identify `part: ii | V`. Degree storage, transpose and recall preserve these addresses. They are generation provenance, not a claim that a subsequent manual edit still performs the old harmonic function; KEEP establishes a new backbone and the next MORPH regenerates addresses. New original onsets remain mapped even when their root changes. No golden fixture was regenerated.

Parallel borrowing is currently defined for diatonic triads, sevenths and supported 9/11/13 extensions; altered and applied authored chords retain their colour contract, with inversion or target-based ii–V available where appropriate. The whole-chart explicit mode conversion remains a separate action. Major-to-sus colour remains the prior product choice, with the third omitted (not a claim that the chord family stayed identical).

Regional/modal styles disable tonal borrowing/replacement. Round 3 permits each source slot’s authored chord/bass tones, and restricts additional tones to the style collection. Inversions use source chord tones. Source incompatibility no longer rejects MORPH; the key and backbone are not silently retuned. RESTORE always returns the backbone. A populated backbone ignores a different length selector with an explicit notice; the length selector applies to empty generation only.

Current checks: `node --test tests/morph-backbone.test.js tests/morph-contract-v2.test.js`; full release gate: `npm run verify:web`. Browser CI is prepared for the host/CI runner; this sandbox session does not run browsers. Prior 279/279 included native integration and must not be compared with the website-only baseline (288 tests before this continuation). See `docs/reviews/ROUND1-CONTINUATION.md` for current counts and limitations.


## 2026-10-31 round 2 / web 1.0.4

Existing dominant targets (including loop targets) retain their root, bass and defining core; their incoming dominants retain function and may still be coloured, inverted or expanded to a same-target ii–V. Parallel slash basses follow the same chord-tone position. The UI exposes independent technique switches and defaults to allowing bass changes (preserve-bass is unchecked); this still permits degree-based parallel conversion. Both UI and raw API default to `preserveBass: false`. 「保留低音線」預設關閉。

Visible source/technique/target traces support restoring one whole source slot. Six recent MORPH results can be compared against the backbone and adopted with KEEP. Mobile fixed controls include MORPH, the current chart summary and feedback. Local Node validation is 315/315; browser, release tags and deployment remain unverified in this sandbox. See [round 2 evidence](../reviews/ROUND2-IMPLEMENTATION.md).

## 2026-11-01 round 3 / web 1.0.6 (round-4 online baseline)

Authored outside-collection notes are permitted per source slot; new notes remain restricted. Signature IV→iv, minor bVI→V, blues IV7 (recognized by shared analysis, even under Jazz), and resolving dominant function are protected. Approved Am→Ab and Em→Eb remain available. Modal styles can invert existing chord tones; they cannot add tonal borrowing/replacement. Inversion candidates vary with the seed. When functional protection or disabled techniques leaves the amplitude budget unused, the UI reports the actual changed-slot count and budget.

A/B is audition state and no longer adds undo entries. Live MORPH, A/B, style and UNDO replace notes on the existing beat clock, preserving fractional position and common held pitches. LOOP off cancels prefetched next-cycle attacks and bounds held tails; re-enabling before the boundary restores held duration. The chosen cue bar remains the loop start (the loop covers that bar through the chart end, matching the existing playbackSlice contract).

Close/open slash voicings retain the root; explicit Rootless may omit it. MIDI adds time signature and track names without changing its note-event pairing rules. Dense manual NEXT edits only the selected slot: three-chord bars replace it with ii–V; four-chord bars use V only. `plugin/` is untouched; consumers of the same JS engine must validate changed note outputs and live-clock integration separately.

Validation and item-by-item evidence: [round 3 implementation](../reviews/ROUND3-IMPLEMENTATION.md). Browser scripts, real devices, DAWs and SEIREN remain pending outside this checkout. Release/tag state is maintained by the host.


## 2026-11-01 round 4 / web 1.0.7 candidate

Live MORPH queues the newest score for the next bar boundary, including prefetched attacks and held tails. A/B, other edits and performance changes retain their existing immediate-clock behavior. Manual NEXT wraps to FROM BAR, without skipping an empty loop-entry bar.

Every style has explicit technique weights in `morph-profiles.js`; pitch-collection and functional guards still take precedence. The opening-tonic parallel selection rule is unchanged. The state tracks twelve recent result fingerprints (separate from the six A/B entries) and makes at most 64 attempts for a new result. Exhausted restricted palettes can still repeat. Jazz retained targets may add compatible colour without changing root, bass or defining harmony; signature IV–iv / blues protection stays intact. The old exact `C` arrival assertion was replaced with a root/core/function assertion for this requested Jazz colour change; no golden fixture was changed.

Latin dance examples tagged `modal` use their style's tonal source mode before filtering; LOAD never silently changes KEY. Flamenco continues accepting authored Phrygian bIII and major tonic chords under the per-source allowance introduced in 1.0.6. INSPIRE state and its visible preview notice survive reload. See [round 4 evidence](../reviews/ROUND4-IMPLEMENTATION.md) for counts and pending host browser checks.
