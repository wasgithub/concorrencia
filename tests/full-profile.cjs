// Apenas a regressão das releases futuras usa todos os módulos.
// O teste da primeira release executa os padrões reais, sem este preload.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const launch = chromium.launch.bind(chromium);
chromium.launch = async (...args) => {
  const browser = await launch(...args);
  const configure = async (context) => {
    await context.addInitScript(() => {
      if (
        localStorage.getItem("issueflow.release.profile.v1") !==
        "tests-first-v1"
      ) {
        localStorage.setItem(
          "issueflow.modules.v1",
          JSON.stringify({
            delivery: true,
            quality: true,
            homologation: true,
            gmud: true,
            approval: true,
            production: true,
            planning: true,
          }),
        );
        localStorage.setItem("issueflow.release.profile.v1", "tests-first-v1");
      }
    });
    return context;
  };
  const newContext = browser.newContext.bind(browser);
  browser.newContext = async (...options) =>
    configure(await newContext(...options));
  const newPage = browser.newPage.bind(browser);
  browser.newPage = async (...options) => {
    const page = await newPage(...options);
    await configure(page.context());
    return page;
  };
  return browser;
};
