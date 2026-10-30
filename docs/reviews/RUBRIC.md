# KHIMAIRA 1.0 網站版 審核評分表

- 版本：**RUBRIC v1.0**（2026-10-31 定稿，Alec 核可權重與門檻；第 1 輪審核後再檢討）
- 適用對象：`BBCODE1111/Khimaira` 的網站版，也就是 `dist/`。網站：https://bbcode1111.github.io/Khimaira/
- 不在範圍：
  - `plugin/`（原生外掛）：目前沒有評分表。
  - `BBCODE1111/Khimaira-2.0`：目前沒有評分表。
  - SEIREN：下一輪才一起審。修改 `packages/music-core` 時仍要依 `AGENTS.md` 提醒 SEIREN 的影響。
- 修改評分表時，請把版本號改成 v1.1、v2.0 等，並在審核報告註明用的是哪一版。

## 評分表

### 2.1 項目與權重

| # | 項目 | 權重 |
|---|---|---|
| A | 和聲與樂理正確性（解析、拼字、調性判定、級數、聲部配置） | 20% |
| B | 核心流程與骨幹契約（LOAD／GENERATE／MORPH／INSPIRE／KEEP／RESTORE／UNDO） | 20% |
| C | 演奏、試聽與 MIDI 匯出 | 15% |
| D | UI／UX（桌機＋手機） | 15% |
| E | 測試與 CI | 10% |
| F | 程式品質與可維護性（含共用核心邊界、版本與文件一致） | 10% |
| G | 效能與載入 | 5% |
| H | 無障礙（鍵盤、螢幕閱讀器、對比、觸控尺寸） | 5% |
| | 合計 | 100% |

### 2.2 加權總分與及格線

- 每項給 1–5 分，可以用 0.5 分。
- **加權總分（滿分 100）= Σ（權重% × 分數 ÷ 5）**
  例：A=4、B=4、C=3.5、D=3、E=3、F=2.5、G=3、H=2 → 20×0.8 + 20×0.8 + 15×0.7 + 15×0.6 + 10×0.6 + 10×0.5 + 5×0.6 + 5×0.4 = 16 + 16 + 10.5 + 9 + 6 + 5 + 3 + 2 = **67.5**
- **門檻（Alec 已核可，第 1 輪後再檢討）**
  - **可發布**：總分 ≥ 70、A／B／C 每項 ≥ 3、沒有未解決的 P0。
  - **穩定版（tag web-vX.Y.Z）**：總分 ≥ 80、A／B 每項 ≥ 4、沒有未解決的 P0／P1。
  - A 或 B 只要有一項 ≤ 2，不論總分多少都判「不及格」（核心價值失效）。
- 無法驗證的項目標 **N/V**，不給分，該項權重從分母扣掉；並在報告裡寫明原因。如果 N/V 的權重合計超過 20%，這次審核只算「部分審核」。

### 2.3 各項錨點與驗證方法

> 只寫 1、3、5 分的樣子；2、4 分介於其間。

#### A. 和聲與樂理正確性（20%）
範圍：`packages/music-core/core.js`、`dist/music.js`、`dist/solutions.js`、`dist/degree-chart.js`、`dist/key-detection.js`、`dist/voicing.js`、`dist/scale-library.js`

- **5 分**：
  - `docs/key-detection-theory.md` §2.3 的常見型態全部判對；`tests/key-detection-cases.json` 每個案例都落在可接受答案內，模稜兩可的關係大小調給出第一優先答案。
  - 次屬和弦依目標字母級數拼字（例如 C 調的 V/ii 是 A7，不是 Bbb7 這類錯拼）；升降記號依調性選擇（F 調用 Bb，不用 A#）。
  - 羅馬級數大小寫、ø、°、借用和弦（♭VI、iv）標示正確。
  - 聲部配置符合 README 的規則：最多五音、最低 E3、低音與上聲部至少隔八度、延伸音放在核心和弦音上方。
  - 地域調式的自由改寫不會跑出預設音集。
