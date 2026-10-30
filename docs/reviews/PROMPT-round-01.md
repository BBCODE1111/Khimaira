# 第 1 輪審核提示（KHIMAIRA 1.0 網站版）

> 使用方式：把「提示開始」到「提示結束」之間的全文貼給 Claude。評分表全文已附在最後，Claude 不需要另外去抓。

<!-- 提示開始 -->

你是資深前端工程師，也是音樂理論審核者。這次要做 **KHIMAIRA 1.0 網站版的第 1 輪審核**。KHIMAIRA 是和弦探索與 MIDI 匯出工具。

請依附錄的 **RUBRIC v1.0** 打分，並提出修改建議。之後會由 Codex 或「程式與自動化」依你的建議修改，再請你複審。所以每條建議都要具體到能直接動手，並寫出可以檢查的驗收標準。

## 一、審核對象

| 欄位 | 值 |
|---|---|
| Repo | https://github.com/BBCODE1111/Khimaira （public） |
| 審核 commit | `cd03df044cfe506c1ab040abd144ed7820179202`（`cd03df0`，2026-10-28 18:16 台北時間，`main` HEAD） |
| 範圍 | **1.0 網站版**：`dist/`、`packages/music-core/`、`packages/piano-motion/`、`tests/`、`scripts/`、`.github/workflows/pages.yml`、`package.json`、`README.md`、`AGENTS.md` |
| 不在範圍 | `plugin/`、`.github/workflows/plugin.yml`、`tests/browser-plugin*.cjs`、Khimaira-2.0 repo、SEIREN（下一輪才審） |
| 網站 | https://bbcode1111.github.io/Khimaira/ 。網站部署的是 `main` 最新版；如果 `main` 已經比 `cd03df0` 新，網站就不等於審核 commit，請在報告裡註明 |

- 取得程式：`git clone https://github.com/BBCODE1111/Khimaira.git && cd Khimaira && git checkout cd03df0`
- 如果之後 `main` 只多了 `docs/reviews/` 的文件 commit，審核對象不受影響，仍以 `cd03df0` 的程式為準。

**必讀規格**（違反這些規格的建議不能提）：
- `AGENTS.md`
- `packages/music-core/README.md`
- `docs/key-detection-theory.md`
- `docs/genre-rhythm-theory.md`
- `docs/morph-backbone/README.md`
- `docs/piano-audit-20261027.md`

## 二、規則

1. 只根據你實際讀過的程式、實際跑過的指令、實際看過的畫面下結論。不要編造檔名、函式、行號、測試結果或使用者回饋。
2. 每個判斷都要附證據，格式是 `檔案路徑:行號` 加上函式名或識別字，或是指令與輸出摘要。這個 repo 的程式很密，`dist/app.js` 42 KB 只有 235 行、最長一行約 3,000 字元，只寫行號找不到位置，一定要附識別字。
3. 沒辦法驗證的項目標 **N/V** 並說明原因，不要猜分數。N/V 的權重從分母扣掉；N/V 權重合計超過 20% 時，判定為「部分審核」。
4. 樂理問題要寫具體例子：輸入的進行 → 實際輸出 → 應該是什麼，以及理由。
5. 下列建議一律不能提：
   - 手改 `dist/music-core.js`（應該改 `packages/music-core/core.js` 再執行 `npm run music:sync`）；
   - 重製 golden fixture 讓測試通過；
   - 把 Khimaira 的生成策略整份蓋到 SEIREN；
   - 讓 GENERATE 移調；
   - 讓 MORPH 改掉骨幹的根音、順序或指定低音。
6. 不要改程式，不要開 PR、issue 或留言，只輸出審核報告。執行測試時如果產生檔案（瀏覽器腳本會寫進 `docs/`），審核完請用 `git checkout -- docs && git clean -fd docs` 還原，報告裡也要註明。
7. `docs/` 裡的 `REPORT.md` 與 `.txt` 是開發者自己留的驗證紀錄，只能當線索，結論要自己驗證。
8. 第四節列出的 4 個已知問題，請直接「確認或調整」，不要當成你自己發現的問題重寫一遍。
9. 用繁體中文（台灣用語）撰寫。

