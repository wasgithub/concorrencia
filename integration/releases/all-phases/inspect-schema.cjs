// Preflight somente leitura. Recebe a conexão existente, nunca abre conexão.
const { specification } = require("../../mongodb/apply-schema.cjs");
const { manifest } = require("./apply-schema.cjs");
const canonical = (value) =>
  JSON.stringify(value, (_, item) => {
    if (item && typeof item === "object" && !Array.isArray(item))
      return Object.fromEntries(
        Object.entries(item).sort(([a], [b]) => a.localeCompare(b)),
      );
    return item;
  });
async function inspectPhaseSchema(
  db,
  phaseId,
  { includeStandaloneSettings = false } = {},
) {
  const phase = manifest.phases.find((p) => p.id === phaseId);
  if (!phase) throw new TypeError("Fase desconhecida.");
  const existing = new Map(
    (await db.listCollections({}, {}).toArray()).map((c) => [c.name, c]),
  );
  const names = [
    ...phase.collections,
    ...(includeStandaloneSettings
      ? manifest.optionalInfrastructureCollections
      : []),
  ];
  const collections = [];
  for (const name of names) {
    const definition = specification.collections[name];
    if (!existing.has(name)) {
      collections.push({
        name,
        exists: false,
        invalidDocuments: 0,
        duplicateIndexes: [],
        indexConflicts: [],
        validatorDiffers: false,
      });
      continue;
    }
    const collection = db.collection(name),
      duplicateIndexes = [],
      indexConflicts = [];
    const indexes = await collection.indexes();
    for (const expected of definition.indexes) {
      const current = indexes.find((i) => i.name === expected.name);
      if (
        current &&
        (JSON.stringify(current.key) !== JSON.stringify(expected.key) ||
          !!current.unique !== !!expected.unique ||
          !!current.sparse !== !!expected.sparse ||
          current.expireAfterSeconds !== expected.expireAfterSeconds ||
          canonical(current.collation || {}) !==
            canonical(expected.collation || {}) ||
          canonical(current.partialFilterExpression || {}) !==
            canonical(expected.partialFilterExpression || {}))
      )
        indexConflicts.push(expected.name);
      if (!expected.unique) continue;
      const groups = await collection
        .aggregate([
          { $match: expected.partialFilterExpression || {} },
          {
            $group: {
              _id: Object.fromEntries(
                Object.keys(expected.key).map((field, i) => [
                  "key" + i,
                  { $ifNull: ["$" + field, null] },
                ]),
              ),
              count: { $sum: 1 },
            },
          },
          { $match: { count: { $gt: 1 } } },
          { $limit: 20 },
        ])
        .toArray();
      if (groups.length)
        duplicateIndexes.push({ index: expected.name, groups, limitedTo: 20 });
    }
    collections.push({
      name,
      exists: true,
      invalidDocuments: await collection.countDocuments({
        $nor: [definition.validator],
      }),
      validatorDiffers:
        canonical(existing.get(name).options?.validator || {}) !==
        canonical(definition.validator),
      duplicateIndexes,
      indexConflicts,
    });
  }
  return {
    phaseId,
    readOnly: true,
    canApply: collections.every(
      (c) =>
        !c.invalidDocuments &&
        !c.duplicateIndexes.length &&
        !c.indexConflicts.length,
    ),
    requiresValidatorReview: collections.some((c) => c.validatorDiffers),
    collections,
    note: "Diferença de validator exige revisão/backfill e applyExistingValidators explícito. Não remove índices nem corrige dados. Arrays em chaves únicas exigem revisão quando dados legados forem incompatíveis.",
  };
}
module.exports = { inspectPhaseSchema };
