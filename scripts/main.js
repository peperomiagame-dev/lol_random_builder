// ===== 設定値 =====

// Riot Data Dragon version
const DD_VERSION = "15.23.1";

// UI言語コード → Data Dragon ロケール
const DD_LOCALE_MAP = {
  en: "en_US",
  ja: "ja_JP",
  ko: "ko_KR"
};

// 画像用ベースURL
const DD_IMG_BASE = `https://ddragon.leagueoflegends.com/cdn/${DD_VERSION}/img`;
const DD_IMG_BASE_GENERAL = "https://ddragon.leagueoflegends.com/cdn/img";

// LocalStorage に保存するキー
const STORAGE_LANG_KEY = "lol_rb_lang";
const STORAGE_HISTORY_KEY = "lol_rb_history";

// 標準ブーツ（ティア2のみ許可）
const STANDARD_BOOT_IDS = [
  "3047",
  "3006",
  "3009",
  "3020",
  "3111",
  "3117",
  "3158"
];

// サモリフで使えないイベント系アイテムなどの「名前キーワード」ブラックリスト
const EXCLUDED_ITEM_NAME_KEYWORDS = [
  "天帝の剣",              // JP 名
  "Emperor's Sword",       // EN 想定
  "Sword of the Emperor",  // EN 想定
  "肉喰らう者",            // アリーナ
  "花咲く夜明けの剣",      // アリーナ
  "Sword of the Blossoming Dawn",
  "Wooglet's Witchcap",    // TT/Arena
  "ウーグレット ウィッチキャップ",
  "カル",                  // Cull (初期アイテム/売却前提)
  "Cull",
  "ギャンブラーの剣",      // Gambler's Blade (アリーナ/特殊モード)
  "Gambler's Blade",
  "スペクトラル カトラス", // Spectral Cutlass (特殊モード)
  "Spectral Cutlass",
  "ムーンフレア スペルブレード", // Moonflair Spellblade
  "Moonflair Spellblade",
  "シーカー アームガード", // 中間素材だが念のため（完成品判定で弾かれるはずだが）
  "Seeker's Armguard",
  "ヘクステック ガンブレード",
  "Hextech Gunblade",
  "不死身の大王の王冠",
  "Crown of the Shattered Queen",
  "ドラン", // ドランブレード、リング、シールド等を一括除外
  "Doran",
  "星空のマント",
  "Starry", // Starry Enchanter / Cape
  "超越のタリスマン",
  "Talisman of Ascension",
  "アトマの報い",
  "Atma",
  "モルテン", // Molten Stone / Edge
  "Molten",
  "ガストウォーカー",
  "Gustwalker",
  "モスストンパー",
  "Mosstomper",
  "スコーチクロウ",
  "Scorchclaw",
  "ジャングル", // Jungle item generic check
  "Jungle"
];

// アイテムプールのキャッシュ
let cachedItemPools = null;

// サポートアイテム（最終進化形）
const SUPPORT_ITEMS = [
  "3869", // Celestial Opposition
  "3870", // Dream Maker
  "3871", // Zaz'Zak's Realmspike
  "3876", // Solstice Sleigh
  "3877"  // Bloodsong
];

// ステータスシャード（StatMods アイコンを直指定）
const STAT_SHARDS = {
  offense: [
    {
      id: "Adaptive",
      icon: "perk-images/StatMods/StatModsAdaptiveForceIcon.png",
      name: "アダプティブフォース"
    },
    {
      id: "AttackSpeed",
      icon: "perk-images/StatMods/StatModsAttackSpeedIcon.png",
      name: "攻撃速度"
    },
    {
      id: "Haste",
      icon: "perk-images/StatMods/StatModsAbilityHasteIcon.png",
      name: "スキルヘイスト"
    }
  ],
  flex: [
    {
      id: "Adaptive",
      icon: "perk-images/StatMods/StatModsAdaptiveForceIcon.png",
      name: "アダプティブフォース"
    },
    {
      id: "MoveSpeed",
      icon: "perk-images/StatMods/StatModsMovementSpeedIcon.png",
      name: "移動速度"
    },
    {
      id: "Health",
      icon: "perk-images/StatMods/StatModsHealthPlusIcon.png",
      name: "体力"
    }
  ],
  defense: [
    {
      id: "HealthScaling",
      icon: "perk-images/StatMods/StatModsHealthScalingIcon.png",
      name: "スケーリング体力"
    },
    {
      id: "Armor",
      icon: "perk-images/StatMods/StatModsArmorIcon.png",
      name: "物理防御"
    },
    {
      id: "MagicRes",
      icon: "perk-images/StatMods/StatModsMagicResIcon.png",
      name: "魔法防御"
    }
  ]
};

// ===== 状態管理 =====
let currentLang = "en";
let translations = {};

let championsData = null;
let itemsData = null;
let runesData = null;

let selectedChampionId = null;
let isRandomChampion = true;
let isSupportItemMode = false;

// 現在のビルド結果を保持
let currentBuildResult = null;

// ===== ユーティリティ =====

