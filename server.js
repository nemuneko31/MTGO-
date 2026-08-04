/* ============================================================
   card-practice-table v7.9.34 共有保存フォールバック版サーバー — Stage 7 (v7.5～v7.9共同レビュー/通知権限)
   - アップロードされたオンラインMVP版を土台に直接拡張
   - v4.9公開state提案をサーバー側で厳密検証
   - 公開ハッシュ、nonce、匿名化、秘密枚数、変更マニフェスト、席境界を検査
   - 席別秘密stateのハッシュ、構造、role、public revを検査
   - 旧stateUpdateは既定停止（ALLOW_LEGACY_STATE_UPDATE=1 の時だけ許可）
   - v5.0～v5.4: 安全シャッフル/ドロー、ライブラリー取引、唱える、能力、スタック、構造化効果/護法
   - v5.5～v5.9: 誘発/遅延/置換、戦闘、優先権/ターン、状況起因/勝敗、レイヤー/コピー
   - v7.9.30: 置換効果を1件ずつ適用し、変化後イベントへ候補を再評価。必須/任意、履歴、循環防止を追加
   - v7.9.31: 順番付き複数行き先、サーバー無作為選択、束分け後の指定席選択を追加
   - v7.9.33: 辞書とデッキの一括共有保存、保存後照合、起動時自動復元、APIキャッシュ禁止を追加
   - v7.9.34: localStorage容量超過・保存制限時も共有サーバー保存と起動時復元を継続
   - v7.9.37: 関連遅延誘発のオブジェクト世代・最終情報スキーマと血清の粉末初手練習を追加
   - v7.9.38: 通常の土地プレイを自分のメイン・優先権あり・スタック空に限定。能力で戦場に出す土地は除外
   - v7.9.39: 手札から土地エリアへ動かす手動経路も通常の土地プレイとして統一
   - v7.9.40: カード辞書・デッキ・自動バックアップをIndexedDBへ安全移行し、localStorageを軽量化
   - v7.9.42: 設定画面をカテゴリ分けし、検索・重要設定・開閉操作を追加
   - v7.9.43: 土地・ソーサリー設定を常時表示し、遅延追加された設定項目を自動回収
   - v7.9.44: 手札→土地エリアの最終移動地点でタイミングと回数を強制
   - v7.9.53: 固定ダメージ・カウンター・タップ・P/T・トークン・明確なゾーン移動・捨てる誘発を簡潔解決へ拡張
   - v7.9.54: 任意効果・モード選択・単純な未指定対象を1画面で選び、効果適用からスタック除去まで一括完了
   - v7.9.55: 占術・諜報2以上と、上からN枚を見る／公開して条件一致1枚を手札へ加える処理を1画面で完了
   - v7.9.56: 探検・謀議・増殖を専用の1画面解決フローへ統合
   - v7.9.57: 明確なライブラリー検索本文を解決時に候補選択・移動・シャッフルまで一連化
   - v7.9.58: 解決時の固定ライフ／固定マナの任意支払いを、支払う・支払わない分岐から効果適用まで一連化
   - v7.9.59: 公開情報の「各～につき」と各オブジェクトへの単純一括誘発を解決時再計算で一連化
   - v7.9.60: 一時追放と終了ステップ／発生源離脱時の関連帰還をオブジェクト単位で追跡
   - v7.9.61: 呪文・能力のコピー作成と安全な対象変更を1画面へ統合
   - v7.9.62: 続唱・発見の追放、条件一致、唱える／手札分岐、無作為下戻しを専用解決へ統合
   - v7.9.63: 自分の墓地・追放領域から条件一致カードを選び、手札・戦場・山札へ戻す処理を1画面へ統合
   - v7.9.64: 墓地・追放領域のカードへ期限付きの唱える／プレイ権を与え、既存v4.5使用権エンジンと安全に連携
   - v7.9.65: 次のアップキープ／終了ステップの一回限り遅延誘発を予約し、該当フェイズで自動スタック化
   - v7.9.66: 戦場の各／自分／対戦相手アップキープ・終了ステップ反復誘発を安全認識し、APNAP群順で自動スタック化
   - v7.9.67: 同時反復誘発をプレイヤー別に保留し、APNAP群を固定したまま同一プレイヤー内の順番選択・保存復元・進行停止を追加
   - v7.9.68: 公開情報だけで判定できる介在if付き反復誘発を、誘発時と解決時の両方で再確認
   - v7.9.69: 公開情報から求める可変値付き反復誘発を、解決直前に再計算
   - v7.9.70: 安全な任意反復誘発の実行／見送り選択と、実行後の可変値再計算
   - v7.9.71: 固定マナ／固定ライフ支払い付き反復誘発、if-paid／unless分岐、解決直前再確認
   - v7.9.72: 最大N個／固定N個の複数対象付き反復誘発、対象集合制約、解決直前の適正再確認
   - v7.9.73: 公開情報で決まるX個／最大X個／望む数の対象、対象数のスタック配置時固定、24個安全上限
   - v7.9.74: 固定合計ダメージ／カウンターの対象別割り振り、各対象1以上、解決時の不適正対象分は再配分せず失う
   - v7.9.75: 公開情報で決まるXの割り振り合計をスタック配置時に固定し、0合計の安全な対象なし処理を追加
   - v7.9.76: 反復誘発をドロー、戦闘前メイン、戦闘開始、戦闘終了、戦闘後メインへ拡張
   - v7.9.77: 公開されている墓地・追放領域の反復誘発と戦場内外の同時APNAP統合を追加
   - v7.9.78: 統率領域の保存・表示・移動と、統率領域からの反復誘発を同時APNAP処理へ統合
   - v7.9.79: 待機をアップキープ誘発と最後の時間カウンター除去後の唱える誘発へ分離し、APNAP順・0コスト唱え・速攻を統合
   - v7.10.0: ETB・死亡・唱える・攻撃・戦闘ダメージ・ドロー等のイベント誘発をAPNAP処理へ統合し、待機開始、モード選択、高度支払い、統率者ルール、アンタップ／クリンナップ安全処理を追加
   - v7.10.1: ETB二重登録、戦場入りタップ状態の上書き、スタック解決後の優先権残留、Unknown輸入カードの辞書型復元を修正
   - v7.10.2: 対象数・対象種別・コントローラー関係がローカル本文誘発／オンライン記述変換で失われる問題を修正し、対象選択の共通整合性検査を追加
   - v7.10.3: 破損保存の原子的修復、イベント単位の重複防止・条件照合、オンライン通知の二重配信防止、新規ルームstate表示修正を追加
   - v7.10.4: 縦持ち5画面切替、固定状況バー・下部ナビ、横持ち操作ドック、スマホ用モーダルとカード詳細を追加
   - v7.10.5: 初手練習をロンドン方式へ統一し、通常マリガンと血清の粉末を完全分離。キープ時ボトムと旧設定移行を追加
   - v7.10.6: スマホ横向きのメニューと相手手札リサイズを修正し、縦向き手札を大カード横送り／2列一覧へ再設計
   - v7.11.0: 公開情報だけを使う高度CPU対戦、合法手生成、対象選択、限定先読み、戦闘判断を追加
   - v7.12.0: 公開情報の構え推定、動的役割、複数手探索、高度戦闘、CPUマリガン・BO3サイド判断を追加
   - v7.13.0: 相手デッキの事後確率推定、時間制限付きモンテカルロ評価、複数ブロック戦闘、編集可能なデッキ専用戦略を追加
   - v7.15.0: 公平な手札レンジ推定、相手最善応答探索、複数ターン計画、精密戦闘、BO3記憶、CPU同士実戦、自己対戦調整、視覚的戦略エディターを統合
   - v7.16.0: 隠し情報の複数仮定、反実仮想シャドー探索、主変化・信頼度、文脈別経験学習、攻撃・ブロック組合せ探索を実際のCPU判断へ接続
   - v7.16.1: 旧v7.14 CPU更新処理が画面タイトルと稼働バッジを上書きする競合を解消し、最新リリース表示を固定
   - v7.16.2: MutationObserverと定期監視で旧v7.9.79独立バッジを除去し、旧モジュールの遅延上書き後も最新表示を維持
   - v7.17.0: 対戦開始時のマリガン案内、両者キープ進捗、手番・優先権・CPU思考・オンライン操作待ちの常時表示を追加
   - v6.0～v6.4: オブジェクト世代/両面/合体、装着/支配、位相/LKI、同時領域移動/置換連鎖
   - v6.5～v6.9: 同時誘発チェーン/介在if、誘発ループ監視、任意/選択/分岐ループ、応答予約
   - v7.0～v7.4: 行動履歴、合意巻き戻し、秘密state復元、差分修復、リプレイ、レポート、チャプター/ハイライト
   - v7.5～v7.9: 注釈、スレッド、共同レビュー、通知、メンション、ミュート、重要度、匿名比較レポート
   - v7.9.12効果権限: 裏向き化/表向き化、予示/偽装、順次選択、
     二段階確定、rev/nonce/席検証、複数操作の原子的ロールバック
   - 身内向け練習サーバー。TLS・アカウント認証・管理者への暗号学的秘匿は別途必要
   起動: npm install && npm start  （既定ポート 8787 / 環境変数 PORT で変更可）
   ============================================================ */
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
let WebSocketServer;
try { ({ WebSocketServer } = require("ws")); }
catch (_) { ({ WebSocketServer } = require("./mini-ws.js")); }
const crypto = require("crypto");
const V7912_ENGINE = require("./v7912-server-engine.js");
const V50V54_MODULE = require("./v50-v54-server-engine.js");
const V55V59_MODULE = require("./v55-v59-server-engine.js");
const V60V64_MODULE = require("./v60-v64-server-engine.js");
const V65V69_MODULE = require("./v65-v69-server-engine.js");
const V70V74_MODULE = require("./v70-v74-server-engine.js");
const V75V79_MODULE = require("./v75-v79-server-engine.js");

const PORT = Number(process.env.PORT) || 8787;
const HOST = process.env.HOST || "0.0.0.0"; // クラウドで外部公開するため全インターフェースにbind（localhostからも到達可）。固定したい場合は環境変数HOSTで指定
const ROOT = __dirname;

