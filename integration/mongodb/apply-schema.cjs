// Bootstrap explícito para usar pelo backend/driver existente. Não abre conexão.
const specification = require("./collections.json");
async function applyDeliverySchema(
  db,
  { applyExistingValidators = false } = {},
) {
  if (!db || typeof db.listCollections !== "function")
    throw new TypeError(
      "Informe um Db do driver MongoDB do sistema hospedeiro.",
    );
  const existing = new Set(
    (await db.listCollections({}, { nameOnly: true }).toArray()).map(
      (c) => c.name,
    ),
  );
  const report = [];
  for (const [name, definition] of Object.entries(specification.collections)) {
    const { indexes, ...options } = definition;
    if (!existing.has(name)) await db.createCollection(name, options);
    else if (applyExistingValidators)
      await db.command({ collMod: name, ...options });
    for (const index of indexes) {
      const { key, ...indexOptions } = index;
      await db.collection(name).createIndex(key, indexOptions);
    }
    report.push({
      name,
      created: !existing.has(name),
      validatorApplied: !existing.has(name) || applyExistingValidators,
    });
  }
  return report;
}
module.exports = { applyDeliverySchema, specification };
