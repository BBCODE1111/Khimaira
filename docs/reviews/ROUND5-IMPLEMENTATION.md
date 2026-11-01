# 第 5 輪網站修改紀錄（2026-11-01，1.0.8 候選）

範圍：`council/006-review`，使用者指定基準 `7448779`／線上 1.0.7。依 `../round5/anon/review_1.md`，沒有評分；P2 編號 02–17 實際為 16 項。讀過共用 README、MORPH 契約、調性文件及 CONFIRMED-THEORY；第 1 節與 2026-11-01 決定未修改。未 commit、push、部署、建立 tag，未改 plugin 或 golden。

## 逐項狀態

| 項目 | 修改與驗證狀態 |
| --- | --- |
| R05-P1-01 | 新增 `browser-round5-checks.cjs`，由既有 browser-web-ci → run-browser-ci 執行。M02 單獨關閉三種手法，各連按 12 次並逐事件排除；先以 16 次全部開啟確認三種結構手法皆出現。M03 勾選保留低音後連按 12 次排除轉位、ii–V、接近。M07 選 ARP 後點 SUSTAIN，實際下載、解析每音起拍／拍長與音集，涵蓋 3+1、2+2 拍。M08 從實際結果找非首小節目標，逐格對比來源文字與 target.bar+1。M11 在 375×667 確認 A 可見並實際點選、比對骨幹。已注入並還原五次；瀏覽器皆在啟動階段失敗，**抓漏有效性待主持人驗收**。 |
| R05-P2-02 | 歷史列及 label 設 min-width:0，select 依容器寬度收縮；新增 320／375／390 右緣檢查。瀏覽器待驗。 |
| R05-P2-03 | 待換譜期間保留舊譜 DOM 與舊時值來標示 sounding；下一小節同步換新譜，顯示排隊／切換提示。舊譜短暫 aria-busy/inert，避免點舊格卻編輯新格；明確按 EDIT 則立即切到新譜並延續拍鐘。虛擬時鐘測試新增切換前後完整譜與 sounding 比對，沿用既有排程起音斷言；瀏覽器待驗。 |
| R05-P2-04 | INVERT、COLOR、編輯器 APPLY 移除 stop，與 NEXT 一樣經 dispatch 更新既有播放器。四項都加入 LOOP 拍位連續與 aria-pressed 斷言；瀏覽器待驗。 |
| R05-P2-05 | 抽到已關閉的手法時，按剩餘可用樂風權重重分配；保留全開時原分布、開頭主和弦平行提案與所有保護。Jazz、C Am F G、只開平行、高幅度 60 種子均為 2 格。樂風不支援 ii–V／地域不支援平行或 ii–V 時顯示原因。Node 已驗，UI 待驗。 |
| R05-P2-06 | AUTO 的偵測調性相同時保留 A/B；確實改調才重新解讀並提示歷史清除。Node 驗證六筆歷史與 score；新增 UI LOCK→AUTO 比對待驗。 |
| R05-P2-07 | 還原鈕強制 DM Sans、無大小寫轉換，覆蓋原 Cinzel 高 specificity 選擇器；新增 computed font 斷言，瀏覽器待驗。 |
| R05-P2-08 | 手機每個變更格顯示 △ 加手法文字；父按鈕的無障礙名稱保留完整來源、手法、目標。裝飾標記 aria-hidden 避免重複朗讀。新增可見／名稱斷言，axe 與實際畫面待驗。 |
| R05-P2-09 | 共用核心升 1.1.7，只擴充 khimaira-v1 六個指定別名；精確音程與 seiren-v1 仍拒絕的案例已驗，H7 仍拒絕。透過同步命令產生 dist，未手改。SEIREN checkout 未同步／未驗證。 |
| R05-P2-10 | 手動音高編輯保留 source 地址，改標「手動編輯」並去除舊手法／目標宣稱；相同起拍、時值的文字編輯也繼承來源。ii–V 編輯其中半格後仍可整個來源還原、UNDO 回編輯；真正時值不符才阻止。Node 已驗，新增實際根音按鈕編輯／還原 UI 案例待驗。 |
| R05-P2-11 | LOOP 以布林 checked 存取，重整同步 aria-pressed；新增重新整理測試待驗。 |
| R05-P2-12 | README 明列已發布 1.0.7／候選 1.0.8，release-candidate 僅指 checkout。改正歷史段落的待決 F# 說法；三個舊版本斷言按升版要求更新，新增文件回歸。 |
| R05-P2-13 | 601px 以上、500px 以下矮視窗不固定整組譜，控制列固定底部；新增 667×375 每 25px 捲動測 MORPH 邊界與 hit-test，待主持人驗。 |
| R05-P2-14 | 採報告允許的文件方案：明列既有 16 小節／每小節四和弦上限，理由是維持受測的手機、排程、存檔範圍。未擴為 32 小節，沒有宣稱 <200ms；17 小節拒絕保留測試。 |
| R05-P2-15 | idea 使用「從空白／全休止骨幹產生新進行」提示，明說 RESTORE 可回原骨幹；全休止仍可主動 MORPH 產生想法，非悄悄當成普通骨幹變化。Node 驗 idea／RESTORE，顯示待驗。 |
| R05-P2-16 | 非調式低幅度原選格無色彩時再找其他可用格，保持零結構手法預算。地域／調式低幅度保留原色彩並明示限制。Jazz 100 種子均有色彩差異；跨樂風抽樣見下。 |
| R05-P2-17 | 新 session-codec 僅在序列化 UNDO 時共用重複資料，不刪歷史或減少容量；讀取舊格式不變，解碼後仍走完整存檔驗證。16 小節連按 45 次由 1,088,839 bytes 降至 151,807 bytes（低於 500KB），逐項比較解碼及全部 UNDO／A/B；解碼還原獨立物件避免編輯污染舊快照，循環引用損毀會拒絕。 |