## 三、執行與驗證步驟（你可以執行指令，也可以開瀏覽器：A–H 八項全部評分）

1. 執行 `node --version`（需要 Node 20 以上；基準環境 Node 24 的結果是 `npm test` 264 項全過，約 25 秒）。
2. 執行 `npm test` 和 `npm run music:check`，記錄通過、失敗與時間。
3. 執行 `python3 -m http.server 5175 --directory dist`。腳本把網址寫死成 `127.0.0.1:5175`。
4. 跑 Playwright 腳本，至少這三支：`tests/browser-qa.cjs`、`tests/browser-stable.cjs`、`scripts/verify-morph-browser.cjs`。腳本用 `channel:'chrome'`，需要本機安裝 Chrome，必要時先執行 `npm i -D playwright`，但不要 commit。另外依 RUBRIC 各項的「驗證方法」手動操作主要流程。
5. 在 1440×900 和 390×844 兩種畫面各截一張圖，用 Lighthouse（行動版）測效能與無障礙。
6. 匯出三種 `.mid`（目前演奏、SUSTAIN、Bass／Chords 分軌），解析並檢查 PPQ、tempo、note on／off 是否成對、總長度。
7. A 到 H 八項全部評分。

萬一某一步在你的環境意外失敗（例如 Chrome 無法啟動），只把受影響的項目依規則 3 標 N/V，並寫明失敗的指令與錯誤訊息。不要因此跳過其他項目。

## 四、已知問題（Alec 已決定列入第 1 輪）

以下 4 項是審核前就確認存在的問題，優先級由 Alec 決定。請你：
- 核對證據是否屬實；
- 視需要修正建議修法或驗收標準；
- 如果你認為優先級應該調整，寫出理由，但保留原本的優先級，由 Alec 決定。

報告的修改清單要用同樣的編號。你自己發現的新問題從 `R01-P0-1`、`R01-P1-3`、`R01-P2-3` 往下接著編號。

### R01-P1-1　瀏覽器測試沒有進 CI
- **項目**：E（測試與 CI），連帶影響 C、D。
- **問題**：網站的主要互動（播放、停止、LOOP、MIDI 下載、手機版面、MORPH 流程）只有手動腳本，部署前沒有自動檢查。
- **證據**：
  - `.github/workflows/pages.yml` 的 build job 只跑 `node --test tests/*.test.js`。
  - `package.json` 沒有 `devDependencies`，也沒有 Playwright。
  - 共有 16 支 Playwright 腳本：
    - 網站用 14 支：`tests/browser-qa.cjs`、`tests/browser-review2.cjs`、`tests/browser-stable.cjs`，以及 `scripts/verify-*-browser.cjs` 共 11 支；
    - 外掛用 2 支：`tests/browser-plugin.cjs`、`tests/browser-plugin-1.2.cjs`，不在本次範圍。
  - 腳本寫死 `http://127.0.0.1:5175` 和 `channel:'chrome'`，並把截圖與 `.mid` 直接寫進 `docs/review-20261026/`、`docs/stable-20261027/` 等證據資料夾。直接搬進 CI 會覆蓋這些證據。
- **建議修法**：
  1. 在 `devDependencies` 加入 Playwright，並提交 lockfile。
  2. 新增 `npm run test:browser`：自動啟動 `dist/` 的靜態伺服器，依序執行網站用的瀏覽器腳本。
  3. 網址、瀏覽器 channel、輸出資料夾改用環境變數（例如 `BASE_URL`、`BROWSER_CHANNEL`、`OUT_DIR`），預設不寫進 `docs/`。
  4. 在 `pages.yml` 新增 browser job，`deploy` 要等 build 和 browser 兩個 job 都通過；截圖以 Actions artifact 上傳。
  5. 已經失效或重複的腳本可以合併或刪除，但要在 commit 說明裡列出。
- **驗收標準**：
  - 本機只用一條指令（`npm run test:browser`）就能跑完。
  - 跑完後 `git status` 沒有任何追蹤檔案被修改。
  - CI 上有 browser job。故意讓一個斷言失敗時，部署會被擋下。
  - 至少涵蓋：PLAY／STOP／空白鍵、LOOP、MIDI 下載（檔案可以解析）、390×844 手機版面、MORPH 後骨幹不變、INSPIRE→KEEP／RESTORE。
  - README 的「本機啟動」說明更新。

