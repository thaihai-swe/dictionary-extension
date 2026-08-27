/**
 * Shared runtime message type constants.
 * ES module for background/options/action contexts.
 * Also attached globally for classic content-script use.
 */
const LOOKUP_TEXT = "LOOKUP_TEXT";
const LOOKUP_UPDATE = "LOOKUP_UPDATE";
const OPEN_LOOKUP_POPUP = "OPEN_LOOKUP_POPUP";
const VALIDATE_PROVIDER = "VALIDATE_PROVIDER";
const CANCEL_LOOKUP = "CANCEL_LOOKUP";
const INJECT_FRAME = "INJECT_FRAME";

export {
    LOOKUP_TEXT,
    LOOKUP_UPDATE,
    OPEN_LOOKUP_POPUP,
    VALIDATE_PROVIDER,
    CANCEL_LOOKUP,
    INJECT_FRAME
};

if (typeof globalThis !== "undefined") {
    globalThis.DictionaryHelperMessages = {
        LOOKUP_TEXT,
        LOOKUP_UPDATE,
        OPEN_LOOKUP_POPUP,
        VALIDATE_PROVIDER,
        CANCEL_LOOKUP,
        INJECT_FRAME
    };
}
