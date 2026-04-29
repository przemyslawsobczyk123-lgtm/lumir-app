export type ProductListPrimaryAction = {
  key: "add-product";
  label: string;
  href: "/dashboard/new-product";
};

export function getProductListPrimaryActions(labels: {
  addProduct: string;
  importProducts?: string;
}): ProductListPrimaryAction[] {
  return [
    { key: "add-product", label: labels.addProduct, href: "/dashboard/new-product" },
  ];
}

export type ProductPaginationToken = number | "ellipsis-start" | "ellipsis-end";

export function getProductPaginationWindow(page: number, totalPages: number): ProductPaginationToken[] {
  const total = Math.max(0, Math.floor(totalPages));
  const current = Math.min(Math.max(1, Math.floor(page)), Math.max(1, total));

  if (total <= 7) {
    return Array.from({ length: total }, (_value, index) => index + 1);
  }

  let start = Math.max(2, current - 2);
  let end = Math.min(total - 1, current + 2);

  if (current <= 4) {
    start = 2;
    end = 6;
  } else if (current >= total - 3) {
    start = total - 5;
    end = total - 1;
  }

  const pages: ProductPaginationToken[] = [1];
  if (start > 2) pages.push("ellipsis-start");
  for (let value = start; value <= end; value += 1) pages.push(value);
  if (end < total - 1) pages.push("ellipsis-end");
  pages.push(total);
  return pages;
}
