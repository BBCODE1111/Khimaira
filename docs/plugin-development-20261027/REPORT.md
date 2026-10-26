# KHIMAIRA Plug-in 1.1 — 開發里程碑 1

日期：2026-10-27。基準：網頁穩定版 `web-v1.0.2` / `b954842`。開發分支：`codex/plugin-development`。

## 本次完成

- 新增原生 **PEDAL CC64** 參數，預設關閉，存入 DAW 專案並支援參數自動化。
- 啟用後，DAW 同步播放與原生 DRAG MIDI／DRAG SUSTAIN 輸出 CC64。根據原始和弦時間跨度踩下、在換和弦／休止／停止／定位跳轉／換 MIDI channel 時放開；下一和弦延後 1/64 拍踩下。
- 保留網頁 PLAY 的既有音長模擬。網頁頂部 MIDI 按鈕仍匯出網頁事件，不含原生參數；需要 CC64 請使用底部 DRAG MIDI。
- 原生 footer 改成兩列，在最小視窗寬度也保留控制項。DRAG 區新增無障礙按鈕語意，以及 Enter／Space 儲存操作。
- 發布新樂句時，只在音訊執行緒沒有讀取舊快照後回收，並結束舊的音符／踏板，避免過快切換資料時讀到已釋放的記憶體。

## 已驗證

| 檢查 | 結果 |
| --- | --- |
| macOS arm64 AU、VST3、Standalone 編譯 | 成功 |
| 原生 scheduler / pedal / processor CTest | 3 / 3 通過 |
| Apple `auval -strict -v aumu Khm1 Khmr` | AU VALIDATION SUCCEEDED |
| Logic Pro 11.2.2 載入 Stereo AU | 成功，內建鋼琴有音訊電平，沒有 clipping |
| Host sync | 120 BPM 與 96 BPM 顯示一致；四小節循環、停止後 Ready |
| Logic 專案關閉並重開 | 四小節和弦、PEDAL CC64 On、音量 0.3 還原 |
| 原生 MIDI 匯出 | 40 個 note-on、8 個 CC64 事件；最終 tick 7680 放開踏板 |
| MIDI／狀態整合測試 | CC64 開關、note count、state roundtrip、pattern restore 通過 |

`logic-host-sync.png` 是實際 Logic 的 AU 視窗；`logic-restored.png` 是重新載入與儲存 MIDI 成功畫面。`logic-pedal-export.mid` 為實際匯出檔。精準 sample-offset、休止、loop 邊界、preroll、seek、channel 與停止則由原生排程測試驗證。

本次於使用者的 `~/Library/Audio/Plug-Ins/Components/KHIMAIRA.component` 安裝開發用 AU。原先的 `KHIMAIRA MIDI FX.component` 與 KHIMAIRA 0.3.0 VST3 都未覆寫。獨立測試專案存於忽略的 `build-plugin/KHIMAIRA-1.1-Logic-QA.logicx`；本機三種編譯產物位於 `build-plugin/Khimaira_artefacts/Release/`。

## 後續開發

- Windows 與 macOS Universal 編譯／安裝器驗證。
- Ableton、Reaper／其他 VST3 宿主載入、輸出路由與實際拖曳 MIDI 到音軌。
- 更完整的宿主自動化、長時間連續播放、離線 bounce 與多實例壓力測試。
- 讓上方和弦格跟隨 DAW 播放游標（目前同步位置顯示在原生 footer）。
- 原生分軌匯出與簽章／公證。現有原生 DRAG MIDI 為單軌；網頁按鈕仍提供分軌。

這是可載入驗證的開發版，尚未宣告跨平台正式發行。