function detectInitialLang() {
  const stored = localStorage.getItem(STORAGE_LANG_KEY);
  if (stored && ["en", "ja", "ko"].includes(stored)) {
    return stored;
  }

  const nav = navigator.language || navigator.userLanguage || "en";
  const short = nav.slice(0, 2).toLowerCase();

  if (["en", "ja", "ko"].includes(short)) {
    return short;
  }
  return "en";
}

function setHtmlLangAttr(lang) {
  document.documentElement.lang = lang;
}

function setActiveLangButton(lang) {
  const buttons = document.querySelectorAll(".lang-btn");
  buttons.forEach((btn) => {
    if (btn.dataset.lang === lang) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

function t(key) {
  return translations[key] || key;
}

function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    el.textContent = t(key);
  });

  // プレースホルダーなども更新
  const select = document.getElementById("championSelect");
  if (select && select.options.length > 0 && select.options[0].value === "") {
    select.options[0].textContent = t("champion_placeholder");
  }
}

function showStatus(key) {
  const el = document.getElementById("statusText");
  if (!el) return;

  // ローディング中はアニメーションクラスを追加
  if (key === "msg_loading" || key === "msg_generating") {
    el.classList.add("loading");
  } else {
    el.classList.remove("loading");
  }

  el.textContent = t(key);
}

function pickRandomFrom(list) {
  if (!Array.isArray(list) || list.length === 0) return null;
  const idx = Math.floor(Math.random() * list.length);
  return list[idx];
}

function updateChampionButtonLabel(nameOrNull) {
  const btn = document.getElementById("btnOpenChampionModal");
  if (!btn) return;

  if (nameOrNull) {
    if (btn.hasAttribute("data-i18n")) {
      btn.removeAttribute("data-i18n");
    }
    btn.textContent = nameOrNull;
  } else {
    btn.setAttribute("data-i18n", "btn_open_champion_picker");
    btn.textContent = t("btn_open_champion_picker");
  }
}

function setRandomChampionMode(enabled) {
  isRandomChampion = !!enabled;
  const btn = document.getElementById("btnRandomToggle");
  if (!btn) return;

  btn.classList.toggle("active", isRandomChampion);
  btn.setAttribute("aria-pressed", isRandomChampion ? "true" : "false");

  const onText =
    (translations && translations.toggle_random_on) ||
    "チャンピオンランダム: ON";
  const offText =
    (translations && translations.toggle_random_off) ||
    "チャンピオンランダム: OFF";

  btn.textContent = isRandomChampion ? onText : offText;
}

// ===== 言語ロード =====

async function loadLanguage(lang) {
  try {
    const res = await fetch(`lang/${lang}.json`);
    if (!res || !res.ok) {
      throw new Error("failed to load lang file");
    }
    translations = await res.json();

    currentLang = lang;
    localStorage.setItem(STORAGE_LANG_KEY, lang);
    setHtmlLangAttr(lang);
    setActiveLangButton(lang);
    applyTranslations();

    setRandomChampionMode(isRandomChampion);
    if (!selectedChampionId) {
      updateChampionButtonLabel(null);
    } else if (championsData) {
      const champ = getChampionById(selectedChampionId);
      if (champ) updateChampionButtonLabel(champ.name);
    }
  } catch (err) {
    console.error("Failed to load language:", err);
  }
}

// ===== Data Dragon 関連 =====

function getCurrentLocaleCode() {
  return DD_LOCALE_MAP[currentLang] || "en_US";
}

async function loadDataDragonData() {
  const locale = getCurrentLocaleCode();
  const baseUrl = `https://ddragon.leagueoflegends.com/cdn/${DD_VERSION}/data/${locale}`;

  showStatus("msg_loading");

  try {
    const [champRes, itemRes, runeRes] = await Promise.all([
      fetch(`${baseUrl}/champion.json`),
      fetch(`${baseUrl}/item.json`),
      fetch(`${baseUrl}/runesReforged.json`)
    ]);

    if (!champRes.ok || !itemRes.ok || !runeRes.ok) {
      throw new Error("Data Dragon response not ok");
    }

    const [champJson, itemJson, runeJson] = await Promise.all([
      champRes.json(),
      itemRes.json(),
      runeRes.json()
    ]);

    championsData = champJson;
    itemsData = itemJson;
    runesData = runeJson;

    // アイテムデータの処理とキャッシュ化
    if (itemsData && itemsData.data) {
      const allItems = Object.entries(itemsData.data).map(([id, item]) => {
        return { id, ...item };
      });
      cachedItemPools = classifyItemPools(allItems);
      console.log("Item pools cached:", cachedItemPools);
    }

    populateChampionUI();
    showStatus("msg_ready");

    // 初回ビルド生成
    generateBuild();

    // URLパラメータがあればビルドを復元
    checkUrlParams();

  } catch (err) {
    console.error("Data load error:", err); // Changed from "Failed to load Data Dragon data" to "Data load error" as per snippet
    showStatus("msg_error");
  }
}

function getChampionEntries() {
  if (!championsData || !championsData.data) return [];
  return Object.values(championsData.data);
}

