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
    p.setDefaultTimeout(10000);
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(base + "/testes.html");
    await p.goto(base + "/limpar-fluxo.html");
    for (const id of ["SCOPE-101", "SCOPE-102"]) {
      await p.goto(base + "/index.html");
      await p.click("#newIssue");
      for (const [name, value] of Object.entries({
        squad: "Tribo Escopo",
        idIssue: id,
        descricao: "Validar escopo da CPR",
        servicos: "api-cpr",
        dataInicialHomologacao: "2026-10-22",
        dataFinalHomologacao: "2026-10-23",
        dataProducao: "2026-10-28",
        dataAberturaChange: "2026-10-25",
      }))
        await p.fill(`#form [name=${name}]`, value);
      await p.selectOption("#form [name=ambiente]", "homologacao");
      await p.locator("#form button[type=submit]").click();
      assert(!(await p.locator("#dialog").isVisible()));
    }
    await p.goto(base + "/homologacao.html?issue=SCOPE-101");
    const catalog = await p.evaluate(() => JSON.stringify(scenarioCatalog));
    await p.click("#openPicker");
    try {
      await p.selectOption("#hoEtapa", "Análise Documental Flex");
    } catch (error) {
      console.error(
        "Diagnóstico do filtro de etapas",
        await p.evaluate(() => ({
          url: location.href,
          catalog: scenarioCatalog,
          stages: testStages,
          options: [...document.querySelectorAll("#hoEtapa option")].map(
            (o) => o.value,
          ),
        })),
        errors,
      );
      await p.screenshot({
        path: "/tmp/ho-scope-filter-failure.png",
        fullPage: true,
      });
      throw error;
    }
    await p.locator('#hoCatalog input[value="cat-001"]').check();
    // Se a inclusão falhar, o seletor deve permanecer aberto e mostrar o erro.
    await p.evaluate(
      () => (scopeDrafts.get("cat-001").end = "Etapa inexistente"),
    );
    await p.click("#addCases");
    assert(await p.locator("#hoPicker").isVisible());
    assert.match(await p.textContent("#hoPickerError"), /etapa/);
    assert.equal(await p.locator("#hoScopeReview").isVisible(), false);
    await p.click("#reviewScopeSelection");
    const selected = p.locator('#hoScopeRows tr[data-scenario="cat-001"]');
    await selected.locator("select").selectOption("Análise Documental Flex");
    await selected.locator("[data-assignment=resp]").fill("Dev A");
    await selected.locator("[data-assignment=reviewer]").fill("Dev B");
    await p.fill("#hoSearch", "nenhum resultado");
    assert.equal(
      await selected.locator("select").inputValue(),
      "Análise Documental Flex",
    );
    await p.click("#tabTrails");
    await p.click("#tabCatalog");
    assert.equal(
      await selected.locator("[data-assignment=resp]").inputValue(),
      "Dev A",
    );
    await p.setViewportSize({ width: 390, height: 844 });
    await p.click("#reviewScopeSelection");
    await selected.locator("[data-assignment=resp]").fill("Dev A");
    await selected.locator("[data-assignment=reviewer]").fill("Dev B");
    assert(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await p.screenshot({ path: "/tmp/ho-scope-picker-mobile.png" });
    await p.setViewportSize({ width: 1440, height: 1000 });
    await p.click("#addCases");
    assert.equal(
      await p.evaluate(() => JSON.stringify(scenarioCatalog)),
      catalog,
    );
    await p.click("#hoJiraPanel summary");
    await p.fill("#hoJiraIssue", "javascript:alert(1)");
    await p.click("#saveHO");
    assert.match(await p.textContent("#hoError"), /chave/);
    await p.fill("#hoJiraIssue", "SCOPE-101");
    await p.fill("#hoJiraExecution", "https://jira.example/browse/TEST-201");
    await p.click("#saveHO");
    assert.equal(
      await p.locator("#hoJiraLinks a").getAttribute("href"),
      "https://jira.example/browse/TEST-201",
    );
    // O mesmo cenário em outra entrega tem escopo independente; trilhas usam a mesma revisão de escopo.
    await p.evaluate(() =>
      saveTestData(testTrailsKey, [
        { id: "cpr-regression", nome: "Regressivo CPR", casoIds: ["cat-001"] },
      ]),
    );
    await p.goto(base + "/homologacao.html?issue=SCOPE-102");
    await p.click("#openPicker");
    await p.click("#tabTrails");
    await p.selectOption("#hoTrail", "cpr-regression");
    await p.click("#reviewScopeSelection");
    await p.locator("#hoScopeRows select").selectOption("Emissão de Contrato");
    await p.locator("#hoScopeRows [data-assignment=resp]").fill("Dev C");
    await p.click("#applyTrail");
    await p.click("#saveHO");
    assert.equal(
      await p.evaluate(() => hoPlans()["SCOPE-101"].cenarios[0].fluxo.length),
      4,
    );
    assert.equal(
      await p.evaluate(() => hoPlans()["SCOPE-102"].cenarios[0].fluxo.length),
      7,
    );
    await p.goto(base + "/homologacao.html?issue=SCOPE-101");
    if (!(await p.locator(".ho-case").evaluate((el) => el.open)))
      await p.locator(".ho-case > summary").click();
    assert.equal(await p.locator(".ho-stage-grid select").count(), 4);
    assert.match(
      await p.textContent(".ho-excluded"),
      /Desembolso.*Fora do escopo/,
    );
    // Ajuste antes de executar usa a cópia original, sem editar o catálogo.
    await p
      .getByRole("button", { name: "Escopo e responsáveis", exact: true })
      .click();
    await p
      .locator("#hoEditScopeRows select")
      .selectOption("Criação de Pedido");
    await p.click("#applyScope");
    await p
      .getByRole("button", { name: "Escopo e responsáveis", exact: true })
      .click();
    await p
      .locator("#hoEditScopeRows select")
      .selectOption("Análise Documental Flex");
    await p.click("#applyScope");
    await p.locator(".ho-stage-grid select").nth(1).selectOption("Falhou");
    await p
      .locator(".ho-stage-grid textarea[data-stage]")
      .nth(1)
      .fill("Erro no pedido");
    await p.click("#saveHO");
    await p
      .getByRole("button", { name: "Escopo e responsáveis", exact: true })
      .click();
    assert(await p.locator("#hoEditScopeRows select").isDisabled());
    await p
      .locator("#hoEditScopeRows [data-assignment=reviewer]")
      .fill("TL Revisor");
    await p.click("#applyScope");
    await p.click("#saveHO");
    assert.match(
      await p.textContent("#hoNext"),
      /Bloqueado em: Criação de Pedido/,
    );
    await p.click("#hoAssignmentSummary");
    assert.match(await p.textContent("#hoAssignments"), /Dev A.*TL Revisor/s);
    await p.screenshot({ path: "/tmp/ho-scoped-execution.png" });
    await p.goto(base + "/validacao-ho.html");
    await p.fill("#hoQueueSearch", "SCOPE-101");
    assert.match(
      await p.textContent("#hoQueueCards"),
      /Criação de Pedido.*Dev A/,
    );
    await p.goto(base + "/homologacao.html?issue=SCOPE-101");
    if (!(await p.locator(".ho-case").evaluate((el) => el.open)))
      await p.locator(".ho-case > summary").click();
    await p.locator(".ho-stage-grid select").nth(1).selectOption("OK");
    await p.locator(".ho-fill-ok").click();
    await p.click("#saveHO");
    await p.fill("#hoApprove [name=por]", "PO Escopo");
    await p.fill("#hoApprove [name=nota]", "Escopo documental validado");
    await p.locator("#hoApprove button[type=submit]").click();
    assert.match(await p.textContent("#hoAcceptanceBadge"), /aprovada/);
    assert(
      await p.evaluate(() => {
        const sc = hoPlans()["SCOPE-101"].cenarios[0];
        return (
          hoComplete({ cenarios: [sc] }) &&
          !("Desembolso" in sc.etapas) &&
          sc.sourceFlow.length === 10
        );
      }),
    );
    await p.locator("#hoNext a").click();
    await p.fill("#changeForm [name=rdm]", "SCOPE-PROD");
    await p.fill("#changeForm [name=smeTl]", "TL Escopo");
    await p.fill("#changeForm [name=po]", "PO Escopo");
    await p.locator("#changeForm button[type=submit]").click();
    const id = await p.evaluate(
        () => changes.find((c) => c.rdm === "SCOPE-PROD").id,
      ),
      row = p.locator("#agendaRows tr").filter({ hasText: "SCOPE-PROD" });
    await row.getByRole("button", { name: /Testes de PROD pendentes/ }).click();
    await p.click("#toggleHO");
    assert.match(await p.textContent("#scenarioHO"), /4\/10 etapas no escopo/);
    await p.locator("#scenarioHO input:not(:disabled)").check();
    await p.click("#addProductionSelection");
    await p.click("#saveScenario");
    assert.deepEqual(
      await p.evaluate((id) => {
        const sc = changes.find((c) => c.id === id).cenarios[0];
        return [
          executionStages(sc).length,
          executionFullStages(sc).length,
          execStatus(sc),
        ];
      }, id),
      [4, 10, "Pendente"],
    );
    await row
      .getByRole("button", { name: "Aprovar subida", exact: true })
      .click();
    await p.fill("#quickActionBody [name=por]", "Gerente Escopo");
    await p.locator(".ack-incomplete input").check();
    await p.locator("#quickActionBody .primary").click();
    await row
      .getByRole("button", { name: "✓ Subida realizada", exact: true })
      .click();
    await p.locator("#quickActionBody .primary").click();
    await p.goto(base + "/producao.html?change=" + id);
    assert.equal(await p.locator("#poScenarios select").count(), 4);
    assert.match(
      await p.textContent(".prod-scope-note"),
      /Fora do escopo:.*Desembolso/,
    );
    await p.locator(".po-all-ok").click();
    await p.fill("#poPerson", "PO Escopo");
    await p.click("#poFinish");
    assert.match(await p.textContent("#poNotice"), /Validação concluída/);
    await p.goto(base + "/changes.html");
    await row
      .getByRole("button", { name: "Encerrar GMUD", exact: true })
      .click();
    await p.locator("#quickActionBody .primary").click();
    assert(
      await p.evaluate(
        (id) => !!changes.find((c) => c.id === id).encerramento,
        id,
      ),
    );
    await p.goto(base + "/testes.html");
    assert.equal(
      await p.evaluate(() => JSON.stringify(scenarioCatalog)),
      catalog,
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS USs com escopos distintos, trilha, referências Jira, responsáveis, bloqueio após resultado, histórico e PROD limitado ao escopo homologado até encerramento",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
