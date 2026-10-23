// Regras de aprovação da subida e revisão da homologação.
function productionPrerequisites(change) {
  const plans = hoPlans(),
    problems = [];
  for (const id of change.issueIds || []) {
    const plan = plans[id];
    if (!plan?.aceite || !hoComplete(plan))
      problems.push(`Issue ${id}: homologação sem aceite válido.`);
  }
  if (!(change.cenarios || []).length)
    problems.push("Selecione pelo menos um cenário de produção.");
  for (const sc of change.cenarios || []) {
    if (sc.sourceExecutionId) {
      const plan = plans[sc.sourceIssueId],
        origin = plan?.cenarios?.find((s) => s.id === sc.sourceExecutionId);
      if (
        !(change.issueIds || []).includes(sc.sourceIssueId) ||
        !origin ||
        execStatus(origin) !== "OK" ||
        !executionScopeValid(origin) ||
        !executionScopeValid(sc) ||
        scenarioDefinitionSignature(origin) !== scenarioDefinitionSignature(sc)
      )
        problems.push(
          `Cenário ${sc.nome}: origem de HO alterada. Remova e selecione novamente.`,
        );
    } else if (!sc.validadoHO)
      problems.push(
        `Cenário ${sc.nome}: confirme a validação em HO ou selecione da homologação.`,
      );
  }
  return problems;
}
function productionHORevision(change) {
  const plans = hoPlans();
  return JSON.stringify(
    (change.issueIds || []).map((id) => [
      id,
      plans[id]?.aceite,
      plans[id]?.cenarios,
    ]),
  );
}
