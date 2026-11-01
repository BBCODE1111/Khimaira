# 第 8 輪網站修改紀錄

工作基準：`council/006-review`，HEAD `0019789`（1.0.10），修改前工作樹乾淨。本次為 1.0.11 `release-candidate`，預定 tag `web-v1.0.11`。未 commit、push、部署、建立／刪除／改寫 tag；`plugin/`、共用核心、golden fixture 均未修改。大部分網站模組的差異只是版本 query 同步。

## 逐項結果

| 項目 | 實作與證據 | 驗收界線 |
| --- | --- | --- |
| R08-01 | tag 存在時 RC／stable 都接受；無 tag 僅 RC 接受，stable 拒絕；未知 channel、版本與 tag 名稱不符仍拒絕。同步不因 tag 自動升 stable。R07-05 使用固定輸入涵蓋四種組合，不再查實際 Git 狀態。 | 本 checkout 的 assets check 通過；完整遠端 clone、Pages 重跑及線上 channel 由主持人驗。歷史 tag 未動。 |
| R08-02 | 保留 1.0.5 已合併的橫向和弦列、黏附譜面、手動暫停／恢復與循環跟隨。未套用 2×2 排列。 | 使用者要求優先於 RUBRIC D「不需橫捲」錨點，請主持人記錄此衝突，不要求產品改回。既有 `browser-score-follow.cjs` 保留，僅跟隨按鈕文案更新；新 browser 測試明確斷言 score 可橫捲。 |
| R08-03 | I–IV 純大三和弦迴圈保留功能排名第一順位，加入 I 調結構候選；12 調皆涵蓋。`C F C F` 仍先列 F，亦列 C；`F G F G` 仍只列 C。 | 第一順位未另改政策，立場與出處如下；既有 fixture 未更動。 |
| R08-04 | 關閉選擇器時按目前 bar/chord 找重繪後的和弦按鈕；空白格回到 + CHORD，不再回隱藏的骨幹入口。新增小節重設 chord 索引。 | Node 真實 picker handler＋簡化 DOM 驗選擇／新增／移除後焦點對象；真實瀏覽器原生焦點與可見性待主持人。 |
| R08-05 | 中間刪除比對完整內容順序；1/24 精確驗每小節 24 步及 1/6 拍間隔；新增後實際選和弦須落新小節；status role；Bossa 根音／五度實際音高及節點。 | 隔離副本實際注入 M02、M06、M17、M19、M20，5/5 原版通過、5/5 變異以對應 AssertionError 失敗。不是只看原始碼有沒有字串。M19 檢查實際 HTML 屬性；另備 browser DOM 斷言。 |
| R08-06 | 四張完整 WebP 移至 `assets/web-source/`，兩份不載入的 TTF 同移；部署只留使用中的媒體。optimizer 改讀新來源。 | 媒體引用檢查通過。隔離目錄成功重建 6 檔；4 張圖片逐位元一致。字型 glyph order／cmap／hmtx 一致（451／516 字形）；head 修改時間不同，未宣稱 WOFF2 位元一致。 |
| R08-07 | 選擇器置頂顯示可點選進行摘要；目前小節高亮；NEXT BAR、ADD BAR、REMOVE BAR 常駐摘要下方。四小節預覽手機兩欄；長譜摘要區可捲動。 | browser 腳本在 375×667 驗四格摘要與按鈕幾何、不打字／不開下拉建四小節；尚未執行瀏覽器。 |
| R08-08 | 依本輪使用者「低音不順就用順的方式」：自動大七低音比照屬七七音低音，檢查最後實際鄰接（含接近和弦、休止、LOOP）；下一低音須下行半／全音，不順則回可用原低音／根音，不移動解決目標。原作者指定低音與手動 INVERT 保留。 | 49 樂風×2 LOOP 設定×40 seeds＝3,920 次；111 個保留的自動大七低音，未順接 0。這是音高規則，非聽感通過。 |
| R08-09 | Bossa 五度依當下實際低音選最近的 C1–C3 音區，減五／增五按和弦音程；同距選較低音。 | 12 根音×5 性質×2 slash 設定＝120 組，根／指定低音到五度皆 ≤12 半音且低音範圍正確；指定混合小節譜亦可演奏。耳聽待主持人。 |
| R08-10 | 主要操作、欄位、選項以英文為主；說明、錯誤、無障礙描述保留繁中。FOLLOW／RESUME FOLLOW、STYLE／BARS／AMOUNT、PATTERN／PHRASE 等一致。 | [文案對照表](ROUND8-COPY.md)；既有音型名稱、參數未變。英文文案下的手機布局待 browser 驗。 |
| R08-11 | `parseBar`／`parseChart` 接受全小節 `N.C.`、`NC`；保留 N.C. 尾點，與 degree parser 同為空小節；混合和弦／部分拍長休止仍拒絕。 | 五種合法與三種非法輸入兩條解析路徑交叉驗證。 |
| R08-12 | 一併補 PLAY 初始 `aria-pressed="false"`，HTML 與 browser 初始載入斷言。 | Node 已過；browser 未跑。 |

