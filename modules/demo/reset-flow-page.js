// Limpeza solicitada: mantém catálogo e trilhas; remove issues e execuções vinculadas.
(() => {
 const status=document.querySelector('#resetFlowStatus'),before=new Map();
 const fresh={'issueflow.records.v1':[],'issueflow.changes.v1':[],'issueflow.hoplans.v1':{},'issueflow.demo.workflowSeeds.v1':false,'issueflow.demo.issueSeeds.v1':false};
 try {
  for(const key of Object.keys(fresh))before.set(key,localStorage.getItem(key));
  for(const [key,value]of Object.entries(fresh))localStorage.setItem(key,JSON.stringify(value));
  status.textContent='Issues e execuções vinculadas removidas. Cenários, trilhas e configurações foram preservados. Você pode cadastrar uma nova issue e validar o fluxo.';
  document.querySelector('#startFlow').hidden=false;
 }catch(error){
  for(const [key,value]of before){try{if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value);}catch{}}
  status.textContent='Não foi possível concluir a limpeza. Verifique se o navegador permite salvar os dados e recarregue esta página para tentar novamente.';
 }
})();
