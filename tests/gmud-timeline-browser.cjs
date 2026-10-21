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
    });
    p.setDefaultTimeout(8000);
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    const base = process.env.ISSUEFLOW_URL || "http://localhost:8080";
    await p.goto(base + "/gmud-timeline.html");
    assert(await p.locator("#gmudEmpty").isVisible());
    await p.goto(base + "/exemplos.html");
    await p.click("#loadExamples");
    await p.waitForFunction(() =>
      document
        .querySelector("#exampleStatus")
        .textContent.includes("Exemplos disponíveis"),
    );
    await p.goto(base + "/gmud-timeline.html");
    await p.fill("#gmudMonth", "2026-10");
    await p.locator("#gmudMonth").dispatchEvent("change");
    assert.equal(await p.locator(".gmud-row").count(), 5);
    assert.match(await p.textContent("#gmudGrid"), /Finalizada com sucesso/);
    assert.match(await p.textContent("#gmudGrid"), /Rollback realizado/);
    assert.match(
      await p.textContent("#gmudGrid"),
      /Validação de PROD pendente/,
    );
    assert(
      await p.locator(".gmud-row").evaluateAll((rows) =>
        rows.every((row) => {
          const mark = row.querySelector(".gmud-pin"),
            track = row.querySelector(".gmud-track"),
            cells = track.querySelectorAll(".gmud-cell"),
            day = Number(mark.style.gridColumn) - 1,
            m = mark.getBoundingClientRect(),
            cell = cells[day].getBoundingClientRect();
          return (
            m.left >= cell.left &&
            m.right <= cell.right &&
            !!row.querySelector(".gmud-label .gmud-window") &&
            !track.querySelector(".gmud-event-wrap")
          );
        }),
      ),
      "Cada implantação deve ocupar somente seu dia; horário e situação ficam fora do calendário",
    );
    await p.screenshot({ path: "/tmp/gmud-timeline.png", fullPage: true });
    const validateLink = p
      .locator(".gmud-row")
      .filter({ has: p.locator(".gmud-id", { hasText: /^DEMO-DEPLOY$/ }) })
      .locator(".gmud-validate");
    await validateLink.click();
    assert(await p.locator("#poDialog").isVisible());
    assert.equal(await p.textContent("#poTitle"), "DEMO-DEPLOY");
    assert.equal(
      await p.locator("#poTabReady").getAttribute("aria-selected"),
      "true",
    );
    await p.click("#poClose");
    assert.doesNotMatch(
      await p.textContent("#poCards"),
      /DEMO-SUCESSO|DEMO-ROLLBACK|DEMO-REPLANEJADA/,
    );
    await p.click("#poTabFinished");
    assert.match(await p.textContent("#poCards"), /DEMO-SUCESSO/);
    await p.goto(base + "/gmud-timeline.html");
    await p.locator("#gmudStatus").selectOption("rollback");
    assert.equal(await p.locator(".gmud-row").count(), 1);
    assert.match(await p.textContent(".gmud-row"), /DEMO-ROLLBACK/);
    const timelineURL = p.url();
    await p.locator(".gmud-pin").click();
    const detail = p.frameLocator("#gmudDetailsFrame");
    await detail.locator("#detailTitle").waitFor();
    assert.equal(p.url(), timelineURL);
    assert.match(
      await detail.locator("#detailTitle").textContent(),
      /DEMO-ROLLBACK/,
    );
    await detail.locator("#closeDetail").click();
    await p.locator("#gmudDetailsDialog").waitFor({ state: "hidden" });
    await p.goto(base + "/gmud-timeline.html");
    await p.fill("#gmudSearch", "DEMO-E2E-SUCESSO");
    assert.equal(await p.locator(".gmud-row").count(), 1);
    await p.fill("#gmudSearch", "");
    await p.click("#gmudNext");
    assert(await p.locator("#gmudEmpty").isVisible());
    await p.click("#gmudPrevious");
    assert.equal(await p.locator(".gmud-row").count(), 5);
    // Registro legado executado sem plano: completar uma única vez, com trilha de auditoria.
    await p.goto(base + "/changes.html");
    const missingId = await p.evaluate(() => {
      const c = changes.find((c) => c.rdm === "DEMO-DEPLOY");
      c.cenarios = [];
      persist();
      openScenarios(c);
      return c.id;
    });
    assert(await p.locator("#saveScenario").isVisible());
    await p.click("#saveScenario");
    assert.match(await p.textContent("#scenarioError"), /pelo menos um/);
    await p.click("#toggleHO");
    await p.locator("#scenarioHO input:not(:disabled)").check();
    await p.click("#addProductionSelection");
    await p.click("#saveScenario");
    assert.equal(
      await p.evaluate((id) => {
        const c = changes.find((c) => c.id === id);
        return (
          c.status === "Executada" &&
          c.cenarios.length === 1 &&
          execStatus(c.cenarios[0]) === "Pendente" &&
          c.historico.some((e) => e.nota?.includes("após registro de deploy"))
        );
      }, missingId),
      true,
    );
    await p.evaluate(
      (id) => openScenarios(changes.find((c) => c.id === id)),
      missingId,
    );
    assert.equal(await p.locator("#saveScenario").isVisible(), false);
    await p.goto(base + "/gmud-timeline.html");
    assert.match(await p.textContent("#gmudGrid"), /TL: TL Demo/);
    // Tentativas distintas para a mesma issue continuam sendo linhas independentes.
    const ids = await p.evaluate(() => {
      const all = productionChanges(),
        original = all.find((c) => c.rdm === "DEMO-ROLLBACK"),
        retry = {
          ...structuredClone(original),
          id: "retry",
          rdm: "DEMO-NOVA-TENTATIVA",
          status: "Aprovada",
          dataProducao: "2026-11-20",
          historico: [],
        };
      delete retry.encerramento;
      delete retry.aceiteProducao;
      all.push(retry);
      localStorage.setItem(productionChangesKey, JSON.stringify(all));
      return { original: original.id, retry: retry.id };
    });
    await p.goto(base + "/gmud-timeline.html?change=" + ids.retry);
    assert.equal(await p.locator("#gmudMonth").inputValue(), "2026-11");
    assert.match(await p.textContent(".gmud-row"), /DEMO-NOVA-TENTATIVA/);
    await p.goto(base + "/gmud-timeline.html?change=" + ids.original);
    assert.match(await p.textContent(".gmud-row"), /Rollback realizado/);
    await p.setViewportSize({ width: 390, height: 844 });
    assert(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await p.screenshot({
      path: "/tmp/gmud-timeline-mobile.png",
      fullPage: true,
    });
    await p.evaluate((id) => {
      const all = productionChanges();
      all.find((c) => c.id === id).status = "Planejada";
      localStorage.setItem(productionChangesKey, JSON.stringify(all));
    }, ids.retry);
    await p.goto(base + "/gmud-timeline.html?change=" + ids.retry);
    await p.locator(".gmud-pin").click();
    const approval = p.frameLocator("#gmudDetailsFrame");
    assert(await approval.locator("#detailDialog").isVisible());
    assert(
      await approval.locator('#detailActions input[name="por"]').isVisible(),
    );
    assert.match(
      await approval.locator("#detailActions").textContent(),
      /Confirmar aprovação da subida/,
    );
    await approval
      .getByRole("button", { name: "Abrir checklist", exact: true })
      .click();
    assert(await approval.locator("#checklistDialog").isVisible());
    await approval.locator("#closeChecklist").click();
    await approval.locator("#detailDialog").waitFor({ state: "visible" });
    await approval
      .getByRole("button", { name: "✓ Aprovar subida", exact: true })
      .click();
    await approval
      .locator('#detailActions input[name="por"]')
      .fill("Gerente Demo");
    const ack = approval.locator(".ack-incomplete input");
    if (await ack.count()) {
      await ack.check();
      await approval
        .locator("[name=exceptionReason]")
        .fill("Exceção controlada pela gerência");
    }
    const confirm = approval
      .locator("#detailActions button")
      .filter({ hasText: "Confirmar aprovação da subida" });
    await confirm.click();
    assert.equal(
      await p.evaluate(
        () => productionChanges().find((c) => c.id === "retry").status,
      ),
      "Aprovada",
    );
    assert(p.url().includes("gmud-timeline.html"));
    await approval.locator("#closeDetail").click();
    assert.match(await p.locator(".gmud-row").textContent(), /Aprovada/);
    assert.deepEqual(errors, []);
    console.log(
      "PASS agenda GMUD, cinco estados, filtros, meses, detalhes compartilhados, tentativas distintas, links diretos e mobile",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
