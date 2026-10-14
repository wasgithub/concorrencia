// Planos de homologação e aceite de produto.
const hoPlansKey = "issueflow.hoplans.v1";
function hoPlans() {
  const p = readTestData(hoPlansKey, {});
  return Array.isArray(p) ? {} : p;
}
function hoComplete(plan) {
  return (
    !!plan?.cenarios?.length &&
    plan.cenarios.every((s) => ["OK", "N/A"].includes(execStatus(s)))
  );
}
