// Planos de homologação e aceite de produto.
const hoPlansKey = "issueflow.hoplans.v1";
function hoPlans() {
  const p = readTestData(hoPlansKey, {});
  return Array.isArray(p) ? {} : p;
}
function hoComplete(plan) {
  return (
    !!plan?.cenarios?.length &&
    plan.cenarios.every(
      (s) => executionScopeValid(s) && ["OK", "N/A"].includes(execStatus(s)),
    )
  );
}

// Referências manuais: não representam sincronização nem resultado aprovado no Jira.
function jiraReference(value) {
  const text = String(value || "").trim();
  if (!text) return { ok: true, value: "", href: "" };
  if (text.length > 500)
    return {
      ok: false,
      error: "Use até 500 caracteres na referência do Jira.",
    };
  if (/^[a-z][a-z0-9_]*-\d+$/i.test(text))
    return { ok: true, value: text.toUpperCase(), href: "" };
  try {
    const url = new URL(text);
    if (
      ["https:", "http:"].includes(url.protocol) &&
      url.hostname &&
      !url.username &&
      !url.password
    )
      return { ok: true, value: url.href, href: url.href };
  } catch {}
  return {
    ok: false,
    error:
      "Informe uma chave como EAGRO-123 ou uma URL HTTP/HTTPS válida do Jira.",
  };
}
