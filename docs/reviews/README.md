# docs/reviews：KHIMAIRA 外部審核紀錄

這個資料夾存放由 **Claude** 做的 KHIMAIRA 1.0 網站版審核：評分表、提示、審核報告與複審報告。

## 跟其他資料夾的差別

- `docs/review-20261026/`、`docs/review2-20261026/`、`docs/stable-20261027/` 等，是 Codex 自己修改後留下的驗證紀錄。
- 這裡則是**外部審核**：由 Claude 依固定評分表打分，再交給 Codex 或「程式與自動化」修改。兩者不要混放。

## 為什麼放在這裡

- **不會被部署**：`.github/workflows/pages.yml` 只上傳 `dist/`（`upload-pages-artifact` 的 `path: dist`），所以 `docs/` 的內容不會出現在網站上。外掛建置（`plugin/CMakeLists.txt`、`plugin/scripts/pack.py`）也只讀取 `plugin/web/` 和 `dist/*.js`。
- **不違反 `AGENTS.md`**：`AGENTS.md` 管的是樂理、演奏與共用核心的程式修改；這個資料夾只有文件，不碰程式、fixture 或 `dist/`。
- **合乎既有慣例**：repo 的規格與紀錄本來就都放在 `docs/`。
- 注意：推送到 `main` 一定會觸發 Pages workflow（沒有路徑篩選）。只改文件的 commit 會重跑測試，並把同一份 `dist/` 重新部署一次，網站內容不會改變。

## 檔案

| 檔案 | 用途 |
|---|---|
| `RUBRIC.md` | 評分表（目前 v1.0）。項目、權重、1–5 分錨點、驗證方法、門檻都在這裡 |
| `PROMPT-round-01.md` | 第 1 輪初次審核的完整提示，可以直接貼給 Claude |
| `PROMPT-rereview.md` | 複審提示範本，每次複審時填入 commit 與上次報告 |
| `round-NN-review-<sha7>-<YYYYMMDD>.md` | 第 NN 輪的初次審核報告 |
| `round-NN-rereview-K-<sha7>-<YYYYMMDD>.md` | 第 NN 輪的第 K 次複審報告 |

## 命名規則

- `NN`：兩位數輪次（01、02…）。開新一輪的時機：
  - 上一輪已經達到門檻並結案；
  - 換了評分表大版本；
  - 擴大範圍（例如加入 SEIREN）。
- `K`：同一輪內第幾次複審（1、2…）。
- `<sha7>`：**被審核的** commit 前 7 碼（不是報告本身的 commit）。
- `<YYYYMMDD>`：審核日期（台北時間）。
- 範例：
  - `round-01-review-cd03df0-20261031.md`
  - `round-01-rereview-1-a1b2c3d-20261102.md`
- 修改項目的編號：`R<輪次>-P<優先級>-<序號>`，例如 `R01-P1-2`。編號一旦給出就不重複使用。新問題接著往下編號，不重排。

## 流程

1. **審核**：把 `PROMPT-round-NN.md` 貼給 Claude。Claude 依 `RUBRIC.md` 打分，輸出 `round-NN-review-….md`。
2. **存檔**：報告原文放進這個資料夾並 commit。只有在 Alec 同意後才推送。報告存進 repo 後就不修改；要更正就另寫一份複審報告。
3. **修改**：Codex 或「程式與自動化」依 P0 → P1 → P2 的順序修改。
   - 一個項目對應一個 commit，commit 訊息開頭寫項目編號，例如 `R01-P1-2: bump version.json to …`。
   - 修改前先讀 `AGENTS.md`。
   - 每個項目都要符合報告裡的「驗收標準」，並附上測試。
4. **複審**：把 `PROMPT-rereview.md` 填好貼給 Claude。Claude 逐條核對每個項目（完成／部分完成／未完成／無法驗證），重新打分，輸出 `round-NN-rereview-K-….md`。
5. **結案或繼續**：
   - 達到門檻（可發布：總分 ≥ 70、A/B/C 每項 ≥ 3、沒有 P0；穩定版：總分 ≥ 80、A/B 每項 ≥ 4、沒有 P0/P1），而且不是「部分審核」，這輪就結案。
   - 沒達到就回到第 3 步。

## 原則

- Claude 只審核、不改程式；Codex 和「程式與自動化」只修改、不改審核報告。
- 沒有驗證過的項目標 **N/V**，不能用猜的。N/V 的權重合計超過 20% 時，結果只算「部分審核」，不能拿來打穩定版 tag。
- 評分表的權重與門檻由 Alec 決定；第 1 輪結束後會再檢討。
