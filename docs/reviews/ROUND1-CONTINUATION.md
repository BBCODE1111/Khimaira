# 第 1 輪續：交接紀錄（2026-10-31）

以乾淨的 e528c85 工作區為基準；未 commit、未 push、未部署、未建立 tag。未動 plugin，未重製任何 golden fixture。`dist/music-core.js` 僅由同步命令生成。教材資料夾只讀；本輪未啟動瀏覽器。

## 逐項狀態

| 項目 | 實作與驗證狀態 |
| --- | --- |
| 第 0 步教材立場 | 完成 `CONFIRMED-THEORY.md`：已確認條目逐條標明文件段落；回應兩份評審樂理項、主持人三項決定、舊契約衝突與未確認項。抽讀本機三份 PDF 相關四頁的文字／音名表，未冒稱重新渲染或聽寫。 |
| MORPH 與個別和弦分工 | MORPH 仍改整組；播放譜個別 EDIT／INVERT／COLOR／ii–V 不改骨幹；獨立 EDIT BACKBONE。保留上一段存檔防呆與 KEY 修復。Node 過；瀏覽器待主持人。 |
| 12 半音根音 | 骨幹 picker 與播放譜 editor 都有直接可見的 12 根音按鈕，依 KEY 拼字，再選性質；手機六欄按鈕，每個至少 44px。不需展開更多和弦。瀏覽器點選與 F 調 Bb／G 調 F# 斷言已寫，未實跑。 |
| 新 MORPH 契約 | 已更新 AGENTS 與 morph README，明列使用者批准取代 10/28 舊限制。新轉位、同級平行調、ii–V 替換；固定骨幹起拍／次序／小節數；每個和弦事件記 source/technique，接近帶 target。保留實際終止抵達（含迴圈開頭）與替換目標。幅度控制 0/25%/60% 候選預算，受密度及音樂條件限制。 |
| 地域音集 | 網站遇骨幹本來含地域音集外音時，不生成新譜並指出衝突；可 EDIT 或 LOAD 相容範例。有效骨幹沿原有音集約束上色，停用西式借用／替換。沒有默默移調修補輸入。 |
| 瀏覽器 CI | Playwright／axe 列 devDependencies、lockfile 已產生；`npm run verify:web` 是完整閘門。CI setup Node→npm ci→Chromium 安裝→verify:web，成功後才 upload/deploy。兩支獨立網站腳本，涵蓋狀態修復、完整流程、音訊、MIDI、根音／焦點、手機、axe、cache identity。只做語法／lint 檢查，未在本機跑瀏覽器或觀察 GitHub Actions。 |
| 版本／資產 | Web 1.0.3，預定 web-v1.0.3，channel release-candidate。version.json 是網站 query 唯一來源；共用模組 query 分別讀 canonical 1.1.3／2.0.0。`assets:sync/check` 管理全部 js/css 引用，包括 research.html。6 張無引用 PNG 移除，合計 9,806,024 bytes（約 9.35 MiB）。 |
| 符號／錯誤 | 支援 C7#5、Caug7、C+7、CmM7、Co7、C9#11、C7sus2、C7sus、C(add9)。NC／N.C. 為全小節休止；不默默吃掉混合拍數。空白 LOAD 不清譜；A–H 開頭錯誤提示和弦名稱，保留 bVI 等級數輸入。 |
| 手機／Cinzel／無障礙 | 小節改兩欄、關閉手機 sticky score，和弦可換列；控制項 44px、指定說明至少 11px；status 放回文件流。quickProgressions 級數用 DM Sans；加 h1、dialog 名稱、根音群組、焦點進出、BAR 可見文字一致的名稱、ARP seed 名稱。空白鍵不攔截按鈕。尚未目視、axe 或實機驗證。 |
| 同根經過和弦 | 屬三和弦已解決不再補同根 V；任何自動 approach 首音根不等前一事件。2,940 組新增矩陣通過。手工重複和弦不禁止。 |
| MIDI | 分軌固定 Bass ch3／Chords ch2，CC64 只控制和弦；合併 ch1 不變。新／舊 MIDI 音符、時值、總長測試過；更新測試讀取器以 channel nibble 解析。DAW 未驗。 |
| 靜默截斷 | 新契約比原評審提案更嚴：已有骨幹忽略不同長度並提示「未截斷或重複」；小節選單僅用於空白生成。RESTORE／UNDO／recall 測試過。 |
| verify 參數 | 重寫 verify-morph-browser 為現行契約檢查；--seiren／--output 分開，不再依賴缺失的歷史 release。預設系統暫存、拒絕 checkout 內輸出；選用 Seiren 才執行跨產品 smoke。參數解析測試過。 |
| lint | ESLint 10 正確性規則涵蓋 dist、canonical packages、scripts、tests；排除產生副本與 plugin。無錯誤。補正既有 Promise executor 隱含 return 與 VLQ 迴圈賦值寫法，無演奏策略變更。 |
| 延伸音 README | 放寬「全部延伸音都在核心音上方」的過度承諾；保留 #9 高於三音、b9／根音間距、核心音與 E3／低音間距規則。只改文案與新增測試，voicing 演算法未動。 |

