import { mergeLexicalProfiles } from "./query-utils.js";

export const MAX_DEFINITIONS_SECTIONS = 2;
export const MAX_EXAMPLES_SECTIONS = 2;
export const MAX_SYNONYM_SECTIONS = 1;
export const MAX_ANTONYM_SECTIONS = 1;
export const MAX_PRONUNCIATIONS = 4;
export const MAX_ITEMS_PER_SECTION = 8;

export function mergeDictionaryEnrichment(initialResult, enrichmentResults) {
    if (!Array.isArray(enrichmentResults) || !enrichmentResults.length) {
        return null;
    }

    const base = cloneLookupResult(initialResult);
    const badges = Array.isArray(base.sourceBadges) ? [...base.sourceBadges] : [];
    const sections = Array.isArray(base.sections) ? [...base.sections] : [];
    let pronunciations = Array.isArray(base.pronunciations) && base.pronunciations.length
        ? [...base.pronunciations]
        : base.pronunciation
            ? [base.pronunciation]
            : [];

    let contributed = false;

    for (const providerResult of enrichmentResults) {
        if (!providerResult) {
            continue;
        }

        const providerLabel = sourceBadgeLabel(providerResult.sourceBadges) || providerResult.providerId;
        const beforeCount = sections.length;
        const beforePronunciations = pronunciations.length;

        mergeProviderSections(sections, providerResult.sections || [], providerLabel);

        const nextPronunciations = Array.isArray(providerResult.pronunciations) && providerResult.pronunciations.length
            ? providerResult.pronunciations
            : providerResult.pronunciation
                ? [providerResult.pronunciation]
                : [];
        pronunciations = mergePronunciations(pronunciations, nextPronunciations);

        const addedContent = sections.length > beforeCount || pronunciations.length > beforePronunciations;
        // A successful provider is useful attribution even when its content
        // duplicates data already supplied by an earlier provider.
        contributed = true;
        badges.push({
            label: providerLabel,
            kind: "dictionary",
            providerId: providerResult.providerId || ""
        });

        if (!addedContent) {
            continue;
        }
    }

    if (!contributed) {
        return null;
    }

    let mergedLexicalProfile = base.lexicalProfile || null;
    for (const providerResult of enrichmentResults) {
        if (providerResult?.lexicalProfile) {
            mergedLexicalProfile = mergeLexicalProfiles(mergedLexicalProfile, providerResult.lexicalProfile);
        }
    }

    const sourceBadges = buildSourceBadges(badges);
    return {
        ...base,
        sourceBadges,
        pronunciation: pronunciations[0] || base.pronunciation,
        pronunciations,
        sections,
        lexicalProfile: mergedLexicalProfile || undefined,
        enriched: true
    };
}

export function mergeProviderSections(targetSections, incomingSections, providerLabel) {
    for (const section of incomingSections || []) {
        const kind = normalizeSectionKind(section);
        if (kind === "translation") {
            continue;
        }

        const annotated = annotateSectionSource(section, providerLabel);
        const existing = targetSections.find((item) => {
            return normalizeSectionKind(item) === kind
                && normalizeSectionTitle(item) === normalizeSectionTitle(annotated);
        });

        if (existing) {
            if (mergeSectionContent(existing, annotated, providerLabel)) {
                continue;
            }
        }

        if (!canAddSectionOfKind(targetSections, kind)) {
            const sameKind = targetSections.find((item) => normalizeSectionKind(item) === kind);
            if (sameKind && mergeSectionContent(sameKind, annotated, providerLabel)) {
                continue;
            }
            continue;
        }

        targetSections.push(annotated);
    }
}

