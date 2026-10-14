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
    fluxo: stagesUpTo(caso.etapaAlvo),
    cobertura: caso.cobertura || "",
    dimensoes: caseDimensions(caso),
    componentes: normalizeTestComponents(caso.componentes),
  };
}
