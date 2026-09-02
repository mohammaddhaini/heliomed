import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(file) {
    return fs.readFileSync(path.join(ROOT, file), "utf8");
}

test("header.css defines responsive search button, language toggle, and search slide drawer", () => {
    const css = read("header.css");
    assert.match(css, /\.header-search-btn\s*\{/);
    assert.match(css, /\.language-toggle-btn\s*\{/);
    assert.match(css, /\.search-slide-bar\s*\{/);
    assert.match(css, /\.search-slide-overlay\s*\{/);
    assert.match(css, /\.search-slide-panel\s*\{/);
    assert.match(css, /\.search-slide-form\s*\{/);
    assert.match(css, /\.search-slide-input\s*\{/);
    assert.match(css, /\.search-slide-clear-btn\s*\{/);
    assert.match(css, /\.search-slide-submit-btn\s*\{/);
    assert.match(css, /\.search-slide-tags\s*\{/);
    assert.match(css, /html\.search-slide-lock/);
});

test("responsive.css toggles search button and language toggle on screens <= 900px", () => {
    const css = read("responsive.css");
    assert.match(css, /\.header-search-btn\s*\{[\s\S]*?display:\s*inline-flex/);
    assert.match(css, /\.language-toggle-btn\s*\{[\s\S]*?display:\s*inline-flex/);
    assert.match(css, /\.language-desktop\s*\{[\s\S]*?display:\s*none/);
    assert.match(css, /\.search-box\s*\{[\s\S]*?display:\s*none/);
});

test("rtl.css aligns search drawer and language switcher for Arabic", () => {
    const css = read("rtl.css");
    assert.match(css, /html\[dir="rtl"\]\s+\.search-slide-panel/);
    assert.match(css, /html\[dir="rtl"\]\s+\.search-slide-input/);
    assert.match(css, /html\[dir="rtl"\]\s+\.search-slide-clear-btn/);
});

test("rtl.css configures desktop RTL header with non-overflowing nav triggers and flex constraints", () => {
    const css = read("rtl.css");
    assert.match(css, /html\[dir="rtl"\]\s+\.nav-trigger\s*\{[\s\S]*?white-space:\s*normal/);
    assert.match(css, /html\[dir="rtl"\]\s+\.header-actions\s*\{[\s\S]*?min-width:\s*max-content/);
    assert.match(css, /html\[dir="rtl"\]\s+\.search-box\s*\{[\s\S]*?display:\s*none/);
});


test("header.js implements injection, slide bar open/close, and opposite language switch", () => {
    const js = read("header.js");
    assert.match(js, /function\s+injectResponsiveSearchButton\s*\(/);
    assert.match(js, /function\s+setupLanguageSwitcher\s*\(/);
    assert.match(js, /function\s+updateResponsiveLanguageButton\s*\(/);
    assert.match(js, /function\s+ensureSearchSlideBar\s*\(/);
    assert.match(js, /function\s+openSearchSlideBar\s*\(/);
    assert.match(js, /function\s+closeSearchSlideBar\s*\(/);
    assert.match(js, /header-search-btn/);
    assert.match(js, /search-slide-bar/);
    assert.match(js, /language-toggle-btn/);
});

test("i18n.js has matching keys and aliases for responsive search and language switch", () => {
    const js = read("i18n.js");
    assert.match(js, /"aria\.openSearch":\s*"Open search"/);
    assert.match(js, /"aria\.openSearch":\s*"فتح البحث"/);
    assert.match(js, /"aria\.closeSearch":\s*"Close search"/);
    assert.match(js, /"aria\.closeSearch":\s*"إغلاق البحث"/);
    assert.match(js, /"search\.popularSearches":\s*"Popular Searches"/);
    assert.match(js, /"search\.popularSearches":\s*"الأكثر بحثاً"/);
    assert.match(js, /"Open search":\s*"aria\.openSearch"/);
    assert.match(js, /"Close search":\s*"aria\.closeSearch"/);
});