- **3 分**：常見流行／爵士進行判對，但有 1–3 類邊界情況判錯，例如：
  - 只有 IV–V、沒有 I 的進行；
  - 小調 V7 被判成關係大調；
  - 減七拼字錯；
  - 斜線和弦低音被當成根音。
  這些錯誤會造成錯的級數或怪的拼字，但不會讓 MIDI 音高錯。
- **1 分**：常見進行（I–V–vi–IV、ii–V–I）判錯調；和弦音高錯（例如 `Cm(maj7)` 少了 B）；拼字經常不合調性；MIDI 裡出現與和弦符號不符的音。

**驗證方法**
1. 跑 `npm test`，特別看 `key-detection`、`music-core`、`chord-input`、`degree-chart`、`world`、`dark-styles` 這幾組。
2. 跑 `npm run music:check`。
3. 自己另外準備至少 10 組**不在 fixture 裡**的進行，在網站或 Node REPL 裡檢查調性、級數和拼字。這些進行要涵蓋：
   - 小調 ii°–V–i；
   - 借用 iv；
   - 次屬鏈 III7–VI7–II7–V7；
   - 三全音代理；
   - Andalusian 終止；
   - 12 小節藍調；
   - 斜線和弦。
4. 抽查 MIDI 匯出的實際音高是否符合和弦符號。

#### B. 核心流程與骨幹契約（20%）
範圍：`dist/harmony-state.js`、`dist/backbone-mutation.js`、`dist/harmony-actions.js`、`dist/keyed-examples.js`、`dist/app.js`；規格以 `AGENTS.md`「MORPH 契約」和 `docs/morph-backbone/README.md` 為準

- **5 分**：
  - 使用者輸入的骨幹在任何 GENERATE／MORPH 後都保留每個原和弦的起拍、根音和指定低音；變化只是上色，或在尾端加入解決到下一個實際目標的經過和弦。
  - GENERATE 不會移調；屬功能和弦（V、次屬）不會被染成 maj7。
  - INSPIRE 只預覽，KEEP 才採用；RESTORE 一定回到目前骨幹；UNDO 可以退回 LOAD 之前。
  - 範例 LOAD 依目前 KEY 移調並成為新骨幹。
  - KEY 預設 AUTO，只有按 LOCK 才鎖定；選主音會移調，同時保留 AUTO／LOCK 狀態。
  - 「ii–V → NEXT」空間不足時保留原譜並提示；LOOP 關閉時最後一小節不連回開頭。
  - 舊存檔（v3／v4）可以正常遷移。
- **3 分**：主要流程正常，但有 1–2 個契約破口，例如：
  - 高變化幅度下偶爾刪掉原和弦；
  - RESTORE 回到錯的版本（LOAD 前的而不是目前骨幹）；
  - UNDO 層數不完整；
  - INSPIRE 預覽時偷偷改了存檔狀態。
- **1 分**：MORPH／GENERATE 會改掉骨幹根音或順序、自行移調；RESTORE／UNDO 失效；重新整理後進度消失或舊存檔讀不進來。

**驗證方法**
1. 跑 `npm test`，看 `morph-backbone`、`harmony-state`、`generate-key`、`keyed-examples`、`actions`、`exploration`、`key-transition-stress`。
2. 在瀏覽器手動走一遍：輸入 `| C | Am | F | G |` → GENERATE（Jazz／Rock／Requiem 各一次）→ 檢查骨幹 → INSPIRE → 不按 KEEP 重新整理 → RESTORE → UNDO。
3. 如果有 Playwright，跑 `scripts/verify-morph-browser.cjs`。
4. 用舊版 localStorage 資料（`khimaira-v4`）測試遷移。

#### C. 演奏、試聽與 MIDI 匯出（15%）
範圍：`dist/performance.js`、`dist/performance-grid.js`、`dist/genre-rhythm.js`、`dist/arpeggiator.js`、`dist/piano-motion.js`、`dist/piano.js`、`dist/tempo-player.js`、`dist/transport.js`、`dist/music.js`（`midiBytes`）

