/**
 * Shared runtime message type constants.
 * ES module for background/options/action contexts.
 * Also attached globally for classic content-script use.
 */
export const MESSAGES = Object.freeze({
    LOOKUP_TEXT: "LOOKUP_TEXT",
    LOOKUP_UPDATE: "LOOKUP_UPDATE",
    OPEN_LOOKUP_POPUP: "OPEN_LOOKUP_POPUP",
    VALIDATE_PROVIDER: "VALIDATE_PROVIDER",
    CANCEL_LOOKUP: "CANCEL_LOOKUP",
    INJECT_FRAME: "INJECT_FRAME"
});

export const {
    LOOKUP_TEXT,
    LOOKUP_UPDATE,
    OPEN_LOOKUP_POPUP,
    VALIDATE_PROVIDER,
    CANCEL_LOOKUP,
    INJECT_FRAME
} = MESSAGES;

if (typeof globalThis !== "undefined") {
    globalThis.DictionaryHelperMessages = MESSAGES;
}
