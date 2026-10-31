# 使用者決定套用：未發布 1.0.7 續作（2026-11-01）

基準 `7c54b7a`（已提交第 4 輪）；修改前工作區乾淨。來源 `../round4/alec_answers.md` 是使用者本人決定，第 1 題是使用者委託主持人查證後定案，本輪沿用查證結果。題 1–12 已加入 CONFIRMED-THEORY §1，原條目保留，§5、§6 及歷史衝突均標示被新決定取代。題 13–14 不在本次網站工作範圍。

## 逐題狀態

| 題 | 狀態／驗收 |
| --- | --- |
| 1 | 完成。保留既有按下一目標導音字母拼寫，補無目標 dim7／m7b5 升號預設；骨幹與播放譜選擇器同步性質標籤。C#dim7→Dm、F#m7b5→G、G#dim7→Am、D#dim7→Em 共 48 個移調案例；24 調×2 性質×5 黑鍵＝240 個預設案例，Db7／Gb7 及既有 F#m7b5→B7 另驗。手打符號不強制改寫。 |
| 2 | 完成。共用核心物件參數 spellPitch 保留小調第六字母；12 小調逐一驗自然／升高六級及借用 vi。A 小調 F 保留，F#／F#m 取代 P2-G 的 Gb／Gbm。數字參數相容輸出不改。 |
| 3 | 完成。平行映射後指定低音若為新根音大七度，回傳原和弦，該次不計平行手法。Am/G 及 12 調×60 seeds 覆蓋；C/G→Cm/G、C/E→Cm/Eb、G/B→Gm/Bb 保留。 |
| 4 | 維持現狀。Heavy Metal 的 bVI 互換不關閉；新增測試仍找到 Am→Ab、Em→Eb。 |
| 5 | 完成。跨小節 IV→iv、尾接頭及單小節跨循環保持 IV；同小節允許相鄰 iv。12 調×60 seeds，同小節實際平行 540/720；同小節與跨線分開驗。 |
| 6 | 完成。流行開頭主和弦平行提案率由 1/3 降至 1/12；幅度／功能保護仍優先。Am→Ab、Em→Eb 保持。機率與實際次數見下表。 |
| 7 | 既有行為正確，補測試。C Eb7 D7 Db7 C 的 Eb7 為 bIII7；12 調共用分析、格子與兩種複製模式一致。沒有新增特殊和弦字串判斷。 |
| 8、9、10、12 | 維持現狀。未新增 sus／power 禁令、未改重降顯示、未關小調 III／VI／VII、未新增全延伸音置頂限制。 |
| 11 | 完成。純 IV–V 大三和弦判隱含大調主音，不列 V 調候選。12 調×2 LOOP 狀態×2 根位／轉位進行＝48 案例；IV–V–iii–vi 及關係大小調候選仍保留。 |

衝突紀錄：`tests/review-round1-p2.test.js` 原本要求 F G F G 顯示 G 候選，直接與第 11 題衝突；其產品政策斷言依本次授權改為不列 G，並在 `tests/user-decisions.test.js` 新增上述 48 案例。`tests/key-detection-cases.json` 原標註 C，未更改；所有 golden fixture 均未重製／修改。第 4 輪 P2-G 的 Node／待跑瀏覽器舊 Gb、Gbm 斷言依第 2 題更新。

## 第 6 題：概率與統計

範圍：American pop、Mandopop、K-pop、Ballad、Japanese rock、Latin Pop。只調整第一格為主和弦時的提案；其餘位置仍依各樂風權重。平行 1/12（8.33%），ii–V 提案保留 1/3，其餘 7/12 提案轉位；這是產品概率，不是樂理定律。

固定 `C | G | Am | F`、C major、high、預設密度，seed 0–1199。LOOP off 時開頭無迴圈 IV→I 保護，但仍可能先用完兩格幅度預算／被較早的 ii–V 保留，因此「實際互換」低於「提案」。LOOP on 時開頭 C 為解決目標，所有樂風 0/1200。Latin Pop 的地域音集策略仍禁用調性平行，不因新概率解除。

| 樂風 | 修改前實際／1200 | 修改後提案／1200 | 修改後實際／1200（百分比） |
| --- | --- | --- | --- |
| American pop | 308 | 76 | 59（4.92%） |
| Mandopop | 313 | 101 | 86（7.17%） |
| K-pop | 328 | 86 | 73（6.08%） |
| Ballad | 320 | 108 | 84（7.00%） |
| Japanese rock | 321 | 116 | 101（8.42%） |
| Latin Pop | 0 | 91 | 0（0.00%） |

