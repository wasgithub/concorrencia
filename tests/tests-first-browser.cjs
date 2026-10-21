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
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    await context.addInitScript(() => {
      if (!localStorage.getItem("e2e.testsFirst.fixture")) {
        localStorage.setItem(
          "issueflow.modules.v1",
          JSON.stringify({
            delivery: true,
            quality: true,
            gmud: true,
            production: true,
            planning: true,
          }),
        );
        localStorage.setItem("issueflow.records.v1", "[]");
        localStorage.setItem("issueflow.hoplans.v1", "{}");
        localStorage.setItem("e2e.testsFirst.fixture", "1");
      }
    });
    const p = await context.newPage(),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.stack));
    p.setDefaultTimeout(10000);
    const base = process.env.ISSUEFLOW_URL || "http://localhost:8080";
    await p.goto(base + "/");
    await p.waitForURL("**/testes.html");
    await p.waitForFunction(() => typeof scenarioCatalog !== "undefined");
    assert.deepEqual(
      await p
        .locator(".operation-nav a.nav")
        .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("href"))),
      ["testes.html", "fluxos.html"],
    );
    assert.equal(await p.evaluate(() => typeof issues), "undefined");
    for (const route of [
      "homologacao.html",
      "validacao-ho.html",
      "changes.html",
      "gmud-timeline.html",
      "producao.html",
      "timeline.html",
    ]) {
      await p.goto(base + "/" + route);
      assert(await p.locator("#moduleUnavailable").isVisible());
      assert.equal(await p.locator("main").isVisible(), false);
    }
    await p.goto(base + "/testes.html");
    assert.equal(
      await p.evaluate(() => localStorage.getItem("issueflow.records.v1")),
      "[]",
    );
    assert.equal(
      await p.evaluate(() => localStorage.getItem("issueflow.hoplans.v1")),
      "{}",
    );
    await p.fill("#stageAddForm [name=nome]", "Conferência R1");
    await p.locator("#stageAddForm button").click();
    await p.fill("#dimAddForm [name=nome]", "Processo R1");
    await p.locator("#dimAddForm button").click();
    const dimension = p.locator(".dim-card").filter({ hasText: "Processo R1" });
    await dimension.locator("input").fill("Marketplace");
    await dimension
      .getByRole("button", { name: "Adicionar", exact: true })
      .click();
    await p.click("#newCase");
    await p
      .locator("#caseBuilder label")
      .filter({ hasText: "Processo R1" })
      .locator("select")
      .selectOption("Marketplace");
    await p.fill("#caseForm [name=nome]", "E2E R1 cenário");
    await p.selectOption("#caseForm [name=tipo]", "Manual");
    await p.selectOption("#caseForm [name=etapaAlvo]", "Conferência R1");
    await p.fill("#caseForm [name=cobertura]", "Regressivo R1");
    await p.fill(
      "#caseForm [name=componentes]",
      "api-marketplace, api-marketplace, web-marketplace",
    );
    await p.locator("#caseForm button[type=submit]").click();
    assert.equal(await p.locator("#caseDialog").isVisible(), false);
    await p.reload();
    const original = await p.evaluate(() =>
      scenarioCatalog.find((c) => c.nome === "E2E R1 cenário"),
    );
    assert.equal(original.dimensoes["Processo R1"], "Marketplace");
    assert.deepEqual(original.componentes, [
      "api-marketplace",
      "web-marketplace",
    ]);
    await p.fill("#stageAddForm [name=nome]", "Etapa posterior R1");
    await p.locator("#stageAddForm button").click();
    assert.deepEqual(
      await p.evaluate(
        (id) => scenarioCatalog.find((c) => c.id === id).fluxo,
        original.id,
      ),
      original.fluxo,
    );
    await p.fill("#caseSearch", "api-marketplace");
    await p.selectOption("#coverageFilter", "Regressivo R1");
    await p.selectOption("#tipoFilter", "Manual");
    assert.equal(await p.locator("#caseRows tr").count(), 1);
    await p
      .getByRole("button", { name: "Editar", exact: true })
      .first()
      .click();
    await p.fill("#caseForm [name=nome]", "E2E R1 cenário editado");
    await p.locator("#caseForm button[type=submit]").click();
    await p.fill("#trailForm [name=nome]", "E2E R1 trilha");
    await p.locator(`#trailCases input[value="${original.id}"]`).check();
    await p.locator("#trailForm button[type=submit]").click();
    await p.reload();
    await p.fill("#caseSearch", "E2E R1 cenário editado");
    await p
      .locator("#caseRows")
      .getByRole("button", { name: "Remover", exact: true })
      .click();
    assert.match(await p.textContent("#toast"), /trilha/);
    assert.equal(await p.locator("#caseRows tr").count(), 1);
    await p
      .locator("#caseRows")
      .getByRole("button", { name: "Desativar", exact: true })
      .click();
    assert.equal(await p.locator("#caseRows tr").count(), 0);
    await p.uncheck("#onlyActive");
    await p
      .locator("#caseRows")
      .getByRole("button", { name: "Ativar", exact: true })
      .click();
    const trail = p
      .locator("#trailList .stage-item")
      .filter({ hasText: "E2E R1 trilha" });
    await trail.getByRole("button", { name: "Editar", exact: true }).click();
    await p.fill("#trailForm [name=nome]", "E2E R1 trilha editada");
    await p.locator("#trailForm button[type=submit]").click();
    await p.fill("#trailForm [name=nome]", "E2E R1 trilha editada");
    await p.locator(`#trailCases input[value="${original.id}"]`).check();
    await p.locator("#trailForm button[type=submit]").click();
    assert.match(await p.textContent("#trailError"), /existe/);
    await p.click("#cancelTrail");
    await p.click("#newCase");
    await p.fill("#caseForm [name=nome]", "E2E R1 falha recuperada");
    const before = await p.evaluate(() => JSON.stringify(scenarioCatalog));
    await p.evaluate(() => {
      const setItem = Storage.prototype.setItem;
      window.restoreStorage = () => (Storage.prototype.setItem = setItem);
      Storage.prototype.setItem = function (key, value) {
        if (key === "issueflow.scenariocatalog.v1") throw Error("Falha E2E");
        return setItem.call(this, key, value);
      };
    });
    await p.locator("#caseForm button[type=submit]").click();
    assert(await p.locator("#caseDialog").isVisible());
    assert.match(await p.textContent("#caseError"), /Não foi possível salvar/);
    assert.equal(
      await p.evaluate(() => JSON.stringify(scenarioCatalog)),
      before,
    );
    await p.evaluate(() => window.restoreStorage());
    await p.locator("#caseForm button[type=submit]").click();
    await p.reload();
    assert(
      await p.evaluate(() =>
        scenarioCatalog.some((c) => c.nome === "E2E R1 falha recuperada"),
      ),
    );
    await p.goto(base + "/fluxos.html");
    await p.click("#manageAreas");
    await p.fill("#areaForm [name=area]", "E2E R1 frente");
    await p.locator("#areaForm button[type=submit]").click();
    await p.fill("#functionForm [name=nome]", "E2E R1 função");
    await p.locator("#functionForm button[type=submit]").click();
    await p.click("#closeAreas");
    await p.click("#newFlow");
    await p.selectOption("#flowForm [name=frente]", "E2E R1 frente");
    await p.selectOption("#flowForm [name=funcionalidade]", "E2E R1 função");
    await p.fill("#flowForm [name=nome]", "E2E R1 fluxo independente");
    await p
      .getByRole("textbox", { name: "Etapa 1", exact: true })
      .fill("Comprar");
    await p.click("#addFlowStep");
    await p
      .getByRole("textbox", { name: "Etapa 2", exact: true })
      .fill("Pagar");
    await p.locator("#flowForm button[type=submit]").click();
    await p.reload();
    assert(
      await p.evaluate(() =>
        testFlows().some(
          (f) => f.nome === "E2E R1 fluxo independente" && f.steps.length === 2,
        ),
      ),
    );
    const flowBefore = await p.evaluate(() => testFlows().find(f => f.nome === "E2E R1 fluxo independente"));
    const flowCard = p.locator(".flow-card").filter({ hasText: "E2E R1 fluxo independente" });
    await flowCard.getByRole("button", { name: "Editar", exact: true }).click();
    await p.getByRole("textbox", { name: "Etapa 1", exact: true }).fill("Escolher produto");
    await p.uncheck("#flowForm [name=ativo]");
    await p.locator("#flowForm button[type=submit]").click();
    const flowAfter = await p.evaluate(id => testFlows().find(f => f.id === id), flowBefore.id);
    assert.equal(flowAfter.version, flowBefore.version + 1);
    assert.equal(flowAfter.steps[0].id, flowBefore.steps[0].id);
    assert.equal(flowAfter.ativo, false);
    await p.uncheck("#activeFlows");
    await flowCard.getByRole("button", { name: "Duplicar", exact: true }).click();
    await p.fill("#flowForm [name=nome]", "E2E R1 fluxo cópia");
    await p.check("#flowForm [name=ativo]");
    await p.locator("#flowForm button[type=submit]").click();
    await p.reload();
    const copy = await p.evaluate(() => testFlows().find(f => f.nome === "E2E R1 fluxo cópia"));
    assert(copy.ativo);
    assert(copy.steps.every(s => !flowAfter.steps.some(old => old.id === s.id)));
    await p.goto(base + "/testes.html");
    await p.setViewportSize({ width: 390, height: 844 });
    assert(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await p.screenshot({ path: "/tmp/tests-first-mobile.png", fullPage: true });
    assert.deepEqual(errors, []);
    console.log(
      "PASS R1: somente testes, rotas futuras bloqueadas, etapas/dimensões, cenário, filtros/edição, trilha, referências, arquivamento, erro/retry, persistência, fluxo independente e mobile",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
