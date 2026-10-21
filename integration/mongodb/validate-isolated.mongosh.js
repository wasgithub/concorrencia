// Executado somente pelo runner descartável. Não aceita URI nem conexão do hospedeiro.
async function validateIsolated() {
  if (process.env.ISSUEFLOW_ISOLATED_VALIDATION !== "1")
    throw Error("Use validate-isolated.sh.");
  if (db.hello().setName !== "issueflow_validation")
    throw Error("Replica set de validação obrigatório.");
  const fs = require("node:fs");
  const {
    applyPhaseSchema,
    manifest,
  } = require("/reference/releases/all-phases/apply-schema.cjs");
  const {
    applyDeliverySchema,
    specification,
  } = require("/reference/mongodb/apply-schema.cjs");
  const fixtures = EJSON.parse(
    fs.readFileSync("/reference/releases/all-phases/fixtures.ejson", "utf8"),
    { relaxed: false },
  );
  const target = db.getSiblingDB("issueflow_validation");
  const adapter = {
    listCollections: () => ({
      toArray: async () => target.getCollectionInfos(),
    }),
    createCollection: async (name, options) =>
      target.createCollection(name, options),
    command: async (command) => target.runCommand(command),
    collection: (name) => ({
      indexes: async () => target.getCollection(name).getIndexes(),
      aggregate: (pipeline) => ({
        toArray: async () =>
          target.getCollection(name).aggregate(pipeline).toArray(),
      }),
      createIndex: async (key, options) =>
        target.getCollection(name).createIndex(key, options),
      countDocuments: async (query) =>
        target.getCollection(name).countDocuments(query),
    }),
  };
  const results = [];
  const {
    inspectPhaseSchema,
  } = require("/reference/releases/all-phases/inspect-schema.cjs");
  const check = (condition, message) => {
    if (!condition) throw Error(message);
  };
  const clone = (value) =>
    EJSON.parse(EJSON.stringify(value), { relaxed: false });
  async function run(name, fn) {
    await fn();
    results.push({ name, status: "passed" });
    print("PASS " + name);
  }
  async function rejects(fn, code) {
    let failure;
    try {
      await fn();
    } catch (error) {
      failure = error;
    }
    check(
      failure && failure.code === code,
      `Esperado erro MongoDB ${code}, recebido ${failure?.code}: ${failure?.message}`,
    );
  }
  for (const phase of manifest.phases)
    await run("migration-" + phase.id, async () => {
      const report = await applyPhaseSchema(adapter, phase.id);
      check(
        report.filter((r) => r.created).length === phase.newCollections.length,
        "Collections inesperadas na fase",
      );
      for (const name of phase.newCollections)
        target.getCollection(name).insertMany(clone(fixtures[name]));
    });
  await run("settings-opcional", async () => {
    await applyPhaseSchema(adapter, "07-migration", {
      includeStandaloneSettings: true,
    });
    target.delivery_module_settings.insertMany(
      clone(fixtures.delivery_module_settings),
    );
  });
  await run("repeticao-migration-preserva-documentos", async () => {
    const counts = Object.fromEntries(
      Object.keys(specification.collections).map((n) => [
        n,
        target.getCollection(n).countDocuments({}),
      ]),
    );
    const report = await applyPhaseSchema(adapter, "07-migration", {
      includeStandaloneSettings: true,
      applyExistingValidators: true,
    });
    check(
      report.every((r) => !r.created),
      "Recriou collection existente",
    );
    for (const [name, count] of Object.entries(counts))
      check(
        target.getCollection(name).countDocuments({}) === count,
        "Migration alterou registros",
      );
  });
  await run("inspector-na-instancia-real", async () => {
    const report = await inspectPhaseSchema(adapter, "07-migration", {
      includeStandaloneSettings: true,
    });
    check(
      report.canApply,
      "Preflight encontrou incompatibilidade nas fixtures",
    );
  });
  await run("campos-obrigatorios-todas-collections", async () => {
    for (const name of Object.keys(specification.collections)) {
      const invalid = clone(fixtures[name][0]);
      invalid._id = new ObjectId();
      delete invalid.workspaceId;
      await rejects(() => target.getCollection(name).insertOne(invalid), 121);
    }
  });
  await run("falha-HO-exige-motivo", async () => {
    const ho = clone(fixtures.delivery_ho_plans[0]);
    ho.state = "testing";
    delete ho.acceptance;
    ho.executions[0].steps[0].result = "failed";
    await rejects(
      () => target.delivery_ho_plans.replaceOne({ _id: ho._id }, ho),
      121,
    );
    ho.executions[0].steps[0].failureReason = "Falha controlada";
    target.delivery_ho_plans.replaceOne({ _id: ho._id }, ho);
    target.delivery_ho_plans.replaceOne(
      { _id: ho._id },
      clone(fixtures.delivery_ho_plans[0]),
    );
  });
  await run("PROD-exige-origem-HO", async () => {
    const change = clone(fixtures.delivery_changes[0]);
    delete change.production.executions[0].source;
    await rejects(
      () => target.delivery_changes.replaceOne({ _id: change._id }, change),
      121,
    );
  });
  await run("aceite-vazio-e-status-sem-provas-rejeitados", async () => {
    const ho = clone(fixtures.delivery_ho_plans[0]);
    ho.executions = [];
    await rejects(
      () => target.delivery_ho_plans.replaceOne({ _id: ho._id }, ho),
      121,
    );
    for (const status of ["approved", "deployed", "closed", "rollback"]) {
      const change = clone(fixtures.delivery_changes[0]);
      change.status = status;
      await rejects(
        () => target.delivery_changes.replaceOne({ _id: change._id }, change),
        121,
      );
    }
  });
  await run("unicidade-por-workspace-e-lock-ativo", async () => {
    const feature = clone(fixtures.delivery_features[0]);
    feature._id = new ObjectId();
    await rejects(() => target.delivery_features.insertOne(feature), 11000);
    feature.workspaceId = "outro-workspace";
    delete feature.activeChangeId;
    target.delivery_features.insertOne(feature);
    const lock = clone(fixtures.delivery_feature_locks[0]);
    lock._id = new ObjectId();
    lock.changeId = new ObjectId();
    await rejects(() => target.delivery_feature_locks.insertOne(lock), 11000);
    const command = clone(fixtures.delivery_commands[0]);
    command._id = new ObjectId();
    await rejects(() => target.delivery_commands.insertOne(command), 11000);
  });
  await run("CAS-nao-sobrescreve-versao-antiga", async () => {
    const id = fixtures.delivery_features[0]._id;
    check(
      target.delivery_features.updateOne(
        {
          _id: id,
          workspaceId: "workspace-do-hospedeiro",
          version: NumberInt(0),
        },
        { $inc: { version: NumberInt(1) } },
      ).matchedCount === 1,
      "Primeira edição falhou",
    );
    check(
      target.delivery_features.updateOne(
        {
          _id: id,
          workspaceId: "workspace-do-hospedeiro",
          version: NumberInt(0),
        },
        { $set: { title: "sobrescrita" } },
      ).matchedCount === 0,
      "Sobrescrita concorrente foi aceita",
    );
  });
  await run("snapshot-HO-nao-muda-com-catalogo", async () => {
    const before = EJSON.stringify(
      target.delivery_ho_plans.findOne({}).executions,
    );
    target.delivery_scenarios.updateOne(
      { _id: fixtures.delivery_scenarios[0]._id },
      { $set: { name: "Catálogo alterado" } },
    );
    check(
      EJSON.stringify(target.delivery_ho_plans.findOne({}).executions) ===
        before,
      "Catálogo mudou snapshot",
    );
  });
  await run("abortar-transacao-nao-deixa-escrita-parcial", async () => {
    const session = db.getMongo().startSession();
    try {
      session.startTransaction();
      const tx = session.getDatabase("issueflow_validation"),
        feature = clone(fixtures.delivery_features[0]);
      feature._id = new ObjectId();
      feature.externalId = "TX-ABORT";
      tx.delivery_features.insertOne(feature);
      const event = clone(fixtures.delivery_audit_events[0]);
      event._id = new ObjectId();
      event.entityId = feature._id;
      tx.delivery_audit_events.insertOne(event);
      const receipt = clone(fixtures.delivery_commands[0]);
      receipt._id = new ObjectId();
      receipt.key = "tx-abort";
      tx.delivery_commands.insertOne(receipt);
      session.abortTransaction();
      check(
        target.delivery_features.countDocuments({ externalId: "TX-ABORT" }) ===
          0,
        "Feature ficou após abort",
      );
      check(
        target.delivery_audit_events.countDocuments({
          entityId: feature._id,
        }) === 0,
        "Evento ficou após abort",
      );
      check(
        target.delivery_commands.countDocuments({ key: "tx-abort" }) === 0,
        "Recibo ficou após abort",
      );
    } finally {
      session.endSession();
    }
  });
  await run("preflight-bloqueia-legado-incompativel", async () => {
    const invalid = clone(fixtures.delivery_features[0]);
    invalid._id = new ObjectId();
    invalid.externalId = "BACKFILL";
    delete invalid.teamId;
    target.delivery_features.insertOne(invalid, {
      bypassDocumentValidation: true,
    });
    let blocked = false;
    try {
      await applyDeliverySchema(adapter, {
        collections: ["delivery_features"],
        applyExistingValidators: true,
      });
    } catch (error) {
      blocked = /backfill/.test(error.message);
    }
    check(blocked, "Validator foi aplicado sem exigir backfill");
    target.delivery_features.deleteOne({ _id: invalid._id });
  });
  print(
    JSON.stringify(
      {
        status: "passed",
        mongoVersion: db.version(),
        scope:
          "validators/indexes/migrations/capacidades Mongo em instancia descartavel; nao e API ou backend integrado",
        tests: results,
      },
      null,
      2,
    ),
  );
}
validateIsolated().catch((error) => {
  console.error(error.stack || error);
  quit(1);
});
