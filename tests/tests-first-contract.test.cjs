const { test } = require("node:test");
const assert = require("node:assert/strict");
const manifest = require("../integration/releases/tests-first/manifest.json");
const contract = require("../integration/releases/tests-first/api.json");
const {
  applyTestsSchema,
} = require("../integration/releases/tests-first/apply-schema.cjs");
const {
  applyDeliverySchema,
  specification,
} = require("../integration/mongodb/apply-schema.cjs");
test("migration da primeira release limita collections antes de qualquer chamada ao banco", async () => {
  const created = [],
    indexes = [];
  const db = {
    listCollections: () => ({ toArray: async () => [] }),
    createCollection: async (name) => created.push(name),
    collection: (name) => ({ createIndex: async () => indexes.push(name) }),
  };
  await applyTestsSchema(db);
  assert.deepEqual(created, manifest.collections);
  assert(indexes.every((name) => manifest.collections.includes(name)));
  for (const name of manifest.excluded) assert(!created.includes(name));
  let touched = false;
  const forbidden = {
    listCollections() {
      touched = true;
      throw Error("Não chamar");
    },
  };
  await assert.rejects(
    applyDeliverySchema(forbidden, { collections: ["unknown"] }),
    /conhecidas/,
  );
  await assert.rejects(
    applyDeliverySchema(forbidden, {
      collections: ["delivery_scenarios", "delivery_scenarios"],
    }),
    /repetições/,
  );
  assert.equal(touched, false);
});
test("contrato R1 mantém garantia separada de execução e referências com campos estáveis", () => {
  assert.equal(manifest.phaseOrder[0], "02-catalog");
  assert.equal(manifest.prototypeProfile.quality, true);
  assert.equal(
    Object.values(manifest.prototypeProfile).filter(Boolean).length,
    1,
  );
  const schema =
    specification.collections.delivery_scenarios.validator.$jsonSchema;
  assert(schema.properties.guaranteeType.enum.includes("automatic"));
  assert(schema.properties.executionMode);
  assert(schema.properties.stageDefinitionId);
  assert(schema.properties.stageDefinitionVersion);
  const definitions =
    specification.collections.delivery_definitions.validator.$jsonSchema;
  for (const kind of manifest.definitionKinds)
    assert(definitions.properties.kind.enum.includes(kind));
  assert(
    specification.collections.delivery_audit_events.validator.$jsonSchema.properties.entityType.enum.includes(
      "test_flow",
    ),
  );
  assert(
    specification.collections.delivery_trails.indexes.some(
      (i) => i.unique && i.key.nameNormalized,
    ),
  );
  const create = contract.operations.find((o) => o.id === "createScenario");
  assert(create.body.throughStepId);
  assert(create.body.guaranteeType);
  assert(!create.body.workspaceId);
  assert(!create.body.executionMode);
  for (const command of contract.operations.filter((o) => o.method !== "GET")) {
    assert(command.requiresIdempotencyKey);
    if (command.method === "PUT") assert(command.requiresExpectedVersion);
  }
});