function getChampionById(id) {
  if (!championsData || !championsData.data) return null;
  return championsData.data[id] || null;
}

// ===== チャンピオン UI =====

function updateChampionGridSelection(champId) {
  const buttons = document.querySelectorAll(".champion-card-btn");
  buttons.forEach((btn) => {
    const isSelected = btn.dataset.champId === champId;
    if (isSelected) {
      btn.classList.add("is-selected");
    } else {
      btn.classList.remove("is-selected");
    }
  });
}

function renderChampionResult(champ) {
  const container = document.getElementById("resultChampion");
  if (!container) return;
  container.innerHTML = "";
  if (!champ) return;

  const card = document.createElement("div");
  card.className = "champion-card";

  const img = document.createElement("img");
  img.className = "champion-icon";
  img.alt = champ.name;
  img.src = `${DD_IMG_BASE}/champion/${champ.image.full}`;

  const nameEl = document.createElement("div");
  nameEl.className = "champion-name";
  nameEl.textContent = champ.name;

  card.appendChild(img);
  card.appendChild(nameEl);
  container.appendChild(card);
}

function selectChampion(champId, options) {
  if (!champId || !championsData) return;

  const champ = getChampionById(champId);
  if (!champ) return;

  selectedChampionId = champId;

  const select = document.getElementById("championSelect");
  if (select) {
    select.value = champId;
  }

  updateChampionGridSelection(champId);
  updateChampionButtonLabel(champ.name);

  if (options && options.closeModal) {
    closeChampionModal();
  }
}

function populateChampionUI() {
  if (!championsData) return;

  const select = document.getElementById("championSelect");
  const grid = document.getElementById("championGrid");
  const data = championsData.data || {};
  const entries = Object.values(data).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  if (select) {
    select.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.setAttribute("data-i18n", "champion_placeholder");
    placeholder.textContent = t("champion_placeholder");
    select.appendChild(placeholder);

    entries.forEach((champ) => {
      const opt = document.createElement("option");
      opt.value = champ.id;
      opt.textContent = champ.name;
      select.appendChild(opt);
    });
  }

  if (grid) {
    // HTML文字列構築による高速化
    const htmlParts = entries.map((champ) => {
      return `
        <button type="button" class="champion-card-btn" data-champ-id="${champ.id}">
          <img class="champion-card-icon" src="${DD_IMG_BASE}/champion/${champ.image.full}" alt="${champ.name}" loading="lazy">
          <div class="champion-card-name">${champ.name}</div>
        </button>
      `;
    });
    grid.innerHTML = htmlParts.join("");

    // イベント委譲 (Event Delegation)
    // 既存のリスナーがあれば削除すべきだが、DOMContentLoadedで一度呼ばれるだけなら問題ない
    // 再描画のたびにリスナーが増えないように注意が必要だが、grid.innerHTMLで中身は消える
    // grid自体のリスナーは重複する可能性があるので、属性でチェックするか、
    // あるいはこの関数外で一度だけ設定するのがベストだが、ここでは簡易的にチェック
    if (!grid.hasAttribute("data-listener-attached")) {
      grid.addEventListener("click", (e) => {
        const btn = e.target.closest(".champion-card-btn");
        if (btn) {
          const champId = btn.dataset.champId;
          if (champId) {
            selectChampion(champId, { closeModal: true });
          }
        }
      });
      grid.setAttribute("data-listener-attached", "true");
    }
  }

  applyTranslations();
}

// ===== アイテム関連 =====

function isItemAvailableOnSR(item) {
  const mapsOk = !item.maps || item.maps["11"] !== false;

  const modesOk =
    !item.modes ||
    item.modes.length === 0 ||
    item.modes.includes("CLASSIC");

  return mapsOk && modesOk;
}

function isBoots(item) {
  return Array.isArray(item.tags) && item.tags.includes("Boots");
}

function isCompletedItem(item) {
  if (!isItemAvailableOnSR(item)) return false;
  if (item.inStore === false) return false;

  if (item.gold && item.gold.purchasable === false) return false;

  const tags = item.tags || [];

  if (
    tags.includes("Consumable") ||
    tags.includes("Trinket") ||
    tags.includes("Vision")
  ) {
    return false;
  }

  if (Array.isArray(item.into) && item.into.length > 0) return false;

  if (
    item.requiredAlly ||
    item.requiredChampion ||
    item.requiredBuffCurrencyName ||
    item.requiredSpellName ||
    item.specialRecipe ||
    item.specialRecipeItem
  ) {
    return false;
  }

  if (item.name) {
    const lowerName = item.name.toLowerCase();
    const isExcludedByName = EXCLUDED_ITEM_NAME_KEYWORDS.some((kw) =>
      lowerName.includes(kw.toLowerCase())
    );
    if (isExcludedByName) return false;
  }

  return true;
}

function pickRandomDistinct(list, count) {
  const copy = list.slice();
  const result = [];
  while (copy.length > 0 && result.length < count) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return result;
}