## 驗證數字

- 修改前：288／288，0 失敗，22.75 秒。
- 最終：302／302，0 失敗、0 skipped，22.03 秒；完整 `node --test tests/*.test.js`。
- 新 MORPH 對應矩陣 1,080 組（另有可重現性比對）；根音重複接近矩陣 2,940 組；既有 keyed LOAD／MORPH 6,696 組，49 樂風 × 28 骨幹 × 3 幅度 × 5 seeds 共 20,580 組位置回歸。
- 平行調 11 種三／七／延伸例 × 12 調，包含大小調往返；另測迴圈真實目標、幅度、存檔追溯、RESTORE／UNDO、小節不截斷、地域衝突及純 metadata 不造成假 RESTORE。
- `music:check`：music-core 1.1.3、piano-motion 2.0.0，6 個發布檔一致。
- `assets:check`、ESLint、瀏覽器腳本 `node --check`、`git diff --check` 通過。
- `npm ci --ignore-scripts` 依 lockfile 成功重建開發依賴；未下載／啟動瀏覽器。安裝時 npm 回報 4 項 moderate（開發相依）；未將 npm audit 設為新的部署門檻。
- 外掛與 golden fixture 的 git diff 為空。完整 Node suite 中既有 JavaScript 外掛一致性測試通過，不等於原生建置或 DAW 驗收。

## 主持人執行

```sh
npm ci
npx playwright install chromium
npm run verify:web
# 或已安裝 Chrome：
CHROME_CHANNEL=chrome npm run test:browser
# 選用跨產品：
node scripts/verify-morph-browser.cjs --seiren /path/to/Seiren --output /tmp/khimaira-morph
```

瀏覽器預設使用系統暫存。assertion 失敗會退出非零；不得因本機 Node 通過而略過瀏覽器直接發布。1.0.3 tag 尚未建立，交由主持人於測試與發布流程處理。

## 未驗證與 SEIREN

未驗：瀏覽器實際互動／音訊／下載／axe、桌機手機視覺、實機 Safari／Android、VoiceOver、人工聽感、DAW、GitHub Actions 與線上部署。瀏覽器腳本的斷言數量不冒稱已過數量。

SEIREN checkout 本輪未同步、未執行其完整測試。核心 1.1.3 的語法擴充只給 khimaira-v1；本地相容 profile 測試保證新別名未默默進入 seiren-v1，但不能代替 SEIREN 端整合驗證。MORPH、MIDI 聲道與 UI 修改只在 Khimaira；沒有覆蓋 SEIREN 的和聲／旋律／伴奏策略。

需使用者日後決定的三項已列 CONFIRMED-THEORY §5：大三→sus 是否禁止、純 IV–V 是否隱藏候選、是否真的要求全部延伸音皆最高。本輪分別維持允許 sus、C 優先但保留 G 候選、依 H08 保護具體張力與音域；都不阻擋已授權實作。