- **5 分**：
  - 試聽和 MIDI 用同一份音符資料，匯出結果與試聽一致。
  - MIDI 是 480 PPQ，寫入使用者目前 BPM；SUSTAIN 準確填滿每個和弦的拍數。
  - Bass／Chords 分軌正確，同音重複攻擊不會互相截斷。
  - 播放中改 BPM 不跳拍；PLAY 在播放中會從起播點重來；空白鍵在輸入欄內仍用來打字。
  - ARP 的 11 種模式和三連音等距；RANDOM／WALK 按 VARIATE 後，重播和匯出都是同一組音序。
  - 各樂風節奏聽起來確實不同（`docs/genre-rhythm-theory.md`）。
  - 在 Logic 或其他 DAW 拖入檔案後，長度和小節對齊都正確。
- **3 分**：
  - 一般播放和匯出正確，但有可聽出的小問題，例如：
    - 某幾個樂風的 GATE／延音讓換和弦前整段消音；
    - Lo-fi 延遲、swing 的拍點偏移；
    - 長時間 LOOP 後拍點漂移。
  - 或分軌、tempo 事件有一種情況錯。
- **1 分**：試聽和 MIDI 內容不一致；MIDI 在 DAW 中長度或速度錯、音符卡住（note-off 遺失）；播放卡頓或無法停止。

**驗證方法**
1. 跑 `npm test`，看 `midi-tempo`、`tempo`、`arpeggiator`、`genre-rhythm`、`performance-grid`、`piano-audit`、`piano-phrase`、`continuity`。
2. 匯出 3 種 `.mid`（目前演奏、SUSTAIN、分軌），用 MIDI 解析器（例如 `packages/piano-motion/midi-test-reader.mjs` 或 Python `mido`）檢查 PPQ、tempo、note on／off 成對與總長度。
3. 用耳朵聽：Jazz、Funk、Deep House、Heavy Metal、ARP 1/24 各 8 小節。
4. 無法在 DAW 實測時，DAW 這部分標 N/V。

#### D. UI／UX（15%）
範圍：`dist/index.html`、`dist/*.css`、`dist/chord-picker.js`、`dist/app.js`
Alec 的既定要求：介面以英文為主、精簡、有設計感（希臘雕刻風）；桌機和手機都要完整可用；KEY 只出現在播放欄；不會打和弦符號的人也能用點選方式輸入。

- **5 分**：
  - 主要流程「輸入／選範例 → 生成 → 試聽／匯出」三步內完成，第一次使用不用讀說明。
  - 進階功能（進階和聲、演奏細節、吉他工具、Chord Melody）都收在展開區，畫面不擁擠。
  - KEY 只在播放欄出現一次。
  - 不打字也能點選每小節來建立和弦。
  - 在 375×667 手機直式畫面上，和弦列、PLAY／STOP／LOOP／MIDI 都不需要橫向捲動，觸控目標 ≥ 44px。
  - 錯誤輸入（例如 `| H7 |`）有清楚提示，不會讓畫面壞掉。
  - 中英文文案統一，沒有殘留的開發用字。
- **3 分**：桌機好用；手機能用但有 1–2 處重疊、被截斷或需要捲動才看得到主要按鈕；或某些控制項名稱不直觀（例如 LOAD／KEEP／RESTORE 的差異要讀 README 才懂）；或錯誤輸入時沒有提示。
- **1 分**：手機主要功能不能用；主要流程找不到入口；KEY 或狀態顯示自相矛盾；錯誤輸入會讓整個畫面當掉。

**驗證方法**
1. 在 1440×900 和 390×844 兩種畫面各截一張圖（Playwright 或 Chrome DevTools 裝置模擬）。
2. 在手機上完整走一次主要流程。
3. 輸入 5 種錯誤或邊界資料（空白、未知和弦、一小節超過 4 拍、極長進行、只有 N.C.），看有沒有提示。
4. 和 `docs/screenshots/` 比對，看有沒有視覺退化。
5. 實體手機（iOS Safari／Android Chrome）沒測時標 N/V。

