/**
 * Shared audio/pronunciation utilities for the in-page lookup popup.
 * Injected globally in src/content.js context.
 */
(function (global) {
    const AudioHelper = {
        activeAudio: null,
        activeUtterance: null,
        activeButton: null,
        activeRecognition: null,
        activeEvalButton: null,
        speechStartTimer: null,
        practiceResults: new Map(),

        handlePronunciationClick(event) {
            const evalButton = event.target.closest("[data-eval-speech-text]");
            if (evalButton) {
                event.preventDefault();
                event.stopPropagation();
                AudioHelper.handleSpeechEvalClick(evalButton);
                return;
            }

            const button = event.target.closest("[data-pronounce-text]");
            if (!button) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            const text = button.dataset.pronounceText || "";
            const audioUrl = button.dataset.pronounceAudio || "";
            const language = button.dataset.pronounceLanguage || "";
            const rate = Number(button.dataset.pronounceRate || 0.95);
            const voiceURI = button.dataset.pronounceVoice || "";

            AudioHelper.playPronunciation({ text, audioUrl, language, rate, voiceURI, button });
        },

        handleSpeechEvalClick(button) {
            const text = button.dataset.evalSpeechText || "";
            const language = button.dataset.evalSpeechLang || "en-US";
            const resultHost = button.closest("[class$='pronunciation-group'], [class$='result']");
            const resultEl = resultHost?.querySelector("[data-speech-eval-result]")
                || button.parentElement?.querySelector("[data-speech-eval-result]")
                || null;

            AudioHelper.evaluateSpeech({
                text,
                language,
                button,
                onStart() {
                    if (resultEl) {
                        resultEl.hidden = false;
                        resultEl.className = resultEl.className
                            .replace(/\beval-score-\w+/g, "")
                            .replace(/\bis-error\b/g, "")
                            .trim();
                        resultEl.classList.add("is-listening");
                        resultEl.textContent = "Listening… speak now";
                    }
                },
                onResult(result) {
                    if (!resultEl) {
                        return;
                    }
                    resultEl.hidden = false;
                    resultEl.classList.remove("is-listening", "is-error");
                    resultEl.className = resultEl.className
                        .replace(/\beval-score-\w+/g, "")
                        .trim();
                    resultEl.classList.add(`eval-score-${result.grade}`);

                    // Build per-word breakdown markup
                    let breakdownHtml = "";
                    if (Array.isArray(result.details) && result.details.length > 1) {
                        const chips = result.details.map((d) => {
                            const cls = d.matched ? "eval-word-matched" : (d.closeMatch ? "eval-word-close" : "eval-word-missed");
                            return `<span class="eval-word-chip ${cls}">${AudioHelper.escapeHtml(d.word)}</span>`;
                        }).join(" ");
                        breakdownHtml = `<div class="eval-word-breakdown">${chips}</div>`;
                    }

                    const heard = result.spoken ? ` · heard “${AudioHelper.escapeHtml(result.spoken)}”` : "";
                    resultEl.innerHTML = `<span class="eval-score-text">${result.score}% · ${result.gradeLabel}${heard}</span>${breakdownHtml}`;
                    AudioHelper.practiceResults.set(AudioHelper.getPracticeKey(text, language), result);
                },
                onError(message) {
                    if (!resultEl) {
                        return;
                    }
                    resultEl.hidden = false;
                    resultEl.classList.remove("is-listening");
                    resultEl.className = resultEl.className
                        .replace(/\beval-score-\w+/g, "")
                        .trim();
                    resultEl.classList.add("is-error");
                    resultEl.textContent = message || "Speech recognition failed.";
                }
            });
        },

        getPracticeKey(text, language) {
            return `${AudioHelper.normalizeSpeechText(text)}|${String(language || "en-US").toLowerCase()}`;
        },

        clearPracticeResults() {
            AudioHelper.practiceResults.clear();
        },

        restorePracticeResult(root, text, language) {
            const resultEl = root?.querySelector?.("[data-speech-eval-result]");
            const practiceButton = root?.querySelector?.("[data-eval-speech-text]");
            const practiceText = practiceButton?.dataset?.evalSpeechText || text;
            const practiceLang = practiceButton?.dataset?.evalSpeechLang || language;
            const result = AudioHelper.practiceResults.get(AudioHelper.getPracticeKey(practiceText, practiceLang));
            if (!resultEl || !result) {
                return;
            }

            const breakdownHtml = Array.isArray(result.details) && result.details.length > 1
                ? `<div class="eval-word-breakdown">${result.details.map((detail) => {
                    const cls = detail.matched ? "eval-word-matched" : (detail.closeMatch ? "eval-word-close" : "eval-word-missed");
                    return `<span class="eval-word-chip ${cls}">${AudioHelper.escapeHtml(detail.word)}</span>`;
                }).join(" ")}</div>`
                : "";
            const heard = result.spoken ? ` · heard “${AudioHelper.escapeHtml(result.spoken)}”` : "";
            resultEl.hidden = false;
            resultEl.classList.remove("is-listening", "is-error");
            resultEl.className = resultEl.className.replace(/\beval-score-\w+/g, "").trim();
            resultEl.classList.add(`eval-score-${result.grade}`);
            resultEl.innerHTML = `<span class="eval-score-text">${result.score}% · ${result.gradeLabel}${heard}</span>${breakdownHtml}`;
        },

        setPlayingButton(button) {
            AudioHelper.clearPlayingButtons();
            AudioHelper.activeButton = button || null;
            if (!button) {
                return;
            }

            button.classList.add("is-playing");
            button.setAttribute("aria-pressed", "true");
        },

        clearPlayingButtons() {
            document.querySelectorAll("[data-pronounce-text].is-playing").forEach((button) => {
                button.classList.remove("is-playing");
                button.setAttribute("aria-pressed", "false");
            });
            AudioHelper.activeButton = null;
        },

        setRecordingButton(button) {
            AudioHelper.clearRecordingButtons();
            AudioHelper.activeEvalButton = button || null;
            if (!button) {
                return;
            }

            button.classList.add("is-recording");
            button.setAttribute("aria-pressed", "true");
            const label = button.querySelector("[data-eval-label]");
            if (label) {
                label.textContent = "Listening…";
            }
        },

        clearRecordingButtons() {
            document.querySelectorAll("[data-eval-speech-text].is-recording").forEach((button) => {
                button.classList.remove("is-recording");
                button.setAttribute("aria-pressed", "false");
                const label = button.querySelector("[data-eval-label]");
                if (label) {
                    label.textContent = "Practice";
                }
            });
            AudioHelper.activeEvalButton = null;
        },

        getFreeTtsUrl(text, language = "en-US") {
            const clean = String(text || "").trim();
            if (!clean) {
                return "";
            }
            const langCode = String(language || "en-US").toLowerCase().startsWith("en-gb") ? "en-GB" : "en";
            return `https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&tl=${encodeURIComponent(langCode)}&q=${encodeURIComponent(clean)}`;
        },

        async playPronunciation({ text, audioUrl, language, rate = 0.95, voiceURI = "", button = null }) {
            AudioHelper.stopPronunciation();
            AudioHelper.setPlayingButton(button || document.activeElement?.closest?.("[data-pronounce-text]"));

            let finished = false;
            const finish = () => {
                if (finished) {
                    return;
                }
                finished = true;
                AudioHelper.clearPlayingButtons();
            };

            const playAudioUrl = (url) => new Promise((resolve) => {
                const clip = new Audio(url);
                AudioHelper.activeAudio = clip;
                clip.playbackRate = Number.isFinite(rate) && rate > 0 ? rate : 1;

                const onEnded = () => {
                    if (AudioHelper.activeAudio === clip) {
                        AudioHelper.activeAudio = null;
                    }
                    finish();
                    resolve(true);
                };

                const onError = () => {
                    if (AudioHelper.activeAudio === clip) {
                        AudioHelper.activeAudio = null;
                    }
                    resolve(false);
                };

                clip.addEventListener("ended", onEnded, { once: true });
                clip.addEventListener("error", onError, { once: true });

                clip.play().then(() => {
                    // Playback started successfully.
                }).catch(() => {
                    if (AudioHelper.activeAudio === clip) {
                        AudioHelper.activeAudio = null;
                    }
                    resolve(false);
                });
            });

            // 1. Highest priority: Try provided dictionary audio URL (e.g. api.dictionaryapi.dev)
            const cleanAudioUrl = String(audioUrl || "").trim();
            if (cleanAudioUrl) {
                const played = await playAudioUrl(cleanAudioUrl);
                if (played) {
                    return;
                }
            }

            // 2. Free keyless remote audio fallback (Google Translate TTS CDN)
            const googleTtsUrl = AudioHelper.getFreeTtsUrl(text, language);
            if (googleTtsUrl && typeof navigator !== "undefined" && navigator.onLine !== false) {
                const playedGoogle = await playAudioUrl(googleTtsUrl);
                if (playedGoogle) {
                    return;
                }
            }

            // 3. Free native offline fallback (Web Speech API)
            AudioHelper.speakWithSynthesis(text, language, rate, voiceURI, finish);
        },

        speakWithSynthesis(text, language, rate = 0.95, voiceURI = "", onDone = () => {}) {
            const cleanText = String(text || "").trim();
            if (!window.speechSynthesis || !cleanText) {
                onDone();
                return;
            }

            if (AudioHelper.speechStartTimer) {
                window.clearTimeout(AudioHelper.speechStartTimer);
                AudioHelper.speechStartTimer = null;
            }

            // Always delay speak() slightly after stopPronunciation() / cancel()
            // so Chromium's audio backend has time to process the cancellation without
            // swallowing the incoming utterance.
            AudioHelper.speechStartTimer = window.setTimeout(() => {
                AudioHelper.speechStartTimer = null;
                try {
                    if (window.speechSynthesis.paused) {
                        window.speechSynthesis.resume();
                    }

                    const utterance = new SpeechSynthesisUtterance(cleanText);
                    AudioHelper.activeUtterance = utterance;
                    if (language) {
                        utterance.lang = language;
                    }
                    utterance.rate = Number.isFinite(rate) && rate > 0 ? rate : 0.95;
                    const voices = typeof window.speechSynthesis.getVoices === "function"
                        ? window.speechSynthesis.getVoices()
                        : [];
                    if (voiceURI && voices.length) {
                        const voice = voices.find((item) => item.voiceURI === voiceURI);
                        if (voice) {
                            utterance.voice = voice;
                        }
                    }

                    let completed = false;
                    const complete = () => {
                        if (completed) {
                            return;
                        }
                        completed = true;
                        if (AudioHelper.activeUtterance === utterance) {
                            AudioHelper.activeUtterance = null;
                        }
                        onDone();
                    };

                    utterance.onend = complete;
                    utterance.onerror = complete;
                    window.speechSynthesis.speak(utterance);
                    if (window.speechSynthesis.paused) {
                        window.speechSynthesis.resume();
                    }
                } catch (_error) {
                    AudioHelper.activeUtterance = null;
                    onDone();
                }
            }, 60);
        },

        evaluateSpeech({ text, language = "en-US", button = null, onStart = () => {}, onResult = () => {}, onError = () => {} }) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                onError("Speech recognition is not supported in this browser.");
                return;
            }

            const target = String(text || "").trim();
            if (!target) {
                onError("Nothing to practice.");
                return;
            }

            AudioHelper.stopPronunciation();

            if (AudioHelper.activeRecognition) {
                try {
                    AudioHelper.activeRecognition.abort();
                } catch (_error) {
                    // Ignore abort races.
                }
                AudioHelper.activeRecognition = null;
            }

            const recognition = new SpeechRecognition();
            recognition.lang = language || "en-US";
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;
            recognition.continuous = false;

            AudioHelper.activeRecognition = recognition;
            AudioHelper.setRecordingButton(button);

            recognition.onstart = () => {
                onStart();
            };

            recognition.onresult = (event) => {
                const spoken = String(event?.results?.[0]?.[0]?.transcript || "").trim();
                const result = AudioHelper.calculateSpeechScore(target, spoken);
                const gradeInfo = AudioHelper.getScoreGrade(result.score);
                onResult({
                    target,
                    spoken,
                    score: result.score,
                    details: result.details,
                    grade: gradeInfo.grade,
                    gradeLabel: gradeInfo.label
                });
            };

            recognition.onerror = (event) => {
                const errorType = String(event?.error || "");
                let message = "Speech recognition failed.";
                if (errorType === "not-allowed" || errorType === "service-not-allowed") {
                    message = "Microphone permission denied.";
                } else if (errorType === "no-speech") {
                    message = "No speech detected. Try again.";
                } else if (errorType === "audio-capture") {
                    message = "No microphone found.";
                } else if (errorType === "network") {
                    message = "Speech recognition network error.";
                } else if (errorType === "aborted") {
                    message = "";
                }

                if (message) {
                    onError(message);
                }
            };

            recognition.onend = () => {
                if (AudioHelper.activeRecognition === recognition) {
                    AudioHelper.activeRecognition = null;
                }
                AudioHelper.clearRecordingButtons();
            };

            try {
                recognition.start();
            } catch (_error) {
                AudioHelper.activeRecognition = null;
                AudioHelper.clearRecordingButtons();
                onError("Unable to start speech recognition.");
            }
        },

        calculateSpeechScore(target, spoken) {
            const normTarget = AudioHelper.normalizeSpeechText(target);
            const normSpoken = AudioHelper.normalizeSpeechText(spoken);

            if (!normTarget) {
                return { score: 0, details: [], spoken: "" };
            }
            if (!normSpoken) {
                return { score: 0, details: [], spoken: "" };
            }
            if (normTarget === normSpoken) {
                return { score: 100, details: normTarget.split(/\s+/).map((w) => ({ word: w, matched: true })), spoken: normSpoken };
            }

            const targetWords = normTarget.split(/\s+/).filter(Boolean);
            const spokenWords = normSpoken.split(/\s+/).filter(Boolean);
            const remaining = [...spokenWords];

            // Per-word breakdown
            const details = targetWords.map((word) => {
                const idx = remaining.indexOf(word);
                if (idx >= 0) {
                    remaining.splice(idx, 1);
                    return { word, matched: true };
                }
                // Check near-matches via Levenshtein for single words
                const closeMatch = spokenWords.some(
                    (sw) => AudioHelper.levenshteinDistance(word, sw) <= Math.max(1, Math.floor(word.length * 0.3))
                );
                return { word, matched: false, closeMatch };
            });

            const matchedCount = details.filter((d) => d.matched).length;
            const wordScore = targetWords.length > 0
                ? Math.round((matchedCount / targetWords.length) * 100)
                : 0;

            const distance = AudioHelper.levenshteinDistance(normTarget, normSpoken);
            const maxLength = Math.max(normTarget.length, normSpoken.length) || 1;
            const charScore = Math.max(0, Math.round((1 - distance / maxLength) * 100));

            return {
                score: Math.max(wordScore, charScore),
                details,
                spoken: normSpoken
            };
        },

        normalizeSpeechText(value) {
            return String(value || "")
                .toLowerCase()
                .normalize("NFD")
                .replace(/[̀-ͯ]/g, "")
                .replace(/[^a-z0-9'\s-]/g, " ")
                .replace(/\s+/g, " ")
                .trim();
        },

        levenshteinDistance(a, b) {
            const left = String(a || "");
            const right = String(b || "");
            if (left === right) {
                return 0;
            }
            if (!left.length) {
                return right.length;
            }
            if (!right.length) {
                return left.length;
            }

            const rows = left.length + 1;
            const cols = right.length + 1;
            const matrix = Array.from({ length: rows }, () => new Array(cols).fill(0));

            for (let i = 0; i < rows; i += 1) {
                matrix[i][0] = i;
            }
            for (let j = 0; j < cols; j += 1) {
                matrix[0][j] = j;
            }

            for (let i = 1; i < rows; i += 1) {
                for (let j = 1; j < cols; j += 1) {
                    const cost = left[i - 1] === right[j - 1] ? 0 : 1;
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j - 1] + cost
                    );
                }
            }

            return matrix[left.length][right.length];
        },

        getScoreGrade(score) {
            const value = Number(score) || 0;
            if (value >= 90) {
                return { grade: "excellent", label: "Excellent" };
            }
            if (value >= 70) {
                return { grade: "good", label: "Good" };
            }
            if (value >= 50) {
                return { grade: "fair", label: "Almost there" };
            }
            return { grade: "poor", label: "Try again" };
        },

        stopPronunciation() {
            if (AudioHelper.speechStartTimer) {
                window.clearTimeout(AudioHelper.speechStartTimer);
                AudioHelper.speechStartTimer = null;
            }

            if (AudioHelper.activeAudio) {
                AudioHelper.activeAudio.pause();
                AudioHelper.activeAudio.currentTime = 0;
                AudioHelper.activeAudio = null;
            }

            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }

            if (AudioHelper.activeRecognition) {
                try {
                    AudioHelper.activeRecognition.abort();
                } catch (_error) {
                    // Ignore abort races.
                }
                AudioHelper.activeRecognition = null;
            }

            AudioHelper.activeUtterance = null;
            AudioHelper.clearPlayingButtons();
            AudioHelper.clearRecordingButtons();
        }
    };

    // Add escapeHtml for the per-word breakdown rendering
    AudioHelper.escapeHtml = function (value) {
        if (value == null) return "";
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    };

    global.DictionaryHelperAudio = AudioHelper;
})(typeof window !== "undefined" ? window : globalThis);