## 實跑與限制

- 修改前 Node：358 pass／0 fail／0 skip。
- 初版全套測試找到三個過期版本斷言與兩個新引入的行為回歸。版本依明確升版要求更新；行為回歸以縮小預算重分配修正，沒有降低使用者決定的斷言或重製 fixture。
- 最終實跑：Node **366 pass／0 fail／0 skip**（24.37 秒），比基準新增 8 項；`corepack npm run lint` exit 0；music-core 1.1.7／piano-motion 2.0.0 共 6 檔同步檢查通過；web assets 1.0.8 檢查通過；`git diff --check` 通過。最終 Node log：`/tmp/khimaira-r5-final.log`。
- 分支及 HEAD 實查為 `council/006-review`／`7448779`；plugin/、golden fixtures 的 diff 為空。
- 低幅度抽樣：28 種非地域、非特殊調式樂風 × 5 進行 × seed 1–49 = 6,860 組；固定 C major，進行為 C Am F G、C G Am F、F G Em Am、Dm7 G7 Cmaj7 A7、F Fm C C。使用基準 backbone-mutation 與本輪版本比較 serialize；相同骨幹數 2,764→927（40.29%→13.51%）。這是指定樣本，不能視為所有音樂或聽感統計。
- 瀏覽器正向 fixture 經 Node 預查：16 次 MORPH 包含 inversion／parallel／ii-V，並有 58 個非首小節 target；此為測資可用性驗證，不當作 UI 測試通過。
- Chrome 修改前即 SIGABRT，尚未到頁面斷言。五次注入均實際寫入檔案、執行 run-browser-ci、finally 還原原始 bytes；exit 1 都標 **baseline-blocked**，不能算 detected。詳見 `ROUND5-MUTATIONS.json`，完整 log 留在報告 output 暫存目錄。
- 新增瀏覽器編輯操作皆點 `#editorRoots [data-root]`，沒有操作隱藏的 `#editRoot`。
- app.js 僅展開本輪改到且有 UI 回歸覆蓋的 render 段落；其餘資產的大量 diff 為 1.0.8 query 同步，沒有改演奏規則。

主持人在 sandbox 外驗收：

```sh
export PATH=/Applications/ChatGPT.app/Contents/Resources/cua_node/bin:$PATH
CHROME_CHANNEL=chrome corepack npm run verify:web
CHROME_CHANNEL=chrome node scripts/check-round5-mutations.cjs
```

注入工具先跑乾淨基準，再逐一注入五個缺陷；只有基準通過、變異非零且對應 AssertionError 成立才標 detected；其餘返回非零。每次自動還原。本機受限不得假報通過。另請核對手機標記、Am 字型、橫向控制列及真實音訊排隊顯示。

未驗：完整瀏覽器與 axe、實機手機、Safari／Firefox、VoiceOver、聽感、真實音訊輸出、DAW、Lighthouse、32 小節、SEIREN harness、外掛宿主。只有網站 checkout 做共用同步；另端應按 packages/music-core/README.md 同步後跑其 harness。

## 樂理異議與外掛

評審 §4 六項均保留現狀並交主持人：小調 VII 平行、轉位大七度低音、4536 的 G→Gm、C2 定義、保留低音線命名、斜線保根音的六音上聲部。未推翻 CONFIRMED-THEORY §1。README 已有斜線最多六音例外，RUBRIC 文字是否同步由主持人決定。

plugin/ 未變更、未重建原生外掛。網站 MORPH 的開關重分配／低幅度色彩及 Khimaira 解析別名會影響日後採用本 JS 引擎的外掛；既有已發布二進位不會因網站候選檔案自動更新。Node 的外掛整合測試不代表宿主或 DAW 驗證。
