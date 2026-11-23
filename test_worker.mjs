import assert from "node:assert/strict";
import worker, { buildCsv, csvCell, scoreAndBuildAutomation } from "./worker.js";

class MemoryKV {
  constructor() {
    this.map = new Map();
  }
  async get(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }
  async put(key, value) {
    this.map.set(key, value);
  }
}

async function runTests() {
  const env = { LEADS_KV: new MemoryKV() };

  // 1. Portfolio HTML renders cleanly with real projects & portrait
  const rHome = await worker.fetch(new Request("https://example.workers.dev/"), env);
  assert.equal(rHome.status, 200);
  const homeHtml = await rHome.text();
  assert.match(homeHtml, /Mohamed Sehli/);
  assert.match(homeHtml, /merchyon\.com/);
  assert.match(homeHtml, /SirajOS/);
  assert.match(homeHtml, /P-Office/);
  assert.match(homeHtml, /Rustlingo/);
  assert.match(homeHtml, /Etsy Spy Pro/);
  assert.match(homeHtml, /\/avatar\.jpg/);

  // 1b. Avatar & Merchyon images serve JPEG bytes
  for (const imgPath of ["/avatar.jpg", "/merchyon.jpg"]) {
    const rImg = await worker.fetch(new Request(`https://example.workers.dev${imgPath}`), env);
    assert.equal(rImg.status, 200);
    assert.equal(rImg.headers.get("Content-Type"), "image/jpeg");
    const imgBuf = await rImg.arrayBuffer();
    assert.ok(imgBuf.byteLength > 5000);
  }

  // 2. Demo HTML renders cleanly
  const rDemo = await worker.fetch(new Request("https://example.workers.dev/demo"), env);
  assert.equal(rDemo.status, 200);
  const demoHtml = await rDemo.text();
  assert.match(demoHtml, /Client Intake/);

  // 3. Health check reports KV bound
  const rHealth = await worker.fetch(new Request("https://example.workers.dev/health"), env);
  assert.equal(rHealth.status, 200);
  const health = await rHealth.json();
  assert.equal(health.ok, true);
  assert.equal(health.kvBound, true);

  // 4. Initial GET seeds 3 sample leads
  const rGet1 = await worker.fetch(new Request("https://example.workers.dev/api/inquiries"), env);
  assert.equal(rGet1.status, 200);
  const list1 = await rGet1.json();
  assert.equal(list1.inquiries.length, 3);

  // 5. Validation rejects malformed email
  const rBad = await worker.fetch(
    new Request("https://example.workers.dev/api/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test", email: "not-an-email", service: "Tax" }),
    }),
    env
  );
  assert.equal(rBad.status, 400);

  // 6. POST creates lead, scores HIGH priority, persists to KV, and returns email/follow-up
  const rPost = await worker.fetch(
    new Request("https://example.workers.dev/api/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Alice Martin",
        email: "alice@acme.fr",
        service: "Bilan & Liasse Fiscale",
        urgency: "urgent",
        notes: "Cabinet indépendant cherchant automatisation complète de collecte de pièces.",
        preset: "accounting",
        lang: "fr",
      }),
    }),
    env
  );
  assert.equal(rPost.status, 201);
  const created = await rPost.json();
  assert.equal(created.inquiry.priority, "HIGH");
  assert.equal(created.inquiry.lang, "fr");
  assert.match(created.inquiry.automation.emailSubject, /Cabinet Clarté/);
  assert.equal(created.inquiries.length, 4);

  // 7. PATCH updates persisted lead status
  const rPatch = await worker.fetch(
    new Request(`https://example.workers.dev/api/inquiries/${encodeURIComponent(created.inquiry.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Booked" }),
    }),
    env
  );
  assert.equal(rPatch.status, 200);
  const patched = await rPatch.json();
  assert.equal(patched.inquiry.status, "Booked");

  // 8. CSV export neutralizes formula injection
  assert.equal(csvCell("=CMD()"), "\"'=CMD()\"");
  const rCsv = await worker.fetch(new Request("https://example.workers.dev/api/export.csv"), env);
  assert.equal(rCsv.status, 200);
  const csvText = await rCsv.text();
  assert.match(csvText, /alice@acme\.fr/);
  assert.match(csvText, /Booked/);

  // 9. Reset restores seeded leads cleanly
  const rReset = await worker.fetch(new Request("https://example.workers.dev/api/reset", { method: "POST" }), env);
  assert.equal(rReset.status, 200);
  const resetData = await rReset.json();
  assert.equal(resetData.inquiries.length, 3);

  // 10. Direct helper check
  const sample = scoreAndBuildAutomation({
    name: "Sam",
    email: "sam@example.com",
    service: "Move",
    urgency: "planning",
    notes: "",
    preset: "service",
    lang: "en",
    nowMs: 1700000000000,
  });
  assert.equal(sample.priority, "NORMAL");

  console.log("ALL 10/10 PORTFOLIO & AUTOMATION WORKER TESTS PASSED");
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