function mergeSectionContent(target, incoming, providerLabel) {
    let changed = false;

    if (Array.isArray(incoming.items) && incoming.items.length) {
        if (!Array.isArray(target.items)) {
            target.items = [];
        }

        for (const item of incoming.items) {
            const value = String(item || "").trim();
            if (!value) {
                continue;
            }
            if (target.items.some((existing) => normalizeComparableText(existing) === normalizeComparableText(value))) {
                continue;
            }
            if (target.items.length >= MAX_ITEMS_PER_SECTION) {
                break;
            }
            target.items.push(value);
            changed = true;
        }
    }

    const incomingText = String(incoming.text || "").trim();
    if (incomingText) {
        const targetText = String(target.text || "").trim();
        if (!targetText) {
            target.text = incomingText;
            changed = true;
        } else if (normalizeComparableText(targetText) !== normalizeComparableText(incomingText)
            && !targetText.includes(incomingText)
            && String(target.text || "").length < 600) {
            target.text = `${targetText}\n\n${incomingText}`;
            changed = true;
        }
    }

    if (changed) {
        target.meta = joinMetaLabels(target.meta, providerLabel || incoming.meta);
    }

    return changed;
}

export function mergePronunciations(existing, incoming) {
    const merged = Array.isArray(existing)
        ? existing.map((entry) => (entry ? { ...entry } : entry))
        : [];

    for (const item of incoming || []) {
        if (!item) {
            continue;
        }

        const phonetic = String(item.phonetic || "").trim();
        const audioUrl = String(item.audioUrl || "").trim();
        const language = String(item.language || "").trim();

        if (language || phonetic || audioUrl) {
            const matchIndex = merged.findIndex((entry) => {
                if (!entry) {
                    return false;
                }
                const entryLanguage = String(entry.language || "").trim();
                if (language && entryLanguage) {
                    return entryLanguage === language;
                }
                const entryPhonetic = String(entry.phonetic || "").trim();
                const entryAudio = String(entry.audioUrl || "").trim();
                return !entryPhonetic && (!entryAudio || !audioUrl || entryAudio === audioUrl);
            });

            if (matchIndex >= 0) {
                const current = merged[matchIndex];
                const next = { ...current };
                let changed = false;

                if (phonetic && !String(next.phonetic || "").trim()) {
                    next.phonetic = phonetic;
                    changed = true;
                }
                if (audioUrl && !String(next.audioUrl || "").trim()) {
                    next.audioUrl = audioUrl;
                    changed = true;
                }
                if (language && !String(next.language || "").trim()) {
                    next.language = language;
                    changed = true;
                }
                if (changed) {
                    if (next.audioUrl && next.fallbackOnly) {
                        next.fallbackOnly = false;
                    }
                    if (!next.label || next.label === "Speak") {
                        next.label = item.label || next.label || (next.audioUrl ? "Listen" : "Speak");
                    }
                    merged[matchIndex] = next;
                }

                const sameIdentity =
                    language
                    && String(current.language || "").trim() === language
                    && (
                        !phonetic
                        || normalizeComparableText(current.phonetic) === normalizeComparableText(phonetic)
                        || !String(current.phonetic || "").trim()
                    );
                if (sameIdentity || (!phonetic && !audioUrl)) {
                    continue;
                }
                if (
                    language
                    && merged.some((entry, index) => (
                        index !== matchIndex
                        && String(entry?.language || "").trim() === language
                        && normalizeComparableText(entry?.phonetic) === normalizeComparableText(phonetic)
                    ))
                ) {
                    continue;
                }
            }
        }

        const key = `${language}|${normalizeComparableText(phonetic)}|${audioUrl}`;
        const alreadyPresent = merged.some((entry) => {
            const entryKey = `${String(entry.language || "").trim()}|${normalizeComparableText(entry.phonetic)}|${String(entry.audioUrl || "").trim()}`;
            return entryKey === key;
        });
        if (alreadyPresent) {
            continue;
        }
        if (language && phonetic) {
            const accentDuplicate = merged.some((entry) => (
                String(entry?.language || "").trim() === language
                && normalizeComparableText(entry?.phonetic) === normalizeComparableText(phonetic)
            ));
            if (accentDuplicate) {
                continue;
            }
        }
        if (merged.length >= MAX_PRONUNCIATIONS) {
            break;
        }
        merged.push({ ...item, phonetic, audioUrl, language });
    }

    return preferPhoneticPronunciations(merged);
}

