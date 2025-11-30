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

// ステータスシャード（アイコンは StatMods シリーズを直接指定）
const STAT_SHARDS = {
  offense: [
    {
      icon: "perk-images/StatMods/StatModsAdaptiveForceIcon.png",
      name: "アダプティブフォース"
    },
    {
      icon: "perk-images/StatMods/StatModsAttackSpeedIcon.png",
      name: "攻撃速度"
    },
    {
      icon: "perk-images/StatMods/StatModsAbilityHasteIcon.png",
      name: "スキルヘイスト"
    }
  ],
  flex: [
    {
      icon: "perk-images/StatMods/StatModsAdaptiveForceIcon.png",
      name: "アダプティブフォース"
    },
    {
      icon: "perk-images/StatMods/StatModsMovementSpeedIcon.png",
      name: "移動速度"
    },
    {
      icon: "perk-images/StatMods/StatModsHealthPlusIcon.png",
      name: "体力"
    }
  ],
  defense: [
    {
      icon: "perk-images/StatMods/StatModsHealthScalingIcon.png",
      name: "スケーリング体力"
    },
    {
      icon: "perk-images/StatMods/StatModsArmorIcon.png",
      name: "物理防御"
    },
    {
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
let isRandomChampion = false; // チャンピオンランダム トグル

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
}

function showStatus(key) {
  const el = document.getElementById("statusText");
  if (!el) return;
  el.textContent = t(key);
}

function pickRandomFrom(list) {
  if (!Array.isArray(list) || list.length === 0) return null;
  const idx = Math.floor(Math.random() * list.length);
  return list[idx];
}

// チャンピオンボタンの表示テキストを更新
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

// ランダムトグルの表示
function setRandomChampionMode(enabled) {
  isRandomChampion = !!enabled;
  const btn = document.getElementById("btnRandomToggle");
  if (!btn) return;

  btn.classList.toggle("active", isRandomChampion);
  btn.setAttribute("aria-pressed", isRandomChampion ? "true" : "false");

  // 翻訳が無くても日本語でそれっぽく出るようにしておく
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

    // ランダムトグルとボタンの文言を言語に合わせて更新
    setRandomChampionMode(isRandomChampion);
    if (!selectedChampionId) {
      updateChampionButtonLabel(null);
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

    populateChampionUI();
    showStatus("msg_ready");
  } catch (err) {
    console.error("Failed to load Data Dragon data:", err);
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

// 結果欄にチャンピオンを描画
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

// チャンピオン選択（結果はまだ更新しない）
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

  // セレクト（ロジック用）
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

  // 画像グリッド（モーダル内）
  if (grid) {
    grid.innerHTML = "";

    entries.forEach((champ) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "champion-card-btn";
      btn.dataset.champId = champ.id;

      const img = document.createElement("img");
      img.className = "champion-card-icon";
      img.src = `${DD_IMG_BASE}/champion/${champ.image.full}`;
      img.alt = champ.name;

      const nameEl = document.createElement("div");
      nameEl.className = "champion-card-name";
      nameEl.textContent = champ.name;

      btn.appendChild(img);
      btn.appendChild(nameEl);

      btn.addEventListener("click", () => {
        selectChampion(champ.id, { closeModal: true });
      });

      grid.appendChild(btn);
    });
  }

  applyTranslations();
}

// ===== アイテム関連 =====

function isItemAvailableOnSR(item) {
  if (!item.maps) return true;
  return item.maps["11"] !== false;
}

function isBoots(item) {
  return Array.isArray(item.tags) && item.tags.includes("Boots");
}

function isCompletedItem(item) {
  if (!isItemAvailableOnSR(item)) return false;
  if (item.inStore === false) return false;

  if (item.gold && item.gold.purchasable === false) return false;

  // 消費アイテム（エリクサー、ワードなど）は除外
  if (item.consumed === true) return false;
  const tags = item.tags || [];
  if (
    tags.includes("Consumable") ||
    tags.includes("Trinket") ||
    tags.includes("Vision")
  ) {
    return false;
  }

  // 上位に合成できるなら素材扱い
  if (Array.isArray(item.into) && item.into.length > 0) return false;

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

function classifyItemPools(allItems) {
  const boots = [];
  const ap = [];
  const ad = [];
  const tank = [];
  const bruiser = [];
  const any = [];

  allItems.forEach((item) => {
    const id = item.id;

    // ブーツ（ホワイトリストのみ）
    if (isBoots(item)) {
      if (!STANDARD_BOOT_IDS.includes(id)) return;
      if (!isItemAvailableOnSR(item)) return;
      if (item.inStore === false) return;

      boots.push(item);
      any.push(item);
      return;
    }

    // 完成品だけ採用
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
  if (!itemsData || !itemsData.data) return [];

  const allItems = Object.entries(itemsData.data).map(([id, item]) => {
    return { id, ...item };
  });

  const { boots, ap, ad, tank, bruiser, any } = classifyItemPools(allItems);

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

  // 念のため ID で重複排除
  const combined = uniqueById([...chosenBoots, ...mains]);
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
  });
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
    <span>Primary: ${primaryStyle.name}</span>
  `;

  const secondaryLabel = document.createElement("div");
  secondaryLabel.className = "rune-style-label";
  secondaryLabel.innerHTML = `
    <img class="rune-style-icon" src="${DD_IMG_BASE_GENERAL}/${secondaryStyle.icon}" alt="${secondaryStyle.name}">
    <span>Secondary: ${secondaryStyle.name}</span>
  `;

  styleRow.appendChild(primaryLabel);
  styleRow.appendChild(secondaryLabel);
  container.appendChild(styleRow);

  const wrapper = document.createElement("div");
  wrapper.className = "runes-two-col";

  const primaryCol = document.createElement("div");
  primaryCol.className = "rune-col";

  const keystoneRow = document.createElement("div");
  keystoneRow.className = "rune-row";
  keystoneRow.innerHTML = `
    <img class="rune-icon" src="${DD_IMG_BASE_GENERAL}/${keystone.icon}" alt="${keystone.name}">
    <span>${keystone.name}</span>
  `;
  primaryCol.appendChild(keystoneRow);

  primaryRunes.forEach((r) => {
    const row = document.createElement("div");
    row.className = "rune-row";
    row.innerHTML = `
      <img class="rune-icon" src="${DD_IMG_BASE_GENERAL}/${r.icon}" alt="${r.name}">
      <span>${r.name}</span>
    `;
    primaryCol.appendChild(row);
  });

  const secondaryCol = document.createElement("div");
  secondaryCol.className = "rune-col";

  secondaryRunes.forEach((r) => {
    const row = document.createElement("div");
    row.className = "rune-row";
    row.innerHTML = `
      <img class="rune-icon" src="${DD_IMG_BASE_GENERAL}/${r.icon}" alt="${r.name}">
      <span>${r.name}</span>
    `;
    secondaryCol.appendChild(row);
  });

  wrapper.appendChild(primaryCol);
  wrapper.appendChild(secondaryCol);
  container.appendChild(wrapper);

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
    label.textContent = shard.name; // 翻訳キーは使わず短い名前だけ

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

function openChampionModal() {
  const modal = document.getElementById("championModal");
  if (!modal) return;
  modal.classList.remove("hidden");
}

function closeChampionModal() {
  const modal = document.getElementById("championModal");
  if (!modal) return;
  modal.classList.add("hidden");
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
  const btnOpenChampionModal = document.getElementById(
    "btnOpenChampionModal"
  );
  const btnCloseChampionModal = document.getElementById(
    "btnCloseChampionModal"
  );
  const backdrop = document.getElementById("championModalBackdrop");
  const btnRandomToggle = document.getElementById("btnRandomToggle");

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
    btnCloseChampionModal.addEventListener("click", () => {
      closeChampionModal();
    });
  }

  if (backdrop) {
    backdrop.addEventListener("click", () => {
      closeChampionModal();
    });
  }

  if (btnRandomToggle) {
    btnRandomToggle.addEventListener("click", () => {
      setRandomChampionMode(!isRandomChampion);
    });
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

  // ランダムON、または選択なし → ランダム
  if (isRandomChampion || !champId) {
    const randomChamp = pickRandomFrom(entries);
    champId = randomChamp.id;
    selectChampion(champId, { closeModal: false }); // 状態とボタンだけ更新
  }

  const champ = getChampionById(champId);
  renderChampionResult(champ); // ここで初めて結果欄に載る

  const buildTypeSelect = document.getElementById("buildTypeSelect");
  const buildType = buildTypeSelect
    ? buildTypeSelect.value || "random"
    : "random";

  const items = pickRandomItemsByBuildType(buildType);
  renderItems(items);

  const runePage = pickRandomRunesByBuildType(buildType);
  renderRunes(runePage);

  showStatus("msg_ready");
}

// ===== 初期化 =====

document.addEventListener("DOMContentLoaded", () => {
  currentLang = detectInitialLang();
  setupLangButtons();
  setupControls();

  // 初期状態ではボタン文言だけ整えておく
  setRandomChampionMode(false);

  loadLanguage(currentLang).then(() => {
    loadDataDragonData();
  });
});
