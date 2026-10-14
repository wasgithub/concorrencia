# Modelo MongoDB proposto

Proposta para adaptar ao sistema hospedeiro; não foi aplicada a um banco. Nomes têm prefixo `delivery_` para evitar colisões com funcionalidades existentes. O mapeamento para driver/ODM e migrations deve seguir a stack real.

## Coleções e agregados

| Coleção | Dono | Documento |
| --- | --- | --- |
| `delivery_features` | Features | Entrega, ID externo, equipe, componentes e datas de planejamento |
| `delivery_scenarios` | Catálogo | Caso reutilizável, dimensões, componentes e etapas |
| `delivery_trails` | Catálogo | Grupo de referências a cenários |
| `delivery_definitions` | Catálogo / GMUD | Fluxo de teste, dimensões e modelo de checklist, distinguídos por `kind` |
| `delivery_ho_plans` | HO | Um plano corrente por feature, snapshots de cenários, resultados, revisão e aceite |
| `delivery_changes` | GMUD | Uma tentativa de implantação, features vinculadas, janela, checklist e resultados de PROD |
| `delivery_feature_locks` | GMUD | Associação exclusiva de uma feature com a GMUD ativa; restrição de integridade |
| `delivery_freezes` | GMUD | Restrições de implantação por janela e componentes |
| `delivery_audit_events` | Auditoria | Um evento por versão de entidade, com conjunto de alterações e responsável |
| `delivery_commands` | Infraestrutura | Resultado de comando para idempotência |

Coleções não são serviços independentes. No primeiro momento, usar os módulos da aplicação existente e a mesma conexão MongoDB.

## Referência versus snapshot

IDs de features, cenários, planos, GMUDs e vínculos usam BSON ObjectId. JSON da API serializa IDs como strings hexadecimais e datas como ISO 8601; repositories convertem os tipos. `workspaceId`, `teamId` e `userId` são IDs opacos em string da aplicação hospedeira; adaptar se suas entidades já usam ObjectId. O workspace vem da sessão, não é escolhido livremente pelo cliente.

- Feature tem `externalId` como identificação exibida, separado de `_id`. Normalizar espaços e caixa antes da unicidade; a mesma identificação só pode repetir em outro workspace.
- GMUD guarda referências `featureIds`. Uma feature pode ter várias GMUDs históricas. Apenas uma ativa por vez, protegida por `delivery_feature_locks`.
- Trail referencia cenários. Plano HO copia nome, tipo de garantia, dimensões, componentes e etapas: atualizar catálogo não muda execução antiga.
- PROD copia os cenários escolhidos e guarda `{hoPlanId, hoRevision, executionId}` em `source`. Resultados começam `pending`, nunca herdam OK da HO.
- Etapas e execuções possuem IDs estáveis; nome de etapa não é chave de resultado no modelo real.
- Checklist é snapshot do modelo com perguntas, tipo, obrigatoriedade e respostas. Alterar o modelo global não muda uma GMUD aprovada.
- Eventos ficam em coleção separada, com paginação; não há array de histórico sem limite dentro de feature/GMUD/HO.
- Calendários são projeções/consultas. Não criar coleções separadas de timeline com outra cópia dos status.

Os arrays têm limites iniciais explícitos em `collections.json` (200 cenários, 50 etapas por execução e 100 features por GMUD). São limites de produto propostos, a revisar antes da aplicação. Para planos maiores, mudar o agregado antes de simplesmente remover limites. Evitar ultrapassar o limite BSON de documento; monitorar tamanho dos snapshots. Objetos `dimensions` e `details` são flexíveis, mas a API deve validar chaves, tamanho e conteúdo; validators BSON não substituem as regras de negócio.

## Campos e estados

Todos os documentos têm `_id`, `workspaceId`, `schemaVersion`, `version`, `createdAt`, `updatedAt`, `createdBy` e `updatedBy`. Responsáveis guardam `userId` e `displayName` da sessão para manter contexto histórico; não aceitar nome digitado como identidade autenticada.

`version` controla alteração concorrente do documento. `revision` do plano HO identifica a configuração/resultados/aceite usados na aprovação. `approvalFence` é um contador técnico para serializar leitura de HO com comandos críticos de GMUD; não aparece ao usuário.

Estados internos de GMUD: `draft`, `awaiting_approval`, `approved`, `deployed`, `closed`, `rollback`, `rejected`, `not_performed`. Replanejamento é evento e alteração da janela antes do deploy; não é status terminal. No modelo real, depois de deploy/rollback, uma nova implantação é outra GMUD com `previousChangeId`, inclusive quando a feature continua a mesma.

HO: `no_plan`, `testing`, `awaiting_acceptance`, `accepted`. Estado é calculado no servidor e atualizado com resultados/aceite. PROD: `not_started`, `pending`, `in_progress`, `failed`, `accepted`. Resultado de etapa: `pending`, `ok`, `failed`, `not_applicable`.

