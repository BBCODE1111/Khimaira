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

- 2026-10-31 使用者批准的 MORPH 新契約（取代 10/28 根音／低音不變限制）：MORPH 改整組，個別走 EDIT、INVERT、COLOR、ii–V → NEXT。保留小節數、骨幹順序及起拍；允許轉位、同級平行大小調互換（含 Am→Ab、Em→Eb 等根音改變）、導向下一骨幹目標的 ii–V 替換。每個輸出須帶骨幹來源位置，接近／替換須帶實際解決目標；至少保留骨幹的解決目標。幅度控制手法數量，地域調式不得新增音集外音。GENERATE 不移調；有骨幹時不依長度選單截斷或重複。LOAD 依 KEY 設為可 UNDO 新骨幹；INSPIRE 預覽、KEEP 採用、RESTORE 回骨幹。屬功能仍取共用 analyzeHarmony，不把 V／次屬染成 maj7。詳見 docs/morph-backbone/README.md 與 docs/reviews/CONFIRMED-THEORY.md。
