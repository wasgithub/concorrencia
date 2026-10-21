const $ = (s) => document.querySelector(s);
const node = (tag, cls, text) => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text !== undefined) el.textContent = text;
  return el;
};
const monthValue = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
let selectedMonth = monthValue(new Date());
function gmudState(c) {
  if (c.status === "Rollback realizado")
    return { key: "rollback", color: "red", label: "↶ Rollback realizado" };
  if (c.encerramento)
    return {
      key: "success",
      color: "green",
      label: "✓ Finalizada com sucesso",
    };
  if (c.status === "Executada")
    return c.aceiteProducao
      ? {
          key: "validated",
          color: "green",
          label: "✓ PROD validado",
          note: "Encerramento pelo TL pendente",
        }
      : {
          key: "deployed",
          color: "green",
          label: "✓ Deploy realizado",
          note: !(c.cenarios || []).length
            ? "Plano de PROD não cadastrado"
            : productionState(c).label === "Pronta para validar"
              ? "Validação de PROD pendente"
              : productionState(c).label,
        };
  if (c.status === "Aprovada")
    return {
      key: "approved",
      color: "blue",
      label: "Aprovada",
      note: "Aguardando subida",
    };
  if (c.status === "Rejeitada")
    return { key: "rejected", color: "red", label: "Rejeitada" };
  if (c.status === "Não realizada")
    return { key: "cancelled", color: "env", label: "Não realizada" };
  return { key: "approval", color: "orange", label: "Aguardando aprovação" };
}
function render() {
  const all = productionChanges(),
    team = $("#gmudTeam").value,
    teams = [...new Set(all.map((c) => c.equipe).filter(Boolean))].sort();
  $("#gmudTeam").replaceChildren(
    new Option("Todas as equipes", ""),
    ...teams.map((t) => new Option(t, t)),
  );
  $("#gmudTeam").value = team;
  const term = $("#gmudSearch").value.trim().toLocaleLowerCase("pt-BR"),
    status = $("#gmudStatus").value;
  const list = all
    .filter(
      (c) =>
        (c.dataProducao || "").slice(0, 7) === selectedMonth &&
        (!team || c.equipe === team) &&
        (!status || gmudState(c).key === status) &&
        (!term ||
          [c.id, c.rdm, c.equipe, c.smeTl, c.po, ...(c.issueIds || [])]
            .filter(Boolean)
            .some((v) => String(v).toLocaleLowerCase("pt-BR").includes(term))),
    )
    .sort((a, b) =>
      (a.dataProducao + " " + (a.horario || "")).localeCompare(
        b.dataProducao + " " + (b.horario || ""),
      ),
    );
  $("#gmudMonth").value = selectedMonth;
  $("#gmudTotal").textContent = list.length;
  $("#gmudApproval").textContent = list.filter(
    (c) => gmudState(c).key === "approval",
  ).length;
  $("#gmudValidation").textContent = list.filter(
    (c) => gmudState(c).key === "deployed",
  ).length;
  $("#gmudSuccess").textContent = list.filter(
    (c) => gmudState(c).key === "success",
  ).length;
  const [year, month] = selectedMonth.split("-").map(Number),
    days = new Date(year, month, 0).getDate(),
    grid = $("#gmudGrid");
  grid.replaceChildren();
  grid.style.setProperty("--days", days);
  const head = node("div", "gmud-grid-header");
  head.append(node("div", "gmud-label", "GMUD / EQUIPE / TL"));
  const dateHeader = node("div", "gmud-days");
  for (let day = 1; day <= days; day++) {
    const d = new Date(year, month - 1, day),
      cell = node(
        "div",
        "gmud-day" + ([0, 6].includes(d.getDay()) ? " weekend" : ""),
      );
    cell.append(
      node("small", "", d.toLocaleDateString("pt-BR", { weekday: "short" })),
      node("strong", "", String(day).padStart(2, "0")),
    );
    dateHeader.append(cell);
  }
  head.append(dateHeader);
  grid.append(head);
  for (const change of list) {
    const state = gmudState(change),
      row = node("div", "gmud-row");
    row.dataset.change = change.id;
    const label = node("div", "gmud-label");
    const link = node("a", "gmud-id", change.rdm || "GMUD sem número");
    link.href = "changes.html?change=" + encodeURIComponent(change.id);
    const issues = node(
      "small",
      "gmud-issues",
      `${(change.issueIds || []).length} issue(s)`,
    );
    issues.title = (change.issueIds || []).join(" · ");
    label.append(
      link,
      node("span", "", change.equipe || "Equipe não informada"),
      node("small", "gmud-owner", "TL: " + (change.smeTl || "Não informado")),
      issues,
    );
    row.append(label);
    const track = node("div", "gmud-track");
    for (let day = 1; day <= days; day++) {
      const cell = node(
        "div",
        "gmud-cell" +
          ([0, 6].includes(new Date(year, month - 1, day).getDay())
            ? " weekend"
            : ""),
      );
      cell.style.gridColumn = day;
      track.append(cell);
    }
    const day = Number(change.dataProducao.slice(8, 10)) - 1,
      mark = node("a", "gmud-pin " + state.color);
    mark.style.gridColumn = day + 1;
    mark.href = link.href + (state.key === "approval" ? "&action=aprovar" : "");
    mark.title = `${change.rdm} · ${change.dataProducao.split("-").reverse().join("/")} · ${state.label}`;
    mark.dataset.hint =
      state.key === "approval" ? "Abrir aprovação" : "Ver GMUD";
    mark.title += ` · ${change.inicioPrevisto || change.horario || "Horário não informado"} · ${mark.dataset.hint}`;
    mark.setAttribute("aria-label", mark.title);
    track.append(mark);
    const event = node("div", "gmud-event-wrap");
    const card = node("a", "gmud-event " + state.color);
    card.href = link.href;
    card.setAttribute("aria-label", `${change.rdm || "GMUD"}: ${state.label}`);
    card.title = `${change.rdm || "GMUD"} · ${change.equipe || ""} · TL: ${change.smeTl || "Não informado"} · ${state.label}`;
    card.append(node("strong", "", state.label));
    event.append(card);
    const time = node("small", "gmud-window");
    const deploymentDate = node(
      "time",
      "gmud-date",
      new Date(change.dataProducao + "T12:00:00")
        .toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
        .replace(".", ""),
    );
    deploymentDate.dateTime = change.dataProducao;
    const windowTime = node(
      "span",
      "gmud-hours",
      `${change.inicioPrevisto || change.horario || "Sem horário"}${change.finalPrevisto ? " – " + change.finalPrevisto : ""}`,
    );
    time.append(deploymentDate, windowTime);
    time.title = "Data e janela de implantação";
    label.insertBefore(time, link.nextSibling);
    if (state.note) {
      const note = node("a", "gmud-event-note", state.note);
      note.href =
        change.status === "Executada" && (change.cenarios || []).length
          ? "producao.html?change=" + encodeURIComponent(change.id)
          : link.href;
      event.append(note);
    }
    if (
      state.key === "deployed" &&
      DeliveryModules.isEnabled("production") &&
      (change.cenarios || []).length
    ) {
      const validate = node("a", "gmud-validate", "Validar em PROD →");
      validate.href = "producao.html?change=" + encodeURIComponent(change.id);
      event.append(validate);
    }
    if (change.status === "Executada" && (change.cenarios || []).length) {
      const completed = change.cenarios.filter((sc) =>
          ["OK", "N/A"].includes(execStatus(sc)),
        ).length,
        progress = node("div", "gmud-test-track"),
        fill = node("span");
      fill.style.width = `${(100 * completed) / change.cenarios.length}%`;
      progress.append(fill);
      progress.title = `PROD: ${completed}/${change.cenarios.length} cenários concluídos`;
      event.append(progress);
    }
    if (change.reprogramacoes) {
      const history = node(
        "a",
        "gmud-replanned",
        `↻ Reprogramada ${change.reprogramacoes}×`,
      );
      history.href = link.href;
      event.append(history);
    }
    label.append(event);
    row.append(track);
    grid.append(row);
  }
  $("#gmudEmpty").hidden = list.length > 0;
  $("#gmudCount").textContent =
    `${list.length} GMUD(s) · ${selectedMonth.split("-").reverse().join("/")}`;
}
for (const id of ["gmudSearch", "gmudTeam", "gmudStatus"])
  $("#" + id).addEventListener("input", render);
