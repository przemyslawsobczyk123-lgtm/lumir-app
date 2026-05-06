import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const appDir = path.resolve("app");
const publicDir = path.resolve("public");
const logoVersion = "outlined-20260506";
const versionedLogoPath = `/lumir-icon.svg?v=${logoVersion}`;

function read(relativePath: string) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

test("LuMir brand assets use the new LM mark", () => {
  for (const file of [path.join(publicDir, "lumir-icon.svg"), path.join(appDir, "icon.svg")]) {
    const svg = fs.readFileSync(file, "utf8");
    assert.match(svg, /data-brand="lumir-logo"/);
    assert.match(svg, /data-part="logo-border"/);
    assert.match(svg, /data-part="lm-monogram"/);
    assert.match(svg, /data-part="purple-dot"/);
    assert.match(svg, /fill="#f8fafc"/);
    assert.match(svg, /stroke="#111827"/);
    assert.doesNotMatch(svg, /data-old-l-shape/);
    assert.doesNotMatch(svg, /<rect width="100" height="100" rx="22" fill="#050509"/);
  }
});

test("visible brand surfaces use shared LuMir logo and wordmark", () => {
  const surfaces = [
    "app/page.tsx",
    "app/dashboard/layout.tsx",
    "app/login/page.tsx",
    "app/register/page.tsx",
    "app/forgot-password/page.tsx",
    "app/reset-password/page.tsx",
    "app/legal-page.tsx",
  ];

  for (const file of surfaces) {
    const content = read(file);
    assert.match(content, /LuMir/);
    assert.match(content, new RegExp(`lumir-icon\\.svg\\?v=${logoVersion}`));
    assert.doesNotMatch(content, /src="\/lumir-icon\.svg"/);
    assert.doesNotMatch(content, /font-brand/);
  }
});

test("landing brand no longer renders the old lightning logo", () => {
  const page = read("app/page.tsx");
  assert.doesNotMatch(page, /M13 10V3L4 14h7v7l9-11h-7Z/);
  assert.match(page, new RegExp(`<Image src="${versionedLogoPath.replace("/", "\\/").replace("?", "\\?")}" alt="LuMir"`));
});
