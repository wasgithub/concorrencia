// ---- Execução (por change) --------------------------------------------------
// Cria uma execução (snapshot) a partir de um caso do catálogo.
function execFromCaso(caso) {
  return {
    id:
      "ex-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 6),
    casoId: caso.id,
    nome: caso.nome,
    tipo: caso.tipo,
    etapaAlvo: caso.etapaAlvo || lastStage(),
    resp: "",
    jira: "",
    pedido: "",
    validadoHO: false,
    etapas: {},
  };
}
// Status geral DERIVADO das etapas até a etapa alvo (demais etapas = N/A).
function execStatus(exec) {
  if (
    exec.sourceExecutionId &&
    !Object.values(exec.etapas || {}).some(Boolean) &&
    scenarioStatusOptions.includes(exec.resultadoProducao)
  )
    return exec.resultadoProducao;
  const applic = executionStages(exec);
  if (!applic.length) return "Pendente";
  const vals = applic.map((s) => (exec.etapas || {})[s]);
  if (vals.some((v) => v === "Falhou")) return "Falhou";
  const done = vals.filter((v) => v === "OK" || v === "N/A").length;
  if (done === applic.length)
    return vals.every((v) => v === "N/A") ? "N/A" : "OK";
  if (done > 0) return "Em execução";
  return "Pendente";
}

function executionStages(exec) {
  return Array.isArray(exec.fluxo) ? exec.fluxo : stagesUpTo(exec.etapaAlvo);
}
function newTestExecution(caso) {
  return {
    ...execFromCaso(caso),
    ...scenarioContext(caso),
    executionMode: caso.executionMode || "",
    workflowId: caso.workflowId || "",
    workflowVersion: caso.workflowVersion || null,
    stepDefinitions: (caso.stepDefinitions || []).map((s) => ({ ...s })),
    etapaAlvo: scenarioFlow(caso).at(-1) || caso.etapaAlvo || "",
    catalogVersion: caso.catalogVersion || caso.version || 1,
    sourceFlow: Array.isArray(caso.sourceFlow)
      ? [...caso.sourceFlow]
      : scenarioFlow(caso),
    sourceStepDefinitions: (
      caso.sourceStepDefinitions ||
      caso.stepDefinitions ||
      []
    ).map((s) => ({ ...s })),
    fluxo: scenarioFlow(caso),
    classificationLabel:
      caso.classificationLabel || qualitySettings().classificationLabel,
    preconditions: caso.preconditions || "",
    expectedResult: caso.expectedResult || "",
    cobertura: caso.cobertura || "",
    dimensoes: caseDimensions(caso),
    componentes: normalizeTestComponents(caso.componentes),
  };
}

// Resultados não fazem parte da definição; o snapshot deve manter todos os campos de negócio.
function scenarioDefinitionSignature(caso) {
  return JSON.stringify({
    nome: caso.nome || "",
    tipo: caso.tipo || "",
    context: scenarioContext(caso),
    classificationLabel:
      caso.classificationLabel || qualitySettings().classificationLabel,
    executionMode: caso.executionMode || "",
    workflowId: caso.workflowId || "",
    workflowVersion: caso.workflowVersion || null,
    stepDefinitions: caso.stepDefinitions || [],
    catalogVersion: caso.catalogVersion || caso.version || 1,
    sourceFlow: executionFullStages(caso),
    sourceStepDefinitions:
      caso.sourceStepDefinitions || caso.stepDefinitions || [],
    steps: executionStages(caso),
    dimensoes: caseDimensions(caso),
    componentes: normalizeTestComponents(caso.componentes),
    cobertura: caso.cobertura || "",
    preconditions: caso.preconditions || "",
    expectedResult: caso.expectedResult || "",
  });
}
function executionPosition(exec) {
  const steps = executionStages(exec),
    failed = steps.find((s) => exec.etapas?.[s] === "Falhou"),
    next = steps.find((s) => !["OK", "N/A"].includes(exec.etapas?.[s]));
  return failed
    ? `Bloqueado em: ${failed}`
    : next
      ? `Próxima etapa: ${next}`
      : "Todas as etapas concluídas";
}
// A ação rápida trata apenas pendências; falhas e N/A exigem uma decisão explícita.
function pendingExecutionStages(exec) {
  return executionStages(exec).filter(
    (s) => !exec.etapas?.[s] || exec.etapas[s] === "Pendente",
  );
}

// A sequência completa fica no snapshot; somente o prefixo planejado é executado.
function executionFullStages(exec) {
  return Array.isArray(exec.sourceFlow) && exec.sourceFlow.length
    ? [...exec.sourceFlow]
    : [...executionStages(exec)];
}
function executionExcludedStages(exec) {
  const selected = new Set(executionStages(exec));
  return executionFullStages(exec).filter((stage) => !selected.has(stage));
}
function executionScopeLocked(exec) {
  return (
    !!exec.scopeLocked ||
    Object.values(exec.etapas || {}).some(
      (value) => value && value !== "Pendente",
    )
  );
}
function setExecutionScope(exec, endStage) {
  if (executionScopeLocked(exec))
    return {
      ok: false,
      error:
        "A execução já começou. O escopo não pode ser reduzido ou ampliado após registrar resultados.",
    };
  const full = executionFullStages(exec),
    index = full.indexOf(endStage);
  if (index < 0)
    return { ok: false, error: "Escolha uma etapa do cenário de origem." };
  exec.sourceFlow = full;
  exec.sourceStepDefinitions = (
    exec.sourceStepDefinitions ||
    exec.stepDefinitions ||
    []
  ).map((s) => ({ ...s }));
  exec.fluxo = full.slice(0, index + 1);
  exec.etapaAlvo = endStage;
  exec.stepDefinitions = exec.sourceStepDefinitions
    .filter((s) => exec.fluxo.includes(s.nome))
    .map((s) => ({ ...s }));
  return { ok: true };
}
function executionScopeValid(exec) {
  const full = executionFullStages(exec),
    actual = executionStages(exec);
  return (
    actual.length > 0 &&
    actual.length <= full.length &&
    actual.every((stage, index) => stage === full[index]) &&
    (!exec.sourceFlow || exec.etapaAlvo === actual.at(-1))
  );
}
