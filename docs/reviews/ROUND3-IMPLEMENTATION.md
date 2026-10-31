# 第 3 輪網站修改與驗證（2026-11-01）

工作基準：`council/006-review`、HEAD `846c2a4`（Web 1.0.5）。只修改網站與其引擎；未 commit、push、建立 tag、部署或修改 plugin。保留 1.0.5 手機跟隨、黏附譜面、獨立 transport 及面板調整。Web 1.0.6 的 channel 是 `unreleased`，不是已發布聲明。

## 樂理與重現

[CONFIRMED-THEORY 第 7 節](CONFIRMED-THEORY.md) 逐項回應兩份匿名報告，明列本庫來源與個人判斷；以 git HEAD 逐字比對確認第 1 節完全未改。沒有評分，沒有重新聲稱聽過教材或歌曲。

修改前完整 Node 基準 315／315。另從同一 HEAD 唯讀匯出 dist/packages 到 `/tmp/khimaira-r3-baseline` 作隔離對照（不動工作樹與 .git）：

- `C Am F Fm`／Jazz，高幅度 40 seed 有 27 次 F 的身份被替換；seed 0 的第三格成 `Gm7b5 C7b9`。
- `Am G F E`／Heavy Metal 有 13 次 F 被換，seed 2 出現 F#m。
- 藍調 `C7 F7 C7 G7`／Jazz 有 10 次 IV7 被換，seed 1 成 Dm9 G13。因此藍調保護依共用分析辨識，不只看樂風名稱。
- C 調根音 1／6 的 dim7／m7b5 依序產生 Dbdim7／Gbm7b5；A 小調亦產生 Gbm7b5。
- G/B、G7/B 級數仍是 V/B、V7/B；本輪改數字低音。
- Latin Pop `Am Dm E7 Am` 被 `modal-incompatible` 拒絕；KEY 本身已是 A minor，不另改投射政策。
- `Fm7 E7 Ebmaj7` 格子及複製在 1.0.5 **已同為 ii7 subV7 Imaj7**，不是本輪新修復；保留並補回歸。
- 次屬目標／終止前 V 的保護大部分已在 1.0.4 存在；本輪擴充至 14 條功能鏈矩陣，保留舊有正確行為。

## 逐項狀態

「瀏覽器待驗」表示腳本已寫入並完成語法／lint 檢查，但本 sandbox 沒有啟動瀏覽器，不能當作 UI 或 OfflineAudioContext 已通過。

| 項目 | 處理及驗收證據 | 狀態 |
| --- | --- | --- |
| R03-01 | 共用產品配音候選在非根音低音的 Close/Open 保根音；必要時上聲部上限由五音到六音，保留三／七及張力；明選 Rootless 可省略，UI 說明。8 類 × 12 調 × 2 配置，進行前後文內讀回 MIDI 共 192 組。 | Node 通過 |
| R03-02 | dispatch 保留有效 selectedChord；2–4 和弦格連續 INVERT→COLOR→NEXT。密集三和弦格替換選中格為 ii–V，四和弦格只用 V；其他格不動，低於一拍提示空間不足。 | 純函式通過；操作待瀏覽器 |
| R03-03 | 不再把來源外音當拒絕條件；逐來源格限制新增音，並保留原有音集外和弦音，不把另一格外音當全域許可。不改 KEY／骨幹，不需死路修正按鈕。49 樂風、24 調，6,360 個 keyed examples 均 LOAD→MORPH 成功；舞曲小調 V7、次屬及 Dorian/Flamenco 案例通過。 | Node 通過 |
| R03-04 | 多種結構音轉位依 seed 選取；地域可使用原有和弦音轉位。功能保護／手法限制用不完預算時顯示已用與預算格數。40 seed 三條四小節譜結果數為 16／10／18，平均手法格 1／1／1.75；前兩條透過明確限制提示滿足替代驗收，未冒稱達到 80%。 | Node 通過；提示可見性待瀏覽器 |
| R03-05 | compare 不加入 32 層 UNDO；100 次 A/B 後仍能兩次 UNDO 回到 LOAD 前。 | Node 通過；瀏覽器腳本已含 |
| R03-06 | BeatPlayer.setNotes 沿用音訊時鐘與拍內位置，保留共同持音並取消舊預排音；MORPH、A/B、樂風與 UNDO 使用同一路徑。 | 虛擬時鐘通過；實際 UI 待瀏覽器 |
| R03-07 | 無歷史選值為空字串，顯示「尚無 MORPH 結果」；歷史含幅度與和弦摘要，舊紀錄標未記錄幅度。 | 文案函式通過；手機待瀏覽器 |
| R03-08 | music-core 1.1.5：Maj7、add11、m(add9)、連寫 #9/b13/#5；CΔ 明訂 maj7。音名測試及 seiren-v1 接受範圍不變。 | Node／同步通過 |
| R03-09 | 循環 I7–VI7–ii–V 保留相應大調候選，全部 12 調驗證；不宣稱唯一主調。 | Node 通過 |
| R03-10 | 藍調 VI7→ii 依共享 analyzeHarmony 標 V7/ii，I7／IV7 身份保留。兩條指定進行的分析、格子與複製一致。 | Node 通過 |
| R03-11 | 桌機顯示既有 score dock 的 MORPH，保留手機版 sticky／follow。1440×900 腳本檢查首屏可點且結果可見。 | 已改；幾何待瀏覽器 |
| R03-12 | 1.0.5 已隱藏重複 dockSummary、將 dockStatus 限兩行，不還原。新增 375×667、390×844、16 小節固定列 ≤25% 的幾何驗收。 | 沿用已合併修正；待瀏覽器 |
| R03-13 | 符號不變但切短時值顯示「時值讓給接近和弦」，仍保留還原入口。相同符號與時值完全不顯示 trace。 | 純函式通過 |
| R03-14 | 更新 preserve-bass 預設、MORPH 用語、About MIDI 速度說明；來源衝突不再顯示內部調式 ID。1.0.6 標未發布，不假稱已有遠端 tag。 | 文件／版本檢查通過 |
| R03-15 | Format 0/1 每軌寫 4/4 與唯一音軌名；逐音 pitch/on/off 與輸入事件比對不變，踏板與聲道回歸保留。 | Node 通過 |
| R03-16 | ARP 顯示 HUMAN 時間偏移影響，新增一鍵 HUMAN 0 等距音序；保留原有 HUMAN、phase 與自動化設定，不靜默歸零。既有 1/24 等距 tick 測試保留。 | Node 通過；一鍵操作待瀏覽器 |
| R03-17 | 六線譜 tab-scroll 可 Tab 聚焦，具 region 名稱；瀏覽器加 axe 規則檢查。 | 已改；axe 待瀏覽器 |
| R03-18 | Heavy Metal／Doom Metal 的 power chord 自動 MORPH 不轉五音低音；手動 INVERT 不受限。 | 40 seed Node 通過 |
| review_2 其他 | 選擇器套用／預覽按下一和弦重拼 C#dim7、F#m7b5；數字低音消除 V/B。保護 IV→iv、bVI→V、分析辨識的藍調 IV7、終止屬功能；允許同目標 ii–V 展開。仍能產生 Am→Ab、Em→Eb。 | Node 通過；選擇器／複製操作待瀏覽器 |

