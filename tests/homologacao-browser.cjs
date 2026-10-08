// Executar com Playwright disponível: node tests/homologacao-browser.cjs
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.setDefaultTimeout(8000);
  const base=process.env.ISSUEFLOW_URL||'http://127.0.0.1:8080';
  await page.goto(base+'/homologacao.html?issue=ISS-1043');
  await page.screenshot({path:'/tmp/ho-after-empty.png',fullPage:true});
  await page.click('#openPicker');assert.equal(await page.getAttribute('#tabCatalog','aria-selected'),'true');
  await page.selectOption('[data-dimension="Tipo"]','PJ');await page.selectOption('[data-dimension="Garantia"]','Hipoteca');await page.selectOption('#hoEtapa','Desembolso');
  assert.equal(await page.locator('#hoCatalog tbody tr').count(),1);assert.match(await page.textContent('#hoCatalog'),/PJ.*Hipoteca/);
  await page.locator('#hoCatalog input[type=checkbox]').check();await page.selectOption('[data-dimension="Tipo"]','PF');
  assert.match(await page.textContent('#hoSelectedCount'),/1 cenário selecionado/);assert.equal(await page.locator('#hoCatalog tbody tr').count(),2);
  await page.screenshot({path:'/tmp/ho-dimension-filters.png'});await page.click('#cancelPicker');await page.click('#openPicker');

  await page.locator('#hoCatalog input[type=checkbox]').nth(0).check();
  await page.fill('#hoSearch','Hipoteca');assert.match(await page.textContent('#hoSelectedCount'),/1 cenário selecionado/);
  await page.locator('#hoCatalog input[type=checkbox]').nth(0).check();
  assert.match(await page.textContent('#hoSelectedCount'),/2 cenários selecionados/);
  await page.click('#tabSuggested');assert.match(await page.textContent('#hoSelectedCount'),/2 cenários selecionados/);
  await page.click('#tabCatalog');await page.screenshot({path:'/tmp/ho-after-picker.png'});
  await page.click('#addCases');assert.equal(await page.locator('#hoExecutions .ho-case').count(),2);assert.match(await page.textContent('#hoSaveState'),/não salvas/);
  await page.locator('.ho-case summary').first().click();
  await page.locator('.ho-case').first().locator('.ho-fill-ok').click();
  assert.equal(await page.locator('.ho-case').first().locator('select').evaluateAll(nodes=>nodes.every(n=>n.value==='OK')),true);
  assert.equal(await page.locator('.ho-case').first().locator('.ho-fill-ok').isDisabled(),true);
  assert.equal(await page.locator('.ho-case').nth(1).locator('select').first().inputValue(),'');
  await page.locator('.ho-case summary').nth(1).click();const second=page.locator('.ho-case').nth(1).locator('select');for(let i=0;i<await second.count();i++)await second.nth(i).selectOption('OK');
  assert.equal(await page.textContent('#hoDone'),'2');await page.click('#saveHO');await page.reload();assert.equal(await page.locator('.ho-case').count(),2);
  await page.fill('#hoApprove input','PM de teste');await page.fill('#hoApprove textarea','Homologação validada');await page.click('#hoApprove button');assert.match(await page.textContent('#hoAcceptanceBadge'),/aprovada/);
  await page.locator('.ho-case summary').first().click();await page.locator('.ho-case').first().locator('select').first().selectOption('Falhou');assert.match(await page.textContent('#hoAcceptanceBadge'),/Aguardando/);
  assert.equal(await page.locator('.ho-case').first().locator('.ho-fill-ok').isEnabled(),true);
  await page.locator('.ho-case').first().locator('.ho-fill-ok').click();assert.equal(await page.locator('.ho-case').first().locator('select').first().inputValue(),'OK');
  assert.match(await page.textContent('#hoAcceptanceBadge'),/Pronto para validar/);await page.click('#saveHO');
  // Cancelar a seleção não altera o plano; duplicados não ficam disponíveis.
  await page.click('#openPicker');assert.equal(await page.locator('#hoCatalog input:disabled').count(),2);await page.locator('#hoCatalog input:not(:disabled)').first().check();await page.click('#cancelPicker');assert.equal(await page.locator('.ho-case').count(),2);
  await page.screenshot({path:'/tmp/ho-after-plan.png',fullPage:true});
  // Cenário avulso e trilha passam pelas mesmas regras de plano.
  await page.click('#openAvulso');await page.fill('#hoAvulso input','Teste pontual');await page.selectOption('#hoAvulso select[name=alvo]','Simulação');await page.click('#hoAvulso button[type=submit]');assert.equal(await page.locator('.ho-case').count(),3);await page.click('#saveHO');
  await page.evaluate(()=>{
   const catalog=JSON.parse(localStorage.getItem('issueflow.scenariocatalog.v1'));catalog[4].componentes=['api-cartoes'];localStorage.setItem('issueflow.scenariocatalog.v1',JSON.stringify(catalog));localStorage.setItem('issueflow.testtrails.v1',JSON.stringify([{id:'smoke',nome:'Smoke cartão',casoIds:[catalog[4].id,catalog[5].id]}]));
  });await page.reload();await page.click('#openPicker');assert.equal(await page.getAttribute('#tabSuggested','aria-selected'),'true');await page.locator('#hoSuggestions input').check();await page.click('#addSuggested');assert.equal(await page.locator('.ho-case').count(),4);
  await page.click('#openPicker');await page.click('#tabTrails');await page.selectOption('#hoTrail','smoke');assert.match(await page.textContent('#hoSelectedCount'),/1 cenário selecionado/);await page.click('#applyTrail');assert.equal(await page.locator('.ho-case').count(),5);await page.click('#saveHO');
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/ho-after-mobile.png',fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'página sem overflow horizontal');
  await page.click('#openPicker');await page.screenshot({path:'/tmp/ho-after-mobile-picker.png'});assert.equal(await page.evaluate(()=>document.querySelector('#hoPicker').getBoundingClientRect().right<=innerWidth),true);assert.equal(await page.locator('#addSuggested').isVisible(),true);
  await page.click('#cancelPicker');assert.deepEqual(errors,[]);console.log('PASS: seleção entre filtros/abas, cancelamento, duplicados, execução, persistência, aceite, avulso, sugestões, trilhas e layout mobile.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
