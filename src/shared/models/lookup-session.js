/**
 * lookup-session.js — OOP Domain Service managing the active lookup state machine,
 * revision tracking, and race condition prevention.
 */
import { LookupQuery } from "./lookup-query.js";

export class LookupSession {
    constructor(options = {}) {
        this.activeTab = options.defaultTab || "dictionary";
        this.currentQuery = new LookupQuery();
        this.requestToken = 0;
        this.activeRequestId = "";
        this.lastRevision = -1;
        this.activeAiIntent = "";
        this.followUps = [];
    }

    startRequest(text, context = "", tab = this.activeTab) {
        this.requestToken += 1;
        this.activeTab = tab;
        this.currentQuery = new LookupQuery(text, context);
        this.activeRequestId = "";
        this.lastRevision = -1;
        if (tab !== "ai") {
            this.followUps = [];
            this.activeAiIntent = "";
        } else {
            this.activeAiIntent = "default";
        }
        return this.requestToken;
    }

    isCurrentToken(token) {
        return token === this.requestToken;
    }

    acceptsUpdate({ payload, surfaceReady = true }) {
        if (!surfaceReady) {
            return false;
        }

        const result = payload?.result;
        if (!result) {
            return false;
        }

        if (this.activeTab !== "dictionary") {
            return false;
        }

        const queryMatch = String(result.word || result.query || "").trim().toLowerCase() === this.currentQuery.text.toLowerCase();
        if (!queryMatch) {
            return false;
        }

        const currentReqId = this.activeRequestId;
        const updateReqId = payload.requestId || result.requestId;
        if (currentReqId && updateReqId && currentReqId !== updateReqId) {
            return false;
        }

        const nextRevision = Number.isFinite(payload.revision) ? payload.revision : (result.enriched ? 2 : 0);
        if (nextRevision <= this.lastRevision) {
            return false;
        }

        return true;
    }

    commitUpdate(payload) {
        const result = payload?.result;
        if (result?.requestId) {
            this.activeRequestId = result.requestId;
        }
        if (Number.isFinite(payload?.revision)) {
            this.lastRevision = payload.revision;
            if (result) result.revision = payload.revision;
        }
    }

    syncFollowUps(cache = null, settings = {}) {
        if (!settings.enableAiPreload || !settings.enableAI) {
            this.followUps = [];
            return this.followUps;
        }

        const eligible = this.currentQuery.getEligibleFollowUpIntents();
        this.followUps = eligible.map((item) => {
            return {
                ...item,
                result: null,
                loading: true,
                error: ""
            };
        });
        return this.followUps;
    }
}
