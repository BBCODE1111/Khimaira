# KHIMAIRA 調性判定知識庫與修正規格

給 Codex：請把本檔放進 `Khimaira/docs/key-detection-theory.md`，並在 `Khimaira/AGENTS.md` 加一行「修改調性判定、級數、GENERATE 前必讀 docs/key-detection-theory.md」，讓之後每次修改都遵守這些規則。

## 1. 實測結果（commit 1e87301，2026-10-28）

新版已大幅改善：調性只在播放欄出現、GENERATE 不再轉調、級數輸入可用、改判／移調分開、MUTATION 三段有明顯差距，網站測試 167/167 通過。

但調性判定在 30 組人工標註的進行中錯了 5 組，**全部都是「次屬和弦」或「ii–V 接近」被誤當成新的調**：

| 進行 | 正確 | 判定結果 | 錯在哪 |
| --- | --- | --- | --- |
| Dm \| G \| C \| A7 | C major | D minor | A7 是 V7/ii（回到開頭的 Dm），被當成 D 小調的 V |
| Dm7 \| G7 \| Cmaj7 \| A7 | C major | D minor | 同上，ii–V–I＋迴圈回 ii |
| C \| E7 \| Am \| D7 \| G7 \| C | C major | G major | E7＝V/vi、D7＝V/V，被當成 G 調證據 |
| Cmaj7 \| Am7 \| D7 \| G7 | C major | G major | D7＝V/V（I–vi–II7–V 經典 turnaround） |
| F#m7 \| B7 \| Emaj7 \| C#7 | E major | F# minor | 同第一例，移到 E 調 |

另外介面上的問題：

1. **三全音代理的拼法：** F 調出現 `D#7#11`（應為 `Eb7#11`，A7 的三全音代理）；D 小調出現 `G#7#11`（應為 `Ab7`）。三全音代理應以「目標和弦上方半音」拼寫，在降號調用降記號。
2. **轉位級數顯示：** `Am11/G` 顯示成 `ii11/1`、`Gmaj7/D` 顯示成 `Imaj7/5`，一般使用者看不懂。建議顯示 `ii11/G`（低音用音名），或提供轉位記號（⁶、⁶₄、⁴₂）切換。
3. 改判成 C major 之後，級數正確顯示為 `ii V I V7/ii`。代表**級數分析器已經懂次屬和弦，但判定器沒有用到它**。修正方向就是讓兩者共用同一套功能分析。

## 2. 樂理規則（判定器必須遵守）

### 2.1 先做功能分析，再判定調性

不要把每個和弦獨立計分。先辨認和弦之間的功能關係，再判斷調性：

1. **屬功能和弦：** 大三和弦或屬七和弦（含 7、9、13、alt、sus），若下一個和弦的根音在它下方完全五度（上方四度），就是「通往該和弦的屬和弦」。
2. **次屬和弦（V/x）：** 若目標和弦 x 是某調的順階和弦（不是主和弦），這個屬和弦就是 V/x。**它是 x 的證據，不是新調的證據**，不可因為它不在調內而扣分。
3. **ii–V 組（含 ii–V/x）：** 小七或半減七和弦接一個下方五度的屬和弦，視為一組，目標是屬和弦解決到的和弦。
4. **三全音代理（subV/x）：** 屬七和弦根音在目標和弦上方半音（例如 Db7→C），視同 V/x。
5. **迴圈（loop）：** 流行與爵士常是 4 或 8 小節循環。**最後一個和弦要接回第一個和弦一起分析**。`Dm | G | C | A7` 的 A7 解決到下一圈開頭的 Dm，所以是 V7/ii。
6. **終止（cadence）：** V→I、ii–V–I、IV–I、iv–I（借用）、bVII–I。終止抵達的和弦是主和弦的最強證據，比「第一個和弦」重要得多。
7. **借用和弦：** 大調中的 iv、bIII、bVI、bVII、ii°，是同名小調借用，不改變主音。

### 2.2 判定流程

1. 解析每個和弦：根音、性質、低音、拍長。
2. 功能分析：依 2.1 標記 V/x、ii–V/x、subV/x、終止點，處理迴圈接回。
3. 為 24 個大小調評分：
   - 和弦是順階和弦，或是指向順階和弦的次屬／ii–V／三全音代理：加分（依拍長加權）。
   - 終止抵達的和弦是該調主和弦：大幅加分；在句尾（第 4、8 小節或迴圈接回點）再加分。
   - 借用和弦：小幅加分，不扣分。
   - 無法解釋的和弦才扣分。
4. 輔助訊號：把所有和弦音按拍長累積成 12 音分布，與 Krumhansl–Kessler 或 Temperley 調性輪廓做相關係數，作為次要分數（權重約 20%），用於功能分析無法決定時。
5. 候選：第一、第二名差距小於門檻時顯示「Also fits」；關係大小調（C／Am）差距小時兩者都顯示。
6. 判定結果與級數分析必須一致：用判定出的調做級數分析時，不應出現大量「無法解釋」的和弦。若有，退回檢查第二候選。

