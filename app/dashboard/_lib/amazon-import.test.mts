import test from "node:test";
import assert from "node:assert/strict";

import {
  applyAmazonCatalogItemToProductForm,
} from "./amazon-import.ts";

test("applyAmazonCatalogItemToProductForm maps Amazon payload into product form fields", () => {
  const result = applyAmazonCatalogItemToProductForm(
    {
      title: "",
      brand: "",
      asin: "",
      ean: "",
      desc: "",
      descHtml: "",
      globalSlots: Array.from({ length: 4 }, () => null),
    },
    {
      title: "Monitor 27 cali",
      brand: "Lumir",
      asin: "B012345678",
      ean: "5901234567890",
      descriptionHtml: "<p>Opis <strong>Amazon</strong></p>",
      images: [
        "https://cdn.example.com/1.jpg",
        "https://cdn.example.com/2.jpg",
      ],
    },
    4
  );

  assert.deepEqual(result, {
    title: "Monitor 27 cali",
    brand: "Lumir",
    asin: "B012345678",
    ean: "5901234567890",
    desc: "Opis Amazon",
    descHtml: "<p>Opis <strong>Amazon</strong></p>",
    globalSlots: [
      "https://cdn.example.com/1.jpg",
      "https://cdn.example.com/2.jpg",
      null,
      null,
    ],
  });
});

test("applyAmazonCatalogItemToProductForm preserves existing values when Amazon payload omits fields", () => {
  const result = applyAmazonCatalogItemToProductForm(
    {
      title: "Istniejacy produkt",
      brand: "Marka",
      asin: "OLDASIN",
      ean: "1234567890123",
      desc: "Istniejacy opis",
      descHtml: "<p>Istniejacy opis</p>",
      globalSlots: [
        "https://cdn.example.com/existing-1.jpg",
        "https://cdn.example.com/existing-2.jpg",
        null,
      ],
    },
    {
      brand: "Nowa marka",
      images: ["https://cdn.example.com/new-1.jpg"],
    },
    3
  );

  assert.deepEqual(result, {
    title: "Istniejacy produkt",
    brand: "Nowa marka",
    asin: "OLDASIN",
    ean: "1234567890123",
    desc: "Istniejacy opis",
    descHtml: "<p>Istniejacy opis</p>",
    globalSlots: [
      "https://cdn.example.com/new-1.jpg",
      "https://cdn.example.com/existing-2.jpg",
      null,
    ],
  });
});