## LOOP 覆蓋與修復

新增 `tests/loop.test.js`、`tests/browser-loop.cjs`，後者接入 `scripts/run-browser-ci.cjs`。Node 虛擬時鐘每 25ms pump，30 組（1／3／4／16 小節、開頭／中間／末小節起播、SUSTAIN／ARP 1/24／Jazz、多和弦）各 100 圈：**202,300 起音，無重複／漏音，格線誤差 0 秒，MIDI 最大誤差 1.4210854715202004e-14 秒**。此數字是排程與量化事件比對，不是人耳／聲卡測量。

- 起播契約沿用 playbackSlice：指定起播小節至末小節為循環區間，不擅改成全曲回第 1 小節。
- 循環邊界逐音 note-on/off、Format 0/1 CC64 放踏板再踩、100 圈踏板狀態不殘留。
- 100 次虛擬 live edit／變速，涵蓋 MORPH、A/B、切樂風、UNDO，拍內位置不回退；共同持音不重擊。
- 新測試促成修復：LOOP off 取消預排下圈起音並截斷跨界持音；重新開啟時恢復原持音終點。
- LOOP 關閉自然停止；NEXT 尾端有／無循環的路由、尾接頭 V7/ii 與判調都有 Node 回歸。
- browser-loop 以虛擬 Web Audio 跑介面、不用實體音訊裝置；另以真實 OfflineAudioContext 在 2／4 秒接縫比對 PCM 是否有缺口或重疊。這部分**尚未執行**。

## 最終驗證與邊界

- `corepack npm test`：**335／335，0 fail／skip**（基準 315）。功能鏈矩陣擴為 **14 × 49 × 3 × 30＝61,740 組，105,840 個解決關係**。
- `corepack npm run lint`、`node --check tests/browser-loop.cjs`：通過。
- `node scripts/sync-music-core.mjs --check`：6 檔通過；`node scripts/sync-web-assets.mjs --check`：1.0.6 通過。
- `git diff --check` 通過。未修改任何 golden fixture；舊 MIDI 測試的讀取器增加合法 metadata 支援，逐音／配對／長度斷言仍在。舊來源拒絕、音名低音與 warning 空值預期依本輪明確契約更新。
- **未跑**瀏覽器（包括新 OfflineAudioContext、axe、首屏位置、手機高度／觸控／跟隨）、DAW、實體手機、VoiceOver、Lighthouse、人耳試聽、SEIREN harness、外掛 1.5 建置／宿主驗證、發布 CI。主持人請在 sandbox 外用 `corepack npm run test:browser`；有 Chrome 時可加 `CHROME_CHANNEL=chrome`。

共用核心只從 canonical source 同步，seiren-v1 本地相容測試通過不等於 SEIREN 完整產品驗證；未取得／同步另一 checkout。SEIREN 的生成／旋律策略未改。外掛 1.5 若採用這些 JS 模組，會繼承配音保根音、MORPH／標誌保護、手動 NEXT、級數、解析與 MIDI metadata 的行為變化，應納入引擎逐音與宿主 PPQ 測試；網站 setNotes 的 clock 不可直接當宿主同步已驗證。

無阻擋本輪的待決事項。等音簡寫顯示、全面禁止低幅度 sus／5、小調 III／VI／VII 機率限制仍屬前輪未定政策；本輪不偷渡為全域禁令。沒有收到第三份追加評審。
