const $ = (s) => document.querySelector(s);
const labels = {
  homologacao: "Homologação",
  efemero: "Efêmero",
  "homologacao 2": "Homologação 2",
};
const date = (value) => (value ? value.split("-").reverse().join("/") : "—");
// Changes vivem em store próprio; a tela de Issues apenas lê o status vinculado.
const changeStatusBadge = {
  Planejada: "gray",
  "Em aprovação": "orange",
  Aprovada: "blue",
  Executada: "green",
  Rejeitada: "red",
  "Não realizada": "red",
  "Rollback realizado": "red",
};
function loadChanges() {
  try {
    const s = JSON.parse(localStorage.getItem("issueflow.changes.v1"));
    return Array.isArray(s) ? s : [];
  } catch {
    return [];
  }
}
let changeMap = new Map();
let featurePage = 1;
let featurePageSize = 25;
function buildChangeMap() {
  const map = new Map();
  const final = (s) =>
    s === "Rejeitada" || s === "Não realizada" || s === "Rollback realizado";
  for (const c of loadChanges())
    for (const id of c.issueIds || []) {
      const cur = map.get(id);
      if (!cur || (final(cur.status) && !final(c.status))) map.set(id, c);
    }
  return map;
}
function changeForIssue(id) {
  return changeMap.get(id) || null;
}
function status(issue) {
  const linked = changeForIssue(issue.idIssue);
  if (linked?.status === "Rollback realizado") return "Rollback realizado";
  if (linked?.status === "Executada" || linked?.encerramento)
    return "Em produção";
  const today = new Date();
  const now = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return issue.dataInicialHomologacao > now
    ? "Planejada"
    : issue.dataFinalHomologacao < now
      ? "Aguardando produção"
      : "Em homologação";
}
function cell(tr, value, className) {
  const td = document.createElement("td");
  td.textContent = value;
  if (className) td.className = className;
  tr.append(td);
  return td;
}
function render() {
  changeMap = buildChangeMap();
  const squads = [...new Set(issues.map((i) => i.squad))].sort();
  const selected = $("#squadFilter").value;
  $("#squadFilter").replaceChildren(
    new Option("Todas as squads", ""),
    ...squads.map((s) => new Option(s, s)),
  );
  $("#squadFilter").value = selected;
  $("#total").textContent = issues.length;
  $("#homologating").textContent = issues.filter((i) => {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return i.dataInicialHomologacao <= today && i.dataFinalHomologacao >= today;
  }).length;
  $("#planned").textContent = issues.filter(
    (i) => status(i) === "Planejada",
  ).length;
  $("#production").textContent = issues.filter(
    (i) => status(i) === "Em produção",
  ).length;
  renderConflicts();
  const term = $("#search").value.trim().toLocaleLowerCase("pt-BR");
  const filtered = issues.filter(
    (i) =>
      (!term ||
        [i.squad, i.idIssue, i.descricao, ...i.servicos].some((v) =>
          v.toLocaleLowerCase("pt-BR").includes(term),
        )) &&
      (!$("#conflictFilter").checked || conflictsFor(i, issues).length > 0) &&
      (!selected || i.squad === selected) &&
      (!$("#environmentFilter").value ||
        i.ambiente === $("#environmentFilter").value),
  );
  $("#rows").replaceChildren();
  const pages = Math.max(1, Math.ceil(filtered.length / featurePageSize));
  featurePage = Math.min(featurePage, pages);
  const start = (featurePage - 1) * featurePageSize;
  for (const issue of filtered.slice(start, start + featurePageSize)) {
    const tr = document.createElement("tr");
    const idcell = cell(tr, "", "issue-id");
    const title = document.createElement("button");
    title.type = "button";
    title.className = "feature-id-link";
    title.textContent = issue.idIssue;
    title.setAttribute("aria-label", `Detalhes de ${issue.idIssue}`);
    title.onclick = () => showComponents(issue, true);
    const description = document.createElement("span");
    description.className = "feature-description";
    description.textContent = issue.descricao;
    description.title = issue.descricao;
    idcell.append(title, description);
    const teamCell = cell(tr, issue.squad, "feature-team");
    const environment = document.createElement("small");
    environment.textContent = labels[issue.ambiente];
    teamCell.append(environment);
    const period = cell(
      tr,
      `${date(issue.dataInicialHomologacao).slice(0, 5)} – ${date(issue.dataFinalHomologacao).slice(0, 5)}`,
      "feature-ho-period",
    );
    period.title = `Homologação: ${date(issue.dataInicialHomologacao)} a ${date(issue.dataFinalHomologacao)}`;
    const production = cell(tr, date(issue.dataProducao), "feature-production");
    const linked = changeForIssue(issue.idIssue);
    const gmud = document.createElement("small");
    gmud.textContent = linked ? linked.rdm || "GMUD sem RDM" : "Sem GMUD";
    production.append(gmud);
    const statusCell = cell(tr, "", "feature-status");
    const state = status(issue),
      stateBadge = document.createElement("span");
    stateBadge.className =
      "badge " +
      {
        "Em produção": "green",
        "Em homologação": "blue",
        Planejada: "gray",
        "Aguardando produção": "orange",
        "Rollback realizado": "red",
      }[state];
    stateBadge.textContent = state;
    statusCell.append(stateBadge);
    const conflicts = conflictsFor(issue, issues);
    if (conflicts.length) {
      tr.classList.add("has-conflict");
      const alert = document.createElement("button");
      alert.type = "button";
      alert.className = "feature-conflict";
      alert.textContent = `${conflicts.length} concorrência(s)`;
      alert.setAttribute("aria-label", `Ver concorrências de ${issue.idIssue}`);
      alert.onclick = () => showComponents(issue);
      statusCell.append(alert);
    }
    const mobileStatus = stateBadge.cloneNode(true);
    mobileStatus.classList.add("feature-mobile-status");
    idcell.append(mobileStatus);
    const actionCell = cell(tr, "", "feature-action-cell"),
      actions = document.createElement("div");
    actions.className = "feature-actions";
    const ho = document.createElement("a");
    ho.href = "homologacao.html?issue=" + encodeURIComponent(issue.idIssue);
    ho.className = "feature-action feature-action-ho";
    ho.setAttribute("aria-label", `Testes de homologação de ${issue.idIssue}`);
    ho.title = "Testes de homologação";
    ho.append(featureActionIcon("tests"), document.createTextNode("HO"));
    const components = document.createElement("button");
    components.type = "button";
    components.className = "feature-action feature-action-components";
    components.setAttribute(
      "aria-label",
      `Ver componentes de ${issue.idIssue}`,
    );
    components.title = `Ver ${issue.servicos.length} componentes e concorrências`;
    const count = document.createElement("span");
    count.className = "feature-action-count";
    count.textContent = issue.servicos.length;
    components.append(featureActionIcon("components"), count);
    components.onclick = () => showComponents(issue);
    actions.append(ho, components);
    actionCell.append(actions);
    $("#rows").append(tr);
  }
  $("#empty").hidden = filtered.length > 0;
  $("#count").textContent = filtered.length
    ? `${start + 1}–${Math.min(start + featurePageSize, filtered.length)} de ${filtered.length} issues`
    : "0 issues";
  $("#featurePageLabel").textContent = `${featurePage} / ${pages}`;
  $("#featurePrevious").disabled = featurePage === 1;
  $("#featureNext").disabled = featurePage === pages;
}

