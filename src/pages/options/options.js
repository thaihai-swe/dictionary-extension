import { DEFAULT_SETTINGS, getSettings, normalizeSettings, parsePublicSettingsImport, saveSettings, serializePublicSettings } from "../../shared/storage.js";
import { VALIDATE_PROVIDER } from "../../shared/messages.js";
import { populateLanguageSelect } from "../../shared/languages.js";
import { ensureProviderOriginPermission } from "../../shared/permissions.js";

const form = document.querySelector("#settings-form");
const status = document.querySelector("#status");
const resetPromptsButton = document.querySelector("#reset-prompts-btn");
const exportSettingsButton = document.querySelector("#export-settings-btn");
const importSettingsButton = document.querySelector("#import-settings-btn");
const importSettingsInput = document.querySelector("#import-settings-input");
const languageSelect = document.querySelector("#translate-target-language");
const customLanguagesInput = form?.elements?.namedItem("customLanguages");
const pronunciationVoiceSelect = form?.elements?.namedItem("pronunciationVoiceURI");

const PROMPT_KEYS = [
    "aiPromptTemplate",
    "aiContextPromptTemplate",
    "aiGrammarPromptTemplate",
    "aiSentencePromptTemplate",
    "aiPhraseExplorerPromptTemplate",
    "aiComparePromptTemplate",
    "aiRephrasePromptTemplate"
];

hydrate().catch((error) => {
    showStatus(error.message || "Unable to load settings.", true);
});

form.addEventListener("submit", handleSubmit);
resetPromptsButton?.addEventListener("click", handleResetPrompts);
exportSettingsButton?.addEventListener("click", handleExportSettings);
importSettingsButton?.addEventListener("click", () => importSettingsInput?.click());
importSettingsInput?.addEventListener("change", handleImportSettings);
document.querySelectorAll(".prompt-reset-btn").forEach((button) => {
    button.addEventListener("click", () => handleResetSinglePrompt(button.dataset.promptKey));
});
customLanguagesInput?.addEventListener("input", () => {
    const selected = languageSelect?.value || DEFAULT_SETTINGS.translateTargetLanguage;
    populateLanguageSelect(languageSelect, selected, customLanguagesInput.value);
});

if (typeof speechSynthesis !== "undefined") {
    speechSynthesis.addEventListener?.("voiceschanged", () => {
        populatePronunciationVoices(pronunciationVoiceSelect?.value);
    });
}

document.querySelectorAll(".test-connection-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
        handleTestConnection(btn.dataset.validationKind, btn.dataset.providerId).catch(() => {
            setValidationStatus(btn.dataset.validationKind, btn.dataset.providerId, "Test failed.", false);
        });
    });
});

async function hydrate() {
    const settings = await getSettings();
    document.documentElement.setAttribute("data-theme", settings.theme || "system");
    document.documentElement.setAttribute("data-font", settings.fontFamily || "editorial");

    for (const [key, defaultValue] of Object.entries(DEFAULT_SETTINGS)) {
        const field = form.elements.namedItem(key);
        if (!field || key === "translateTargetLanguage") {
            continue;
        }

        if (field.type === "checkbox") {
            field.checked = Boolean(settings[key]);
        } else if (key === "pausedHostnames") {
            field.value = Array.isArray(settings.pausedHostnames)
                ? settings.pausedHostnames.join("\n")
                : String(settings.pausedHostnames || "");
        } else {
            field.value = settings[key] ?? defaultValue ?? "";
        }
    }

    populateLanguageSelect(
        languageSelect,
        settings.translateTargetLanguage,
        settings.customLanguages
    );
    populatePronunciationVoices(settings.pronunciationVoiceURI);
}

