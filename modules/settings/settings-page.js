(() => {
  const form = document.querySelector("#moduleSettings"),
    choices = document.querySelector("#moduleChoices");
  const labels = {
    delivery: "Entregas — features/issues e componentes",
    quality:
      "Testes — catálogo, trilhas, etapas e atributos (primeira release)",
    homologation: "Homologação — plano, execução por etapa e aceite de produto",
    gmud: "GMUD — preparação, checklist e plano de PROD",
    approval: "Aprovação — autorização da subida e calendário de GMUDs",
    production: "Validação de produção — subida, testes e encerramento",
    planning: "Planejamento — calendário e concorrências",
  };
  const flags = DeliveryModules.read();
  for (const [key, label] of Object.entries(labels)) {
    const row = document.createElement("label");
    row.className = "module-choice";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = key;
    input.checked = flags[key];
    row.append(input, document.createTextNode(label));
    choices.append(row);
  }
  form.onchange = (e) => {
    if (!e.target.checked) {
      let changed;
      do {
        changed = false;
        for (const name of Object.keys(labels)) {
          if (
            form.elements[name].checked &&
            DeliveryModules.dependencies[name].some(
              (d) => !form.elements[d].checked,
            )
          ) {
            form.elements[name].checked = false;
            changed = true;
          }
        }
      } while (changed);
    }
  };
  form.onsubmit = (e) => {
    e.preventDefault();
    document.querySelector("#moduleError").textContent = "";
    try {
      DeliveryModules.save(
        Object.fromEntries(
          Object.keys(labels).map((k) => [k, form.elements[k].checked]),
        ),
      );
      document.querySelector("#moduleSuccess").textContent =
        "Módulos atualizados. Registros preservados.";
    } catch (error) {
      document.querySelector("#moduleError").textContent = error.message;
    }
  };
  const quality = document.querySelector("#qualitySettings"),
    settings = qualitySettings();
  quality.elements.label.value = settings.classificationLabel;
  quality.elements.types.value = settings.types.join("\n");
  quality.onsubmit = (e) => {
    e.preventDefault();
    const label = quality.elements.label.value.trim(),
      types = quality.elements.types.value
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
    document.querySelector("#qualityError").textContent = "";
    if (
      types.some((t) => t.length > 80) ||
      !label ||
      !types.length ||
      types.length > 50 ||
      new Set(types.map((s) => s.toLocaleLowerCase())).size !== types.length
    ) {
      document.querySelector("#qualityError").textContent =
        "Informe o rótulo e até 50 classificações sem repetições.";
      return;
    }
    if (
      !saveTestData(qualitySettingsKey, { classificationLabel: label, types })
    ) {
      document.querySelector("#qualityError").textContent =
        "Não foi possível salvar a configuração.";
      return;
    }
    document.querySelector("#qualitySuccess").textContent =
      "Qualidade configurada. Cenários e execuções anteriores foram preservados.";
  };
})();
