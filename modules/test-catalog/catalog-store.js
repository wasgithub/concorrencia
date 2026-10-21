// Catálogo, dimensões, etapas e trilhas reutilizáveis. Sem dependência de DOM.

// ---- Etapas do fluxo (ordenadas, editáveis) --------------------------------
const testStagesKey = "issueflow.teststages.v1";
let testStages;
{
  let s = null;
  try {
    s = localStorage.getItem(testStagesKey);
  } catch {}
  if (s === null) {
    testStages = [
      "Simulação",
      "Criação de Pedido",
      "Etapas Time Line",
      "Análise Documental Flex",
      "ServiceNow ON",
      "Tipo de garantia",
      "Emissão de Contrato",
      "Assinatura e Registro",
      "Liberação de Crédito",
      "Desembolso",
    ];
    persistTestStages();
  } else {
    try {
      const p = JSON.parse(s);
      testStages = Array.isArray(p) && p.length ? p : [];
    } catch {
      testStages = [];
    }
  }
}
function persistTestStages() {
  try {
    localStorage.setItem(testStagesKey, JSON.stringify(testStages));
    return true;
  } catch {
    return false;
  }
}
function lastStage() {
  return testStages[testStages.length - 1];
}
function stageIndex(name) {
  return testStages.indexOf(name);
}
function stagesUpTo(etapaAlvo) {
  const i = stageIndex(etapaAlvo);
  return i < 0 ? testStages.slice() : testStages.slice(0, i + 1);
}

// ---- Dimensões do montador (geram o nome do fluxo) -------------------------
const scenarioDimsKey = "issueflow.scenariodims.v1";
let scenarioDims;
{
  let s = null;
  try {
    s = localStorage.getItem(scenarioDimsKey);
  } catch {}
  if (s === null) {
    scenarioDims = [
      {
        nome: "Perfil",
        opcoes: ["Assessor", "Cliente", "Especialista", "Assessor E-Finance"],
      },
      { nome: "Tipo", opcoes: ["PF", "PJ"] },
      {
        nome: "Linha",
        opcoes: [
          "CPR",
          "CPR-PJ",
          "CPR GC",
          "CPR-Máquinas",
          "Custeio Agrícola",
          "Custeio Pecuário",
        ],
      },
      {
        nome: "Garantia",
        opcoes: [
          "Alienação",
          "Aval",
          "Clean",
          "Guarda-Chuva",
          "Hipoteca",
          "Penhor Agrícola",
          "Penhor Mercantil",
          "Penhor Pecuário",
          "Máquinas & Equipamentos",
        ],
      },
      {
        nome: "Variação",
        opcoes: [
          "Sem Cotação",
          "Com Cotação Agrolink",
          "Desembolso antecipado",
          "Cancelamento",
          "Industrializado",
          "Múltiplas com imóveis",
          "Compartilhado regressivo",
        ],
      },
    ];
    persistScenarioDims();
  } else {
    try {
      const p = JSON.parse(s);
      scenarioDims = Array.isArray(p) ? p : [];
    } catch {
      scenarioDims = [];
    }
  }
}
function persistScenarioDims() {
  try {
    localStorage.setItem(scenarioDimsKey, JSON.stringify(scenarioDims));
    return true;
  } catch {
    return false;
  }
}
function composeScenarioName(sel) {
  return scenarioDims
    .map((d) => sel[d.nome])
    .filter(Boolean)
    .join(" - ");
}

