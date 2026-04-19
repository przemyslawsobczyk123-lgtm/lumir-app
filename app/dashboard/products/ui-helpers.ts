const AUTO_ASSIGN_MARKETPLACES = new Set(["mediaexpert", "empik"]);

export type ProductListingFocus = "all" | "ready" | "review" | "blocked";
export type ProductIntegration = { slug: string; name: string; missing: number; categoryPath: string };
export type ProductExportPreflightRow = {
  id: number;
  title: string;
  status: "ready" | "blocked";
  reason: "marketplace_not_mapped" | "missing_attributes" | "category_missing" | null;
  missing: number;
  categoryPath: string;
};
export type ProductExportCategoryGroup = {
  categoryPath: string;
  productIds: number[];
  count: number;
};

type ProductListingInput = {
  status: string;
  integrations: string | null;
};

export function hasActiveProductFilters(search: string, statusFilter: string, marketplaceFilter: string) {
  return Boolean(search.trim() || statusFilter || marketplaceFilter);
}

export function canAutoAssignCategory(marketplaceSlug?: string | null) {
  return Boolean(marketplaceSlug && AUTO_ASSIGN_MARKETPLACES.has(marketplaceSlug));
}

export function getDraftCategoryHint(selectedCategory: string, marketplaceSlug?: string | null) {
  if (selectedCategory) return null;
  if (!canAutoAssignCategory(marketplaceSlug)) return null;
  return "Brak recznej kategorii. AI sprobuje przypisac kategorie automatycznie przy trafnosci >= 90%.";
}

export function parseProductIntegrations(raw: string | null): ProductIntegration[] {
  if (!raw) return [];
  return raw.split("|||").filter(Boolean).map((item) => {
    const parts = item.split("\x01");
    return {
      slug: parts[0] ?? "",
      name: parts[1] ?? parts[0] ?? "",
      missing: parseInt(parts[2] ?? "0", 10) || 0,
      categoryPath: parts[3] ?? "",
    };
  });
}

export function getProductListingState(input: ProductListingInput) {
  const integrations = parseProductIntegrations(input.integrations);
  const readyMarketplaceCount = integrations.filter((integration) => integration.missing === 0).length;
  const missingMarketplaceCount = integrations.filter((integration) => integration.missing > 0).length;
  const integrationCount = integrations.length;

  if (input.status === "needs_review") {
    return {
      focus: "review" as const,
      blockerKind: null,
      readyMarketplaceCount,
      missingMarketplaceCount,
      integrationCount,
    };
  }

  if (!integrationCount) {
    return {
      focus: "blocked" as const,
      blockerKind: "unmapped" as const,
      readyMarketplaceCount,
      missingMarketplaceCount,
      integrationCount,
    };
  }

  if (readyMarketplaceCount > 0) {
    return {
      focus: "ready" as const,
      blockerKind: null,
      readyMarketplaceCount,
      missingMarketplaceCount,
      integrationCount,
    };
  }

  return {
    focus: "blocked" as const,
    blockerKind: "attributes" as const,
    readyMarketplaceCount,
    missingMarketplaceCount,
    integrationCount,
  };
}

export function getProductListingStats<T extends ProductListingInput>(products: T[]) {
  return products.reduce(
    (acc, product) => {
      const state = getProductListingState(product);
      acc.all += 1;
      acc[state.focus] += 1;
      if (state.blockerKind === "unmapped") acc.unmapped += 1;
      if (state.blockerKind === "attributes") acc.attributesMissing += 1;
      return acc;
    },
    {
      all: 0,
      ready: 0,
      review: 0,
      blocked: 0,
      unmapped: 0,
      attributesMissing: 0,
    }
  );
}

export function filterProductsByListingFocus<T extends ProductListingInput>(products: T[], focus: ProductListingFocus) {
  if (focus === "all") return products;
  return products.filter((product) => getProductListingState(product).focus === focus);
}

