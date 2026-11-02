# Website language switching

The header offers Traditional Chinese and English. A first visit defaults to Traditional Chinese; `khimaira-language` remembers a choice independently from the musical session. The About page shares the preference. Storage failures do not prevent switching.

`dist/i18n-catalog.js` contains the translated UI copy. `dist/i18n.js` localizes text nodes and accessible attributes, retaining their source text across switches and translating newly rendered controls/messages. Numeric templates are translated before reusable phrase fragments. It does not rebuild musical state, edit input values, modify chord symbols, change IDs or stop audio. Implicit option values are preserved before their labels change. Imported MIDI track names opt out with `translate="no"`.

When adding visible copy, add its translations and any parameterized template here; keep saved IDs and musical symbols independent from display labels. `tests/browser-i18n.cjs` checks all style and pattern choices for leftover Chinese in English, editors, piano/guitar tools, persistent language, unsaved drafts, live playback continuity, byte-identical MIDI, mobile overflow, About and restricted storage. Run it through `npm run test:browser`. The existing harmony and playback contracts remain covered by `npm run verify:web`.

This change starts from website commit `90e15ee` (1.0.11), not an older local development checkout. Web assets advance to 1.0.12. Shared musical engines and native plug-in behavior are unchanged.

Validated on 2026-11-03: shared-asset checks, web-asset checks, ESLint, all 398 Node tests, and the complete browser suite passed with local Chrome. Browser coverage includes the existing R02–R08 regressions, score follow at 320px, touch targets, accessibility, cold 4G loading, loop timing, and the new bilingual scenarios. Switching to Chinese keeps the AUTO key button at least 44px wide. Desktop screenshots were also inspected in Chrome. Deployment is verified separately through GitHub Pages and the live site.
