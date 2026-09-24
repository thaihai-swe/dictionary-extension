# Dictionary provider fixtures

These fixtures capture public provider response shapes for three representative
English terms:

- `run` — highly polysemous; includes disambiguation and low-vote slang data.
- `ghost` — noun/verb meanings, slang, encyclopedia, and sentence examples.
- `serendipity` — a focused noun with learner-oriented examples.
- `intensive` — regression coverage for bilingual Wiktionary full-page parsing
  and Urban Dictionary entries without vote metadata.

Each term contains one JSON response-shape fixture per registered dictionary
provider. The fixtures preserve the provider fields consumed by the adapters.

| File | Provider endpoint shape |
| --- | --- |
| `wiktionary.json` | English Wiktionary REST definition response (`en` sections) |
| `free_dictionary.json` | Dictionary API array of entries/meanings |
| `datamuse.json` | Datamuse word-definition array (`defs`, `tags`) |
| `rhymebrain.json` | RhymeBrain word-info object (`ipa`, `pron`) |
| `urban_dictionary.json` | Urban Dictionary `{ list: [...] }` response |
| `wiktionary_bilingual.json` | Vietnamese Wiktionary MediaWiki extract response |
| `wikipedia.json` | English Wikipedia REST summary response (`/page/summary`) |
| `wikidata.json` | Wikidata entity search response (`wbsearchentities`) |
| `tatoeba.json` | Tatoeba sentence example and translation response (`/api_v0/search`) |

The extension reports `contributed` only when the adapter turns a response into
usable dictionary data. A provider can return HTTP 200 and still be marked
`not_found` when the payload is a disambiguation page, has no usable extract,
or fails provider-specific quality filtering. This keeps source provenance
honest while retaining the raw response here for adapter development.

Fixtures were fetched with target language `vi` on 2026-09-18. Provider
responses are external data and may include timestamps, URLs, or licensed
content; refresh them deliberately when provider schemas change.

The `intensive` bilingual fixture stores the MediaWiki `revisions` fallback
response, while `intensive/wiktionary_bilingual_extract.json` records the empty
intro response that originally exposed the adapter gap.
