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
        viewport: { width: 1600, height: 1100 },
      }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    const base = process.env.ISSUEFLOW_URL || "http://localhost:8080";
    await p.goto(base + "/acompanhamento-testes.html?view=matrix");
    await p.selectOption("#matrixScope", "production");
    await p.fill("#matrixProductionDate", "2026-10-23");
    await p.locator("#matrixProductionDate").dispatchEvent("change");
    assert.equal(
      await p.locator("#runMatrixRows tr[data-scenario-id]").count(),
      10,
    );
    assert.equal(await p.locator(".run-matrix-group").count(), 2);
    assert.match(
      await p.textContent("#matrixScopeSummary"),
      /2 ciclo\(s\) · 10 cenários · 5 times/,
    );
    assert.equal(await p.locator(".matrix-schedule-row").count(), 2);
    assert.match(
      await p.textContent("#runMatrixRows"),
      /20\/10\/2026 a 23\/10\/2026/,
    );
    assert.match(await p.textContent("#matrixSchedule"), /Cultivar/);
    assert(await p.locator(".run-overview").isHidden());
    await p.screenshot({
      path: "/tmp/planilha-por-data-producao.png",
      fullPage: true,
    });
    await p
      .getByRole("button", { name: "Subida em 23/10/2026", exact: true })
      .click();
    assert.equal(await p.locator("#matrixScope").inputValue(), "selected");
    await p
      .getByRole("button", { name: "Subida em 26/10/2026", exact: true })
      .click();
    assert.equal(
      await p.locator("#runMatrixRows tr[data-scenario-id]").count(),
      12,
    );
    await p
      .getByRole("button", { name: "Subida em 24/10/2026", exact: true })
      .click();
    assert.equal(
      await p.locator("#runMatrixRows tr[data-scenario-id]").count(),
      12,
    ); // mesma janela não duplica cenários
    assert.match(
      await p.textContent("#matrixDateCaption"),
      /23\/10\/2026.*24\/10\/2026.*26\/10\/2026/,
    );
    await p.screenshot({
      path: "/tmp/planilha-seletor-datas.png",
      fullPage: true,
    });
    await p
      .getByRole("button", { name: "Subida em 26/10/2026", exact: true })
      .click();
    assert.equal(
      await p.locator("#runMatrixRows tr[data-scenario-id]").count(),
      10,
    );
    await p
      .getByRole("button", { name: "Todas as subidas", exact: true })
      .click();
    assert.equal(
      await p.locator("#runMatrixRows tr[data-scenario-id]").count(),
      17,
    );
    await p.getByRole("button", { name: "Este ciclo", exact: true }).click();
    assert.equal(
      await p.locator("#runMatrixRows tr[data-scenario-id]").count(),
      9,
    );
    assert.equal(
      await p.evaluate(() => localStorage.getItem(TestRuns.key)),
      null,
    );
    await p
      .getByRole("button", { name: "Subida em 23/10/2026", exact: true })
      .click();
    const original = await p.evaluate(() =>
      JSON.stringify(cycles.find((c) => c.id === "demo-release-2")),
    );
    const site = p.locator(
      '#runMatrixRows tr[data-run-id="demo-site"][data-scenario-id]',
    );
    await site.locator("button.run-name-button").click();
    assert.match(await p.textContent("#detailMeta"), /Site institucional/);
    await p.selectOption("[name=result-1]", "failed");
    await p.fill("[name=reason-1]", "Falha no envio da mensagem");
    await p.locator("#runResultForm button[type=submit]").click();
    assert.equal(
      await p.evaluate(
        () =>
          cycles.find((c) => c.id === "demo-site").scenarios[0].steps[1].result,
      ),
      "failed",
    );
    assert.equal(
      await p.evaluate(() =>
        JSON.stringify(cycles.find((c) => c.id === "demo-release-2")),
      ),
      original,
    );
    await p.selectOption("#runTeam", "Cultivar");
    assert.equal(
      await p.locator("#runMatrixRows tr[data-scenario-id]").count(),
      1,
    );
    await site.locator("button.run-name-button").click();
    await p.selectOption("[name=result-1]", "ok");
    await p.check("[name=retest-1]");
    await p.locator("#runResultForm button[type=submit]").click();
    assert.equal(await p.locator("#runTeam").inputValue(), "Cultivar");
    await p.click("#clearRunFilters");
    // A mesma execução lógica do catálogo em ciclos diferentes nunca compartilha resultado.
    await p.selectOption("#matrixScope", "all");
    assert.equal(
      await p.locator("#runMatrixRows tr[data-scenario-id]").count(),
      17,
    );
    const previous = p.locator(
      '#runMatrixRows tr[data-run-id="demo-release-1"][data-scenario-id="r1"]',
    );
    await previous.locator("button.run-name-button").click();
    await p.selectOption("[name=result-0]", "pending");
    await p.locator("#runResultForm button[type=submit]").click();
    assert.equal(
      await p.evaluate(
        () =>
          cycles
            .find((c) => c.id === "demo-release-1")
            .scenarios.find((s) => s.id === "r1").steps[0].result,
      ),
      "pending",
    );
    assert.equal(
      await p.evaluate(() =>
        JSON.stringify(cycles.find((c) => c.id === "demo-release-2")),
      ),
      original,
    );
    await p.selectOption("#matrixScope", "production");
    await p.fill("#matrixProductionDate", "2026-10-26");
    await p.locator("#matrixProductionDate").dispatchEvent("change");
    assert.equal(
      await p.locator("#runMatrixRows tr[data-scenario-id]").count(),
      2,
    );
    await p.fill("#matrixProductionDate", "2026-10-24");
    await p.locator("#matrixProductionDate").dispatchEvent("change");
    assert.equal(
      await p.locator("#runMatrixRows tr[data-scenario-id]").count(),
      9,
    );
    await p.fill("#matrixProductionDate", "2026-10-23");
    await p.locator("#matrixProductionDate").dispatchEvent("change");
    assert.equal(
      await p
        .locator("#copyRun, #copyMatrixRun, #preserveRunAssignments")
        .count(),
      0,
    );
    await p.reload();
    await p.selectOption("#matrixScope", "all");
    assert.equal(
      await p.locator("#runMatrixRows tr[data-scenario-id]").count(),
      17,
    );
    await p.setViewportSize({ width: 390, height: 844 });
    assert(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS produção por data/todos, timeline HO/PROD, edição no ciclo correto, IDs repetidos, filtros, remoção de reutilização e mobile",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
