# Web 1.0.5：手機橫向讀譜與播放跟隨

基準：1.0.4 / `889d560`。保留 R02 的 MORPH、轉位／平行／ii–V、低音保護、六次歷史、A/B、存檔、音訊與 MIDI 契約。

## 修改

- 手機頂部恢復單行橫向和弦譜，顯示小節、和弦與級數。當前小節亮框，當前和弦高亮並水平跟隨，頁面垂直位置保持。
- 手動橫滑／水平滾輪／鍵盤瀏覽暫停跟隨；按「回到播放」恢復。循環回起點與寬小節中的後半和弦也跟隨。垂直滑頁與普通點擊不暫停。
- 底部保留 KEY、MORPH、PLAY、STOP、LOOP、MIDI；移除重複的全譜文字摘要。即時結果訊息 6.5 秒後清除。
- 歷史比較／複製移入正常文件流中的展開區。手機在和弦編輯器顯示來源、手法、目標與單格還原；桌面保留格內資訊。
- 一般面板底色約 65% 不透明，固定譜面約 85% 並模糊背景。文字不降透明度；減少透明效果偏好使用實色。固定控制列及骨幹編輯器移到譜面外，避免祖先 backdrop-filter 改變 fixed 定位。
- 1.0.5 資產 query 由 assets:sync 統一更新。音樂模組僅更新 import query，未修改樂理／生成／演奏演算法、共用核心、外掛或 golden fixtures。

## 驗證

修改前 Node：315/315。最終 `verify:web` 通過：music:check、assets:check、lint、Node 315/315（0 skipped）、兩支完整瀏覽器流程；新增 16 小節／密集四和弦、手機跟隨及桌面固定列檢查通過，axe 無 serious／critical 問題。截圖已目視核對。

瀏覽器涵蓋：既有 KEY／壞存檔／UNDO、MORPH／KEEP／RESTORE、六次 A/B、音訊、四份 MIDI 解析、資產版本、axe；新增 375×667 與 390×844 固定譜面與底部列、手動暫停／恢復、垂直位置、LOOP 回起點、單格來源還原；320px 頁面不溢出、16 小節與密集四和弦、桌面固定譜面與播放列。

原 R02 的「grid 不得水平捲動」與「底部摘要可見」斷言，依新版介面改為「頁面不溢出、譜面可水平捲動、結果與控制項可見」。版號測試同步至 1.0.5，未放寬音樂測試。

本機指令：`CHROME_CHANNEL=chrome npm run verify:web`。CI 使用 Chromium 與相同的 verify:web 閘門，通過後才發布。

## 後續實機複驗

真實 iPhone／內嵌 Safari 的網址列伸縮、直橫轉向、安全區、VoiceOver、強光可讀性及長時間 LOOP，仍待實機確認。本輪未作 DAW 或人工聽感驗收，未請外部評審重新打分，不宣稱整個 loop 已結案。

詳細使用者討論與原始照片保存在維護主機的 `CHORD SOLUTION/reviews/mobile-follow-20261031/`；該本機交接資料不包含在網站發布中。

畫面：[手機播放跟隨](mobile-follow-20261031/score-follow-375.png) · [和弦細節](mobile-follow-20261031/score-details-375.png) · [桌面](mobile-follow-20261031/score-desktop.png)