function showComponents(issue, details = false) {
  const conflicts = conflictsFor(issue, issues);
  $("#componentsTitle").textContent =
    `${details ? "Detalhes" : "Componentes"} · ${issue.idIssue}`;
  const summary = $("#featureDetails");
  summary.replaceChildren();
  const linked = changeForIssue(issue.idIssue);
  for (const [label, value] of [
    ["Descrição", issue.descricao],
    ["Squad", issue.squad],
    ["Ambiente", labels[issue.ambiente]],
    [
      "Homologação",
      `${date(issue.dataInicialHomologacao)} a ${date(issue.dataFinalHomologacao)}`,
    ],
    ["Abertura da GMUD", date(issue.dataAberturaChange)],
    ["Produção prevista", date(issue.dataProducao)],
    [
      "GMUD",
      linked
        ? `${linked.rdm || "Sem RDM"} · ${linked.status}`
        : "Não vinculada",
    ],
    ["Situação", status(issue)],
  ]) {
    const field = document.createElement("div"),
      heading = document.createElement("small"),
      content = document.createElement("span");
    heading.textContent = label;
    content.textContent = value;
    field.append(heading, content);
    summary.append(field);
  }
  $("#componentsSummary").textContent =
    `${issue.squad} · ${labels[issue.ambiente]} · Homologação: ${date(issue.dataInicialHomologacao)} a ${date(issue.dataFinalHomologacao)}`;
  const alert = $("#componentsAlert");
  alert.className =
    "component-alert " + (conflicts.length ? "warning" : "clear");
  alert.textContent = conflicts.length
    ? `⚠ Atenção: componentes concorrentes com ${conflicts.length} issue(s) no mesmo período de homologação.`
    : "✓ Nenhum componente concorrente no período de homologação.";
  $("#componentDetails").replaceChildren();
  for (const service of issue.servicos) {
    const shared = conflicts.filter((c) => c.servicos.includes(service));
    const card = document.createElement("article");
    card.className = "component-detail " + (shared.length ? "shared" : "");
    const heading = document.createElement("div");
    heading.className = "component-detail-heading";
    const name = document.createElement("strong");
    name.textContent = `${service} · ${componentType(service)}`;
    const badge = document.createElement("span");
    badge.className = "badge " + (shared.length ? "red" : "green");
    badge.textContent = shared.length ? "Concorrente" : "Sem concorrência";
    heading.append(name, badge);
    card.append(heading);
    for (const conflict of shared) {
      const description = document.createElement("p");
      description.textContent = `${conflict.issue.idIssue} · ${conflict.issue.squad} · ${labels[conflict.issue.ambiente]}`;
      const period = document.createElement("small");
      period.textContent = `Período compartilhado: ${date(conflict.inicio)} a ${date(conflict.fim)}`;
      card.append(description, period);
    }
    $("#componentDetails").append(card);
  }
  if (!issue.servicos.length) {
    $("#componentsAlert").textContent =
      "Componentes ainda não informados para este registro.";
  }
  renderSuggestion(issue, $("#componentSuggestion"), true);
  $("#componentsDialog").showModal();
}
$("#closeComponents").onclick = $("#dismissComponents").onclick = () =>
  $("#componentsDialog").close();
