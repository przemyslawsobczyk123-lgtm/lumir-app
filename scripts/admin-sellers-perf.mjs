import fs from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";

import { chromium } from "playwright-core";

import {
  ADMIN_SELLERS_PAGE_SIZE,
  createAdminSellerScaleFixture,
} from "../app/dashboard/admin/sellers/admin-sellers-helpers.ts";

const appUrl = process.env.ADMIN_SELLERS_PERF_URL || "http://localhost:3000/dashboard/admin/sellers";
const chromePath = process.env.PLAYWRIGHT_CHROME_PATH || "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
const sellers = createAdminSellerScaleFixture(400);
const outputDir = path.resolve(process.cwd(), "..", "output");
const screenshotPath = path.join(outputDir, "admin-sellers-perf.png");

function jsonResponse(payload) {
  return {
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(payload),
  };
}

function billingSummary() {
  return {
    data: {
      current: {
        sellerId: 1,
        creditBalance: 496,
        creditsRemaining: 496,
        freeCreditsGranted: 0,
        paidCreditsGranted: 496,
        lifetimeCreditsPurchased: 496,
        lifetimeCreditsUsed: 0,
        billingMode: "paid",
        stripeCustomerId: null,
        lastPaymentAt: null,
      },
      usage: { limit: 496, used: 0, remaining: 496 },
      packs: [],
      aiCosts: { description: 1, attributes: 1, all: 2 },
      starterCredits: 0,
    },
  };
}

async function main() {
  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });

  const adminUser = {
    id: 1,
    name: "Admin Perf",
    email: "admin@lumir.test",
    role: "admin",
    can_view_admin_sellers: true,
    can_impersonate_sellers: true,
    can_grant_admin_permissions: true,
  };
  await page.addInitScript((user) => {
    localStorage.setItem("token", "perf-token");
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("lumir-theme", "light");
  }, adminUser);

  const adminRequests = [];
  await page.route("**/api/admin/sellers?**", async (route) => {
    const url = new URL(route.request().url());
    const pageNumber = Math.max(1, Number.parseInt(url.searchParams.get("page") || "1", 10) || 1);
    const requestedLimit = Math.max(1, Number.parseInt(url.searchParams.get("limit") || String(ADMIN_SELLERS_PAGE_SIZE), 10) || ADMIN_SELLERS_PAGE_SIZE);
    const limit = Math.min(requestedLimit, ADMIN_SELLERS_PAGE_SIZE);
    const offset = (pageNumber - 1) * limit;
    adminRequests.push({ page: pageNumber, requestedLimit, limit, offset });

    await route.fulfill(jsonResponse({
      success: true,
      data: sellers.slice(offset, offset + limit),
      pagination: {
        page: pageNumber,
        limit,
        total: sellers.length,
        totalPages: Math.ceil(sellers.length / limit),
        hasNextPage: pageNumber < Math.ceil(sellers.length / limit),
        hasPrevPage: pageNumber > 1,
      },
      filters: { search: "" },
    }));
  });

  await page.route("**/api/billing/summary**", (route) => route.fulfill(jsonResponse(billingSummary())));
  await page.route("**/api/jobs?scope=active", (route) => route.fulfill(jsonResponse({ success: true, data: [] })));
  await page.route("**/api/seller/allegro/accounts", (route) => route.fulfill(jsonResponse({ success: true, data: [] })));
  await page.route("**/api/seller/amazon/accounts", (route) => route.fulfill(jsonResponse({ success: true, data: [] })));
  await page.route("**/api/seller/amazon/accounts/refresh", (route) => route.fulfill(jsonResponse({ success: true, data: [] })));

  const startedAt = performance.now();
  await page.goto(appUrl, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: /Sprzedawcy|Sellers/ }).waitFor({ timeout: 15_000 });
  await page.locator("tbody tr").first().waitFor({ timeout: 15_000 });
  const loadedAt = performance.now();

  const metrics = await page.evaluate(() => ({
    rows: document.querySelectorAll("tbody tr").length,
    permissionCards: document.querySelectorAll("td label").length,
    permissionIcons: document.querySelectorAll("td label svg").length,
    bodyText: document.body.innerText.slice(0, 500),
    domNodes: document.querySelectorAll("*").length,
  }));

  await fs.mkdir(outputDir, { recursive: true });
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const summary = {
    url: appUrl,
    sellersTotal: sellers.length,
    requestedLimit: adminRequests[0]?.requestedLimit ?? null,
    effectiveLimit: adminRequests[0]?.limit ?? null,
    renderedRows: metrics.rows,
    permissionCards: metrics.permissionCards,
    permissionIcons: metrics.permissionIcons,
    domNodes: metrics.domNodes,
    loadMs: Math.round(loadedAt - startedAt),
    screenshotPath,
  };

  if (summary.renderedRows !== ADMIN_SELLERS_PAGE_SIZE) {
    throw new Error(`Expected ${ADMIN_SELLERS_PAGE_SIZE} rendered rows, got ${summary.renderedRows}`);
  }
  if (summary.effectiveLimit !== ADMIN_SELLERS_PAGE_SIZE) {
    throw new Error(`Expected effective limit ${ADMIN_SELLERS_PAGE_SIZE}, got ${summary.effectiveLimit}`);
  }
  if (summary.permissionIcons < ADMIN_SELLERS_PAGE_SIZE * 4) {
    throw new Error(`Expected visible permission icons for all rows, got ${summary.permissionIcons}`);
  }

  console.log(JSON.stringify(summary, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