export function getProductExportPreflight<T extends { id: number; title?: string | null; integrations: string | null }>(
  products: T[],
  selectedIds: number[],
  marketplaceSlug: string
): ProductExportPreflightRow[] {
  return selectedIds.reduce<ProductExportPreflightRow[]>((rows, selectedId) => {
    const product = products.find((item) => item.id === selectedId);
    if (!product) return rows;

    const integration = parseProductIntegrations(product.integrations).find((item) => item.slug === marketplaceSlug);
    if (!integration) {
      rows.push({
        id: product.id,
        title: product.title || `ID ${product.id}`,
        status: "blocked",
        reason: "marketplace_not_mapped",
        missing: 0,
        categoryPath: "",
      });
      return rows;
    }

    if (integration.missing > 0) {
      rows.push({
        id: product.id,
        title: product.title || `ID ${product.id}`,
        status: "blocked",
        reason: "missing_attributes",
        missing: integration.missing,
        categoryPath: integration.categoryPath,
      });
      return rows;
    }

    if (!integration.categoryPath.trim()) {
      rows.push({
        id: product.id,
        title: product.title || `ID ${product.id}`,
        status: "blocked",
        reason: "category_missing",
        missing: 0,
        categoryPath: "",
      });
      return rows;
    }

    rows.push({
      id: product.id,
      title: product.title || `ID ${product.id}`,
      status: "ready",
      reason: null,
      missing: 0,
      categoryPath: integration.categoryPath,
    });
    return rows;
  }, []);
}

export function getProductExportSummary(rows: ProductExportPreflightRow[]) {
  const readyCategorySet = new Set<string>();

  return rows.reduce(
    (acc, row) => {
      acc.total += 1;
      if (row.status === "ready") {
        acc.ready += 1;
        if (row.categoryPath) readyCategorySet.add(row.categoryPath);
      } else {
        acc.blocked += 1;
        if (row.reason === "missing_attributes") acc.missingAttributes += 1;
        if (row.reason === "marketplace_not_mapped") acc.notMapped += 1;
        if (row.reason === "category_missing") acc.categoryMissing += 1;
      }
      acc.readyCategories = readyCategorySet.size;
      acc.mixedCategories = readyCategorySet.size > 1;
      return acc;
    },
    {
      total: 0,
      ready: 0,
      blocked: 0,
      missingAttributes: 0,
      notMapped: 0,
      categoryMissing: 0,
      readyCategories: 0,
      mixedCategories: false,
    }
  );
}

export function getExportableProductIds(rows: ProductExportPreflightRow[], categoryPath?: string) {
  return rows
    .filter((row) => row.status === "ready" && (!categoryPath || row.categoryPath === categoryPath))
    .map((row) => row.id);
}

export function getProductExportCategoryGroups(rows: ProductExportPreflightRow[]) {
  const grouped = rows.reduce<Map<string, ProductExportCategoryGroup>>((acc, row) => {
    if (row.status !== "ready" || !row.categoryPath) return acc;
    const existing = acc.get(row.categoryPath);
    if (existing) {
      existing.productIds.push(row.id);
      existing.count += 1;
      return acc;
    }
    acc.set(row.categoryPath, {
      categoryPath: row.categoryPath,
      productIds: [row.id],
      count: 1,
    });
    return acc;
  }, new Map());

  return [...grouped.values()].sort((left, right) => {
    if (right.count !== left.count) return right.count - left.count;
    return left.categoryPath.localeCompare(right.categoryPath);
  });
}

export function findProductExportCategoryGroup(
  groups: ProductExportCategoryGroup[],
  selectedIds: number[]
) {
  if (!selectedIds.length) return null;
  const selectedSorted = [...selectedIds].sort((left, right) => left - right);

  for (const group of groups) {
    if (group.productIds.length !== selectedSorted.length) continue;
    const groupSorted = [...group.productIds].sort((left, right) => left - right);
    const sameIds = groupSorted.every((id, index) => id === selectedSorted[index]);
    if (sameIds) return group;
  }

  return null;
}
