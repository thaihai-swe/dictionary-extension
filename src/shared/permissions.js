/**
 * Narrow host-permission helpers for user-configured provider endpoints.
 * Requests are initiated only from extension pages in response to user input.
 */

export function getOriginPermissionPattern(value) {
    let parsed;
    try {
        parsed = new URL(String(value || "").trim());
    } catch (_error) {
        throw new Error("Enter a valid http:// or https:// provider URL.");
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error("Provider URLs must start with http:// or https://.");
    }

    return `${parsed.protocol}//${parsed.host}/*`;
}

export async function ensureProviderOriginPermission(value) {
    const origin = getOriginPermissionPattern(value);

    if (!chrome.permissions?.contains || !chrome.permissions?.request) {
        return { ok: true, origin, requested: false };
    }

    const permission = { origins: [origin] };
    const alreadyGranted = await chrome.permissions.contains(permission);
    if (alreadyGranted) {
        return { ok: true, origin, requested: false };
    }

    const granted = await chrome.permissions.request(permission);
    return {
        ok: Boolean(granted),
        origin,
        requested: true,
        error: granted
            ? ""
            : `Permission for ${origin} was not granted. The extension cannot contact this provider.`
    };
}
