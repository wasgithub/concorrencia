const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
(async () => {
  const b = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_PATH
      ? { executablePath: process.env.CHROME_PATH }
      : {}),
  });
  try {
    const p = await b.newPage(),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(
      (process.env.ISSUEFLOW_URL || "http://localhost:8080") +
        "/homologacao.html?issue=ISS-1043",
    );
    await p.click("#openPicker");
    await p.locator("#hoCatalog input:not(:disabled)").first().check();
    await p.click("#addCases");
    await p.locator(".ho-case summary").first().click();
    const selects = p.locator(".ho-stage-grid select");
    await selects.nth(0).selectOption("N/A");
    await selects.nth(1).selectOption("Falhou");
    assert(await p.locator(".ho-fill-ok").isDisabled());
    await p.click("#saveHO");
    assert.match(await p.textContent("#hoError"), /motivo/);
    await selects.nth(1).selectOption("OK");
    assert.equal(await selects.nth(1).inputValue(), "Falhou");
    await p
      .locator("textarea[data-stage]")
      .nth(1)
      .fill("Defeito identificado durante HO");
    await p.click("#saveHO");
    await selects.nth(1).selectOption("OK");
    await p.locator(".ho-fill-ok").click();
    assert.equal(await selects.nth(0).inputValue(), "N/A");
    await p.click("#saveHO");
    await p.reload();
    await p.locator(".ho-case summary").first().click();
    const stored = await p.evaluate(() => hoPlans()["ISS-1043"]);
    assert(
      stored.historico.some(
        (e) =>
          e.para === "Falhou" && e.motivo === "Defeito identificado durante HO",
      ),
    );
    assert(stored.historico.some((e) => e.de === "Falhou" && e.para === "OK"));
    assert.equal(
      await p.locator(".ho-stage-grid select").first().inputValue(),
      "N/A",
    );
    await p
      .locator("textarea[data-stage]")
      .nth(1)
      .fill("Motivo detalhado após reteste");
    await p.click("#saveHO");
    assert(
      await p.evaluate(() =>
        hoPlans()["ISS-1043"].historico.some(
          (e) =>
            e.tipo === "motivo_ho" &&
            e.motivo === "Motivo detalhado após reteste",
        ),
      ),
    );
    await p.locator(".ho-case-footer button").click();
    await p.click("#saveHO");
    assert(
      await p.evaluate(() =>
        hoPlans()["ISS-1043"].historico.some(
          (e) => e.tipo === "cenario_ho_removido" && e.snapshot.motivosEtapas,
        ),
      ),
    );
    await p.fill("#hoApprove input", "PO");
    await p.fill("#hoApprove textarea", "Revisão");
    await p.locator("#hoApprove button").click();
    assert.match(await p.textContent("#hoError"), /pendentes|falhando/);
    assert.deepEqual(errors, []);
    console.log(
      "PASS HO: falha exige motivo, reteste explícito, N/A preservado, histórico de falha/correção/remoção e plano vazio bloqueado",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