#### E. 測試與 CI（10%）
- **5 分**：
  - `npm test` 全過，CI 部署前也會擋。
  - A／B／C 的每條契約都有對應的測試。
  - 關鍵瀏覽器流程（播放、MIDI 下載、手機版面）在 CI 自動跑，Playwright 也列進 `package.json` 的 devDependencies。
  - 修 bug 時會附回歸測試；golden fixture 不會為了讓測試通過而重製（`AGENTS.md`）。
  - 會檢查 Khimaira 和 SEIREN 的共用核心有沒有失去同步。
- **3 分**（目前大致在這裡）：Node 單元測試完整而且有 CI 擋，但瀏覽器測試只能手動跑、沒有在 CI；部分 UI 行為沒有自動測試；新功能偶爾沒附測試。
- **1 分**：測試跑不過或被跳過；CI 不擋部署；新功能完全沒測試；或為了通過而改 fixture。

**驗證方法**
1. 跑 `npm test`，記錄通過數和時間；這次的基準是 264 項全過，約 25 秒。
2. 看 `.github/workflows/pages.yml`。
3. 列出這次修改涉及的模組，逐一確認有沒有對應測試。
4. 跑 `git log -p -- tests/` 查看有沒有 fixture 被大量改寫。

#### F. 程式品質與可維護性（10%）
- **5 分**：
  - 樂理只存在於 `packages/music-core/core.js`，`dist/music-core.js` 只靠同步產生，`music:check` 通過。
  - 每個模組職責單一，沒有重複邏輯（例如 `dist/piano-motion-v1.js` 和新版之間有清楚的相容邊界）。
  - 程式可讀：一行不塞多個敘述，主要函式有名稱和簡短說明。
  - `dist/version.json`、README、tag、`?v=` 快取字串和實際發布內容一致。
  - 沒有用不到的大檔案或死碼。
  - `AGENTS.md` 的規則都有遵守。
- **3 分**：架構清楚、模組有切分，但程式很密不好審（`dist/app.js` 一行數千字元）；版本號沒跟著發布更新；`?v=` 快取字串不一致；`dist/` 有沒用到的資產。
- **1 分**：樂理邏輯在多處各寫一份而且互相矛盾；直接手改 `dist/music-core.js`；全域狀態到處被修改；版本與實際發布對不上，而且無法追溯。

**驗證方法**
1. 跑 `npm run music:check`。
2. 用 `grep` 找重複的樂理函式。
3. 檢查 `dist/version.json` 與 `git tag`、`git log` 是否一致。
4. 用 `awk '{print length}'` 找超長行。
5. 列出沒有被 HTML／CSS／JS 引用的 `dist/` 資產。

#### G. 效能與載入（5%）
- **5 分**：
  - 首次載入在一般 4G 網路約 3 秒內可以操作；採樣按需要載入，或有載入提示。
  - 長進行（32 小節以上）GENERATE 不會卡頓（主執行緒工作 < 200 ms）。
  - 播放時 CPU 穩定，不會掉音。
  - 部署內容裡沒有沒用到的大圖。
- **3 分**：桌機流暢；手機首次載入偏慢（背景大圖、全部採樣一次載入）；有沒用到的資產被部署；長進行偶爾延遲但還能用。
- **1 分**：手機開不起來或操作卡頓；播放掉音、拍點延遲明顯。

**驗證方法**
1. 用 Chrome DevTools Lighthouse（行動版）測首次載入。
2. 在 Network 面板記錄總傳輸量。
3. 用 Performance 面板錄一次 GENERATE（32 小節）和 1 分鐘播放。
4. 參考 `scripts/measure-performance-grid.mjs`。

#### H. 無障礙（5%）
- **5 分**：
  - 所有控制項都能只用鍵盤操作，focus 可見。
  - 只有圖示的按鈕有 `aria-label`；切換鈕（PLAY、LOOP）有 `aria-pressed`；狀態變化有 `aria-live`。
  - 和弦選擇器是可存取的對話框（焦點移入／移出、Esc 關閉）。
  - 半透明面板上的文字對比 ≥ 4.5:1。
  - `lang` 設定和介面語言相符。
