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
        viewport: { width: 1440, height: 1050 },
      }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    const base = process.env.ISSUEFLOW_URL || "http://localhost:8080";
    await p.goto(base + "/acompanhamento-testes.html");
    assert.equal(await p.locator("#runRows tr").count(), 9);
    assert.equal(
      await p.evaluate(() => localStorage.getItem(TestRuns.key)),
      null,
    );
    const before = await p.evaluate(() => ({
      issues: localStorage.getItem("issueflow.records.v1"),
      plans: localStorage.getItem("issueflow.hoplans.v1"),
    }));
    await p.screenshot({
      path: "/tmp/acompanhamento-testes-desktop.png",
      fullPage: true,
    });
    assert.deepEqual(
      await p
        .locator("[data-view]")
        .evaluateAll((nodes) => nodes.map((n) => n.dataset.view)),
      ["scenarios", "matrix", "agenda", "history"],
    );
    await p.selectOption("#runTeam", "Adubar");
    assert.equal(await p.locator("#runRows tr").count(), 2);
    await p.click("#clearRunFilters");
    await p.selectOption("#runStatus", "failed");
    assert.equal(await p.locator("#runRows tr").count(), 1);
    await p.locator("#runRows .run-name-button").click();
    await p.screenshot({ path: "/tmp/acompanhamento-testes-etapas.png" });
    await p.selectOption('[aria-label="Resultado: Análise documental"]', "ok");
    await p.locator("#runResultForm button[type=submit]").click();
    assert.match(await p.textContent("#detailError"), /Confirme o reteste/);
    await p.check("[name=retest-2]");
    await p.locator("#runResultForm button[type=submit]").click();
    assert.equal(await p.locator("#runDetails").isVisible(), false);
    assert.equal(await p.locator("#runRows tr").count(), 0);
    await p.reload();
    assert.equal(
      await p.evaluate(() => TestRuns.metrics(cycles[0].scenarios).failed),
      0,
    );
    await p.click("[data-view=history]");
    assert.match(await p.textContent("#historyView"), /Análise documental/);
    await p.click("#newRun");
    await p.locator("#newRunScenarios input").nth(0).check();
    await p.locator("#newRunScenarios input").nth(1).check();
    await p.fill("#newRunForm [name=name]", "Rodada de reteste");
    await p.fill("#newRunForm [name=team]", "Adubar");
    await p.fill("#newRunForm [name=owner]", "Patrícia");
    await p.fill("#newRunForm [name=startDate]", "2026-10-24");
    await p.fill("#newRunForm [name=endDate]", "2026-10-23");
    await p.locator("#newRunForm button[type=submit]").click();
    assert.match(await p.textContent("#newRunError"), /janela válida/);
    await p.fill("#newRunForm [name=endDate]", "2026-10-24");
    await p.locator("#newRunForm button[type=submit]").click();
    assert.equal(await p.locator("#runRows tr").count(), 2);
    assert.equal(await p.locator("#runDemo").isVisible(), false);
    assert.equal(
      await p.evaluate(() => TestRuns.metrics(current().scenarios).pending),
      2,
    );
    await p.locator("#runRows .run-name-button").first().click();
    await p.selectOption("[name=result-0]", "failed");
    await p.fill("[name=reason-0]", "");
    await p.locator("#runResultForm button[type=submit]").click();
    assert.match(await p.textContent("#detailError"), /motivo da falha/);
    await p.fill("[name=reason-0]", "Erro controlado");
    await p.locator("#runResultForm button[type=submit]").click();
    await p.click("#newRun");
    await p.fill("#newRunForm [name=name]", "Ciclo do catálogo");
    await p.fill("#newRunForm [name=team]", "Frutificar");
    await p.fill("#newRunForm [name=owner]", "Adriano");
    await p.locator("#newRunScenarios input").first().check();
    await p.locator("#newRunForm button[type=submit]").click();
    assert.equal(await p.locator("#runRows tr").count(), 1);
    // Erro de persistência preserva o rascunho e os resultados anteriores.
    await p.locator("#runRows .run-name-button").click();
    await p.selectOption("[name=result-0]", "ok");
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
      await p.evaluate(() => current().scenarios[0].steps[0].result),
      "pending",
    );
    await p.evaluate(() => (Storage.prototype.setItem = window.originalSet));
    await p.locator("#runResultForm button[type=submit]").click();
    await p.reload();
    assert.equal(
      await p.evaluate(() => current().scenarios[0].steps[0].result),
      "ok",
    );
    assert.deepEqual(
      await p.evaluate(() => ({
        issues: localStorage.getItem("issueflow.records.v1"),
        plans: localStorage.getItem("issueflow.hoplans.v1"),
      })),
      before,
    );
    await p.setViewportSize({ width: 390, height: 844 });
    assert(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await p.screenshot({
      path: "/tmp/acompanhamento-testes-mobile.png",
      fullPage: true,
    });
    await p.locator("#runRows .run-name-button").click();
    assert(
      await p.evaluate(
        () => document.querySelector("#runDetails").scrollWidth <= innerWidth,
      ),
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS ciclos, resumo, times, filtros, painel, reteste, motivo, catálogo, persistência, isolamento e mobile",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
