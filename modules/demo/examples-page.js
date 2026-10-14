const button = document.querySelector("#loadExamples"),
  status = document.querySelector("#exampleStatus"),
  links = document.querySelector("#exampleLinks");
button.onclick = async () => {
  button.disabled = true;
  status.textContent = "Carregando os exemplos…";
  try {
    const response = await fetch("modules/demo/examples.json");
    if (!response.ok) throw Error("Não foi possível ler os exemplos.");
    const data = await response.json(),
      pending = {},
      before = {};
    for (const [key, incoming] of Object.entries(data.stores)) {
      before[key] = localStorage.getItem(key);
      const fallback = key === "issueflow.records.v1" ? issues : [];
      const current = before[key]
        ? JSON.parse(before[key])
        : Array.isArray(incoming)
          ? fallback
          : {};
      if (Array.isArray(incoming)) {
        const merged = [...current];
        for (const row of incoming) {
          const duplicate = current.some((item) =>
            key === "issueflow.records.v1"
              ? item.idIssue === row.idIssue
              : key === "issueflow.changes.v1"
                ? item.rdm === row.rdm
                : item.id === row.id || item.nome === row.nome,
          );
          if (!duplicate) merged.push(row);
        }
        pending[key] = JSON.stringify(merged);
      } else pending[key] = JSON.stringify({ ...incoming, ...current });
    }
    try {
      for (const [key, value] of Object.entries(pending))
        localStorage.setItem(key, value);
    } catch (error) {
      for (const [key, value] of Object.entries(before)) {
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
      }
      throw error;
    }
    links.replaceChildren();
    const changes = JSON.parse(localStorage.getItem("issueflow.changes.v1"));
    for (const record of data.report) {
      const card = document.createElement("article");
      card.style.cssText =
        "padding:16px;border:1px solid #e4e9f1;border-radius:8px";
      const title = document.createElement("h2");
      title.textContent = record.rdm;
      const description = document.createElement("p");
      description.textContent = record.issue + " · " + record.result;
      card.append(title, description);
      const change = changes.find((c) => c.rdm === record.rdm);
      for (const [label, url] of [
        [
          "Ver homologação",
          "homologacao.html?issue=" + encodeURIComponent(record.issue),
        ],
        [
          "Ver GMUD e histórico",
          "changes.html?change=" + encodeURIComponent(change.id),
        ],
        [
          "Ver timeline",
          "timeline.html?issue=" + encodeURIComponent(record.issue),
        ],
        [
          "Timeline de GMUDs",
          "gmud-timeline.html?change=" + encodeURIComponent(change.id),
        ],
      ]) {
        const a = document.createElement("a");
        a.className = "secondary";
        a.style.cssText =
          "display:inline-block;margin:12px 8px 0 0;text-decoration:none";
        a.textContent = label;
        a.href = url;
        card.append(a);
      }
      links.append(card);
    }
    status.textContent =
      "Exemplos disponíveis. Os registros anteriores foram preservados.";
    button.textContent = "Exemplos carregados";
  } catch (error) {
    status.textContent = "Erro ao carregar: " + error.message;
    button.disabled = false;
  }
};