const SERVER_VERSION = "7.9.20-integrated-play";
const APP_RELEASE = "7.17.0-turn-mulligan-clarity";
const PREVIOUS_APP_RELEASE = "7.16.2-persistent-display-guard";
const V49_PROTOCOL = "cpt-v4.9";
const EFFECT_PROTOCOL = V7912_ENGINE.PROTOCOL;
const AUTHORITY = Object.freeze({
  protocol: V49_PROTOCOL,
  protocolVersion: V49_PROTOCOL,
  version: "4.9.0",
  serverVersion: SERVER_VERSION,
  appRelease: APP_RELEASE,
  serverName: "card-practice-table-server",
  serverAuthoritative: true,
  publicEnvelopeRequired: true,
  mutationManifestRequired: true,
  seatPrivateState: true,
  strictV49Validation: true,
  stateProposalV49: true,
  seatPrivateStateV49: true,
  publicHashAlgorithm: "fnv1a32",
  privateHashAlgorithm: "fnv1a32",
  legacyStateAllowed: process.env.ALLOW_LEGACY_STATE_UPDATE === "1",
  effectAutomationProtocol: EFFECT_PROTOCOL,
  serverEffectTransactionsV7912: true,
  serverSequentialChoicesV7912: true,
  serverFaceDownAuthorityV7912: true,
  serverManifestCloakV7912: true,
  serverAtomicEffectRollbackV7912: true,
  compatibilityBase: "uploaded-online-mvp",
  fullCanonicalV79Foundation: false,
  sharedPersistenceBundleV7933: true,
  sharedReadAfterWriteVerificationV7933: true,
  sharedStartupRestoreV7933: true,
  sharedSaveFallbackV7934: true,
  clientLandPlayTimingGuardV7938: true,
  landPutByEffectExemptV7938: true,
  manualHandToLandGuardV7939: true,
  explicitLandEffectPutV7939: true,
  clientIndexedDBStorageV7940: true,
  verifiedLegacyMigrationV7940: true,
  automaticBackupRetentionV7940: true,
  visibleLandRuleSettingsV7943: true,
  lateSettingsObserverV7943: true,
  authoritativeLandCommitGuardV7944: true,
  finalHandToLandBoundaryV7944: true,
  absoluteGenericLandRouteLockV7946: true,
  explicitLandEffectPlacementOnlyV7946: true,
  visibleLandGuardRuntimeBadgeV7946: true,
  fetchLandDoubleClickV7950: true,
  textBasedEtbTappedV7950: true,
  guidedSimpleTriggerResolutionV7950: true,
  immediateEtbTriggerCommitV7951: true,
  currentOracleEntersWordingV7951: true,
  pendingSimpleEtbMergeV7951: true,
  guidedChecklistSuppressionV7952: true,
  deterministicSimpleTriggerResolutionV7952: true,
  fixedDrawLifeInferenceV7952: true,
  expandedSimpleTriggerTemplatesV7953: true,
  targetedSimpleEffectSafetyV7953: true,
  ambiguousTriggerManualFallbackV7953: true,
  guidedOptionalTriggerChoiceV7954: true,
  guidedSimpleTargetSelectionV7954: true,
  existingModalChoiceOneScreenV7954: true,
  ambiguousChoiceManualFallbackV7954: true,
  groupedMultiScrySurveilV7955: true,
  guidedTopNLookRevealV7955: true,
  conditionalSinglePickFromTopV7955: true,
  orderedRemainderCommitV7955: true,
  ambiguousLibraryTemplateManualFallbackV7955: true,
  guidedExploreResolutionV7956: true,
  guidedConniveResolutionV7956: true,
  guidedProliferateResolutionV7956: true,
  guidedTextLibrarySearchV7957: true,
  lockedSearchDestinationV7957: true,
  automaticSearchShuffleV7957: true,
  ambiguousSearchManualFallbackV7957: true,
  guidedOptionalPaymentV7958: true,
  fixedLifePaymentGateV7958: true,
  fixedManaPaymentGateV7958: true,
  declinedPaymentBranchV7958: true,
  ambiguousPaymentManualFallbackV7958: true,
  countedPublicInformationV7959: true,
  perMatchingObjectBatchV7959: true,
  resolutionTimeCountRecheckV7959: true,
  zeroCountCleanResolutionV7959: true,
  ambiguousCountManualFallbackV7959: true,
  guidedTemporaryExileV7960: true,
  linkedEndStepReturnV7960: true,
  sourceLeavesImmediateReturnV7960: true,
  exileObjectIdentityGuardV7960: true,
  leftExileSkipV7960: true,
  ambiguousTemporaryExileManualFallbackV7960: true,
  guidedStackCopyV7961: true,
  copyInheritedChoicesV7961: true,
  guidedCopyRetargetV7961: true,
  permanentSpellCopyTokenV7961: true,
  copiedObjectCeaseOutsideStackV7961: true,
  ambiguousCopyManualFallbackV7961: true,
  guidedCascadeResolutionV7962: true,
  guidedDiscoverResolutionV7962: true,
  textCascadeTriggerCreationV7962: true,
  revealedExilePreviewV7962: true,
  freeCastDeferredUntilSourceResolvedV7962: true,
  randomBottomCleanupV7962: true,
  ambiguousCascadeDiscoverManualFallbackV7962: true,
  guidedGraveyardRetrievalV7963: true,
  guidedOwnedExileRetrievalV7963: true,
  filteredPublicZoneSelectionV7963: true,
  resolutionTimeZoneRecheckV7963: true,
  existingTargetRestrictionV7963: true,
  ambiguousZoneRetrievalManualFallbackV7963: true,
  guidedZonePlayPermissionV7964: true,
  graveyardCastPermissionV7964: true,
  ownedExilePlayPermissionV7964: true,
  topLibraryExilePermissionV7964: true,
  nextEndStepPermissionExpiryV7964: true,
  whileExiledPermissionExpiryV7964: true,
  exactOwnNextTurnPermissionExpiryV7964: true,
  existingV45PermissionEngineReuseV7964: true,
  ambiguousZonePermissionManualFallbackV7964: true,
  guidedDelayedPhaseTriggersV7965: true,
  nextAnyUpkeepTriggerV7965: true,
  nextControllerUpkeepTriggerV7965: true,
  nextAnyEndStepTriggerV7965: true,
  nextControllerEndStepTriggerV7965: true,
  linkedPlayerPhaseTimingV7965: true,
  forcedDuePhaseStopV7965: true,
  delayedLinkedObjectIdentityV7965: true,
  existingSimpleTriggerResolutionReuseV7965: true,
  ambiguousDelayedTriggerManualFallbackV7965: true,
  guidedRepeatingPhaseTriggersV7966: true,
  eachUpkeepTriggerV7966: true,
  controllerUpkeepTriggerV7966: true,
  opponentUpkeepTriggerV7966: true,
  eachEndStepTriggerV7966: true,
  controllerEndStepTriggerV7966: true,
  opponentEndStepTriggerV7966: true,
  battlefieldSourceRescanV7966: true,
  phasedOutSourceExclusionV7966: true,
  apnapGroupOrderingV7966: true,
  recurringLinkedObjectIdentityV7966: true,
  existingAbilityTemplateReuseV7966: true,
  ambiguousRepeatingTriggerManualFallbackV7966: true,
  guidedSimultaneousTriggerOrderingV7967: true,
  sameControllerTriggerOrderChoiceV7967: true,
  lockedApnapControllerGroupsV7967: true,
  persistedPendingTriggerOrderV7967: true,
  forcedTriggerOrderPhaseStopV7967: true,
  unambiguousTriggerAutoCommitV7967: true,
  duplicateTriggerCommitGuardV7967: true,
  existingTargetSelectionResumeV7967: true,
  publicConditionalRepeatingTriggersV7968: true,
  triggerTimePublicConditionFilterV7968: true,
  resolutionTimeInterveningIfRecheckV7968: true,
  publicVariableRepeatingTriggersV7969: true,
  publicForEachCountV7969: true,
  publicEqualNumberCountV7969: true,
  publicDefinedXV7969: true,
  resolutionTimeVariableRecountV7969: true,
  existingApnapOrderingReuseV7969: true,
  ambiguousVariableManualFallbackV7969: true,
  optionalRepeatingTriggersV7970: true,
  resolutionTimeOptionalChoiceV7970: true,
  fixedCostPaymentRepeatingTriggersV7971: true,
  resolutionTimePaymentRecheckV7971: true,
  guidedMultiTargetRepeatingTriggersV7972: true,
  upToNTargetChoiceV7972: true,
  exactNTargetChoiceV7972: true,
  targetSetConstraintValidationV7972: true,
  resolutionTimeTargetLegalityRecheckV7972: true,
  persistedPendingTargetChoiceV7972: true,
  onlineMultiTargetManualFallbackV7972: true,
  dynamicCountTargetRepeatingTriggersV7973: true,
  publicXTargetCountV7973: true,
  anyNumberTargetChoiceV7973: true,
  targetingTimeBoundFreezeV7973: true,
  dynamicTargetSafetyCapV7973: 24,
  targetClauseCountDefinitionSeparationV7973: true,
  onlineDynamicTargetManualFallbackV7973: true,
  distributedTargetRepeatingTriggersV7974: true,
  fixedAllocationAtTargetingV7974: true,
  allocationMinimumOnePerTargetV7974: true,
  illegalTargetAllocationLostV7974: true,
  publicVariableDistributionRepeatingTriggersV7975: true,
  publicAllocationTotalFreezeV7975: true,
  publicGraveyardAllocationCountV7975: true,
  zeroTotalNoTargetResolutionV7975: true,
  hiddenRandomAllocationManualFallbackV7975: true,
  extendedRepeatingPhaseTriggersV7976: true,
  repeatingDrawStepV7976: true,
  repeatingPrecombatMainV7976: true,
  repeatingBeginCombatV7976: true,
  repeatingEndCombatV7976: true,
  repeatingPostcombatMainV7976: true,
  untapCleanupManualFallbackV7976: true,
  onlineExtendedPhaseManualFallbackV7976: true,
  externalZoneRepeatingTriggersV7977: true,
  publicGraveyardRepeatingTriggersV7977: true,
  publicExileRepeatingTriggersV7977: true,
  combinedBattlefieldExternalApnapV7977: true,
  externalSourceZoneIdentityRecheckV7977: true,
  hiddenCommandSuspendManualFallbackV7977: true,
  commandZoneRepeatingTriggersV7978: true,
  persistentCommandZoneStorageV7978: true,
  combinedBattlefieldExternalCommandApnapV7978: true,
  commandSourceZoneIdentityRecheckV7978: true,
  commanderReplacementSuspendOnlineManualFallbackV7978: true,
  guidedSuspendTimeCountersV7979: true,
  stackBasedSuspendUpkeepV7979: true,
  lastTimeCounterCastTriggerV7979: true,
  suspendNoCostCastV7979: true,
  suspendCreatureHasteV7979: true,
  legacySuspendCounterMigrationV7979: true,
  onlineSuspendAuthorityManualFallbackV7979: true,
  specialMechanicChecklistSuppressionV7956: true,
  ambiguousSpecialMechanicManualFallbackV7956: true,
  stage2V50V54Integrated: true,
  stage3V55V59Integrated: true,
  stage4V60V64Integrated: true,
  stage5V65V69Integrated: true,
  stage6V70V74Integrated: true,
  stage7V75V79Integrated: true,
  ...V50V54_MODULE.AUTHORITY_FLAGS,
  ...V55V59_MODULE.AUTHORITY_FLAGS,
  ...V60V64_MODULE.AUTHORITY_FLAGS,
  ...V65V69_MODULE.AUTHORITY_FLAGS,
  ...V70V74_MODULE.AUTHORITY_FLAGS,
  ...V75V79_MODULE.AUTHORITY_FLAGS
});
const MAX_PRIVATE_STATE_BYTES = 6 * 1024 * 1024;
const MAX_EFFECT_NONCES = 1024;
const ALLOW_LEGACY_STATE_UPDATE = process.env.ALLOW_LEGACY_STATE_UPDATE === "1";
const MAX_PUBLIC_STATE_BYTES = 8 * 1024 * 1024;
const MAX_V49_NONCES = 300;
const V49_LOCAL_KEYS = Object.freeze(["decks","cardDictionary","snapshots","sideboardPlans","matchHistory","openingHandHistory","keepRules","tokenTemplates","handActionHistory","damageActionHistory","playtest","integrityLog","v44","v48"]);
const V49_PRIVATE_ZONES = Object.freeze(["hand","library","sideboard"]);
const V49_RATE_LIMITS = Object.freeze({ proposal: { count: 18, windowMs: 5000 }, private: { count: 30, windowMs: 10000 } });


/* ---------- 定数（第1段階の方針） ---------- */
const ALLOW_NON_HOST_STATE_UPDATE = false; // 非hostのstateUpdateは拒否（ONLINE_PLAN.md G）
const MAX_MESSAGE_BYTES = 8 * 1024 * 1024; // 巨大メッセージの簡易ガード（state丸ごと想定で余裕を持たせる）
const MAX_LOG = 100;                       // room.log 保持件数
const MAX_CHAT_LEN = 500;
const MAX_NAME_LEN = 24;
const MAX_ROOM_CLIENTS = 8;      // A/B/観戦込みの最大人数
const MAX_PASSWORD_LEN = 64;
const DATABASE_URL = process.env.DATABASE_URL || "";
const SHARED_ADMIN_PASSWORD = process.env.SHARED_ADMIN_PASSWORD || "";
const MAX_BODY_BYTES = 12 * 1024 * 1024; // v7.9.33: 辞書+デッキ一括共有保存の上限
const IMG_S3_ENDPOINT = process.env.IMG_S3_ENDPOINT || "";
const IMG_S3_BUCKET = process.env.IMG_S3_BUCKET || "";
const IMG_S3_ACCESS_KEY_ID = process.env.IMG_S3_ACCESS_KEY_ID || "";
const IMG_S3_SECRET_ACCESS_KEY = process.env.IMG_S3_SECRET_ACCESS_KEY || "";
const IMG_PUBLIC_BASE_URL = (process.env.IMG_PUBLIC_BASE_URL || "").replace(/\/+$/, ""); // 末尾スラッシュ正規化
const IMG_MAX_BYTES = 2 * 1024 * 1024; // 画像1枚の上限 2MB
const IMG_ALLOWED_TYPES = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" }; // SVGは不可
const EMPTY_ROOM_TTL_MS = 60 * 1000;       // 空roomの削除猶予
const HEARTBEAT_MS = 30 * 1000;
const RECONNECT_GRACE_MS = 5 * 60 * 1000; // スマホの画面消灯・一時切断からの復帰猶予

/* ============================================================
   共有ストア（任意・DATABASE_URL がある時だけ有効。無くてもアプリは起動）
   ============================================================ */
const shared = { enabled: false, pool: null, reason: "DATABASE_URL 未設定", pg: null };
async function initSharedStore() {
  if (!DATABASE_URL) { log("shared store: disabled (DATABASE_URL 未設定)"); return; }
  let Pool;
  try { Pool = require("pg").Pool; }
  catch (e) { shared.reason = "pg モジュール未インストール"; log("shared store: disabled (pg 未インストール)"); return; }
  try {
    const ssl = /localhost|127\.0\.0\.1/.test(DATABASE_URL) ? false : { rejectUnauthorized: false };
    shared.pool = new Pool({ connectionString: DATABASE_URL, ssl, max: 3 });
    await shared.pool.query(
      "CREATE TABLE IF NOT EXISTS shared_store (key text PRIMARY KEY, data jsonb NOT NULL, version integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now())"
    );
    shared.enabled = true; shared.reason = "";
    log("shared store: enabled (Postgres)");
  } catch (e) {
    shared.enabled = false; shared.reason = "DB接続失敗";
    log("shared store: disabled (DB接続失敗: " + (e && (e.code || e.message)) + ")");
  }
}
async function sharedGet(key) {
  if (!shared.enabled) return null;
  const r = await shared.pool.query("SELECT data, version, updated_at FROM shared_store WHERE key=$1", [key]);
  if (!r.rows.length) return { ok: true, version: 0, updatedAt: null, data: null };
  const row = r.rows[0];
  return { ok: true, version: row.version, updatedAt: row.updated_at, data: row.data };
}
async function sharedPut(key, data) { // 後勝ち保存・versionはインクリメント
  if (!shared.enabled) return null;
  const r = await shared.pool.query(
    "INSERT INTO shared_store (key, data, version, updated_at) VALUES ($1,$2,1,now()) " +
    "ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data, version=shared_store.version+1, updated_at=now() " +
    "RETURNING version, updated_at", [key, data]);
  const row = r.rows[0];
  return { ok: true, version: row.version, updatedAt: row.updated_at };
}
function adminOk(req, bodyObj) {
  if (!SHARED_ADMIN_PASSWORD) return false; // 管理pw未設定なら保存は常に不可（読み取りは可）
  const h = req.headers["x-admin-password"];
  const b = bodyObj && bodyObj.adminPassword;
  const given = String(h != null ? h : (b != null ? b : ""));
  return given.length > 0 && given === SHARED_ADMIN_PASSWORD;
}
function sendJson(res, code, obj) { const s = JSON.stringify(obj); res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store, max-age=0", "Pragma": "no-cache" }); res.end(s); }
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on("data", (c) => { size += c.length; if (size > MAX_BODY_BYTES) { reject(new Error("body too large")); req.destroy(); return; } chunks.push(c); });
    req.on("end", () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {}); } catch (e) { reject(new Error("invalid JSON")); } });
    req.on("error", reject);
  });
}
const SHARED_KEYS = { "/api/shared-library": "card_library", "/api/shared-decks": "decks", "/api/shared-bundle": "bundle_v7933" };
async function handleSharedApi(req, res, pathname) {
  const key = SHARED_KEYS[pathname];
  if (!key) return false;
  if (!shared.enabled) { sendJson(res, 503, { ok: false, disabled: true, reason: shared.reason || "共有機能は無効です" }); return true; }
  try {
    if (req.method === "GET") { const r = await sharedGet(key); sendJson(res, 200, r); return true; }
    if (req.method === "POST") {
      const body = await readBody(req);
      if (!adminOk(req, body)) { sendJson(res, 401, { ok: false, error: "管理パスワードが必要です（または誤り）" }); return true; }
      if (body.data === undefined) { sendJson(res, 400, { ok: false, error: "data がありません" }); return true; }
      const r = await sharedPut(key, body.data); // パスワードはログにもレスポンスにも出さない
      sendJson(res, 200, r); return true;
    }
    sendJson(res, 405, { ok: false, error: "method not allowed" }); return true;
  } catch (e) { sendJson(res, 500, { ok: false, error: String((e && e.message) || e) }); return true; }
}

