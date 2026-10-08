const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(8000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const base=process.env.ISSUEFLOW_URL||'http://127.0.0.1:8080';await page.goto(base+'/changes.html');
  await page.evaluate(()=>{
   const sc=(id,nome,result)=>({id,casoId:'cat-'+id,nome,tipo:'Automática',etapaAlvo:'Criação de Pedido',fluxo:['Simulação','Criação de Pedido'],etapas:{Simulação:result,'Criação de Pedido':result},pedido:'HO-123',jira:'evidência-HO'});
   localStorage.setItem('issueflow.hoplans.v1',JSON.stringify({'ISS-1043':{aceite:{por:'PM teste'},cenarios:[sc('s1','Cliente PF Hipoteca','OK'),sc('s2','Cliente PJ Aval','N/A')]},'ISS-1042':{cenarios:[sc('s3','Assessor PF Alienação','OK')]}}));
   const change=changes.find(c=>c.issueIds.includes('ISS-1043'));change.issueIds.push('ISS-1042');openScenarios(change);
  });
  const initial=await page.locator('#scenarioList .scenario-row').count();
  await page.click('#toggleHO');assert.equal(await page.locator('#productionPicker').isVisible(),true);assert.equal(await page.locator('#scenarioHO input').count(),3);assert.equal(await page.locator('#scenarioHO input:disabled').count(),2);assert.match(await page.textContent('#scenarioHO'),/Aguardando aceite/);
  assert.equal(await page.locator('#addProductionSelection').isDisabled(),true);
  await page.locator('#scenarioHO input:not(:disabled)').check();assert.match(await page.textContent('#productionSelectionCount'),/1 cenário/);
  await page.fill('#productionSearch','Alienação');assert.match(await page.textContent('#productionSelectionCount'),/1 cenário/);await page.fill('#productionSearch','');
  await page.screenshot({path:'/tmp/production-picker.png'});
  await page.click('#cancelProductionPicker');assert.equal(await page.locator('#scenarioList .scenario-row').count(),initial);
  await page.click('#toggleHO');assert.match(await page.textContent('#productionSelectionCount'),/0 cenário/);await page.locator('#scenarioHO input:not(:disabled)').check();await page.click('#addProductionSelection');
  assert.equal(await page.locator('#productionPicker').isVisible(),false);assert.equal(await page.locator('#scenarioList .scenario-row').count(),initial+1);assert.equal(page.url(),base+'/changes.html');
  assert.equal(await page.evaluate(()=>{const prod=scenarioDraft.find(s=>s.sourceExecutionId==='s1');return execStatus(prod)==='Pendente'&&prod.pedido===''&&prod.jira==='';}),true);
  const imported=page.locator('#scenarioList .scenario-row').filter({hasText:'Cliente PF Hipoteca'});
  assert.equal(await imported.locator('.sc-alvo select').count(),0);
  assert.equal(await imported.locator('.prod-stage-grid select').count(),0);
  assert.match(await imported.textContent(),/2 etapas/);
  assert.equal(await imported.getByRole('link',{name:/Validação de PROD/}).count(),1);
  await page.click('#toggleHO');assert.match(await page.textContent('#scenarioHO'),/Já no plano de PROD/);assert.equal(await page.locator('#scenarioHO input:not(:disabled)').count(),0);
  assert.equal(await page.locator('.production-consult').first().getAttribute('target'),'_blank');await page.click('#cancelProductionPicker');await page.click('#saveScenario');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('issueflow.changes.v1')).some(c=>c.cenarios?.some(s=>s.sourceExecutionId==='s1'))),true);
  assert.equal(await page.evaluate(()=>changes.find(c=>c.issueIds.includes('ISS-1043')).status),'Em aprovação');
  await page.evaluate(()=>openScenarios(changes.find(c=>c.issueIds.includes('ISS-1043'))));await page.setViewportSize({width:390,height:844});await page.click('#toggleHO');await page.screenshot({path:'/tmp/production-picker-mobile.png'});
  assert.equal(await page.evaluate(()=>document.querySelector('#productionPicker').getBoundingClientRect().right<=innerWidth),true);assert.equal(await page.locator('#cancelProductionPicker').isVisible(),true);assert.deepEqual(errors,[]);
  console.log('PASS: seleção PROD, fluxo herdado sem edição de resultados, retorno à aprovação, persistência e mobile.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
