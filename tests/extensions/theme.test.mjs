import test from "node:test";
import assert from "node:assert/strict";

import {
  getNextThemePreference,
  resolveTheme,
} from "../../src/extensions/theme.mjs";

test("resolveTheme supports system, light and dark preferences", () => {
  assert.equal(resolveTheme("system", true), "dark");
  assert.equal(resolveTheme("system", false), "light");
  assert.equal(resolveTheme("dark", false), "dark");
  assert.equal(resolveTheme("light", true), "light");
});

test("resolveTheme falls back to system for invalid preferences", () => {
  assert.equal(resolveTheme("invalid", true), "dark");
});

test("getNextThemePreference cycles through all three modes", () => {
  assert.equal(getNextThemePreference("system"), "light");
  assert.equal(getNextThemePreference("light"), "dark");
  assert.equal(getNextThemePreference("dark"), "system");
});

