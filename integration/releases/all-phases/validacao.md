# Relatório de revisão — todas as fases

Data: 21/10/2026. Bateria local completa de `2026-10-21T18:33:35.564Z` até `2026-10-21T18:35:08.930Z`. **17 suítes aprovadas, 0 falhas; 42 testes unitários aprovados dentro da mesma execução.** Sem conexão com banco real. Perfil do produto permanece somente Testes.

Ordem para implementação: [módulos, telas, funcionalidades e collections](../../../plano-implementacao/ORDEM-DE-IMPLEMENTACAO.md).

## Evidência executada

- `node --test tests/*.test.cjs`: **42 aprovados**, incluídos na bateria completa.
- `node tests/run-e2e.cjs`: **17 suítes aprovadas, 0 falhas**.
- Verificação suplementar da HO confirmou que o snapshot de um aceite anterior continua inalterado após falha, correção e novo salvamento.
- As oito combinações de fase foram exercitadas no navegador com issue e GMUD criadas pelas telas; módulos futuros permanecem bloqueados até habilitação explícita. Planejamento também foi exercitado somente com Features, sem Testes/HO/GMUD. Registros antigos de deploy não liberam rollback/encerramento quando PROD está desligado.
- Foram verificados criação/edição de issue e cenário, trilhas, filtros, persistência local, pré-requisitos, checklist com Não, exceção de checklist, aprovação, versão implantada, validação por etapa, aceite, encerramento, rollback, nova GMUD da mesma issue, rejeição, não realização, freeze por termo/total, datas e calendários.
- Testes de migrations usam adaptadores simulados para verificar limites de collections, preservação, preflight e rejeição de configurações inválidas. Não são teste de servidor MongoDB.
- `node --check` / `bash -n` e JSONs de preparação válidos. A sintaxe de scripts não comprova execução da migration.

## Evolução do cadastro por frente

Frente e Produto/funcionalidade precedem os atributos. Fluxos compatíveis fornecem etapas próprias; Linha aparece primeiro entre atributos de Crédito. Dimensões permitem Aplicar em uma frente ou todas. Marketplace/Site não recebem campos ou etapas de Crédito por padrão. A edição preserva snapshots antigos.

`scenario-front-form-browser` passou na bateria e em execução suplementar ampliada: seleção de fluxo Marketplace, escopo/limpeza de atributos, bloqueio sem fluxo, versão/cópia preservada após desativar o modelo, edição legada e execução pela tela real HO com falha/motivo persistidos após recarregar. Nenhum banco real conectado.

## Revalidação do fluxo de Testes

Quatro ajustes complementares foram aplicados e cobertos por regressão:

| Ponto encontrado | Correção |
| --- | --- |
| Nome automático permanecia ao limpar a última dimensão | Nome gerado acompanha a seleção vazia; nome digitado é preservado |
| Reduzir o alvo impedia ampliar novamente usando a cópia salva | Edição oferece a sequência de origem salva, sem depender do modelo corrente |
| Nome do cenário podia reconstruir atributos que estavam explicitamente vazios | Inferência fica exclusiva de legados sem campo dimensoes |
| Cenário inativo em trilha existente não era identificado | Rótulo Inativo na edição, preservando referência e histórico |

A suíte de navegador verifica as correções e continua até registrar e persistir uma falha de Marketplace pela tela HO. Os demais percursos incluem cadastro/edição, trilhas, seleção, resultados, motivos, retestes, aceites e proteção de snapshots. Nenhuma pendência bloqueante foi identificada nos percursos locais exercitados; integração real continua fora deste aceite.

## Problemas encontrados e tratados

