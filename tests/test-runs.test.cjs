const { test } = require("node:test");
const assert = require("node:assert/strict");
const runs = require("../modules/test-runs/run-store.js");
const scenario = (results, team = "A") => ({
  id: "s",
  team,
  steps: results.map((result, i) => ({
    id: String(i),
    name: "Etapa " + i,
    result,
  })),
});
test("regressivo distingue falha, andamento, dispensa e conclusão", () => {
  assert.equal(runs.scenarioState(scenario(["ok", "failed"])), "failed");
  assert.equal(runs.scenarioState(scenario(["ok", "pending"])), "running");
  assert.equal(runs.scenarioState(scenario(["pending"])), "pending");
  assert.equal(runs.scenarioState(scenario(["not_applicable"])), "dispensed");
  assert.equal(runs.scenarioState(scenario(["ok", "not_applicable"])), "done");
  assert.equal(runs.scenarioState(scenario([])), "pending");
});
test("percentuais não contam N/A ou falha como validação bem sucedida", () => {
  const m = runs.metrics([
    scenario(["ok", "not_applicable"]),
    scenario(["failed", "pending"]),
    scenario(["not_applicable"]),
  ]);
  assert.equal(m.percent, 50);
  assert.equal(m.remaining, 1);
  assert.equal(m.dispensed, 1);
  assert.equal(m.stages.applicable, 3);
  assert.equal(m.stages.percent, 33);
  assert.equal(m.stages.failed, 1);
  assert.equal(runs.metrics([]).percent, null);
  assert.equal(
    runs.metrics([scenario(["not_applicable"])]).stages.percent,
    null,
  );
});
test("consolidado por time não duplica execução compartilhada", () => {
  const input = [
    { ...scenario(["ok"], "A"), watchers: ["B", "C"] },
    scenario(["pending"], "B"),
  ];
  const teams = runs.teamSummary(input);
  assert.equal(
    teams.reduce((n, t) => n + t.total, 0),
    2,
  );
  assert.equal(teams.length, 2);
});
test("nova rodada mantém configuração mas limpa resultados e motivos sem alterar origem", () => {
  const original = scenario(["failed", "ok"]);
  original.steps[0].reason = "Erro anterior";
  const copy = runs.copyScenario(original);
  assert.notEqual(copy.id, original.id);
  assert(copy.steps.every((s) => s.result === "pending" && s.reason === ""));
  assert.equal(original.steps[0].result, "failed");
  assert.equal(original.steps[0].reason, "Erro anterior");
});
test("demonstração não grava dados automaticamente nem usa stores de issues", () => {
  let reads = [];
  const cycles = runs.load({
    getItem(key) {
      reads.push(key);
      return null;
    },
  });
  assert.equal(cycles.length, 4);
  assert.deepEqual(reads, [runs.key]);
  assert(cycles.every((c) => c.demo));
  assert.equal(runs.metrics(cycles[0].scenarios).failed, 1);
});

test("agenda seleciona intervalos sobrepostos, inclusive limites e ambientes", () => {
  const cycles = [
    {
      id: "a",
      environment: "HO",
      validationStartDate: "2026-10-20",
      validationEndDate: "2026-10-23",
      startDate: "2026-11-01",
      endDate: "2026-11-01",
    },
    {
      id: "b",
      environment: "HO",
      startDate: "2026-10-23",
      endDate: "2026-10-24",
    },
    {
      id: "c",
      environment: "PROD",
      startDate: "2026-10-23",
      endDate: "2026-10-23",
    },
  ];
  assert.deepEqual(
    runs
      .overlappingCycles(cycles, "2026-10-23", "2026-10-23", "HO")
      .map((c) => c.id),
    ["a", "b"],
  );
  assert.equal(
    runs.overlappingCycles(cycles, "2026-10-23", "2026-10-23").length,
    3,
  );
  assert.equal(
    runs.overlappingCycles(cycles, "2026-11-01", "2026-11-01", "HO").length,
    0,
  );
  assert.throws(
    () => runs.overlappingCycles(cycles, "2026-10-24", "2026-10-23"),
    /início/,
  );
});
test("janela de validação explícita prevalece sobre implantação e legado é identificado", () => {
  assert.deepEqual(
    runs.validationWindow({
      validationStartDate: "2026-10-20",
      validationEndDate: "2026-10-23",
      startDate: "2026-10-25",
      endDate: "2026-10-25",
    }),
    { start: "2026-10-20", end: "2026-10-23", explicit: true },
  );
  assert.equal(
    runs.validationWindow({ startDate: "2026-10-25", endDate: "2026-10-25" })
      .explicit,
    false,
  );
});

test("data de produção reúne todos os ciclos na janela, independente das datas de HO", () => {
  const data = runs.demo();
  assert.deepEqual(
    runs.productionCycles(data, "2026-10-23", "HO").map((c) => c.id),
    ["demo-release-2", "demo-site"],
  );
  assert.deepEqual(
    runs.productionCycles(data, "2026-10-24", "HO").map((c) => c.id),
    ["demo-release-2"],
  );
  assert.deepEqual(
    runs.productionCycles(data, "2026-10-26", "HO").map((c) => c.id),
    ["demo-marketplace"],
  );
  assert.equal(runs.productionCycles(data, "2026-10-23", "PROD").length, 0);
  assert.equal(runs.productionCycles(data, "", "HO").length, 4);
});

test("evidência aceita link HTTP/HTTPS opcional e rejeita protocolos e credenciais inseguros", () => {
  assert.deepEqual(runs.evidenceLink(""), { ok: true, url: "" });
  assert.equal(
    runs.evidenceLink(" https://jira.exemplo/browse/AGRO-123#attachments ").url,
    "https://jira.exemplo/browse/AGRO-123#attachments",
  );
  assert(runs.evidenceLink("http://jira.interno/browse/AGRO-1").ok);
  for (const value of [
    "javascript:alert(1)",
    "data:text/html,test",
    "file:///tmp/test",
    "AGRO-123",
    "https://user:senha@jira.exemplo/",
    "x".repeat(2049),
  ])
    assert.equal(runs.evidenceLink(value).ok, false);
});
