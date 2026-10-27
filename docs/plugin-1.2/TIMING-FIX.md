# Logic MIDI 時間修正

2026-10-27 · KHIMAIRA 1.2.0

修正後，Logic Pro 11.2.2 的 120 BPM、8 小節進行錄製通過原先門檻：前三輪各 80 個 note-on，最大誤差 **0.49600498 tick／480 PPQ**，三輪位置、音高、力度完全相同。比對從第 1 輪開始，沒有平移錄製結果、跳過首輪或放寬 1 tick 門檻。

## 實際改動

- `plugin/Source/Sequence.h`：原始引擎的 beat、duration、pitch、velocity 逐值保留；產生 MIDI 事件時，起點與終點各自取整到絕對 480 PPQ 格點。即時播放和檔案匯出使用同一組事件，不累加已取整的相鄰時間差。極短音符至少保留 1 tick，跳轉補音也依同一組起訖位置判斷。
- `plugin/Source/HostTimeline.h`：連續、同速度的處理區塊使用宿主的樣本位置推進，避免 AU 拍點回報的取整擾動。變速、定位跳轉、宿主循環與缺少樣本位置時重新對齊宿主。
- `plugin/Source/PluginProcessor.*`：接入宿主樣本時鐘，匯出與播放共用 PPQ 常數。
- `plugin/tests/HostSmoke.cpp`、`SchedulerTests.cpp`：補上宿主拍點取整、第一個區塊跨越專案起點、原始資料保留、極短音符及跳轉補音的回歸測試。

這不是逐樣本完全等同浮點 beat 的播放模式。一般音符的格點取整最多改變半個 480 PPQ tick；120 BPM 時約 0.52 ms。原始 note 陣列、樂風、力度與網頁 `dist/` 都沒有改變。這個精度同時符合本次錄製的 1 tick 上限，並讓現場 MIDI 與拖曳 MIDI 的時間規則一致。

## 診斷與重測

先用未修正版本重現 1.01830794 tick 與首輪兩個起音不同。診斷版紀錄顯示宿主的 PPQ 回報比樣本位置粗；單獨平滑宿主時鐘並未消除 Logic 匯出差異。嘗試更改 AU callback 的傳送方式也沒有改善，因此沒有保留這些改動，也沒有修改 JUCE 原始碼。最後採用上述一致的 MIDI 事件精度後通過。

測試使用獨立 QA 專案，Serum 接在 MIDI FX 後，Quantize Off、120 BPM、1 小節預備拍。進行為 `Cmaj7 | Am7 | Dm7 | G7 | Em7 | A7 | Dm7 | G7`，Jazz、Rootless + Bass、Gate 82、Human 20、Swing 16、seed 42。錄製超過 24 小節後直接匯出 Selection as MIDI File。

```sh
node plugin/scripts/verify-logic.mjs docs/plugin-1.2/logic-host-120.mid
node --test tests/*.test.js
ctest --test-dir build-plugin/v12 -V
```

| 驗證 | 結果 |
| --- | --- |
| Logic 前三輪實錄、每輪 80 notes | 最大 0.49600498 tick；三輪完全相同 |
| Node | 98 / 98 通過 |
| 原生 CTest | 3 / 3 通過；AU 與 Instrument 各 144 個案例 |
| 原生六種 pattern、兩種宿主拍點、三種 buffer | 最大 0.499818 tick；原始 note 陣列逐值相同 |
| arm64 AU 嚴格驗證 | 通過 |
| Mac 安裝包 | AU／VST3／App 均為 arm64 + x86_64；安裝包與本機驗收執行檔 SHA256 相同 |

[修正前錄製](logic-host-120-before.mid) · [修正前失敗輸出](logic-recording-before.txt) · [修正後錄製](logic-host-120.mid) · [嚴格比對輸出](logic-recording-strict.txt) · [原生測試](native-tests.txt) · [安裝包驗證](package-validation.json)

使用者確認未安裝 Ableton Live，因此本輪只宣稱 Logic 的實機驗收結果。Intel Mac 與 Windows DAW 的實機相容性也仍需另測。