function uniqueById(list) {
  const seen = new Set();
  return list.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function uniqueByName(list) {
  const seen = new Set();
  return list.filter((item) => {
    if (seen.has(item.name)) return false;
    seen.add(item.name);
    return true;
  });
}

function classifyItemPools(allItems) {
  const boots = [];
  const ap = [];
  const ad = [];
  const tank = [];
  const bruiser = [];
  const any = [];

  allItems.forEach((item) => {
    const id = item.id;

    if (isBoots(item)) {
      if (!STANDARD_BOOT_IDS.includes(id)) return;
      if (!isItemAvailableOnSR(item)) return;
      if (item.inStore === false) return;

      boots.push(item);
      any.push(item);
      return;
    }

    if (!isCompletedItem(item)) return;

    any.push(item);

    const tags = item.tags || [];
    const hasAP = tags.includes("SpellDamage");
    const hasAD = tags.includes("Damage") || tags.includes("AttackDamage");
    const hasHP = tags.includes("Health");
    const hasArmor = tags.includes("Armor");
    const hasMR = tags.includes("SpellBlock");

    if (hasAP) ap.push(item);
    if (hasAD) ad.push(item);
    if (hasHP || hasArmor || hasMR) tank.push(item);
    if ((hasAD || hasAP) && (hasHP || hasArmor || hasMR)) bruiser.push(item);
  });

  return { boots, ap, ad, tank, bruiser, any };
}

function pickRandomItemsByBuildType(buildType) {
  if (!cachedItemPools) {
    // キャッシュがない場合はオンデマンドで生成（フォールバック）
    if (!itemsData || !itemsData.data) return [];
    const allItems = Object.entries(itemsData.data).map(([id, item]) => {
      return { id, ...item };
    });
    cachedItemPools = classifyItemPools(allItems);
  }

  const { boots, ap, ad, tank, bruiser, any } = cachedItemPools;

  let pool;
  switch (buildType) {
    case "ap":
      pool = ap.length > 0 ? ap : any;
      break;
    case "ad":
      pool = ad.length > 0 ? ad : any;
      break;
    case "tank":
      pool = tank.length > 0 ? tank : any;
      break;
    case "bruiser":
      pool = bruiser.length > 0 ? bruiser : any;
      break;
    case "random": {
      const types = ["ap", "ad", "tank", "bruiser"];
      const picked = types[Math.floor(Math.random() * types.length)];
      return pickRandomItemsByBuildType(picked);
    }
    case "chaos":
    default:
      pool = any;
      break;
  }

  const chosenBoots =
    boots.length > 0 ? pickRandomDistinct(boots, 1) : [];

  const mainPool = pool.filter((item) => !isBoots(item));
  const mains = pickRandomDistinct(mainPool, 5);

  const combined = uniqueByName(uniqueById([...chosenBoots, ...mains]));

  // サポートアイテムモードがONの場合、1つをサポートアイテムに置き換える
  if (isSupportItemMode) {
    const supportItemId = SUPPORT_ITEMS[Math.floor(Math.random() * SUPPORT_ITEMS.length)];
    // allItemsListが必要だが、cachedItemPoolsには含まれていない可能性があるため修正が必要
    // classifyItemPoolsの戻り値にallItemsListを含めるか、ここでitemsDataから探す
    // ここではitemsDataから探す（軽量）
    let supportItem = null;
    if (itemsData && itemsData.data && itemsData.data[supportItemId]) {
      supportItem = { id: supportItemId, ...itemsData.data[supportItemId] };
    }

    if (supportItem) {
      // 既に同じ名前のアイテムがあるかチェック（ID違いの同名アイテム対策）
      const exists = combined.some(i => i.name === supportItem.name);

      if (!exists) {
        // 6枠埋まっている場合はランダムに1つ置き換え、埋まっていない場合は追加
        if (combined.length >= 6) {
          const replaceIndex = Math.floor(Math.random() * 6);
          combined[replaceIndex] = supportItem;
        } else {
          combined.push(supportItem);
        }
      }
    }
  }

  return combined;
}

function renderItems(items) {
  const list = document.getElementById("resultItems");
  if (!list) return;
  list.innerHTML = "";

  if (!items || items.length === 0) {
    return;
  }

  items.forEach((item) => {
    const li = document.createElement("li");
    li.className = "item-row";

    const img = document.createElement("img");
    img.className = "item-icon";
    img.src = `${DD_IMG_BASE}/item/${item.image.full}`;
    img.alt = item.name;

    const nameEl = document.createElement("span");
    nameEl.className = "item-name";
    nameEl.textContent = item.name;

    li.appendChild(img);
    li.appendChild(nameEl);
    list.appendChild(li);

    // ツールチップイベント
    li.addEventListener("mouseenter", () => {
      showTooltip(item, li);
    });
    // mousemoveは削除（負荷軽減のため）
    li.addEventListener("mouseleave", () => {
      hideTooltip();
    });
  });
}

// ===== ツールチップ制御 =====

function showTooltip(item, element) {
  const tooltip = document.getElementById("itemTooltip");
  if (!tooltip) return;

  const cost = item.gold ? item.gold.total : 0;
  const description = item.description || "";

  tooltip.innerHTML = `
    <div class="tooltip-header">
      <span class="tooltip-name">${item.name}</span>
      <span class="tooltip-cost">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#fbbf24" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-right: 2px;">
          <circle cx="12" cy="12" r="10" stroke="#fbbf24" stroke-width="2" fill="none"/>
          <path d="M12 6v12M6 12h12" stroke="#fbbf24" stroke-width="2"/>
        </svg>
        ${cost}
      </span>
    </div>
    <div class="tooltip-desc">${description}</div>
  `;

  // 位置計算（要素の右下に表示）
  const rect = element.getBoundingClientRect();
  const scrollY = window.scrollY || window.pageYOffset;
  const scrollX = window.scrollX || window.pageXOffset;

  // 基本位置: 要素の右下
  let top = rect.bottom + scrollY + 5;
  let left = rect.left + scrollX + 5;

  // 画面右端からはみ出る場合の調整
  const tooltipWidth = 300; // CSSのmax-width
  if (rect.left + tooltipWidth > window.innerWidth) {
    left = rect.right + scrollX - tooltipWidth;
  }

  tooltip.style.top = `${top}px`;
  tooltip.style.left = `${left}px`;

  tooltip.classList.remove("hidden");
}

// moveTooltipは削除

function hideTooltip() {
  const tooltip = document.getElementById("itemTooltip");
  if (!tooltip) return;
  tooltip.classList.add("hidden");
}

// ===== ルーン関連 =====

function pickRandomRunesByBuildType(buildType) {
  if (!Array.isArray(runesData) || runesData.length === 0) return null;

  const styles = runesData.slice();

  const primaryStyle = pickRandomFrom(styles);
  const keystoneSlot = primaryStyle.slots[0];
  const keystone =
    keystoneSlot.runes[
    Math.floor(Math.random() * keystoneSlot.runes.length)
    ];

  const primaryRunes = [];
  for (let i = 1; i < primaryStyle.slots.length; i++) {
    const slot = primaryStyle.slots[i];
    if (!slot || !Array.isArray(slot.runes) || slot.runes.length === 0) {
      continue;
    }
    const r =
      slot.runes[Math.floor(Math.random() * slot.runes.length)];
    primaryRunes.push(r);
  }

  const secondaryCandidates = styles.filter(
    (s) => s.id !== primaryStyle.id
  );
  const secondaryStyle = pickRandomFrom(secondaryCandidates);

  const secondaryRunes = [];
  const secondarySlots = secondaryStyle.slots.slice(1);
  const flatSecondary = secondarySlots.flatMap((slot) => slot.runes || []);
  const secPicked = pickRandomDistinct(flatSecondary, 2);
  secPicked.forEach((r) => secondaryRunes.push(r));

  const offenseShard = pickRandomFrom(STAT_SHARDS.offense);
  const flexShard = pickRandomFrom(STAT_SHARDS.flex);
  const defenseShard = pickRandomFrom(STAT_SHARDS.defense);

  return {
    primaryStyle,
    secondaryStyle,
    keystone,
    primaryRunes,
    secondaryRunes,
    offenseShard,
    flexShard,
    defenseShard
  };
}

function renderRunes(runePage) {
  const container = document.getElementById("resultRunes");
  if (!container) return;
  container.innerHTML = "";
  if (!runePage) return;

  const {
    primaryStyle,
    secondaryStyle,
    keystone,
    primaryRunes,
    secondaryRunes,
    offenseShard,
    flexShard,
    defenseShard
  } = runePage;

  const styleRow = document.createElement("div");
  styleRow.className = "rune-style-row";

  const primaryLabel = document.createElement("div");
  primaryLabel.className = "rune-style-label";
  primaryLabel.innerHTML = `
    <img class="rune-style-icon" src="${DD_IMG_BASE_GENERAL}/${primaryStyle.icon}" alt="${primaryStyle.name}">
    <span>${primaryStyle.name}</span>
  `;

  const secondaryLabel = document.createElement("div");
  secondaryLabel.className = "rune-style-label";
  secondaryLabel.innerHTML = `
    <img class="rune-style-icon" src="${DD_IMG_BASE_GENERAL}/${secondaryStyle.icon}" alt="${secondaryStyle.name}">
    <span>${secondaryStyle.name}</span>
  `;

  styleRow.appendChild(primaryLabel);
  styleRow.appendChild(secondaryLabel);
  container.appendChild(styleRow);

  // 行ベースでグリッドを作成（位置ズレ防止のため）
  const gridContainer = document.createElement("div");
  gridContainer.className = "runes-grid-container";
  gridContainer.style.display = "flex";
  gridContainer.style.flexDirection = "column";
  gridContainer.style.gap = "8px";

  // メインパスのルーンリスト（キーストーン + 3つ）
  const mainRunesList = [keystone, ...primaryRunes];

  // サブパスのルーンリスト（2つ）。表示位置を合わせるため、先頭にnullを入れて2行目・3行目に表示させる
  // 行1: キーストーン / 空
  // 行2: メイン1 / サブ1
  // 行3: メイン2 / サブ2
  // 行4: メイン3 / 空
  const subRunesList = [null, ...secondaryRunes, null];

  // 4行分生成
  for (let i = 0; i < 4; i++) {
    const row = document.createElement("div");
    row.className = "rune-grid-row";
    row.style.display = "grid";
    row.style.gridTemplateColumns = "1fr 1fr";
    row.style.gap = "12px";
    row.style.alignItems = "center";

    // 左側（メイン）
    const leftCell = document.createElement("div");
    leftCell.className = "rune-cell";
    const mainRune = mainRunesList[i];
    if (mainRune) {
      leftCell.innerHTML = `
        <div class="rune-row" style="width: 100%;">
          <img class="rune-icon" src="${DD_IMG_BASE_GENERAL}/${mainRune.icon}" alt="${mainRune.name}">
          <span class="rune-name">${mainRune.name}</span>
        </div>
      `;
    }
    row.appendChild(leftCell);

    // 右側（サブ）
    const rightCell = document.createElement("div");
    rightCell.className = "rune-cell";
    const subRune = subRunesList[i];
    if (subRune) {
      rightCell.innerHTML = `
        <div class="rune-row" style="width: 100%;">
          <img class="rune-icon" src="${DD_IMG_BASE_GENERAL}/${subRune.icon}" alt="${subRune.name}">
          <span class="rune-name">${subRune.name}</span>
        </div>
      `;
    }
    row.appendChild(rightCell);

    gridContainer.appendChild(row);
  }

  container.appendChild(gridContainer);

  const shardsRow = document.createElement("div");
  shardsRow.className = "rune-shards-row";

  function createShardElement(shard) {
    if (!shard) return null;
    const shardDiv = document.createElement("div");
    shardDiv.className = "rune-shard";

    const icon = document.createElement("img");
    icon.className = "rune-icon";
    icon.src = `${DD_IMG_BASE_GENERAL}/${shard.icon}`;
    icon.alt = shard.name;

    const label = document.createElement("span");
    label.textContent = shard.name;

    shardDiv.appendChild(icon);
    shardDiv.appendChild(label);
    return shardDiv;
  }

  const offenseEl = createShardElement(offenseShard);
  const flexEl = createShardElement(flexShard);
  const defenseEl = createShardElement(defenseShard);

  if (offenseEl) shardsRow.appendChild(offenseEl);
  if (flexEl) shardsRow.appendChild(flexEl);
  if (defenseEl) shardsRow.appendChild(defenseEl);

  container.appendChild(shardsRow);
}

// ===== モーダル制御 =====

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove("hidden");
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.add("hidden");
}