/* ============================================================
   画像ストア（任意・IMG_S3_* 5変数が揃った時だけ有効。無くてもアプリは起動）
   秘密値（キー/Endpoint全文）はログにもレスポンスにも出さない。
   ============================================================ */
const imageStore = { enabled: false, client: null, PutObjectCommand: null, reason: "environment variables are not configured" };
function initImageStore() {
  if (!(IMG_S3_ENDPOINT && IMG_S3_BUCKET && IMG_S3_ACCESS_KEY_ID && IMG_S3_SECRET_ACCESS_KEY && IMG_PUBLIC_BASE_URL)) {
    log("image store: disabled (environment variables are not configured)"); return;
  }
  let sdk;
  try { sdk = require("@aws-sdk/client-s3"); }
  catch (e) { imageStore.reason = "s3 sdk not installed"; log("image store: disabled (s3 sdk not installed)"); return; }
  try {
    imageStore.client = new sdk.S3Client({
      region: "auto", endpoint: IMG_S3_ENDPOINT, forcePathStyle: true,
      credentials: { accessKeyId: IMG_S3_ACCESS_KEY_ID, secretAccessKey: IMG_S3_SECRET_ACCESS_KEY },
    });
    imageStore.PutObjectCommand = sdk.PutObjectCommand;
    imageStore.enabled = true; imageStore.reason = "";
    log("image store: enabled (R2)");
  } catch (e) { imageStore.enabled = false; imageStore.reason = "init failed"; log("image store: disabled (init failed)"); }
}
function _imgMagicOk(buf, type) { // Content-Typeを信用せずマジックバイト検査
  if (!buf || buf.length < 12) return false;
  if (type === "image/png") return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 && buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a;
  if (type === "image/jpeg") return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (type === "image/gif") return buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38; // GIF8
  if (type === "image/webp") return buf.toString("latin1", 0, 4) === "RIFF" && buf.toString("latin1", 8, 12) === "WEBP";
  return false;
}
function readRawBody(req, maxBytes) { // 生バイナリ受信。上限超過は即座に安全停止
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > maxBytes) { const e = new Error("too large"); e.code = "TOO_LARGE"; req.removeAllListeners("data"); req.pause(); reject(e); return; } // destroyは応答送信後に呼び出し側で行う
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}
async function handleImageUpload(req, res) {
  if (!imageStore.enabled) { sendJson(res, 503, { ok: false, disabled: true, reason: imageStore.reason || "image store disabled" }); return; }
  if (req.method !== "POST") { sendJson(res, 405, { ok: false, error: "method not allowed" }); return; }
  if (!adminOk(req, null)) { sendJson(res, 401, { ok: false, error: "管理パスワードが必要です（または誤り）" }); return; }
  const ctype = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
  const ext = IMG_ALLOWED_TYPES[ctype];
  if (!ext) { sendJson(res, 415, { ok: false, error: "対応形式は png/jpeg/webp/gif のみです" }); return; }
  let buf;
  try { buf = await readRawBody(req, IMG_MAX_BYTES); }
  catch (e) {
    if (e && e.code === "TOO_LARGE") {
      try {
        const s = JSON.stringify({ ok: false, error: "画像は最大" + IMG_MAX_BYTES + "バイト（2MB）までです" });
        res.writeHead(413, { "Content-Type": "application/json; charset=utf-8", "Connection": "close" });
        res.end(s, () => { try { req.destroy(); } catch (_) {} }); // 413を送り切ってから受信を安全停止
      } catch (_) {}
      return;
    }
    try { sendJson(res, 400, { ok: false, error: "本文の受信に失敗しました" }); } catch (_) {} return;
  }
  if (!buf.length) { sendJson(res, 400, { ok: false, error: "本文が空です" }); return; }
  if (!_imgMagicOk(buf, ctype)) { sendJson(res, 400, { ok: false, error: "ファイル内容がContent-Typeと一致しません" }); return; }
  const sha256 = crypto.createHash("sha256").update(buf).digest("hex");
  const key = "images/" + sha256 + "." + ext; // 内容ハッシュキー＝同一画像は同一キー（重複保存回避）
  try {
    await imageStore.client.send(new imageStore.PutObjectCommand({ Bucket: IMG_S3_BUCKET, Key: key, Body: buf, ContentType: ctype }));
    sendJson(res, 200, { ok: true, key, imageUrl: IMG_PUBLIC_BASE_URL + "/" + key, sha256, size: buf.length, contentType: ctype });
  } catch (e) {
    log("image upload failed (" + ((e && e.name) || "error") + ")"); // 詳細/秘密値はログに出さない
    sendJson(res, 500, { ok: false, error: "アップロードに失敗しました" });
  }
}

/* ============================================================
   HTTPサーバー（静的配信・最低限）
   ============================================================ */
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "text/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md":   "text/plain; charset=utf-8",
  ".txt":  "text/plain; charset=utf-8",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".svg":  "image/svg+xml"
};
const httpServer = http.createServer((req, res) => {
  try {
    let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    if (urlPath === "/health" || urlPath === "/api/health") {
      sendJson(res, 200, {
        ok: true, server: "card-practice-table-server", version: SERVER_VERSION, release: APP_RELEASE,
        authority: AUTHORITY, rooms: rooms.size, clients: clientsById.size,
        sharedStore: shared.enabled, imageStore: imageStore.enabled
      });
      return;
    }
    if (urlPath === "/api/shared-images-status") {
      if (imageStore.enabled) sendJson(res, 200, { enabled: true, provider: "R2", maxBytes: IMG_MAX_BYTES, allowedTypes: Object.keys(IMG_ALLOWED_TYPES) });
      else sendJson(res, 200, { enabled: false, reason: imageStore.reason || "environment variables are not configured" });
      return;
    }
    if (urlPath === "/api/shared-images") { handleImageUpload(req, res).catch(() => { try { sendJson(res, 500, { ok: false, error: "internal" }); } catch (_) {} }); return; }
    if (urlPath === "/api/shared-status") { sendJson(res, 200, { ok: true, enabled: shared.enabled, reason: shared.reason, adminConfigured: !!SHARED_ADMIN_PASSWORD }); return; }
    if (SHARED_KEYS[urlPath] !== undefined) { handleSharedApi(req, res, urlPath).catch(() => { try { sendJson(res, 500, { ok: false, error: "internal" }); } catch (_) {} }); return; }
    if (urlPath === "/") urlPath = "/card-practice-table.html";
    // パストラバーサル防止: ROOT 配下に正規化されるファイルのみ
    const filePath = path.normalize(path.join(ROOT, urlPath));
    if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end("Forbidden"); return; }
    const ext = path.extname(filePath).toLowerCase();
    if (!MIME[ext]) { res.writeHead(404); res.end("Not Found"); return; }
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404); res.end("Not Found"); return; }
      res.writeHead(200, { "Content-Type": MIME[ext], "Cache-Control": "no-store, max-age=0", "Pragma": "no-cache", "X-App-Release": APP_RELEASE });
      res.end(data);
    });
  } catch (e) {
    try { res.writeHead(500); res.end("Server Error"); } catch (_) {}
  }
});

/* ============================================================
   rooms 管理
   room: { roomCode, createdAt, updatedAt, hostId, clients:Map<clientId,client>, reconnectSlots:Map<token,slot>, state, rev, log:[], _deleteTimer }
   client: { clientId, ws, roomCode, role:"A"|"B"|"spectator", name, joinedAt, lastSeen }
   （host は room.hostId で識別。role とは独立）
   ============================================================ */
const rooms = new Map();
let _seq = 0;
function uid(prefix) { return prefix + Date.now().toString(36) + (_seq++).toString(36) + Math.floor(Math.random() * 1e6).toString(36); }

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 紛らわしい I/O/0/1 を除外
function genRoomCode() {
  for (let tries = 0; tries < 50; tries++) {
    let c = "";
    for (let i = 0; i < 5; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    if (!rooms.has(c)) return c;
  }
  return uid("R").slice(0, 6).toUpperCase();
}
function now() { return Date.now(); }
function sanitizeName(n) { return String(n == null ? "" : n).replace(/[\r\n<>]/g, "").slice(0, MAX_NAME_LEN) || "guest"; }
function normRole(r) { return (r === "A" || r === "B" || r === "spectator") ? r : null; }

function roomSummary(room) {
  return {
    roomCode: room.roomCode, rev: room.rev, hostId: room.hostId,
    createdAt: room.createdAt, updatedAt: room.updatedAt, hasState: room.v49HasPublicState === true,
    passwordProtected: !!room.passwordHash, locked: !!room.locked, collaborativeMode: !!room.collaborativeMode, maxClients: MAX_ROOM_CLIENTS,
    clientCount: room.clients.size,
    privateReady: {
      A: !!(room.privateByRole && room.privateByRole.A && room.privateByRole.A.state),
      B: !!(room.privateByRole && room.privateByRole.B && room.privateByRole.B.state)
    },
    effectAuthority: V7912_ENGINE.publicRuntime(room),
    ruleAuthority: V50V54_ENGINE ? V50V54_ENGINE.authoritySummary(room) : null,
    stage3Authority: V55V59_ENGINE ? V55V59_ENGINE.authoritySummary(room) : null,
    stage4Authority: V60V64_ENGINE ? V60V64_ENGINE.authoritySummary(room) : null,
    stage5Authority: V65V69_ENGINE ? V65V69_ENGINE.authoritySummary(room) : null,
    stage6Authority: V70V74_ENGINE ? V70V74_ENGINE.authoritySummary(room) : null,
    stage7Authority: V75V79_ENGINE ? V75V79_ENGINE.authoritySummary(room) : null,
    v49: { strict: true, publicHash: room.stateHash || "", seenNonces: room.seenV49Nonces?.size || 0, privateRevByRole: room.privateRevByRole || { A:0, B:0 } },
    clients: [...room.clients.values()].map(c => ({ clientId: c.clientId, role: c.role, name: c.name, isHost: c.clientId === room.hostId }))
  };
}
function pushRoomLog(room, entry) {
  room.log.push(Object.assign({ at: now() }, entry));
  if (room.log.length > MAX_LOG) room.log.splice(0, room.log.length - MAX_LOG);
}
/* A/B が空いていれば希望role、埋まっていれば spectator（重複は安全側で spectator） */
function assignRole(room, wanted) {
  const w = normRole(wanted) || "spectator";
  if (w === "spectator") return "spectator";
  const taken = new Set([...room.clients.values()].map(c => c.role));
  return taken.has(w) ? "spectator" : w;
}
function pruneReconnectSlots(room) {
  if (!room.reconnectSlots) room.reconnectSlots = new Map();
  const t = now(); for (const [token, slot] of room.reconnectSlots) if (!slot || slot.expiresAt <= t) room.reconnectSlots.delete(token);
}
function scheduleRoomCleanup(room) {
  clearTimeout(room._deleteTimer); pruneReconnectSlots(room);
  const delay = room.reconnectSlots.size ? RECONNECT_GRACE_MS : EMPTY_ROOM_TTL_MS;
  room._deleteTimer = setTimeout(() => {
    pruneReconnectSlots(room);
    if (room.clients.size === 0 && room.reconnectSlots.size === 0) { rooms.delete(room.roomCode); log(`room ${room.roomCode} deleted (empty)`); }
    else if (room.clients.size === 0) scheduleRoomCleanup(room);
  }, delay);
}
function newReconnectToken() { return crypto.randomBytes(18).toString("hex"); }
function log(msg) { console.log(`[server] ${new Date().toISOString()} ${msg}`); }
/* 簡易入室制限用: パスワードは平文保持せず sha256 ハッシュ+乱数ソルトで保持（身内向け・完全な認証ではない） */
function hashPassword(pw, salt) { return crypto.createHash("sha256").update(String(salt) + ":" + String(pw)).digest("hex"); }
function setRoomPassword(room, pw) {
  const p = String(pw == null ? "" : pw).slice(0, MAX_PASSWORD_LEN);
  if (!p) { room.passwordSalt = null; room.passwordHash = null; }
  else { room.passwordSalt = crypto.randomBytes(8).toString("hex"); room.passwordHash = hashPassword(p, room.passwordSalt); }
}
function checkRoomPassword(room, pw) {
  if (!room.passwordHash) return true; // 鍵なしは誰でも可
  const p = String(pw == null ? "" : pw).slice(0, MAX_PASSWORD_LEN);
  if (!p) return false;
  return hashPassword(p, room.passwordSalt) === room.passwordHash;
}

/* ============================================================
   WebSocket
   ============================================================ */
const wss = new WebSocketServer({ server: httpServer, maxPayload: MAX_MESSAGE_BYTES });
const clientsById = new Map();

function sanitizeOutgoingState(value) {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return value;
  // Before the first v4.9 public proposal, room.state may contain only server-owned
  // history/authority scaffolding. It is not a client game state and must not be sent.
  if (!value.__cptOnlineV48) {
    // Before the first v4.9 proposal, Stage 2-7 engines may create an internal
    // players/stack scaffold. Modern clients must never mistake that internal
    // object for a game state. Raw states are exposed only in explicitly enabled
    // legacy compatibility/test mode.
    if (ALLOW_LEGACY_STATE_UPDATE && value.players && typeof value.players === "object" && Array.isArray(value.stack)) return v49StripServerAuthority(value);
    return null;
  }
  const out = v49StripServerAuthority(value);
  if (out.__cptOnlineV48) {
    out.__cptOnlineV48.publicHash = "";
    out.__cptOnlineV48.publicHash = v49EnvelopeHash(out);
  }
  return out;
}
function sanitizeOutgoingMessage(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj) || !("state" in obj)) return obj;
  const out = Object.assign({}, obj);
  out.state = sanitizeOutgoingState(obj.state);
  if (out.state?.__cptOnlineV48) {
    out.serverHash = out.state.__cptOnlineV48.publicHash;
    out.serverSha256 = sha256Json(out.state);
  }
  return out;
}
function send(ws, obj) { try { if (ws && ws.readyState === 1) ws.send(JSON.stringify(sanitizeOutgoingMessage(obj))); } catch (_) {} }
function sendError(ws, message) { send(ws, { type: "error", message: String(message) }); }
function broadcast(room, obj, exceptId) {
  for (const c of room.clients.values()) { if (c.clientId !== exceptId) send(c.ws, obj); }
}
function getRoomOf(client) { return client && client.roomCode ? rooms.get(client.roomCode) : null; }

