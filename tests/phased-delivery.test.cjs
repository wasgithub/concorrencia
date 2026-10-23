const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  vm = require("node:vm"),
  path = require("node:path");
const {
  applyPhaseSchema,
  manifest,
} = require("../integration/releases/all-phases/apply-schema.cjs");
const {
  applyDeliverySchema,
  specification,
} = require("../integration/mongodb/apply-schema.cjs");
const {
  inspectPhaseSchema,
} = require("../integration/releases/all-phases/inspect-schema.cjs");
test("inspeção somente leitura relata duplicatas, conflito de índice e validator divergente", async () => {
  const db = {
    listCollections: () => ({
      toArray: async () => [{ name: "delivery_features", options: {} }],
    }),
    collection: () => ({
      indexes: async () => [
        {
          name: "feature_external_unique",
          key: { workspaceId: 1, externalId: 1 },
          unique: false,
        },
      ],
      aggregate: () => ({
        toArray: async () => [
          { _id: { key0: "workspace", key1: "DUP" }, count: 2 },
        ],
      }),
      countDocuments: async () => 0,
    }),
  };
  const result = await inspectPhaseSchema(db, "01-features");
  assert.equal(result.readOnly, true);
  assert.equal(result.canApply, false);
  assert.equal(result.requiresValidatorReview, true);
  const feature = result.collections.find(
    (c) => c.name === "delivery_features",
  );
  assert(feature.duplicateIndexes.length);
  assert(feature.indexConflicts.includes("feature_external_unique"));
});
test("cada fase habilita somente as capacidades explícitas e suas dependências", () => {
  for (const phase of manifest.phases) {
    const ctx = vm.createContext({
      localStorage: {
        getItem: (k) =>
          k === "issueflow.release.profile.v1"
            ? "tests-first-v1"
            : JSON.stringify(phase.flags),
      },
      document: { addEventListener() {} },
      Event: class {},
    });
    vm.runInContext(
      "window=globalThis;addEventListener=()=>{};dispatchEvent=()=>{}",
      ctx,
    );
    vm.runInContext(
      fs.readFileSync(
        path.join(__dirname, "../shared/config/modules.js"),
        "utf8",
      ),
      ctx,
    );
    for (const [flag, expected] of Object.entries(phase.flags))
      assert.equal(
        vm.runInContext(`DeliveryModules.isEnabled('${flag}')`, ctx),
        expected,
        phase.id + ":" + flag,
      );
  }
  const features = manifest.phases.find((p) => p.id === "01-features");
  assert.equal(features.flags.homologation, false);
  assert.equal(
    manifest.phases.find((p) => p.id === "04-changes").flags.approval,
    false,
  );
});
test("migrations cumulativas por fase preservam collections e rejeitam fase desconhecida", async () => {
  const names = new Set(),
    writes = [];
  const db = {
    listCollections: () => ({
      toArray: async () => [...names].map((name) => ({ name })),
    }),
    createCollection: async (name) => {
      names.add(name);
      writes.push(name);
    },
    collection: () => ({ createIndex: async () => {} }),
  };
  for (const phase of manifest.phases) {
    writes.length = 0;
    await applyPhaseSchema(db, phase.id);
    assert.deepEqual(writes, phase.newCollections);
    assert.deepEqual([...names], phase.rolloutCollections);
    for (const dependency of phase.dependsOn)
      assert(
        manifest.phases.findIndex((p) => p.id === dependency) <
          manifest.phases.indexOf(phase),
      );
  }
  await assert.rejects(applyPhaseSchema(db, "inexistente"), /desconhecida/);
  assert(!names.has("delivery_module_settings"));
});
test("planejamento opcional não cria collections de qualidade, HO ou GMUD", async () => {
  const names = [];
  const db = {
    listCollections: () => ({ toArray: async () => [] }),
    createCollection: async (name) => names.push(name),
    collection: () => ({ createIndex: async () => {} }),
  };
  await applyPhaseSchema(db, "06-calendars");
  assert(names.includes("delivery_features"));
  for (const name of [
    "delivery_ho_plans",
    "delivery_changes",
    "delivery_scenarios",
    "delivery_feature_locks",
  ])
    assert(!names.includes(name));
});
test("preflight impede collMod antes de backfill e antes de qualquer escrita", async () => {
  const writes = [];
  const db = {
    listCollections: () => ({
      toArray: async () => [{ name: "delivery_features" }],
    }),
    collection: () => ({
      countDocuments: async () => 3,
      createIndex: async () => writes.push("index"),
    }),
    command: async () => writes.push("collMod"),
    createCollection: async () => writes.push("create"),
  };
  await assert.rejects(
    applyDeliverySchema(db, {
      collections: ["delivery_features"],
      applyExistingValidators: true,
    }),
    /3 documento/,
  );
  assert.deepEqual(writes, []);
});
test("campos de todas as fases e origem de PROD têm contratos estruturais", () => {
  const ho =
    specification.collections.delivery_ho_plans.validator.$jsonSchema
      .properties;
  const change =
    specification.collections.delivery_changes.validator.$jsonSchema;
  assert(change.required.includes("preparationRevision"));
  assert(change.properties.production.required.includes("revision"));
  assert(
    change.properties.production.properties.executions.items.required.includes(
      "source",
    ),
  );
  for (const execution of [
    ho.executions.items,
    change.properties.production.properties.executions.items,
  ]) {
    assert(execution.properties.coverage);
    assert(execution.properties.orderReference);
    assert(
      execution.properties.steps.items.anyOf.some((branch) =>
        branch.required?.includes("failureReason"),
      ),
    );
  }
  for (const name of [
    "delivery_features",
    "delivery_scenarios",
    "delivery_changes",
  ])
    assert(
      specification.collections[name].indexes.some(
        (i) =>
          i.name === "legacy_origin_unique" &&
          i.unique &&
          i.partialFilterExpression,
      ),
    );
});
