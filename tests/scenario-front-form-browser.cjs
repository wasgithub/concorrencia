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
    await p.goto(base + "/fluxos.html");
    await p.click("#newFlow");
    await p.selectOption("#flowForm [name=frente]", "Marketplace");
    await p.selectOption("#flowForm [name=funcionalidade]", "Compra");
    await p.fill("#flowForm [name=nome]", "Compra com cartão");
    await p
      .getByRole("textbox", { name: "Etapa 1", exact: true })
      .fill("Adicionar ao carrinho");
    await p.click("#addFlowStep");
    await p
      .getByRole("textbox", { name: "Etapa 2", exact: true })
      .fill("Confirmar pagamento");
    await p.locator("#flowForm button[type=submit]").click();
    const flowId = await p.evaluate(
      () => testFlows().find((f) => f.nome === "Compra com cartão").id,
    );
    await p.goto(base + "/testes.html");
    const profile = p.locator(".dim-card").filter({ hasText: "Perfil" });
    await profile
      .getByLabel("Frente do campo Perfil")
      .selectOption("Marketplace");
    await p.click("#newCase");
    assert.equal(
      await p.locator("#caseForm select").first().getAttribute("name"),
      "frente",
    );
    assert.equal(
      await p
        .locator("#caseBuilder label")
        .first()
        .evaluate((n) => n.firstChild.textContent),
      "Linha",
    );
    await p
      .locator("#caseBuilder label")
      .filter({ hasText: "Pessoa (PF/PJ)" })
      .locator("select")
      .selectOption("PJ");
    assert.equal(await p.locator("#caseForm [name=nome]").inputValue(), "PJ");
    await p
      .locator("#caseBuilder label")
      .filter({ hasText: "Pessoa (PF/PJ)" })
      .locator("select")
      .selectOption("");
    assert.equal(await p.locator("#caseForm [name=nome]").inputValue(), "");
    await p
      .locator("#caseBuilder label")
      .filter({ hasText: "Pessoa (PF/PJ)" })
      .locator("select")
      .selectOption("PJ");
    await p.selectOption("#caseForm [name=frente]", "Marketplace");
    assert.equal(await p.locator("#caseGuaranteeField").isVisible(), false);
    assert.doesNotMatch(await p.textContent("#caseBuilder"), /Hipoteca|PF|PJ/);
    assert.match(await p.textContent("#caseBuilder"), /Perfil/);
    assert.equal(
      await p.locator("#caseForm [name=etapaAlvo] option").count(),
      0,
    );
    await p.fill("#caseForm [name=nome]", "Comprar no Marketplace");
    await p.locator("#caseForm button[type=submit]").click();
    assert.match(await p.textContent("#caseError"), /Selecione um fluxo/);
    await p.selectOption("#caseForm [name=funcionalidade]", "Compra");
    await p.selectOption("#caseForm [name=workflowId]", flowId);
    assert.deepEqual(
      await p.locator("#caseForm [name=etapaAlvo] option").allTextContents(),
      ["Adicionar ao carrinho", "Confirmar pagamento"],
    );
    await p.screenshot({
      path: "/tmp/cadastro-cenario-marketplace.png",
      fullPage: true,
    });
    await p.locator("#caseForm button[type=submit]").click();
    const saved = await p.evaluate(() =>
      scenarioCatalog.find((c) => c.nome === "Comprar no Marketplace"),
    );
    assert.equal(saved.frente, "Marketplace");
    assert.equal(saved.tipo, "N/A");
    assert.equal(saved.dimensoes.Tipo, undefined);
    assert.equal(saved.workflowVersion, 1);
    assert.deepEqual(saved.fluxo, [
      "Adicionar ao carrinho",
      "Confirmar pagamento",
    ]);
    await p
      .locator("#caseRows tr")
      .filter({ hasText: "Comprar no Marketplace" })
      .getByRole("button", { name: "Editar", exact: true })
      .click();
    await p.selectOption("#caseForm [name=etapaAlvo]", "Adicionar ao carrinho");
    await p.locator("#caseForm button[type=submit]").click();
    assert.deepEqual(
      await p.evaluate(
        () =>
          scenarioCatalog.find((c) => c.nome === "Comprar no Marketplace")
            .fluxo,
      ),
      ["Adicionar ao carrinho"],
    );
    await p.goto(base + "/fluxos.html");
    await p
      .locator(".flow-card")
      .filter({ hasText: "Compra com cartão" })
      .getByRole("button", { name: "Editar", exact: true })
      .click();
    await p
      .getByRole("textbox", { name: "Etapa 2", exact: true })
      .fill("Pagamento aprovado");
    await p.locator("#flowForm [name=ativo]").uncheck();
    await p.locator("#flowForm button[type=submit]").click();
    await p.goto(base + "/testes.html");
    const row = p
      .locator("#caseRows tr")
      .filter({ hasText: "Comprar no Marketplace" });
    await row.getByRole("button", { name: "Editar", exact: true }).click();
    assert.equal(
      await p.locator("#caseForm [name=workflowId]").inputValue(),
      "__saved",
    );
    assert.equal(
      await p.locator("#caseForm [name=etapaAlvo]").inputValue(),
      "Adicionar ao carrinho",
    );
    assert.deepEqual(
      await p.locator("#caseForm [name=etapaAlvo] option").allTextContents(),
      saved.fluxo,
    );
    await p.selectOption("#caseForm [name=etapaAlvo]", "Confirmar pagamento");
    await p.fill("#caseForm [name=cobertura]", "Smoke");
    await p.locator("#caseForm button[type=submit]").click();
    const result = await p.evaluate(() => {
      const c = scenarioCatalog.find(
          (c) => c.nome === "Comprar no Marketplace",
        ),
        execution = newTestExecution(c);
      execution.etapas["Adicionar ao carrinho"] = "OK";
      execution.etapas["Confirmar pagamento"] = "Falhou";
      execution.motivosEtapas = {
        "Confirmar pagamento": "Pagamento não confirmado",
      };
      return {
        flow: c.fluxo,
        version: c.workflowVersion,
        status: execStatus(execution),
        steps: executionStages(execution),
        definitions: execution.stepDefinitions,
      };
    });
    assert.deepEqual(result.flow, saved.fluxo);
    assert.deepEqual(result.steps, saved.fluxo);
    assert.equal(result.version, 1);
    assert.equal(result.status, "Falhou");
    assert.deepEqual(result.definitions, saved.stepDefinitions);
    // Crédito legado continua editável, inclusive etapas e dados originais.
    const legacy = await p.evaluate(() =>
      scenarioCatalog.find((c) => !c.frente),
    );
    if (legacy) {
      await p.evaluate(
        (id) => openCase(scenarioCatalog.find((c) => c.id === id)),
        legacy.id,
      );
      await p.locator("#caseForm button[type=submit]").click();
      const after = await p.evaluate(
        (id) => scenarioCatalog.find((c) => c.id === id),
        legacy.id,
      );
      assert.equal(after.nome, legacy.nome);
      assert.equal(after.tipo, legacy.tipo);
      assert.deepEqual(
        after.fluxo,
        await p.evaluate((c) => scenarioFlow(c), legacy),
      );
    }
    await p.fill("#trailForm [name=nome]", "Trilha Marketplace revisão");
    await p.locator(`#trailCases input[value="${saved.id}"]`).check();
    await p.locator("#trailForm button[type=submit]").click();
    await p
      .locator("#caseRows tr")
      .filter({ hasText: "Comprar no Marketplace" })
      .getByRole("button", { name: "Desativar", exact: true })
      .click();
    await p
      .locator("#trailList .stage-item")
      .filter({ hasText: "Trilha Marketplace revisão" })
      .getByRole("button", { name: "Editar", exact: true })
      .click();
    assert.match(
      await p
        .locator("#trailCases label")
        .filter({ hasText: "Comprar no Marketplace" })
        .textContent(),
      /Inativo/,
    );
    await p.uncheck("#onlyActive");
    await p
      .locator("#caseRows tr")
      .filter({ hasText: "Comprar no Marketplace" })
      .getByRole("button", { name: "Ativar", exact: true })
      .click();
    // Exercita as etapas de Marketplace pela tela real de homologação.
    await p.evaluate(() => {
      localStorage.setItem("issueflow.release.profile.v1", "tests-first-v1");
      localStorage.setItem(
        "issueflow.modules.v1",
        JSON.stringify({
          quality: true,
          delivery: true,
          homologation: true,
          gmud: true,
          approval: true,
          production: true,
          planning: true,
        }),
      );
    });
    await p.goto(base + "/homologacao.html?issue=ISS-1043");
    await p.click("#openPicker");
    await p.fill("#hoSearch", "Comprar no Marketplace");
    await p.locator("#hoCatalog input[type=checkbox]").check();
    await p.click("#addCases");
    const card = p
      .locator(".ho-case")
      .filter({ hasText: "Comprar no Marketplace" });
    await card.locator("summary").click();
    assert.deepEqual(
      await card
        .locator("select[data-stage]")
        .evaluateAll((nodes) => nodes.map((n) => n.dataset.stage)),
      saved.fluxo,
    );
    await card
      .locator('select[data-stage="Adicionar ao carrinho"]')
      .selectOption("OK");
    await card
      .locator('select[data-stage="Confirmar pagamento"]')
      .selectOption("Falhou");
    await card
      .locator('textarea[data-stage="Confirmar pagamento"]')
      .fill("Pagamento não confirmado");
    await p.click("#saveHO");
    await p.reload();
    const persisted = await p.evaluate(() =>
      hoPlans()["ISS-1043"].cenarios.find(
        (c) => c.nome === "Comprar no Marketplace",
      ),
    );
    assert.equal(persisted.etapas["Confirmar pagamento"], "Falhou");
    assert.equal(
      persisted.motivosEtapas["Confirmar pagamento"],
      "Pagamento não confirmado",
    );
    assert.deepEqual(persisted.fluxo, saved.fluxo);
    assert.deepEqual(errors, []);
    console.log(
      "PASS frentes, atributos condicionais, seleção de fluxo, snapshots, execução e crédito legado",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
