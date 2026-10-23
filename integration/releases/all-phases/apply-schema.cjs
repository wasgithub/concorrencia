const { applyDeliverySchema } = require("../../mongodb/apply-schema.cjs");
const manifest = require("./manifest.json");
async function applyPhaseSchema(
  db,
  phaseId,
  { applyExistingValidators = false, includeStandaloneSettings = false } = {},
) {
  const phase = manifest.phases.find((p) => p.id === phaseId);
  if (!phase) throw new TypeError("Fase desconhecida.");
  return applyDeliverySchema(db, {
    applyExistingValidators,
    collections: [
      ...phase.collections,
      ...(includeStandaloneSettings
        ? manifest.optionalInfrastructureCollections
        : []),
    ],
  });
}
module.exports = { applyPhaseSchema, manifest };
