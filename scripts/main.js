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

// ===== 状態管理 =====
let currentLang = "en";
let translations = {};

let championsData = null;
let itemsData = null;
let runesData = null;

let selectedChampionId = null;

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
    if (!key) {
      return;
    }
    el.textContent = t(key);
  });
}

function showStatus(key) {
  const el = document.getElementById("statusText");
  if (!el) return;
  el.textContent = t(key);
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

// ===== チャンピオン UI（グリッド＋選択） =====

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

// 選択中チャンピオンをセット
function selectChampion(champId) {
  if (!champId || !championsData) return;

  const champ = getChampionById(champId);
  if (!champ) return;

  selectedChampionId = champId;

  const select = document.getElementById("championSelect");
  if (select) {
    select.value = champId;
  }

  renderChampionResult(champ);
  updateChampionGridSelection(champId);
}

// セレクトと画像グリッドを構築
function populateChampionUI() {
  if (!championsData) return;

  const select = document.getElementById("championSelect");
  const grid = document.getElementById("championGrid");
  const data = championsData.data || {};
  const entries = Object.values(data).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  // 隠しセレクト
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

  // 画像グリッド
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
        selectChampion(champ.id);
      });

      grid.appendChild(btn);
    });
  }

  // placeholder の翻訳再適用
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

function classifyItemPools(allItems) {
  const boots = [];
  const ap = [];
  const ad = [];
  const tank = [];
  const bruiser = [];
  const any = [];

  allItems.forEach((item) => {
    if (!isItemAvailableOnSR(item)) return;
    if (item.inStore === false) return;

    any.push(item);

    if (isBoots(item)) {
      boots.push(item);
      return;
    }

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
    case "random":
      {
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

  return [...chosenBoots, ...mains];
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

  const primaryStyle = styles[Math.floor(Math.random() * styles.length)];

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
  const secondaryStyle =
    secondaryCandidates[
      Math.floor(Math.random() * secondaryCandidates.length)
    ];

  const secondaryRunes = [];
  const secondarySlots = secondaryStyle.slots.slice(1);
  const flatSecondary = secondarySlots.flatMap((slot) => slot.runes || []);
  const secPicked = pickRandomDistinct(flatSecondary, 2);
  secPicked.forEach((r) => secondaryRunes.push(r));

  return {
    primaryStyle,
    secondaryStyle,
    keystone,
    primaryRunes,
    secondaryRunes
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
    secondaryRunes
  } = runePage;

  const styleRow = document.createElement("div");
  styleRow.className = "rune-style-row";

  function createStyleLabel(style, labelText) {
    const wrap = document.createElement("div");
    wrap.className = "rune-style-label";

    if (style.icon) {
      const img = document.createElement("img");
      img.className = "rune-style-icon";
      img.src = `${DD_IMG_BASE_GENERAL}/${style.icon}`;
      img.alt = style.name;
      wrap.appendChild(img);
    }

    const text = document.createElement("span");
    text.textContent = `${labelText}: ${style.name}`;
    wrap.appendChild(text);

    return wrap;
  }

  styleRow.appendChild(createStyleLabel(primaryStyle, "Primary"));
  styleRow.appendChild(createStyleLabel(secondaryStyle, "Secondary"));

  container.appendChild(styleRow);

  const keystoneTitle = document.createElement("div");
  keystoneTitle.className = "rune-section-title";
  keystoneTitle.textContent = "Keystone";
  container.appendChild(keystoneTitle);

  const keystoneRow = document.createElement("div");
  keystoneRow.className = "rune-row";

  const ksImg = document.createElement("img");
  ksImg.className = "rune-icon";
  ksImg.src = `${DD_IMG_BASE_GENERAL}/${keystone.icon}`;
  ksImg.alt = keystone.name;

  const ksName = document.createElement("span");
  ksName.className = "rune-name";
  ksName.textContent = keystone.name;

  keystoneRow.appendChild(ksImg);
  keystoneRow.appendChild(ksName);
  container.appendChild(keystoneRow);

  if (primaryRunes && primaryRunes.length > 0) {
    const title = document.createElement("div");
    title.className = "rune-section-title";
    title.textContent = "Primary runes";
    container.appendChild(title);

    primaryRunes.forEach((r) => {
      const row = document.createElement("div");
      row.className = "rune-row";

      const img = document.createElement("img");
      img.className = "rune-icon";
      img.src = `${DD_IMG_BASE_GENERAL}/${r.icon}`;
      img.alt = r.name;

      const nameEl = document.createElement("span");
      nameEl.className = "rune-name";
      nameEl.textContent = r.name;

      row.appendChild(img);
      row.appendChild(nameEl);
      container.appendChild(row);
    });
  }

  if (secondaryRunes && secondaryRunes.length > 0) {
    const title = document.createElement("div");
    title.className = "rune-section-title";
    title.textContent = "Secondary runes";
    container.appendChild(title);

    secondaryRunes.forEach((r) => {
      const row = document.createElement("div");
      row.className = "rune-row";

      const img = document.createElement("img");
      img.className = "rune-icon";
      img.src = `${DD_IMG_BASE_GENERAL}/${r.icon}`;
      img.alt = r.name;

      const nameEl = document.createElement("span");
      nameEl.className = "rune-name";
      nameEl.textContent = r.name;

      row.appendChild(img);
      row.appendChild(nameEl);
      container.appendChild(row);
    });
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
  const btnRandomChamp = document.getElementById("btnRandomChampion");
  const btnGenerate = document.getElementById("btnGenerate");

  if (btnRandomChamp) {
    btnRandomChamp.addEventListener("click", () => {
      if (!championsData) {
        loadDataDragonData().then(pickRandomChampion);
      } else {
        pickRandomChampion();
      }
    });
  }

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
}

function pickRandomChampion() {
  if (!championsData) return;

  const entries = getChampionEntries();
  if (entries.length === 0) return;

  const randomChamp =
    entries[Math.floor(Math.random() * entries.length)];
  selectChampion(randomChamp.id);
}

function generateBuild() {
  if (!championsData || !itemsData || !runesData) {
    loadDataDragonData().then(() => generateBuild());
    return;
  }

  showStatus("msg_generating");

  let champId = selectedChampionId;
  if (!champId) {
    const entries = getChampionEntries();
    if (entries.length > 0) {
      const randomChamp =
        entries[Math.floor(Math.random() * entries.length)];
      champId = randomChamp.id;
      selectChampion(champId);
    }
  }

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

  loadLanguage(currentLang).then(() => {
    loadDataDragonData();
  });
});