function sha256Json(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value == null ? null : value)).digest("hex");
}
function v49Clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
function v49FNV1a(text) {
  let h = 0x811c9dc5;
  text = String(text == null ? "" : text);
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return (`00000000${h.toString(16)}`).slice(-8);
}
function v49EnvelopeHash(state) {
  const x = v49Clone(state);
  if (x?.__cptOnlineV48) x.__cptOnlineV48.publicHash = "";
  return v49FNV1a(JSON.stringify(x));
}
function v49PrivateHash(value) {
  const x = v49Clone(value);
  if (x?.__cptPrivateV49) x.__cptPrivateV49.privateHash = "";
  return v49FNV1a(JSON.stringify(x));
}
function v49Comparable(value) {
  const x = v49Clone(value || {}), m = x?.__cptOnlineV48;
  if (m) { m.sentAt = ""; m.nonce = ""; m.publicHash = ""; m.senderClientId = ""; m.baseRev = 0; }
  return x;
}
function v49DiffPaths(a, b, limit = 1200) {
  const out = [];
  function walk(x, y, pathName, depth) {
    if (out.length >= limit || x === y) return;
    if (depth > 10) { out.push(pathName || "$"); return; }
    const ax = Array.isArray(x), ay = Array.isArray(y);
    if (ax || ay) {
      if (!(ax && ay)) { out.push(pathName || "$"); return; }
      if (x.length !== y.length) out.push(`${pathName || "$"}.length`);
      const n = Math.min(Math.max(x.length, y.length), 250);
      for (let i = 0; i < n && out.length < limit; i++) walk(x[i], y[i], `${pathName || "$"}[${i}]`, depth + 1);
      return;
    }
    const ox = x && typeof x === "object", oy = y && typeof y === "object";
    if (ox || oy) {
      if (!(ox && oy)) { out.push(pathName || "$"); return; }
      const keys = [...new Set([...Object.keys(x), ...Object.keys(y)])].sort();
      for (const key of keys) { if (out.length >= limit) break; walk(x[key], y[key], pathName ? `${pathName}.${key}` : `$.${key}`, depth + 1); }
      return;
    }
    out.push(pathName || "$");
  }
  walk(v49Comparable(a), v49Comparable(b), "$", 0);
  return [...new Set(out)].sort();
}
function v49HiddenCounts(state) {
  const out = { A: {}, B: {} };
  for (const role of ["A", "B"]) {
    const pl = state?.players?.[role] || {};
    for (const zone of V49_PRIVATE_ZONES) out[role][zone] = Array.isArray(pl[zone]) ? pl[zone].length : 0;
    out[role].faceDownExile = (pl.exile || []).filter(c => c?.v48Redacted === true && c?.faceDown === true).length;
    out[role].faceDownBattlefield = [...(pl.creatures || []), ...(pl.lands || []), ...(pl.others || [])].filter(c => c?.v48Redacted === true && c?.faceDown === true).length;
  }
  return out;
}
function v49ValidateRedactedCard(card, zone, role) {
  if (!card || typeof card !== "object" || Array.isArray(card)) return false;
  if (card.v48Redacted !== true || card.faceDown !== true || card.name !== "非公開カード") return false;
  if (card.imageId != null || card.imageUrl != null) return false;
  if (card.owner !== role) return false;
  if (zone !== "stack" && card.zone && card.zone !== zone) return false;
  if (card.memo && String(card.memo).trim()) return false;
  return true;
}
function v49SameCounts(a, b) {
  for (const role of ["A", "B"]) for (const key of ["hand","library","sideboard","faceDownExile","faceDownBattlefield"])
    if (Number(a?.[role]?.[key] || 0) !== Number(b?.[role]?.[key] || 0)) return false;
  return true;
}
function v49ContainsLocalOnlyData(state) {
  return V49_LOCAL_KEYS.find(key => Object.prototype.hasOwnProperty.call(state || {}, key)) || "";
}
function v49ValidatePublicRedaction(state) {
  for (const role of ["A", "B"]) {
    const pl = state?.players?.[role];
    if (!pl || typeof pl !== "object") return { ok: false, reason: `playerMissing:${role}` };
    for (const zone of V49_PRIVATE_ZONES) {
      if (!Array.isArray(pl[zone])) return { ok: false, reason: `privateZoneInvalid:${role}:${zone}` };
      for (const card of pl[zone]) if (!v49ValidateRedactedCard(card, zone, role)) return { ok: false, reason: `privateCardNotRedacted:${role}:${zone}` };
    }
    for (const zone of ["creatures","lands","others","exile"]) {
      if (pl[zone] != null && !Array.isArray(pl[zone])) return { ok: false, reason: `zoneInvalid:${role}:${zone}` };
      for (const card of pl[zone] || []) if (card?.faceDown && !v49ValidateRedactedCard(card, zone, role)) return { ok: false, reason: `faceDownNotRedacted:${role}:${zone}` };
    }
  }
  if (state.stack != null && !Array.isArray(state.stack)) return { ok: false, reason: "stackInvalid" };
  for (const card of state.stack || []) {
    const role = card?.owner === "B" ? "B" : "A";
    if (card?.faceDown && !v49ValidateRedactedCard(card, "stack", role)) return { ok: false, reason: "faceDownNotRedacted:stack" };
  }
  return { ok: true };
}
function v49RateOk(room, client, kind) {
  const spec = V49_RATE_LIMITS[kind]; if (!spec) return true;
  if (!room.v49Rate) room.v49Rate = new Map();
  const key = `${client.clientId}:${kind}`, t = now();
  const arr = (room.v49Rate.get(key) || []).filter(x => t - x < spec.windowMs);
  if (arr.length >= spec.count) { room.v49Rate.set(key, arr); return false; }
  arr.push(t); room.v49Rate.set(key, arr); return true;
}
function v49ValidatePublicEnvelope(state, client, room) {
  if (!state || typeof state !== "object" || Array.isArray(state)) return { ok: false, reason: "stateInvalid" };
  if (Buffer.byteLength(JSON.stringify(state), "utf8") > MAX_PUBLIC_STATE_BYTES) return { ok: false, reason: "stateTooLarge" };
  const m = state.__cptOnlineV48;
  if (!m || m.schema !== 1 || m.kind !== "publicState" || m.privacy !== "safe") return { ok: false, reason: "publicEnvelopeRequired" };
  if (client.role !== "A" && client.role !== "B") return { ok: false, reason: "seatRequired" };
  if (m.senderRole !== client.role) return { ok: false, reason: "senderRoleMismatch" };
  if (String(m.senderClientId || "") !== String(client.clientId)) return { ok: false, reason: "senderClientMismatch" };
  if (Number(m.baseRev) !== Number(room.rev)) return { ok: false, reason: "envelopeBaseRevMismatch" };
  const nonce = String(m.nonce || "");
  if (!nonce || nonce.length > 200) return { ok: false, reason: "nonceInvalid" };
  if (room.seenV49Nonces?.has(nonce)) return { ok: false, reason: "duplicateNonce" };
  const expectedHash = v49EnvelopeHash(state);
  if (String(m.publicHash || "") !== expectedHash) return { ok: false, reason: "publicHashMismatch", expectedHash };
  const localKey = v49ContainsLocalOnlyData(state);
  if (localKey) return { ok: false, reason: "localOnlyData", detail: localKey };
  const redaction = v49ValidatePublicRedaction(state);
  if (!redaction.ok) return redaction;
  const actualHidden = v49HiddenCounts(state);
  if (!v49SameCounts(m.hidden, actualHidden)) return { ok: false, reason: "hiddenCountMismatch", actualHidden };
  return { ok: true, meta: m, nonce, publicHash: expectedHash };
}
function v49StripServerAuthority(value) {
  const x = v49Clone(value && typeof value === "object" ? value : {});
  // v7.0-v7.4 contains server-only history/snapshot data and is never sent.
  for (const key of ["v70", "v71", "v72", "v73", "v74"]) delete x[key];
  return x;
}
const V49_PROPOSAL_AUTHORITY_KEYS = Object.freeze([
  "v34", "v55", "v58", "v59", "v60", "v61", "v62", "v63", "v64",
  "v65", "v66", "v67", "v68", "v69", "v70", "v71", "v72", "v73", "v74"
]);
function v49StripProposalAuthority(value) {
  const x = v49Clone(value && typeof value === "object" ? value : {});
  for (const key of V49_PROPOSAL_AUTHORITY_KEYS) delete x[key];
  return x;
}
function v49CaptureProposalAuthority(room) {
  const out = {};
  const src = room?.state && typeof room.state === "object" ? room.state : {};
  for (const key of V49_PROPOSAL_AUTHORITY_KEYS) if (src[key] !== undefined) out[key] = v49Clone(src[key]);
  return out;
}
function v49RestoreProposalAuthority(room, saved) {
  if (!room.state || typeof room.state !== "object") room.state = {};
  for (const key of V49_PROPOSAL_AUTHORITY_KEYS) {
    if (saved && saved[key] !== undefined) room.state[key] = v49Clone(saved[key]);
    else delete room.state[key];
  }
}
function v49ValidateManifest(proposal, room, state) {
  const m = proposal?.mutationManifest;
  if (!m || m.schema !== 1 || !Array.isArray(m.paths)) return { ok: false, reason: "manifestRequired" };
  if (m.paths.length > 1200) return { ok: false, reason: "manifestTooLarge" };
  const supplied = [...new Set(m.paths.map(String))].sort();
  if (supplied.length !== m.paths.length || supplied.some((x, i) => x !== m.paths[i])) return { ok: false, reason: "manifestNotCanonical" };
  if (Number(m.count) !== supplied.length) return { ok: false, reason: "manifestCountMismatch" };
  const suppliedHash = v49FNV1a(JSON.stringify(supplied));
  if (String(m.hash || "") !== suppliedHash) return { ok: false, reason: "manifestSelfMismatch", expectedHash: suppliedHash };
  const expectedPaths = room.v49HasPublicState !== true ? ["$init"] : v49DiffPaths(v49StripProposalAuthority(room.state), v49StripProposalAuthority(state));
  const expectedHash = v49FNV1a(JSON.stringify(expectedPaths));
  if (JSON.stringify(supplied) !== JSON.stringify(expectedPaths)) return { ok: false, reason: "manifestMismatch", expectedPaths, expectedHash };
  return { ok: true, paths: expectedPaths, hash: expectedHash };
}
function v49ValidateSeatBoundaries(paths, role) {
  const other = role === "A" ? "B" : "A";
  const rx = new RegExp(`^\\$\\.players\\.${other}\\.(hand|library|sideboard)(?:\\.|\\[|$)`);
  const bad = (paths || []).find(p => rx.test(p));
  return bad ? { ok: false, reason: "foreignPrivateMutation", path: bad } : { ok: true };
}
function v49RememberNonce(set, nonce, limit = MAX_V49_NONCES) {
  set.add(nonce); while (set.size > limit) set.delete(set.values().next().value);
}
function v49ValidatePrivateState(value, client, room, msg) {
  if (msg.protocol !== V49_PROTOCOL) return { ok: false, reason: "protocolMismatch" };
  if (client.role !== "A" && client.role !== "B") return { ok: false, reason: "seatRequired" };
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, reason: "privateStateInvalid" };
  if (Buffer.byteLength(JSON.stringify(value), "utf8") > MAX_PRIVATE_STATE_BYTES) return { ok: false, reason: "privateTooLarge" };
  const m = value.__cptPrivateV49;
  if (!m || m.schema !== 1 || m.kind !== "seatPrivateState") return { ok: false, reason: "privateEnvelopeRequired" };
  if (m.role !== client.role) return { ok: false, reason: "privateRoleMismatch" };
  if (String(m.privateHash || "") !== v49PrivateHash(value)) return { ok: false, reason: "privateHashMismatch" };
  if (Number(m.basePublicRev) > Number(room.rev)) return { ok: false, reason: "futurePublicRev" };
  if (msg.publicRev != null && Number(msg.publicRev) > Number(room.rev)) return { ok: false, reason: "futurePublicRev" };
  if (!value.zones || !Array.isArray(value.zones.hand) || !Array.isArray(value.zones.library) || !Array.isArray(value.zones.sideboard)) return { ok: false, reason: "privateZonesInvalid" };
  for (const zone of V49_PRIVATE_ZONES) if (value.zones[zone].length > 1000) return { ok: false, reason: `privateZoneTooLarge:${zone}` };
  const nonce = String(m.nonce || "");
  if (!nonce || nonce.length > 200) return { ok: false, reason: "privateNonceInvalid" };
  const set = room.privateSeenNonces?.[client.role];
  if (set?.has(nonce)) return { ok: false, reason: "duplicatePrivateNonce" };
  return { ok: true, meta: m, nonce };
}
function rolePrivate(room, role) {
  return role === "A" || role === "B" ? room.privateByRole?.[role] || null : null;
}
function effectPrivateFor(room, role) {
  return role === "A" || role === "B" ? V7912_ENGINE.privatePayload(room, role) : null;
}
function privateStateFor(room, role) {
  return rolePrivate(room, role)?.state || null;
}
function rememberNonce(room, nonce) {
  nonce = String(nonce || "").slice(0, 160);
  if (!nonce) return false;
  if (!room.effectNonces) room.effectNonces = new Map();
  if (room.effectNonces.has(nonce)) return false;
  room.effectNonces.set(nonce, now());
  while (room.effectNonces.size > MAX_EFFECT_NONCES) room.effectNonces.delete(room.effectNonces.keys().next().value);
  return true;
}
function hasPendingEffectWork(room) {
  const r = V7912_ENGINE.ensureRoom(room);
  return !!(r.txByRole.A || r.txByRole.B || r.choices.some(x => x && x.status === "pending"));
}
function hasPendingStage2Work(room) {
  return !!(V50V54_ENGINE && V50V54_ENGINE.anyActive(room));
}
function hasPendingStage3Work(room) {
  return !!(V55V59_ENGINE && V55V59_ENGINE.anyActive(room));
}
function hasPendingStage4Work(room) {
  return !!(room?.v60v64 && V60V64_ENGINE && V60V64_ENGINE.anyActive(room));
}
function hasPendingStage5Work(room) {
  return !!(V65V69_ENGINE && V65V69_ENGINE.anyActive(room));
}
function hasPendingStage6Work(room) {
  return !!(V70V74_ENGINE && V70V74_ENGINE.anyActive(room));
}
function clientCanMutateRoom(room, client) {
  if (client.clientId === room.hostId) return true;
  if (!room.collaborativeMode) return false;
  return client.role === "A" || client.role === "B";
}
function refreshRoomHash(room) {
  const publicState = sanitizeOutgoingState(room.state);
  if (publicState?.__cptOnlineV48) room.stateHash = publicState.__cptOnlineV48.publicHash;
  else room.stateHash = sha256Json(publicState);
  room.stateSha256 = sha256Json(publicState);
  return room.stateHash;
}
function authorityEnvelope(room, client) {
  return {
    authority: AUTHORITY,
    effectAuthority: room ? V7912_ENGINE.publicRuntime(room) : null,
    effectPrivate: room ? effectPrivateFor(room, client?.role) : null
  };
}
function sendSeatPrivateSync(room, client, type = "seatPrivateSync") {
  if (!room || !client || (client.role !== "A" && client.role !== "B")) return;
  const entry = rolePrivate(room, client.role);
  send(client.ws, {
    type, protocol: V49_PROTOCOL, roomCode: room.roomCode,
    privateRev: Number(entry?.rev) || 0, privateState: entry?.state || null,
    publicRev: room.rev, authority: AUTHORITY
  });
}
function broadcastState(room, from, extra = {}) {
  for (const c of room.clients.values()) {
    send(c.ws, Object.assign({
      type: "stateSync", state: room.state, rev: room.rev, from,
      serverHash: room.stateHash || refreshRoomHash(room), serverSha256: room.stateSha256 || sha256Json(room.state),
      authority: AUTHORITY,
      effectAuthority: V7912_ENGINE.publicRuntime(room),
      effectPrivate: effectPrivateFor(room, c.role)
    }, extra));
  }
}
function sendEffectSync(room, type, extra = {}) {
  for (const c of room.clients.values()) {
    send(c.ws, Object.assign({
      type, protocol: EFFECT_PROTOCOL, rev: room.rev, state: room.state,
      privateState: privateStateFor(room, c.role),
      effectPrivate: effectPrivateFor(room, c.role),
      effectAuthority: V7912_ENGINE.publicRuntime(room),
      authority: AUTHORITY
    }, extra));
  }
}
function effectReject(client, room, msg, reason, detail) {
  send(client.ws, {
    type: "effectAuthorityRejected", protocol: EFFECT_PROTOCOL,
    actionNonce: String(msg?.actionNonce || ""), txId: String(msg?.txId || ""),
    reason: String(reason || "rejected"), detail: String(detail || ""),
    rev: Number(room?.rev) || 0,
    effectAuthority: room ? V7912_ENGINE.publicRuntime(room) : null,
    authority: AUTHORITY
  });
}
function normalizePrivateState(client, msg) {
  const room = getRoomOf(client);
  const v = v49ValidatePrivateState(msg.privateState, client, room, msg);
  if (!v.ok) { const e = new Error(v.reason); e.v49 = v; throw e; }
  return { state: v49Clone(msg.privateState), validation: v };
}


