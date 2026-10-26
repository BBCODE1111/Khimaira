# KHIMAIRA Web 1.0.2 穩定基準

日期：2026-10-27。基於 aedb416 的第三輪重測，完成六項小問題修正。

1. 暗黑類 8／16 小節生成新增第 8 小節回應／收尾，保留前四小節原作。地域調式保留原有循環形式與音集。
2. 密度 1 先從後往前檢查實際下一和弦，優先保留可解決的 V／subV，例如 `F#m7 B7 | Emaj7` 保留 B7；不越過休止尋找目標。
3. American pop 的 IV 級 sus4 改為 sus2，避免自動加入調外降七級。
4. 鋼琴放鍵 release 下限 80ms、上限 350ms；MIDI 音長與 gate 不變，同音再觸發仍會抑制舊尾音。
5. 手機和弦面板固定後收起 KEY／COPY 列；捲回面板前恢復，鍵盤焦點進入工具列也會顯示。
6. ostinato、metal、neoclassical、gothic、dembow、dancehall 在重複和弦上均有至少三種落點音型。

驗證：90 項 Node 測試全過；包括 10,368 組和聲設定、所有伴奏 MIDI round-trip、暗黑類所有調性／種子收尾與密度 1 的次屬回歸。`tests/browser-stable.cjs` 通過桌機／手機、捲動收合、播放控制、設定續播、MIDI 與外掛橋接測試，沒有 pageerror。

穩定標籤：`web-v1.0.2`。後續原生外掛工作由此基準分支開發；本標籤可用於重測與回復。
