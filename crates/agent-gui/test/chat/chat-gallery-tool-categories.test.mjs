import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(relativePath) {
  return fs.readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const scenariosSource = read("../../src/dev/chat-gallery/scenarios.ts");
const previewSource = read("../../src/dev/chat-gallery/ChatGalleryPreview.tsx");
const pageSource = read("../../src/dev/chat-gallery/ChatGalleryPage.tsx");
const catalogSource = read("../../src/dev/chat-gallery/ToolCategoryGallery.tsx");

test("chat gallery registers a dedicated tool category catalog", () => {
  assert.match(scenariosSource, /id: "tool-categories",\s+group: "tooling"/);
  assert.match(previewSource, /scenarioId === "tool-categories"/);
  assert.match(previewSource, /<ToolCategoryGallery locale=\{locale\} \/>/);
  assert.match(pageSource, /tooling: \{ "zh-CN": "工具与操作"/);
});

test("tool category catalog renders exactly one production group for every category", () => {
  const examplesSource = catalogSource.slice(
    catalogSource.indexOf("export const TOOL_CATEGORY_EXAMPLES"),
  );
  const categories = Array.from(
    examplesSource.matchAll(/category: "(read|search|edit|command|list|agent|other)"/g),
    (match) => match[1],
  );
  assert.deepEqual(categories, ["read", "search", "edit", "command", "list", "agent", "other"]);
  assert.match(catalogSource, /<ToolTraceGroup\s+items=\{example\.items\}/);
  assert.match(catalogSource, /onOpenFileLink=\{handleOpenFileLink\}/);
  assert.match(catalogSource, /"gallery-category-create",\s+"Write"/);
  assert.match(catalogSource, /"gallery-category-edit",\s+"Edit"/);
  assert.match(catalogSource, /"gallery-category-delete",\s+"Delete"/);
  assert.doesNotMatch(catalogSource, /executeTool|invoke\(|fetch\(/);
});