let V65V69_ENGINE = null;
let V70V74_ENGINE = null;
let V75V79_ENGINE = null;
function stageActionMeta(room, label, detail) {
  const last = Array.isArray(room?.log) && room.log.length ? room.log[room.log.length - 1] : null;
  return {
    label: String(label || last?.label || last?.line || last?.kind || "ゲーム操作").slice(0, 160),
    action: String(last?.kind || "serverAction").slice(0, 100),
    detail: String(detail || last?.line || "").slice(0, 240)
  };
}
function finalizeRoomWithHistory(room, affectedRoles, label) {
  room.rev = Number(room.rev || 0) + 1;
  room.updatedAt = now();
  if (V70V74_ENGINE) V70V74_ENGINE.recordSnapshot(room, stageActionMeta(room, label, affectedRoles ? `affected: ${[].concat(affectedRoles).join(",")}` : ""));
}

const V50V54_ENGINE = V50V54_MODULE.createEngine({
  send(target, value) { send(target, value); },
  broadcast(room, value, exceptId) { broadcast(room, value, exceptId); },
  pushLog(room, entry) { pushRoomLog(room, entry); },
  refreshRoomHash(room) { return refreshRoomHash(room); },
  privateStateFor(room, role) { return privateStateFor(room, role); },
  rolePrivate(room, role) { return rolePrivate(room, role); },
  validatePrivateState(client, room, msg) {
    const v = v49ValidatePrivateState(msg.privateState, client, room, msg);
    if (!v.ok) { const e = new Error(v.reason); e.v49 = v; throw e; }
    return v49Clone(msg.privateState);
  },
  finalizeRoom(room, affectedRoles, label) { finalizeRoomWithHistory(room, affectedRoles, label); },
  authority() { return AUTHORITY; },
  effectAuthority(room) { return V7912_ENGINE.publicRuntime(room); },
  preResolveStackObject(room, top) { return V65V69_ENGINE ? V65V69_ENGINE.preResolveStackObject(room, top) : { apply: true }; }
});

const V55V59_ENGINE = V55V59_MODULE.createEngine({
  send(target, value) { send(target && target.ws ? target.ws : target, value); },
  broadcast(room, value, exceptId) { broadcast(room, value, exceptId); },
  pushLog(room, entry) { pushRoomLog(room, entry); },
  refreshRoomHash(room) { return refreshRoomHash(room); },
  privateStateFor(room, role) { return privateStateFor(room, role); },
  rolePrivate(room, role) { return privateStateFor(room, role); },
  finalizeRoom(room, affectedRoles, label) { finalizeRoomWithHistory(room, affectedRoles, label); },
  authority() { return AUTHORITY; },
  resolveTopStack(room, role) { return V50V54_ENGINE.resolveTopForTurn(room, role); }
});

const V60V64_ENGINE = V60V64_MODULE.createEngine({
  send(target, value) { send(target && target.ws ? target.ws : target, value); },
  broadcast(room, value, exceptId) { broadcast(room, value, exceptId); },
  pushLog(room, entry) { pushRoomLog(room, entry); },
  refreshRoomHash(room) { return refreshRoomHash(room); },
  finalizeRoom(room, affectedRoles, label) { finalizeRoomWithHistory(room, affectedRoles, label); },
  authority() { return AUTHORITY; },
  recomputeLayers(room) { return V55V59_ENGINE.recomputeLayers(room); },
  runSba(room) { return V55V59_ENGINE.runSba(room, { reason: "v60v64" }); },
  startTriggerEvent(room, event, client, nonce) { return V55V59_ENGINE.startExternalTriggerEvent(room, event, client, nonce); }
});

V65V69_ENGINE = V65V69_MODULE.createEngine({
  send(target, value) { send(target && target.ws ? target.ws : target, value); },
  broadcast(room, value, exceptId) { broadcast(room, value, exceptId); },
  pushLog(room, entry) { pushRoomLog(room, entry); },
  refreshRoomHash(room) { return refreshRoomHash(room); },
  finalizeRoom(room, affectedRoles, label) { finalizeRoomWithHistory(room, affectedRoles, label); },
  authority() { return AUTHORITY; },
  recomputeLayers(room) { return V55V59_ENGINE.recomputeLayers(room); },
  runSba(room) { return V55V59_ENGINE.runSba(room, { reason: "v65v69" }); },
  resolveTopStack(room, role) { return V50V54_ENGINE.resolveTopForTurn(room, role); }
});

V70V74_ENGINE = V70V74_MODULE.createEngine({
  send(target, value) { send(target && target.ws ? target.ws : target, value); },
  broadcast(room, value, exceptId) { broadcast(room, value, exceptId); },
  pushLog(room, entry) { pushRoomLog(room, entry); },
  refreshRoomHash(room) { return refreshRoomHash(room); },
  privateStateFor(room, role) { return privateStateFor(room, role); },
  cancelAllTransactions(room) {
    V7912_ENGINE.cancelClientTransactions(room, "__rollback__");
    V50V54_ENGINE.cancelClientTransactions(room, "__rollback__");
    V55V59_ENGINE.cancelClientTransactions(room, "__rollback__");
    V60V64_ENGINE.cancelClientTransactions(room, "__rollback__");
    V65V69_ENGINE.cancelClientTransactions(room, "__rollback__");
    if (room.v7912) { room.v7912.txByRole = { A: null, B: null }; room.v7912.choices = []; }
    if (room.v50v54) for (const k of Object.keys(room.v50v54)) if (/Tx$|tx$/i.test(k)) room.v50v54[k] = null;
    if (room.v55v59) for (const k of Object.keys(room.v55v59)) if (/Tx$|tx$/i.test(k)) room.v55v59[k] = null;
    if (room.v60v64) for (const k of Object.keys(room.v60v64)) if (/Tx$|tx$/i.test(k)) room.v60v64[k] = null;
    if (room.v65v69) for (const k of ["triggerTx","loopTx","choiceTx","branchTx"]) room.v65v69[k] = null;
  }
});

V75V79_ENGINE = V75V79_MODULE.createEngine({
  send(target, value) { send(target && target.ws ? target.ws : target, value); },
  broadcast(room, value, exceptId) { broadcast(room, value, exceptId); },
  pushLog(room, entry) { pushRoomLog(room, entry); },
  authority() { return AUTHORITY; },
  chapterAnalysis(room, categories, threshold) { return V70V74_ENGINE.chapterAnalysis(room, categories, threshold); },
  reportContent(room, categories) { return V70V74_ENGINE.reportContent(room, categories); }
});


function leaveCurrentRoom(client, silent, preserveReconnect) {
  const room = getRoomOf(client);
  if (!room) { client.roomCode = null; return; }
  const wasHost = room.hostId === client.clientId;
  V7912_ENGINE.cancelClientTransactions(room, client.id || client.clientId);
  V50V54_ENGINE.cancelClientTransactions(room, client.id || client.clientId);
  V55V59_ENGINE.cancelClientTransactions(room, client.id || client.clientId);
  V60V64_ENGINE.cancelClientTransactions(room, client.id || client.clientId);
  V65V69_ENGINE.cancelClientTransactions(room, client.id || client.clientId);
  V70V74_ENGINE.cancelClientTransactions(room, client.id || client.clientId);
  V75V79_ENGINE.cancelClientTransactions(room, client.id || client.clientId);
  room.clients.delete(client.clientId); client.roomCode = null;
  if (preserveReconnect && client.reconnectToken) {
    if (!room.reconnectSlots) room.reconnectSlots = new Map();
    room.reconnectSlots.set(client.reconnectToken, { role: client.role, name: client.name, wasHost, expiresAt: now() + RECONNECT_GRACE_MS });
    pushRoomLog(room, { kind: "disconnectGrace", clientId: client.clientId, name: client.name, role: client.role });
  } else if (room.reconnectSlots && client.reconnectToken) room.reconnectSlots.delete(client.reconnectToken);
  pushRoomLog(room, { kind: "leave", clientId: client.clientId, name: client.name });
  if (room.clients.size === 0) { scheduleRoomCleanup(room); }
  else {
    if (wasHost) {
      const next = [...room.clients.values()].sort((a, b) => a.joinedAt - b.joinedAt)[0];
      room.hostId = next.clientId; pushRoomLog(room, { kind: "hostChanged", clientId: next.clientId });
      log(`room ${room.roomCode} host -> ${next.clientId}`);
    }
    if (!silent) broadcast(room, { type: "roomUpdate", roomSummary: roomSummary(room), authority: AUTHORITY, effectAuthority: V7912_ENGINE.publicRuntime(room) });
  }
}

