// Flags locais do protótipo. Na integração, as mesmas decisões devem existir no backend.
(() => {
  const key = "issueflow.modules.v1",
    profileKey = "issueflow.release.profile.v1",
    profile = "tests-first-v1",
    defaults = {
      delivery: false,
      quality: true,
      homologation: false,
      gmud: false,
      approval: false,
      production: false,
      planning: false,
    };
  const dependencies = {
    delivery: [],
    quality: [],
    homologation: ["delivery", "quality"],
    gmud: ["homologation"],
    approval: ["gmud"],
    production: ["approval"],
    planning: ["delivery"],
  };
  const routes = {
    "index.html": "delivery",
    "testes.html": "quality",
    "fluxos.html": "quality",
    "acompanhamento-testes.html": "quality",
    "homologacao.html": "homologation",
    "validacao-ho.html": "homologation",
    "changes.html": "gmud",
    "gmud-timeline.html": "approval",
    "producao.html": "production",
    "timeline.html": "planning",
  };
  function read() {
    try {
      // Configurações antigas não liberam módulos de outra release implicitamente.
      if (localStorage.getItem(profileKey) !== profile) return { ...defaults };
      const data = JSON.parse(localStorage.getItem(key));
      const flags = {
        ...defaults,
        ...Object.fromEntries(
          Object.entries(data || {}).filter(
            ([k, v]) => k in defaults && typeof v === "boolean",
          ),
        ),
      };
      for (const name of Object.keys(flags))
        if (!enabled(name, flags)) flags[name] = false;
      return flags;
    } catch {
      return { ...defaults };
    }
  }
  function enabled(name, flags = read()) {
    return (
      flags[name] === true &&
      (dependencies[name] || []).every((d) => enabled(d, flags))
    );
  }
  function save(flags) {
    for (const [name, value] of Object.entries(flags)) {
      if (!(name in defaults) || typeof value !== "boolean")
        throw Error("Configuração de módulo inválida.");
    }
    const next = { ...defaults, ...flags };
    for (const name of Object.keys(next))
      if (next[name] && !enabled(name, next))
        throw Error(
          "Ative as dependências do módulo " +
            name +
            " ou desative seus dependentes.",
        );
    localStorage.setItem(key, JSON.stringify(next));
    localStorage.setItem(profileKey, profile);
    window.dispatchEvent(new Event("delivery-modules-changed"));
  }
  window.DeliveryModules = {
    storageKey: key,
    profileKey,
    profile,
    read,
    isEnabled: enabled,
    save,
    routes,
    dependencies,
    defaultRoute: () => (enabled("delivery") ? "index.html" : "testes.html"),
  };
  function apply() {
    const main = document.querySelector("main"),
      current = location.pathname.split("/").pop() || "index.html",
      module = routes[current];
    if (main && module) {
      const blocked = !enabled(module);
      if (blocked && current === "index.html" && enabled("quality")) {
        location.replace("testes.html");
        return;
      }
      main.hidden = blocked;
      main.inert = blocked;
      let notice = document.querySelector("#moduleUnavailable");
      if (blocked && !notice) {
        notice = document.createElement("section");
        notice.id = "moduleUnavailable";
        notice.className = "module-unavailable";
        const title = document.createElement("h1");
        title.textContent = "Módulo desativado";
        const text = document.createElement("p");
        text.textContent =
          "Esta parte do fluxo ainda não está habilitada. Seus registros foram preservados.";
        const link = document.createElement("a");
        link.href = "configuracoes.html";
        link.className = "secondary";
        link.textContent = "Configurar módulos";
        notice.append(title, text, link);
        main.before(notice);
      }
      if (notice) notice.hidden = !blocked;
      if (blocked)
        for (const dialog of document.querySelectorAll("dialog[open]"))
          dialog.close();
    }
    for (const el of document.querySelectorAll("[data-delivery-module]"))
      el.hidden = !enabled(el.dataset.deliveryModule);
  }
  document.addEventListener("DOMContentLoaded", apply);
  window.addEventListener("delivery-modules-changed", apply);
  window.addEventListener("storage", (e) => {
    if (e.key === key) {
      apply();
      window.dispatchEvent(new Event("delivery-modules-changed"));
    }
  });
  document.addEventListener(
    "click",
    (e) => {
      const a = e.target.closest("a");
      if (!a) return;
      const target = new URL(a.href, location.href);
      if (target.origin !== location.origin) return;
      const module = routes[target.pathname.split("/").pop()];
      if (module && !enabled(module)) {
        e.preventDefault();
        location.href = "configuracoes.html?disabled=" + module;
      }
    },
    true,
  );
})();
