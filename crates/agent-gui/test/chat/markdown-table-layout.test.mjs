import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const markdownSource = fs.readFileSync(
  new URL("../../../agent-ui/src/components/Markdown.tsx", import.meta.url),
  "utf8",
);

test("Markdown tables keep the first column wide enough for short dates", () => {
  assert.match(markdownSource, /\[&_th:first-child\]:min-w-\[5rem\]/);
  assert.match(markdownSource, /\[&_th:first-child\]:whitespace-nowrap/);
  assert.match(markdownSource, /\[&_td:first-child\]:min-w-\[5rem\]/);
  assert.match(markdownSource, /\[&_td:first-child\]:whitespace-nowrap/);
});
