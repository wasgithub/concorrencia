// Página Testes: catálogo de casos + etapas do fluxo + dimensões do montador.
// Usa os stores compartilhados de tests-store.js (scenarioCatalog, testStages, scenarioDims).
const $ = (s) => document.querySelector(s);
function element(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}
function notify(message) {
  $("#toast").textContent = message;
  $("#toast").hidden = false;
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => ($("#toast").hidden = true), 4000);
}
function changeSettings(kind, change) {
  const previous = structuredClone(
    kind === "stages" ? testStages : scenarioDims,
  );
  change();
  const saved = kind === "stages" ? persistTestStages() : persistScenarioDims();
  if (!saved) {
    if (kind === "stages") testStages = previous;
    else scenarioDims = previous;
    render();
    notify("Não foi possível salvar. A alteração não foi aplicada.");
    return false;
  }
  render();
  return true;
}
function tipoBadge(t) {
  return element(
    "span",
    "badge " + (t === "Automática" ? "blue" : t === "Manual" ? "gray" : "env"),
    t === "Automática"
      ? "Garantia automática"
      : t === "Manual"
        ? "Garantia manual"
        : "Garantia N/A",
  );
}

// ---- Catálogo ---------------------------------------------------------------
function render() {
  const coberturas = [
    ...new Set(scenarioCatalog.map((c) => c.cobertura)),
  ].sort();
  $("#statCases").textContent = scenarioCatalog.length;
  $("#statActive").textContent = scenarioCatalog.filter((c) => c.ativo).length;
  $("#statCoverage").textContent = coberturas.length;
  $("#statStages").textContent = testStages.length;
  const covSel = $("#coverageFilter"),
    keep = covSel.value;
  covSel.replaceChildren(
    new Option("Todas as coberturas", ""),
    ...coberturas.map((c) => new Option(c, c)),
  );
  covSel.value = keep;
  $("#coverageList").replaceChildren(
    ...[...new Set([...coberturas, ...coberturaOptions])].map((c) => {
      const o = document.createElement("option");
      o.value = c;
      return o;
    }),
  );
  const term = $("#caseSearch").value.trim().toLocaleLowerCase("pt-BR");
  const cov = $("#coverageFilter").value,
    tipo = $("#tipoFilter").value,
    onlyActive = $("#onlyActive").checked;
  const rows = $("#caseRows");
  rows.replaceChildren();
  const filtered = scenarioCatalog.filter(
    (c) =>
      (!onlyActive || c.ativo) &&
      (!cov || c.cobertura === cov) &&
      (!tipo || c.tipo === tipo) &&
      (!term ||
        [
          c.nome,
          c.cobertura,
          c.etapaAlvo,
          ...normalizeTestComponents(c.componentes),
        ].some((v) => (v || "").toLocaleLowerCase("pt-BR").includes(term))),
  );
  for (const caso of filtered) {
    const tr = document.createElement("tr");
    if (!caso.ativo) tr.className = "row-inactive";
    const nameCell = document.createElement("td");
    nameCell.className = "case-name";
    nameCell.textContent = caso.nome;
    tr.append(nameCell);
    const tc = document.createElement("td");
    tc.append(tipoBadge(caso.tipo));
    tr.append(tc);
    const alvo = document.createElement("td");
    alvo.append(element("span", "badge env", caso.etapaAlvo));
    tr.append(alvo);
    const cob = document.createElement("td");
    cob.append(element("span", "badge blue", caso.cobertura));
    tr.append(cob);
    const components = document.createElement("td");
    components.textContent =
      normalizeTestComponents(caso.componentes).join(", ") || "Sem vínculo";
    tr.append(components);
    const st = document.createElement("td");
    st.append(
      element(
        "span",
        "badge " + (caso.ativo ? "green" : "gray"),
        caso.ativo ? "Ativo" : "Inativo",
      ),
    );
    tr.append(st);
    const acts = document.createElement("td");
    acts.className = "agenda-actions";
    const ed = element("button", "secondary small", "Editar");
    ed.type = "button";
    ed.onclick = () => openCase(caso);
    acts.append(ed);
    const tg = element(
      "button",
      "secondary small",
      caso.ativo ? "Desativar" : "Ativar",
    );
    tg.type = "button";
    tg.onclick = () => {
      const next = scenarioCatalog.map((c) =>
        c.id === caso.id ? { ...c, ativo: !c.ativo } : c,
      );
      if (!saveTestData(scenarioCatalogKey, next))
        return notify("Não foi possível salvar.");
      scenarioCatalog = next;
      render();
    };
    acts.append(tg);
    const rm = element("button", "secondary small danger", "Remover");
    rm.type = "button";
    rm.onclick = () => {
      if (testTrails().some((t) => t.casoIds.includes(caso.id)))
        return notify(
          "Este cenário está em uma trilha. Remova o vínculo ou desative o cenário.",
        );
      const next = scenarioCatalog.filter((x) => x.id !== caso.id);
      if (!saveTestData(scenarioCatalogKey, next))
        return notify("Não foi possível salvar.");
      scenarioCatalog = next;
      render();
      notify("Caso removido.");
    };
    acts.append(rm);
    tr.append(acts);
    rows.append(tr);
  }
  $("#caseEmpty").hidden = filtered.length > 0;
  $("#caseCount").textContent =
    `${filtered.length} de ${scenarioCatalog.length} casos`;
  renderStages();
  renderDims();
  renderTrails();
}