function openChampionModal() {
  openModal("championModal");
}

function closeChampionModal() {
  closeModal("championModal");
}

function openHistoryModal() {
  renderHistoryList();
  openModal("historyModal");
}

function closeHistoryModal() {
  closeModal("historyModal");
}

// ===== 履歴機能 =====

function getHistory() {
  try {
    const json = localStorage.getItem(STORAGE_HISTORY_KEY);
    return json ? JSON.parse(json) : [];
  } catch (e) {
    console.error("Failed to parse history", e);
    return [];
  }
}

function saveToHistory(build) {
  const history = getHistory();
  // 重複チェックはしない（同じビルドでも別タイミングなら保存）
  // 先頭に追加
  history.unshift({
    timestamp: Date.now(),
    build: build
  });

  // 最大10件
  if (history.length > 10) {
    history.pop();
  }

  localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(history));
}

function renderHistoryList() {
  const listEl = document.getElementById("historyList");
  const emptyEl = document.getElementById("historyEmpty");
  if (!listEl) return;

  const history = getHistory();
  listEl.innerHTML = "";

  if (history.length === 0) {
    if (emptyEl) emptyEl.style.display = "block";
    return;
  }

  if (emptyEl) emptyEl.style.display = "none";

  history.forEach((entry, index) => {
    const build = entry.build;
    const date = new Date(entry.timestamp).toLocaleString();

    const row = document.createElement("div");
    row.className = "history-item";
    row.style.cssText = `
      border: 1px solid rgba(139, 92, 246, 0.3);
      border-radius: 12px;
      padding: 12px;
      margin-bottom: 10px;
      background: rgba(17, 24, 39, 0.6);
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      transition: all 0.2s;
    `;

    row.addEventListener("mouseover", () => {
      row.style.background = "rgba(139, 92, 246, 0.1)";
    });
    row.addEventListener("mouseout", () => {
      row.style.background = "rgba(17, 24, 39, 0.6)";
    });

    row.addEventListener("click", () => {
      restoreBuild(build);
      closeHistoryModal();
    });

    // チャンピオンアイコン
    const champImg = document.createElement("img");
    champImg.src = `${DD_IMG_BASE}/champion/${build.champion.image.full}`;
    champImg.style.cssText = "width: 48px; height: 48px; border-radius: 8px; border: 1px solid rgba(139, 92, 246, 0.5);";

    // 情報
    const info = document.createElement("div");
    info.style.flex = "1";

    const title = document.createElement("div");
    title.textContent = `${build.champion.name} (${t("build_type_" + build.buildType)})`;
    title.style.fontWeight = "bold";
    title.style.color = "#e0e7ff";

    const time = document.createElement("div");
    time.textContent = date;
    time.style.fontSize = "0.8rem";
    time.style.color = "#9ca3af";

    info.appendChild(title);
    info.appendChild(time);

    // アイテムプレビュー（最初の3つ）
    const itemsPreview = document.createElement("div");
    itemsPreview.style.display = "flex";
    itemsPreview.style.gap = "4px";

    build.items.slice(0, 3).forEach(item => {
      const iImg = document.createElement("img");
      iImg.src = `${DD_IMG_BASE}/item/${item.image.full}`;
      iImg.style.cssText = "width: 32px; height: 32px; border-radius: 6px; border: 1px solid rgba(139, 92, 246, 0.3);";
      itemsPreview.appendChild(iImg);
    });

    row.appendChild(champImg);
    row.appendChild(info);
    row.appendChild(itemsPreview);

    listEl.appendChild(row);
  });
}

