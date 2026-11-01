# 第 7 輪網站修改（1.0.10）

工作基準：`council/006-review`，`42d28ba`（1.0.9），開始時工作樹乾淨。本輪不評分、不 commit／tag／push；`version.json` 仍為 `release-candidate`。依主持人指示不在 sandbox 跑瀏覽器。

## 修改與驗收

| 順序 | 項目 | 已完成與回歸證據 | 尚待驗證 |
| --- | --- | --- | --- |
| 1 | R07-01 | 先在 CONFIRMED-THEORY 第 7 輪一節記錄教材立場與出處。MORPH 由共用分析取得 dominant/subV/所有終止抵達，局部補上相鄰完整導音減七的半音上行目標；目標根音及三音保留。12 調 × 49 樂風 × 3 幅度 × 40 seeds＝70,560 次，352,800 個目標檢查通過。三種撤除保護的注入缺陷都被拒絕。 | 耳聽；UI 瀏覽器矩陣未跑。 |
| 2 | R07-02 | close/open/rootless 上聲部最多五音；優先省五音、隱含 11、指定低音已提供的重複音，保留根音／三七音與明示張力。六類和弦所有根音與低音、自建 948 符號（936 個六類全組合加 12 個明示變化張力）× 12 移調 × 3 配音＝34,128 組通過；包含 pianoVoicing 與實際 SUSTAIN MIDI 的回歸。 | 人耳與 DAW。 |
| 3 | R07-04 | Space 單元測試解讀實際 closest 選擇器，移除 input/textarea 的 M10 注入確實觸發失敗。新增瀏覽器實際 input 與獨立 textarea 按鍵、desktop/mobile 計算尺寸。M22 原始 30px 規則在桌面注入並要求尺寸斷言拒絕，避免既有手機高 specificity 的 44px 規則掩蓋缺陷。 | 新增瀏覽器測試及 M22 注入尚未執行。 |
| 4 | R07-03 | 編輯骨幹可新增後一小節／移除此小節；限制 1–16，邊界停用按鈕，刪除後修正目前索引。Node 回歸驗證內容順序、所有長度、UNDO、MORPH 長度與 RESTORE；補 375/390px 點選建立測試。 | 手機瀏覽器點選測試、真實裝置。 |
| 5 | R07-05 | README 改為連結版本／發布狀態的常設規則。sync-web-assets 檢查 version/tag/channel，一旦已有對應 tag 卻仍為 candidate 即失敗；候選版本沒有 tag 則維持 candidate。新增 channel/tag 反例測試；CI checkout 取得完整 tags。 | 主持人正式提交、tag、Pages 發布與線上雜湊核對。 |
| 6 | R07-08 | 頁尾 About 連結採 inline-flex、至少 44px 高／寬；加入實際 mobile 尺寸檢查。 | 瀏覽器計算尺寸尚未跑。 |
| 7 | R07-07 | sync-web-assets 自動維護 45 個初始 modulepreload，依實際 import URL 保留共享 legacy 模組的無 query 身份，避免重複載入。使用 WOFF2 與四個較小 WebP 派生資產；原始檔保留。六個媒體檔未壓縮傳輸前的總大小由 1,018,790 降至 214,842 bytes（−78.9%）；這不是頁面整體網路傳輸量或計時。靜態預載依賴／資產預算回歸通過。 | **尚未證明 4G 可操作時間 ≤3 秒**。新增相同 390×844、150ms、1.6Mbps、停用快取、CPU 1×/4× 瀏覽器 gate，等主持人執行。 |
| 8 | R07-06 | 只拆 anchoredMutation 的 protectMutationTargets 與 selectMutationTechnique；僅整理此函式及拆出的 helper，其他函式不重排。拆分前後 31,752 組完整 JSON 輸出雜湊一致；既有 MORPH／使用者決定回歸全過。該檔超過 200 字元的行由 6 減至 0。 | 無新增的跨產品驗證。 |

CONFIRMED-THEORY 第 1 節逐字未變。Am→Ab、Em→Eb、同小節 IV→iv 的既有回歸通過；第 5 題同小節測量仍是 720/720。沒有調整 Heavy Metal bVII、D 小調拼字或報告第 4 節異議。

## 配音影響與 golden

R07-02 會改變受影響延伸和弦的實際配音、聲部連接、試聽及 MIDI 音符。三／七音若已在指定低音演奏，可省上聲部的同音重複；例如 `Cmaj7(9,#11,13)/E` 保留實際 E、B 與全部三種明示張力。`7alt` 是張力選集：當非根音低音無法提供可省的重複音時，上聲部保留根音、3、7、b9、#9，省隱含 b13；明寫 `7#9b13` 則保留兩個指定張力。此 alt 優先序是產品配音選擇，非教材唯一答案。

兩個既有 fixture 驗證均通過：`khimaira-before.json` 的基礎理論／生成，以及 `khimaira-before-phrases.json` 的 18 款、2,592 案例 original 演奏。**沒有重製或改寫任何 golden fixture**。golden 未包含所有此次受影響的密集轉位和弦，通過不代表全部 MIDI 位元組保持不變。

共用 music-core 1.1.7、piano-motion 2.0.0 及 `plugin/` 沒有改動；performance／piano-patterns 等檔的差異只有網站 import query 版本。Seiren、原生宿主及外掛不在本輪已驗證範圍。

## 實際執行結果

```text
修改前 node --test tests/*.test.js：373/373，32.365 秒
修改後 node --test tests/*.test.js：382/382，33.598 秒
node scripts/sync-music-core.mjs --check：通過，6 files
node scripts/sync-web-assets.mjs --check：通過，1.0.10 / release-candidate
./node_modules/.bin/eslint dist packages scripts tests eslint.config.js：rc=0
git diff --check：rc=0
```

R07-06 比對在 R07-01 修正完成後、拆函式之前擷取，同樣輸入於拆分後重跑。49 樂風 × 六條進行 × C/Eb/G 三調 × 三幅度 × 12 seeds；涵蓋 LOOP 開關、禁轉位、密集同小節、休止及新解決關係。前後 SHA-256 均為：

```text
d520a8a5d0d00c366d01c500630d059fff842089d21e49780c315de49eb34fc3
```

本輪未執行 `npm run verify:web`，因它包含瀏覽器。主持人在 sandbox 外執行：

```sh
export PATH=/Applications/ChatGPT.app/Contents/Resources/cua_node/bin:$PATH
CHROME_CHANNEL=chrome node scripts/run-browser-ci.cjs
```

新冷啟動測試使用本機靜態伺服器的 gzip 文字回應，CDP 限速與 CPU 節流；不能取代線上站／真實 4G 計時。原始瀏覽器流程、M22、頁尾尺寸、實機、VoiceOver、DAW、聽音、Lighthouse、外部 CI 執行及部署結果均未宣稱通過。

媒體可由 `scripts/optimize-web-media.py` 重建（Pillow 11.3.0、fonttools[woff] 4.60.2）；一般 CI 只使用已納入的派生檔，不需安裝 Python 編碼套件。已檢視派生背景圖及標誌，尚未作真實網頁版面驗收。