// ---- Modal de caso ----------------------------------------------------------
let editingCaseId = null;
function openCase(caso) {
  editingCaseId = caso ? caso.id : null;
  $("#caseEyebrow").textContent = caso ? "EDITAR CASO" : "NOVO CASO";
  const f = $("#caseForm"),
    el = f.elements;
  delete f.dataset.nomeEdited;
  const availableTypes = [
    ...new Set([...scenarioTipoOptions, ...(caso?.tipo ? [caso.tipo] : [])]),
  ];
  el.tipo.replaceChildren(...availableTypes.map((o) => new Option(o, o)));
  const availableStages = [
    ...new Set([...testStages, ...(caso ? scenarioFlow(caso) : [])]),
  ];
  el.etapaAlvo.replaceChildren(...availableStages.map((s) => new Option(s, s)));
  el.nome.value = caso?.nome || "";
  el.tipo.value = caso?.tipo || "Automática";
  el.etapaAlvo.value = caso?.etapaAlvo || lastStage();
  el.cobertura.value = caso?.cobertura || "Regressivo padrão";
  el.ativo.checked = caso ? caso.ativo : true;
  el.componentes.value = normalizeTestComponents(caso?.componentes).join(", ");
  const components = normalizeTestComponents([
    ...scenarioCatalog.flatMap((c) => normalizeTestComponents(c.componentes)),
  ]).sort();
  $("#testComponentList").replaceChildren(
    ...components.map((c) => new Option(c, c)),
  );
  if (caso) f.dataset.nomeEdited = "1";
  setupCaseContext(caso);
  $("#caseError").textContent = "";
  $("#caseDialog").showModal();
}
function setupCaseContext(caso) {
  const f = $("#caseForm"),
    el = f.elements;
  const context = caso
    ? scenarioContext(caso)
    : { frente: "Crédito", funcionalidade: "" };
  f.scenarioDimensions = { ...caseDimensions(caso || { nome: "" }) };
  f.caseOriginal = caso;
  const fronts = [
    ...new Set([
      ...scenarioAreas().map((a) => a.nome),
      ...(context.frente ? [context.frente] : []),
    ]),
  ];
  el.frente.replaceChildren(
    new Option("Selecione a frente", ""),
    ...fronts.map((v) => new Option(v, v)),
  );
  el.frente.value = context.frente || "";
  function functions() {
    const values =
      scenarioAreas().find((a) => a.nome === el.frente.value)
        ?.funcionalidades || [];
    const existing =
      caso && context.frente === el.frente.value ? context.funcionalidade : "";
    el.funcionalidade.replaceChildren(
      new Option("Toda a frente", ""),
      ...[...new Set([...values, ...(existing ? [existing] : [])])].map(
        (v) => new Option(v, v),
      ),
    );
    el.funcionalidade.value = existing || "";
  }
  functions();
  function flows(preserve) {
    const options = compatibleTestFlows(
      el.frente.value,
      el.funcionalidade.value,
    );
    el.workflowId.replaceChildren(
      new Option(
        el.frente.value === "Crédito"
          ? "Etapas configuradas de crédito"
          : "Selecione um fluxo",
        "",
      ),
    );
    if (preserve && caso)
      el.workflowId.append(
        new Option("Manter etapas salvas do cenário", "__saved"),
      );
    options.forEach((flow) =>
      el.workflowId.append(new Option(flow.nome, flow.id)),
    );
    el.workflowId.value = preserve && caso ? "__saved" : "";
    updateCaseStages();
  }
  el.frente.onchange = () => {
    f.scenarioDimensions = {};
    if (!f.dataset.nomeEdited) f.elements.nome.value = "";
    functions();
    flows(false);
    renderCaseBuilder();
  };
  el.funcionalidade.onchange = () => {
    flows(false);
  };
  el.workflowId.onchange = () => updateCaseStages();
  flows(true);
  renderCaseBuilder();
}
function selectedCaseSteps() {
  const f = $("#caseForm"),
    el = f.elements;
  if (el.workflowId.value === "__saved" && f.caseOriginal) {
    const original = f.caseOriginal;
    const names = original.sourceFlow?.length
      ? original.sourceFlow
      : scenarioFlow(original);
    return names.map((nome) => ({
      id:
        (original.sourceStepDefinitions || original.stepDefinitions)?.find(
          (s) => s.nome === nome,
        )?.id || nome,
      nome,
    }));
  }
  const flow = compatibleTestFlows(
    el.frente.value,
    el.funcionalidade.value,
  ).find((x) => x.id === el.workflowId.value);
  if (flow) return flow.steps.map((s) => ({ ...s }));
  return el.frente.value === "Crédito"
    ? testStages.map((nome) => ({ id: nome, nome }))
    : [];
}
function updateCaseStages() {
  $("#caseError").textContent = "";
  const el = $("#caseForm").elements,
    previous = el.etapaAlvo.value;
  const steps = selectedCaseSteps();
  el.etapaAlvo.replaceChildren(...steps.map((s) => new Option(s.nome, s.nome)));
  if (steps.some((s) => s.nome === previous)) el.etapaAlvo.value = previous;
  else el.etapaAlvo.value = steps.at(-1)?.nome || "";
}
function renderCaseBuilder() {
  const box = $("#caseBuilder");
  box.replaceChildren();
  const f = $("#caseForm"),
    front = f.elements.frente.value;
  const credit = !front || front === "Crédito";
  $("#caseGuaranteeField").hidden = !credit;
  f.elements.tipo.disabled = !credit;
  const sel = f.scenarioDimensions;
  const dimensions = scenarioDims.filter((d) => dimensionApplies(d, front));
  // Linha é a primeira dimensão específica; Frente determina sua aplicabilidade.
  dimensions.sort((a, b) => (b.nome === "Linha") - (a.nome === "Linha"));
  for (const d of dimensions) {
    const label = element("label", "", dimensionLabel(d)),
      select = element("select");
    select.append(new Option("Não informado", ""));
    for (const o of [
      ...new Set([...d.opcoes, ...(sel[d.nome] ? [sel[d.nome]] : [])]),
    ])
      select.append(new Option(o, o));
    select.value = sel[d.nome] || "";
    select.onchange = () => {
      sel[d.nome] = select.value;
      const name = composeScenarioName(sel);
      if (!f.dataset.nomeEdited) f.elements.nome.value = name;
    };
    label.append(select);
    box.append(label);
  }
}
$("#caseForm").addEventListener("input", (e) => {
  if (e.target.name === "nome") $("#caseForm").dataset.nomeEdited = "1";
});
$("#caseForm").onsubmit = (e) => {
  e.preventDefault();
  const el = e.target.elements;
  const nome = el.nome.value.trim();
  $("#caseError").textContent = "";
  if (!nome || nome.length > 200) {
    $("#caseError").textContent =
      "Informe o nome do fluxo (monte pelas dimensões ou digite).";
    return;
  }
  const frente = el.frente.value;
  const original = scenarioCatalog.find((c) => c.id === editingCaseId);
  if (!frente && !original) {
    $("#caseError").textContent = "Selecione a frente do cenário.";
    return;
  }
  const steps = selectedCaseSteps();
  const end = steps.findIndex((s) => s.nome === el.etapaAlvo.value);
  if (end < 0) {
    $("#caseError").textContent =
      "Selecione um fluxo com etapas para esta frente. Cadastre-o na Biblioteca de fluxos, se necessário.";
    return;
  }
  const flow = testFlows().find((x) => x.id === el.workflowId.value);
  const rec = {
    nome,
    frente,
    funcionalidade: el.funcionalidade.value,
    workflowId:
      el.workflowId.value === "__saved"
        ? original?.workflowId || ""
        : flow?.id || "",
    workflowVersion:
      el.workflowId.value === "__saved"
        ? original?.workflowVersion || null
        : flow?.version || null,
    stepDefinitions: steps.slice(0, end + 1).map((s) => ({ ...s })),
    sourceFlow:
      el.workflowId.value === "__saved"
        ? [...(original?.sourceFlow || steps.map((s) => s.nome))]
        : steps.map((s) => s.nome),
    sourceStepDefinitions:
      el.workflowId.value === "__saved"
        ? (original?.sourceStepDefinitions || steps).map((s) => ({ ...s }))
        : steps.map((s) => ({ ...s })),
    catalogVersion: (original?.catalogVersion || original?.version || 0) + 1,
    dimensoes: Object.fromEntries(
      Object.entries(e.target.scenarioDimensions).filter(
        ([key]) =>
          scenarioDims.some(
            (d) => d.nome === key && dimensionApplies(d, frente),
          ) ||
          (original &&
            scenarioContext(original).frente === frente &&
            !scenarioDims.some((d) => d.nome === key)),
      ),
    ),
    componentes: normalizeTestComponents(el.componentes.value),
    tipo: frente && frente !== "Crédito" ? "N/A" : el.tipo.value,
    etapaAlvo: el.etapaAlvo.value,
    cobertura: el.cobertura.value.trim() || "Regressivo padrão",
    ativo: el.ativo.checked,
  };
  rec.fluxo = steps.slice(0, end + 1).map((s) => s.nome);
  if (!rec.fluxo.length || rec.fluxo.length > 50 || !rec.tipo) {
    $("#caseError").textContent =
      "Cadastre uma etapa e selecione o tipo de garantia antes de salvar.";
    return;
  }
  if (rec.cobertura.length > 100 || rec.componentes.length > 100) {
    $("#caseError").textContent =
      "Use cobertura com até 100 caracteres e no máximo 100 componentes.";
    return;
  }
  const next = structuredClone(scenarioCatalog);
  if (editingCaseId) {
    const c = next.find((x) => x.id === editingCaseId);
    if (c) Object.assign(c, rec);
  } else next.push({ id: nextCatalogId(), ...rec });
  if (!saveTestData(scenarioCatalogKey, next)) {
    $("#caseError").textContent =
      "Não foi possível salvar. Seus dados continuam no formulário.";
    return;
  }
  scenarioCatalog = next;
  $("#caseDialog").close();
  render();
  notify("Caso salvo no catálogo.");
};
$("#cancelCase").onclick = $("#closeCase").onclick = () =>
  $("#caseDialog").close();
