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
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    const base = process.env.ISSUEFLOW_URL || "http://localhost:8080";
    await p.goto(base + "/index.html");
    const first = p.locator("#rows tr").first(),
      id = await p.evaluate(() => issues[0].idIssue),
      components = await p.evaluate(() => issues[0].servicos.length);
    assert.equal(
      await first.locator(".feature-actions .feature-action").count(),
      2,
    );
    assert.equal(await first.locator("td").count(), 6);
    assert((await first.boundingBox()).height < 90);
    await first
      .getByRole("button", { name: "Ver componentes de " + id, exact: true })
      .click();
    assert(await p.locator("#componentsDialog").isVisible());
    assert.match(await p.textContent("#componentsTitle"), new RegExp(id));
    assert.equal(
      await p.locator("#componentDetails .component-detail").count(),
      components,
    );
    assert.match(await p.textContent("#featureDetails"), /Abertura da GMUD/);
    await p.keyboard.press("Escape");
    await first.locator(".feature-action-ho").focus();
    await p.keyboard.press("Enter");
    await p.waitForURL("**/homologacao.html?issue=" + id);
    await p.waitForFunction(
      (issueId) => document.querySelector("#hoTitle")?.textContent.includes(issueId),
      id,
    );
    assert(p.url().includes("homologacao.html?issue=" + id));
    assert.match(await p.textContent("#hoTitle"), new RegExp(id));
    await p.goto(base + "/index.html");
    await p.evaluate(() => {
      const template = issues[0];
      issues = Array.from({ length: 61 }, (_, i) => ({
        ...template,
        idIssue: "PAG-" + String(i + 1).padStart(3, "0"),
        descricao: "Item de paginação " + (i + 1),
        servicos: ["api-item-" + i],
      }));
      render();
    });
    assert.equal(await p.locator("#rows tr").count(), 25);
    await p.click("#featureNext");
    assert.match(await p.locator("#rows tr").first().textContent(), /PAG-026/);
    await p.fill("#search", "PAG-061");
    assert.equal(await p.locator("#rows tr").count(), 1);
    assert.equal(await p.textContent("#featurePageLabel"), "1 / 1");
    await p.fill("#search", "");
    await p.selectOption("#featurePageSize", "50");
    assert.equal(await p.locator("#rows tr").count(), 50);
    await p.goto(base + "/index.html");
    await p.setViewportSize({ width: 390, height: 844 });
    await p
      .locator(".table-scroll")
      .evaluate((el) => (el.scrollLeft = el.scrollWidth));
    const button = p
      .locator("#rows tr")
      .first()
      .locator(".feature-action-components");
    const bounds = await button.boundingBox();
    assert(bounds.x >= 0 && bounds.x + bounds.width <= 390);
    await button.click();
    assert(await p.locator("#componentsDialog").isVisible());
    await p.keyboard.press("Escape");
    assert(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await p.screenshot({ path: "/tmp/feature-actions-mobile.png" });
    await p.setViewportSize({ width: 1440, height: 1000 });
    await p.locator(".table-scroll").evaluate((el) => (el.scrollLeft = 0));
    await p.screenshot({ path: "/tmp/feature-actions-desktop.png" });
    assert.deepEqual(errors, []);
    console.log(
      "PASS lista compacta de seis colunas, detalhes completos, paginação, filtros, modal, teclado e mobile",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
