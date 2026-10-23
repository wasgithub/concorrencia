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
    await p.goto(base + "/acompanhamento-testes.html");
    const before = await p.evaluate(() => localStorage.getItem(TestRuns.key));
    await p.click("[data-view=matrix]");
    assert.equal(await p.locator("#runMatrixRows tr").count(), 9);
    assert.match(await p.textContent("#runMatrixHead"), /Simulação/);
    assert.match(await p.textContent("#runMatrixHead"), /Confirmar pedido/);
    const marketplace = p
      .locator("#runMatrixRows tr")
      .filter({ hasText: "Compra de produto com cartão" });
    assert.equal(
      await marketplace.locator("button.run-result-cell").count(),
      3,
    );
    assert((await marketplace.locator(".run-no-stage").count()) > 0);
    await p.screenshot({
      path: "/tmp/acompanhamento-planilha.png",
      fullPage: true,
    });
    await p.selectOption("#runFront", "Marketplace");
    assert.equal(await p.locator("#runMatrixRows tr").count(), 2);
    assert.doesNotMatch(
      await p.textContent("#runMatrixHead"),
      /Simulação|Liberação de crédito/,
    );
    await p.click("#clearRunFilters");
    await p
      .locator("#runMatrixRows tr")
      .first()
      .locator("button.failed")
      .click();
    assert(await p.locator("#runDetails").isVisible());
    assert.equal(
      await p
        .locator('[aria-label="Resultado: Análise documental"]')
        .inputValue(),
      "failed",
    );
    await p.click("#closeRunDetails");
    await p.fill("#runPeriodStart", "2026-10-23");
    await p.fill("#runPeriodEnd", "2026-10-24");
    await p.locator("#runPeriodForm button").click();
    assert(await p.locator("#agendaView").isVisible());
    assert.equal(await p.locator(".run-agenda-row").count(), 7);
    assert.match(
      await p.textContent("#agendaSummary"),
      /3 ciclo\(s\) · 5 times/,
    );
    assert.equal(await p.locator(".run-overview").isVisible(), false);
    await p.screenshot({
      path: "/tmp/acompanhamento-agenda.png",
      fullPage: true,
    });
    await p
      .locator(".run-agenda-bar")
      .filter({ hasText: "22/10" })
      .first()
      .click();
    assert(await p.locator("#matrixView").isVisible());
    assert.match(await p.textContent("#runName"), /Marketplace/);
    assert.equal(await p.locator("#runMatrixRows tr").count(), 1);
    assert.equal(
      await p.evaluate(() => localStorage.getItem(TestRuns.key)),
      before,
    );
    await p.fill("#runPeriodStart", "2026-10-24");
    await p.fill("#runPeriodEnd", "2026-10-23");
    await p.locator("#runPeriodForm button").click();
    assert.match(await p.textContent("#runPeriodError"), /data inicial/);
    assert.equal(await p.locator(".run-agenda-bar").count(), 0);
    await p.fill("#runPeriodStart", "2026-10-23");
    await p.fill("#runPeriodEnd", "2026-10-23");
    await p.selectOption("#runPeriodEnvironment", "PROD");
    await p.locator("#runPeriodForm button").click();
    assert.match(await p.textContent("#runAgendaGrid"), /Nenhum time/);
    await p.selectOption("#runPeriodEnvironment", "HO");
    await p.fill("#runPeriodStart", "2026-10-01");
    await p.fill("#runPeriodEnd", "2026-11-30");
    await p.locator("#runPeriodForm button").click();
    assert.equal(await p.locator(".run-agenda-row").count(), 11);
    assert((await p.locator(".run-agenda-day").count()) <= 14);
    await p.setViewportSize({ width: 390, height: 844 });
    assert(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await p.screenshot({
      path: "/tmp/acompanhamento-agenda-mobile.png",
      fullPage: true,
    });
    await p.click("[data-view=matrix]");
    assert(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS matriz, etapas próprias, filtros, painel, agenda por período, sobreposição, ambiente, navegação sem gravar, datas inválidas e mobile",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
