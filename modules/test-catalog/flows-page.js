const $ = (s) => document.querySelector(s);
function element(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}
function notify(text) {
  $("#toast").textContent = text;
  $("#toast").hidden = false;
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => ($("#toast").hidden = true), 4000);
}
function fillFunctions(select, frente, allLabel) {
  const keep = select.value;
  select.replaceChildren(
    new Option(allLabel, ""),
    ...(
      scenarioAreas().find((a) => a.nome === frente)?.funcionalidades || []
    ).map((n) => new Option(n, n)),
  );
  select.value = keep;
}
function render() {
  const keep = $("#flowArea").value;
  $("#flowArea").replaceChildren(
    new Option("Todas as frentes", ""),
    ...contextAreas().map((n) => new Option(n, n)),
  );
  $("#flowArea").value = keep;
  fillFunctions($("#flowFunction"), keep, "Todas as funcionalidades");
  $("#flowFunction").disabled = !keep;
  const term = $("#flowSearch").value.trim().toLocaleLowerCase("pt-BR");
  const flows = testFlows().filter(
    (f) =>
      (!keep || f.frente === keep) &&
      (!$("#flowFunction").value ||
        f.funcionalidade === $("#flowFunction").value) &&
      (!$("#activeFlows").checked || f.ativo) &&
      (!term ||
        [f.nome, ...f.steps.map((s) => s.nome)].some((n) =>
          n.toLocaleLowerCase("pt-BR").includes(term),
        )),
  );
  const box = $("#flowCards");
  box.replaceChildren();
  for (const flow of flows) {
    const card = element("article", "flow-card"),
      head = element("div", "flow-card-heading"),
      info = element("div");
    info.append(
      element(
        "small",
        "scenario-context",
        [flow.frente, flow.funcionalidade || "Todas as funcionalidades"].join(
          " → ",
        ),
      ),
      element("h3", "", flow.nome),
    );
    const actions = element("div", "quality-actions");
    for (const [label, fn] of [
      ["Editar", () => openFlow(flow)],
      [
        "Duplicar",
        () =>
          openFlow({
            ...flow,
            id: null,
            version: 0,
            nome: flow.nome + " — cópia",
            steps: flow.steps.map((s) => ({ ...s, id: newId() })),
          }),
      ],
    ]) {
      const b = element("button", "secondary small", label);
      b.type = "button";
      b.onclick = fn;
      actions.append(b);
    }
    head.append(info, actions);
    card.append(head);
    const steps = element("ol", "flow-preview");
    flow.steps.forEach((s) => steps.append(element("li", "", s.nome)));
    card.append(
      steps,
      element(
        "p",
        "settings-hint",
        `${flow.steps.length} etapas · Versão ${flow.version} · ${flow.ativo ? "Ativo" : "Inativo"}`,
      ),
    );
    box.append(card);
  }
  if (!flows.length)
    box.append(
      element(
        "p",
        "empty",
        "Nenhum fluxo encontrado. Crie um fluxo para esta frente ou ajuste os filtros.",
      ),
    );
  $("#flowCount").textContent = `${flows.length} fluxo(s)`;
}
let editing = null,
  steps = [];
function newId() {
  return (
    "step-" +
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 9)
  );
}
function renderSteps(focus = -1) {
  const box = $("#flowSteps");
  box.replaceChildren();
  steps.forEach((step, index) => {
    const row = element("li", "flow-step-row"),
      input = element("input");
    input.value = step.nome;
    input.maxLength = 200;
    input.required = true;
    input.placeholder = "Ex.: Confirmar pedido";
    input.setAttribute("aria-label", `Etapa ${index + 1}`);
    input.oninput = () => (step.nome = input.value);
    row.append(element("span", "stage-order", String(index + 1)), input);
    for (const [label, title, disabled, fn] of [
      [
        "↑",
        "Mover etapa para cima",
        index === 0,
        () => {
          [steps[index - 1], steps[index]] = [steps[index], steps[index - 1]];
          renderSteps(index - 1);
        },
      ],
      [
        "↓",
        "Mover etapa para baixo",
        index === steps.length - 1,
        () => {
          [steps[index + 1], steps[index]] = [steps[index], steps[index + 1]];
          renderSteps(index + 1);
        },
      ],
      [
        "×",
        "Remover etapa",
        steps.length === 1,
        () => {
          steps.splice(index, 1);
          renderSteps(Math.min(index, steps.length - 1));
        },
      ],
    ]) {
      const b = element("button", "secondary small", label);
      b.type = "button";
      b.title = title;
      b.setAttribute("aria-label", `${title} ${index + 1}`);
      b.disabled = disabled;
      b.onclick = fn;
      row.append(b);
    }
    box.append(row);
  });
  $("#flowStepCount").textContent = `${steps.length}/50 etapas`;
  $("#addFlowStep").disabled = steps.length >= 50;
  if (focus >= 0) box.children[focus]?.querySelector("input").focus();
}
function openFlow(flow) {
  editing = flow || null;
  const f = $("#flowForm");
  f.reset();
  f.elements.frente.replaceChildren(
    new Option("Selecione a frente", ""),
    ...scenarioAreas().map((a) => new Option(a.nome, a.nome)),
  );
  f.elements.frente.value = flow?.frente || $("#flowArea").value;
  fillFunctions(
    f.elements.funcionalidade,
    f.elements.frente.value,
    "Todas as funcionalidades",
  );
  f.elements.funcionalidade.value = flow?.funcionalidade || "";
  f.elements.nome.value = flow?.nome || "";
  f.elements.ativo.checked = flow ? flow.ativo : true;
  steps = flow
    ? flow.steps.map((s) => ({ ...s }))
    : [{ id: newId(), nome: "" }];
  $("#flowTitle").textContent = flow?.id ? "Editar fluxo" : "Novo fluxo";
  $("#flowError").textContent = "";
  renderSteps();
  $("#flowDialog").showModal();
}
$("#newFlow").onclick = () => openFlow(null);
$("#closeFlow").onclick = $("#cancelFlow").onclick = () =>
  $("#flowDialog").close();