/* ---------- メッセージハンドラ ---------- */
const handlers = {
  ping(client) { send(client.ws, { type: "pong", at: now() }); },

  createRoom(client, msg) {
    leaveCurrentRoom(client);
    const room = {
      roomCode: genRoomCode(), createdAt: now(), updatedAt: now(),
      hostId: client.clientId, clients: new Map(), reconnectSlots: new Map(), state: null, rev: 0, log: [], _deleteTimer: null,
      passwordSalt: null, passwordHash: null, locked: false, collaborativeMode: false,
      privateByRole: { A: null, B: null }, privateRevByRole: { A: 0, B: 0 },
      seenV49Nonces: new Set(), privateSeenNonces: { A: new Set(), B: new Set() }, v49Rate: new Map(), v49HasPublicState: false,
      effectNonces: new Map(), stateHash: sha256Json(null), stateSha256: sha256Json(null), v7912: null, v50v54: null, v55v59: null, v60v64: null, v65v69: null, v70v74: null, v75v79: null
    };
    setRoomPassword(room, msg.password); // 空なら鍵なし。ハッシュのみ保持しクライアントへは配信しない
    client.name = sanitizeName(msg.name != null ? msg.name : client.name);
    client.role = assignRole(room, msg.role || "A"); // 作成者は既定でA希望
    client.roomCode = room.roomCode;
    room.clients.set(client.clientId, client);
    rooms.set(room.roomCode, room);
    pushRoomLog(room, { kind: "create", clientId: client.clientId, name: client.name });
    log(`room ${room.roomCode} created by ${client.clientId} (${client.name})`);
    log(`room ${room.roomCode} password=${room.passwordHash ? "on" : "off"}`);
    V7912_ENGINE.ensureRoom(room);
    V50V54_ENGINE.ensureRoom(room);
    V55V59_ENGINE.ensureRoom(room);
    V60V64_ENGINE.ensureRuntime(room); V65V69_ENGINE.ensureRoom(room); V70V74_ENGINE.ensureRoom(room); V75V79_ENGINE.ensureRoom(room);
    send(client.ws, {
      type: "roomCreated", roomCode: room.roomCode, clientId: client.clientId, role: client.role,
      reconnectToken: client.reconnectToken, roomSummary: roomSummary(room), rev: room.rev,
      state: room.state, privateState: privateStateFor(room, client.role),
      authority: AUTHORITY, effectAuthority: V7912_ENGINE.publicRuntime(room),
      ruleAuthority: V50V54_ENGINE.authoritySummary(room), stage3Authority: V55V59_ENGINE.authoritySummary(room), stage4Authority: V60V64_ENGINE.authoritySummary(room), stage5Authority: V65V69_ENGINE.authoritySummary(room), stage6Authority: V70V74_ENGINE.authoritySummary(room), stage7Authority: V75V79_ENGINE.authoritySummary(room),
      effectPrivate: effectPrivateFor(room, client.role)
    });
  },

  joinRoom(client, msg) {
    const code = String(msg.roomCode || "").trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) { sendError(client.ws, "roomCode が見つかりません: " + code); return; }
    pruneReconnectSlots(room);
    const token = String(msg.reconnectToken || "");
    const slot = token && room.reconnectSlots ? room.reconnectSlots.get(token) : null;
    const isReconnect = !!(slot && slot.expiresAt > now());
    const alreadyIn = room.clients.has(client.clientId);
    if (!alreadyIn && !isReconnect) {
      if (!checkRoomPassword(room, msg.password)) { send(client.ws, { type: "joinRejected", reason: "password", roomCode: code, message: "パスワードが違います" }); return; }
      if (room.locked) { send(client.ws, { type: "joinRejected", reason: "locked", roomCode: code, message: "このルームは新規参加がロックされています" }); return; }
      if (room.clients.size >= MAX_ROOM_CLIENTS) { send(client.ws, { type: "joinRejected", reason: "full", roomCode: code, message: "満員です（最大" + MAX_ROOM_CLIENTS + "人）" }); return; }
    }
    leaveCurrentRoom(client);
    clearTimeout(room._deleteTimer);
    if (isReconnect) client.reconnectToken = token;
    client.name = sanitizeName(isReconnect ? slot.name : (msg.name != null ? msg.name : client.name));
    client.role = assignRole(room, isReconnect ? slot.role : msg.role);
    client.roomCode = room.roomCode; client.joinedAt = now(); room.clients.set(client.clientId, client);
    if (isReconnect) { room.reconnectSlots.delete(token); if (slot.wasHost) room.hostId = client.clientId; }
    V55V59_ENGINE.ensureRoom(room); V60V64_ENGINE.ensureRuntime(room); V65V69_ENGINE.ensureRoom(room); V70V74_ENGINE.ensureRoom(room); V75V79_ENGINE.ensureRoom(room);
    pushRoomLog(room, { kind: "join", clientId: client.clientId, name: client.name, role: client.role });
    log(`room ${room.roomCode} join ${client.clientId} (${client.name}/${client.role})`);
    // 再接続/途中参加でも現在の state/rev をそのまま返す（再同期）
    send(client.ws, {
      type: "roomJoined", roomCode: room.roomCode, clientId: client.clientId, role: client.role,
      roomSummary: roomSummary(room), state: room.state, rev: room.rev, log: room.log.slice(-20), reconnected: isReconnect, reconnectToken: client.reconnectToken,
      privateState: privateStateFor(room, client.role), authority: AUTHORITY,
      effectAuthority: V7912_ENGINE.publicRuntime(room), ruleAuthority: V50V54_ENGINE.authoritySummary(room), stage3Authority: V55V59_ENGINE.authoritySummary(room), stage4Authority: V60V64_ENGINE.authoritySummary(room), stage5Authority: V65V69_ENGINE.authoritySummary(room), stage6Authority: V70V74_ENGINE.authoritySummary(room), stage7Authority: V75V79_ENGINE.authoritySummary(room), effectPrivate: effectPrivateFor(room, client.role)
    });
    broadcast(room, { type: "roomUpdate", roomSummary: roomSummary(room), authority: AUTHORITY, effectAuthority: V7912_ENGINE.publicRuntime(room) }, client.clientId);
  },

  leaveRoom(client) { leaveCurrentRoom(client); send(client.ws, { type: "roomUpdate", roomSummary: null }); },

  setLock(client, msg) {
    const room = getRoomOf(client);
    if (!room) { sendError(client.ws, "roomに参加していません"); return; }
    if (client.clientId !== room.hostId) { sendError(client.ws, "ロックはホストのみ操作できます"); return; }
    room.locked = !!msg.locked;
    pushRoomLog(room, { kind: "setLock", locked: room.locked });
    log(`room ${room.roomCode} locked=${room.locked}`);
    broadcast(room, { type: "roomUpdate", roomSummary: roomSummary(room), authority: AUTHORITY, effectAuthority: V7912_ENGINE.publicRuntime(room) }, client.clientId);
    send(client.ws, { type: "roomUpdate", roomSummary: roomSummary(room), authority: AUTHORITY, effectAuthority: V7912_ENGINE.publicRuntime(room) });
  },

  setCollaborativeMode(client, msg) {
    const room = getRoomOf(client);
    if (!room) { sendError(client.ws, "roomに参加していません"); return; }
    if (client.clientId !== room.hostId) { sendError(client.ws, "双方向同期の切替はホストのみ可能です"); return; }
    room.collaborativeMode = !!msg.collaborativeMode;
    pushRoomLog(room, { kind: "setCollaborativeMode", on: room.collaborativeMode });
    log(`room ${room.roomCode} collaborativeMode=${room.collaborativeMode}`);
    broadcast(room, { type: "roomUpdate", roomSummary: roomSummary(room), authority: AUTHORITY, effectAuthority: V7912_ENGINE.publicRuntime(room) }, client.clientId);
    send(client.ws, { type: "roomUpdate", roomSummary: roomSummary(room), authority: AUTHORITY, effectAuthority: V7912_ENGINE.publicRuntime(room) });
  },

  setPassword(client, msg) {
    const room = getRoomOf(client);
    if (!room) { sendError(client.ws, "roomに参加していません"); return; }
    if (client.clientId !== room.hostId) { sendError(client.ws, "パスワード変更はホストのみ可能です"); return; }
    setRoomPassword(room, msg.password);
    pushRoomLog(room, { kind: "setPassword", protected: !!room.passwordHash }); // 値は残さない
    log(`room ${room.roomCode} password ${room.passwordHash ? "set" : "cleared"}`);
    broadcast(room, { type: "roomUpdate", roomSummary: roomSummary(room), authority: AUTHORITY, effectAuthority: V7912_ENGINE.publicRuntime(room) }, client.clientId);
    send(client.ws, { type: "roomUpdate", roomSummary: roomSummary(room), authority: AUTHORITY, effectAuthority: V7912_ENGINE.publicRuntime(room) });
  },

  setRole(client, msg) {
    const room = getRoomOf(client);
    if (!room) { sendError(client.ws, "roomに参加していません"); return; }
    const wanted = normRole(msg.role);
    if (!wanted) { sendError(client.ws, "role は A / B / spectator です"); return; }
    client.role = (wanted === "spectator") ? "spectator" : assignRole(room, wanted);
    pushRoomLog(room, { kind: "setRole", clientId: client.clientId, role: client.role });
    broadcast(room, { type: "roomUpdate", roomSummary: roomSummary(room), authority: AUTHORITY, effectAuthority: V7912_ENGINE.publicRuntime(room) }, client.clientId);
    send(client.ws, { type: "roomUpdate", roomSummary: roomSummary(room), authority: AUTHORITY, effectAuthority: V7912_ENGINE.publicRuntime(room) });
  },

  stateUpdate(client, msg) {
    if (!ALLOW_LEGACY_STATE_UPDATE) {
      const room = getRoomOf(client);
      send(client.ws, { type: "stateRejected", reason: "legacyStateDisabled", serverRev: room?.rev || 0, state: room?.state || null, authority: AUTHORITY });
      return;
    }
    return handlers._acceptState(client, msg, false);
  },

  stateProposal(client, msg) {
    if (msg.protocol !== V49_PROTOCOL) {
      send(client.ws, { type: "stateRejected", reason: "protocolMismatch", serverRev: getRoomOf(client)?.rev || 0, authority: AUTHORITY });
      return;
    }
    return handlers._acceptState(client, msg, true);
  },

  _acceptState(client, msg, proposalMode) {
    const room = getRoomOf(client);
    if (!room || (msg.roomCode && String(msg.roomCode).toUpperCase() !== room.roomCode)) { sendError(client.ws, "roomに参加していません / roomCode不一致"); return; }
    if (!clientCanMutateRoom(room, client)) { send(client.ws, { type: "stateRejected", reason: client.role === "spectator" ? "spectatorState" : "nonHostState", serverRev: room.rev, state: room.state, authority: AUTHORITY }); return; }
    if (hasPendingEffectWork(room)) { send(client.ws, { type: "stateRejected", reason: "effectTransactionActive", serverRev: room.rev, state: room.state, authority: AUTHORITY }); return; }
    if (hasPendingStage2Work(room)) { send(client.ws, { type: "stateRejected", reason: V50V54_ENGINE.activeKind(room), serverRev: room.rev, state: room.state, authority: AUTHORITY }); return; }
    if (hasPendingStage3Work(room)) { send(client.ws, { type: "stateRejected", reason: V55V59_ENGINE.activeKind(room), serverRev: room.rev, state: room.state, authority: AUTHORITY }); return; }
    if (hasPendingStage4Work(room)) { send(client.ws, { type: "stateRejected", reason: V60V64_ENGINE.activeKind(room), serverRev: room.rev, state: room.state, authority: AUTHORITY }); return; }
    if (hasPendingStage5Work(room)) { send(client.ws, { type: "stateRejected", reason: V65V69_ENGINE.activeKind(room), serverRev: room.rev, state: room.state, authority: AUTHORITY }); return; }
    if (hasPendingStage6Work(room)) { send(client.ws, { type: "stateRejected", reason: V70V74_ENGINE.activeKind(room), serverRev: room.rev, state: room.state, authority: AUTHORITY }); return; }
    if (!v49RateOk(room, client, "proposal")) { send(client.ws, { type: "stateRejected", reason: "rateLimited", serverRev: room.rev, state: room.state, authority: AUTHORITY }); return; }
    if (typeof msg.rev !== "number" || msg.rev !== room.rev) { send(client.ws, { type: "stateRejected", reason: "staleRev", serverRev: room.rev, state: room.state, authority: AUTHORITY }); return; }
    if (!proposalMode) {
      if (msg.state == null || typeof msg.state !== "object" || Array.isArray(msg.state)) { sendError(client.ws, "state がありません"); return; }
      // 明示的に有効化された旧形式互換モードでは、従来どおり完全stateを受理する。
      // 通常運用では ALLOW_LEGACY_STATE_UPDATE=false のため、この経路は使用されない。
      room.state = v49Clone(msg.state); room.v49HasPublicState = true; room.rev += 1; room.updatedAt = now(); refreshRoomHash(room); V7912_ENGINE.ensureRoom(room); V50V54_ENGINE.ensureRoom(room); V55V59_ENGINE.ensureRoom(room); V60V64_ENGINE.ensureRuntime(room); V65V69_ENGINE.ensureRoom(room); V75V79_ENGINE.ensureRoom(room);
      V70V74_ENGINE.recordSnapshot(room, { label: "旧形式state更新", category: "system", force: true });
      pushRoomLog(room, { kind: "legacyStateUpdate", clientId: client.clientId, rev: room.rev });
      broadcastState(room, client.clientId, { legacy: true }); return;
    }
    const envelope = v49ValidatePublicEnvelope(msg.state, client, room);
    if (!envelope.ok) { send(client.ws, { type: "stateRejected", reason: envelope.reason, detail: envelope.detail || envelope.expectedHash || "", serverRev: room.rev, state: room.state, authority: AUTHORITY }); return; }
    const manifest = v49ValidateManifest(msg, room, msg.state);
    if (!manifest.ok) { send(client.ws, { type: "stateRejected", reason: manifest.reason, detail: manifest.expectedHash || "", expectedPaths: manifest.expectedPaths || [], serverRev: room.rev, state: room.state, authority: AUTHORITY }); return; }
    const boundary = v49ValidateSeatBoundaries(manifest.paths, client.role);
    if (!boundary.ok) { send(client.ws, { type: "stateRejected", reason: boundary.reason, detail: boundary.path, serverRev: room.rev, state: room.state, authority: AUTHORITY }); return; }
    v49RememberNonce(room.seenV49Nonces, envelope.nonce);
    const savedAuthority = v49CaptureProposalAuthority(room);
    room.state = v49Clone(msg.state); v49RestoreProposalAuthority(room, savedAuthority); room.v49HasPublicState = true; room.rev += 1; room.updatedAt = now(); room.stateHash = envelope.publicHash; room.stateSha256 = sha256Json(room.state); V7912_ENGINE.ensureRoom(room); V50V54_ENGINE.ensureRoom(room); V55V59_ENGINE.ensureRoom(room); V60V64_ENGINE.ensureRuntime(room); V65V69_ENGINE.ensureRoom(room); V75V79_ENGINE.ensureRoom(room);
    if (Array.isArray(msg.logDelta)) for (const line of msg.logDelta.slice(0, 50)) pushRoomLog(room, { kind: "game", line: String(line).slice(0, 300) });
    const proposalId = String(msg.proposalId || "").slice(0, 120);
    const authority = { protocol: V49_PROTOCOL, proposalId, acceptedAt: new Date().toISOString(), serverHash: room.stateHash, serverSha256: room.stateSha256, manifestHash: manifest.hash, changedScopes: manifest.paths.slice(0, 80) };
    pushRoomLog(room, { kind: "stateProposal", clientId: client.clientId, rev: room.rev, proposalId, changes: manifest.paths.length });
    V70V74_ENGINE.recordSnapshot(room, { label: msg.label || "盤面state提案", action: "stateProposal", detail: `${manifest.paths.length}変更`, force: true });
    refreshRoomHash(room);
    broadcastState(room, client.clientId, { proposalId, serverHash: envelope.publicHash, acceptedPublicHash: envelope.publicHash, proposalReceipt: authority, mutationManifest: { schema: 1, paths: manifest.paths, count: manifest.paths.length, hash: manifest.hash } });
  },

  seatPrivateUpdate(client, msg) {
    const room = getRoomOf(client);
    if (!room) { sendError(client.ws, "roomに参加していません"); return; }
    if (hasPendingStage2Work(room)) { send(client.ws, { type: "privateStateRejected", protocol: V49_PROTOCOL, reason: V50V54_ENGINE.activeKind(room), publicRev: room.rev, authority: AUTHORITY }); return; }
    if (hasPendingStage3Work(room)) { send(client.ws, { type: "privateStateRejected", protocol: V49_PROTOCOL, reason: V55V59_ENGINE.activeKind(room), publicRev: room.rev, authority: AUTHORITY }); return; }
    if (hasPendingStage4Work(room)) { send(client.ws, { type: "privateStateRejected", protocol: V49_PROTOCOL, reason: V60V64_ENGINE.activeKind(room), publicRev: room.rev, authority: AUTHORITY }); return; }
    if (hasPendingStage5Work(room)) { send(client.ws, { type: "privateStateRejected", protocol: V49_PROTOCOL, reason: V65V69_ENGINE.activeKind(room), publicRev: room.rev, authority: AUTHORITY }); return; }
    if (hasPendingStage6Work(room)) { send(client.ws, { type: "privateStateRejected", protocol: V49_PROTOCOL, reason: V70V74_ENGINE.activeKind(room), publicRev: room.rev, authority: AUTHORITY }); return; }
    if (!v49RateOk(room, client, "private")) { send(client.ws, { type: "privateStateRejected", protocol: V49_PROTOCOL, reason: "rateLimited", publicRev: room.rev, authority: AUTHORITY }); return; }
    try {
      const normalized = normalizePrivateState(client, msg), state = normalized.state, validation = normalized.validation;
      const rev = (Number(room.privateRevByRole[client.role]) || 0) + 1;
      state.__cptPrivateV49.privateRev = rev;
      state.__cptPrivateV49.storedAt = new Date().toISOString();
      state.__cptPrivateV49.privateHash = "";
      state.__cptPrivateV49.privateHash = v49PrivateHash(state);
      room.privateRevByRole[client.role] = rev;
      room.privateByRole[client.role] = { state, rev, updatedAt: now(), clientId: client.clientId, hash: state.__cptPrivateV49.privateHash, sha256: sha256Json(state) };
      v49RememberNonce(room.privateSeenNonces[client.role], validation.nonce);
      pushRoomLog(room, { kind: "privateStateUpdate", role: client.role, privateRev: rev });
      V70V74_ENGINE.recordSnapshot(room, { label: `${client.role}の秘密state更新`, category: "zone", detail: `private rev ${rev}`, force: true });
      refreshRoomHash(room);
      send(client.ws, { type: "privateStateAck", protocol: V49_PROTOCOL, privateRev: rev, publicRev: room.rev, privateHash: room.privateByRole[client.role].hash, authority: AUTHORITY });
    } catch (e) {
      send(client.ws, { type: "privateStateRejected", protocol: V49_PROTOCOL, reason: String(e.message || e), detail: e.v49?.detail || "", publicRev: room.rev, authority: AUTHORITY });
    }
  },

  requestPrivateState(client) {
    const room = getRoomOf(client);
    if (!room) { sendError(client.ws, "roomに参加していません"); return; }
    sendSeatPrivateSync(room, client);
  },

  authorityInfo(client) {
    const room = getRoomOf(client);
    send(client.ws, {
      type: "authorityInfo", authority: AUTHORITY,
      roomSummary: room ? roomSummary(room) : null,
      effectAuthority: room ? V7912_ENGINE.publicRuntime(room) : null,
      ruleAuthority: room ? V50V54_ENGINE.authoritySummary(room) : null,
      stage3Authority: room ? V55V59_ENGINE.authoritySummary(room) : null,
      stage4Authority: room ? V60V64_ENGINE.authoritySummary(room) : null,
      stage5Authority: room ? V65V69_ENGINE.authoritySummary(room) : null,
      stage6Authority: room ? V70V74_ENGINE.authoritySummary(room) : null,
      stage7Authority: room ? V75V79_ENGINE.authoritySummary(room) : null
    });
  },

  effectAuthoritySyncRequest(client) {
    const room = getRoomOf(client);
    if (!room) { sendError(client.ws, "roomに参加していません"); return; }
    send(client.ws, {
      type: "effectAuthoritySync", protocol: EFFECT_PROTOCOL, rev: room.rev, state: room.state,
      privateState: privateStateFor(room, client.role),
      effectPrivate: effectPrivateFor(room, client.role),
      effectAuthority: V7912_ENGINE.publicRuntime(room), authority: AUTHORITY
    });
  },

  effectTxStart(client, msg) {
    const room = getRoomOf(client);
    if (!room) { sendError(client.ws, "roomに参加していません"); return; }
    if (hasPendingStage2Work(room)) { effectReject(client, room, msg, V50V54_ENGINE.activeKind(room)); return; }
    if (hasPendingStage3Work(room)) { effectReject(client, room, msg, V55V59_ENGINE.activeKind(room)); return; }
    if (hasPendingStage4Work(room)) { effectReject(client, room, msg, V60V64_ENGINE.activeKind(room)); return; }
    if (hasPendingStage5Work(room)) { effectReject(client, room, msg, V65V69_ENGINE.activeKind(room)); return; }
    if (hasPendingStage6Work(room)) { effectReject(client, room, msg, V70V74_ENGINE.activeKind(room)); return; }
    try {
      if (!rememberNonce(room, msg.actionNonce)) throw new Error("duplicateNonce");
      const tx = V7912_ENGINE.stage(room, client, msg);
      send(client.ws, {
        type: "effectTxStarted", protocol: EFFECT_PROTOCOL, actionNonce: tx.actionNonce,
        txId: tx.id, baseRev: tx.baseRev, planCommitment: tx.planCommitment,
        summary: { label: tx.plan.label, operationCount: tx.plan.operations.length },
        effectAuthority: V7912_ENGINE.publicRuntime(room), authority: AUTHORITY
      });
    } catch (e) { effectReject(client, room, msg, e.message || e); }
  },

  effectTxCommit(client, msg) {
    const room = getRoomOf(client);
    if (!room) { sendError(client.ws, "roomに参加していません"); return; }
    try {
      const beforePrivate = {
        A: sha256Json(privateStateFor(room, "A")),
        B: sha256Json(privateStateFor(room, "B"))
      };
      const out = V7912_ENGINE.commit(room, client, msg, {
        finalize(r) {
          r.rev = Number(r.rev || 0) + 1;
          r.updatedAt = now();
          V70V74_ENGINE.recordSnapshot(r, { label: "効果トランザクション", category: "ability", force: true });
          refreshRoomHash(r);
        }
      });
      for (const p of ["A", "B"]) {
        const entry = rolePrivate(room, p);
        if (entry && beforePrivate[p] !== sha256Json(entry.state)) {
          entry.rev = (Number(entry.rev) || 0) + 1;
          room.privateRevByRole[p] = entry.rev;
          entry.updatedAt = now();
          entry.hash = sha256Json(entry.state);
        }
      }
      pushRoomLog(room, { kind: "effectTxCommit", role: client.role, txId: out.txId, rev: room.rev });
      sendEffectSync(room, "effectTxCommitted", {
        actionNonce: out.actionNonce, txId: out.txId,
        summary: { operations: out.summaries, proof: out.proof }
      });
    } catch (e) {
      try { V7912_ENGINE.cancel(room, client, msg); } catch (_) {}
      effectReject(client, room, msg, e.message || e);
    }
  },

  effectTxCancel(client, msg) {
    const room = getRoomOf(client);
    if (!room) { sendError(client.ws, "roomに参加していません"); return; }
    try {
      const tx = V7912_ENGINE.cancel(room, client, msg);
      send(client.ws, {
        type: "effectTxCancelled", protocol: EFFECT_PROTOCOL,
        actionNonce: String(msg.actionNonce || ""), txId: tx?.id || String(msg.txId || ""),
        effectAuthority: V7912_ENGINE.publicRuntime(room), authority: AUTHORITY
      });
    } catch (e) { effectReject(client, room, msg, e.message || e); }
  },

  effectChoiceRespond(client, msg) {
    const room = getRoomOf(client);
    if (!room) { sendError(client.ws, "roomに参加していません"); return; }
    try {
      if (msg.protocol !== EFFECT_PROTOCOL) throw new Error("protocolMismatch");
      if (Number(msg.baseRev) !== Number(room.rev)) throw new Error("staleRev");
      if (!rememberNonce(room, msg.actionNonce)) throw new Error("duplicateNonce");
      const before = V7912_ENGINE.cloneRoomMutable(room);
      try {
        const seq = V7912_ENGINE.respondChoice(room, client, msg);
        room.rev += 1;
        room.updatedAt = now();
        V70V74_ENGINE.recordSnapshot(room, { label: "順次選択", category: "ability", force: true });
        refreshRoomHash(room);
        pushRoomLog(room, { kind: "effectChoice", role: client.role, choiceId: seq.id, rev: room.rev });
        sendEffectSync(room, "effectChoiceSync", { choice: V7912_ENGINE.publicChoice(seq) });
      } catch (e) {
        V7912_ENGINE.restoreRoomMutable(room, before);
        throw e;
      }
    } catch (e) { effectReject(client, room, msg, e.message || e); }
  },

  requestState(client, msg) {
    const room = getRoomOf(client);
    if (!room) { sendError(client.ws, "roomに参加していません"); return; }
    send(client.ws, { type: "stateSync", state: room.state, rev: room.rev, from: "server", serverHash: room.stateHash || refreshRoomHash(room), serverSha256: room.stateSha256 || sha256Json(room.state), authority: AUTHORITY, ruleAuthority: V50V54_ENGINE.authoritySummary(room), stage3Authority: V55V59_ENGINE.authoritySummary(room), stage4Authority: V60V64_ENGINE.authoritySummary(room), stage5Authority: V65V69_ENGINE.authoritySummary(room), stage6Authority: V70V74_ENGINE.authoritySummary(room), stage7Authority: V75V79_ENGINE.authoritySummary(room), effectAuthority: V7912_ENGINE.publicRuntime(room), effectPrivate: effectPrivateFor(room, client.role) });
  },

  chat(client, msg) {
    const room = getRoomOf(client);
    if (!room) { sendError(client.ws, "roomに参加していません"); return; }
    const text = String(msg.text || "").slice(0, MAX_CHAT_LEN);
    if (!text) return;
    const entry = { type: "chat", from: client.clientId, name: client.name, role: client.role, text, createdAt: now() };
    pushRoomLog(room, { kind: "chat", clientId: client.clientId, text });
    broadcast(room, entry, client.clientId);
    send(client.ws, entry);
  }
};

