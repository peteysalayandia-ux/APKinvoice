import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Invoice Pocket app shell and PWA metadata", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Invoice Pocket<\/title>/i);
  assert.match(html, /Opening Invoice Pocket/);
  assert.match(html, /rel="manifest" href="\/manifest\.webmanifest"/);
  assert.match(html, /name="theme-color" content="#173c36"/);
  assert.match(html, /href="\/icon-192\.png"/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("includes local invoices, automatic totals, sharing, and offline support", async () => {
  const [app, manifest, serviceWorker, packageJson] = await Promise.all([
    readFile(new URL("../app/InvoiceApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"),
    readFile(new URL("../public/sw.js", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(app, /localStorage\.setItem/);
  assert.match(app, /navigator\.share/);
  assert.match(app, /window\.print/);
  assert.match(app, /invoiceTotal/);
  assert.match(app, /serviceWorker\.register/);
  assert.match(app, /customerName/);
  assert.match(app, /hoursWorked/);
  assert.match(app, /hourlyRate/);
  assert.match(app, /paymentStatus/);

  const parsedManifest = JSON.parse(manifest);
  assert.equal(parsedManifest.name, "Invoice Pocket");
  assert.equal(parsedManifest.display, "standalone");
  assert.deepEqual(
    parsedManifest.icons.map((icon) => icon.sizes),
    ["192x192", "512x512"],
  );

  assert.match(serviceWorker, /caches\.open/);
  assert.match(serviceWorker, /event\.request\.mode === "navigate"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
