# Khimaira奇美拉 - 和弦怪物

**Extend your chords like the legendary monster**

KHIMAIRA 是給作曲、編曲與吉他手的和聲探索工具。輸入一條簡單進行，讓它長出不同的和聲色彩、聲部與演奏方式，再把 MIDI 帶進 DAW。

![KHIMAIRA](docs/screenshots/studio.png)

## 從四個和弦開始

1. 輸入 `| C | Am | F | G |`，可直接按「GENERATE」。想聽原樣時按「LOAD」；留白則依樂風生成。
2. 選擇 4、8、12 或 16 小節、調性、樂風與變化幅度；設定變更後按生成才改寫譜面。速度放在演奏區。
3. 展開「進階和聲」可選 Mutation、和弦密度與保留根音；再按相同手法或 **GENERATE** 就會換一組變體。
4. 低隨機性保留原來的根音與功能；中度加入延伸與句型改寫；高度允許更大的根音替代與和聲重構。局部 ii–V 依下一個目標和弦產生：選 C 後按 **ii–V → NEXT**，`| C | Am |` 會變成 `| C:2 Bm7b5:1 E7:1 | Am |`。目標可在同小節；空間不足時保留原譜並提示。最後一小節只有在 LOOP 開啟時連回開頭。
5. 點擊橫向和弦譜上的任何和弦，用選擇器換根音、種類、斜線低音與延伸音。可以分割一個和弦、移除和弦、Undo，或把結果設為新起點。
6. 按 PLAY 或空白鍵試聽，再按一次停止；輸入欄內的空白鍵仍用於打字。點 BAR 編號設定起播小節，播放中點另一小節可跳轉。LOOP 從選定小節循環至結尾。
7. MIDI 匯出目前演奏；SUSTAIN 匯出原樣長音。匯出保留整條和弦譜，不受試聽起播點影響。

小節中可放多個和弦。`| C:2 Dm7:1 G7:1 |` 代表 C 兩拍、Dm7 一拍、G7 一拍。`Am` 是 A 小和弦，`AM` 是 A 大和弦。

![和弦選擇器](docs/screenshots/chord-editor.png)

## 不同樂風，不同演奏

原有 25 種方向：Jazz、Gospel、Fusion、Bossa nova、Rock、Japanese rock、Deep / Soulful House、Classical、Phrygian dominant、Dorian folk、Soul、R&B、Funk、EDM、Lo-fi hip-hop、Chill、Neo-soul、American pop、Mandopop、K-pop、Major blues、Minor blues、Neoclassical rock、Nu-disco、Ambient。

- **Deep / Soulful House**：持續九和弦、共同音、疏密交替的切分與獨立低音，建議 114–124 BPM。
- **古典戲劇搖滾**：小調與和聲小調色彩、半音低音線、踏板音、鋼琴 ostinato。
- **大小調 Blues**：12 小節框架、quick change、ii–V / iiø–V，以及 turnaround。選 12 bars 可保留完整練習曲式。
- **Soul / R&B / Neo-soul**：延伸和聲、borrowed iv、次屬與有呼吸的演奏。
- **Funk / Lo-fi / Chill**：以休止、音長、重音、留白與聲部配置建立不同節奏感。

目前共 42 種樂風與 42 種演奏。演奏包含精準長音、swing comping、Bossa、Deep House、Funk、Lo-fi、各式 arpeggio，以及古典分解。音符時間、音長與力度的調整會寫入 MIDI。

範例採「Ex1 · 明亮・輕快」、「Ex2 · 憂鬱・深夜」等簡短標題，不顯示歌名。42 種樂風各有 7～13 組，共 334 組範例：包含 38 組參考短句、既有風格練習，以及新增的 168 組原創明亮／憂鬱／夢幻／張力練習。

INSPIRE 先帶你比較四個方向，再交錯探索其餘範例；完整輪過後才回到開頭。LOAD 和 INSPIRE 共用同一份清單，不會只在幾首參考進行中重複。播放中按 INSPIRE 會從新範例第一小節接著試聽，保留 BPM；新範例會套用相應的音長與配置，之後仍可手動調整。

不同方向改變根音走向、大小調色彩、延伸音、和聲密度或持續低音。地域調式練習保留其音列，情緒名稱是相對的聆聽提示。大／小調藍調的新範例保留 12 小節曲式，選 12 bars 可聽完整版本。

參考素材為移調、節奏正規化的短和聲骨架，不含旋律或歌詞，也不是完整錄音逐音重現；素材池為內建資料，不是即時榜單服務。

![範例情緒標題](docs/screenshots/inspiration-directions.png)

## 地域音樂與跨文化流行

新增 17 種方向，依組別放在同一個樂風選單；範例仍使用 Ex 編號。

