const $ = (s) => document.querySelector(s);
const labels = {
  done: "Concluído",
  running: "Em execução",
  failed: "Com falha",
  pending: "Não iniciado",
  dispensed: "Dispensado",
};
let cycles = [],
  view = "scenarios",
  editingScenarioId = null,
  editingCycleId = null,
  newSources = [],
  savedStorage = null;
try {
  cycles = TestRuns.load(localStorage);
  savedStorage = localStorage.getItem(TestRuns.key);
} catch {
  $("#runError").textContent =
    "Não foi possível ler os ciclos salvos. Os dados existentes foram preservados.";
  $("#newRun").disabled = true;
}
let cycleId = cycles[0]?.id;
const current = () => cycles.find((c) => c.id === cycleId);
function node(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}
function notify(message) {
  $("#toast").textContent = message;
  $("#toast").hidden = false;
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => ($("#toast").hidden = true), 3500);
}
function persist(next) {
  try {
    if (localStorage.getItem(TestRuns.key) !== savedStorage) {
      notify("Ciclos alterados em outra aba. Recarregue antes de salvar.");
      return false;
    }
    const serialized = JSON.stringify(next);
    localStorage.setItem(TestRuns.key, serialized);
    savedStorage = serialized;
    cycles = next;
    return true;
  } catch {
    notify("Não foi possível salvar. Seus dados continuam no formulário.");
    return false;
  }
}
function badge(state) {
  return node("span", "run-status " + state, labels[state]);
}
function percent(value) {
  return value === null ? "—" : value + "%";
}
function meter(value) {
  const n = node("div", "run-meter"),
    fill = node("span");
  fill.style.width = (value || 0) + "%";
  n.append(fill);
  return n;
}
function date(value) {
  return value ? value.split("-").reverse().join("/") : "Sem data";
}
function progress(title, value, subtitle) {
  const box = node("div", "run-progress-block"),
    line = node("div", "run-progress-label");
  line.append(node("span", "", title), node("strong", "", percent(value)));
  box.append(line, meter(value), node("small", "", subtitle));
  return box;
}
function options(select, values, all) {
  const keep = select.value;
  select.replaceChildren(
    new Option(all, ""),
    ...[...new Set(values.filter(Boolean))].sort().map((v) => new Option(v, v)),
  );
  select.value = values.includes(keep) ? keep : "";
}
function render() {
  const c = current();
  $("#runSelect").replaceChildren(
    ...cycles.map((c) => new Option(c.name + " · " + date(c.startDate), c.id)),
  );
  $("#runSelect").value = cycleId || "";
  if (!c) {
    $("#runName").textContent = "Crie seu primeiro ciclo de testes";
    $("#runDemo").hidden = true;
    return;
  }
  const m = TestRuns.metrics(c.scenarios);
  $("#runName").textContent = c.name;
  $("#runEnvironment").textContent = "REGRESSIVO / " + c.environment;
  $("#runMeta").textContent =
    `${c.validationStartDate && c.validationEndDate ? "Validação: " + date(c.validationStartDate) + " a " + date(c.validationEndDate) + " · " : "Validação: período não informado · "}Implantação prevista: ${date(c.startDate)}${c.endDate !== c.startDate ? " a " + date(c.endDate) : ""} · ${TestRuns.teamSummary(c.scenarios).length} times executores`;
  $("#runDemo").hidden = !c.demo;
  $("#runState").className =
    "run-status " +
    (m.failed
      ? "failed"
      : m.remaining
        ? "running"
        : m.done
          ? "done"
          : "dispensed");
  $("#runState").textContent = m.failed
    ? "Atenção às falhas"
    : m.remaining
      ? "Em validação"
      : m.done
        ? "Execução concluída"
        : "Sem cenários aplicáveis";
  $("#runStats").replaceChildren(
    ...[
      ["Cenários previstos", m.total, "total"],
      ["Concluídos", m.done, "done"],
      ["Em execução", m.running, "running"],
      ["Com falha", m.failed, "failed"],
      ["Não iniciados", m.pending, "pending"],
    ].map(([label, value, cls]) => {
      const n = node("div", "run-stat " + cls);
      n.append(node("span", "", label), node("strong", "", value));
      return n;
    }),
  );
  $("#runProgress").replaceChildren(
    progress(
      "Conclusão dos cenários",
      m.percent,
      `${m.done} concluídos · ${m.remaining} a concluir${m.percent === null ? "" : " (" + (100 - m.percent) + "%)"} · ${m.dispensed} dispensados`,
    ),
    progress(
      "Etapas validadas",
      m.stages.percent,
      `${m.stages.ok} OK de ${m.stages.applicable} aplicáveis · ${m.stages.notApplicable} N/A fora do cálculo`,
    ),
  );
  const attention = $("#runAttention");
  attention.replaceChildren();
  const missing = c.scenarios.filter((s) => !s.owner?.trim()).length;
  attention.append(
    node(
      "span",
      "",
      m.failed
        ? `${m.failed} cenário(s) com falha precisam de correção e reteste.`
        : m.remaining
          ? "Acompanhe as etapas pendentes até concluir a execução."
          : "Execução concluída. O aceite de produto é uma decisão separada.",
    ),
  );
  if (missing)
    attention.append(
      node("span", "", `${missing} cenário(s) sem responsável.`),
    );
  const shortcut = node(
    "button",
    "run-text-button",
    m.failed
      ? "Ver falhas →"
      : m.remaining
        ? "Ver pendências →"
        : "Ver cenários →",
  );
  shortcut.onclick = () => {
    clearFilters();
    $("#runStatus").value = m.failed
      ? "failed"
      : m.remaining
        ? "outstanding"
        : "";
    setView("scenarios");
  };
  attention.append(shortcut);
  $("#scenarioTotal").textContent = m.total;
  const filterScenarios =
    view === "matrix"
      ? RunViews.matrixCycles().flatMap((c) => c.scenarios)
      : c.scenarios;
  options(
    $("#runFront"),
    filterScenarios.map((s) => s.front),
    "Todas as frentes",
  );
  options(
    $("#runTeam"),
    filterScenarios.map((s) => s.team),
    "Todos os times",
  );
  renderRows();
  renderHistory();
  RunViews.renderMatrix();
  RunViews.renderAgenda();
}
function filtered(c = current()) {
  const term = $("#runSearch").value.trim().toLocaleLowerCase("pt-BR");
  return (c?.scenarios || []).filter(
    (s) =>
      (!$("#runFront").value || s.front === $("#runFront").value) &&
      (!$("#runTeam").value || s.team === $("#runTeam").value) &&
      (!$("#runStatus").value ||
        ($("#runStatus").value === "outstanding"
          ? ["pending", "running", "failed"].includes(TestRuns.scenarioState(s))
          : TestRuns.scenarioState(s) === $("#runStatus").value)) &&
      (!term ||
        [
          s.name,
          s.team,
          s.owner,
          s.issue,
          s.front,
          ...s.steps.map((st) => st.name),
        ].some((v) =>
          String(v || "")
            .toLocaleLowerCase("pt-BR")
            .includes(term),
        )),
  );
}
function renderRows() {
  const list = filtered();
  const body = $("#runRows");
  body.replaceChildren();
  for (const s of list) {
    const state = TestRuns.scenarioState(s),
      m = TestRuns.metrics([s]),
      row = node("tr");
    const name = node("td", "run-scenario-name"),
      link = node("button", "run-name-button", s.name);
    link.type = "button";
    link.onclick = () => openDetails(s.id);
    name.append(
      link,
      node(
        "small",
        "",
        s.front +
          " / " +
          (s.functionality || "Toda a frente") +
          (s.issue ? " · " + s.issue : ""),
      ),
    );
    const evidence = evidenceAnchor(s.evidenceUrl);
    if (evidence) name.append(evidence);
    const team = node("td");
    team.append(
      node("strong", "", s.team || "Sem time"),
      node(
        "small",
        !s.owner ? "run-unassigned" : "",
        s.owner || "Definir responsável",
      ),
    );
    const step = node("td", "run-stage");
    step.append(node("span", "", TestRuns.currentStage(s)));
    if (s.watchers?.length)
      step.append(
        node("small", "", `Compartilhado com ${s.watchers.join(", ")}`),
      );
    const p = node("td", "run-cell-progress");
    p.append(
      node("strong", "", `${m.stages.ok}/${m.stages.applicable}`),
      meter(m.stages.percent),
    );
    const status = node("td");
    status.append(badge(state));
    const action = node("td"),
      b = node("button", "run-open", "→");
    b.setAttribute("aria-label", "Ver etapas de " + s.name);
    b.onclick = () => openDetails(s.id);
    action.append(b);
    row.append(name, team, step, p, status, action);
    body.append(row);
  }
  $("#runEmpty").hidden = !!list.length;
  $("#runCount").textContent =
    `${list.length} de ${current()?.scenarios.length || 0} cenários`;
}
function setView(next) {
  view = next;
  for (const [name, id] of [
    ["scenarios", "scenarioView"],
    ["matrix", "matrixView"],
    ["agenda", "agendaView"],
    ["history", "historyView"],
  ])
    $("#" + id).hidden = name !== next;
  document.querySelectorAll("[data-view]").forEach((b) => {
    if (b.dataset.view === next) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  $("#runFiltersPanel").hidden = !["scenarios", "matrix"].includes(next);
  $("#runCycleToolbar").hidden =
    next === "agenda" ||
    (next === "matrix" && $("#matrixScope").value !== "current");
  $(".run-overview").hidden =
    next === "agenda" ||
    (next === "matrix" && $("#matrixScope").value !== "current");
  if (next === "scenarios") {
    options(
      $("#runFront"),
      current()?.scenarios.map((s) => s.front) || [],
      "Todas as frentes",
    );
    options(
      $("#runTeam"),
      current()?.scenarios.map((s) => s.team) || [],
      "Todos os times",
    );
    renderRows();
  }
  if (next === "matrix") RunViews.renderMatrix();
  if (next === "agenda") RunViews.renderAgenda();
}
function renderHistory() {
  const box = $("#historyView");
  box.replaceChildren(
    node("h2", "", "Histórico do ciclo"),
    node(
      "p",
      "",
      "Alterações de resultados e preparação, sem misturar tentativas de outros ciclos.",
    ),
  );
  if (!current().history?.length)
    box.append(node("p", "", "Nenhum evento registrado."));
  for (const e of current().history || []) {
    const item = node("article", "run-history-item");
    item.append(node("span", "run-history-dot"), node("div"));
    const content = item.lastChild;
    content.append(
      node(
        "small",
        "",
        new Date(e.at).toLocaleString("pt-BR") + " · " + e.actor,
      ),
      node("p", "", e.text),
    );
    box.append(item);
  }
}
function clearFilters() {
  for (const id of ["runSearch", "runFront", "runTeam", "runStatus"])
    $("#" + id).value = "";
  renderRows();
}
function evidenceAnchor(value, label = "Evidência no Jira ↗") {
  const evidence = TestRuns.evidenceLink(value);
  if (!evidence.ok || !evidence.url) return null;
  const a = node("a", "run-evidence-link", label);
  a.href = evidence.url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  return a;
}
function updateEvidencePreview() {
  const evidence = TestRuns.evidenceLink($("#scenarioEvidenceUrl").value),
    a = $("#openEvidenceLink");
  if (evidence.ok && $("#detailError").dataset.field === "evidenceUrl") {
    $("#detailError").textContent = "";
    delete $("#detailError").dataset.field;
  }
  a.hidden = !evidence.ok || !evidence.url;
  if (!a.hidden) a.href = evidence.url;
  else a.removeAttribute("href");
}
$("#scenarioEvidenceUrl").addEventListener("input", updateEvidencePreview);
function openDetails(id, runId = cycleId) {
  const origin = cycles.find((c) => c.id === runId);
  const s = origin?.scenarios.find((s) => s.id === id);
  if (!s) return;
  editingScenarioId = id;
  editingCycleId = runId;
  $("#detailName").textContent = s.name;
  $("#detailMeta").textContent =
    origin.name +
    " · PROD " +
    date(origin.startDate) +
    " · " +
    s.front +
    " / " +
    (s.functionality || "Toda a frente") +
    (s.issue ? " · " + s.issue : "");
  $("#detailStatus").replaceChildren(badge(TestRuns.scenarioState(s)));
  const form = $("#runResultForm");
  form.elements.team.value = s.team || "";
  form.elements.owner.value = s.owner || "";
  form.elements.evidenceUrl.value = s.evidenceUrl || "";
  updateEvidencePreview();
  $("#detailWatchers").textContent = s.watchers?.length
    ? "Times que acompanham esta execução: " + s.watchers.join(", ")
    : "Uma execução independente neste ciclo.";
  $("#detailError").textContent = "";
  const box = $("#detailSteps");
  box.replaceChildren();
  s.steps.forEach((step, i) => {
    const field = node("div", "run-step-field " + step.result),
      heading = node("div", "run-step-heading");
    heading.append(
      node("span", "run-step-number", i + 1),
      node("strong", "", step.name),
    );
    const select = node("select");
    select.name = "result-" + i;
    select.setAttribute("aria-label", "Resultado: " + step.name);
    for (const [value, label] of [
      ["pending", "Pendente"],
      ["ok", "OK"],
      ["failed", "Falhou"],
      ["not_applicable", "N/A"],
    ])
      select.append(new Option(label, value));
    select.value = step.result;
    heading.append(select);
    const reasonLabel = node(
        "label",
        "run-reason",
        "Motivo da falha / defeito",
      ),
      reason = node("textarea");
    reason.name = "reason-" + i;
    reason.maxLength = 2000;
    reason.rows = 2;
    reason.value = step.reason || "";
    reason.setAttribute("aria-label", "Motivo: " + step.name);
    reasonLabel.append(reason);
    reasonLabel.hidden = step.result !== "failed" && !step.reason;
    const retest = node("label", "run-retest"),
      check = node("input");
    check.type = "checkbox";
    check.name = "retest-" + i;
    retest.append(
      check,
      document.createTextNode("Confirmo o reteste desta etapa"),
    );
    retest.hidden = true;
    select.onchange = () => {
      reasonLabel.hidden = select.value !== "failed" && !reason.value;
      retest.hidden = step.result !== "failed" || select.value === "failed";
      field.className = "run-step-field " + select.value;
    };
    field.append(heading, reasonLabel, retest);
    box.append(field);
  });
  $("#runDetails").showModal();
}
$("#runResultForm").onsubmit = (e) => {
  e.preventDefault();
  delete $("#detailError").dataset.field;
  const c = cycles.find((c) => c.id === editingCycleId),
    s = c.scenarios.find((s) => s.id === editingScenarioId),
    form = e.target,
    team = form.elements.team.value.trim(),
    owner = form.elements.owner.value.trim();
  if (!team || !owner) {
    $("#detailError").textContent = "Informe o time executor e o responsável.";
    return;
  }
  const evidence = TestRuns.evidenceLink(form.elements.evidenceUrl.value);
  if (!evidence.ok) {
    $("#detailError").dataset.field = "evidenceUrl";
    $("#detailError").textContent = evidence.error;
    return;
  }
  const next = structuredClone(cycles),
    target = next.find((x) => x.id === c.id),
    scenario = target.scenarios.find((x) => x.id === s.id),
    events = [];
  for (let i = 0; i < s.steps.length; i++) {
    const step = s.steps[i],
      result = form.elements["result-" + i].value,
      reason = form.elements["reason-" + i].value.trim();
    if (result === "failed" && !reason) {
      $("#detailError").textContent =
        "Informe o motivo da falha em " + step.name + ".";
      return;
    }
    if (
      step.result === "failed" &&
      result !== step.result &&
      !form.elements["retest-" + i].checked
    ) {
      $("#detailError").textContent =
        "Confirme o reteste em " + step.name + ".";
      return;
    }
    scenario.steps[i] = {
      ...step,
      result,
      reason: reason || step.reason || "",
    };
    if (result !== step.result || reason !== (step.reason || ""))
      events.push({
        at: new Date().toISOString(),
        actor: owner,
        text: `${s.name} · ${step.name}: ${{ pending: "Pendente", ok: "OK", failed: "Falhou", not_applicable: "N/A" }[step.result]} → ${{ pending: "Pendente", ok: "OK", failed: "Falhou", not_applicable: "N/A" }[result]}${reason ? " · " + reason : ""}`,
      });
  }
  if (team !== s.team || owner !== s.owner)
    events.push({
      at: new Date().toISOString(),
      actor: owner,
      text: `Responsabilidade atualizada · ${s.name}: ${team} / ${owner}.`,
    });
  if (evidence.url !== (s.evidenceUrl || ""))
    events.push({
      at: new Date().toISOString(),
      actor: owner,
      type: "evidence_updated",
      previousUrl: s.evidenceUrl || "",
      newUrl: evidence.url,
      text: `Evidências no Jira ${evidence.url ? "atualizadas" : "removidas"} · ${s.name}.`,
    });
  if (evidence.url) scenario.evidenceUrl = evidence.url;
  else delete scenario.evidenceUrl;
  scenario.team = team;
  scenario.owner = owner;
  target.history = [...events, ...(target.history || [])];
  if (persist(next)) {
    $("#runDetails").close();
    render();
    notify(
      events.length ? "Validação salva." : "Nenhuma alteração nos resultados.",
    );
  }
};
function closeDetails() {
  $("#runDetails").close();
}
$("#closeRunDetails").onclick = $("#cancelRunDetails").onclick = closeDetails;
function openNew() {
  const f = $("#newRunForm");
  f.reset();
  $("#newRunError").textContent = "";
  $("#newRunTitle").textContent = "Novo ciclo de testes";
  const today = new Date().toLocaleDateString("en-CA");
  for (const field of [
    "startDate",
    "endDate",
    "validationStartDate",
    "validationEndDate",
  ])
    f.elements[field].value = today;
  newSources = scenarioCatalog
    .filter((s) => s.ativo)
    .map((s) => ({
      id: s.id,
      catalogScenarioId: s.id,
      catalogVersion: s.catalogVersion || s.version || 1,
      workflowId: s.workflowId || "",
      workflowVersion: s.workflowVersion || null,
      name: s.nome,
      front: scenarioContext(s).frente || "Sem frente",
      functionality: scenarioContext(s).funcionalidade || "",
      components: normalizeTestComponents(s.componentes),
      watchers: [],
      issue: "",
      steps: scenarioFlow(s).map((name, i) => ({
        id: s.stepDefinitions?.[i]?.id || s.id + "-step-" + i,
        name,
        result: "pending",
        reason: "",
      })),
    }));
  $("#newRunLegend").textContent = "Cenários ativos do catálogo";
  const list = $("#newRunScenarios");
  list.replaceChildren();
  for (const s of newSources) {
    const label = node("label", "run-catalog-option"),
      input = node("input");
    input.type = "checkbox";
    input.value = s.id;
    input.checked = false;
    label.append(
      input,
      node("span", "", s.name),
      node("small", "", `${s.front} · ${s.steps.length} etapas`),
    );
    list.append(label);
  }
  if (!newSources.length)
    list.append(
      node(
        "p",
        "",
        "Nenhum cenário ativo. Cadastre cenários no catálogo antes de criar o ciclo.",
      ),
    );
  $("#newRunDialog").showModal();
}
$("#newRunForm").onsubmit = (e) => {
  e.preventDefault();
  const f = e.target,
    selected = new Set(
      [...$("#newRunScenarios").querySelectorAll("input:checked")].map(
        (i) => i.value,
      ),
    ),
    name = f.elements.name.value.trim(),
    team = f.elements.team.value.trim(),
    owner = f.elements.owner.value.trim();
  if (
    !name ||
    !team ||
    !owner ||
    !selected.size ||
    selected.size > 200 ||
    f.elements.endDate.value < f.elements.startDate.value ||
    !!f.elements.validationStartDate.value !==
      !!f.elements.validationEndDate.value ||
    f.elements.validationEndDate.value < f.elements.validationStartDate.value
  ) {
    $("#newRunError").textContent =
      "Informe nome, time, responsável e uma janela válida; selecione de 1 a 200 cenários.";
    return;
  }
  const id =
      "run-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 7),
    scenarios = newSources
      .filter((s) => selected.has(s.id))
      .map((s) => ({
        ...TestRuns.copyScenario(s),
        team,
        owner,
      }));
  if (scenarios.some((s) => !s.steps.length || s.steps.length > 50)) {
    $("#newRunError").textContent =
      "Todos os cenários precisam ter de 1 a 50 etapas.";
    return;
  }
  const c = {
    id,
    name,
    startDate: f.elements.startDate.value,
    endDate: f.elements.endDate.value,
    validationStartDate: f.elements.validationStartDate.value,
    validationEndDate: f.elements.validationEndDate.value,
    environment: f.elements.environment.value,
    release: f.elements.release.value.trim(),
    demo: false,
    scenarios,
    history: [
      {
        at: new Date().toISOString(),
        actor: owner,
        text: `Ciclo criado com ${scenarios.length} cenário(s). Resultados iniciados como pendentes.`,
      },
    ],
  };
  if (persist([c, ...cycles])) {
    cycleId = id;
    $("#newRunDialog").close();
    clearFilters();
    setView("scenarios");
    render();
    notify("Ciclo criado.");
  }
};
$("#newRun").onclick = () => openNew();
$("#closeNewRun").onclick = $("#cancelNewRun").onclick = () =>
  $("#newRunDialog").close();
$("#runSelect").onchange = (e) => {
  cycleId = e.target.value;
  if ($("#matrixScope").value === "current")
    $("#matrixProductionDate").value = current()?.startDate || "";
  clearFilters();
  render();
};
for (const id of ["runSearch", "runFront", "runTeam", "runStatus"])
  $("#" + id).addEventListener("input", () => {
    renderRows();
    RunViews.renderMatrix();
  });
$("#clearRunFilters").onclick = () => {
  clearFilters();
  RunViews.renderMatrix();
};
for (const id of ["matrixScope", "matrixProductionDate", "matrixEnvironment"]) {
  $("#" + id).addEventListener("change", () => {
    $("#matrixProductionDate").disabled =
      $("#matrixScope").value !== "production";
    $(".run-overview").hidden =
      view === "matrix" && $("#matrixScope").value !== "current";
    $("#runCycleToolbar").hidden =
      view === "matrix" && $("#matrixScope").value !== "current";
    RunViews.renderMatrix();
  });
}
$("#matrixProductionDate").value = current()?.startDate || "";
$("#runPeriodForm").onsubmit = (e) => {
  e.preventDefault();
  if (RunViews.renderAgenda()) setView("agenda");
};
document
  .querySelectorAll("[data-view]")
  .forEach((b) => (b.onclick = () => setView(b.dataset.view)));
window.addEventListener("storage", (e) => {
  if (e.key === TestRuns.key) {
    if ($("#runDetails").open || $("#newRunDialog").open) {
      $("#detailError").textContent = $("#newRunError").textContent =
        "Ciclos alterados em outra aba. Recarregue antes de salvar.";
      $("#runResultForm button[type=submit]").disabled = true;
      $("#newRunForm button[type=submit]").disabled = true;
      return;
    }
    try {
      cycles = TestRuns.load(localStorage);
      savedStorage = localStorage.getItem(TestRuns.key);
      if (!current()) cycleId = cycles[0]?.id;
      render();
    } catch {
      notify("Não foi possível atualizar os ciclos.");
    }
  }
});
RunViews.defaultPeriod();
render();

const initialView = new URLSearchParams(location.search).get("view");
setView(
  ["scenarios", "matrix", "agenda", "history"].includes(initialView)
    ? initialView
    : "scenarios",
);