function populatePronunciationVoices(selectedVoiceURI = "") {
    if (!pronunciationVoiceSelect) {
        return;
    }

    const selected = String(selectedVoiceURI || "").trim();
    const voices = typeof speechSynthesis === "undefined"
        ? []
        : speechSynthesis.getVoices();
    const options = ["<option value=\"\">Browser default</option>"];
    const seen = new Set();

    for (const voice of voices) {
        const uri = String(voice?.voiceURI || "").trim();
        if (!uri || seen.has(uri)) {
            continue;
        }
        seen.add(uri);
        const name = String(voice.name || "Unnamed voice").trim();
        const language = String(voice.lang || "").trim();
        options.push(`<option value="${escapeHtml(uri)}">${escapeHtml(language ? `${name} · ${language}` : name)}</option>`);
    }

    if (selected && !seen.has(selected)) {
        options.push(`<option value="${escapeHtml(selected)}">Previously selected voice is unavailable</option>`);
    }

    pronunciationVoiceSelect.innerHTML = options.join("");
    pronunciationVoiceSelect.value = selected;
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

async function handleSubmit(event) {
    event.preventDefault();
    const payload = collectFormSettings();

    const warnings = validatePromptTemplates(payload);
    if (warnings.length > 0) {
        const proceed = confirm(`Prompt template warning:\n- ${warnings.join("\n- ")}\n\nDo you still want to save?`);
        if (!proceed) {
            return;
        }
    }

    await ensureConfiguredProviderPermissions(payload);
    await saveSettings(payload);

    document.documentElement.setAttribute("data-theme", payload.theme || "system");
    document.documentElement.setAttribute("data-font", payload.fontFamily || "editorial");

    const promptChanged = PROMPT_KEYS.some((key) => {
        const nextValue = String(payload[key] || "").trim();
        const defaultValue = String(DEFAULT_SETTINGS[key] || "").trim();
        return nextValue !== defaultValue;
    });

    showStatus(promptChanged ? "Settings saved. AI prompts updated." : "Settings saved successfully.");
}

function validatePromptTemplates(settings) {
    const warnings = [];
    const main = String(settings.aiPromptTemplate || "");
    if (main && !main.includes("{{str}}") && !main.includes("{{text}}")) {
        warnings.push("Main AI prompt template is missing {{str}} or {{text}} variable.");
    }

    const context = String(settings.aiContextPromptTemplate || "");
    if (context && !context.includes("{{context}}")) {
        warnings.push("Context explanation template is missing {{context}} variable.");
    }

    const sentence = String(settings.aiSentencePromptTemplate || "");
    if (sentence && !sentence.includes("{{sentence}}")) {
        warnings.push("Sentence breakdown template is missing {{sentence}} variable.");
    }

    const phraseExplorer = String(settings.aiPhraseExplorerPromptTemplate || "");
    if (phraseExplorer && !phraseExplorer.includes("{{str}}") && !phraseExplorer.includes("{{text}}")) {
        warnings.push("Phrase & Collocations template is missing {{str}} or {{text}} variable.");
    }

    const grammar = String(settings.aiGrammarPromptTemplate || "");
    if (grammar && !grammar.includes("{{str}}") && !grammar.includes("{{text}}")) {
        warnings.push("Grammar & Nuance template is missing {{str}} or {{text}} variable.");
    }

    return warnings;
}

function handleResetPrompts() {
    for (const key of PROMPT_KEYS) {
        const field = form.elements.namedItem(key);
        if (field) {
            field.value = DEFAULT_SETTINGS[key] || "";
        }
    }

    showStatus("AI prompts restored to defaults. Save settings to keep them.");
}

function handleResetSinglePrompt(key) {
    const field = form.elements.namedItem(key);
    if (!field || !PROMPT_KEYS.includes(key)) {
        return;
    }

    const current = String(field.value || "").trim();
    const next = String(DEFAULT_SETTINGS[key] || "");
    if (current && current !== next.trim()) {
        const proceed = confirm("Restore this prompt to the built-in default? Save settings to keep the change.");
        if (!proceed) {
            return;
        }
    }

    field.value = next;
    showStatus("Prompt restored to default. Save settings to keep it.");
}

async function handleExportSettings() {
    const settings = collectFormSettings();
    const payload = serializePublicSettings(settings);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "dictionary-settings.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showStatus("Settings exported. API keys were not included.");
}

async function handleImportSettings(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
        return;
    }

    try {
        const raw = await file.text();
        const parsed = parsePublicSettingsImport(raw);
        const proceed = confirm("Replace current preferences and prompt templates? API keys are not imported.");
        if (!proceed) {
            return;
        }

        const warnings = validatePromptTemplates(parsed.settings);
        if (warnings.length > 0) {
            const keepGoing = confirm(`Prompt template warning:\n- ${warnings.join("\n- ")}\n\nDo you still want to import?`);
            if (!keepGoing) {
                return;
            }
        }

        await saveSettings(parsed.settings);
        await hydrate();
        const ignored = parsed.ignoredSecrets.length ? " API keys were ignored." : "";
        showStatus(`Settings imported.${ignored}`);
    } catch (error) {
        showStatus(error?.message || "Unable to import settings.", true);
        status?.focus?.();
    }
}