2026-11-01 使用者答覆第 11 題補充：純大三和弦 IV–V（含轉位、F G F G）依隱含主音判 C major，候選不列 G major；此為已批准產品政策。只限這種雙根音進行，不撤銷 IV–V–iii–vi／關係大小調的候選，也不把隱含主音當已發生終止。

### 2.3 常見型態對照（必須全部判對）

| 進行 | 調 | 功能 |
| --- | --- | --- |
| Dm \| G \| C \| A7 | C | ii V I V7/ii（迴圈） |
| C \| A7 \| Dm \| G7 | C | I V7/ii ii V7 |
| C \| E7 \| Am \| D7 \| G7 \| C | C | I V7/vi vi V7/V V7 I |
| Cmaj7 \| Am7 \| D7 \| G7 | C | I vi V7/V V7（turnaround） |
| Em7 \| A7 \| Dm7 \| G7 \| C | C | iii V7/ii ii V7 I（循環五度） |
| Cmaj7 \| C7 \| Fmaj7 \| Fm6 \| C | C | I V7/IV IV iv I |
| C \| Db7 \| C | C | I subV7 I |
| Am7 \| D7 \| Gmaj7 | G | ii V I |
| Bm7b5 \| E7 \| Am | Am | iiø V i |
| F \| G \| E7 \| Am | Am | VI VII V7 i |
| F \| Fm \| C | C | IV iv I（借用） |
| C \| Bb \| F \| C | C | I bVII IV I（混合利地安借用） |
| C \| Ab \| Bb \| C | C | I bVI bVII I |
| D \| A/C# \| Bm \| F#m \| G \| D/F# \| G \| A | D | 卡農 |
| F \| G \| Em \| Am | C 或 Am（顯示候選） | IV V iii vi |
| Am \| F \| C \| G | Am 或 C（顯示候選） | i VI III VII／vi IV I V |
| C7 \| F7 \| C7 \| G7 | C（藍調） | I7 IV7 I7 V7 |

請把這張表連同第 1 節 30 組，以及至少 30 組新的（含轉位、sus、延伸和弦、8 小節以上、中途轉調的 A 段／B 段）寫成 `tests/key-detection.test.js` 的固定案例。

## 3. 參考資料（可閱讀，不可直接複製未授權資料到產品中）

- **Krumhansl–Schmuckler 與 Temperley 調性輪廓：** Temperley (1999), "What's key for key?"（[PDF](https://music.informatics.indiana.edu/courses/I546/pdf/temperley.pdf)）。用 12 音分布與 24 調輪廓做相關係數，適合當輔助訊號。開源實作可參考 [partitura key_identification](https://partitura.readthedocs.io/en/latest/_modules/partitura/musicanalysis/key_identification.html)（提供 Krumhansl–Kessler、Temperley、Kostka–Payne 三種輪廓）。
- **用和弦序列＋調性文法判定調性（含次屬和弦）：** Lam & Lee, ISMIR 2014, "Automatic Key Partition Based on Tonal Organization Information"（[PDF](https://archives.ismir.net/ismir2014/paper/000236.pdf)）。以 Rohrmeier 的調性文法分析主、屬、下屬功能區與 V/X，次屬和弦視為暫時離調而非轉調。這正是我們要的方向。
- **功能和聲文法：** de Haas 等人的 HarmTrace（[Utrecht](https://dspace.library.uu.nl/handle/1874/35241)），以及爵士和聲文法（[EPFL DCML](https://www.epfl.ch/labs/dcml/a-grammar-theory-of-jazz-harmony/)）。
- **測試資料：**
  - 流行／搖滾：Temperley & de Clercq 的 RS 200 語料庫（[Harmonic Analyses](https://rockcorpus.midside.com/harmonic_analyses.html)），每首歌有羅馬級數分析與調性標記。網站未標示授權，只能下載到本機做測試，不可放入公開儲存庫或產品。
  - 爵士：Jazz Harmony Treebank（[ISMIR 2020](https://program.ismir2020.net/poster_2-06.html)），來自 iRealPro 公開和弦譜的階層分析。同樣只用於本機測試。

## 4. 驗收

1. 第 2.3 節全部、第 1 節 5 個錯誤案例全部判對；新增案例正確率 ≥ 95%，其餘須顯示正確答案為候選。
2. 若取得 RS 200：在本機跑全部歌曲，記錄以「每首主要調」計算的正確率（目標 ≥ 90%）及錯誤清單，不提交原始資料。
3. 三全音代理一律以正確升降記號拼寫；轉位級數改為一般使用者看得懂的寫法。
4. 判定器與級數分析共用同一個功能分析模組；改判後的級數與判定時的分析一致。
5. 網站與外掛共用相同結果；既有測試全過。
