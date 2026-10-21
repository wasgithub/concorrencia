> Evolução vigente: [cadastro por frente e seleção de fluxo](../../../docs/cadastro-cenarios-por-frente.md). A seleção de fluxo no cenário foi adicionada após a revisão anterior; referências antigas a biblioteca exclusivamente independente estão superadas nesse ponto. Escopo/revisor por US continua fora desta alteração.

# Revisão de todas as fases — protótipo e MongoDB

O perfil entregue continua **somente Testes**. As fases abaixo são habilitadas exclusivamente em contextos de teste isolados durante a regressão. Integração no sistema hospedeiro permanece pendente.

O aceite solicitado nesta revisão é local, sem conexão com banco real. Consulte a [lista vigente de módulos e funcionalidades](../../../plano-implementacao/ORDEM-DE-IMPLEMENTACAO.md) e o [relatório local](validacao.md). A eventual execução MongoDB descrita abaixo é opcional para futura integração.

## Ordem e fronteiras

| Ordem | Fase histórica | Capacidade liberada | Collections de negócio acrescentadas |
| --- | --- | --- | --- |
| 1 | 02-catalog | Catálogo, etapas, atributos, trilhas e fluxos selecionáveis por frente com snapshots | delivery_scenarios, delivery_trails, delivery_definitions, delivery_test_flows |
| 2 | 01-features | Features/issues e componentes | delivery_features |
| 3 | 03-homologation | Plano HO, resultados por etapa, motivo/reteste e aceite PO | delivery_ho_plans |
| 4 | 04-changes | Preparação GMUD, checklist, plano PROD e freeze | delivery_changes, delivery_feature_locks, delivery_freezes |
| 5 | 04b-approval | Aprovação e agenda GMUD; ainda sem confirmar deploy | Nenhuma; reutiliza GMUD |
| 6 | 05-production | Versão implantada, validação PO, rollback e encerramento | Nenhuma; reutiliza GMUD |
| Opcional | 06-calendars | Calendário HO e concorrências | Nenhuma; depende somente de Features |
| Consolidação | 07-migration | Importação explícita e regressão integrada | Nenhuma; usa legacySource/legacyId e auditoria |

Auditoria e idempotência usam delivery_audit_events/delivery_commands desde o primeiro comando, ou a infraestrutura equivalente do hospedeiro. delivery_module_settings é opcional: preferir flags existentes. A lista total possui 11 collections compartilhadas/de negócio mais essa collection opcional; não criar uma coleção de timeline ou uma coleção por cenário/issue.

As flags são quality, delivery, homologation, gmud, approval, production e planning. HO deixou de ser inferida automaticamente pela presença de Entregas+Testes. Aprovação não é mais parte implícita de preparação GMUD. Cada liberação exige seus próprios critérios e teste.

## Arquivos canônicos

- `manifest.json`: dependências, flags sequenciais, minimumFlags e allowlist de collections por fase.
- `campos.md`: dicionário completo gerado do schema e mapeamento tela → BSON.
- `../../mongodb/collections.json`: validators BSON e índices canônicos, incluindo campos futuros opcionais.
- `../../contracts/api.json`: comandos, permissões e introducedIn por fase; operações marcadas optionalIncrement não são critérios da fase inicial.
- `fixtures.ejson`: exemplos BSON canônicos de todas as collections, usados somente pelo teste descartável. Não são seeds de produção.
- `inspect-schema.cjs`: preflight somente leitura: documentos incompatíveis, duplicatas, conflitos de índice e diferença de validator.
- `apply-schema.cjs`: wrapper explícito limitado à fase e suas dependências.
- `validacao.md`: problemas encontrados, ajustes, cobertura e pendências.
- `../../mongodb/validate-isolated.sh`: teste opt-in contra Mongo descartável; não recebe URI nem acessa banco existente.

## Migrations por fase

`collections` é o fecho das dependências técnicas mais auditoria/comandos. `rolloutCollections` é o acumulado na ordem recomendada. Não confundir os dois: liberar o calendário HO opcional antes de GMUD não pode criar collections de HO ou GMUD. O wrapper usa `collections`, preservando collections já existentes fora de sua lista, sem apagá-las.

No sistema hospedeiro, adaptar esta preparação à migration instalada e à conexão existente. Executar apenas depois de revisar topologia/versão, tipos de workspace/usuário, nomes reais e política de índices. Replica set/cluster com transações é necessário para registrar entidade, evento e recibo de modo atômico; um Mongo standalone não cobre este contrato.

```js
const { inspectPhaseSchema } = require('./inspect-schema.cjs');
const { applyPhaseSchema } = require('./apply-schema.cjs');
const preflight = await inspectPhaseSchema(existingDb, '04-changes');
// Revisar o relatório, normalizar duplicatas e executar backfill explícito.
// Não automatizar aprovação de diferenças de validator ou de índices.
if (!preflight.canApply) throw new Error('Revisar migration antes de aplicar');
const report = await applyPhaseSchema(existingDb, '04-changes', {
  applyExistingValidators: true // somente após revisão/backfill e homologação
});
```