### R01-P1-2　`dist/version.json` 停在 1.0.2，與實際部署內容不符
- **項目**：F（程式品質與可維護性：版本與文件一致）。
- **問題**：審核和複審需要知道網站實際是哪一版，但目前的版本號沒辦法追溯。
- **證據**：
  - `dist/version.json` 是 `{"product":"KHIMAIRA Web","version":"1.0.2","channel":"stable","date":"2026-10-27","tag":"web-v1.0.2"}`。
  - tag `web-v1.0.2` 指向 `b954842`。之後有 6 個 commit 改了 `dist/` 並已部署：`1ddd369`、`65e0c38`、`745af50`、`1e87301`、`09d6ed7`、`cd03df0`，內容包括調性重新設計和 MORPH。
  - README 仍寫「前一版網頁穩定基準：1.0.2」。
  - repo 裡沒有任何程式讀取 `version.json`。
  - 相關現象：ES module 的快取參數不一致（例如 `?v=17`、`?v=morph-1`、`?v=genre-2` 混用，見 `dist/app.js` 開頭的 import）。請判斷要併入這一項，還是另外列成 P2。
- **建議修法**：
  1. 目標版本 **1.1.0**（Alec 已決定）：`dist/version.json` 改成 `"version":"1.1.0"`，`tag` 改成 `"web-v1.1.0"`，`date` 改成實際發布日；同時更新 README 的版本敘述，並在實際部署的 commit 上建立 git tag `web-v1.1.0`。
  2. 新增測試：檢查 `version.json` 欄位格式正確，且 README 寫的版本號與它一致。
  3. 在 README 或 `docs/` 寫下發布步驟：改 `dist/` 的發布要同時更新版本號。
  4. 可以考慮在網站的 About（`dist/research.html`）顯示版本號。
- **驗收標準**：
  - `dist/version.json` 的 `version` 是 `1.1.0`、`tag` 是 `web-v1.1.0`；README 寫的版本也是 1.1.0；tag `web-v1.1.0` 存在，並且指向實際部署的 commit。
  - 新測試已加入 `npm test`，並在 CI 執行。
  - 發布步驟有文件可查。

### R01-P2-1　`dist/` 內約 9.4 MB 的 PNG 沒有被使用，卻隨 Pages 部署
- **項目**：G（效能與載入）、F。
- **證據**：
  - `dist/button-dark.png`（0.96 MB）、`dist/button-ivory.png`（1.30 MB）、`dist/greek-relics.png`（1.72 MB）、`dist/khimaira-bronze.png`（1.99 MB）、`dist/khimaira.png`（1.25 MB）、`dist/temple-blue.png`（2.58 MB），合計 9,806,024 bytes。
  - `dist/` 的 HTML、CSS、JS 都只引用 `.webp`，沒有引用 `.png`。
  - 外掛用的是自己的 `plugin/web/*.png`；`plugin/CMakeLists.txt` 只抓 `dist/*.js`，`plugin/scripts/pack.py` 只複製 JS。
  - `pages.yml` 會把整個 `dist/` 上傳。
- **建議修法**：
  1. 把這 6 個 PNG 移出 `dist/`；如果要保留原始圖檔，放到例如 `design/` 這類不會部署的資料夾。
  2. 新增測試：掃描 `dist/` 裡的圖片與字型檔，沒有被 `index.html`、`research.html`、`*.css`、`*.js` 引用的就讓測試失敗。
- **驗收標準**：
  - `dist/` 裡沒有未引用的圖片；新測試通過。
  - 桌機與手機畫面和修改前一致（附前後截圖）。
  - Pages artifact 大小減少約 9.4 MB。
  - `npm test` 全部通過。

### R01-P2-2　沒有 linter，程式過度壓縮、不好審
- **項目**：F。
- **證據**：
  - repo 沒有 ESLint 或 Prettier 設定，`package.json` 也沒有 `lint` script。
  - `dist/app.js` 42 KB 只有 235 行，有 28 行超過 300 字元，最長一行約 3,000 字元。其他模組也有類似寫法。