function preferPhoneticPronunciations(pronunciations) {
    if (!Array.isArray(pronunciations) || pronunciations.length < 2) {
        return pronunciations;
    }

    return [...pronunciations].sort((a, b) => {
        const aScore = (String(a?.phonetic || "").trim() ? 2 : 0) + (String(a?.audioUrl || "").trim() ? 1 : 0);
        const bScore = (String(b?.phonetic || "").trim() ? 2 : 0) + (String(b?.audioUrl || "").trim() ? 1 : 0);
        return bScore - aScore;
    });
}

function canAddSectionOfKind(sections, kind) {
    const count = sections.filter((section) => normalizeSectionKind(section) === kind).length;
    if (kind === "definitions") {
        return count < MAX_DEFINITIONS_SECTIONS;
    }
    if (kind === "examples") {
        return count < MAX_EXAMPLES_SECTIONS;
    }
    if (kind === "synonyms") {
        return count < MAX_SYNONYM_SECTIONS;
    }
    if (kind === "antonyms") {
        return count < MAX_ANTONYM_SECTIONS;
    }
    if (kind === "translation") {
        return count < 1;
    }
    return count < 1;
}

export function annotateSectionSource(section, sourceBadges) {
    const next = {
        ...section,
        items: Array.isArray(section?.items) ? [...section.items] : section?.items
    };
    const label = sourceBadgeLabel(sourceBadges);
    if (label && !String(next.meta || "").trim()) {
        next.meta = label;
    }
    return next;
}

export function sourceBadgeLabel(sourceBadges) {
    return Array.isArray(sourceBadges)
        ? String(sourceBadges[0]?.label || "").trim()
        : "";
}

function joinMetaLabels(...labels) {
    const parts = [];
    for (const label of labels) {
        for (const piece of String(label || "").split(/[+•|,]/)) {
            const value = piece.trim();
            if (!value) {
                continue;
            }
            if (!parts.some((existing) => existing.toLowerCase() === value.toLowerCase())) {
                parts.push(value);
            }
        }
    }
    return parts.join(" + ");
}

export function normalizeSectionKind(section) {
    const explicit = String(section?.kind || "").trim().toLowerCase();
    if (explicit) {
        return explicit;
    }
    const title = String(section?.title || "").trim().toLowerCase();
    if (title.includes("translation")) return "translation";
    if (title.includes("example")) return "examples";
    if (title.includes("synonym")) return "synonyms";
    if (title.includes("antonym")) return "antonyms";
    if (title.includes("definition") || title.includes("meaning") || !title) return "definitions";
    return title.replace(/[^a-z0-9]+/g, "-") || "general";
}

function normalizeSectionTitle(section) {
    return String(section?.title || "").trim().toLowerCase();
}

function normalizeComparableText(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
}

export function buildSourceBadges(badges) {
    const result = [];
    const seen = new Set();

    for (const badge of badges || []) {
        if (!badge) {
            continue;
        }
        const label = String(badge.label || "").trim();
        if (!label) {
            continue;
        }
        const key = label.toLowerCase();
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        result.push({
            label,
            kind: String(badge.kind || "default").trim() || "default",
            providerId: String(badge.providerId || "").trim()
        });
    }

    return result;
}

export function cloneLookupResult(result) {
    return {
        ...result,
        sourceBadges: Array.isArray(result?.sourceBadges)
            ? result.sourceBadges.map((badge) => ({ ...badge }))
            : [],
        pronunciations: Array.isArray(result?.pronunciations)
            ? result.pronunciations.map((item) => ({ ...item }))
            : [],
        sections: Array.isArray(result?.sections)
            ? result.sections.map((section) => ({
                ...section,
                items: Array.isArray(section?.items) ? [...section.items] : section?.items
            }))
            : []
    };
}