// ---- Catálogo de casos (reutilizável) --------------------------------------
const scenarioCatalogKey = "issueflow.scenariocatalog.v1";
const coberturaOptions = [
  "Regressivo padrão",
  "Novos fluxos",
  "Pós-venda",
  "Smoke",
];
// Tipo de garantia do cenário (automática/manual), independente da execução do teste.
const scenarioTipoOptions = ["Automática", "Manual", "N/A"];
const scenarioStatusOptions = [
  "Pendente",
  "Em execução",
  "OK",
  "Falhou",
  "N/A",
];
const scenarioStatusBadge = {
  Pendente: "gray",
  "Em execução": "blue",
  OK: "green",
  Falhou: "red",
  "N/A": "env",
};
let scenarioCatalog;
{
  let s = null;
  try {
    s = localStorage.getItem(scenarioCatalogKey);
  } catch {}
  if (s === null) {
    scenarioCatalog =
      localStorage.getItem("issueflow.demo.workflowSeeds.v1") === "false"
        ? []
        : seedCatalog();
    persistScenarioCatalog();
  } else {
    try {
      const p = JSON.parse(s);
      scenarioCatalog = Array.isArray(p) ? p : [];
    } catch {
      scenarioCatalog = [];
    }
  }
}
// Backfill de campos novos em catálogos antigos.
let catalogMigrated = false;
for (const c of scenarioCatalog) {
  if (!Array.isArray(c.fluxo)) {
    c.fluxo = stagesUpTo(c.etapaAlvo);
    catalogMigrated = true;
  }
  if (!c.etapaAlvo) {
    c.etapaAlvo = lastStage();
    catalogMigrated = true;
  }
  if (!c.cobertura) {
    c.cobertura = "Regressivo padrão";
    catalogMigrated = true;
  }
  if (c.ativo === undefined) {
    c.ativo = true;
    catalogMigrated = true;
  }
}
if (catalogMigrated) persistScenarioCatalog();
function persistScenarioCatalog() {
  try {
    localStorage.setItem(scenarioCatalogKey, JSON.stringify(scenarioCatalog));
    return true;
  } catch {
    return false;
  }
}
function nextCatalogId() {
  const n =
    scenarioCatalog.reduce(
      (m, c) => Math.max(m, parseInt(String(c.id).split("-")[1] || "0", 10)),
      0,
    ) + 1;
  return "cat-" + String(n).padStart(3, "0");
}
function seedCatalog() {
  // [tipo, nome, etapaAlvo?]. Sem etapaAlvo = Desembolso (fluxo completo).
  const rows = [
    ["Automática", "Assessor - CPR - Alienação - Sem Cotação - Agrícola"],
    [
      "Automática",
      "Assessor - CPR - Máquinas e Equip - E-Finance - Desembolso antecipado",
    ],
    ["Automática", "Assessor - CPR - PF - Hipoteca - Pecuário"],
    ["Automática", "Assessor - Custeio - PF - Alienação - Pecuário"],
    ["Automática", "Cliente - CPR - PF - Aval - Agrícola"],
    [
      "Manual",
      "Cliente - Custeio - Penhor Agrícola - Cancelamento",
      "Criação de Pedido",
    ],
    ["Automática", "Especialista - CPR - PF - Clean - Agrícola - Sem Cotação"],
    [
      "Manual",
      "Especialista - CPR - PF - Penhor Pecuário - Desembolso antecipado",
    ],
    [
      "Automática",
      "Especialista - CPR - PJ - Alienação - Sem Cotação - Agrícola",
    ],
    [
      "Automática",
      "Especialista - CPR - PJ - Hipoteca - Agrícola - Com Cotação Agrolink",
    ],
    [
      "Manual",
      "Especialista - CPR - PJ - Penhor Agrícola (Mercantil) - Insumos",
    ],
    ["Manual", "Especialista - CPR GC - PF - Pecuário"],
    [
      "Manual",
      "Especialista - CPR GC - PJ - Industrializado - Sem Cotação Agrolink",
    ],
    ["Automática", "Especialista - Custeio - PF - Aval - Pecuário"],
    ["Automática", "Especialista - Custeio - PF - Hipoteca - Agrícola"],
    ["Manual", "Especialista - Custeio GC - Pecuário"],
    [
      "Manual",
      "Especialista - CPR - PJ - Múltiplas com imóveis - Novas atividades - Sem Cotação Agrolink",
    ],
    ["Manual", "Pós vendas - CPR - Simulação", "Simulação"],
  ];
  return rows.map((r, i) => ({
    id: "cat-" + String(i + 1).padStart(3, "0"),
    tipo: r[0],
    nome: r[1],
    etapaAlvo: r[2] || "Desembolso",
    cobertura: "Regressivo padrão",
    ativo: true,
  }));
}

