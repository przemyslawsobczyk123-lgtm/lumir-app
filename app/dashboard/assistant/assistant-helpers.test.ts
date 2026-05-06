import assert from "node:assert/strict";
import test from "node:test";

import {
  ASSISTANT_QUICK_PROMPTS,
  buildAssistantRequest,
  getAssistantStatusTone,
  normalizeAssistantResponse,
} from "./assistant-helpers.ts";

test("buildAssistantRequest trims message and keeps short chat history", () => {
  const request = buildAssistantRequest({
    message: "  pokaż produkty do poprawy  ",
    messages: [
      { role: "assistant", content: "start" },
      { role: "user", content: "a" },
      { role: "assistant", content: "b" },
      { role: "user", content: "c" },
      { role: "assistant", content: "d" },
      { role: "user", content: "e" },
      { role: "assistant", content: "f" },
    ],
  });

  assert.equal(request.message, "pokaż produkty do poprawy");
  assert.deepEqual(request.history, [
    { role: "assistant", content: "b" },
    { role: "user", content: "c" },
    { role: "assistant", content: "d" },
    { role: "user", content: "e" },
    { role: "assistant", content: "f" },
  ]);
});

test("normalizeAssistantResponse accepts backend data envelope", () => {
  const response = normalizeAssistantResponse({
    success: true,
    data: {
      reply: "Masz 3 produkty do poprawy.",
      suggestions: [{ label: "Popraw produkty", prompt: "co poprawić?" }],
      actions: [{ label: "Produkty", href: "/dashboard/products" }],
    },
  });

  assert.equal(response.reply, "Masz 3 produkty do poprawy.");
  assert.equal(response.suggestions[0].label, "Popraw produkty");
  assert.equal(response.actions[0].href, "/dashboard/products");
});

test("assistant quick prompts cover core LuMir workflows", () => {
  const prompts = ASSISTANT_QUICK_PROMPTS.map((item) => item.prompt).join(" ");

  assert.match(prompts, /produkty/i);
  assert.match(prompts, /import/i);
  assert.match(prompts, /eksport/i);
  assert.match(prompts, /kredyt/i);
});

test("getAssistantStatusTone maps connected state to visible tone", () => {
  assert.equal(getAssistantStatusTone("online"), "bg-emerald-400");
  assert.equal(getAssistantStatusTone("thinking"), "bg-amber-400");
  assert.equal(getAssistantStatusTone("error"), "bg-rose-400");
});
