# KHIMAIRA 1.0.1 評測修正

日期：2026-10-26（Asia/Taipei）

修正在 `Khimaira` 1.0 主專案。`Khimaira-2.0`、既有的 `Khimaira-Plugin` 與 BETATEST 參考原件未變更。

## 五項優先問題

| 問題 | 修正與驗證 |
| --- | --- |
| 升記號調拼成降記號 | E 大調產生 `Emaj7 C#7 F#m7 B7`；F# 調使用 F#、C#、D#m。次屬依目標拼字，編輯器保留輸入的根音與斜線低音拼法。 |
| 常用和弦別名不能解析 | 加入 sus、+、°、m(maj7)、-7、add2、2、maj 與 7b5；保留斜線低音及拍數。 |
| 上聲部小二度與低音混濁 | 延伸和弦省略上聲部根音；張力音放在核心音之上；最多五個上聲部，預設最低 E3，與低音至少一個八度。7alt 的 #9 高於 3。 |
| LOOP 無可見狀態 | 開啟為古銅亮底及實心圓，關閉為深底空心圓；PLAY 播放中維持亮底 `PLAY`，再按一次從起播點重新播放；STOP 停止，空白鍵切換播放／停止。 |
| 首次 Jazz 卻用 Ballad | 初次套用 Jazz / Rootless / Swing；有儲存設定時尊重手動偏好。 |

## 其他已完成項目

- 減三、減七與半減和弦作為目標時使用小調 iiø–V7b9，例如 `Bdim ← C#m7b5 F#7b9`。
- Funk 延伸改寫優先使用 9／13 與 m7／m9／m11。
- 延伸吉他按法允許省略五音與 13 和弦的 11，保留指定低音、三／七及主要延伸音；圖中標明省略音。
- MIDI 力度由乘 100 改為乘 127 並限制在 1–127，網站與原生外掛一致。
- Funk／Fusion 十六分與一般十六分分解支援 Swing；Lo-fi 每個上聲部攻擊依生成 BPM 晚 30ms。即時變速沿用拍點排程，並非每次變速都重算固定毫秒偏移。
- Rock 分開低音八分與上聲部，2、4 拍加重；Jazz 可選根音／2-feel／4-feel；Ballad 可選上聲部晚半拍。
- 羅馬級數、整條進行 ± 半音、和弦文字／羅馬級數複製；移調 Undo 還原和弦、原始進行與調性。
- 網站匯出可選 SMF Type 1 的 Bass／Chords 兩軌。維持 480 PPQ、正確音符配對與全長，不寫 tempo。ARP 使用上聲部，因此低音軌為空。
- 移除 03 區重複的目前演奏 MIDI 按鈕；保留上方 MIDI ⇣ 及 03 區 SUSTAIN。
- 小節起播鍵及主要手機按鈕至少 44px；選中和弦加古銅外框；生成按鈕有明確的可及性名稱。
- 背景使用漸層銜接；改用 WebP。temple-blue + khimaira-bronze 合計 527,464 bytes；六張 WebP 合計約 0.91 MB。原 PNG 保留作為來源備份，頁面不再引用。
- Cinzel／DM Sans 隨網站附帶，移除 Google Fonts 網路依賴，附上 OFL 授權文字。

## 外掛整合

Claude 提供的 `BETATEST/KHIMAIRA-Plugin-Source/plugin` 已整合到此儲存庫 `plugin/`，版本 1.0.1。新增手動 GitHub Actions：先驗證網站，再建置 macOS Universal 與 Windows；網站推送 `main` 時由 GitHub Pages 流程部署；外掛建置仍需手動啟動，本次不觸發外掛安裝包發行。

整合時同步修正 MIDI 力度、WebP／字體資源追蹤、橋接的新演奏選項、初次狀態保存，以及空白小節不被壓縮的問題。瀏覽器 MIDI 按鈕可輸出分軌檔；原生 DRAG MIDI／DRAG SUSTAIN 目前仍為單軌。

## 驗證

- Node 回歸測試：**75 / 75 通過**（原 64 項加 11 項評測回歸）。針對新規格更新舊測試中的 E7b9、減和弦目標、減七拼字與 MIDI 力度預期。
- 額外檢查：1,728 組密集延伸和弦／調性／配置皆可產生有效且最多五音的上聲部。
- Chrome / Playwright：1440px 桌面、390px 手機；初始化、偏好還原、LOOP 視覺、級數、移調 Undo、複製、編輯器拼字、MIDI 下載、播放切換、水平溢位與觸控尺寸均通過。
- 外掛橋接瀏覽器測試：初次 state／sequence、空白小節、新設定、試聽 note 事件與 Type 1 MIDI 檔傳送通過。此測試使用模擬 JUCE backend，並非 DAW 實測。
- JUCE **8.0.15**：本機 **macOS arm64** 的 VST3、AU、Standalone 編譯成功；C++ scheduler 的 CTest 通過。編譯仍有非致命的 shadow／浮點比較提示。
- 產物位於 `build-plugin/Khimaira_artefacts/Release/`；未安裝到系統外掛目錄、未做 Developer ID 簽章／公證。

瀏覽器測試需可用的 Playwright 與 Chrome，先從專案根目錄啟動 `python3 -m http.server 5175 --bind 127.0.0.1 --directory dist`，再執行 `node tests/browser-qa.cjs`。

[桌面截圖](desktop.png) · [手機截圖](mobile.png) · [分軌 MIDI 範例](split-preview.mid)

## 尚未涵蓋

- 3/4、6/8、12/8 拍號、每小節獨立演奏模式、收藏 UI 與鼓組 MIDI，仍是後續功能。
- 吉他按法仍保留指定最低音；未新增可切換的完全 rootless 吉他模式。
- 級數採羅馬數字標記，尚未加入完整 Nashville 排版或次屬功能分析標籤。
- Windows、Intel／Universal 編譯、auval、Logic／Ableton／FL 內的同步與拖曳，以及正式簽章安裝包，尚未驗證。
