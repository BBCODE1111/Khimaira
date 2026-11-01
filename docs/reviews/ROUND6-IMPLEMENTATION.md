# 第 6 輪網站修改（1.0.9 候選版）

基準：主持人指定 `459d182`／1.0.8；分支 `council/006-review`。評審來源：`../round6/anon/review_2.md`（評審原基準為 1.0.7）。只修改網站，不評分、不建立 commit／tag、不 push。預定 tag `web-v1.0.9`，由主持人在瀏覽器驗證後提交及發布。

## 重現與修正

- **P1-N1**：1.0.8 原樣重現 American pop／medium／seed 1：`C | G7/F | Amadd9 | F`。現在為 `C | G7 | Amadd9 | F`。最終生成譜完成轉位、平行、替換與接近後才檢查實際相鄰低音：新生屬七 4/2 必須下行半音或全音，否則撤回轉位，保留原低音或根音；不移動下一受保護目標。含 Jazz、Neo-soul，跨休止不算解決，非 LOOP 句尾不假裝有下一和弦，LOOP 接回譜首。後一低音撤回時會重檢前一和弦。手動 INVERT、原骨幹已有的 4/2 保留。來源位置、時值、骨幹、音集契約未變。
- **P2-N2**：`C | Am | Dm | G` 尾小節 NEXT 原為 `G:2 G7:2` 且錯報 ii–V；現為 `G7:4`、訊息「已插入 V」。再次 NEXT 保留原屬和弦，明示「未插入新和弦」。同根合併只在被選格的替換片段內，其他格與目標不變，尾接 FROM BAR 行為保留。
- **P2-N3**：Reggaeton、Amapiano、Dancehall 在 1.0.8 各為大調 0／小調 7；現在各為大調 1／小調 7。新條目是 `type: study` 的原創練習，不是歌名。保留既有四個對比方向及範例 ID。12 主音 × 2 調式 × 3 樂風，共 72 組覆蓋檢查。
- **P2-N4**：README、version.json、CONFIRMED §1 與預定 tag 一致為 1.0.9 待發布；基準明列 459d182。不冒稱部署完成。移除 CONFIRMED 歷史段中 A 小調保留 Gb／Gbm 的舊句，指回使用者已定案的 F#。
- **E**：新增 7 個 Node 回歸項目，涵蓋 4/2 統計、Jazz／Neo-soul 全調、休止、同小節、LOOP、撤回後相鄰重檢、手動轉位保留、NEXT 結果／訊息、範例與版本契約。沒有重製 golden。
- **F**：app.js 僅拆本輪修改的 NEXT 事件處理長行；訊息函式由 Node 回歸與待執行的瀏覽器流程覆蓋。其他 app.js 內容差異只有版本查詢字串。
- **H**：首個 Tab 可聚焦「跳至 MORPH」，Enter 導向原生 MORPH 按鈕；連結聚焦時顯示白底黑字及外框。browser-web-ci 新增鍵盤焦點、桌面連結顯示狀態 axe、NEXT 實際結果與訊息檢查，沿用兩種手機 viewport 的 axe 檢查。瀏覽器／axe 本輪未執行，等待主持人在 sandbox 外跑。

## 本機驗證

執行環境依指示設定 Node 路徑；沒有 npm，直接用 Node 執行 package.json 對應程式。

- 修改前：`node --test tests/*.test.js`，366／366 通過。
- 新測試在 1.0.8 的預期失敗：P1-N1、N2、N3、版本契約皆重現，未修改既有 golden。
- 統計矩陣：49 樂風 × 2 骨幹（C–G–Am–F、Am–F–C–G）× medium／high × seeds 1–20，density 2、其餘 UI 預設；每個 preserveBass 設定各 3,920 次。評審的原始統計腳本未提供，這是本輪可重跑矩陣，不冒稱逐筆同樣本。

| 矩陣 | MORPH 次數 | 4/2 次數 | 未下行級進 |
| --- | ---: | ---: | ---: |
| 1.0.8、保留低音關 | 3,920 | 262 | 211 |
| 1.0.9、保留低音關 | 3,920 | 51 | 0 |
| 1.0.9、保留低音開 | 3,920 | 0 | 0 |

另有 Jazz／Neo-soul × 12 調 × LOOP 開關 × 4 進行 × seeds 1–30，共 5,760 次，未下行級進 0。此為音高類別／相鄰低音規則驗證，不代表耳聽或實機音域測試。

完整回歸首次檢查發現新練習不可直接增加原本固定四個對比方向；已移至補充範例池，保留原測試與四方向契約，未放寬斷言。

最終結案紀錄：

- `node --test tests/*.test.js`：373／373 通過，失敗／略過皆 0（31.11 秒）。
- `node node_modules/eslint/bin/eslint.js dist packages scripts tests eslint.config.js`：exit 0。
- `node scripts/sync-music-core.mjs --check`：6 個發布檔通過；核心仍 1.1.7、piano-motion 仍 2.0.0。
- `node scripts/sync-web-assets.mjs --check`：1.0.9 通過。
- `node --check dist/app.js`、`node --check tests/browser-web-ci.cjs`、`git diff --check`：通過。
- 記錄檔在 `/tmp/khimaira-r6-baseline.log`、`/tmp/khimaira-r6-repro.log`、`/tmp/khimaira-r6-final.log`；本機暫存檔不列入產品發布。


## 主持人驗證與範圍

在 sandbox 外執行 `node scripts/run-browser-ci.cjs`（或 `npm run test:browser`），檢查桌面 skip link、NEXT 與手機 axe 報告。`npm run verify:web` 為完整發布 gate；本輪未跑瀏覽器，不宣稱完整 gate 通過。

未驗證：axe、瀏覽器鍵盤實際焦點、VoiceOver／TalkBack、人工對比、實機音訊、DAW／外掛、Seiren、部署與 tag。共用核心無修改，`dist/music-core.js` 未手改，plugin/ 未修改；所有其他 dist 檔案的版本字串由 assets:sync 同步。使用者暫緩的 Heavy Metal bVII、D 小調第 6 個半音與斜線數字寫法均未改。