$("#gmudMonth").onchange = (e) => {
  if (e.target.value) {
    selectedMonth = e.target.value;
    render();
  }
};
function shiftMonth(offset) {
  const [year, month] = selectedMonth.split("-").map(Number);
  selectedMonth = monthValue(new Date(year, month - 1 + offset, 1));
  render();
}
$("#gmudPrevious").onclick = () => shiftMonth(-1);
$("#gmudNext").onclick = () => shiftMonth(1);
$("#gmudToday").onclick = () => {
  selectedMonth = monthValue(new Date());
  render();
};
const requested = new URLSearchParams(location.search).get("change");
if (requested) {
  const change = productionChanges().find((c) => c.id === requested);
  if (change?.dataProducao) {
    selectedMonth = change.dataProducao.slice(0, 7);
    $("#gmudSearch").value = change.rdm || change.id;
  }
}
window.addEventListener("storage", (e) => {
  if (e.key === productionChangesKey) render();
});
render();

const detailsDialog = $("#gmudDetailsDialog"),
  detailsFrame = $("#gmudDetailsFrame");
$("#gmudGrid").addEventListener("click", (event) => {
  const link = event.target.closest("a");
  if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
    return;
  const target = new URL(link.href, location.href);
  if (!target.pathname.endsWith("/changes.html")) return;
  event.preventDefault();
  target.searchParams.set("embedded", "1");
  detailsFrame.src = target.href;
  detailsDialog.showModal();
});
window.addEventListener("message", (event) => {
  if (
    event.origin === location.origin &&
    event.source === detailsFrame.contentWindow &&
    event.data?.type === "gmud-detail-close"
  )
    detailsDialog.close();
});
detailsDialog.addEventListener("close", () => {
  detailsFrame.src = "about:blank";
  render();
});
detailsDialog.addEventListener("click", (event) => {
  if (event.target === detailsDialog) {
    const bounds = detailsDialog.getBoundingClientRect();
    if (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    )
      detailsDialog.close();
  }
});
