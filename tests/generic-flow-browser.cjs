// Mesmo percurso de HO/GMUD/PROD, usando vocabulário API e passos de autenticação.
process.env.E2E_GENERIC = "1";
process.env.UPDATE_EXAMPLES = "0";
require("./full-flow-browser.cjs");
