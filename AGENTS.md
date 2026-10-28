# Khimaira 與 Seiren 的維護邊界

- 修改樂理、和弦、和聲或跨產品功能前，閱讀 `packages/music-core/README.md`。
- 共用樂理唯一來源是 `packages/music-core/core.js`；不要手改 `dist/music-core.js`，也不要把 Khimaira 的生成策略整份蓋到 Seiren。
- TEXTURE 織體的共用來源為 `packages/piano-motion/motion.js`；先讀 `docs/course-study-20261027.md` 的證據、反例及產品差異，使用同一同步命令；舊 Piano 音型與生成策略仍屬本產品。
- 根據需求判斷共用核心與各產品的影響，保留相容設定及已 debug 行為。沒有明確產品行為變更時，輸出契約應保持一致。
- 共用修改需同步並驗證兩邊；只有本 checkout 時，清楚記錄另一邊尚未驗證。用 README 的命令檢查，不要假設單邊測試能證明另一邊正常。
- 保留其他正在進行的未提交修改；遇到測試失敗，先比對修改前基準。不得為讓測試通過而直接重製 golden fixture。

- POP／TEXTURE 樂句共用 `applyPianoPhrase`，先讀 `docs/piano-phrases-20261027.md`；各產品原有 12 款 renderer 與生成邏輯不合併。保留 original 演奏指紋及舊專案遷移。Khimaira 的 POP 顯示仍使用舊 piano* ID。

- 現行演奏規格改以 `docs/piano-audit-20261027.md` 為準。舊 pianoRevision 1 使用凍結演奏；新規則需通過拍號辨識度、人聲式樂句差異、低音域保護及 CC64 實際延音稽核，不只檢查音符不為空。

- 修改調性判定、級數、GENERATE 前必讀 docs/key-detection-theory.md。

- 修改任何演奏方式（performance.js、piano-patterns、arpeggiator）前必讀 docs/genre-rhythm-theory.md。2026-10-28 使用者要求：小節格線錯誤修正適用所有存檔；舊存檔保留音型名稱與參數，新樂風模板只在新選取音型時啟用；ARP 相位與自動化契約保留。

- 2026-10-28 MORPH 契約：範例 LOAD 依目前 KEY 載入並設為新骨幹，可 UNDO。MORPH 保留每個原和弦的起音位置、根音與指定低音，只上色／在尾端加入解決到下一個實際目標的經過和弦；不得呼叫重作進行或減密度刪掉原和弦。屬功能取自共用 analyzeHarmony，禁止把 V／次屬染成 maj7。INSPIRE 是預覽，KEEP 才採用，RESTORE 回目前骨幹。驗收見 docs/morph-backbone/README.md。