Um deploy registrado é verde no calendário, mas não equivale a conclusão. A validação pendente deve continuar explícita. `closed` exige aceite PROD e torna a GMUD somente leitura. `rollback` preserva etapas/motivos e também é somente leitura; outra tentativa usa nova GMUD.

## Datas

Datas de HO e dia da janela usam `YYYY-MM-DD`, no calendário da operação. `window.startAt` e `endAt`, aceites, eventos e confirmação de deploy são BSON Date (instantes UTC). A janela também guarda `timeZone`, inicialmente `America/Sao_Paulo`. API verifica datas reais, fim depois do início, cruzamento de meia-noite e dia de implantação depois do fim de HO. MongoDB validator só verifica forma/tipo, não essas comparações.

A janela da GMUD é a fonte da verdade quando a feature está vinculada. Os campos de previsão na feature são uma projeção mantida pelo comando em transação, não duas agendas editáveis independentemente.

## Índices e consistência

`collections.json` propõe índices conforme filas e consultas: ID externo por workspace, RDM único por workspace quando informado, plano HO por feature, cenários por componente, calendário por data, fila PROD por status/PO, histórico por entidade e vínculo ativo exclusivo por feature.

RDM ausente é campo omitido. Não persistir string vazia nem `TBD`; o índice parcial de RDM considera strings reais. Não montar índice único em array para tentar garantir exclusividade da feature; usar um documento de lock por feature, criado junto da GMUD em transação.

Na criação, vínculo e replanejamento, a transação atualiza GMUD, locks necessários, projeção da feature, evento e recibo de comando. Libera locks nos estados `closed`, `rollback`, `rejected` e `not_performed`. Nova GMUD sem lock disponível retorna conflito; nunca roubar vínculo.

Para alteração concorrente, filtrar por `{_id, workspaceId, version: expectedVersion}` e incrementar `version` na mesma escrita. Nenhum match é conflito HTTP 409, não autorização para sobrescrever.

Aprovação e confirmação de deploy precisam proteger também a HO referenciada: dentro da transação, efetuar uma escrita condicional técnica no plano (revision e aceite esperados, `$inc: {approvalFence: 1}`), verificar regras e escrever a GMUD. Todas as mudanças de HO incrementam revision/version e invalidam seu aceite quando aplicável. A escrita compartilhada no plano evita aprovação/deploy sobre uma leitura antiga. Somente ler HO e escrever GMUD em snapshot não resolve sozinho a corrida. Caso HO mude após aprovação, bloquear confirmação e exigir nova aprovação.

Comandos com evento separado exigem transação para não existir status sem histórico. Use MongoDB em replica set ou cluster compatível com transações; standalone não atende este contrato. Reutilize o mecanismo de retry transacional do driver instalado. Código em callbacks com retry não pode enviar mensagens externas nem executar implantação; efeitos externos são posteriores ao commit.

## Bootstrap

```js
const { applyDeliverySchema } = require('./integration/mongodb/apply-schema.cjs');
const report = await applyDeliverySchema(existingDbConnection);
```

Esse código deve virar migration explícita no sistema real. Cria somente coleções ausentes e índices; validators existentes só são alterados com `applyExistingValidators: true`. Não apaga coleções, dados nem índices. Duplicatas/índices incompatíveis fazem a migration falhar; revisar os dados antes. Executar em homologação e testar a migration real antes de produção. O bootstrap não cria conexão e não executou nenhuma operação nesta entrega.

## Migração do protótipo

Importar por ação explícita, com relatório de itens válidos/rejeitados e IDs legados. Preservar `idIssue` como externalId, normalizar componentes e garantias, criar mapeamento de IDs, converter datas e reconstruir snapshots e eventos. Não converter nomes digitados em usuários autenticados automaticamente. Aceites/GMUDs de demonstração inconsistentes ficam sinalizados como legado para revisão; não criar aprovação, HO ou testes fictícios para satisfazer requisitos.

Uma segunda importação deve reconhecer IDs de origem e não duplicar registros. A exportação de exemplos é massa de teste, não seed automático da aplicação. Replanejamentos/rollbacks antigos exigem cuidado para preservar as tentativas e não substituir resultado anterior.

## Fundamentação

A recomendação de snapshots embutidos limitados e referências para entidades compartilhadas segue a [documentação de modelagem do MongoDB](https://www.mongodb.com/docs/manual/data-modeling/embedding/). O filtro de versão usa a [atomicidade de atualização de documento](https://www.mongodb.com/docs/manual/core/write-operations-atomicity/). Os validators e índices usam [JSON Schema BSON](https://www.mongodb.com/docs/manual/core/schema-validation/specify-json-schema/) e [índices parciais](https://www.mongodb.com/docs/manual/core/index-partial/). Transações seguem a [documentação oficial](https://www.mongodb.com/docs/manual/core/transactions/). O desenho das coleções e estados é uma proposta específica deste fluxo.
