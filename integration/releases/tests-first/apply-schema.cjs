// Preparação de migration, sem conexão e sem execução automática.
const { applyDeliverySchema } = require("../../mongodb/apply-schema.cjs");
const manifest = require("./manifest.json");
function applyTestsSchema(db, { applyExistingValidators = false } = {}) {
  return applyDeliverySchema(db, {
    applyExistingValidators,
    collections: manifest.collections,
  });
}
module.exports = { applyTestsSchema };