// Relações explícitas: basta um componente em comum para sugerir o cenário.
function normalizeTestComponents(values) {
  const parts = Array.isArray(values)
    ? values
    : typeof values === "string"
      ? values.split(",")
      : [];
  return [
    ...new Map(
      parts
        .filter((v) => typeof v === "string")
        .map((v) => v.trim())
        .filter(Boolean)
        .map((v) => [v.toLocaleLowerCase("pt-BR"), v]),
    ).values(),
  ];
}
function suggestedTests(issue, catalog = scenarioCatalog) {
  const changed = normalizeTestComponents(issue.servicos);
  return catalog
    .filter((c) => c.ativo)
    .map((caso) => ({
      caso,
      componentes: changed.filter((component) =>
        normalizeTestComponents(caso.componentes).some(
          (c) =>
            c.toLocaleLowerCase("pt-BR") ===
            component.toLocaleLowerCase("pt-BR"),
        ),
      ),
    }))
    .filter((s) => s.componentes.length)
    .sort(
      (a, b) =>
        b.componentes.length - a.componentes.length ||
        a.caso.nome.localeCompare(b.caso.nome, "pt-BR"),
    );
}

// Casos antigos usam segmentos do nome; novos casos guardam as dimensões explícitas.
function caseDimensions(caso) {
  const explicit = caso.dimensoes || {},
    result = { ...explicit };
  // Inferência pelo nome é compatibilidade exclusiva de registros sem dimensões explícitas.
  if (Object.prototype.hasOwnProperty.call(caso, "dimensoes")) return result;
  const parts = (caso.nome || "").split(/\s+-\s+/).map((s) => s.trim());
  const norm = (s) => s.toLocaleLowerCase("pt-BR");
  for (const dim of scenarioDims) {
    if (Object.prototype.hasOwnProperty.call(explicit, dim.nome)) {
      result[dim.nome] = explicit[dim.nome];
      continue;
    }
    const match = dim.opcoes.find((option) =>
      parts.some((p) => norm(p) === norm(option)),
    );
    if (match) result[dim.nome] = match;
    else if (dim.nome === "Linha") {
      const line = parts.find((p) => /^(CPR|Custeio)(?:\b|-)/i.test(p));
      if (line) result[dim.nome] = line;
    }
  }
  return result;
}
function matchesCaseFilters(caso, filters = {}) {
  const term = (filters.term || "").trim().toLocaleLowerCase("pt-BR");
  if (
    term &&
    ![
      caso.nome,
      scenarioContextLabel(caso),
      caso.cobertura || "",
      ...normalizeTestComponents(caso.componentes),
    ].some((v) => v.toLocaleLowerCase("pt-BR").includes(term))
  )
    return false;
  const context = scenarioContext(caso);
  if (filters.frente && context.frente !== filters.frente) return false;
  if (
    filters.funcionalidade &&
    context.funcionalidade !== filters.funcionalidade
  )
    return false;
  if (filters.coverage && caso.cobertura !== filters.coverage) return false;
  if (filters.tipo && caso.tipo !== filters.tipo) return false;
  if (filters.etapa && caso.etapaAlvo !== filters.etapa) return false;
  if (
    filters.containsStage &&
    !scenarioFlow(caso).includes(filters.containsStage)
  )
    return false;
  const dims = caseDimensions(caso);
  return Object.entries(filters.dimensoes || {}).every(
    ([name, value]) =>
      !value || (value === "__missing__" ? !dims[name] : dims[name] === value),
  );
}

const testTrailsKey = "issueflow.testtrails.v1";
function testTrails() {
  const t = readTestData(testTrailsKey, []);
  return Array.isArray(t) ? t : [];
}

