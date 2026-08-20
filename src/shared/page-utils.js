/**
 * Shared URL and page-restriction detection helpers.
 * Shared page URL utilities for background and content contexts.
 */

function isPdfUrl(url) {
    const value = String(url || "").trim().toLowerCase();
    return (
        value.endsWith(".pdf") ||
        value.includes(".pdf?") ||
        value.includes(".pdf#") ||
        value.includes("application/pdf") ||
        value.startsWith("chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai/")
    );
}

export function canInjectIntoUrl(url) {
    const value = String(url || "").trim().toLowerCase();
    if (!value) {
        return false;
    }

    if (
        value.startsWith("chrome://") ||
        value.startsWith("chrome-extension://") ||
        value.startsWith("edge://") ||
        value.startsWith("about:") ||
        value.startsWith("devtools://") ||
        value.startsWith("view-source:") ||
        value.includes("chrome.google.com/webstore") ||
        value.includes("chromewebstore.google.com")
    ) {
        return false;
    }

    if (value.startsWith("chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai/")) {
        return false;
    }

    return (
        value.startsWith("http://") ||
        value.startsWith("https://") ||
        value.startsWith("file://")
    );
}

export function classifyPageRestriction(url) {
    const value = String(url || "").trim().toLowerCase();
    if (!value) {
        return "unavailable";
    }

    if (isPdfUrl(value)) {
        return "pdf_viewer";
    }

    if (value.startsWith("file://")) {
        return "file_url";
    }

    if (!canInjectIntoUrl(value)) {
        return "restricted_page";
    }

    return "content_script_unavailable";
}
