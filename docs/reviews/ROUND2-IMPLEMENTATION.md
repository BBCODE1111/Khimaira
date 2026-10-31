# 第 2 輪實作與驗證（2026-10-31）

範圍：`council/006-review`，修改前 HEAD `cd9e77e`，依 `../round2/anon/review_1.md`；不評分。第 0 步先新增 CONFIRMED-THEORY 第 6 節，第 1 節逐字保留。尚未收到另一位評審的追加報告。

| 項目 | 處理與回歸 | 狀態 |
| --- | --- | --- |
| R02-01 | 共用 analyzeHarmony 標記所有既有 dominant 目標，含迴圈；目標不被平行／ii–V 取代。原屬格可上色、轉位或擴為同目標 ii–V，不能獨立平行成 v。`morph-contract-v2.test.js` 的 10 條進行 × 49 樂風 × 3 幅度 × 30 seed；同時驗證原屬和被替換屬格的實際抵達。 | Node 通過 |
| R02-02 | 斜線按新和弦相同音位映射；三手法獨立開關。「保留低音線」預設關閉（主持人依使用者契約調整，預設要能用到轉位與 ii–V）；開啟時停用新增轉位、ii–V 和尾端接近，平行仍可用。舊 API 未傳 preserveBass 維持可轉位。兩條低音進行各 100 seed；200 個斜線平行全部保留音位。 | Node 通過；介面待瀏覽器 |
| R02-03 | 四種流行舞曲跟隨底層大小調，MORPH 仍檢查音集；其他 45 樂風的調式投射不變。 | Node 通過 |
| R02-04 | 手機固定播放列新增 MORPH、整組和弦摘要與結果訊息。長譜摘要內可捲動，不須離開操作列。 | 已改；待瀏覽器 500ms 驗收 |
| R02-05 | 播放列建立明確堆疊層級；手機固定列高於 COPY。瀏覽器腳本涵蓋兩種視窗、8 小節、每 8px 捲動及 9 個控制項中心／左右 10%。 | 已改；待瀏覽器 hit-test |
| R02-06 | 編輯器 flex 限高，只有欄位區捲動，APPLY 常駐；隱藏重複 ROOT 下拉；根音按鈕 flex 水平置中。 | 已改；待瀏覽器幾何驗證 |
| R02-07 | 可見來源→結果・手法與目標／小節，也作為可讀標籤。每個來源有還原按鈕，合併該來源所有片段、恢復時值，其他位置不變，可 UNDO。KEEP／INSPIRE 不顯示已失效的 MORPH 來源。 | 狀態／時值 Node 通過；可見性待瀏覽器 |
| R02-08 | 原前格已是 ii 時不再擴成重複 ii–V；轉位／平行先排除與相鄰格相同的候選，不消耗該手法預算；色彩碰撞回復原格。3 條 × 49 樂風 × 2 幅度 × 30 seed。 | Node 通過 |
| R02-09 | 混合休止提示 N.C. 目前只能佔整小節。 | Node 通過 |
| R02-10 | canonical music-core 1.1.4 僅 khimaira-v1 新增 ma7、maj7#5；實際音名與 SEIREN 拒絕範圍測試。 | Node 通過 |
| R02-11 | README 操作名稱、新 MORPH 契約、49 樂風與 MIDI tempo 更新；10/28 舊段標歷史。 | 文件回歸通過 |
| R02-12 | Web 1.0.4，依 sync-web-assets 更新 query；移除未用 khimaira.webp、mark.svg。 | 本地通過；tag／部署待主持人 |
| R02-13 | 雙大七半音 vamp 增列下方根音大調候選，不虛構 Dbmaj7 屬功能；新增人工標註案例及 12 調測試。 | Node 通過 |

額外提案：最近六次 MORPH 留存於存檔；A 骨幹／B 選定結果可切換，播放中沿用現有 dispatch 恢復試聽，再 KEEP 採用。比較不重置 seed；LOAD、KEEP、改判、大小調轉換清除不適用歷史，可 UNDO。新增比較歷史資料驗證，損壞存檔走原備份流程。狀態、召回、KEEP／RESTORE／UNDO 的 Node 測試通過；實際播放切換待瀏覽器。

## 實跑結果

- 修改前 `corepack npm test`：302／302，0 failed、0 skipped。
- 修改後最後一次 `corepack npm test`：315／315，0 failed、0 skipped（18.65 秒）。含既有 golden checksum／產品回歸，未重製 golden。
- R02-01：44,100 組，79,380 個屬解決關係零違規。報告未提供完整十條清單；測試包含全部明列重現及自行編寫的十條代表性進行，未冒稱取得評審私有清單。
- R02-02：200 組圖表、200 個斜線平行互換，遺失 0。
- `corepack npm run lint`、`node scripts/sync-music-core.mjs --check`（6 檔）、`node scripts/sync-web-assets.mjs --check`、`git diff --check` 通過。
- 已確認 CONFIRMED-THEORY §1 與基準完全一致；`plugin/`、golden fixture 沒有修改。

## 主持人後續驗證與發布

本輪沒有啟動瀏覽器。`tests/browser-round2-checks.cjs` 已接入 `browser-web-ci.cjs`，由現有 `corepack npm run test:browser`／CI 執行；覆蓋來源可見與可讀標籤、單格還原、六次歷史 A/B／KEEP／reload、375×667 與 390×844 的固定列、500ms 回饋、8px 遮擋掃描及 APPLY／根音置中。腳本已 lint，但尚未跑，不宣稱 UI、axe 或 Web Audio 通過。

尚未驗證：人耳聽感、實體手機／VoiceOver、真實 DAW、長時間播放／LOOP、Lighthouse。未 commit、tag、push 或部署。主持人需在 sandbox 外驗瀏覽器、提交，再按實際部署 commit 建立 web-v1.0.4；1.0.3 缺失 tag 也需核對部署 SHA 後補建。

SEIREN：只同步本 checkout 的核心副本，未修改 SEIREN checkout，也未跑 SEIREN 完整回歸。khimaira-v1 別名擴充不影響 seiren-v1；兩產品的生成、演奏、旋律策略均未合併。升級 SEIREN 請依 `packages/music-core/README.md` 的 --seiren 同步、adapter 版本更新與雙邊驗證流程。

待使用者決定、不阻擋本輪：小調 III／VI／VII 是否限高幅度；無實際解決目標時的 V→v 是否降機率；根音選擇器是否提供重降等音簡寫；是否禁止自動大三→sus。預設維持既有契約及功能鏈保護，詳見 CONFIRMED-THEORY 第 2 輪表。