// Vocabulário configurável: não representa modo de execução nem garantia por obrigação.
const qualitySettingsKey = "issueflow.qualitysettings.v1";
function qualitySettings() {
  const value = readTestData(qualitySettingsKey, {});
  return {
    classificationLabel:
      typeof value.classificationLabel === "string" &&
      value.classificationLabel.trim()
        ? value.classificationLabel
        : "Classificação",
    types:
      Array.isArray(value.types) && value.types.length
        ? value.types
        : [
            "Funcional",
            "Regressão",
            "Integração",
            "API",
            "Interface",
            "Segurança",
            "Performance",
          ],
  };
}
function scenarioTypes() {
  return [
    ...new Set(
      [
        ...qualitySettings().types,
        ...scenarioCatalog.map((c) => c.tipo),
      ].filter(Boolean),
    ),
  ];
}
function scenarioClassification(caso) {
  return `${caso.classificationLabel || qualitySettings().classificationLabel}: ${caso.tipo || "Não informado"}`;
}
function dimensionLabel(d) {
  return d.nome === "Tipo" && d.opcoes.includes("PF") && d.opcoes.includes("PJ")
    ? "Pessoa (PF/PJ)"
    : d.nome;
}
function scenarioFlow(caso) {
  return Array.isArray(caso.fluxo) && caso.fluxo.length
    ? [...caso.fluxo]
    : stagesUpTo(caso.etapaAlvo);
}
function scenarioInstructions(caso) {
  return [
    ["Frente / funcionalidade", scenarioContextLabel(caso)],
    ["Execução", caso.executionMode],
    ["Pré-condições", caso.preconditions],
    ["Resultado esperado", caso.expectedResult],
  ].filter(([, value]) => !!value);
}
// Novos cadastros usam opções configuradas; edição mantém o valor legado do próprio caso.
function caseTypeOptions(caso) {
  let configured = false;
  try {
    configured = localStorage.getItem(qualitySettingsKey) !== null;
  } catch {}
  return configured
    ? [
        ...new Set([
          ...qualitySettings().types,
          ...(caso?.tipo ? [caso.tipo] : []),
        ]),
      ]
    : scenarioTypes();
}

// Organização do catálogo é independente do fluxo de execução.
const scenarioAreasKey = "issueflow.scenarioareas.v1";
function scenarioAreas() {
  const configured = readTestData(scenarioAreasKey, null);
  return Array.isArray(configured)
    ? configured
    : [
        {
          nome: "Crédito",
          funcionalidades: [
            "CPR",
            "CPR Dollar",
            "CPR GC",
            "CPR-Máquinas",
            "Custeio",
            "Custeio Agrícola",
            "Custeio Pecuário",
          ],
        },
        {
          nome: "Site institucional",
          funcionalidades: ["Contato", "Navegação"],
        },
        {
          nome: "Marketplace",
          funcionalidades: ["Página do produto", "Compra", "Pagamento"],
        },
      ];
}
function scenarioContext(caso) {
  if (Object.prototype.hasOwnProperty.call(caso, "frente"))
    return {
      frente: caso.frente || "",
      funcionalidade: caso.funcionalidade || "",
    };
  // Somente casos de crédito identificáveis recebem contexto legado; nada é regravado.
  const line = caseDimensions(caso).Linha || "";
  return /^(CPR|Custeio)(?:\b|-)/i.test(line)
    ? { frente: "Crédito", funcionalidade: line === "CPR-PJ" ? "CPR" : line }
    : { frente: "", funcionalidade: "" };
}
function contextAreas() {
  return [
    ...new Set(
      [
        ...scenarioAreas().map((a) => a.nome),
        ...scenarioCatalog.map((c) => scenarioContext(c).frente),
      ].filter(Boolean),
    ),
  ];
}
function contextFunctions(frente) {
  return [
    ...new Set(
      [
        ...scenarioAreas()
          .filter((a) => !frente || a.nome === frente)
          .flatMap((a) => a.funcionalidades),
        ...scenarioCatalog
          .filter((c) => !frente || scenarioContext(c).frente === frente)
          .map((c) => scenarioContext(c).funcionalidade),
      ].filter(Boolean),
    ),
  ];
}
function dimensionApplies(dim, frente) {
  if (dim.frente !== undefined) return !dim.frente || dim.frente === frente;
  return (
    !["Perfil", "Tipo", "Linha", "Garantia", "Variação"].includes(dim.nome) ||
    !frente ||
    frente === "Crédito"
  );
}
function scenarioContextLabel(caso) {
  const c = scenarioContext(caso);
  return [c.frente, c.funcionalidade].filter(Boolean).join(" → ");
}