- **建議修法**：
  1. 加入 ESLint（flat config），先只開找真錯誤的規則，例如 `no-undef`、`no-unused-vars`、`no-redeclare`、`no-unreachable`，並在 CI 執行 `npm run lint`。
  2. 如果要重新排版，要獨立成一個「只排版、不改行為」的 commit。
  3. `dist/music-core.js`、`dist/piano-motion*.js` 是同步產生的檔案，不能直接重排；要從 `packages/` 改，再執行 `npm run music:sync`。
  4. 第一次可以只處理 `dist/app.js`，其他檔案逐步進行，避免跟其他正在進行的修改衝突（`AGENTS.md` 要求保留未提交的修改）。
- **驗收標準**：
  - `npm run lint` 存在，在 CI 執行，正確性規則沒有錯誤。
  - 排版 commit 前後 `npm test` 和 `npm run music:check` 都通過，MIDI 匯出的位元組完全相同（同樣輸入，比對前後的 `.mid`）。
  - 主要檔案沒有超過 200 字元的行；同步產生的檔案不計。

## 四之一、優先級定義

- **P0**：會產生錯誤的音樂結果（錯音、錯調、錯拍）、破壞骨幹契約、遺失資料，或主要功能無法使用。必須馬上修。
- **P1**：明顯影響使用、可追溯性或維護。下一版之前修。
- **P2**：改進與整理。

## 五、輸出

### 檔名與存放位置

報告存成 **`docs/reviews/round-01-review-cd03df0-<YYYYMMDD>.md`**，`<YYYYMMDD>` 是你審核當天的台北日期。

- 如果你可以寫入檔案，就寫到這個路徑。只寫這一個檔案，不要 commit。
- 如果不能寫入，就在回覆的第一行寫出完整檔名，接著輸出整份 Markdown。

### 報告格式（Markdown，繁體中文）

```
# KHIMAIRA 1.0 網站版 第 1 輪審核報告
- 檔名：docs/reviews/round-01-review-cd03df0-<YYYYMMDD>.md
- 評分表：RUBRIC v1.0

## 0. 審核資訊
審核 commit、範圍、日期（台北時間）、執行環境（作業系統、Node、Chrome／Playwright 版本）、實際執行的指令與結果摘要、N/V 項目與原因、是否還原了 docs/ 的變更

## 1. 分數表
| 項目 | 權重 | 分數（1–5 或 N/V） | 一句話理由 |
（A–H 八列）
- 加權總分 = Σ（權重 × 分數 ÷ 5）；有 N/V 時，用有分數的權重換算回 100 分。請寫出計算過程。
- 判定：可發布／穩定版／不及格（N/V 權重超過 20% 時改判「部分審核：暫定 ○○」）。依 RUBRIC 的門檻說明理由，包括 A／B／C 單項門檻和未解決的 P0／P1。

## 2. 各項說明（A–H）
每項寫：
- 分數與對照的錨點（為什麼是這個分數，而不是高一分或低一分）
- 證據
- 優點（最多 2 點）
- 相關問題的編號

## 3. 已知問題核對
| 編號 | 證據屬實？ | 優先級是否同意（不同意寫理由） | 對修法或驗收標準的調整 |
（R01-P1-1、R01-P1-2、R01-P2-1、R01-P2-2 四列）

## 4. 修改清單（P0 → P1 → P2；包含已知問題與新問題）
每條：
### [R01-Px-n] 標題
- 項目：
- 問題：
- 證據：檔案:行號＋識別字；重現步驟（輸入 → 實際 → 預期）
- 建議修法：要改哪個檔案、哪個函式、怎麼改；牽涉 packages/ 時註明「需要執行 music:sync，並提醒 SEIREN」
- 驗收標準：可以檢查的條件，最好附一個可以加進 tests/ 的測試案例（輸入和預期輸出）
- 影響範圍：舊存檔、MIDI 輸出契約、SEIREN 共用核心

## 5. 待 Alec 決定的產品問題

## 6. 給 Codex 的執行順序
用一句話列出建議的修改順序，以及哪些項目可以平行處理。
```

---

## 附錄：RUBRIC v1.0 全文

（以下與 `docs/reviews/RUBRIC.md` 相同）

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


<!-- 提示結束 -->