$("#newCase").onclick = () => openCase(null);

// ---- Etapas do fluxo --------------------------------------------------------
function renderStages() {
  const box = $("#stagesList");
  box.replaceChildren();
  testStages.forEach((stg, i) => {
    const row = element("div", "stage-item");
    row.append(
      element("span", "stage-order", String(i + 1)),
      element("span", "stage-name-full", stg),
    );
    const acts = element("div", "stage-acts");
    const up = element("button", "secondary small", "↑");
    up.type = "button";
    up.disabled = i === 0;
    up.onclick = () => {
      changeSettings("stages", () => {
        [testStages[i - 1], testStages[i]] = [testStages[i], testStages[i - 1]];
      });
    };
    const down = element("button", "secondary small", "↓");
    down.type = "button";
    down.disabled = i === testStages.length - 1;
    down.onclick = () => {
      changeSettings("stages", () => {
        [testStages[i + 1], testStages[i]] = [testStages[i], testStages[i + 1]];
      });
    };
    const rm = element("button", "secondary small danger", "×");
    rm.type = "button";
    rm.title = "Remover etapa";
    rm.onclick = () => {
      changeSettings("stages", () => testStages.splice(i, 1));
    };
    acts.append(up, down, rm);
    row.append(acts);
    box.append(row);
  });
}
$("#stageAddForm").onsubmit = (e) => {
  e.preventDefault();
  const inp = $("#stageAddForm").elements.nome;
  const v = inp.value.trim();
  if (testStages.length >= 50 || v.length > 200)
    return notify("Use no máximo 50 etapas com até 200 caracteres.");
  if (
    v &&
    !testStages.some(
      (s) => s.toLocaleLowerCase("pt-BR") === v.toLocaleLowerCase("pt-BR"),
    )
  ) {
    if (changeSettings("stages", () => testStages.push(v))) inp.value = "";
  }
};