Por padrão, o wrapper só cria collections ausentes e seus índices; preserva validators existentes. Com applyExistingValidators, verifica TODOS os documentos incompatíveis antes de alterar qualquer validator. Não inventa atores, não preenche versões nem migra dados automaticamente. A criação de índices/DDL não é uma transação de rollout: registrar checkpoints e reexecutar após corrigir a causa de um erro, sem apagar índices existentes.

O inspector é somente leitura. Campos de índice único devem ser escalares conforme o schema; dados legados incompatíveis, collation, shard key e normalização precisam de revisão. Verificar duplicatas antes de criar índice único. Em cluster sharded, validar os índices únicos com o shard key real. Nunca remover/recriar um índice ou collection automaticamente para fazer a migration passar.

## Expandir, preencher, restringir

1. Preparar campos opcionais e código compatível com a versão anterior; manter a nova feature desligada.
2. Inspecionar dados e índices. Backfill deve ser explícito, idempotente, por workspace e com relatório. Novas flags ausentes começam false.
3. Migrar nomes/IDs/tipos legados com mapeamento, sem transformar nomes digitados em usuários autenticados ou atribuir aprovação fictícia.
4. Testar os validators e índices na versão/topologia usada no hospedeiro, aplicar constraints somente após backfill limpo.
5. Integrar frontend/backend da fase e validar segurança, concorrência, retries, auditoria e regressão anterior.
6. Habilitar a flag da fase. Se precisar desligá-la, preservar campos, índices e documentos; não executar down destrutivo para reverter uma tela.

## Histórico e novas tentativas

Plano HO corrente é único por feature. No aceite, registrar evento imutável ho.accepted com details.hoRevision, featureId, executions e acceptance, com snapshot limitado a 1 MiB pela API. Consultar revisões aceitas por `GET /delivery/ho-plans/{id}/acceptances/{revision}`; não devolver o plano corrente em lugar da revisão histórica. O índice ho_accepted_revision_unique impede duas provas para a mesma revisão. Se a auditoria do hospedeiro não guardar esse snapshot, adaptar seu mecanismo de versionamento antes de implementar HO.

GMUD guarda preparação e resultados de PROD, com source apontando para o aceite HO. approval.revision corresponde a preparationRevision, não à version geral de qualquer edição textual. production.revision controla o plano/resultados PROD e seu aceite. Depois de closed/rollback, a tentativa é somente leitura. Outra versão usa nova GMUD e previousChangeId, preservando o resultado anterior. Rejeição/não realização liberam vínculos; eventual replanejamento antes de deploy deve readquirir os locks em transação, sem tomar o vínculo de outra GMUD.

Importação usa legacySource+legacyId únicos por workspace nas entidades de negócio. Repetir a mesma origem não pode gerar outra feature/change. Receber outro arquivo não significa outra origem automaticamente. Registros antigos sem origem precisam de revisão; não presumir que títulos iguais ou datas iguais identificam o mesmo registro.

## Validação real do banco

O script descartável exige Docker ativo e imagem Mongo previamente preparada, por decisão explícita. Exemplo de execução, após essa preparação:

```bash
bash integration/mongodb/validate-isolated.sh
```

A imagem padrão de referência é mongo:8.0; MONGO_VALIDATION_IMAGE permite usar a versão compatível com o hospedeiro. O runner não faz pull nem instala dependências. Cria um container com nome exclusivo, replica set próprio, sem porta publicada, sem rede externa e sem volume persistente; remove apenas o container que criou. O repositório integration é montado somente leitura. Não usa URI, senha ou banco do usuário.

A suíte verifica bootstrap incremental/idempotente, campos obrigatórios, motivo de falha, origem de PROD, estados sem provas, unicidade por workspace, lock ativo, CAS, snapshot e abort de transação. Isso testa capacidades Mongo e contratos, não implementa nem valida a API real do hospedeiro. Campos válidos não comprovam autorização, consistência entre referências ou ordem operacional; essas regras seguem no servidor.

Na sessão de 21/10/2026, Docker estava sem daemon e mongod/mongosh não estavam disponíveis. O runner retornou BLOCKED com código 2 antes de iniciar banco. Portanto, o teste real de BSON/índices/transações continua pendente. Não apresentar os testes com adaptadores simulados como MongoDB validado.

Referências oficiais conferidas: [$jsonSchema](https://www.mongodb.com/docs/manual/reference/operator/query/jsonschema/), [transações](https://www.mongodb.com/docs/manual/core/transactions/), [índices únicos](https://www.mongodb.com/docs/manual/core/index-unique/). A modelagem de domínio é uma decisão deste projeto.
