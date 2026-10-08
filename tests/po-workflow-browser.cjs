const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),admin=await context.newPage(),po=await context.newPage();const errors=[];for(const page of [admin,po]){page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));}
  const base=process.env.ISSUEFLOW_URL||'http://127.0.0.1:8080';await admin.goto(base+'/changes.html');
  const id=await admin.evaluate(()=>{const c=changes.find(c=>c.status==='Aprovada');c.cenarios=[{id:'po-s1',nome:'Cliente PF Hipoteca',tipo:'Automática',etapaAlvo:'Criação de Pedido',fluxo:['Simulação','Criação de Pedido'],etapas:{},validadoHO:true}];const plans=hoPlans();for(const issue of c.issueIds)plans[issue]={aceite:{por:'PM',quando:'2026-10-07'},cenarios:[{id:'ho-test',nome:'HO',tipo:'Manual',fluxo:['Simulação'],etapas:{'Simulação':'OK'}}]};saveTestData(hoPlansKey,plans);c.rdm='6776767';c.smeTl='TL Teste';c.po='PO Teste';delete c.pipeline;delete c.aceiteProducao;c.historico=[];persist();return c.id;});
  await po.goto(base+'/producao.html');assert.equal(await po.locator('#poTabActive').getAttribute('aria-selected'),'true');assert.match(await po.textContent('#poCards'),/6776767/);assert.match(await po.textContent('#poCards'),/Aguardando subida/);await po.click('#poTabReady');assert.doesNotMatch(await po.textContent('#poCards'),/6776767/);await po.click('#poTabWaiting');assert.match(await po.textContent('#poCards'),/6776767/);
  await po.goto(base+'/producao.html?change='+encodeURIComponent(id));assert.equal(await po.locator('#poSave').isDisabled(),true);assert.equal(await po.locator('#poScenarios select:disabled').count(),2);assert.equal(await po.locator('#poScenarios input[type=file]').count(),0);await po.click('#poClose');
  await admin.evaluate(id=>showDetail(changes.find(c=>c.id===id)),id);
  assert.equal(await admin.locator('#detailActions').getByText('✓ Subida realizada',{exact:true}).count(),1);
  assert.doesNotMatch(await admin.textContent('#detailActions'),/Solicitar execução|Iniciar pipeline/);
  await admin.locator('#detailActions').getByText('✓ Subida realizada',{exact:true}).click();
  await admin.locator('.action-form input').fill('');await admin.locator('.action-form .primary').click();assert.equal(await admin.evaluate(id=>changes.find(c=>c.id===id).status,id),'Aprovada');
  await admin.locator('.action-form input').fill('TL Teste');await admin.locator('.action-form .primary').click();assert.equal(await admin.evaluate(id=>changes.find(c=>c.id===id).status,id),'Executada');
  await po.reload();await po.evaluate(id=>openValidation(id),id);assert.equal(await po.locator('#poSave').isEnabled(),true);assert.equal(await po.locator('#poFinish').isDisabled(),true);assert.equal(await po.locator('#poDialog').getByText('Evidências',{exact:false}).count(),0);
  await po.locator('#poScenarios select').nth(0).selectOption('OK');await po.locator('#poScenarios select').nth(1).selectOption('Falhou');await po.click('#poSave');assert.match(await po.textContent('#poError'),/motivo da falha/);await po.locator('#poScenarios textarea').fill('Erro ao criar o pedido');await po.click('#poSave');assert.match(await po.textContent('#poNotice'),/decisão técnica/);await po.screenshot({path:'/tmp/po-failure.png'});
  await po.locator('.po-all-ok').click();await po.click('#poFinish');assert.match(await po.textContent('#poNotice'),/Validação concluída/);assert.equal(await po.locator('#poSave').isDisabled(),true);
  assert.equal(await po.evaluate(id=>productionChanges().find(c=>c.id===id).historico.some(e=>e.para==='Falhou'&&e.motivo==='Erro ao criar o pedido'),id),true);
  // TL com diálogo antigo não sobrescreve o aceite recém-gravado pelo PO.
  assert.equal(await admin.evaluate(()=>changesAreFresh()),false);await admin.reload();await admin.evaluate(id=>showDetail(changes.find(c=>c.id===id),'encerrarGmud'),id);await admin.locator('.action-form .primary').click();assert.equal(await admin.evaluate(id=>!!changes.find(c=>c.id===id).encerramento,id),true);
  await po.click('#poClose');await po.click('#poTabFinished');assert.match(await po.textContent('#poCards'),/GMUD encerrada/);await po.screenshot({path:'/tmp/po-dashboard.png',fullPage:true});
  // Uma nova janela exige nova execução técnica e resultados de PROD novos.
  await admin.evaluate(id=>{const c=changes.find(c=>c.id===id);delete c.encerramento;reprogramar(c,{novaData:'2026-11-10',novoHorario:'20:00',motivo:'Nova subida',por:'TL Teste'});},id);
  assert.equal(await admin.evaluate(id=>{const c=changes.find(c=>c.id===id);return c.status==='Em aprovação'&&!c.pipeline&&!c.encerramento&&!c.aceiteProducao&&Object.keys(c.cenarios[0].etapas).length===0&&c.historico.some(e=>e.testes?.length);},id),true);
  // Falha técnica não libera validação de negócio.
  const failedId=await admin.evaluate(()=>{const c=changes.find(c=>c.status==='Em aprovação');c.status='Aprovada';c.pipeline={time:'Plataforma',solicitadaEm:'2026-10-06 19:00',iniciadaEm:'2026-10-06 19:05'};c.cenarios=[];persist();return c.id;});
  await admin.evaluate(id=>{const c=changes.find(c=>c.id===id);c.pipeline.resultado='Falhou';c.pipeline.finalizadaEm='2026-10-06 19:10';persist();},failedId);
  await po.evaluate(id=>openValidation(id),failedId);assert.match(await po.textContent('#poNotice'),/Falha na subida/);assert.equal(await po.locator('#poSave').isDisabled(),true);await po.click('#poClose');await po.click('#poTabWaiting');
  await po.setViewportSize({width:390,height:844});await po.screenshot({path:'/tmp/po-mobile.png',fullPage:true});assert.equal(await po.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
  // Falha salva pelo PO é preservada ao TL registrar rollback pelo plano em consulta.
  await admin.evaluate(id=>{const c=changes.find(c=>c.id===id);c.status='Executada';c.cenarios=[{id:'rollback-s',nome:'Pedido em PROD',tipo:'Manual',fluxo:['Simulação'],etapas:{Simulação:'Falhou'},motivosEtapas:{Simulação:'Erro informado pelo PO'}}];c.historico.push({tipo:'teste_prod',cenarioId:'rollback-s',cenario:'Pedido em PROD',etapa:'Simulação',para:'Falhou',motivo:'Erro informado pelo PO'});persist();openScenarios(c);openRollback();},failedId);
  await admin.locator('#rollbackForm input[name=por]').fill('TL Teste');await admin.locator('#rollbackForm textarea').fill('Versão anterior restaurada');await admin.locator('#rollbackForm button[type=submit]').click();assert.equal(await admin.evaluate(id=>{const c=changes.find(c=>c.id===id),ev=c.historico.at(-1);return c.status==='Rollback realizado'&&ev.testes[0].etapas.Simulação==='Falhou'&&ev.testes[0].motivosEtapas.Simulação==='Erro informado pelo PO';},failedId),true);
  console.log('PASS: TL confirma subida diretamente, PO bloqueado antes da subida, validação por etapa sem documentos, falha/motivo, conclusão, encerramento, proteção entre abas e mobile.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