for (const type of V50V54_MODULE.MESSAGE_TYPES) {
  handlers[type] = function stage2Handler(client, msg) {
    const room = getRoomOf(client);
    if (!room) { sendError(client.ws, "roomに参加していません"); return; }
    if (type !== "requestRuleAuthority" && hasPendingEffectWork(room)) {
      const rejectType = type.startsWith("library") ? "libraryTxRejected" : type.startsWith("cast") ? "castTxRejected" : type.startsWith("ability") ? "abilityTxRejected" : type.startsWith("stack") ? "stackTxRejected" : "ruleActionRejected";
      send(client.ws, { type: rejectType, protocol: msg.protocol || "", actionNonce: String(msg.actionNonce || ""), txId: String(msg.txId || ""), reason: "effectTransactionActive", rev: room.rev, authority: AUTHORITY, authoritySummary: V50V54_ENGINE.authoritySummary(room) });
      return;
    }
    if (type !== "requestRuleAuthority" && hasPendingStage3Work(room)) {
      const rejectType = type.startsWith("library") ? "libraryTxRejected" : type.startsWith("cast") ? "castTxRejected" : type.startsWith("ability") ? "abilityTxRejected" : type.startsWith("stack") ? "stackTxRejected" : "ruleActionRejected";
      send(client.ws, { type: rejectType, protocol: msg.protocol || "", actionNonce: String(msg.actionNonce || ""), txId: String(msg.txId || ""), reason: V55V59_ENGINE.activeKind(room), rev: room.rev, authority: AUTHORITY, authoritySummary: V50V54_ENGINE.authoritySummary(room) });
      return;
    }
    if (type !== "requestRuleAuthority" && hasPendingStage4Work(room)) {
      const rejectType = type.startsWith("library") ? "libraryTxRejected" : type.startsWith("cast") ? "castTxRejected" : type.startsWith("ability") ? "abilityTxRejected" : type.startsWith("stack") ? "stackTxRejected" : "ruleActionRejected";
      send(client.ws, { type: rejectType, protocol: msg.protocol || "", actionNonce: String(msg.actionNonce || ""), txId: String(msg.txId || ""), reason: V60V64_ENGINE.activeKind(room), rev: room.rev, authority: AUTHORITY, authoritySummary: V50V54_ENGINE.authoritySummary(room) });
      return;
    }
    if (type !== "requestRuleAuthority" && hasPendingStage5Work(room)) {
      const rejectType = type.startsWith("library") ? "libraryTxRejected" : type.startsWith("cast") ? "castTxRejected" : type.startsWith("ability") ? "abilityTxRejected" : type.startsWith("stack") ? "stackTxRejected" : "ruleActionRejected";
      send(client.ws, { type: rejectType, protocol: msg.protocol || "", actionNonce: String(msg.actionNonce || ""), txId: String(msg.txId || ""), reason: V65V69_ENGINE.activeKind(room), rev: room.rev, authority: AUTHORITY, authoritySummary: V50V54_ENGINE.authoritySummary(room) });
      return;
    }
    if (type !== "requestRuleAuthority" && hasPendingStage6Work(room)) {
      const rejectType = type.startsWith("library") ? "libraryTxRejected" : type.startsWith("cast") ? "castTxRejected" : type.startsWith("ability") ? "abilityTxRejected" : type.startsWith("stack") ? "stackTxRejected" : "ruleActionRejected";
      send(client.ws, { type: rejectType, protocol: msg.protocol || "", actionNonce: String(msg.actionNonce || ""), txId: String(msg.txId || ""), reason: V70V74_ENGINE.activeKind(room), rev: room.rev, authority: AUTHORITY, authoritySummary: V50V54_ENGINE.authoritySummary(room) });
      return;
    }
    V50V54_ENGINE.handle(client, room, msg);
  };
}

