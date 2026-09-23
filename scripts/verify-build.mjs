import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const outputs = {
  chrome: '.output/chrome-mv3',
  firefox: '.output/firefox-mv3',
};

function fail(message) {
  throw new Error(`Build verification failed: ${message}`);
}

function readManifest(browser) {
  const directory = outputs[browser];
  const path = join(directory, 'manifest.json');
  if (!existsSync(path)) fail(`${browser} manifest is missing at ${path}`);
  return JSON.parse(readFileSync(path, 'utf8'));
}

function filesUnder(directory, root = directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path, root) : [path.slice(root.length + 1)];
  });
}

const chrome = readManifest('chrome');
const firefox = readManifest('firefox');

for (const [browser, manifest] of Object.entries({ chrome, firefox })) {
  const directory = outputs[browser];
  const files = filesUnder(directory);
  if (!files.length) fail(`${browser} output is empty`);
  if (!manifest.background) fail(`${browser} background entrypoint is missing`);
  if (!manifest.content_scripts?.some((entry) => entry.js?.includes('content-scripts/content.js'))) {
    fail(`${browser} content script entrypoint is missing`);
  }
  const contentScript = readFileSync(join(directory, 'content-scripts/content.js'), 'utf8');
  if (contentScript.includes('createRoot(')) {
    fail(`${browser} content script eagerly includes the overlay runtime`);
  }
  if (!readFileSync(join(directory, 'assets/overlay-app.js'), 'utf8').includes('__dictionaryAssistantOverlay')) {
    fail(`${browser} overlay runtime bridge is missing`);
  }
  if (!files.includes('index.html') || !files.includes('options.html')) {
    fail(`${browser} workbench pages are missing`);
  }
  if (manifest.options_ui?.open_in_tab !== true) {
    fail(`${browser} options page must open in a tab`);
  }
  if (!existsSync(join(directory, 'overlay-app.html')) || !existsSync(join(directory, 'assets/overlay-app.js'))) {
    fail(`${browser} lazy overlay entrypoint is missing`);
  }
  if (!manifest.host_permissions?.includes('https://api.dictionaryapi.dev/*')) {
    fail(`${browser} host permissions are incomplete`);
  }
}

if (!chrome.permissions.includes('offscreen')) fail('Chrome must retain offscreen permission');
if (firefox.permissions.includes('offscreen')) fail('Firefox must not request offscreen permission');
if (chrome.browser_specific_settings || !firefox.browser_specific_settings?.gecko?.id) {
  fail('browser-specific Gecko settings are incorrect');
}
if (firefox.browser_specific_settings.gecko.strict_min_version !== '140.0') {
  fail('Firefox desktop minimum version must be 140.0');
}
if (firefox.browser_specific_settings.gecko_android?.strict_min_version !== '142.0') {
  fail('Firefox for Android minimum version must be 142.0');
}
if (!firefox.browser_specific_settings.gecko.data_collection_permissions?.required?.includes('websiteContent')) {
  fail('Firefox website-content collection declaration is missing');
}
if (!chrome.web_accessible_resources?.some((entry) => entry.resources?.includes('assets/overlay.css'))) {
  fail('overlay stylesheet is not web-accessible');
}
if (!chrome.web_accessible_resources?.some((entry) => entry.resources?.includes('chunks/*.js'))) {
  fail('overlay dependency chunks are not web-accessible');
}

console.log('Build verification passed for Chrome MV3 and Firefox MV3.');
