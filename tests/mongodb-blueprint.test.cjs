const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const {
  applyDeliverySchema,
  specification,
} = require("../integration/mongodb/apply-schema.cjs");
function fakeDB(names = []) {
  const existing = new Set(names),
    calls = [];
  return {
    calls,
    listCollections: () => ({
      toArray: async () => [...existing].map((name) => ({ name })),
    }),
    createCollection: async (name, opts) => {
      calls.push(["create", name, opts]);
      existing.add(name);
    },
    command: async (command) => calls.push(["command", command]),
    collection: (name) => ({
      createIndex: async (key, options) =>
        calls.push(["index", name, key, options]),
    }),
  };
}
test("blueprint tem escopo, revisão e índices exclusivos para vínculos ativos e histórico", () => {
  for (const [name, c] of Object.entries(specification.collections)) {
    assert(name.startsWith("delivery_"));
    assert(c.validator.$jsonSchema.required.includes("workspaceId"));
    assert(c.validator.$jsonSchema.required.includes("version"));
    for (const index of c.indexes)
      assert.equal(Object.keys(index.key)[0], "workspaceId");
  }
  assert(
    specification.collections.delivery_feature_locks.indexes.some(
      (i) => i.unique && i.key.featureId === 1,
    ),
  );
  assert.equal(
    specification.collections.delivery_changes.validator.$jsonSchema.properties
      .production.properties.executions.maxItems,
    200,
  );
  assert(
    !(
      "historico" in
      specification.collections.delivery_changes.validator.$jsonSchema
        .properties
    ),
  );
});
test("bootstrap repetido preserva validators existentes e não recria coleções", async () => {
  const db = fakeDB();
  const initial = await applyDeliverySchema(db);
  assert(initial.every((r) => r.created));
  db.calls.length = 0;
  const repeated = await applyDeliverySchema(db);
  assert(repeated.every((r) => !r.created && !r.validatorApplied));
  assert(db.calls.every(([type]) => type === "index"));
});
test("validators de coleções existentes só mudam com opção explícita", async () => {
  const db = fakeDB(Object.keys(specification.collections));
  await applyDeliverySchema(db, { applyExistingValidators: true });
  assert.equal(
    db.calls.filter(([type]) => type === "command").length,
    Object.keys(specification.collections).length,
  );
});
test("plano aponta tarefas existentes e contratos protegem alterações concorrentes", () => {
  const root = path.join(__dirname, ".."),
    plan = JSON.parse(
      fs.readFileSync(path.join(root, "integration/implementation-plan.json")),
    ),
    api = JSON.parse(
      fs.readFileSync(path.join(root, "integration/contracts/api.json")),
    );
  for (const phase of plan.phases) {
    assert(
      fs.existsSync(path.join(root, "integration/tasks", phase.id + ".md")),
    );
    assert.equal(phase.status, "pending");
  }
  assert.equal(
    new Set(api.operations.map((o) => o.id)).size,
    api.operations.length,
  );
  for (const op of api.operations)
    if (op.requiresExpectedVersion) assert(op.requiresIdempotencyKey);
  assert(
    api.operations
      .find((o) => o.id === "approveChange")
      .roles.includes("MANAGER"),
  );
});