function renderConflicts() {
  const pairs = issues.flatMap((issue, index) =>
    conflictsFor(issue, issues.slice(index + 1)).map((c) => ({
      ...c,
      source: issue,
    })),
  );
  $("#conflictCount").textContent = pairs.length;
  $("#conflictList").replaceChildren();
  $("#conflictEmpty").hidden = pairs.length > 0;
  for (const pair of pairs) {
    const card = document.createElement("article");
    card.className = "conflict-card";
    const title = document.createElement("strong");
    title.textContent = `${pair.source.idIssue} ↔ ${pair.issue.idIssue}`;
    const services = document.createElement("p");
    services.textContent = pair.servicos.join(" · ");
    const period = document.createElement("small");
    period.textContent = `${date(pair.inicio)} a ${date(pair.fim)} · ${labels[pair.source.ambiente]} / ${labels[pair.issue.ambiente]}`;
    card.append(title, services, period);
    $("#conflictList").append(card);
  }
}
function renderSuggestion(issue, container, canApply) {
  container.replaceChildren();
  const suggestion = suggestionFor(issue, issues);
  container.hidden = !suggestion;
  if (!suggestion) return;
  container.className =
    "suggestion-box " + (suggestion.available ? "" : "blocked");
  const text = document.createElement("p");
  text.textContent = suggestion.message;
  container.append(text);
  if (suggestion.available && canApply) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "secondary";
    button.textContent = "Utilizar Homologação 2";
    button.onclick = () => {
      const latest = suggestionFor(issue, issues);
      if (!latest?.available) return;
      issue.ambiente = "homologacao 2";
      let persisted = true;
      try {
        localStorage.setItem(storageKey, JSON.stringify(issues));
      } catch {
        persisted = false;
      }
      render();
      showComponentsWithoutReopening(issue);
      notify(
        persisted
          ? "Ambiente atualizado para Homologação 2."
          : "Ambiente atualizado nesta sessão.",
      );
    };
    container.append(button);
  }
}
function showComponentsWithoutReopening(issue) {
  $("#componentsDialog").close();
  showComponents(issue);
}
function updateFormSuggestion() {
  const form = $("#form");
  const draft = Object.fromEntries(new FormData(form));
  draft.servicos = [
    ...new Set(
      draft.servicos
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
  if (
    !draft.dataInicialHomologacao ||
    !draft.dataFinalHomologacao ||
    draft.dataInicialHomologacao > draft.dataFinalHomologacao ||
    !draft.ambiente
  ) {
    $("#formSuggestion").hidden = true;
    return;
  }
  renderSuggestion(draft, $("#formSuggestion"), false);
  const suggestion = suggestionFor(draft, issues);
  if (suggestion?.available) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "secondary";
    button.textContent = "Selecionar Homologação 2";
    button.onclick = () => {
      form.elements.ambiente.value = "homologacao 2";
      updateFormSuggestion();
    };
    $("#formSuggestion").append(button);
  }
}
$("#form").addEventListener("input", updateFormSuggestion);
function notify(message) {
  $("#toast").textContent = message;
  $("#toast").hidden = false;
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => ($("#toast").hidden = true), 4000);
}
$("#newIssue").onclick = () => {
  $("#form").reset();
  $("#formSuggestion").hidden = true;
  $("#formError").textContent = "";
  $("#dialog").showModal();
};
$("#cancel").onclick = $("#close").onclick = () => $("#dialog").close();
$("#form").onsubmit = (e) => {
  e.preventDefault();
  const issue = Object.fromEntries(new FormData(e.target));
  Object.keys(issue).forEach((k) => (issue[k] = issue[k].trim()));
  issue.idIssue = issue.idIssue.toUpperCase();
  if (Object.values(issue).some((v) => !v)) {
    $("#formError").textContent = "Preencha todos os campos.";
    return;
  }
  if (issues.some((i) => i.idIssue.toUpperCase() === issue.idIssue)) {
    $("#formError").textContent = "Já existe uma issue com este ID.";
    return;
  }
  if (issue.dataFinalHomologacao < issue.dataInicialHomologacao) {
    $("#formError").textContent =
      "O fim da homologação deve ser igual ou posterior ao início.";
    return;
  }
  if (issue.dataProducao <= issue.dataFinalHomologacao) {
    $("#formError").textContent =
      "A produção deve ocorrer depois do fim da homologação.";
    return;
  }
  if (issue.dataAberturaChange > issue.dataProducao) {
    $("#formError").textContent =
      "A abertura da CHANGE/GMUD deve ocorrer até a data de produção.";
    return;
  }
  issue.servicos = [
    ...new Map(
      issue.servicos
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => [s.toLocaleLowerCase("pt-BR"), s]),
    ).values(),
  ];
  if (issue.servicos.length < 1 || issue.servicos.length > 4) {
    $("#formError").textContent =
      "Informe de 1 a 4 serviços/componentes distintos, separados por vírgula.";
    return;
  }
  const hasConflicts = conflictsFor(issue, issues).length > 0;
  issues.unshift(issue);
  let persisted = true;
  try {
    localStorage.setItem(storageKey, JSON.stringify(issues));
  } catch {
    persisted = false;
  }
  $("#dialog").close();
  render();
  notify(
    persisted
      ? hasConflicts
        ? "Issue cadastrada. Atenção: há concorrência de serviços na homologação."
        : "Issue cadastrada com sucesso."
      : "Issue cadastrada nesta sessão. O navegador não permitiu salvar localmente.",
  );
};
["#search", "#squadFilter", "#environmentFilter", "#conflictFilter"].forEach(
  (s) =>
    $(s).addEventListener("input", () => {
      featurePage = 1;
      render();
    }),
);
$("#export").onclick = () => {
  const blob = new Blob([JSON.stringify(issues, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "issues.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify("JSON exportado com os registros atuais.");
};
$("#featurePrevious").onclick = () => {
  featurePage--;
  render();
};
$("#featureNext").onclick = () => {
  featurePage++;
  render();
};
$("#featurePageSize").onchange = (e) => {
  featurePageSize = Number(e.target.value);
  featurePage = 1;
  render();
};
render();

$("#form").elements.dataFinalHomologacao.addEventListener("input", () => {
  const form = $("#form");
  if (!form.elements.dataFinalHomologacao.value) return;
  form.elements.dataProducao.value = addBusinessDays(
    form.elements.dataFinalHomologacao.value,
    3,
  );
  form.elements.dataAberturaChange.value = subtractDays(
    form.elements.dataProducao.value,
    3,
  );
  updateFormSuggestion();
});
$("#form").elements.dataProducao.addEventListener("input", () => {
  const form = $("#form");
  if (form.elements.dataProducao.value)
    form.elements.dataAberturaChange.value = subtractDays(
      form.elements.dataProducao.value,
      3,
    );
});

function featureActionIcon(kind) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.7");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute(
    "d",
    kind === "tests"
      ? "M9 4H6a2 2 0 0 0-2 2v14h16V6a2 2 0 0 0-2-2h-3M9 2h6v4H9zM8 13l3 3 5-6"
      : "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  );
  svg.append(path);
  return svg;
}