| Problema | Tratamento | Evidência / limite |
| --- | --- | --- |
| Entregas+Testes liberava HO antes de sua fase | Flag homologation explícita, dependências e configuração em cascata | Navegador e testes de flags |
| Preparação de GMUD já liberava aprovação | Flag approval separada; calendário de GMUD acompanha essa fase | Navegador, ação direta bloqueada e matriz de fases |
| Ação em lote HO podia sobrescrever falha ou N/A | Somente pendências; desabilitada com falha; motivo e reteste explícito | ho-audit-browser e homologacao-browser |
| HO perdia detalhes de falha/reteste e remoção | Eventos com motivo, mudança de resultado e snapshot removido; aceite guarda cópia histórica | Testes de histórico e verificação suplementar |
| Ação legada executar podia alterar status sem confirmação completa | Função legada deixa de mutar; alias usa confirmação com os mesmos guards | change-edge-cases-browser |
| Ações anteriores ao deploy podiam ser chamadas sobre subida realizada | Aprovar, rejeitar e não realizada validam estado, flag e responsável | Teste de integridade do documento após chamadas inválidas |
| Deploy não registrava releaseRef exigida pelo contrato | Campo obrigatório de versão/commit/tag e histórico | full-flow-browser bloqueia confirmação vazia e depois confirma |
| Exceção de checklist sem justificativa | Motivo obrigatório, pendências e responsável preservados | Aprovação via gestão/calendário e regressão completa |
| Campos da tela ausentes no desenho MongoDB | Mapeados abertura, equipe executora, participação FLEX/ON, observações, referências da execução e revisões próprias | Dicionário/contratos/fixtures; contrato verificado localmente |
| Plano HO corrente poderia substituir a prova histórica de outra tentativa | Snapshot imutável no aceite, contrato de consulta por revisão e índice de auditoria | Protótipo conferido; endpoint real permanece pendente |
| Planejamento opcional poderia criar collections de fases futuras | Migration usa fecho de dependências, não prefixo arbitrário de todas as fases | Teste de migration do calendário sem HO/GMUD |
| Novo validator poderia incompatibilizar documentos anteriores | Preflight de dados antes de collMod, inspector de duplicatas/índices e backfill explícito | Testes locais de controle; execução real pertence à integração |
| Importação repetida poderia duplicar registros | Campos legacySource/legacyId e índices parciais por workspace | Estrutura preparada; importador real ainda não implementado |

## Erro de schema confirmado por revisão estática

Seis objetos continham `required: []`, rejeitado pelo parser oficial MongoDB 8.0 em `parseRequired`. Omitir required nesses objetos mantém seus campos opcionais sem produzir o erro de parsing. O schema foi corrigido e uma verificação recursiva foi acrescentada aos testes. [Fonte primária: json_schema_parser.cpp](https://github.com/mongodb/mongo/blob/v8.0/src/mongo/db/matcher/schema/json_schema_parser.cpp#L448-L476). Isso confirma um erro específico, mas não substitui a execução de todos os validators/índices numa instância real.

## Contratos MongoDB preparados

- Allowlist de collections por fase e wrapper próprio; não recria nem apaga collections anteriores.
- Campos/índices e BSON de todas as entidades em `campos.md` e schema canônico.
- Motivo de failed, origem de PROD, aceites não vazios/concluídos e provas estruturais de approved/deployed/closed/rollback no validator.
- Revisões separadas para documento, preparação, HO e PROD; edição textual não invalida aprovação por coincidência com version.
- Índices para exclusividade de feature em GMUD ativa, unicidade por workspace, idempotência, aceites históricos e origem importada.
- Fixtures BSON e teste descartável para migrations incrementais, índices, CAS, snapshots e rollback de transação.

Esses contratos estão preparados para adaptar ao hospedeiro. Não representam um backend ou uma migration já aplicada.

## Escopo: validação local sem banco real

Conforme solicitado, este aceite não exige conexão com MongoDB, Docker ou execução de bootstrap. A indisponibilidade anterior do Docker não é bloqueio deste trabalho. Nenhum banco foi conectado e nenhum registro do usuário foi limpo pela bateria: os navegadores usam contextos isolados.

Schemas, campos, índices, dependências de collections e controles de migration foram verificados localmente com testes estáticos e adaptadores simulados. A execução futura de validators, índices, transações e API real pertence à implementação no sistema hospedeiro; os status de integração continuam pendentes.

## O que não foi reintroduzido ou entregue

A seleção de fluxo no cenário foi adicionada nesta evolução, junto com Frente/funcionalidade e atributos condicionais. Escopo/revisor na tela HO continua fora desta alteração; seus testes antigos não contam como cobertura da interface atual. Não foi implementado importador, backend, autenticação, execução de pipeline ou upload de evidências. O sistema hospedeiro ainda precisa ser inspecionado e implementar cada fase com frontend e backend completos.

Os status de integração permanecem pending. Esta revisão é validação do protótipo e preparação de banco; somente Testes está habilitado por padrão.
