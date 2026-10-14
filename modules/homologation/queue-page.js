const $ = (s) => document.querySelector(s);
function hoQueueNode(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}
function hoQueueState(plan) {
  if (hoComplete(plan))
    return plan.aceite
      ? { key: "accepted", label: "HO aprovada", color: "green" }
      : {
          key: "acceptance",
          label: "Aguardando aceite de produto",
          color: "blue",
        };
  return plan?.cenarios?.length
    ? {
        key: "testing",
        label: plan.cenarios.some((s) => execStatus(s) === "Falhou")
          ? "Com falha"
          : "Em validação",
        color: "orange",
      }
    : { key: "no-plan", label: "Sem plano de homologação", color: "gray" };
}
function renderHOQueue() {
  const plans = hoPlans(),
    term = $("#hoQueueSearch").value.trim().toLocaleLowerCase("pt-BR"),
    squad = $("#hoQueueSquad").value,
    status = $("#hoQueueStatus").value;
  $("#hoQueueSquad").replaceChildren(
    new Option("Todas as squads", ""),
    ...[...new Set(issues.map((i) => i.squad).filter(Boolean))]
      .sort()
      .map((s) => new Option(s, s)),
  );
  $("#hoQueueSquad").value = squad;
  for (const [id, key] of [
    ["hoNoPlan", "no-plan"],
    ["hoTesting", "testing"],
    ["hoAcceptance", "acceptance"],
    ["hoAccepted", "accepted"],
  ])
    $("#" + id).textContent = issues.filter(
      (i) => hoQueueState(plans[i.idIssue]).key === key,
    ).length;
  const list = issues
    .filter((i) => {
      const state = hoQueueState(plans[i.idIssue]);
      return (
        (!squad || i.squad === squad) &&
        (!term ||
          [i.idIssue, i.descricao, i.squad].some((v) =>
            String(v || "")
              .toLocaleLowerCase("pt-BR")
              .includes(term),
          )) &&
        (status === "all" ||
          (status === "pending"
            ? state.key !== "accepted"
            : state.key === status))
      );
    })
    .sort((a, b) =>
      (a.dataInicialHomologacao || "").localeCompare(
        b.dataInicialHomologacao || "",
      ),
    );
  const box = $("#hoQueueCards");
  box.replaceChildren();
  for (const issue of list) {
    const plan = plans[issue.idIssue],
      state = hoQueueState(plan),
      scenarios = plan?.cenarios || [],
      done = scenarios.filter((s) =>
        ["OK", "N/A"].includes(execStatus(s)),
      ).length,
      card = hoQueueNode("article", "ho-queue-card");
    card.append(
      hoQueueNode("h3", "", issue.idIssue),
      hoQueueNode("p", "", issue.descricao),
      hoQueueNode(
        "small",
        "ho-queue-meta",
        `${issue.squad || "Squad não informada"} · ${(issue.dataInicialHomologacao || "").split("-").reverse().join("/")} a ${(issue.dataFinalHomologacao || "").split("-").reverse().join("/")}`,
      ),
      hoQueueNode("span", "badge " + state.color, state.label),
      hoQueueNode(
        "small",
        "ho-queue-meta",
        `${done}/${scenarios.length} cenários concluídos`,
      ),
    );
    const track = hoQueueNode("div", "ho-queue-progress"),
      fill = hoQueueNode("span");
    fill.style.width = `${scenarios.length ? (100 * done) / scenarios.length : 0}%`;
    track.append(fill);
    card.append(track);
    const actions = hoQueueNode("div", "ho-queue-actions"),
      link = hoQueueNode(
        "a",
        "secondary",
        state.key === "accepted"
          ? "Consultar homologação"
          : state.key === "acceptance"
            ? "Registrar aceite"
            : state.key === "no-plan"
              ? "Definir plano"
              : "Validar cenários",
      );
    link.href = "homologacao.html?issue=" + encodeURIComponent(issue.idIssue);
    actions.append(link);
    card.append(actions);
    box.append(card);
  }
  $("#hoQueueEmpty").hidden = !!list.length;
}
for (const id of ["hoQueueSearch", "hoQueueSquad", "hoQueueStatus"])
  $("#" + id).addEventListener("input", renderHOQueue);
window.addEventListener("storage", (e) => {
  if (e.key === hoPlansKey || e.key === storageKey) {
    if (e.key === storageKey) location.reload();
    else renderHOQueue();
  }
});
renderHOQueue();
