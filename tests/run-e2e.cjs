// Runner sem dependências novas na aplicação. Usa Playwright já disponível no ambiente de teste.
const fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http"),
  { spawn } = require("node:child_process");
const root = path.resolve(__dirname, ".."),
  out = path.join(root, "test-results", "e2e");
fs.mkdirSync(out, { recursive: true });
const suites = [
  "unit",
  "tests-first-browser",
  "scenario-front-form-browser",
  "phased-flow-browser",
  "navigation-browser",
  "feature-actions-browser",
  "reset-flow-browser",
  "homologacao-browser",
  "ho-audit-browser",
  "production-picker-browser",
  "flow-guards-browser",
  "change-edge-cases-browser",
  "po-workflow-browser",
  "timeline-outcomes-browser",
  "gmud-timeline-browser",
  "lifecycle-regressions-browser",
  "full-flow-browser",
];
async function main() {
  if (!process.env.PLAYWRIGHT_MODULE) {
    try {
      process.env.PLAYWRIGHT_MODULE = require.resolve("playwright");
    } catch {
      const cache = path.join(require("node:os").homedir(), ".npm", "_npx");
      if (fs.existsSync(cache))
        for (const item of fs.readdirSync(cache)) {
          const candidate = path.join(
            cache,
            item,
            "node_modules",
            "playwright",
          );
          if (fs.existsSync(path.join(candidate, "package.json"))) {
            process.env.PLAYWRIGHT_MODULE = candidate;
            break;
          }
        }
    }
  }
  if (!process.env.PLAYWRIGHT_MODULE)
    throw Error(
      "Playwright não está disponível no ambiente de testes. Informe PLAYWRIGHT_MODULE apontando para uma instalação existente. A aplicação continua sem dependências.",
    );
  if (!process.env.CHROME_PATH && process.platform === "darwin") {
    const chrome =
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    if (fs.existsSync(chrome)) process.env.CHROME_PATH = chrome;
  }
  let server;
  let base = process.env.ISSUEFLOW_URL;
  if (!base) {
    server = http.createServer((req, res) => {
      let file;
      try {
        file = path.resolve(
          root,
          "." +
            decodeURIComponent(new URL(req.url, "http://localhost").pathname),
        );
      } catch {
        res.writeHead(400);
        res.end();
        return;
      }
      if (file !== root && !file.startsWith(root + path.sep)) {
        res.writeHead(403);
        res.end();
        return;
      }
      if (file === root) file = path.join(root, "index.html");
      fs.readFile(file, (error, data) => {
        if (error) {
          res.writeHead(404);
          res.end();
          return;
        }
        res.setHeader(
          "Content-Type",
          {
            ".html": "text/html; charset=utf-8",
            ".js": "text/javascript; charset=utf-8",
            ".css": "text/css; charset=utf-8",
            ".json": "application/json",
          }[path.extname(file)] || "application/octet-stream",
        );
        res.end(data);
      });
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    base = "http://127.0.0.1:" + server.address().port;
  }
  const report = {
    startedAt: new Date().toISOString(),
    baseUrl: base,
    scope:
      "Protótipo HTML/JS: contextos isolados. tests-first-browser usa o perfil real de somente Testes; as regressões das próximas releases habilitam módulos explicitamente por fixture. Nenhum MongoDB ou deploy real executado.",
    results: [],
  };
  try {
    for (const suite of suites) {
      const args =
        suite === "unit"
          ? [
              "--test",
              ...fs
                .readdirSync(__dirname)
                .filter((f) => f.endsWith(".test.cjs"))
                .sort()
                .map((f) => path.join(__dirname, f)),
            ]
          : [
              ...(["tests-first-browser", "phased-flow-browser"].includes(suite)
                ? []
                : ["--require", path.join(__dirname, "full-profile.cjs")]),
              path.join(__dirname, suite + ".cjs"),
            ];
      const started = Date.now();
      const result = await new Promise((resolve) => {
        const child = spawn(process.execPath, args, {
          cwd: root,
          env: { ...process.env, ISSUEFLOW_URL: base, UPDATE_EXAMPLES: "0" },
          stdio: ["ignore", "pipe", "pipe"],
        });
        let log = "",
          timedOut = false;
        const timer = setTimeout(() => {
          timedOut = true;
          child.kill("SIGTERM");
        }, 120000);
        child.stdout.on("data", (chunk) => {
          log += chunk;
        });
        child.stderr.on("data", (chunk) => {
          log += chunk;
        });
        child.on("error", (error) => {
          clearTimeout(timer);
          resolve({ code: 1, log: log + error.message });
        });
        child.on("close", (code) => {
          clearTimeout(timer);
          resolve({ code: code ?? 1, log, timedOut });
        });
      });
      const row = {
        suite,
        profile:
          suite === "phased-flow-browser"
            ? "phase-boundaries"
            : suite === "tests-first-browser"
              ? "tests-first-v1"
              : suite === "unit"
                ? "unit"
                : "full-regression-fixture",
        status: result.code === 0 ? "passed" : "failed",
        durationMs: Date.now() - started,
        timedOut: !!result.timedOut,
      };
      report.results.push(row);
      fs.writeFileSync(path.join(out, suite + ".log"), result.log);
      console.log(
        row.status.toUpperCase() + " " + suite + " (" + row.durationMs + "ms)",
      );
      if (result.code !== 0) console.error(result.log.slice(-3500));
    }
  } finally {
    if (server) await new Promise((r) => server.close(r));
    report.finishedAt = new Date().toISOString();
    report.passed = report.results.filter((r) => r.status === "passed").length;
    report.failed = report.results.filter((r) => r.status === "failed").length;
    fs.writeFileSync(
      path.join(out, "report.json"),
      JSON.stringify(report, null, 2),
    );
    fs.writeFileSync(
      path.join(out, "report.md"),
      "# Resultado dos testes ponta a ponta\n\n" +
        report.scope +
        "\n\n" +
        report.results
          .map(
            (r) =>
              "- " +
              r.status.toUpperCase() +
              " — " +
              r.suite +
              " (" +
              r.durationMs +
              " ms)",
          )
          .join("\n") +
        "\n\nPassaram: " +
        report.passed +
        ". Falharam: " +
        report.failed +
        ".\n",
    );
    console.log("Relatório: " + path.join(out, "report.md"));
  }
  if (report.failed) process.exitCode = 1;
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