## P2-D：40/49 達標，其餘限制明列

量測同第 4 輪：LOCK C major，`C | G | Am | F`、high、預設密度，連續按 MORPH。第一組 12 次由 **33/49→40/49**；另每樂風連按 36 次，逐一檢查 25 個滑動的 12 次視窗，共 1,225 視窗；同樣 40 種每個視窗皆至少 10 種結果。這是此固定骨幹／設定的量測，不宣稱所有輸入或無限未來皆有十種。

修改包括：色彩與轉位獨立取樣；地域色彩可保留原和弦；例句某根音缺乏選項時，僅使用該樂風已有性質且保核心、符合每格音集的色彩；64 次搜尋耗盡時選搜尋中最久未出現的有效結果。Doom Metal 轉位／平行權重由 1:6 改為 4:6，避免合法轉位組合過少被選到，仍保留原有 power 低音保護。未擴張地域音集，未改骨幹、起拍、來源映射或解決目標。

| 本次補達標樂風 | 前 12 次不同結果：前→後 | 36 次中最差 12 次視窗 |
| --- | --- | --- |
| Ghana Highlife | 9→10 | 10 |
| Ethiopian Tizita | 6→12 | 12 |
| Hawaiian Slack-key | 6→12 | 12 |
| Native Flute | 4→10 | 10 |
| Indian Bhupali | 6→12 | 12 |
| Indian Yaman | 4→10 | 10 |
| Afrobeats | 6→12 | 12 |

未達標清單（9 種）：

| 樂風 | 前 12 次不同結果 | 限制原因 |
| --- | --- | --- |
| Heavy Metal | 6 | 首 C 與末 F 解決位置保留；G 的重型 power 色彩不自動五音低音，Am 可轉位／Ab 平行，現有合法組合有限。保留使用者批准的 bVI；36 次滑動視窗最低 5。 |
| Phrygian dominant、Dorian folk | 各 4 | 首尾解決位置保留，調式禁止調性平行／ii–V；既有色彩中 G 的 add9／6 會新增各自音集外音，Am 色彩亦受每格音集限制，留下 G/B、G/D × Am/C、Am/E。 |
| Greek Hijaz、Japanese Hirajoshi、Japanese In-sen、Flamenco、Arabic Hijaz、Celtic Dorian | 各 4 | 首尾保留，地域功能／音集限制下，既有風格性質不能替 G、Am 加入更多合法色彩；新增音不可借用其他來源格外音，移除原外音也不允許。此骨幹仍為兩格各兩款轉位，4 種。 |

以上是既有風格詞彙加保護契約下的限制，並非宣稱音樂理論上不存在其他編曲。未用改名、等音換字、無聲事件或更改時值來湊結果數。完整 49 樂風及前後統計見 [USER-DECISIONS-METRICS.json](USER-DECISIONS-METRICS.json)。

重跑：`node scripts/measure-user-decisions.mjs`；若需前後比較，第二參數傳匯出的第 4 輪 checkout 路徑。本輪基準從 HEAD 唯讀匯出 dist JavaScript 至 /tmp，沒有修改 git 或 plugin。

## 驗證與未驗證

- 修改前 `corepack npm test`：348/348。最終完整 Node：358/358，新增 10 個 tests，0 fail／skip／todo；既有相容 corpus、功能鏈、來源映射、音集、節拍等回歸一併執行。
- `corepack npm run lint`、`node scripts/sync-music-core.mjs --check`（6 檔）、`node scripts/sync-web-assets.mjs --check`、`git diff --check` 通過。
- music-core 1.1.6 僅由 canonical source 修改，再由腳本同步發布副本及 manifest；piano-motion 2.0.0 未改。music／genre-rhythm／piano-patterns 中的 core import 版本由資產腳本更新，未改演奏邏輯。
- `corepack npm run test:browser` 已嘗試，但 Chromium 啟動時因 sandbox 的 MachPortRendezvous `bootstrap_check_in … Permission denied (1100)` 結束；沒有瀏覽器測試通過的宣稱。新增／更新的選擇器、預覽瀏覽器斷言仍待實跑；完整 verify:web 未通過瀏覽器 gate。
- 未同步／驗證 SEIREN checkout，未跑其 harness；未驗實機音訊、人耳、DAW／外掛宿主。`plugin/` 無修改；未 commit／push／建立 tag／部署，網站版本維持未發布 1.0.7。
