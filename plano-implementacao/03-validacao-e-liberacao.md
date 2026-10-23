# Validação, liberação e reversão por release

## Antes de liberar

- [ ] Frontend chama backend real; dados persistem no MongoDB ao reabrir sessão.
- [ ] Regras operacionais são verificadas no servidor, inclusive quando a chamada ignora a UI.
- [ ] Permissões, isolamento de workspace, revisão concorrente e idempotência aplicável foram testados.
- [ ] Índices/migrations foram revisados e validados na topologia real; backup e restauração têm procedimento.
- [ ] Histórico registra ator autenticado, horário e ação sem apagar resultados anteriores.
- [ ] Flag/capacidade desligada bloqueia comandos; ocultar menu sozinho não satisfaz o aceite.
- [ ] Jornada da ficha foi validada com usuários de teste nos papéis previstos.
- [ ] Regressão dos módulos já entregues passou; decisões e evidências estão registradas.

## Sequência de rollout

1. Integrar com capacidades novas desligadas, sem expor operações incompletas.
2. Aplicar migrations compatíveis e verificadas pelo processo do sistema hospedeiro.
3. Habilitar para workspace/time piloto em homologação e executar a jornada da release.
4. Registrar aceite funcional do responsável e evidências técnicas.
5. Habilitar para piloto em produção pelo processo existente e observar falhas, conflitos e auditoria.
6. Expandir gradualmente após validar o piloto; nenhuma expansão decorre automaticamente deste documento.

## Reversão da funcionalidade

Desativar novos comandos da capacidade com problema, preservar consulta/histórico e seguir o procedimento operacional para registros em andamento. Desligar módulo não apaga documentos nem executa rollback de uma implantação externa. Evitar downgrade destrutivo de schema; correção e eventual restauração seguem o plano aprovado do sistema real.

## Regressão mínima integrada

Sucesso completo; falha HO e correção; aceite invalidado por alteração; checklist incompleto com e sem exceção autorizada; aprovação com plano PROD vazio; reprogramação antes do deploy; falha em etapa PROD com motivo; rollback; nova GMUD da mesma entrega; encerramento somente após aceite PROD; terminal somente leitura; concorrência entre duas sessões; chamadas sem permissão ou de outro workspace.

Os testes existentes estão em `tests/`. Para conferir o protótipo: `node --test tests/*.test.cjs` e `node tests/run-e2e.cjs`. O backend integrado também exige seus próprios testes de API, persistência e autorização; os testes do protótipo não comprovam essas entregas.
