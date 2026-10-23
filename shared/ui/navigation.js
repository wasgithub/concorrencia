// Composição do menu do módulo; o sistema hospedeiro pode usar apenas seus links.
function renderDeliveryNavigation() {
  const sections = [
    [
      "Entregas",
      [
        ["index.html", "▦", "Features / Issues"],
        ["timeline.html", "▥", "Calendário de homologação"],
      ],
    ],
    [
      "Qualidade",
      [
        ["testes.html", "✓", "Cenários e trilhas"],
        ["fluxos.html", "⇥", "Fluxos de testes"],
        ["acompanhamento-testes.html", "◫", "Acompanhamento de testes"],
        ["validacao-ho.html", "◉", "Validação de homologação"],
      ],
    ],
    [
      "GMUD",
      [
        ["changes.html", "⇄", "Gestão de GMUDs"],
        ["gmud-timeline.html", "▥", "Calendário de implantações"],
      ],
    ],
    ["Produção", [["producao.html", "◉", "Validação de produção"]]],
  ];
  const nav = document.querySelector(".operation-nav");
  if (!nav) return;
  const current = location.pathname.split("/").pop() || "index.html",
    active = current === "homologacao.html" ? "validacao-ho.html" : current;
  const make = (tag, cls, text) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined) el.textContent = text;
    return el;
  };
  const module = make("details", "nav-module");
  module.open = true;
  const summary = make("summary", "nav-module-toggle");
  const icon = make("span", "nav-module-icon", "▦"),
    chevron = make("span", "nav-module-chevron", "⌄");
  icon.setAttribute("aria-hidden", "true");
  chevron.setAttribute("aria-hidden", "true");
  const testsOnly =
    DeliveryModules.isEnabled("quality") &&
    !DeliveryModules.isEnabled("delivery");
  summary.append(
    icon,
    make("span", "", testsOnly ? "Testes" : "Gestão de entregas"),
    chevron,
  );
  const brand = document.querySelector("a.brand");
  if (brand) brand.href = DeliveryModules.defaultRoute();
  module.append(summary);
  const items = make("div", "nav-module-items");
  for (const [title, links] of sections) {
    const section = make("div", "nav-section");
    section.append(make("div", "nav-section-title", title));
    for (const [href, symbol, label] of links) {
      if (!DeliveryModules.isEnabled(DeliveryModules.routes[href])) continue;
      const link = make("a", "nav" + (href === active ? " active" : ""));
      link.href = href;
      if (href === active) link.setAttribute("aria-current", "page");
      const mark = make("span", "", symbol);
      mark.setAttribute("aria-hidden", "true");
      link.append(mark, make("span", "", label));
      section.append(link);
    }
    if (section.querySelector("a")) items.append(section);
  }
  module.append(items);
  const settings = make("a", "nav-settings", "Configurações");
  settings.href = "configuracoes.html";
  nav.replaceChildren(module, settings);
}
renderDeliveryNavigation();
window.addEventListener("delivery-modules-changed", renderDeliveryNavigation);
