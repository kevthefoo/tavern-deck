# 貢獻指南

歡迎用繁體中文或英文回報問題與提交 Pull Request。

## 本機開發

1. Fork 並 clone 專案，使用 Node.js 24（建議）或 22.13 以上的 22.x。
2. 執行 `npm ci`，需要遊戲同步時依 README 設定 `.env.local`。
3. 建立工作分支，執行 `npm run dev`。
4. 修改 Next.js 程式前，先讀取已安裝版本的 `node_modules/next/dist/docs/`。
5. 完成後執行 `npm test`、`npm run lint`、`npm run build`。
6. 介面變更使用可見瀏覽器驗證，包含無日誌狀態、統計切換與相關操作。

## Pull Request

說明解決的問題、使用者看得到的改變、測試結果與限制。避免無關的重新排版或大量相依套件更新。解析邏輯變更請加入精簡的合成日誌測試，不要提交完整遊戲日誌。

不要提交 `.env.local`、`node_modules`、`.next`、本機封存或含個人資料的截圖。公開回報前請遮蔽 BattleTag、玩家名稱與私人路徑。相依套件變動請一併更新 `package-lock.json`。

涉及牌組或職業時，請說明玩家辨識、抽牌同步和職業戰績是否一起驗證，包含鏡像對局。路徑與牌組 API 的測試請用 TAVERN_DATA_DIR 隔離資料，不要改動真實使用者設定。

貢獻程式碼適用本專案 MIT 授權；第三方素材請保留其來源與授權資訊。
