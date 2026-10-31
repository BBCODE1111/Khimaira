# 第 1 輪修改紀錄（2026-10-31）

分支：`council/006-review`。本紀錄描述修改與驗證，不評分、不宣稱已達發布門檻。

## 1. KEY、存檔與點和弦

程式與 Node 回歸完成，瀏覽器驗收未完成。

- B P1-5：`s.key.mode` 僅保存 major／minor。LOCK 鎖住底層調性，調式由目前樂風投射；移調不能把投射的 major、minor 或其他調式寫回底層。切回 Jazz 後恢復大小調與範例。舊存檔連同 UNDO 快照一起修復，保留音高、拼字、骨幹與原始級數。
- B P1-7：讀檔先驗證主狀態、骨幹、原始骨幹及 UNDO 快照；無效 JSON、未知樂風／schema、錯誤和弦或拍長先備份原字串至 `khimaira-corrupt-<時間>`，再使用預設 C／Am／F／G。備份鍵碰撞不覆寫，備份失敗則禁止本次工作階段寫入，保留唯一原件。v3／v4／v5 合法存檔繼續遷移。
- B P1-6：播放譜的和弦開啟既有 chordEditor，僅替換點到的和弦；骨幹保留。BACKBONE 展開區新增 `EDIT BACKBONE`，可選小節，並明示會重建播放譜與可 UNDO。移除播放格隱含的骨幹拖放，避免未明示便重建全譜。
- `tests/review-session.test.js` 覆蓋 21 種樂風 × 大小調 × AUTO／LOCK、遷移、損壞資料、備份失敗及經過和弦編輯。既有 keyed-examples、key-transition-stress 的 LOCK 斷言改為分別保護底層調性與樂風投射；非 golden fixture 更新。

## 2. 調性與拼字

程式與 Node 回歸完成，KEY 選單與編輯器的瀏覽器驗收未完成。

- A P1-1／P2-1、B P1-3：共用功能分析追蹤連續屬七的實際下一個目標；鏈尾可為觀察到的主和弦或未解決 V。不把鏈中屬七算作主音抵達。次屬級數依目標在調內的性質標示。藍調須有完整 I7／IV7／V7 證據並區別單次屬鏈；保留爵士藍調 turnaround。純 IV–V vamp 提供隱含主音證據，不套到含其他和弦的關係小調樂句。
- A P1-2、B P1-4：判定候選保留譜中實際主音字母；Gb、C#、Cb 等不再被預設等音名稱取代。KEY 選單分開 F#／Gb 並提供其他常用等音拼字；回原調保留原主音字母。
- A P1-3：次屬選項依目前調式的順階和弦建立，略過主和弦與減和弦目標。小調借用來自同主音大調；A minor 包含 A7→iv、B7→v、G7→bIII、C7→bVI、D7→bVII。
- A P1-4：新增 `spellPitch(pitch, keyObject)` 給編輯器使用，保留主音拼字、小調導音及大調 bIII／bVI／bVII。數字參數呼叫與 SEIREN profile 的既有輸出不改。
- 新增 13 條人工標註 key-detection 案例；舊 49 條未變。`tests/review-theory.test.js` 另覆蓋 12 調次屬鏈／IV–V、拼字往返、級數一致性、MORPH 不移調、12 小調選項與減七拼字。

共用 music-core 提升至 1.1.2，執行同步命令產生 `dist/music-core.js` 與 manifest，未手改發布副本；網站中直接引用 music-core 的三處統一使用 1.1.2。`piano-patterns.js`／`genre-rhythm.js` 只更新 import 版本，沒有修改演奏規則。SEIREN checkout 未同步、未驗證；其未來升級仍須更新 adapter 並跑跨產品檢查。

## 實測

| 檢查 | 結果 |
| --- | --- |
| 修改前 `node --test tests/*.test.js` | 264／264，20.89 秒 |
| 第 2 項針對性 Node 測試 | 87／87 |
| 最終 `node --test tests/*.test.js` | 288／288，21.86 秒，無失敗或跳過 |
| `node scripts/sync-music-core.mjs --check` | 通過，music-core 1.1.2、piano-motion 2.0.0，6 檔 |
| `node --check dist/app.js` 與新增瀏覽器腳本 | 通過（僅語法檢查） |
| `git diff --check` | 通過 |
| Playwright | 已安裝於暫存目錄；Chrome 啟動因環境限制 SIGABRT，未執行任何流程斷言 |
| 瀏覽器工具開啟本機網站 | 自動核准審查拒絕，未取得 localhost 來源授權；未再嘗試其他路徑 |

新增 `tests/browser-review-session.cjs` 供後續重跑，涵蓋 KEY、壞存檔與 quota、MORPH 後編輯、UNDO／RESTORE、明確骨幹入口與手機編輯器。輸出預設至系統暫存目錄，不寫入追蹤檔。它只有語法檢查通過，不能當作瀏覽器驗收通過的證據。

```sh
# 有 Playwright 與可啟動的 Chrome 時
CHROME_CHANNEL=chrome node tests/browser-review-session.cjs
```

## 停止界線與未完成項目

- 第 3 項瀏覽器 CI 未做：本機瀏覽器測試無法完成，未接入未驗證的部署閘門。
- 第 4 項 web 版號、資產清理、全站快取與死碼未做；本輪沒有發布或建立 tag。
- 第 5 項其他 P2 未做，包括符號解析、手機版面、Cinzel、同根經過和弦、MIDI 聲道、截斷提示、無障礙、verify 參數、lint，以及 README 延伸音規則。
- 未驗證：瀏覽器流程、手機實機、聽感、DAW、線上部署、GitHub Actions、SEIREN。
- 未修改 `plugin/`；未重製 golden fixture；未 push、未開 PR。
- 嘗試提交第 1 項時，sandbox 拒絕建立 `.git/index.lock`。所有修改保留工作區，無新 commit。建議後續分項提交訊息為 `1: protect tonal key, saved projects and score chord editing` 與 `2: correct dominant chains and contextual spelling`；兩項共享的 app／picker 檔需按修改區塊分項暫存。
