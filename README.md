# Tavern Deck · 旅店牌庫

A local Hearthstone deck tracker built with Next.js. Import deck codes, switch between saved decks, track draws, and review class matchup history in your browser.

以 Next.js 製作的本機爐石追蹤器：匯入牌組代碼、保存多副牌組、追蹤剩餘卡牌、查看各職業對戰紀錄。

## 功能

- **牌組管理**：貼上代碼或遊戲匯出的完整文字，自動解析卡牌、職業與模式。支援切換、命名、複製代碼及刪除。
- **本機同步**：每 0.8 秒讀取 `Power.log`，追蹤抽牌、洗回牌庫與生成卡牌；新對局自動重置。
- **日誌設定頁**：輸入並檢查日誌路徑，保存後立即生效，不用手動修改環境檔。
- **職業戰績**：全部／最近 10 局勝率與對手職業分析。這是目前職業的歷史，不是精確的單副牌組戰績。
- **AOE 提醒**：依對手職業及模式顯示參考卡牌，不代表對手的手牌。
- **本機保存**：牌組與設定放在 `data/settings.json`，日誌備份放在 `data/power-log-archive/`。
- 桌面及手機版操作介面，Windows／macOS／Linux 啟動入口。

## 安裝與啟動

需要 **Node.js 24**（建議），或 Node.js 22.13 以上的 22.x，以及 npm。

```bash
git clone https://github.com/kevthefoo/tavern-deck.git
cd tavern-deck
npm run launch
```

啟動器會安裝鎖定的相依套件、編譯，並在 `http://127.0.0.1:3080` 啟動追蹤器、嘗試開啟瀏覽器。遊玩期間保持終端機開啟，按 Ctrl+C 停止。

亦可使用以下入口（都需要先安裝 Node.js）：

- **Windows**：雙擊 `Start.cmd`。
- **macOS**：執行 `Start.command`，或在終端機執行 `sh Start.command`。
- **Linux**：執行 `sh Start.command`。

若 3080 已被占用，啟動器會停止並提示；不會替你終止其他服務。

開發模式：

```bash
npm ci
npm run dev
```

正式版手動啟動：

```bash
npm ci
npm run build
npm run start -- --port 3080
```

更新後需重新 build 並重啟；`next start` 不會自動套用原始碼變更。已在 Linux + Chrome 驗證；Windows／macOS 啟動入口尚未在原生環境實測。

## 第一次使用

1. 首頁選 **Switch deck**，貼上 Hearthstone 的牌組代碼或完整匯出文字，按 **Import & select**。
2. 選 **Use deck** 切換牌組，回到 **Tracker**。選擇會保存於本機。
3. 進入 **Log settings**，填寫遊戲日誌的 Logs 目錄，按 **Save & check paths**。
4. 開始對局；若日誌無法辨識本機玩家，可在設定頁填入日誌中顯示的精確玩家名稱。鏡像對局不會以職業猜測玩家。

預設內附作者的 **Draw it / Hunter / Standard** 30 張牌表（2026-09-28 版本），可更名或在匯入另一副後刪除。匯入功能不替你檢查當前賽季的完整構築合法性。

## 啟用遊戲日誌

關閉 Hearthstone。在 Windows 的 `%LOCALAPPDATA%\Blizzard\Hearthstone\log.config` 建立或合併：

```ini
[Power]
LogLevel=1
FilePrinting=True
ConsolePrinting=False
ScreenPrinting=False
Verbose=True
```

重新啟動並進入對局，找到實際產生的 `Power.log`。依安裝方式，它可能位於遊戲安裝目錄的 `Logs` 下；請以實際檔案為準。

設定頁中的 Logs folder 可指向含場次子目錄的目錄，或直接含 `Power.log` 的目錄：

```text
Logs/
  session-1/Power.log
  session-2/Power.log
```

「Specific Power.log」為選填，優先於資料夾用於即時追蹤；設定固定檔案可能不會自動跟隨下一次啟動的日誌。統計仍需要 Logs folder。

Windows 可以使用正斜線路徑。WSL／Linux 必須填入執行追蹤器的環境可讀取的掛載路徑。路徑有效不代表遊戲已啟用日誌；請確認檔案會隨遊戲更新。

## 進階設定

也可以複製 `.env.local.example` 為 `.env.local`。透過介面儲存後，介面設定優先於環境檔：

| 變數 | 用途 |
| --- | --- |
| `HEARTHSTONE_LOG_ROOT` | 含場次子目錄的 Logs 目錄 |
| `HEARTHSTONE_POWER_LOG` | 即時追蹤用的指定日誌檔案 |
| `HEARTHSTONE_LOG_ARCHIVE` | 覆寫本機日誌備份目錄 |
| `TAVERN_DATA_DIR` | 覆寫牌組及設定檔所在目錄，方便隔離測試 |

修改環境變數需重啟服務，修改介面設定不用重啟。需要備份牌組時，可自行備份 `data/settings.json`；它包含私人路徑，不要提交至公開 repository。

預設只監聽 `127.0.0.1`。本工具沒有帳號系統，不適合直接部署成公開網站；雲端服務也無法直接讀取你電腦上的遊戲日誌。

## 限制與排解

- **匯入失敗**：確認完整複製牌組代碼，並可連線至 HearthstoneJSON。未知卡牌或格式會顯示錯誤；已保存的牌表不需要重新下載卡牌資料才能顯示。
- **Sideboard**：保留於匯出的原始代碼中，追蹤器只列出主牌組。不是完整 sideboard 管理器。
- **沒有同步**：確認路徑可讀且檔案更新。對局中請選擇與正在遊玩的牌組相符的牌表。
- **鏡像／未知玩家**：有本機玩家日誌資訊時優先採用；否則只在職業唯一時辨識，無法確定時要求填玩家名稱，不猜測。
- **戰績差異**：統計屬於該職業，並非精確牌組；不完整或無法辨識玩家的對局會略過。日誌備份不自動併入統計，避免重複計算。
- **卡圖缺失**：圖片、圖示及字型需要網路。外部服務可能限流或停用。
- **AOE**：靜態參考清單可能落後於遊戲更新，詳見 `docs/aoe-research.md`。
- 遊戲格式、特殊英雄及日誌更新可能影響解析；競技場／戰場等非一般構築模式不保證支援。

## 開發與驗證

```bash
npm test
npm run lint
npm run build
```

GitHub Actions 會執行相同檢查。測試使用合成日誌，涵蓋牌組匯入、玩家辨識、抽牌解析、設定保存、職業戰績及備份。介面變更也請使用可見瀏覽器測試桌面及手機版。詳見 [貢獻指南](CONTRIBUTING.md)。

## 授權與隱私

程式碼採 [MIT License](LICENSE)。第三方相依套件保有各自授權；Hearthstone 卡牌、美術、名稱及商標不包含在 MIT 授權內。這是非官方社群專案，與 Blizzard Entertainment 無隸屬或背書關係。來源見 [第三方說明](THIRD_PARTY_NOTICES.md)。

遊戲日誌與戰績在本機處理。牌組匯入會下載卡牌目錄；瀏覽器載入外部圖片與字型時會連線至對應供應商。請勿在公開 Issue、PR 或截圖中分享未遮蔽的 BattleTag、玩家名稱、私人路徑、原始日誌或環境設定。
