# AOE 提醒研究（2026-09-26）

範圍：11 職業及中立的主要群體傷害、摧毀、變形、回手與清場配合牌；不是完整卡池，也不是套牌使用率或對手持牌預測。原始費用不代表實際可施放回合；降費、法術傷害、屍體、護甲、武器、秘密及死亡之聲等條件依卡文閱讀。

## 來源與版本

- 官方年度卡池：[資料片列表](https://hearthstone.blizzard.com/en-us/expansions-adventures)、[2026 輪替公告](https://hearthstone.blizzard.com/en-us/news/24267727)。標準使用 CORE、EMERALD_DREAM、THE_LOST_CITY、TIME_TRAVEL、CATACLYSM、ESCAPEFROM_VIOLET_HOLD；不包含 CORE_HIDDEN 舊核心版本。
- 費用、雙職業、卡文與繁中名稱：[HearthstoneJSON 英文即時資料](https://api.hearthstonejson.com/v1/latest/enUS/cards.collectible.json)、[繁中資料](https://api.hearthstonejson.com/v1/latest/zhTW/cards.collectible.json)。已保存至 lib/aoe-catalog.json，核對日期如上；不在每次輪詢時下載。更新補丁與輪替後須重新核對此快照。
- 對局模式與玩家來源：[GameState 協定](https://hearthsim.info/docs/gamestate-protocol/)及本機 Power.log 的 GameState.DebugPrintGame／FULL_ENTITY。只採當局資料；無法明確辨识對手時不猜測，不以獵人職業判斷本機玩家。

## 分類重點

死亡騎士留意屍體與連鎖死亡之聲；惡魔獵人區分延遲印記與即時傷害；德魯伊的標準指南以群體改體質為主，不把已輪替的揮擊列入標準。獵人分別標示秘密、重複施放與分散傷害；法師含凍結清場；聖騎士的平等是配合牌，並不自行造成傷害。牧師含攻擊力門檻及沉默摧毀；盜賊區分刀扇、武器及回手；薩滿留意超載；術士可能同時傷害己方；戰士留意護甲及傷害次數。中立末日預言者、狂野火占師等不視為職業獨有。

開放包含上述標準牌及研究選出的歷代清場牌，按英文名稱去重、優先核心版本。此指南不判斷對手套牌是否能攜帶特定符文、重複牌或生成牌；不把模式未知、競技場或其他特殊模式當成標準。

## 驗證

tests/aoe.test.ts：標準／開放、鏡像職業、英雄造型、跨局不繼承、未知模式、輪替過濾、雙職業、中立與去重。實際對局提醒於 tracker active 時才提供，idle/stale/missing 清除；手動卡牌指南明確標示非對局偵測。

本次驗證：20 項測試、ESLint、TypeScript 與 diff whitespace 檢查通過；既有 3080 的可見瀏覽器測試桌面、375px 與 430px。確認指南職業／模式切換、開放戰士有鬥毆而標準沒有、返回自動提醒，以及手機無橫向溢出。修正原手機淺色背景與新深色文字不相容問題。另以現存日誌確認可解析為標準／牧師；當時沒有進行中的對局，未宣稱已完成真人新對局端到端驗證，也未改寫遊戲日誌。
