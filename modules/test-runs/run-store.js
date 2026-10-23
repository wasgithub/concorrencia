// Ciclos independentes do catálogo e dos resultados de HO/PROD das issues.
// Persistência local de demonstração; integração real deve aplicar regras no servidor.
(function (root) {
  const key = "issueflow.testruns.v1";
  function scenarioState(scenario) {
    const steps = scenario.steps || [];
    if (!steps.length) return "pending";
    if (steps.some((s) => s.result === "failed")) return "failed";
    if (steps.every((s) => s.result === "not_applicable")) return "dispensed";
    if (steps.every((s) => ["ok", "not_applicable"].includes(s.result)))
      return "done";
    return steps.some((s) => s.result !== "pending") ? "running" : "pending";
  }
  function metrics(scenarios) {
    const counts = { done: 0, running: 0, failed: 0, pending: 0, dispensed: 0 };
    const stages = {
      applicable: 0,
      ok: 0,
      failed: 0,
      pending: 0,
      notApplicable: 0,
    };
    for (const s of scenarios) {
      counts[scenarioState(s)]++;
      for (const step of s.steps || []) {
        if (step.result === "not_applicable") {
          stages.notApplicable++;
          continue;
        }
        stages.applicable++;
        if (step.result === "ok") stages.ok++;
        else if (step.result === "failed") stages.failed++;
        else stages.pending++;
      }
    }
    const applicable = scenarios.length - counts.dispensed;
    return {
      ...counts,
      total: scenarios.length,
      remaining: counts.pending + counts.running + counts.failed,
      percent: applicable ? Math.round((100 * counts.done) / applicable) : null,
      stages: {
        ...stages,
        percent: stages.applicable
          ? Math.round((100 * stages.ok) / stages.applicable)
          : null,
      },
    };
  }
  function currentStage(scenario) {
    const failed = scenario.steps.find((s) => s.result === "failed");
    const pending = scenario.steps.find((s) => s.result === "pending");
    return (
      failed?.name ||
      pending?.name ||
      (scenarioState(scenario) === "dispensed"
        ? "Dispensado"
        : "Etapas concluídas")
    );
  }
  function teamSummary(scenarios) {
    return [...new Set(scenarios.map((s) => s.team || "Sem time"))].map(
      (team) => ({
        team,
        ...metrics(scenarios.filter((s) => (s.team || "Sem time") === team)),
      }),
    );
  }
  function copyScenario(scenario) {
    return {
      ...scenario,
      id: "run-scenario-" + Math.random().toString(36).slice(2, 11),
      steps: scenario.steps.map((s) => ({
        ...s,
        result: "pending",
        reason: "",
      })),
    };
  }
  function demo() {
    const credit = [
      "Simulação",
      "Criação do pedido",
      "Análise documental",
      "Emissão do contrato",
      "Assinatura e registro",
      "Liberação de crédito",
    ];
    const make = (
      id,
      name,
      team,
      owner,
      front,
      func,
      done = 0,
      failed = -1,
      names = credit,
      watchers = [],
      issue = "",
    ) => ({
      id,
      name,
      team,
      owner,
      front,
      functionality: func,
      watchers,
      issue,
      components: [],
      steps: names.map((name, i) => ({
        id: id + "-step-" + i,
        name,
        result: i === failed ? "failed" : i < done ? "ok" : "pending",
        reason:
          i === failed
            ? "Consulta de limite indisponível. Aguardando correção para retestar."
            : "",
      })),
    });
    const scenarios = [
      make(
        "r1",
        "CPR PF · Hipoteca · Pecuário",
        "Adubar",
        "Patrícia",
        "Crédito",
        "CPR",
        2,
        2,
        credit,
        [],
        "AGROFIN-12421",
      ),
      make(
        "r2",
        "CPR · Alienação · Sem cotação",
        "Frutificar",
        "Adriano",
        "Crédito",
        "CPR",
        4,
        -1,
        credit,
        ["Agrotech"],
        "AGROFIN-12484",
      ),
      make(
        "r3",
        "CPR PF · Aval · Agrícola",
        "Florescer",
        "Leonardo",
        "Crédito",
        "CPR",
        6,
        -1,
        credit,
        ["Frutificar"],
        "AGROFIN-12226",
      ),
      make(
        "r4",
        "Custeio PF · Hipoteca · Agrícola",
        "Adubar",
        "Bianca",
        "Crédito",
        "Custeio",
        6,
      ),
      make(
        "r5",
        "Compra de produto com cartão",
        "Agrotech",
        "Vinícius",
        "Marketplace",
        "Compra",
        3,
        -1,
        ["Adicionar ao carrinho", "Confirmar pagamento", "Confirmar pedido"],
      ),
      make(
        "r6",
        "CPR Dollar · Contratação",
        "Frutificar",
        "Adriano",
        "Crédito",
        "CPR Dollar",
        1,
      ),
      make(
        "r7",
        "Custeio · Cancelamento na assinatura",
        "Florescer",
        "Leonardo",
        "Crédito",
        "Custeio",
      ),
      make(
        "r8",
        "Marketplace · Pagamento por Pix",
        "Agrotech",
        "Vinícius",
        "Marketplace",
        "Pagamento",
        0,
        -1,
        ["Selecionar Pix", "Gerar cobrança", "Confirmar pagamento"],
      ),
      make(
        "r9",
        "Site · Enviar formulário de contato",
        "Agrotech",
        "",
        "Site institucional",
        "Contato",
        0,
        -1,
        ["Preencher formulário", "Enviar mensagem", "Confirmar recebimento"],
      ),
    ];
    const base = {
      id: "demo-release-2",
      name: "Regressivo · Release 2",
      validationStartDate: "2026-10-20",
      validationEndDate: "2026-10-23",
      startDate: "2026-10-23",
      endDate: "2026-10-24",
      environment: "HO",
      release: "Release 2",
      reference: "Implantação 23–24/out",
      demo: true,
      scenarios,
      history: [
        {
          at: "2026-10-23T12:05:00Z",
          text: "Falha em CPR PF · Hipoteca: Análise documental. Consulta de limite indisponível.",
          actor: "Patrícia",
        },
        {
          at: "2026-10-23T11:40:00Z",
          text: "Compra de produto com cartão: etapas concluídas.",
          actor: "Vinícius",
        },
        {
          at: "2026-10-23T11:10:00Z",
          text: "Ciclo preparado com 9 cenários e 4 times executores.",
          actor: "Adriano",
        },
      ],
    };
    const previous = {
      ...base,
      id: "demo-release-1",
      name: "Regressivo · Implantação 13/out",
      validationStartDate: "2026-10-10",
      validationEndDate: "2026-10-13",
      startDate: "2026-10-13",
      endDate: "2026-10-13",
      release: "Release 1",
      reference: "Implantação 13/out",
      scenarios: scenarios.slice(0, 5).map((s) => ({
        ...s,
        steps: s.steps.map((step) => ({ ...step, result: "ok", reason: "" })),
      })),
      history: [
        {
          at: "2026-10-13T18:00:00Z",
          text: "Execução do ciclo concluída. O aceite de produto é registrado separadamente.",
          actor: "Adriano",
        },
      ],
    };
    const marketplace = {
      ...base,
      id: "demo-marketplace",
      name: "Regressivo · Marketplace",
      validationStartDate: "2026-10-22",
      validationEndDate: "2026-10-24",
      startDate: "2026-10-26",
      endDate: "2026-10-26",
      release: "Marketplace 1.4",
      scenarios: [
        make(
          "m1",
          "Compra · Pix",
          "Agrotech",
          "Vinícius",
          "Marketplace",
          "Pagamento",
          1,
          -1,
          ["Selecionar Pix", "Gerar cobrança", "Confirmar pagamento"],
        ),
        make(
          "m2",
          "Compra · Cartão",
          "Frutificar",
          "Bianca",
          "Marketplace",
          "Compra",
          0,
          -1,
          ["Adicionar ao carrinho", "Pagar com cartão", "Confirmar pedido"],
        ),
      ],
      history: [
        {
          at: "2026-10-22T12:00:00Z",
          actor: "Vinícius",
          text: "Preparação do regressivo Marketplace.",
        },
      ],
    };
    const site = {
      ...base,
      id: "demo-site",
      name: "Regressivo · Site institucional",
      validationStartDate: "2026-10-21",
      validationEndDate: "2026-10-23",
      startDate: "2026-10-23",
      endDate: "2026-10-23",
      release: "Site 2.0",
      scenarios: [
        make(
          "site1",
          "Site · Formulário de contato",
          "Cultivar",
          "Mariana",
          "Site institucional",
          "Contato",
          1,
          -1,
          ["Preencher formulário", "Enviar mensagem", "Confirmar recebimento"],
        ),
      ],
      history: [],
    };
    return [base, previous, marketplace, site];
  }
  function validationWindow(cycle) {
    const explicit = !!(cycle.validationStartDate && cycle.validationEndDate);
    return {
      start: explicit ? cycle.validationStartDate : cycle.startDate,
      end: explicit ? cycle.validationEndDate : cycle.endDate,
      explicit,
    };
  }
  function overlappingCycles(cycles, start, end, environment = "") {
    if (start && end && start > end)
      throw Error("O início deve ser anterior ou igual ao fim.");
    return cycles.filter((c) => {
      const w = validationWindow(c);
      return (
        w.start &&
        w.end &&
        (!start || w.end >= start) &&
        (!end || w.start <= end) &&
        (!environment || c.environment === environment)
      );
    });
  }
  function productionCycles(cycles, day, environment = "") {
    return cycles.filter(
      (c) =>
        (!environment || c.environment === environment) &&
        (!day ||
          (c.startDate && c.endDate && c.startDate <= day && c.endDate >= day)),
    );
  }
  function evidenceLink(value) {
    const text = String(value || "").trim();
    if (!text) return { ok: true, url: "" };
    const error =
      "Informe um link completo HTTP/HTTPS do Jira, com até 2048 caracteres e sem usuário ou senha na URL.";
    if (text.length > 2048) return { ok: false, error };
    try {
      const url = new URL(text);
      if (
        !["http:", "https:"].includes(url.protocol) ||
        !url.hostname ||
        url.username ||
        url.password
      )
        return { ok: false, error };
      return { ok: true, url: url.href };
    } catch {
      return { ok: false, error };
    }
  }
  function load(storage) {
    const raw = storage.getItem(key);
    if (raw === null) return demo();
    const data = JSON.parse(raw);
    if (
      !Array.isArray(data) ||
      data.some((c) => !c.id || !Array.isArray(c.scenarios))
    )
      throw Error("Formato de ciclos inválido.");
    return data;
  }
  const api = {
    key,
    evidenceLink,
    validationWindow,
    productionCycles,
    overlappingCycles,
    scenarioState,
    metrics,
    currentStage,
    teamSummary,
    copyScenario,
    demo,
    load,
  };
  root.TestRuns = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
