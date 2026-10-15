const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright"),
  assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
      headless: true,
      ...(process.env.CHROME_PATH
        ? { executablePath: process.env.CHROME_PATH }
        : {}),
    }),
    failures = [];
  const base = process.env.ISSUEFLOW_URL || "http://localhost:8080";
  async function run(name, check) {
    const context = await browser.newContext(),
      p = await context.newPage();
    p.setDefaultTimeout(8000);
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    try {
      await p.goto(base + "/exemplos.html");
      await p.click("#loadExamples");
      await p.waitForFunction(() =>
        document
          .querySelector("#exampleStatus")
          .textContent.includes("Exemplos disponíveis"),
      );
      await p.goto(base + "/changes.html");
      await check(p, context);
      assert.deepEqual(errors, []);
      console.log("PASS " + name);
    } catch (e) {
      failures.push(name + ": " + e.message);
      console.error("FAIL " + name + ": " + e.message);
    } finally {
      await context.close();
    }
  }
  try {
    await run(
      "GMUD encerrada libera a issue para outra tentativa",
      async (p) => {
        await p.click("#newChange");
        await p.fill("#pickerSearch", "DEMO-E2E-SUCESSO");
        assert.equal(
          await p.locator("#issuePicker input:not(:disabled)").count(),
          1,
        );
      },
    );
    await run(
      "Rollback preserva histórico e bloqueia alteração da tentativa antiga",
      async (p) => {
        const id = await p.evaluate(
          () => changes.find((c) => c.rdm === "DEMO-ROLLBACK").id,
        );
        await p.goto(base + "/changes.html?change=" + id);
        assert.equal(await p.locator("#detailActions button").count(), 0);
        await p.click("#closeDetail");
        const row = p
          .locator("#agendaRows tr")
          .filter({ hasText: "DEMO-ROLLBACK" });
        assert.equal(
          await row
            .getByRole("button", { name: "Editar GMUD", exact: true })
            .count(),
          0,
        );
        assert.equal(
          await row
            .getByRole("button", { name: "Reprogramar subida", exact: true })
            .count(),
          0,
        );
      },
    );
    await run(
      "Aprovação não permite registrar rollback antes de deploy",
      async (p) => {
        const id = await p.evaluate(
          () => changes.find((c) => c.rdm === "DEMO-REPLANEJADA").id,
        );
        await p.goto(base + "/changes.html?change=" + id);
        assert.equal(
          await p
            .locator("#detailActions")
            .getByRole("button", { name: "Registrar rollback", exact: true })
            .count(),
          0,
        );
      },
    );
    await run(
      "Deploy registrado não pode ser reprogramado sobre a mesma tentativa",
      async (p) => {
        const row = p
          .locator("#agendaRows tr")
          .filter({ hasText: /DEMO-DEPLOY/ });
        assert.equal(
          await row
            .getByRole("button", { name: "Reprogramar subida", exact: true })
            .count(),
          0,
        );
      },
    );
    await run(
      "Data prevista não marca a issue como implantada sem confirmação TL",
      async (p) => {
        await p.addInitScript(() => {
          const OriginalDate = Date;
          const fixed = OriginalDate.parse("2026-10-20T12:00:00-03:00");
          window.Date = class extends OriginalDate {
            constructor(...args) {
              super(...(args.length ? args : [fixed]));
            }
            static now() {
              return fixed;
            }
          };
        });
        await p.goto(base + "/index.html");
        const row = p
          .locator("#rows tr")
          .filter({ hasText: "DEMO-E2E-REPLANEJADA" });
        assert.equal(
          await row.locator(".feature-status .badge").textContent(),
          "Aguardando produção",
        );
      },
    );
    await run("RDM duplicada não cria outra GMUD", async (p) => {
      await p.click("#newChange");
      await p.fill("#pickerSearch", "DEMO-E2E-ROLLBACK");
      await p.locator("#issuePicker input:not(:disabled)").check();
      await p.locator("#changeForm [name=rdm]").fill("DEMO-REPLANEJADA");
      await p.locator("#changeForm [name=smeTl]").fill("TL Teste");
      await p.locator("#changeForm [name=po]").fill("PO Teste");
      await p.locator("#changeForm button[type=submit]").click();
      assert(await p.locator("#changeDialog").isVisible());
      assert.match(await p.textContent("#changeError"), /RDM/);
    });
    await run(
      "Aceite HO em aba antiga não sobrescreve resultado salvo pelo QA",
      async (p, context) => {
        const po = await context.newPage();
        await p.goto(base + "/homologacao.html?issue=DEMO-E2E-DEPLOY");
        await po.goto(base + "/homologacao.html?issue=DEMO-E2E-DEPLOY");
        await p.locator(".ho-case summary").first().click();
        await p.locator(".ho-stage-grid select").last().selectOption("Falhou");
        await p.click("#saveHO");
        await po.locator("#hoApprove [name=por]").fill("PO aba antiga");
        await po
          .locator("#hoApprove [name=nota]")
          .fill("Não deve substituir a falha do QA");
        await po.locator("#hoApprove button[type=submit]").click();
        assert.equal(
          await p.evaluate(() =>
            execStatus(hoPlans()["DEMO-E2E-DEPLOY"].cenarios[0]),
          ),
          "Falhou",
        );
        assert.equal(
          await p.evaluate(() => !!hoPlans()["DEMO-E2E-DEPLOY"].aceite),
          false,
        );
        await po.close();
      },
    );
  } finally {
    await browser.close();
  }
  if (failures.length) throw Error(failures.join("\n"));
  console.log("PASS regressões de ciclo de vida e concorrência HO");
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
