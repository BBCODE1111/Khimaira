# 第 4 輪網站修改：1.0.7

工作分支 `council/006-review`，乾淨基準 `afb2b5e`（使用者指定的線上 1.0.6）。本輪修改、不評分，未 commit／push／建立 tag／部署，未修改 `plugin/`。未重製 golden、未修改共用核心或其發布副本。所有瀏覽器操作留給主持人在 sandbox 外執行。

## 逐項基準與處理

| 項目 | 1.0.6 核對／重現 | 狀態與本輪處理 |
| --- | --- | --- |
| P1-A | C major／Latin Pop 第 2 個可選例仍為 `Fm Bb Eb G7`；MORPH 已接受。地域 2,520 組 LOAD→MORPH 拒絕 0。 | **本輪修清單；拒絕問題 1.0.6 已修**。舞曲 `modal` 範例採原風格大小調 metadata 過濾，不修改 KEY。補 24 調／所有地域範例與 RESTORE 測試。 |
| P2-B | beat 9.925 換不同音高長音時，時鐘未倒退，但在 4.9625 秒補新起音（離 120 BPM 格點 37.5ms）；下一個原格點是 6 秒。 | **本輪修**。只有 MORPH 使用下一小節切換；預排舊音取消、跨線長音收束，最新請求取代待切換版本。420 個虛擬起音最大誤差約 7.8e-13ms；追加變速、起播點、預排、連按、LOOP 切換及跨線延音測試。瀏覽器實際按鍵／音訊待驗。 |
| P2-C | `C G Dm F`、FROM BAR 3／LOOP，最後 NEXT 仍回傳 C。 | **本輪修**。傳入並採用 startBar，回傳 Dm；覆蓋所有起播點、複和弦、LOOP 關閉與休止。空白循環起點不被跳過。 |
| P2-D | `C G Am F`、high 連按 12 次：Jazz 6、American pop 6、Mandopop 7 種；49 樂風中 11 款達 ≥10。 | **部分**。49 款各有明列手法權重；功能／音集限制優先。12 組結果記憶與最多 64 次搜尋，和 6 組 A/B 歷史分開。最新 33/49 款達 ≥10；三個上述樂風皆 12/12。Jazz 200/200 保留目標帶色彩音，仍保根音／低音／定義性和聲。相同 seed 的 29 款測試有 25 種完整輸出、17 種根音／低音／時值架構。其餘限制見下表，不宣稱全部達標。 |
| P2-2 | 49 樂風 × 80 seeds＝3,920 組，原骨幹 `C G Am F`：432 次實際前一格與 ii 同根；例如 G 先平行成 Gm，再接 Gm9。 | **本輪修**。同時檢查來源與最終前一和弦，並於所有手法決定後複查；同樣 3,920 組為 0 次（335 個 ii 事件）。 |
| P2-5 | 共用 degreeLabels／formatDegreeChart 已採數字低音；原回歸已有 G/B→V/7。 | **1.0.6 已修**。補 24 調格子／COPY 一致測試，未改級數核心。 |
| P2-6 | Flamenco 的來源音容許已在 1.0.6；不再因 A hijaz 的來源 ♭III 等音拒絕。 | **1.0.6 已修**。補 `Am G F E7`、`Dm C Bb A`、`A C Bb A` 與原 KEY 保留。 |
| P2-7 | 1.0.6 `score-follow.css` 已在桌面顯示譜面工具列 MORPH，既有 browser-loop 已測 1440×900。 | **1.0.6 已有修復，僅補測試**。新增頁面重整、scroll=0 的 1440×900 邊界斷言；本輪未跑瀏覽器，未宣稱實測首屏通過。無 CSS 改動。 |
| P2-9 | origin=inspire 已保存；重整後 seedMood 仍預設 hidden，標記只在收合的和弦工具內。 | **本輪修可見標記**。render 從 origin 還原「INSPIRE · 預覽」，KEEP／RESTORE 後移除。補 JSON 存取及瀏覽器 reload 斷言。 |
| P2-E | 1.0.6 和弦 aria-label 只有 trace，還原按鈕也沒有完整可見和弦名。 | **本輪修，axe 實跑待驗**。和弦 aria-label 以和弦名＋級數開頭，還原按鈕以可見文字開頭；同步旋律按鈕 label。CI 明確啟用 `label-content-name-mismatch`，涵蓋桌面、兩個手機尺寸；不以原先 serious-only 或預設規則掃描取代。 |
| P2-F | README 仍有 1.0.4 未建 tag；MORPH README 首段仍說根音／低音不變。 | **本輪修**。三份文件統一「保留低音線」預設關閉、現行映射契約及發布基準；移除過時現在式承諾。文件回歸通過。 |
| P2-G | A minor 選擇器為 Gb、借用 vi 清單為 F#m。 | **本輪修一致性，拼字政策未做**。選擇器沿用 Gb，借用 vi 顯示 Gbm；只改同音標籤、不改音高或第 6 級規則。功能性次屬、減七／半減七與其他待決事項保持原行為。 |

## 多樣性仍未達標

以 `C | G | Am | F`、LOCK C major、high、預設密度、每次從前一狀態按 MORPH，共 12 次測量；詳細前後數字見 [metrics](ROUND4-METRICS.json)。

| 12 次不同結果數 | 樂風 |
| --- | --- |
| 9 | Ghana Highlife |
| 6 | Heavy Metal、Ethiopian Tizita、Hawaiian Slack-key、Indian Bhupali、Afrobeats |
| 4 | Phrygian dominant、Dorian folk、Greek Hijaz、Japanese Hirajoshi、Japanese In-sen、Native Flute、Indian Yaman、Flamenco、Arabic Hijaz、Celtic Dorian |

保留地域新增音集限制、既有功率和弦低音保護及解決目標，沒有為湊數新增違規音符／空白變化；超過可用組合後會提示變化受限。上述未達條件明列為部分完成。待使用者決定的政策均未採新定案，包括開頭主和弦的平行選擇規則。

## 驗證與相容性

- 修改前 `corepack npm test`：**335/335**；修改後 **348/348**（新增 13 項 Node tests，無跳過／失敗）。現有 mapping／61,740 組功能鏈／原 Am→Ab、Em→Eb／100 圈播放器等回歸一併通過。
- `corepack npm run lint`、`music:check`、`assets:check` 及 `git diff --check` 通過。共用檢查 music-core 1.1.5／piano-motion 2.0.0 共 6 檔；網站 query 1.0.7 由同步腳本產生，其他大量 dist import 差異是資產版本更新。
- 既有 Jazz exact-C 斷言改驗根音、大三核心與非屬七功能，因本輪明訂 Jazz 保留目標加色彩；版本斷言升至 1.0.7。變體耗盡測試另外確認回訪結果確實已出現、搜尋上限 64；沒有放寬根音／映射／音集測試或重製 fixture。
- **未執行** `test:browser`／完整 `verify:web`、axe、實機音訊、人耳聽感、DAW、Seiren、部署或發布 tag。主持人請在 sandbox 外用指定 PATH 執行 `corepack npm run test:browser`；Pages 的 `verify:web` 會執行同一瀏覽器 gate。
- `plugin/` 未修改；未改共用樂理／演奏生成核心。外掛若日後重新打包網站 JS，會取得新的 MORPH 權重／目標色彩／去重、範例過濾、選擇器標籤及 NEXT 可選 startBar；宿主呼叫未傳 startBar 仍預設 0。網站 BeatPlayer 新增可選量化換譜，外掛原生排程未改、未驗；不能把網站虛擬時鐘數據當成外掛通過。