// ---- Dimensões do montador --------------------------------------------------
function renderDims() {
  const body = $("#dimsBody");
  body.replaceChildren();
  scenarioDims.forEach((d, di) => {
    const sec = element("section", "dim-card");
    const head = element("div", "dim-head");
    head.append(element("strong", "", d.nome));
    const del = element("button", "secondary small danger", "Remover");
    del.type = "button";
    del.onclick = () => {
      changeSettings("dimensions", () => scenarioDims.splice(di, 1));
    };
    head.append(del);
    sec.append(head);
    const scopeLabel = element("label", "", "Aplicar em"),
      scope = element("select");
    scope.setAttribute("aria-label", "Frente do campo " + d.nome);
    const defaultScope = [
      "Perfil",
      "Tipo",
      "Linha",
      "Garantia",
      "Variação",
    ].includes(d.nome)
      ? "Crédito"
      : "";
    const currentScope = d.frente === undefined ? defaultScope : d.frente;
    scope.append(new Option("Todas as frentes", ""));
    for (const front of [
      ...new Set([
        ...scenarioAreas().map((a) => a.nome),
        ...(currentScope ? [currentScope] : []),
      ]),
    ])
      scope.append(new Option(front, front));
    scope.value = currentScope;
    scope.onchange = () =>
      changeSettings("dimensions", () => {
        d.frente = scope.value;
      });
    scopeLabel.append(scope);
    sec.append(scopeLabel);
    const chips = element("div", "dim-chips");
    d.opcoes.forEach((o, oi) => {
      const chip = element("span", "dim-chip", o);
      const x = element("button", "chip-x", "×");
      x.type = "button";
      x.onclick = () => {
        changeSettings("dimensions", () => d.opcoes.splice(oi, 1));
      };
      chip.append(x);
      chips.append(chip);
    });
    sec.append(chips);
    const addForm = element("form", "dim-add");
    const inp = element("input");
    inp.placeholder = "Nova opção";
    inp.maxLength = 60;
    const btn = element("button", "secondary small", "Adicionar");
    btn.type = "submit";
    addForm.append(inp, btn);
    addForm.onsubmit = (ev) => {
      ev.preventDefault();
      const v = inp.value.trim();
      if (v && !d.opcoes.includes(v)) {
        changeSettings("dimensions", () => d.opcoes.push(v));
      }
    };
    sec.append(addForm);
    body.append(sec);
  });
}
$("#dimAddForm").onsubmit = (e) => {
  e.preventDefault();
  const inp = $("#dimAddForm").elements.nome;
  const v = inp.value.trim();
  if (v && !scenarioDims.some((d) => d.nome === v)) {
    if (
      changeSettings("dimensions", () =>
        scenarioDims.push({ nome: v, opcoes: [] }),
      )
    )
      inp.value = "";
  }
};