function collectFormSettings() {
    const formData = new FormData(form);
    return normalizeSettings({
        selectionTriggerMode: formData.get("selectionTriggerMode"),
        postSelectionModifier: formData.get("postSelectionModifier"),
        enableContextMenuTrigger: form.elements.namedItem("enableContextMenuTrigger").checked,
        defaultTab: formData.get("defaultTab"),
        translateTargetLanguage: formData.get("translateTargetLanguage"),
        customLanguages: formData.get("customLanguages"),
        translateProvider: formData.get("translateProvider"),
        libreTranslateBaseUrl: formData.get("libreTranslateBaseUrl"),
        libreTranslateApiKey: formData.get("libreTranslateApiKey"),
        theme: formData.get("theme"),
        fontFamily: formData.get("fontFamily"),
        popupWidth: formData.get("popupWidth"),
        popupHeight: formData.get("popupHeight"),
        aiBaseUrl: formData.get("aiBaseUrl"),
        aiApiKey: formData.get("aiApiKey"),
        aiModel: formData.get("aiModel"),
        aiPromptTemplate: formData.get("aiPromptTemplate"),
        aiContextPromptTemplate: formData.get("aiContextPromptTemplate"),
        aiGrammarPromptTemplate: formData.get("aiGrammarPromptTemplate"),
        aiSentencePromptTemplate: formData.get("aiSentencePromptTemplate"),
        aiPhraseExplorerPromptTemplate: formData.get("aiPhraseExplorerPromptTemplate"),
        aiComparePromptTemplate: formData.get("aiComparePromptTemplate"),
        aiRephrasePromptTemplate: formData.get("aiRephrasePromptTemplate"),
        enableTranslate: form.elements.namedItem("enableTranslate").checked,
        enableDictionary: form.elements.namedItem("enableDictionary").checked,
        enableLexicalProfile: form.elements.namedItem("enableLexicalProfile").checked,
        enableAI: form.elements.namedItem("enableAI").checked,
        enableAiPreload: form.elements.namedItem("enableAiPreload").checked,
        enablePhraseFallback: form.elements.namedItem("enablePhraseFallback").checked,
        pausedHostnames: formData.get("pausedHostnames"),
        disablePageContextExtraction: form.elements.namedItem("disablePageContextExtraction")?.checked || false,
        dictionaryProvider: formData.get("dictionaryProvider"),
        dictionaryApiKey: formData.get("dictionaryApiKey"),
        wordnikApiKey: formData.get("wordnikApiKey"),
        wordsApiKey: formData.get("wordsApiKey"),
        pronunciationRate: formData.get("pronunciationRate"),
        pronunciationVoiceURI: formData.get("pronunciationVoiceURI")
    });
}

