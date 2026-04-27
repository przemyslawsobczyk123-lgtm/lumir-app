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
