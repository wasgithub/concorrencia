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
    const context = await browser.newContext(),
      p = await context.newPage(),
      base = process.env.ISSUEFLOW_URL || "http://localhost:8080",
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(base + "/configuracoes.html");
    await p.locator("#moduleSettings [name=gmud]").uncheck();
    await p.locator("#moduleSettings button[type=submit]").click();
    assert.match(await p.textContent("#moduleSuccess"), /atualizados/);
    assert.equal(await p.locator('a.nav[href="changes.html"]').count(), 0);
    await p.goto(base + "/changes.html");
    assert(await p.locator("#moduleUnavailable").isVisible());
    assert.equal(await p.locator("main").isVisible(), false);
    await p.goto(base + "/configuracoes.html");
    await p.locator("#moduleSettings [name=gmud]").check();
    await p.locator("#moduleSettings [name=production]").check();
    await p.locator("#moduleSettings button[type=submit]").click();
    await p.locator("#qualitySettings [name=label]").fill("Categoria");
    await p
      .locator("#qualitySettings [name=types]")
      .fill("API\nSegurança\nInterface");
    await p.locator("#qualitySettings button[type=submit]").click();
    await p.goto(base + "/testes.html");
    await p.click("#newCase");
    await p.locator("#caseForm [name=nome]").fill("Autenticação de API");
    await p.locator("#caseForm [name=tipo]").selectOption("Segurança");
    await p
      .locator("#caseForm [name=steps]")
      .fill("Preparar credencial\nAutenticar\nValidar permissões");
    await p.locator("#caseForm button[type=submit]").click();
    assert.match(await p.textContent("#caseRows"), /Segurança/);
    const flow = await p.evaluate(() => {
      const c = scenarioCatalog.find((c) => c.nome === "Autenticação de API"),
        exec = newTestExecution(c);
      return { flow: executionStages(exec), label: exec.classificationLabel };
    });
    assert.deepEqual(flow, {
      flow: ["Preparar credencial", "Autenticar", "Validar permissões"],
      label: "Categoria",
    });
    await p.goto(base + "/configuracoes.html");
    await p.locator("#qualitySettings [name=types]").fill("Outro tipo");
    await p.locator("#qualitySettings button[type=submit]").click();
    await p.goto(base + "/testes.html");
    assert.match(await p.textContent("#caseRows"), /Segurança/);
    await p.click("#newCase");
    await p.fill("#caseForm [name=nome]", "Rascunho não perdido");
    await p.fill("#caseForm [name=steps]", "Validar resposta");
    await p.evaluate(() => {
      const original = Storage.prototype.setItem;
      window.restoreTestStorage = () => {
        Storage.prototype.setItem = original;
      };
      Storage.prototype.setItem = function (key, value) {
        if (key === "issueflow.scenariocatalog.v1")
          throw Error("Simular falha de armazenamento");
        return original.call(this, key, value);
      };
    });
    await p.locator("#caseForm button[type=submit]").click();
    assert(await p.locator("#caseDialog").isVisible());
    assert.match(await p.textContent("#caseError"), /Não foi possível salvar/);
    assert.equal(
      await p.locator("#caseForm [name=nome]").inputValue(),
      "Rascunho não perdido",
    );
    await p.evaluate(() => window.restoreTestStorage());
    await p.click("#cancelCase");
    const saved = await p.evaluate(() => JSON.stringify(scenarioCatalog));
    await p.goto(base + "/configuracoes.html");
    await p.locator("#moduleSettings [name=delivery]").uncheck();
    await p.locator("#moduleSettings button[type=submit]").click();
    await p.goto(base + "/testes.html");
    assert(await p.locator("main").isVisible());
    assert.equal(await p.evaluate(() => typeof issues), "undefined");
    await p.goto(base + "/configuracoes.html");
    await p.locator("#moduleSettings [name=quality]").uncheck();
    await p.locator("#moduleSettings button[type=submit]").click();
    await p.goto(base + "/testes.html");
    assert(await p.locator("#moduleUnavailable").isVisible());
    assert.equal(
      await p.evaluate(() => JSON.stringify(scenarioCatalog)),
      saved,
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS módulos/dependências, acesso direto bloqueado, vocabulário configurável e passos independentes preservados",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