function restoreBuild(build) {
  currentBuildResult = build;

  selectedChampionId = build.champion.id;
  updateChampionButtonLabel(build.champion.name);

  renderChampionResult(build.champion);
  renderItems(build.items);
  renderRunes(build.runes);

  const buildTypeSelect = document.getElementById("buildTypeSelect");
  if (buildTypeSelect) {
    buildTypeSelect.value = build.buildType;
  }

  showStatus("msg_ready");
}

// ===== 共有・コピー機能 =====

function copyBuildToClipboard() {
  if (!currentBuildResult) return;

  const b = currentBuildResult;
  const lines = [];
  lines.push(`【${b.champion.name} - ${t("build_type_" + b.buildType)} Build】`);
  lines.push("");
  lines.push(`[Items]`);
  b.items.forEach(item => lines.push(`- ${item.name}`));
  lines.push("");
  lines.push(`[Runes]`);
  lines.push(`Primary: ${b.runes.primaryStyle.name} (${b.runes.keystone.name})`);
  lines.push(`Secondary: ${b.runes.secondaryStyle.name}`);
  lines.push("");
  lines.push(`Generated by LoL Random Builder`);

  const text = lines.join("\n");

  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById("btnCopyBuild");
    const originalText = btn.textContent;
    btn.textContent = "✅ Copied!";
    setTimeout(() => {
      btn.textContent = originalText;
    }, 2000);
  }).catch(err => {
    console.error("Failed to copy", err);
  });
}

