import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const appDir = path.resolve("app");
const page = fs.readFileSync(path.join(appDir, "page.tsx"), "utf8");

test("landing shows microwave before and after LumirAI image transformation", () => {
  assert.match(page, /Kuchenka mikrofalowa/i);
  assert.match(page, /PRZED/);
  assert.match(page, /PO LUMIRAI/);
  assert.match(page, /RGB 255/);
});

test("landing explains all generated offer artifacts", () => {
  for (const label of ["OPISY PRODUKTOWE", "ATRYBUTY PRODUKTU"]) {
    assert.match(page, new RegExp(label, "i"));
  }
  assert.match(page, /Tytu/);
  assert.match(page, /Zdj/);
});

test("landing uses draggable before-after sliders for each artifact", () => {
  assert.match(page, /function CompareSlider/);
  assert.match(page, /variant === "photos"/);
  for (const copy of ["Masz 10", "Allegro Analytics", "Google Trends", "Format 2560"]) {
    assert.match(page, new RegExp(copy, "i"));
  }
});

test("landing before-after sliders use full range professional handle", () => {
  assert.match(page, /function getSliderPercentFromClientX/);
  assert.match(page, /Math\.max\(0, Math\.min\(100/);
  assert.match(page, /compare-slider-handle/);
  assert.match(page, /--handle-x/);
  assert.doesNotMatch(page, /next >= 82/);
  assert.doesNotMatch(page, /next <= 18/);
});

test("landing photo comparison uses the same fixed-layer slider as text sections", () => {
  assert.doesNotMatch(page, /<BeforeAfterSlider \/>/);
  assert.match(page, /<CompareSlider before=\{item\.before\} after=\{item\.after\} variant=\{item\.variant\}/);
  assert.match(page, /className="absolute inset-0 bg-white"/);
});

test("landing is wired for exact microwave photo assets", () => {
  assert.match(page, /\/landing\/microwave-before\.png/);
  assert.match(page, /\/landing\/microwave-after\.png/);
  for (const file of ["microwave-before.png", "microwave-after.png"]) {
    assert.equal(fs.existsSync(path.resolve("public", "landing", file)), true, `${file} missing`);
  }
});

test("landing hero has isolated fluid background and cursor glow", () => {
  assert.match(page, /function HeroFluidBackground/);
  assert.match(page, /hero-fluid-section/);
  assert.match(page, /cursor-glow/);
  assert.match(page, /handleHeroPointerMove/);
  assert.match(page, /linear-gradient\(120deg, #1cc8ff/);
});

test("landing hero uses wave background with readable foreground", () => {
  for (const token of ["hero-wave-band", "hero-orbit-ring", "hero-dot-grid", "hero-ring-row"]) {
    assert.match(page, new RegExp(token));
  }
  assert.match(page, /text-white drop-shadow/);
  assert.match(page, /text-white\/85/);
  assert.match(page, /border-white\/45/);
  assert.match(page, /bg-slate-950\/30/);
});