- **3 分**：主要按鈕可以用鍵盤操作，也有部分 ARIA（目前 `index.html` 有 14 個 `aria-label`、4 個 `aria-live`、1 個 `aria-pressed`）；但和弦選擇器、吉他指板、展開區的鍵盤操作或對比不完整。
- **1 分**：必須用滑鼠或觸控；主要按鈕沒有可讀名稱；對比嚴重不足。

**驗證方法**
1. 跑 Lighthouse Accessibility 或 axe DevTools。
2. 只用 Tab／Enter／Esc／空白鍵完成主要流程。
3. 用 macOS VoiceOver 抽查 PLAY、KEY、和弦選擇器。


---

## 附錄：KHIMAIRA 1.0 網站版現況（訂定評分表時的基準，commit `cd03df0`）

**定位**：給作曲、編曲和吉他手用的和聲探索工具。輸入一條和弦進行（骨幹），依樂風變化、試聽，再匯出 MIDI 進 DAW。純靜態網站，沒有建置步驟；`dist/` 就是原始碼，全部是 ES modules（`README.md`「本機啟動」、`package.json` 的 `start`）。

| 功能 | 實際內容 | 主要檔案 |
|---|---|---|
| 和弦輸入與解析 | 文字譜 `\| C:2 Dm7:1 G7:1 \|`（小節內拍數）、羅馬級數輸入、快速進行（I–V–vi–IV 等）；可解析 `Csus`、`C+`、`C°`、`Cm(maj7)`、`C-7`、`Cadd2` 等寫法；`Am`／`AM` 分大小寫 | `dist/solutions.js`、`dist/degree-chart.js`、`dist/chord-input.js`、`dist/music.js` |
| 點選換和弦 | 點和弦譜上的和弦，用選擇器換根音、種類、斜線低音、延伸音；可分割、刪除、UNDO | `dist/chord-picker.js`、`dist/chord-picker.css` |
| 共用樂理核心 | 音名、拼字、和弦音、功能分析；和 SEIREN 共用，唯一來源是 `packages/music-core/core.js`，同步到 `dist/music-core.js` | `packages/music-core/`、`scripts/sync-music-core.mjs`、`AGENTS.md` |
| 調性判定與級數 | AUTO／LOCK，先做功能分析（ii–V–I 等）再判定調性；調性只顯示在播放欄；和弦格顯示羅馬級數 | `dist/key-detection.js`、`dist/harmony-state.js`、`docs/key-detection-theory.md`、`tests/key-detection-cases.json`（人工標註案例） |
| LOAD／GENERATE／MORPH／INSPIRE／KEEP／RESTORE／UNDO | 骨幹契約：MORPH 保留每個原和弦的起拍、根音、指定低音，只上色或在尾端加經過和弦；INSPIRE 只是預覽，按 KEEP 才採用；RESTORE 回骨幹 | `dist/backbone-mutation.js`、`dist/harmony-state.js`、`dist/harmony-actions.js`、`docs/morph-backbone/README.md`、`AGENTS.md`「MORPH 契約」 |
| 樂風 | 48 種（Jazz、Gospel、Bossa、Rock、Mandopop、K-pop、Blues、黑暗／重型 6 種、地域調式 17 種…），各有和聲配方與節奏 | `dist/style-engine.js`、`dist/world-styles.js`、`dist/world-generator.js`、`dist/dark-styles.js`、`dist/genre-rhythm.js`、`docs/genre-rhythm-theory.md` |
| 範例庫 | 382 組範例，標題用「Ex1 · 明亮・輕快」，不顯示歌名；LOAD 時依目前 KEY 移調 | `dist/song-pool.js`、`dist/contrast-examples.js`、`dist/example-pool.js`、`dist/example-titles.js`、`dist/keyed-examples.js` |
| 局部 ii–V、轉位、平行大小調色彩、大小調轉換 | 「ii–V → NEXT」依下一個目標產生；目標空間不夠時保留原譜並提示 | `dist/harmony-actions.js`、`dist/mode-conversion.js`、`dist/harmony-knowledge.js` |
| 聲部配置（voicing） | 延伸音上聲部省略根音、上聲部最多五音、最低 E3、低音與上聲部至少隔八度 | `dist/voicing.js`、`dist/music.js`（`pianoVoicing`） |
| 演奏方式 | 長音、swing comping、Bossa、Funk、Lo-fi、POP／TEXTURE 鋼琴樂句、ARP（11 種音序、1/4～1/32 含三連音、1–4 個八度）；GATE、SWING、HUMAN FEEL | `dist/performance.js`、`dist/performance-grid.js`、`dist/piano-patterns.js`、`dist/piano-motion.js`（來自 `packages/piano-motion/`）、`dist/arpeggiator.js` |
| 試聽 | Web Audio＋Salamander 鋼琴採樣（`dist/audio/*.mp3`，CC BY 3.0）；播放中可改 BPM（30–260）、LOOP、從選定小節播放、空白鍵切換播放／停止 | `dist/piano.js`、`dist/tempo-player.js`、`dist/transport.js`、`dist/research.html`（授權標示） |
| MIDI 匯出 | SMF、480 PPQ、寫入目前 tempo；「目前演奏」和 SUSTAIN（原樣長音）兩種；可分成 Bass／Chords 兩軌（Type 1）；CC64 延音踏板；吉他按法 MIDI | `dist/music.js`（`midiBytes`）、`tests/midi-tempo.test.js` |
| 吉他工具 | 每個和弦的相容／色彩音階、完整音名、五個 CAGED 區域、六線譜；Chord Melody 四音按法 | `dist/scale-library.js`、`dist/guitar-melody.js`、`dist/music.js`（`guitarShapes`）、`dist/piano-tools.js` |
| 存檔 | localStorage `khimaira-v5`，會遷移 v3／v4 的舊存檔 | `dist/app.js` 第 32、47 行；`migrateHarmony`（`dist/harmony-state.js`） |
| 版面 | 桌機用寬版和弦譜；手機直式用固定和弦列＋底部 PLAY／STOP／LOOP／MIDI；`lang="zh-Hant"`，介面以英文為主 | `dist/index.html`、`dist/theme.css`、`dist/odyssey.css`、`dist/ivory.css`、`dist/key-controls.css` |