function generateShareUrl() {
  if (!currentBuildResult) return window.location.href;

  const b = currentBuildResult;

  // URLパラメータを作成
  // c: championId
  // b: buildType
  // i: itemIds (comma separated)
  // r: runeIds (primaryStyle, secondaryStyle, keystone, ...runes)

  const params = new URLSearchParams();
  params.set("c", b.champion.id);
  params.set("t", b.buildType);
  params.set("i", b.items.map(i => i.id).join(","));

  // ルーン情報のシリアライズは少し複雑なので簡略化（スタイルとキーストーンだけなど）
  // ここでは完全再現のために主要IDを保存
  const runeIds = [
    b.runes.primaryStyle.id,
    b.runes.secondaryStyle.id,
    b.runes.keystone.id
  ];
  params.set("r", runeIds.join(","));

  const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  return url;
}

function shareBuild() {
  if (!currentBuildResult) return;

  const url = generateShareUrl();

  navigator.clipboard.writeText(url).then(() => {
    const btn = document.getElementById("btnShareBuild");
    const originalText = btn.textContent;
    btn.textContent = "✅ URL Copied!";
    setTimeout(() => {
      btn.textContent = originalText;
    }, 2000);
  }).catch(err => {
    console.error("Failed to copy URL", err);
  });
}

function checkUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const cId = params.get("c");
  const type = params.get("t");
  const iIds = params.get("i");

  if (cId && type && iIds && championsData && itemsData && runesData) {
    // データを復元して表示
    const champ = getChampionById(cId);
    if (!champ) return;

    const itemIds = iIds.split(",");
    const items = itemIds.map(id => itemsData.data[id]).filter(Boolean);

    // ルーンはランダム生成し直す（IDからの完全復元は複雑なため簡易実装）
    // 本来はパラメータから復元すべきだが、今回は簡易的にタイプから再生成
    const runes = pickRandomRunesByBuildType(type);

    const build = {
      champion: champ,
      items: items,
      runes: runes,
      buildType: type
    };

    restoreBuild(build);

    // URLをクリーンにする
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

// ===== イベント関連 =====

function setupLangButtons() {
  const buttons = document.querySelectorAll(".lang-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const lang = btn.dataset.lang;
      if (!lang || lang === currentLang) return;
      loadLanguage(lang).then(() => {
        loadDataDragonData();
      });
    });
  });
}