| 方向 | 和聲／音階重點 |
| --- | --- |
| 希臘 Hijaz、阿拉伯 Hijaz 色彩 | 大主和弦、小 iv、半音與增二度，主音踏板 |
| 日本 Hirajoshi、In-sen | 兩組不同五聲音列，稀疏撥弦與開放配置 |
| 迦納 Guitar Highlife | 大調 I–IV–V、交錯分解與切分 |
| 衣索比亞 Tizita | 大調型五聲、短句應答 |
| 夏威夷 Slack-key 靈感 | I–IV–V、交替低音與上方旋律 |
| 北美原住民笛的當代五聲練習 | 小五聲、持續低音與呼吸留白 |
| 印度 Bhupali、Yaman 音列 | Sa／Pa 持續音；Bhupali 五聲、Yaman 升四度 |
| Afrobeats、Amapiano | 切分和聲與低音應答、七九和弦循環 |
| Reggaeton、Dancehall、Latin pop | Dembow 啟發落點、離拍 vamp、3–3–2 和聲節奏 |
| Flamenco、愛爾蘭／凱爾特 Dorian | 安達魯西亞終止、Dorian i–IV 與空五度 |

地域預設使用固定調式；「調性」選擇主音，「大小調」顯示「調式 · 依樂風」。吉他工具優先顯示該樂風的音階、完整音名與五個把位，也標出和弦衝突音。一般自由改寫會遵守預設音集；使用者明確選取 ii–V、三全音代理或保留根音時，可進入融合和聲。

這些是以研究為基礎的**原創現代伴奏練習**，採十二平均律與 4/4；音階相同不代表文化或旋律句法相同。印度項目未重建完整 raga、meend 或 tala，Hijaz 未模擬細部音準，北美項目不代表所有族群。夏威夷吉他圖仍為 EADGBE 標準調弦；演奏與 MIDI 只提供音高節奏，沒有鼓組或 log-drum 音色。

## 精簡操作與視覺

主要流程為「輸入／選範例 → 生成 → 試聽／匯出」。進階和聲、演奏細節、吉他工具和 Chord Melody 可各自展開，原有功能完整保留。背景採低對比希臘雕刻器物、月桂與里拉琴，按鈕採象牙白嵌片與古銅細框，搭配 Cinzel 字體；譜面與吉他圖使用乾淨底色。

和弦譜位於最上方並保持可見，下面才是 01／02／03 功能。手機直式使用薄和弦列，底部固定 PLAY／STOP／LOOP／MIDI。和弦內音轉位與平行大小調色彩在 02 區；COLOR 保留延伸音及相容低音，特殊結構請用 EDIT 手動處理。

![手機操作](docs/screenshots/mobile.png)

## 吉他的音位與旋律

展開「吉他工具」後，每個和弦提供多種音階選擇，列出完整音名，並提供五個可切換的指板區域和六線譜練習。五個區域參照 CAGED 的位置分布；圖中標示音位，不指定手指編號。

例如 C Dorian：`C D Eb F G A Bb`。相容音階和較有張力的色彩音階分開標示。

![五把位音階](docs/screenshots/scales.png)

展開 **Chord Melody**，即可為整條進行選擇四音吉他按法，兼顧低音、三七音、把位移動及最高音的旋律方向。再按 Generate 會換一組頂聲部走向。可選指板區域、用鋼琴試聽實際吉他音高，或匯出按法 MIDI。

圖中 `×` 表示該弦不彈；可省略的五音或色彩音會列在卡片上。若指定區域沒有合適按法，會清楚顯示空缺，請放寬把位或簡化和弦。這是原創頂聲部和弦練習，不會重現參考歌曲的旋律。

![Chord Melody](docs/screenshots/chord-melody.png)

## MIDI 與 DAW

- BPM 可在播放中即時調整，保留目前拍點；4/4 的 60、120、240 BPM 分別是每小節 4、2、1 秒。
- GATE 調整演奏音符的長短，短音尾音隨時值縮短。長音模式維持完整拍數；音階與 Chord Melody 試聽也跟隨 BPM。
- 標準 MIDI、480 PPQ，不寫入 tempo 事件。下載 `.mid` 後拖入 DAW，使用 DAW 專案速度；匯入時保留專案 tempo 設定。
- **原樣長音**準確填滿每個和弦的拍數，不套用 humanize、swing 或 gate，方便在 DAW 自行編排。
- **目前演奏**使用和試聽相同的音序資料。
- **吉他按法 MIDI**使用圖中實際弦／格所對應的音高。
- 網頁使用鋼琴採樣；DAW 由你選的樂器發聲。這是和聲／MIDI 工具，沒有鼓組、完整伴奏製作或即時 DAW 同步。

## 本機啟動

無需安裝前端依賴。使用 Python 3：

```sh
python3 -m http.server 5173 --directory dist
```

開啟 `http://localhost:5173`。進行和設定儲存於目前瀏覽器的 localStorage。測試需要 Node.js：

```sh
npm test
```

網站原始碼與靜態資產在 `dist/`；測試在 `tests/`。GitHub 僅包含網站、使用說明和截圖。研究、對話、發佈憑證與主機設定不包含在此儲存庫。

## 採樣授權

鋼琴使用 Alexander Holm 的 **Salamander Grand Piano** 採樣，CC BY 3.0，經 Tone.js 公開版本分發。網站保留採樣標示與授權連結，詳見 [About / 採樣授權](dist/research.html)。
