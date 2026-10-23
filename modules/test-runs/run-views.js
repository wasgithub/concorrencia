// Formas alternativas de consultar as mesmas execuções, sem copiar resultados.
window.RunViews = (() => {
  const resultLabels = {
    ok: "OK",
    failed: "Falhou",
    pending: "Pendente",
    not_applicable: "N/A",
  };
  const selectedProductionDates = new Set();
  function matrixCycles() {
    const mode = $("#matrixScope").value;
    if (mode === "current") return current() ? [current()] : [];
    if (mode === "selected")
      return cycles
        .filter(
          (c) =>
            (!$("#matrixEnvironment").value ||
              c.environment === $("#matrixEnvironment").value) &&
            [...selectedProductionDates].some(
              (day) => c.startDate <= day && c.endDate >= day,
            ),
        )
        .slice()
        .sort(
          (a, b) =>
            a.startDate.localeCompare(b.startDate) ||
            a.name.localeCompare(b.name, "pt-BR"),
        );
    const day = mode === "production" ? $("#matrixProductionDate").value : "";
    if (mode === "production" && !day) return [];
    return TestRuns.productionCycles(cycles, day, $("#matrixEnvironment").value)
      .slice()
      .sort(
        (a, b) =>
          a.startDate.localeCompare(b.startDate) ||
          a.name.localeCompare(b.name, "pt-BR"),
      );
  }
  function renderDateChoices() {
    const box = $("#matrixDateChoices"),
      mode = $("#matrixScope").value,
      dates = new Set();
    const available = TestRuns.productionCycles(
      cycles,
      "",
      $("#matrixEnvironment").value,
    );
    for (const c of available) {
      const from = utcDay(c.startDate),
        to = utcDay(c.endDate);
      if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) continue;
      for (let day = from; day <= Math.min(to, from + 365); day++)
        dates.add(isoDay(day));
      dates.add(c.endDate);
    }
    box.replaceChildren();
    const apply = (next) => {
      $("#matrixScope").value = next;
      $("#matrixScope").dispatchEvent(new Event("change"));
    };
    for (const [value, label] of [
      ["all", "Todas as subidas"],
      ["current", "Este ciclo"],
    ]) {
      const b = node("button", "matrix-date-shortcut", label);
      b.type = "button";
      b.dataset.scope = value;
      b.setAttribute("aria-pressed", String(mode === value));
      b.onclick = () => {
        selectedProductionDates.clear();
        apply(value);
        box.querySelector('[data-scope="' + value + '"]').focus();
      };
      box.append(b);
    }
    for (const day of [...dates].sort()) {
      const matching = TestRuns.productionCycles(available, day),
        b = node("button", "matrix-date-choice");
      b.type = "button";
      b.dataset.productionDate = day;
      const active =
        mode === "selected"
          ? selectedProductionDates.has(day)
          : mode === "production" && $("#matrixProductionDate").value === day;
      b.setAttribute("aria-pressed", String(active));
      b.setAttribute("aria-label", "Subida em " + date(day));
      b.append(
        node("strong", "", date(day)),
        node(
          "small",
          "",
          `${matching.length} ciclo(s) · ${matching.reduce((n, c) => n + c.scenarios.length, 0)} cenários`,
        ),
      );
      b.onclick = () => {
        if (mode !== "selected") {
          selectedProductionDates.clear();
          if (
            mode === "production" &&
            $("#matrixProductionDate").value &&
            $("#matrixProductionDate").value !== day
          )
            selectedProductionDates.add($("#matrixProductionDate").value);
        }
        if (selectedProductionDates.has(day))
          selectedProductionDates.delete(day);
        else selectedProductionDates.add(day);
        apply(selectedProductionDates.size ? "selected" : "all");
        box.querySelector('[data-production-date="' + day + '"]').focus();
      };
      box.append(b);
    }
    if (!dates.size)
      box.append(
        node(
          "span",
          "field-hint",
          "Nenhuma data de subida cadastrada neste ambiente.",
        ),
      );
  }
  function openMatrixStep(cycle, scenario, step) {
    openDetails(scenario.id, cycle.id);
    if (step) {
      const input =
        $("#runResultForm").elements["result-" + scenario.steps.indexOf(step)];
      input.scrollIntoView({ block: "center" });
      input.focus();
    }
  }
  function renderMatrix() {
    const source = matrixCycles(),
      allScenarios = source.flatMap((c) => c.scenarios),
      mode = $("#matrixScope").value;
    $("#matrixManualDate").hidden = mode !== "production";
    $("#matrixEnvironment").disabled = mode === "current";
    if (mode === "current" && current())
      $("#matrixEnvironment").value = current().environment;
    renderDateChoices();
    options(
      $("#runFront"),
      allScenarios.map((s) => s.front),
      "Todas as frentes",
    );
    options(
      $("#runTeam"),
      allScenarios.map((s) => s.team),
      "Todos os times",
    );
    const groups = source.map((c) => ({ cycle: c, scenarios: filtered(c) }));
    const scenarios = groups.flatMap((g) => g.scenarios),
      head = $("#runMatrixHead"),
      body = $("#runMatrixRows");
    const stages = [
      ...new Set(scenarios.flatMap((s) => s.steps.map((step) => step.name))),
    ];
    const totalTeams = new Set(allScenarios.map((s) => s.team).filter(Boolean));
    $("#matrixScopeSummary").textContent =
      `${source.length} ciclo(s) · ${allScenarios.length} cenários · ${totalTeams.size} times executores${mode === "production" ? " · Produção prevista em " + date($("#matrixProductionDate").value) : mode === "all" ? " · Todas as datas de produção" : ""}`;
    const selectedDays = [...selectedProductionDates].sort();
    $("#matrixDateCaption").textContent =
      mode === "selected"
        ? "Subidas: " +
          (selectedDays.length
            ? selectedDays.map(date).join(" · ")
            : "selecione as datas acima")
        : mode === "production"
          ? "Subida: " + date($("#matrixProductionDate").value)
          : mode === "all"
            ? "Todas as datas de subida"
            : "Ciclo selecionado · " +
              date(current()?.startDate) +
              (current()?.endDate !== current()?.startDate
                ? " a " + date(current()?.endDate)
                : "");
    const header = node("tr");
    for (const title of [
      "Cenário",
      "Time executor",
      "Responsável",
      "Etapas OK",
      ...stages,
    ]) {
      const th = node("th", "", title);
      th.scope = "col";
      header.append(th);
    }
    head.replaceChildren(header);
    body.replaceChildren();
    for (const { cycle, scenarios: list } of groups) {
      if (!list.length) continue;
      const w = TestRuns.validationWindow(cycle),
        prod =
          date(cycle.startDate) +
          (cycle.endDate !== cycle.startDate
            ? " a " + date(cycle.endDate)
            : "");
      if (mode !== "current") {
        const group = node("tr", "run-matrix-group"),
          cell = node("th");
        cell.colSpan = 4 + stages.length;
        cell.scope = "rowgroup";
        cell.append(
          node("strong", "", cycle.name),
          node(
            "span",
            "",
            `PROD ${prod} · ${w.explicit ? "HO / validação" : "Janela do ciclo"} ${date(w.start)} a ${date(w.end)} · ${cycle.environment} · ${list.length} cenário(s)`,
          ),
        );
        group.append(cell);
        body.append(group);
      }
      for (const scenario of list) {
        const row = node("tr");
        row.dataset.runId = cycle.id;
        row.dataset.scenarioId = scenario.id;
        const name = node("th", "run-matrix-scenario");
        name.scope = "row";
        const button = node("button", "run-name-button", scenario.name);
        button.onclick = () => openMatrixStep(cycle, scenario);
        name.append(
          button,
          node(
            "small",
            "",
            `${scenario.front} / ${scenario.functionality || "Toda a frente"}`,
          ),
          node(
            "small",
            "run-matrix-dates",
            `${w.explicit ? "Validação" : "Janela"} ${shortDate(w.start)}–${shortDate(w.end)} · PROD ${shortDate(cycle.startDate)}${cycle.endDate !== cycle.startDate ? "–" + shortDate(cycle.endDate) : ""}`,
          ),
          badge(TestRuns.scenarioState(scenario)),
        );
        const evidence = evidenceAnchor(scenario.evidenceUrl);
        if (evidence) name.append(evidence);
        const team = node("td", "run-matrix-team", scenario.team || "Sem time");
        if (scenario.watchers?.length)
          team.append(
            node("small", "", `Compartilhado: ${scenario.watchers.join(", ")}`),
          );
        const owner = node("td", "", scenario.owner || "Não definido"),
          progressCell = node("td", "run-matrix-progress"),
          m = TestRuns.metrics([scenario]);
        progressCell.append(
          node("strong", "", percent(m.stages.percent)),
          meter(m.stages.percent),
          node("small", "", `${m.stages.ok}/${m.stages.applicable}`),
        );
        row.append(name, team, owner, progressCell);
        for (const stage of stages) {
          const step = scenario.steps.find((s) => s.name === stage),
            cell = node("td", "run-matrix-cell");
          if (!step) {
            cell.append(node("span", "run-no-stage", "—"));
            cell.title = "Etapa fora do fluxo deste cenário";
          } else {
            const b = node(
              "button",
              "run-result-cell " + step.result,
              resultLabels[step.result] || "Pendente",
            );
            b.setAttribute(
              "aria-label",
              `${scenario.name} · ${stage}: ${resultLabels[step.result] || "Pendente"}`,
            );
            b.title =
              step.reason ||
              `${stage}: ${resultLabels[step.result] || "Pendente"}`;
            b.onclick = () => openMatrixStep(cycle, scenario, step);
            cell.append(b);
          }
          row.append(cell);
        }
        body.append(row);
      }
    }
    if (!scenarios.length) {
      const row = node("tr"),
        cell = node(
          "td",
          "empty",
          "Nenhum cenário neste recorte. Confira a data de produção e os filtros.",
        );
      cell.colSpan = 4;
      row.append(cell);
      body.append(row);
    }
    $("#matrixCount").textContent =
      `${scenarios.length} de ${allScenarios.length} cenários · ${stages.length} etapas distintas`;
    renderMatrixSchedule(source);
  }
  function renderMatrixSchedule(source) {
    const box = $("#matrixSchedule");
    box.replaceChildren();
    if (!source.length) {
      box.append(node("p", "empty", "Nenhum ciclo neste recorte."));
      return;
    }
    const periods = source.map((c) => ({
      cycle: c,
      w: TestRuns.validationWindow(c),
    }));
    const start = periods
      .flatMap(({ cycle, w }) => [w.start, cycle.startDate])
      .filter(Boolean)
      .sort()[0];
    const end = periods
      .flatMap(({ cycle, w }) => [w.end, cycle.endDate])
      .filter(Boolean)
      .sort()
      .at(-1);
    const first = utcDay(start),
      last = utcDay(end),
      total = last - first + 1,
      bucket = total <= 12 ? 1 : Math.ceil(total / 12),
      columns = Math.ceil(total / bucket);
    const grid = node("div", "matrix-schedule-grid");
    grid.style.setProperty("--schedule-columns", columns);
    grid.style.minWidth = 235 + columns * 64 + "px";
    const header = node("div", "matrix-schedule-header");
    header.append(
      node("div", "matrix-schedule-name", "Ciclo e times executores"),
    );
    const days = node("div", "matrix-schedule-days");
    for (let i = 0; i < columns; i++) {
      const from = first + i * bucket,
        to = Math.min(last, from + bucket - 1);
      days.append(
        node(
          "span",
          "",
          shortDate(isoDay(from)) +
            (bucket > 1 ? "–" + shortDate(isoDay(to)) : ""),
        ),
      );
    }
    header.append(days);
    grid.append(header);
    for (const { cycle, w } of periods) {
      const row = node("div", "matrix-schedule-row"),
        name = node("div", "matrix-schedule-name"),
        teams = [
          ...new Set(cycle.scenarios.map((s) => s.team).filter(Boolean)),
        ];
      name.append(
        node("strong", "", cycle.name),
        node("small", "", teams.join(" · ")),
      );
      const track = node("div", "matrix-schedule-track");
      const validation = node(
        "span",
        "matrix-validation-bar",
        `${cycle.environment} ${shortDate(w.start)}–${shortDate(w.end)}`,
      );
      validation.style.left = ((utcDay(w.start) - first) / total) * 100 + "%";
      validation.style.width =
        ((utcDay(w.end) - utcDay(w.start) + 1) / total) * 100 + "%";
      validation.title = `${w.explicit ? "Validação prevista" : "Janela de referência; validação não informada"}: ${date(w.start)} a ${date(w.end)}`;
      const production = node(
        "span",
        "matrix-production-bar",
        `PROD ${shortDate(cycle.startDate)}${cycle.startDate !== cycle.endDate ? "–" + shortDate(cycle.endDate) : ""}`,
      );
      production.style.left =
        ((utcDay(cycle.startDate) - first) / total) * 100 + "%";
      production.style.width =
        ((utcDay(cycle.endDate) - utcDay(cycle.startDate) + 1) / total) * 100 +
        "%";
      production.title = `Implantação prevista: ${date(cycle.startDate)} a ${date(cycle.endDate)}`;
      track.append(validation, production);
      row.append(name, track);
      grid.append(row);
    }
    box.append(grid);
    box.append(
      node(
        "p",
        "matrix-schedule-note",
        "Azul: período previsto de validação · Verde: janela prevista de produção. As datas organizam as mesmas execuções, sem copiar resultados.",
      ),
    );
  }
  function utcDay(value) {
    return Date.parse(value + "T00:00:00Z") / 86400000;
  }
  function isoDay(day) {
    return new Date(day * 86400000).toISOString().slice(0, 10);
  }
  function shortDate(value) {
    return value.slice(8, 10) + "/" + value.slice(5, 7);
  }
  function defaultPeriod() {
    const w = current() ? TestRuns.validationWindow(current()) : null;
    const today = new Date().toLocaleDateString("en-CA");
    $("#runPeriodStart").value = w?.start || today;
    $("#runPeriodEnd").value = w?.end || today;
  }
  function renderAgenda() {
    const start = $("#runPeriodStart").value,
      end = $("#runPeriodEnd").value,
      environment = $("#runPeriodEnvironment").value;
    const error = $("#runPeriodError");
    error.hidden = true;
    if (start && end && start > end) {
      error.textContent = "A data inicial deve ser anterior ou igual à final.";
      error.hidden = false;
      $("#runAgendaGrid").replaceChildren(
        node("div", "empty", "Corrija o período para consultar a agenda."),
      );
      $("#agendaSummary").textContent = "";
      $("#agendaPeriodNote").textContent = "";
      return false;
    }
    const matches = TestRuns.overlappingCycles(cycles, start, end, environment),
      rows = [];
    for (const cycle of matches) {
      for (const team of TestRuns.teamSummary(cycle.scenarios))
        rows.push({ cycle, team });
    }
    rows.sort(
      (a, b) =>
        a.team.team.localeCompare(b.team.team, "pt-BR") ||
        TestRuns.validationWindow(a.cycle).start.localeCompare(
          TestRuns.validationWindow(b.cycle).start,
        ),
    );
    const allWindows = matches.map((c) => TestRuns.validationWindow(c));
    const visibleStart = start || allWindows.map((w) => w.start).sort()[0],
      visibleEnd =
        end ||
        allWindows
          .map((w) => w.end)
          .sort()
          .at(-1);
    $("#agendaSummary").textContent =
      `${matches.length} ciclo(s) · ${new Set(rows.map((r) => r.team.team)).size} times executores${visibleStart && visibleEnd ? " · " + date(visibleStart) + " a " + date(visibleEnd) : ""}${environment ? " · " + environment : ""}`;
    const legacy = allWindows.filter((w) => !w.explicit).length;
    $("#agendaPeriodNote").textContent = legacy
      ? `${legacy} ciclo(s) sem período de validação informado: a agenda usa a janela prevista do ciclo como referência. Não representa datas confirmadas de homologação.`
      : "Períodos de validação previstos nos ciclos. Times acompanhantes aparecem na planilha; a agenda agrupa os times executores.";
    const wrap = $("#runAgendaGrid");
    wrap.replaceChildren();
    if (!rows.length) {
      wrap.append(
        node(
          "div",
          "empty",
          "Nenhum time com ciclos neste período. Ajuste as datas ou o ambiente.",
        ),
      );
      return true;
    }
    const first = utcDay(visibleStart),
      last = utcDay(visibleEnd),
      total = last - first + 1;
    const bucket = total <= 14 ? 1 : Math.ceil(total / 14),
      columns = Math.ceil(total / bucket);
    const grid = node("div", "run-agenda-grid");
    grid.style.setProperty("--agenda-columns", columns);
    grid.style.minWidth = 240 + columns * 72 + "px";
    const header = node("div", "run-agenda-header");
    header.append(node("div", "run-agenda-axis", "Time / ciclo"));
    const days = node("div", "run-agenda-days");
    for (let i = 0; i < columns; i++) {
      const from = first + i * bucket,
        to = Math.min(last, from + bucket - 1),
        d = node("div", "run-agenda-day");
      const active = new Set();
      for (const { cycle, team } of rows) {
        const w = TestRuns.validationWindow(cycle);
        if (utcDay(w.start) <= to && utcDay(w.end) >= from)
          active.add(team.team);
      }
      d.append(
        node(
          "strong",
          "",
          bucket === 1
            ? shortDate(isoDay(from))
            : shortDate(isoDay(from)) + "–" + shortDate(isoDay(to)),
        ),
        node("small", "", `${active.size} time(s)`),
      );
      days.append(d);
    }
    header.append(days);
    grid.append(header);
    for (const { cycle, team } of rows) {
      const row = node("div", "run-agenda-row"),
        axis = node("div", "run-agenda-axis");
      axis.append(node("strong", "", team.team), node("small", "", cycle.name));
      const track = node("div", "run-agenda-track");
      track.style.setProperty("--agenda-columns", columns);
      const w = TestRuns.validationWindow(cycle),
        left = Math.max(first, utcDay(w.start)),
        right = Math.min(last, utcDay(w.end));
      const state = team.failed
        ? "failed"
        : team.remaining
          ? "running"
          : team.done
            ? "done"
            : "dispensed";
      const bar = node(
        "button",
        "run-agenda-bar " + state,
        `${shortDate(w.start)}–${shortDate(w.end)} · ${percent(team.percent)}`,
      );
      bar.style.left = ((left - first) / total) * 100 + "%";
      bar.style.width = ((right - left + 1) / total) * 100 + "%";
      bar.title = `${team.team} · ${cycle.name} · ${date(w.start)} a ${date(w.end)} · ${team.done}/${team.total} concluídos${!w.explicit ? " · Janela do ciclo; HO não informada" : ""}`;
      bar.setAttribute(
        "aria-label",
        "Abrir planilha de " + cycle.name + " para " + team.team,
      );
      bar.onclick = () => {
        cycleId = cycle.id;
        clearFilters();
        render();
        $("#runTeam").value = team.team;
        setView("matrix");
      };
      track.append(bar);
      row.append(axis, track);
      grid.append(row);
    }
    wrap.append(grid);
    return true;
  }
  return { renderMatrix, renderAgenda, defaultPeriod, matrixCycles };
})();