$("#flowForm").elements.frente.onchange = () => {
  const f = $("#flowForm");
  f.elements.funcionalidade.value = "";
  fillFunctions(
    f.elements.funcionalidade,
    f.elements.frente.value,
    "Todas as funcionalidades",
  );
};
$("#addFlowStep").onclick = () => {
  if (steps.length < 50) {
    steps.push({ id: newId(), nome: "" });
    renderSteps(steps.length - 1);
  }
};
$("#flowForm").onsubmit = (e) => {
  e.preventDefault();
  const f = e.target.elements,
    result = saveTestFlow({
      id: editing?.id || "flow-" + newId(),
      version: editing?.version || 0,
      nome: f.nome.value.trim(),
      frente: f.frente.value,
      funcionalidade: f.funcionalidade.value,
      ativo: f.ativo.checked,
      steps,
    });
  if (!result.ok) {
    $("#flowError").textContent = result.error;
    return;
  }
  $("#flowDialog").close();
  render();
  notify("Fluxo salvo. Cenários e execuções existentes foram preservados.");
};
for (const id of ["#flowSearch", "#flowArea", "#flowFunction", "#activeFlows"])
  $(id).oninput = () => {
    if (id === "#flowArea") $("#flowFunction").value = "";
    render();
  };
function renderAreas() {
  const box = $("#areaList");
  box.replaceChildren();
  for (const area of scenarioAreas()) {
    const item = element("div", "flow-area");
    item.append(
      element("strong", "", area.nome),
      element(
        "p",
        "scenario-context",
        area.funcionalidades.join(" · ") || "Nenhuma funcionalidade cadastrada",
      ),
    );
    box.append(item);
  }
  const select = $("#functionForm").elements.frente,
    keep = select.value;
  select.replaceChildren(
    ...scenarioAreas().map((a) => new Option(a.nome, a.nome)),
  );
  if (keep) select.value = keep;
  render();
}
$("#manageAreas").onclick = () => {
  renderAreas();
  $("#areasDialog").showModal();
};
$("#closeAreas").onclick = () => $("#areasDialog").close();
$("#areaForm").onsubmit = (e) => {
  e.preventDefault();
  const nome = e.target.elements.area.value.trim(),
    areas = scenarioAreas();
  $("#areaError").textContent = "";
  if (
    !nome ||
    nome.length > 80 ||
    areas.some(
      (a) =>
        a.nome.toLocaleLowerCase("pt-BR") === nome.toLocaleLowerCase("pt-BR"),
    )
  ) {
    $("#areaError").textContent = "Informe um nome único para a frente.";
    return;
  }
  if (
    !saveTestData(scenarioAreasKey, [...areas, { nome, funcionalidades: [] }])
  ) {
    $("#areaError").textContent = "Não foi possível salvar.";
    return;
  }
  e.target.reset();
  renderAreas();
  $("#functionForm").elements.frente.value = nome;
  notify("Frente cadastrada. Adicione suas funcionalidades.");
};
$("#functionForm").onsubmit = (e) => {
  e.preventDefault();
  const f = e.target.elements,
    areas = scenarioAreas(),
    area = areas.find((a) => a.nome === f.frente.value),
    nome = f.nome.value.trim();
  $("#functionError").textContent = "";
  if (
    !area ||
    !nome ||
    nome.length > 80 ||
    area.funcionalidades.some(
      (n) => n.toLocaleLowerCase("pt-BR") === nome.toLocaleLowerCase("pt-BR"),
    )
  ) {
    $("#functionError").textContent =
      "Escolha a frente e informe uma funcionalidade com nome único.";
    return;
  }
  area.funcionalidades.push(nome);
  if (!saveTestData(scenarioAreasKey, areas)) {
    $("#functionError").textContent = "Não foi possível salvar.";
    return;
  }
  f.nome.value = "";
  renderAreas();
  notify("Funcionalidade cadastrada.");
};
render();