**測試與 CI（實際狀況）**
- 單元／回歸測試：`tests/*.test.js` 共 33 個檔、264 項，用 `node --test` 跑，不需要裝任何依賴。
- 瀏覽器測試：`tests/browser-*.cjs`（5 個）和 `scripts/verify-*-browser.cjs`（11 個）用 Playwright＋本機 Chrome，但 `package.json` 沒有列 Playwright，**也沒有放進 CI**，只能手動跑。
- CI：推送 `main` 時，`.github/workflows/pages.yml` 會先跑 `node --test tests/*.test.js`，通過才部署 `dist/` 到 Pages。`plugin.yml` 是外掛建置，不在本表範圍。
- 沒有 lint／formatter 設定，也沒有型別檢查。
- 有共用核心一致性檢查：`npm run music:check`。

**評分時要知道的事實**
- 程式寫得很密：`dist/app.js` 42 KB 但只有 235 行，最長一行約 3,000 字元。所以「行號」當證據不夠精確，必須同時寫出**函式名或識別字**。
- `dist/` 裡有約 9.4 MB 的 `.png`（`temple-blue.png`、`khimaira-bronze.png` 等），網站的 HTML／CSS／JS 都沒有引用，實際載入的是 `.webp`。它們還是會隨 Pages 一起部署。
- 匯入路徑用 `?v=morph-1`、`?v=17` 這類查詢字串清快取，版本字串並不一致。
- `docs/` 有多份 Codex 驗證報告（`docs/*/REPORT.md`、截圖、`.mid`），可以當參考，但審核者應該自己重驗，不要直接採信。

