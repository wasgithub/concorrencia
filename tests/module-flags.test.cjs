const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  vm = require("node:vm"),
  fs = require("node:fs"),
  path = require("node:path");
function flags(initial = {}) {
  const data = new Map(Object.entries(initial)),
    ctx = vm.createContext({
      localStorage: {
        getItem: (k) => data.get(k) ?? null,
        setItem: (k, v) => data.set(k, v),
      },
      document: { addEventListener() {} },
      Event: class {},
    });
  vm.runInContext(
    "globalThis.window=globalThis;globalThis.addEventListener=()=>{};globalThis.dispatchEvent=()=>{};",
    ctx,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "../shared/config/modules.js"),
      "utf8",
    ),
    ctx,
  );
  return (code) => vm.runInContext(code, ctx);
}
test("primeira release libera só testes e ignora flags antigas sem apagar dados", () => {
  const run = flags({
    "issueflow.modules.v1": JSON.stringify({
      delivery: true,
      quality: true,
      gmud: true,
      production: true,
      planning: true,
    }),
    "issueflow.records.v1": "registros-preservados",
  });
  assert.equal(run("DeliveryModules.isEnabled('quality')"), true);
  for (const module of [
    "delivery",
    "homologation",
    "gmud",
    "production",
    "planning",
  ])
    assert.equal(run(`DeliveryModules.isEnabled('${module}')`), false);
  assert.equal(
    run("localStorage.getItem('issueflow.records.v1')"),
    "registros-preservados",
  );
  run(
    "DeliveryModules.save({delivery:true,quality:true,homologation:true,gmud:true,approval:true,production:true,planning:true})",
  );
  assert.equal(run("DeliveryModules.isEnabled('homologation')"), true);
});
test("qualidade pode ser independente; HO, GMUD e produção exigem suas dependências", () => {
  const run = flags();
  run(
    "DeliveryModules.save({delivery:false,quality:true,gmud:false,production:false,planning:false})",
  );
  assert.equal(run("DeliveryModules.isEnabled('quality')"), true);
  assert.equal(run("DeliveryModules.isEnabled('homologation')"), false);
  assert.equal(run("DeliveryModules.isEnabled('gmud')"), false);
  assert.equal(run("DeliveryModules.isEnabled('production')"), false);
});
test("configuração incoerente é rejeitada e não habilita produção implicitamente", () => {
  const run = flags();
  assert.throws(
    () => run("DeliveryModules.save({quality:false,gmud:true})"),
    /dependências/,
  );
  run("DeliveryModules.save({gmud:false,production:false})");
  assert.equal(run("DeliveryModules.isEnabled('production')"), false);
});
