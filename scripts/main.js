// ===== 設定値 =====

// TODO: あとで最新バージョンに差し替え
const DD_VERSION = "14.2.1";

// UI言語コード → Data Dragon ロケール
const DD_LOCALE_MAP = {
  en: "en_US",
  ja: "ja_JP",
  ko: "ko_KR"
};

// LocalStorage に保存するキー
const STORAGE_LANG_KEY = "lol_rb_lang";

// ===== 状態管理 =====
let currentLang = "en";
let translations = {};

let championsData = null;
let itemsData = null;
let runesData = null;

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

    // 今回は textContent だけを対象にする
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
    const res = await fetch(`../lang/${lang}.json`).catch(() =>
      fetch(`./lang/${lang}.json`)
    );
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

// ===== Data Dragon 関連（骨組み） =====

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

    // TODO: ここで champion セレクトに一覧を流し込む処理をあとで作る
    populateChampionSelect();

    showStatus("msg_ready");
  } catch (err) {
    console.error("Failed to load Data Dragon data:", err);
    showStatus("msg_error");
  }
}

// チャンピオンセレクトの中身を更新（雛形）
function populateChampionSelect() {
  if (!championsData) return;

  const select = document.getElementById("championSelect");
  if (!select) return;

  // 先頭はプレースホルダーを残すので、一度それだけ残して削除
  const placeholderOption = select.querySelector("option[value='']");
  select.innerHTML = "";
  if (placeholderOption) {
    select.appendChild(placeholderOption);
  }

  const data = championsData.data || {};
  const entries = Object.values(data);

  entries
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((champ) => {
      const opt = document.createElement("option");
      opt.value = champ.id;
      opt.textContent = champ.name;
      select.appendChild(opt);
    });
}

// ===== イベント登録 =====

function setupLangButtons() {
  const buttons = document.querySelectorAll(".lang-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const lang = btn.dataset.lang;
      if (!lang || lang === currentLang) return;
      loadLanguage(lang).then(() => {
        // 言語を変えたら、Data Dragon もその言語で読み直すのが理想
        // 今はシンプルに再ロードしておく
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
        // 初回ならデータロードしてから実行
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

// ランダムチャンピオンを選ぶ（中身は仮）
function pickRandomChampion() {
  if (!championsData) return;
  const select = document.getElementById("championSelect");
  if (!select) return;

  const options = Array.from(select.querySelectorAll("option")).filter(
    (opt) => opt.value !== ""
  );
  if (options.length === 0) return;

  const randomOpt = options[Math.floor(Math.random() * options.length)];
  select.value = randomOpt.value;

  const resultEl = document.getElementById("resultChampion");
  if (resultEl) {
    resultEl.textContent = randomOpt.textContent || "";
  }
}

// ビルド生成のロジックはあとで本実装に差し替え
function generateBuild() {
  // TODO: フェーズ6で実装
  const resultItems = document.getElementById("resultItems");
  const resultRunes = document.getElementById("resultRunes");
  const champEl = document.getElementById("resultChampion");

  if (champEl && !champEl.textContent) {
    // チャンピオン未選択ならセレクトの表示名を反映
    const select = document.getElementById("championSelect");
    if (select) {
      const selected = select.selectedOptions[0];
      champEl.textContent = selected ? selected.textContent : "";
    }
  }

  if (resultItems) {
    resultItems.innerHTML = "";
    const li = document.createElement("li");
    li.textContent = "[TODO] build logic will show items here.";
    resultItems.appendChild(li);
  }

  if (resultRunes) {
    resultRunes.textContent =
      "[TODO] build logic will show runes here.";
  }
}

// ===== 初期化 =====

document.addEventListener("DOMContentLoaded", () => {
  currentLang = detectInitialLang();
  setupLangButtons();
  setupControls();

  // 言語ロード → Data Dragon ロードの順
  loadLanguage(currentLang).then(() => {
    loadDataDragonData();
  });
});
