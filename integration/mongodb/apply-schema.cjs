// Bootstrap explícito para usar pelo backend/driver existente. Não abre conexão.
const specification = require("./collections.json");
async function applyDeliverySchema(
  db,
  {
    applyExistingValidators = false,
    collections = Object.keys(specification.collections),
  } = {},
) {
  if (
    !Array.isArray(collections) ||
    !collections.length ||
    new Set(collections).size !== collections.length ||
    collections.some((name) => !Object.hasOwn(specification.collections, name))
  )
    throw new TypeError(
      "Informe uma lista de collections conhecidas, sem repetições.",
    );
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
  // Verificar todas as collections antes de alterar qualquer validator.
  // O operador $nor identifica documentos que o novo validator rejeitaria.
  if (applyExistingValidators) {
    for (const name of collections) {
      if (!existing.has(name)) continue;
      const invalid = await db.collection(name).countDocuments({
        $nor: [specification.collections[name].validator],
      });
      if (invalid)
        throw new Error(
          `Migration bloqueada: ${name} contém ${invalid} documento(s) incompatível(is). Execute e valide o backfill antes de aplicar o validator.`,
        );
    }
  }
  for (const name of collections) {
    const definition = specification.collections[name];
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
