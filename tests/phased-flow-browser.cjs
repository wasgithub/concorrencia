const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const manifest = require("../integration/releases/all-phases/manifest.json");
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
    p.setDefaultTimeout(10000);
    const base = process.env.ISSUEFLOW_URL || "http://localhost:8080";
    const routes = {
      "index.html": "delivery",
      "testes.html": "quality",
      "fluxos.html": "quality",
      "validacao-ho.html": "homologation",
      "changes.html": "gmud",
      "gmud-timeline.html": "approval",
      "producao.html": "production",
      "timeline.html": "planning",
    };
    for (const phase of manifest.phases) {
      await p.goto(base + "/configuracoes.html");
      for (const [flag, value] of Object.entries(phase.flags))
        await p.locator(`#moduleSettings [name=${flag}]`).setChecked(value);
      await p.locator("#moduleSettings button[type=submit]").click();
      assert.equal(await p.textContent("#moduleError"), "");
      for (const [route, flag] of Object.entries(routes)) {
        await p.goto(base + "/" + route);
        if (route === "index.html" && !phase.flags.delivery) {
          await p.waitForURL("**/testes.html");
          continue;
        }
        assert.equal(
          await p.locator("main").isVisible(),
          phase.flags[flag],
          phase.id + ":" + route,
        );
        if (!phase.flags[flag])
          assert(await p.locator("#moduleUnavailable").isVisible());
      }
      if (phase.id === "01-features") {
        await p.goto(base + "/index.html");
        await p.click("#newIssue");
        for (const [name, value] of Object.entries({
          squad: "Fases E2E",
          idIssue: "PHASE-101",
          descricao: "Entrega criada na fase de Features",
          servicos: "api-phases",
          dataInicialHomologacao: "2030-01-10",
          dataFinalHomologacao: "2030-01-11",
          dataProducao: "2030-01-20",
          dataAberturaChange: "2030-01-17",
        }))
          await p.fill(`#form [name=${name}]`, value);
        await p.selectOption("#form [name=ambiente]", "homologacao");
        await p.locator("#form button[type=submit]").click();
        assert.equal(await p.locator("#dialog").isVisible(), false);
        assert.equal(
          await p.locator(".feature-action-ho").first().isVisible(),
          false,
        );
      }
      if (phase.id === "04-changes") {
        await p.goto(base + "/changes.html");
        await p.click("#newChange");
        await p.fill("#pickerSearch", "PHASE-101");
        await p.locator("#issuePicker input[type=checkbox]").check();
        await p.fill("#changeForm [name=rdm]", "PHASE-RDM");
        await p.fill("#changeForm [name=smeTl]", "TL Fases");
        await p.fill("#changeForm [name=po]", "PO Fases");
        await p.locator("#changeForm button[type=submit]").click();
        assert.equal(await p.locator("#changeDialog").isVisible(), false);
        assert.equal(
          await p
            .getByRole("button", { name: "Aprovar subida", exact: true })
            .count(),
          0,
        );
        const same = await p.evaluate(() => {
          const c = changes[0],
            before = JSON.stringify(c);
          aprovar(c, { por: "Gerente" });
          return before === JSON.stringify(c);
        });
        assert(same, "função direta não aprova antes da fase de aprovação");
        const productionBlocked = await p.evaluate(() => {
          const previous = structuredClone(changes[0]);
          changes[0].status = "Executada";
          delete changes[0].encerramento;
          persist();
          openScenarios(changes[0]);
          openRollback();
          const blocked =
            !document.querySelector("#rollbackDialog").open &&
            document.querySelector("#openRollback").hidden &&
            document.querySelector("#saveScenario").hidden;
          document.querySelector("#scenarioDialog").close();
          changes[0] = previous;
          persist();
          return blocked;
        });
        assert(
          productionBlocked,
          "Registros antigos não liberam ações de PROD em fase anterior",
        );
        assert.equal(
          await p
            .getByRole("button", { name: "✓ Subida realizada", exact: true })
            .count(),
          0,
        );
      }
      console.log("PASS limites da fase " + phase.id);
    }
    await p.goto(base + "/configuracoes.html");
    const planningOnly = manifest.phases.find(
      (p) => p.id === "06-calendars",
    ).minimumFlags;
    for (const [flag, value] of Object.entries(planningOnly))
      await p.locator(`#moduleSettings [name=${flag}]`).setChecked(value);
    await p.locator("#moduleSettings button[type=submit]").click();
    assert.equal(await p.textContent("#moduleError"), "");
    await p.goto(base + "/timeline.html");
    assert(await p.locator("main").isVisible());
    assert.equal(await p.locator('a.nav[href="changes.html"]').count(), 0);
    assert.equal(await p.locator('a.nav[href="validacao-ho.html"]').count(), 0);
    assert.deepEqual(errors, []);
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