## R08-03 立場與出處

依 [key-detection-theory §2.1.1、§2.1.5–6、§2.2.5](../key-detection-theory.md)，`C→F` 可讀為 F 的 V→I，而迴圈中的 `F→C` 亦可讀為 C 的 IV→I。四個大三和弦本身不足以排除另一個中心；不得因現有評分差距超過一般門檻就隱藏 I–IV 的結構讀法。因此此次只補結構候選，不把「開頭一定是主調」寫為新規則，也不宣稱 F 是唯一樂理解釋。

`F G F G` 是全音距雙根音的 IV–V 政策，和完全四度距的 `C F C F` 不同。前者遵守 [CONFIRMED-THEORY §1 第 11 題](CONFIRMED-THEORY.md) 及 theory §2.2 的 2026-11-01 補充：判 C，不列 G。新增候選不修改共用 `analyzeHarmony`，判定仍使用同一功能分析；候選讓使用者依旋律／重音選調。外部研究文獻僅沿用 theory §3 的參考清單，本輪未另查閱，未把文獻冒稱為此案例的人工標註。

## 實際驗證

使用 Node 24（PATH 依主持人指示），未啟動瀏覽器。

- 修改前 `node --test tests/*.test.js`：381/382，唯一失敗 R07-05，`release-candidate; expected stable`。
- 修改後完整 Node：393/393；新增本輪測試 11/11。未修改或重製 golden。
- `node scripts/sync-music-core.mjs --check`：6 files 通過；核心 1.1.7、piano-motion 2.0.0 未變。
- `node scripts/sync-web-assets.mjs --check`：1.0.11 RC 通過。
- `eslint dist packages scripts tests eslint.config.js`：exit 0。
- `git diff --check`：通過。
- `node scripts/check-round8-mutations.cjs`：5/5 detected，正式工作樹位元均未受注入影響。持久證據見 [ROUND8-MUTATIONS.json](ROUND8-MUTATIONS.json)，含原版／變異雜湊；完整暫存 log 位置見 JSON。
- optimizer 在暫存 venv 使用原要求 Pillow 11.3.0、fonttools[woff] 4.60.2 成功重建；正式部署資產未覆寫。

M17 Node 測試執行正式 `mountChordPicker`、正式 harmony state、重繪與 click handlers，簡化 DOM 不模擬 CSS 或瀏覽器焦點可見性。因此它證明游標／狀態／焦點目標，不代替 R08-04／07 的瀏覽器驗收。

## 交主持人

1. 在 sandbox 外執行 `CHROME_CHANNEL=chrome node scripts/run-browser-ci.cjs`，新檢查已接入 `browser-web-ci.cjs`。重點：375×667 選擇器四格可見、NEXT／新增／移除可點、Esc 原生焦點、英文文案、原有手機 follow 與 axe；輸出含 `round8-picker-375.png`。
2. 完整 clone 執行 `npm run assets:check`、`npm test`，於本輪修正提交上重跑 Pages，核對線上 1.0.11 RC。部署後打 tag 可保持 RC；不改寫或刪除既有 tag。
3. 明列 R08-02 的使用者行為與 RUBRIC 錨點衝突；I–IV 第一順位本輪保留，請勿把候選歧義說成已定唯一調性。
4. 耳聽自動大七低音與 Bossa 五度；DAW、實體 iOS／Android、VoiceOver、Lighthouse、真實音訊未驗。SEIREN 與 plugin 未修改亦未驗證；共用 package 未改，本輪不宣稱跨產品驗收。
5. Heavy Metal bVII→G#dim、D 小調比 F 高半音的拼字、報告三項樂理異議均未修改，繼續等待使用者決定。
