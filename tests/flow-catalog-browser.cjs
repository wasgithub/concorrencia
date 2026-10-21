const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright"),
  assert = require("node:assert/strict");
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
      base = process.env.ISSUEFLOW_URL || "http://localhost:8080",
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    p.setDefaultTimeout(8000);
    await p.goto(base + "/fluxos.html");
    await p.click("#newFlow");
    await p.selectOption("#flowForm [name=frente]", "Marketplace");
    await p.selectOption("#flowForm [name=funcionalidade]", "Compra");
    await p.fill("#flowForm [name=nome]", "Finalização do pedido");
    await p
      .getByRole("textbox", { name: "Etapa 1", exact: true })
      .fill("Adicionar ao carrinho");
    await p.click("#addFlowStep");
    await p
      .getByRole("textbox", { name: "Etapa 2", exact: true })
      .fill("Efetuar pagamento");
    await p.click("#addFlowStep");
    await p
      .getByRole("textbox", { name: "Etapa 3", exact: true })
      .fill("Confirmar pedido");
    await p.locator("#flowForm button[type=submit]").click();
    const id = await p.evaluate(
      () => testFlows().find((f) => f.nome === "Finalização do pedido").id,
    );
    await p.screenshot({ path: "/tmp/quality-flows.png", fullPage: true });
    await p.goto(base + "/testes.html");
    await p.click("#newCase");
    assert.equal(await p.locator("#caseTarget").isVisible(), false);
    await p.selectOption("#caseForm [name=frente]", "Marketplace");
    assert.doesNotMatch(
      await p.locator("#caseForm [name=workflowId]").textContent(),
      /crédito|Desembolso/i,
    );
    assert.equal(
      await p.locator("#caseForm [name=etapaAlvo] option").count(),
      0,
    );
    await p.selectOption("#caseForm [name=funcionalidade]", "Compra");
    await p.selectOption("#caseWorkflow", id);
    assert.doesNotMatch(
      await p.locator("#caseFlowPreview").textContent(),
      /Desembolso|Simulação/,
    );
    assert.equal(await p.locator("#customSteps").isVisible(), false);
    await p.fill("#caseForm [name=nome]", "Comprar com cartão");
    await p.screenshot({ path: "/tmp/quality-scenario.png", fullPage: true });
    await p.locator("#caseForm button[type=submit]").click();
    const snapshot = await p.evaluate(() =>
      scenarioCatalog.find((c) => c.nome === "Comprar com cartão"),
    );
    assert.deepEqual(snapshot.fluxo, [
      "Adicionar ao carrinho",
      "Efetuar pagamento",
      "Confirmar pedido",
    ]);
    assert.equal(snapshot.workflowVersion, 1);
    await p.goto(base + "/fluxos.html");
    const card = p
      .locator(".flow-card")
      .filter({ hasText: "Finalização do pedido" });
    await card.getByRole("button", { name: "Editar", exact: true }).click();
    await p
      .getByRole("button", { name: "Mover etapa para cima 3", exact: true })
      .click();
    assert.equal(
      await p
        .getByRole("textbox", { name: "Etapa 2", exact: true })
        .inputValue(),
      "Confirmar pedido",
    );
    await p.locator("#flowForm [name=ativo]").uncheck();
    await p.locator("#flowForm button[type=submit]").click();
    await p.goto(base + "/testes.html");
    const current = await p.evaluate(() => {
      const c = scenarioCatalog.find((c) => c.nome === "Comprar com cartão");
      const ho = newTestExecution(c);
      ho.etapas = {
        "Adicionar ao carrinho": "OK",
        "Efetuar pagamento": "Falhou",
      };
      return { c, status: execStatus(ho), steps: executionStages(ho) };
    });
    assert.deepEqual(current.c, snapshot);
    assert.equal(current.status, "Falhou");
    assert.equal(current.steps[1], "Efetuar pagamento");
    await p
      .locator("#caseRows tr")
      .filter({ hasText: "Comprar com cartão" })
      .getByRole("button", { name: "Editar", exact: true })
      .click();
    assert.equal(
      await p.locator("#caseForm [name=steps]").inputValue(),
      snapshot.fluxo.join("\n"),
    );
    await p.locator("#caseForm button[type=submit]").click();
    assert.equal(
      await p.evaluate(
        () =>
          scenarioCatalog.find((c) => c.nome === "Comprar com cartão")
            .workflowVersion,
      ),
      1,
    );
    await p.goto(base + "/fluxos.html");
    await p.setViewportSize({ width: 390, height: 844 });
    assert(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS cadastro e ordenação de fluxo Marketplace, escopo sem crédito, snapshots históricos e fluxo bloqueado na etapa com falha",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
