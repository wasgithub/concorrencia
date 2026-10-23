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
    const p = await browser.newPage(),
      base = process.env.ISSUEFLOW_URL || "http://localhost:8080",
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(base + "/fluxos.html");
    await p.click("#manageAreas");
    await p.locator("#areaForm [name=area]").fill("Portal de parceiros");
    await p.locator("#areaForm button[type=submit]").click();
    await p.locator("#functionForm [name=nome]").fill("Pedidos");
    await p.locator("#functionForm button[type=submit]").click();
    await p.click("#closeAreas");
    await p.goto(base + "/testes.html");
    await p.selectOption("#areaFilter", "Crédito");
    await p.selectOption("#functionFilter", "CPR");
    assert((await p.locator("#caseRows tr").count()) > 0);
    const row = p.locator("#caseRows tr").first();
    await row.getByRole("button", { name: "Duplicar", exact: true }).click();
    const original = await p.locator("#caseForm [name=steps]").inputValue();
    await p.selectOption("#caseForm [name=funcionalidade]", "CPR Dollar");
    await p.locator("#caseForm [name=nome]").fill("CPR Dollar duplicada");
    await p.click("#caseAttributes summary");
    await p
      .locator("#caseBuilder label")
      .filter({ hasText: "Pessoa (PF/PJ)" })
      .locator("select")
      .selectOption("PJ");
    assert.equal(
      await p.locator("#caseForm [name=nome]").inputValue(),
      "CPR Dollar duplicada",
    );
    await p.locator("#caseForm button[type=submit]").click();
    await p.selectOption("#functionFilter", "CPR Dollar");
    assert.match(await p.textContent("#caseRows"), /CPR Dollar duplicada/);
    assert.equal(
      await p.evaluate(() =>
        scenarioCatalog
          .find((c) => c.nome === "CPR Dollar duplicada")
          .fluxo.join("\n"),
      ),
      original,
    );
    await p.click("#newCase");
    await p.selectOption("#caseForm [name=frente]", "Portal de parceiros");
    await p.selectOption("#caseForm [name=funcionalidade]", "Pedidos");
    await p.click("#caseAttributes summary");
    assert.doesNotMatch(await p.textContent("#caseBuilder"), /Hipoteca|PF|PJ/);
    await p.locator("#caseForm [name=nome]").fill("Consultar pedido");
    await p
      .locator("#caseForm [name=steps]")
      .fill("Autenticar\nBuscar pedido\nConferir status");
    await p.locator("#caseForm button[type=submit]").click();
    await p.selectOption("#areaFilter", "Portal de parceiros");
    await p.selectOption("#functionFilter", "Pedidos");
    assert.equal(await p.locator("#caseRows tr").count(), 1);
    await p.reload();
    assert(
      await p.evaluate(() =>
        scenarioCatalog.some((c) => c.frente === "Portal de parceiros"),
      ),
    );
    await p.goto(base + "/index.html");
    const id = await p.evaluate(() => issues[0].idIssue);
    await p.goto(base + "/homologacao.html?issue=" + encodeURIComponent(id));
    // O seletor HO deve manter os mesmos filtros e permitir outra frente sem atributos de crédito.
    await p.click("#openPicker");
    await p.selectOption("#hoArea", "Portal de parceiros");
    await p.selectOption("#hoFunction", "Pedidos");
    assert.equal(
      await p
        .locator('#hoDimensionFilters select[data-dimension="Garantia"]')
        .isVisible(),
      false,
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS frentes configuráveis, CPR legado, duplicação CPR Dollar, atributos por frente e filtros HO",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