for (const type of V55V59_MODULE.MESSAGE_TYPES) {
  handlers[type] = function stage3Handler(client, msg) {
    const room = getRoomOf(client);
    if (!room) { sendError(client.ws, "roomに参加していません"); return; }
    if (hasPendingEffectWork(room)) {
      const rejectType = type.startsWith("trigger") ? "triggerBatchRejected" : type.startsWith("replacement") ? "replacementTxRejected" : type.startsWith("combat") ? "combatTxRejected" : type === "turnAction" ? "turnActionRejected" : type === "stateAction" ? "stateActionRejected" : "layerActionRejected";
      send(client.ws, { type: rejectType, protocol: msg.protocol || "", actionNonce: String(msg.actionNonce || ""), txId: String(msg.txId || ""), reason: "effectTransactionActive", rev: room.rev, authority: AUTHORITY, authoritySummary: V55V59_ENGINE.authoritySummary(room) });
      return;
    }
    if (hasPendingStage2Work(room)) {
      const rejectType = type.startsWith("trigger") ? "triggerBatchRejected" : type.startsWith("replacement") ? "replacementTxRejected" : type.startsWith("combat") ? "combatTxRejected" : type === "turnAction" ? "turnActionRejected" : type === "stateAction" ? "stateActionRejected" : "layerActionRejected";
      send(client.ws, { type: rejectType, protocol: msg.protocol || "", actionNonce: String(msg.actionNonce || ""), txId: String(msg.txId || ""), reason: V50V54_ENGINE.activeKind(room), rev: room.rev, authority: AUTHORITY, authoritySummary: V55V59_ENGINE.authoritySummary(room) });
      return;
    }
    if (hasPendingStage4Work(room)) {
      const rejectType = type.startsWith("trigger") ? "triggerBatchRejected" : type.startsWith("replacement") ? "replacementTxRejected" : type.startsWith("combat") ? "combatTxRejected" : type === "turnAction" ? "turnActionRejected" : type === "stateAction" ? "stateActionRejected" : "layerActionRejected";
      send(client.ws, { type: rejectType, protocol: msg.protocol || "", actionNonce: String(msg.actionNonce || ""), txId: String(msg.txId || ""), reason: V60V64_ENGINE.activeKind(room), rev: room.rev, authority: AUTHORITY, authoritySummary: V55V59_ENGINE.authoritySummary(room) });
      return;
    }
    if (hasPendingStage5Work(room)) {
      const rejectType = type.startsWith("trigger") ? "triggerBatchRejected" : type.startsWith("replacement") ? "replacementTxRejected" : type.startsWith("combat") ? "combatTxRejected" : type === "turnAction" ? "turnActionRejected" : type === "stateAction" ? "stateActionRejected" : "layerActionRejected";
      send(client.ws, { type: rejectType, protocol: msg.protocol || "", actionNonce: String(msg.actionNonce || ""), txId: String(msg.txId || ""), reason: V65V69_ENGINE.activeKind(room), rev: room.rev, authority: AUTHORITY, authoritySummary: V55V59_ENGINE.authoritySummary(room) });
      return;
    }
    if (hasPendingStage6Work(room)) {
      const rejectType = type.startsWith("trigger") ? "triggerBatchRejected" : type.startsWith("replacement") ? "replacementTxRejected" : type.startsWith("combat") ? "combatTxRejected" : type === "turnAction" ? "turnActionRejected" : type === "stateAction" ? "stateActionRejected" : "layerActionRejected";
      send(client.ws, { type: rejectType, protocol: msg.protocol || "", actionNonce: String(msg.actionNonce || ""), txId: String(msg.txId || ""), reason: V70V74_ENGINE.activeKind(room), rev: room.rev, authority: AUTHORITY, authoritySummary: V55V59_ENGINE.authoritySummary(room) });
      return;
    }
    V55V59_ENGINE.handle(client, room, msg);
  };
}

for (const type of V60V64_MODULE.MESSAGE_TYPES) {
  handlers[type] = function stage4Handler(client, msg) {
    const room = getRoomOf(client);
    if (!room) { sendError(client.ws, "roomに参加していません"); return; }
    const rejectType = type === "objectAction" ? "objectActionRejected" : type === "attachmentAction" ? "attachmentActionRejected" : type === "phaseAction" ? "phaseActionRejected" : type === "zoneEventAction" ? "zoneEventActionRejected" : type === "simultaneousZoneBatchAction" ? "simultaneousZoneBatchRejected" : "simultaneousZoneTxRejected";
    const activeReason = hasPendingEffectWork(room) ? "effectTransactionActive" : hasPendingStage2Work(room) ? V50V54_ENGINE.activeKind(room) : hasPendingStage3Work(room) ? V55V59_ENGINE.activeKind(room) : hasPendingStage5Work(room) ? V65V69_ENGINE.activeKind(room) : hasPendingStage6Work(room) ? V70V74_ENGINE.activeKind(room) : "";
    if (activeReason) {
      send(client.ws, { type: rejectType, protocol: msg.protocol || "", action: String(msg.action || ""), actionNonce: String(msg.actionNonce || ""), txId: String(msg.txId || ""), reason: activeReason, rev: room.rev, authority: AUTHORITY, authoritySummary: V60V64_ENGINE.authoritySummary(room) });
      return;
    }
    V60V64_ENGINE.handle(client, room, msg);
  };
}


for (const type of V65V69_MODULE.MESSAGE_TYPES) {
  handlers[type] = function stage5Handler(client, msg) {
    const room = getRoomOf(client);
    if (!room) { sendError(client.ws, "roomに参加していません"); return; }
    const rejectType = type.startsWith("simultaneousTrigger") ? "simultaneousTriggerChainRejected" : type.startsWith("loopShortcut") ? "loopShortcutRejected" : type.startsWith("choiceLoop") ? "choiceLoopRejected" : "branchLoopRejected";
    const activeReason = hasPendingEffectWork(room) ? "effectTransactionActive" : hasPendingStage2Work(room) ? V50V54_ENGINE.activeKind(room) : hasPendingStage3Work(room) ? V55V59_ENGINE.activeKind(room) : hasPendingStage4Work(room) ? V60V64_ENGINE.activeKind(room) : hasPendingStage6Work(room) ? V70V74_ENGINE.activeKind(room) : "";
    if (activeReason) {
      send(client.ws, { type: rejectType, protocol: msg.protocol || "", actionNonce: String(msg.actionNonce || ""), txId: String(msg.txId || ""), reason: activeReason, rev: room.rev, authority: AUTHORITY, authoritySummary: V65V69_ENGINE.authoritySummary(room) });
      return;
    }
    V65V69_ENGINE.handle(client, room, msg);
  };
}


for (const type of V70V74_MODULE.MESSAGE_TYPES) {
  handlers[type] = function stage6Handler(client, msg) {
    const room = getRoomOf(client);
    if (!room) { sendError(client.ws, "roomに参加していません"); return; }
    const readOnly = ["undoHistoryRequest","undoDiffRequest","replayTimelineRequest","replayFrameRequest","replayAuditExport","replayPlaylistRequest","replayReportExport","replayChapterRequest","replayShareSummaryExport"].includes(type);
    const activeReason = hasPendingEffectWork(room) ? "effectTransactionActive" : hasPendingStage2Work(room) ? V50V54_ENGINE.activeKind(room) : hasPendingStage3Work(room) ? V55V59_ENGINE.activeKind(room) : hasPendingStage4Work(room) ? V60V64_ENGINE.activeKind(room) : hasPendingStage5Work(room) ? V65V69_ENGINE.activeKind(room) : "";
    if (!readOnly && activeReason) {
      const rejectType = type.startsWith("repair") ? "repairAgreementRejected" : "undoAgreementRejected";
      send(client.ws, { type: rejectType, protocol: msg.protocol || "", actionNonce: String(msg.actionNonce || ""), txId: String(msg.txId || ""), reason: activeReason, rev: room.rev, authority: AUTHORITY, authoritySummary: V70V74_ENGINE.authoritySummary(room) });
      return;
    }
    V70V74_ENGINE.handle(client, room, msg);
  };
}

for (const type of V75V79_MODULE.MESSAGE_TYPES) {
  handlers[type] = function stage7Handler(client, msg) {
    const room = getRoomOf(client);
    if (!room) { sendError(client.ws, "roomに参加していません"); return; }
    V75V79_ENGINE.handle(client, room, msg);
  };
}

wss.on("connection", (ws) => {
  const clientId = uid("c");
  const client = { id: clientId, clientId, reconnectToken: newReconnectToken(), ws, roomCode: null, role: "spectator", name: "guest", joinedAt: now(), lastSeen: now() };
  clientsById.set(client.clientId, client);
  ws.isAlive = true;
  ws.on("pong", () => { ws.isAlive = true; client.lastSeen = now(); });
  log(`connect ${client.clientId} (total ${clientsById.size})`);
  send(ws, { type: "hello", clientId: client.clientId, reconnectToken: client.reconnectToken, server: "card-practice-table-server", serverVersion: SERVER_VERSION, appRelease: APP_RELEASE, authority: AUTHORITY, note: "v4.9厳密同期、v5.0～v7.9サーバー権限、v7.10系の統合自動化・信頼性修正・スマホ専用ワークスペース・ロンドンマリガン統一に対応。v7.17.0のCounterfactual CPUはローカル1人テスト専用で、オンライン接続中は安全停止します。公開情報と公平な手札レンジから隠し情報を複数仮定し、応答・次手・危険側の結果を比較して実際の行動を選びます。主変化と信頼度、文脈別経験学習、攻撃・ブロック組合せ探索、デッキ専用戦略、初手、BO3サイドを統合しています。対戦開始時はマリガン判断を段階表示し、手番・優先権・CPU思考中・オンラインの操作待ちを常時表示します。新規の本文推論イベントはオンラインでは既存サーバー権限経路を優先します。TLS・アカウント認証は別途必要です" });

  ws.on("message", (data) => {
    try {
      if (data && data.length > MAX_MESSAGE_BYTES) { sendError(ws, "message too large"); return; }
      let msg;
      try { msg = JSON.parse(data.toString()); } catch (_) { sendError(ws, "invalid JSON"); return; }
      if (!msg || typeof msg !== "object" || typeof msg.type !== "string") { sendError(ws, "invalid message"); return; }
      client.lastSeen = now();
      const h = handlers[msg.type];
      if (!h) { sendError(ws, "unknown type: " + msg.type); return; }
      h(client, msg);
    } catch (e) {
      // ハンドラ内の想定外エラーでも接続/サーバーは落とさない
      log(`handler error: ${e && e.message}`);
      try { sendError(ws, "server error"); } catch (_) {}
    }
  });

  ws.on("close", () => {
    leaveCurrentRoom(client, false, true);
    clientsById.delete(client.clientId);
    log(`disconnect ${client.clientId} (total ${clientsById.size})`);
  });
  ws.on("error", (e) => { log(`ws error ${client.clientId}: ${e && e.message}`); });
});

/* heartbeat: 応答のない接続を切断 */
const hb = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) { try { ws.terminate(); } catch (_) {} continue; }
    ws.isAlive = false;
    try { ws.ping(); } catch (_) {}
  }
}, HEARTBEAT_MS);
wss.on("close", () => clearInterval(hb));

process.on("uncaughtException", (e) => { log(`uncaughtException: ${e && e.message}`); });
process.on("unhandledRejection", (e) => { log(`unhandledRejection: ${e && (e.message || e)}`); });

initSharedStore().catch((e) => log("shared store init error: " + (e && e.message)));
initImageStore();
httpServer.listen(PORT, HOST, () => {
  const shown = (HOST === "0.0.0.0" || HOST === "::") ? "localhost" : HOST;
  log(`listening on http://${shown}:${PORT}/ (bind ${HOST} / WebSocket 同ポート)`);
  log(`server version ${SERVER_VERSION} / app ${APP_RELEASE} / rule ${V50V54_MODULE.PROTOCOLS.RULE} / library ${V50V54_MODULE.PROTOCOLS.LIBRARY} / effect ${V50V54_MODULE.PROTOCOLS.EFFECT} / review ${V75V79_MODULE.PROTOCOLS.RULE} / advanced ${EFFECT_PROTOCOL}`);
  log(`serving ${path.join(ROOT, "card-practice-table.html")}`);
});