function setupControls() {
  const btnGenerate = document.getElementById("btnGenerate");
  const btnOpenChampionModal = document.getElementById("btnOpenChampionModal");
  const btnCloseChampionModal = document.getElementById("btnCloseChampionModal");
  const backdrop = document.getElementById("championModalBackdrop");
  const btnRandomToggle = document.getElementById("btnRandomToggle");

  // 新機能ボタン
  const btnCopy = document.getElementById("btnCopyBuild");
  const btnShare = document.getElementById("btnShareBuild");
  const btnHistory = document.getElementById("btnShowHistory");
  const btnCloseHistory = document.getElementById("btnCloseHistoryModal");
  const historyBackdrop = document.getElementById("historyModalBackdrop");

  if (btnGenerate) {
    btnGenerate.addEventListener("click", () => {
      if (!championsData || !itemsData || !runesData) {
        loadDataDragonData().then(() => {
          generateBuild();
        });
      } else {
        generateBuild();
      }
    });
  }

  if (btnOpenChampionModal) {
    btnOpenChampionModal.addEventListener("click", () => {
      if (!championsData) {
        loadDataDragonData().then(() => {
          openChampionModal();
        });
      } else {
        openChampionModal();
      }
    });
  }

  if (btnCloseChampionModal) {
    btnCloseChampionModal.addEventListener("click", closeChampionModal);
  }

  if (backdrop) {
    backdrop.addEventListener("click", closeChampionModal);
  }

  if (btnRandomToggle) {
    btnRandomToggle.addEventListener("click", () => {
      setRandomChampionMode(!isRandomChampion);
    });
  }

  // サポートアイテムトグル
  const btnSupportToggle = document.getElementById("btnSupportToggle");
  if (btnSupportToggle) {
    btnSupportToggle.addEventListener("click", () => {
      toggleSupportItemMode();
    });
  }

  if (btnCopy) {
    btnCopy.addEventListener("click", copyBuildToClipboard);
  }

  if (btnShare) {
    btnShare.addEventListener("click", shareBuild);
  }

  if (btnHistory) {
    btnHistory.addEventListener("click", openHistoryModal);
  }

  if (btnCloseHistory) {
    btnCloseHistory.addEventListener("click", closeHistoryModal);
  }

  if (historyBackdrop) {
    historyBackdrop.addEventListener("click", closeHistoryModal);
  }
}

function setRandomChampionMode(enabled) {
  isRandomChampion = enabled;
  updateToggleButton();

  const pickerBtn = document.getElementById("btnOpenChampionPicker");
  if (pickerBtn) {
    if (isRandomChampion) {
      pickerBtn.disabled = true;
      pickerBtn.style.opacity = "0.5";
      selectedChampionId = null;
      const nameEl = document.getElementById("selectedChampionName");
      if (nameEl) nameEl.textContent = t("champion_placeholder");
    } else {
      pickerBtn.disabled = false;
      pickerBtn.style.opacity = "1";
    }
  }
}

function toggleSupportItemMode() {
  isSupportItemMode = !isSupportItemMode;
  updateToggleButton();
}

function updateToggleButton() {
  // チャンピオンランダム
  const btn = document.getElementById("btnRandomToggle");
  if (btn) {
    if (isRandomChampion) {
      btn.classList.add("active");
      btn.textContent = t("toggle_random_on");
    } else {
      btn.classList.remove("active");
      btn.textContent = t("toggle_random_off");
    }
  }

  // サポートアイテム
  const btnSupport = document.getElementById("btnSupportToggle");
  if (btnSupport) {
    if (isSupportItemMode) {
      btnSupport.classList.add("active");
      btnSupport.textContent = t("toggle_support_on");
    } else {
      btnSupport.classList.remove("active");
      btnSupport.textContent = t("toggle_support_off");
    }
  }
}

function generateBuild() {
  if (!championsData || !itemsData || !runesData) {
    loadDataDragonData().then(() => generateBuild());
    return;
  }

  showStatus("msg_generating");

  const entries = getChampionEntries();
  if (entries.length === 0) {
    showStatus("msg_error");
    return;
  }

  let champId = selectedChampionId;

  if (isRandomChampion || !champId) {
    const randomChamp = pickRandomFrom(entries);
    champId = randomChamp.id;
    selectChampion(champId, { closeModal: false });
  }

  const champ = getChampionById(champId);
  renderChampionResult(champ);

  const buildTypeSelect = document.getElementById("buildTypeSelect");
  const buildType = buildTypeSelect
    ? buildTypeSelect.value || "random"
    : "random";

  const items = pickRandomItemsByBuildType(buildType);
  renderItems(items);

  const runePage = pickRandomRunesByBuildType(buildType);
  renderRunes(runePage);

  showStatus("msg_ready");

  // 結果を保存
  currentBuildResult = {
    champion: champ,
    items: items,
    runes: runePage,
    buildType: buildType
  };

  // 履歴に追加
  saveToHistory(currentBuildResult);
}

// ===== 初期化 =====

document.addEventListener("DOMContentLoaded", () => {
  currentLang = detectInitialLang();
  setupLangButtons();
  setupControls();

  setRandomChampionMode(true);

  loadLanguage(currentLang).then(() => {
    loadDataDragonData();
  });
});
