# KHIMAIRA 1.0 — 第二輪修正

日期：2026-10-26。依據 BETATEST / 10.26 Claude Code / KHIMAIRA 1.0 測試報告2.docx。

## 和聲

- 保留素材的字母拼法與斜線低音，例如 D7/F#、E7/G#、F#m7b5、F#dim7。移調同時移動字母級數；三全音代理採可讀的半音鄰音拼法。
- 依第二輪的新要求，排除 dim、dim7、m7b5 接近目標，取代第一輪對減和弦自動補 iiø–V 的規則。
- 現有 V 或 subV 不再重複插入；已有 ii 直接接 V。多和弦小節只分割尾端，保留前段和聲。
- 小調轉換處理整句及相連的次屬和弦：E9/G# → Am9 變為 Eb7/G → Abmaj9，B7b9 → Em9 變為 Bb7 → Ebmaj9。保留 IV–iv 對比與斜線轉位級數，不跨休止重新連接次屬。
- 使用者輸入的 Major 素材也可套用 Minor；原本已有小調主和弦的素材視為有意安排並保留。
- 中度自由改寫不再依 seed 奇偶決定是否重構。各樂風使用獨立色彩表；Classical 維持三和弦／屬七，Rock、EDM 不把 V 強制爵士化，Major blues 保留屬和弦主音。
- 自動轉位只在兩側都能形成級進、且減少低音移動時加入；不自動使用 V 的第二轉位。
- 四小節素材延展至 8／16 小節時加入 A–A′、半終止與收尾／循環導回。保留完整藍調及地域模式原有形式。

## 演奏

- Rock、Pop、EDM、Disco、Blues、J-pop、Alberti、Folk、Metal 加入多種音型與四小節收尾變化。
- 加入八小節力度曲線及拍內層次；Rock 的第一拍與 backbeat 更平衡。SUSTAIN 仍精準填滿拍數，不受這些變化影響。
- Ballad 改為真正逐音分解；J-pop 使用獨立低音脈衝與上聲部重音。
- Ballad、Soul、Chill、Gospel、Ambient 上聲部保留至和弦邊界，同音再觸發先結束舊音，模擬踏板。這是音長模擬，MIDI 沒有新增 CC64。
- 網頁鋼琴長音 release 增加至最多 350ms；快速短音維持短尾音。
- Walking 加入二級經過音，以及交替的上／下半音接近下一個低音，不跨休止接近。
- Rootless 取消所有張力音都搬至最高導音上方的規則；保留 #9 高於大三度，優先選無相鄰半音的配置。Dm9 上聲部可收在一個八度。
- ARP 新增 FOUNDATION：純音序、持續低音、低音＋和弦鋪底；設定同步儲存與外掛橋接。

## 操作與畫面

- 播放中切換設定會從目前小節續播；原先指定起播點仍是下一次 PLAY 及循環的起點。調性／模式／小節長度仍按 GENERATE 套用，生成後也續播。
- PLAY 重新開始、STOP 停止、空白鍵切換的既有行為保留。
- 和弦格依字數與拍數預留寬度，長和弦可完整顯示並橫向捲動。
- 手機 dock 顯示 BAR／BEAT，移調與 COPY 收入和弦面板同一列。
- GENERATE 狀態會說明本次是句型重構、保留根音上色或 ii–V 接近。

## 驗證

- `node --test tests/*.test.js`：85 項測試全過。包括 10,368 組 style × key × mode × density × seed 設定，以及所有伴奏模式 MIDI round-trip、音長、同音重疊與 tempo 測試。
- `tests/browser-review2.cjs`：Chrome 無頭測試通過；PLAY 重啟、STOP、空白鍵、cue、播放中設定續播、ARP 底層、剪貼簿、分軌 MIDI、390px／1440px 畫面無溢出、外掛橋接皆通過；沒有 pageerror。
- macOS arm64 VST3／AU／Standalone 重新編譯成功，原生 scheduler 測試通過。
- 檢視 `desktop.png` 與 `mobile.png`；`split-preview.mid` 為瀏覽器匯出的測試檔。
- 自動化檢查可驗證結構與互動；音樂性仍需第二輪耳聽評測。未在實際 DAW 內重新驗證外掛。