["#caseSearch", "#coverageFilter", "#tipoFilter", "#onlyActive"].forEach((s) =>
  $(s).addEventListener("input", render),
);

let editingTrailId = null;
function renderTrails() {
  const box = $("#trailList");
  box.replaceChildren();
  for (const trail of testTrails()) {
    const row = element("div", "stage-item");
    row.append(
      element("strong", "", trail.nome),
      element("span", "", `${trail.casoIds.length} cenários`),
    );
    const edit = element("button", "secondary", "Editar");
    edit.type = "button";
    edit.onclick = () => {
      editingTrailId = trail.id;
      $("#trailForm").elements.nome.value = trail.nome;
      renderTrailCases(trail.casoIds);
    };
    const remove = element("button", "secondary danger", "Remover");
    remove.type = "button";
    remove.onclick = () => {
      if (
        !saveTestData(
          testTrailsKey,
          testTrails().filter((t) => t.id !== trail.id),
        )
      )
        return notify("Não foi possível salvar.");
      if (editingTrailId === trail.id) resetTrail();
      renderTrails();
    };
    row.append(edit, remove);
    box.append(row);
  }
  if (!box.children.length)
    box.append(
      element(
        "p",
        "",
        "Nenhuma trilha cadastrada. Selecione cenários abaixo para criar uma.",
      ),
    );
  const selected = [...$("#trailCases").querySelectorAll("input:checked")].map(
    (c) => c.value,
  );
  renderTrailCases(selected);
}
function renderTrailCases(ids = []) {
  const box = $("#trailCases");
  box.replaceChildren();
  for (const caso of scenarioCatalog.filter(
    (c) => c.ativo || ids.includes(c.id),
  )) {
    const label = element("label", "issue-check");
    const cb = element("input");
    cb.type = "checkbox";
    cb.value = caso.id;
    cb.checked = ids.includes(caso.id);
    const info = element("span", "issue-check-info");
    info.append(
      element("strong", "", caso.nome),
      element(
        "small",
        "",
        `${caso.ativo ? "" : "Inativo · "}Testar até: ${caso.etapaAlvo}`,
      ),
    );
    label.append(cb, info);
    box.append(label);
  }
}
function resetTrail() {
  editingTrailId = null;
  $("#trailForm").reset();
  $("#trailError").textContent = "";
  renderTrailCases();
}
$("#cancelTrail").onclick = resetTrail;
$("#trailForm").onsubmit = (e) => {
  e.preventDefault();
  const nome = e.target.elements.nome.value.trim(),
    casoIds = [...$("#trailCases").querySelectorAll("input:checked")].map(
      (c) => c.value,
    );
  if (!nome || nome.length > 160 || !casoIds.length || casoIds.length > 200) {
    $("#trailError").textContent =
      "Informe o nome e selecione pelo menos um cenário.";
    return;
  }
  const trails = testTrails(),
    item = { id: editingTrailId || "trail-" + Date.now(), nome, casoIds };
  if (
    trails.some(
      (t) =>
        t.id !== editingTrailId &&
        t.nome.trim().toLocaleLowerCase("pt-BR") ===
          nome.toLocaleLowerCase("pt-BR"),
    )
  ) {
    $("#trailError").textContent = "Já existe uma trilha com este nome.";
    return;
  }
  const i = trails.findIndex((t) => t.id === editingTrailId);
  if (i < 0) trails.push(item);
  else trails[i] = item;
  if (!saveTestData(testTrailsKey, trails))
    return notify("Não foi possível salvar.");
  resetTrail();
  renderTrails();
  notify("Trilha salva.");
};
render();
