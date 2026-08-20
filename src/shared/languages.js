export const DEFAULT_LANGUAGE_OPTIONS = [
    { name: "English", code: "en" },
    { name: "Vietnamese", code: "vi" }
];

export const KNOWN_LANGUAGE_MAPPINGS = [
    { name: "English", code: "en" },
    { name: "Vietnamese", code: "vi" },
    { name: "Spanish", code: "es" },
    { name: "French", code: "fr" },
    { name: "German", code: "de" },
    { name: "Japanese", code: "ja" },
    { name: "Korean", code: "ko" },
    { name: "Chinese (Simplified)", code: "zh-CN" },
    { name: "Chinese (Traditional)", code: "zh-TW" },
    { name: "Italian", code: "it" },
    { name: "Portuguese", code: "pt" },
    { name: "Russian", code: "ru" },
    { name: "Thai", code: "th" },
    { name: "Indonesian", code: "id" },
    { name: "Hindi", code: "hi" },
    { name: "Arabic", code: "ar" }
];

export const DEFAULT_CUSTOM_LANGUAGES = DEFAULT_LANGUAGE_OPTIONS
    .map((item) => item.name)
    .join(", ");

const CODE_ALIASES = {
    vn: "vi",
    jp: "ja",
    kr: "ko",
    cn: "zh-CN",
    tw: "zh-TW",
    "zh-cn": "zh-CN",
    "zh-tw": "zh-TW"
};

const NAME_ALIASES = {
    chinese: "Chinese (Simplified)",
    "chinese simplified": "Chinese (Simplified)",
    "chinese traditional": "Chinese (Traditional)"
};

function parseLanguageList(value) {
    const seen = new Set();
    const names = [];

    for (const part of String(value || "").split(",")) {
        const name = part.trim().replace(/\s+/g, " ");
        if (!name) {
            continue;
        }

        const key = name.toLowerCase();
        if (seen.has(key)) {
            continue;
        }

        seen.add(key);
        names.push(name);
    }

    return names;
}

export function normalizeCustomLanguages(value) {
    const names = parseLanguageList(value);
    return names.length ? names.join(", ") : DEFAULT_CUSTOM_LANGUAGES;
}

function getLanguageOptions(customLanguages = DEFAULT_CUSTOM_LANGUAGES) {
    const options = [];
    const seen = new Set();

    for (const item of DEFAULT_LANGUAGE_OPTIONS) {
        options.push({ ...item });
        seen.add(item.name.toLowerCase());
    }

    for (const name of parseLanguageList(customLanguages)) {
        const key = name.toLowerCase();
        if (seen.has(key)) {
            continue;
        }

        seen.add(key);
        options.push({
            name,
            code: resolveLanguageCode(name)
        });
    }

    return options.length
        ? options
        : DEFAULT_LANGUAGE_OPTIONS.map((item) => ({ ...item }));
}

export function resolveLanguageCode(value) {
    const raw = String(value || "").trim().replace(/\s+/g, " ");
    if (!raw) {
        return "en";
    }

    const lower = raw.toLowerCase();
    if (CODE_ALIASES[lower]) {
        return CODE_ALIASES[lower];
    }

    const byCode = KNOWN_LANGUAGE_MAPPINGS.find((item) => item.code.toLowerCase() === lower);
    if (byCode) {
        return byCode.code;
    }

    const aliasName = NAME_ALIASES[lower];
    if (aliasName) {
        const aliased = KNOWN_LANGUAGE_MAPPINGS.find((item) => item.name === aliasName);
        if (aliased) {
            return aliased.code;
        }
    }

    const byName = KNOWN_LANGUAGE_MAPPINGS.find((item) => item.name.toLowerCase() === lower);
    if (byName) {
        return byName.code;
    }

    if (/^[a-z]{2,3}(?:-[a-z]{2,4})?$/i.test(raw)) {
        if (lower === "zh-cn") return "zh-CN";
        if (lower === "zh-tw") return "zh-TW";
        return lower;
    }

    return raw;
}

export function resolveLanguageName(value, customLanguages = DEFAULT_CUSTOM_LANGUAGES) {
    const raw = String(value || "").trim().replace(/\s+/g, " ");
    if (!raw) {
        return "English";
    }

    const lower = raw.toLowerCase();
    const options = getLanguageOptions(customLanguages);

    const byName = options.find((item) => item.name.toLowerCase() === lower);
    if (byName) {
        return byName.name;
    }

    const aliasName = NAME_ALIASES[lower];
    if (aliasName) {
        const aliased = options.find((item) => item.name === aliasName)
            || KNOWN_LANGUAGE_MAPPINGS.find((item) => item.name === aliasName);
        if (aliased) {
            return aliased.name;
        }
    }

    const code = resolveLanguageCode(raw);
    const byCode = options.find((item) => item.code.toLowerCase() === code.toLowerCase())
        || KNOWN_LANGUAGE_MAPPINGS.find((item) => item.code.toLowerCase() === code.toLowerCase());
    if (byCode) {
        return byCode.name;
    }

    return raw;
}

export function populateLanguageSelect(selectEl, selectedValue, customLanguages) {
    if (!selectEl) {
        return;
    }

    const options = getLanguageOptions(customLanguages);
    const selectedName = resolveLanguageName(selectedValue, customLanguages);
    const selectedKey = selectedName.toLowerCase();

    selectEl.replaceChildren();

    let matched = false;
    for (const option of options) {
        const el = document.createElement("option");
        el.value = option.name;
        el.textContent = option.name;
        if (option.name.toLowerCase() === selectedKey) {
            el.selected = true;
            matched = true;
        }
        selectEl.appendChild(el);
    }

    if (!matched && selectedName) {
        const el = document.createElement("option");
        el.value = selectedName;
        el.textContent = selectedName;
        el.selected = true;
        selectEl.appendChild(el);
    }
}