// Modelos reutilizáveis, distintos de funcionalidade e de resultado de execução.
const testFlowsKey = "issueflow.testflows.v1";
function testFlows() {
  const saved = readTestData(testFlowsKey, null);
  if (Array.isArray(saved)) return saved;
  const flows = testStages.length
    ? [
        {
          id: "flow-credit-legacy",
          nome: "Contratação de crédito",
          frente: "Crédito",
          funcionalidade: "",
          version: 1,
          ativo: true,
          steps: testStages.map((nome) => ({
            id: "credit-step-" + encodeURIComponent(nome),
            nome,
          })),
        },
      ]
    : [];
  // Captura inicial independente: o modelo não muda quando o legado é reordenado.
  saveTestData(testFlowsKey, flows);
  return flows;
}
function compatibleTestFlows(frente, funcionalidade) {
  return testFlows().filter(
    (f) =>
      f.ativo &&
      f.frente === frente &&
      (!f.funcionalidade || f.funcionalidade === funcionalidade),
  );
}
function validateTestFlow(flow) {
  if (
    !flow.nome?.trim() ||
    flow.nome.length > 100 ||
    !scenarioAreas().some((a) => a.nome === flow.frente)
  )
    return "Informe um nome e uma frente cadastrada.";
  if (
    flow.funcionalidade &&
    !scenarioAreas().some(
      (a) =>
        a.nome === flow.frente &&
        a.funcionalidades.includes(flow.funcionalidade),
    )
  )
    return "Escolha uma funcionalidade desta frente.";
  if (
    !Array.isArray(flow.steps) ||
    !flow.steps.length ||
    flow.steps.length > 50 ||
    flow.steps.some((s) => !s.id || !s.nome?.trim() || s.nome.length > 200)
  )
    return "Cadastre de 1 a 50 etapas, com até 200 caracteres cada.";
  if (
    new Set(flow.steps.map((s) => s.id)).size !== flow.steps.length ||
    new Set(flow.steps.map((s) => s.nome.trim().toLocaleLowerCase("pt-BR")))
      .size !== flow.steps.length
  )
    return "As etapas devem ter nomes e identificadores únicos.";
  if (
    testFlows().some(
      (f) =>
        f.id !== flow.id &&
        f.frente === flow.frente &&
        (f.funcionalidade || "") === (flow.funcionalidade || "") &&
        f.nome.trim().toLocaleLowerCase("pt-BR") ===
          flow.nome.trim().toLocaleLowerCase("pt-BR"),
    )
  )
    return "Já existe um fluxo com este nome nesta funcionalidade.";
  return "";
}
function saveTestFlow(flow) {
  const error = validateTestFlow(flow);
  if (error) return { ok: false, error };
  const flows = testFlows(),
    index = flows.findIndex((f) => f.id === flow.id),
    current = index < 0 ? null : flows[index];
  if (current && flow.version !== current.version)
    return {
      ok: false,
      error: "O fluxo foi alterado em outra aba. Reabra para editar.",
    };
  const next = {
    ...flow,
    nome: flow.nome.trim(),
    version: (current?.version || 0) + 1,
    steps: flow.steps.map((s) => ({ ...s, nome: s.nome.trim() })),
  };
  if (index < 0) flows.push(next);
  else flows[index] = next;
  return saveTestData(testFlowsKey, flows)
    ? { ok: true, flow: next }
    : { ok: false, error: "Não foi possível salvar o fluxo." };
}
