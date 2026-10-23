const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_PATH
      ? { executablePath: process.env.CHROME_PATH }
      : {}),
  });
  try {
    const p = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
      }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    const base = process.env.ISSUEFLOW_URL || "http://localhost:8080";
    await p.goto(base + "/acompanhamento-testes.html?view=matrix");
    assert.equal(
      await p
        .locator("#copyRun, #copyMatrixRun, #preserveRunAssignments")
        .count(),
      0,
    );
    await p.selectOption("#matrixScope", "all");
    const site = p.locator(
      '#runMatrixRows tr[data-run-id="demo-site"][data-scenario-id]',
    );
    const original = await p.evaluate(() =>
      JSON.stringify(cycles.find((c) => c.id === "demo-release-2")),
    );
    await site.locator(".run-name-button").click();
    await p.fill("[name=evidenceUrl]", "javascript:alert(1)");
    await p.locator("#runResultForm button[type=submit]").click();
    assert.match(await p.textContent("#detailError"), /HTTP\/HTTPS/);
    assert(await p.locator("#openEvidenceLink").isHidden());
    assert.equal(
      await p.evaluate(
        () => cycles.find((c) => c.id === "demo-site").scenarios[0].evidenceUrl,
      ),
      undefined,
    );
    const link = "https://jira.exemplo/browse/AGRO-123#attachments";
    await p.fill("[name=evidenceUrl]", link);
    assert.equal(
      await p.locator("#openEvidenceLink").getAttribute("href"),
      link,
    );
    await p.screenshot({ path: "/tmp/cenario-evidencias-jira.png" });
    await p.locator("#runResultForm button[type=submit]").click();
    assert.equal(
      await site.locator("a.run-evidence-link").getAttribute("href"),
      link,
    );
    assert.equal(
      await site.locator("a.run-evidence-link").getAttribute("rel"),
      "noopener noreferrer",
    );
    assert.equal(
      await p.evaluate(() =>
        JSON.stringify(cycles.find((c) => c.id === "demo-release-2")),
      ),
      original,
    );
    await p.reload();
    await p.selectOption("#matrixScope", "all");
    await site.locator(".run-name-button").click();
    assert.equal(await p.locator("[name=evidenceUrl]").inputValue(), link);
    // Falha de armazenamento não perde o link nem altera o documento.
    await p.fill("[name=evidenceUrl]", "https://jira.exemplo/browse/AGRO-456");
    await p.evaluate(() => {
      window.originalSet = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) {
        if (k === TestRuns.key) throw Error("quota");
        return originalSet.call(this, k, v);
      };
    });
    await p.locator("#runResultForm button[type=submit]").click();
    assert(await p.locator("#runDetails").isVisible());
    assert.equal(
      await p.evaluate(
        () => cycles.find((c) => c.id === "demo-site").scenarios[0].evidenceUrl,
      ),
      link,
    );
    await p.evaluate(() => (Storage.prototype.setItem = window.originalSet));
    await p.locator("#runResultForm button[type=submit]").click();
    await site.locator(".run-name-button").click();
    await p.fill("[name=evidenceUrl]", "");
    await p.locator("#runResultForm button[type=submit]").click();
    assert.equal(await site.locator("a.run-evidence-link").count(), 0);
    assert.equal(
      await p.evaluate(
        () =>
          cycles
            .find((c) => c.id === "demo-site")
            .history.filter((e) => e.type === "evidence_updated").length,
      ),
      3,
    );
    await p.reload();
    await p.selectOption("#matrixScope", "all");
    await site.locator(".run-name-button").click();
    assert.equal(await p.locator("[name=evidenceUrl]").inputValue(), "");
    assert(await p.locator("#openEvidenceLink").isHidden());
    assert.deepEqual(errors, []);
    console.log(
      "PASS retirada de reutilização; evidência opcional, URL segura, salvar/abrir/editar/remover, histórico, erro de persistência e isolamento por ciclo",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