async function handleTestConnection(kind, explicitProviderId) {
    if (!kind) return;

    const targetKey = `${kind}:${explicitProviderId || kind}`;
    const btn = document.querySelector(`.test-connection-btn[data-validation-kind="${kind}"][data-provider-id="${explicitProviderId || kind}"]`)
        || document.querySelector(`.test-connection-btn[data-validation-kind="${kind}"]`);
    const statusEl = document.querySelector(`[data-validation-status="${targetKey}"]`)
        || document.querySelector(`[data-validation-status="${kind}"]`);
    if (!btn || !statusEl) return;

    btn.disabled = true;
    setValidationStatus(kind, explicitProviderId, "Testing…", null);

    try {
        const settings = collectFormSettings();
        let providerId = explicitProviderId;

        if (!providerId) {
            if (kind === "dictionary") providerId = settings.dictionaryProvider;
            else if (kind === "translation") providerId = settings.translateProvider;
            else providerId = "ai";
        }

        await ensureTestProviderPermission(kind, providerId, settings);

        const response = await chrome.runtime.sendMessage({
            type: VALIDATE_PROVIDER,
            payload: { kind, providerId, settings }
        });

        if (!response?.ok) {
            setValidationStatus(kind, explicitProviderId, response?.error || "Validation failed.", false);
            return;
        }

        const result = response.result || {};
        if (result.ok) {
            const latency = Number.isFinite(result.latencyMs) ? ` ⚡ ${result.latencyMs}ms` : "";
            setValidationStatus(kind, explicitProviderId, `✓ ${result.message || "Connected."}${latency}`, true);
        } else {
            const statusSuffix = result.httpStatus ? ` (${result.httpStatus})` : "";
            setValidationStatus(kind, explicitProviderId, `✕ ${result.error || "Connection failed."}${statusSuffix}`, false);
        }
    } catch (error) {
        setValidationStatus(kind, explicitProviderId, error?.message || "Test failed.", false);
    } finally {
        btn.disabled = false;
    }
}

async function ensureConfiguredProviderPermissions(settings) {
    const requests = [];

    if (settings.enableAI) {
        requests.push({
            label: "AI provider",
            url: settings.aiBaseUrl
        });
    }

    if (settings.enableTranslate && settings.translateProvider === "libretranslate") {
        requests.push({
            label: "LibreTranslate provider",
            url: settings.libreTranslateBaseUrl
        });
    }

    for (const request of requests) {
        const result = await ensureProviderOriginPermission(request.url);
        if (!result.ok) {
            throw new Error(result.error || `Permission is required for the ${request.label}.`);
        }
    }
}

async function ensureTestProviderPermission(kind, providerId, settings) {
    if (kind === "ai") {
        const result = await ensureProviderOriginPermission(settings.aiBaseUrl);
        if (!result.ok) {
            throw new Error(result.error || "Permission is required to test this AI provider.");
        }
    }

    if (kind === "translation" && providerId === "libretranslate") {
        const result = await ensureProviderOriginPermission(settings.libreTranslateBaseUrl);
        if (!result.ok) {
            throw new Error(result.error || "Permission is required to test this LibreTranslate provider.");
        }
    }
}

function setValidationStatus(kind, explicitProviderId, message, isOk) {
    const targetKey = `${kind}:${explicitProviderId || kind}`;
    const statusEl = document.querySelector(`[data-validation-status="${targetKey}"]`)
        || document.querySelector(`[data-validation-status="${kind}"]`);
    if (!statusEl) return;

    statusEl.textContent = message;
    statusEl.classList.remove("is-ok", "is-error", "is-pending");
    if (isOk === true) {
        statusEl.classList.add("is-ok");
    } else if (isOk === false) {
        statusEl.classList.add("is-error");
    } else {
        statusEl.classList.add("is-pending");
    }

    if (isOk === true || isOk === false) {
        window.setTimeout(() => {
            if (statusEl.textContent === message) {
                statusEl.textContent = "";
                statusEl.classList.remove("is-ok", "is-error", "is-pending");
            }
        }, 6000);
    }
}

function showStatus(message, isError = false) {
    status.textContent = message;
    status.classList.toggle("is-error", Boolean(isError));
    status.classList.toggle("is-success", !isError);

    window.setTimeout(() => {
        if (status.textContent === message) {
            status.textContent = "";
            status.classList.remove("is-success", "is-error");
        }
    }, 2800);
}
