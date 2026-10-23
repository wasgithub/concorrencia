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
    p.setDefaultTimeout(10000);
    await p.goto(
      (process.env.ISSUEFLOW_URL || "http://localhost:8080") + "/changes.html",
    );
    await p.click("#newFreeze");
    await p.fill("#freezeForm [name=nome]", "E2E freeze");
    await p.fill("#freezeForm [name=dataInicio]", "2030-03-01");
    await p.fill("#freezeForm [name=dataFim]", "2030-02-28");
    await p.fill("#freezeForm [name=termos]", "pix");
    await p.locator("#freezeForm button[type=submit]").click();
    assert.match(await p.textContent("#freezeError"), /posterior/);
    await p.fill("#freezeForm [name=dataFim]", "2030-03-02");
    await p.locator("#freezeForm button[type=submit]").click();
    assert(
      await p.evaluate(() =>
        freezesFor("2030-03-01", ["api-pix"]).some(
          (f) => f.nome === "E2E freeze",
        ),
      ),
    );
    assert.equal(
      await p.evaluate(() =>
        freezesFor("2030-03-01", ["api-outro"]).some(
          (f) => f.nome === "E2E freeze",
        ),
      ),
      false,
    );
    const freeze = p.locator(".freeze-card").filter({ hasText: "E2E freeze" });
    await freeze.getByRole("button", { name: "Editar", exact: true }).click();
    await p.selectOption("#freezeForm [name=escopo]", "total");
    await p.locator("#freezeForm button[type=submit]").click();
    assert(
      await p.evaluate(() =>
        freezesFor("2030-03-01", ["api-outro"]).some(
          (f) => f.nome === "E2E freeze",
        ),
      ),
    );
    await freeze.getByRole("button", { name: "Excluir", exact: true }).click();
    await p.reload();
    assert.equal(
      await p.evaluate(() => freezes.some((f) => f.nome === "E2E freeze")),
      false,
    );
    const id = await p.evaluate(() => {
      const c = changes[0];
      delete c.encerramento;
      c.status = "Em aprovação";
      persist();
      openQuickAction(c, "rejeitar");
      return c.id;
    });
    await p.locator("#quickActionBody .primary").click();
    assert.equal(
      await p.evaluate((id) => changes.find((c) => c.id === id).status, id),
      "Em aprovação",
    );
    await p.fill("#quickActionBody [name=por]", "Gerente E2E");
    await p.locator("#quickActionBody .primary").click();
    assert.equal(
      await p.evaluate((id) => changes.find((c) => c.id === id).status, id),
      "Rejeitada",
    );
    assert(
      await p.evaluate((id) => {
        const c = changes.find((c) => c.id === id);
        return activeChangeOf(c.issueIds[0])?.id !== id;
      }, id),
    );
    await p.evaluate((id) => {
      const c = changes.find((c) => c.id === id);
      c.status = "Aprovada";
      persist();
      openQuickAction(c, "naoRealizar");
    }, id);
    await p.fill("#quickActionBody [name=por]", "TL E2E");
    await p.locator("#quickActionBody .primary").click();
    assert.equal(
      await p.evaluate((id) => changes.find((c) => c.id === id).status, id),
      "Não realizada",
    );
    const protectedAfterDeploy = await p.evaluate((id) => {
      const c = changes.find((c) => c.id === id);
      c.status = "Executada";
      delete c.encerramento;
      persist();
      const before = JSON.stringify(c);
      rejeitar(c, { por: "Gerente", motivo: "teste" });
      naoRealizar(c, { por: "TL", motivo: "teste" });
      executar(c, {});
      aprovar(c, { por: "Gerente" });
      return before === JSON.stringify(c);
    }, id);
    assert(
      protectedAfterDeploy,
      "Ações anteriores ao deploy não alteram subida já realizada",
    );
    assert.equal(await p.evaluate(() => consumo("23:30", "00:30")), "1:00");
    assert.deepEqual(errors, []);
    console.log(
      "PASS freeze por termo/total e datas, rejeição, não realizada, identidade obrigatória e ações legadas bloqueadas após deploy",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
