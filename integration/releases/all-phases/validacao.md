# Relatório de revisão — todas as fases

Data: 23/10/2026. Bateria local completa de `2026-10-23T20:11:27.534Z` até `2026-10-23T20:13:14.038Z`. **21 suítes aprovadas, 0 falhas; 51 testes unitários aprovados.** Sem conexão com banco real. Perfil do produto permanece somente Testes.

Ordem para implementação: [módulos, telas, funcionalidades e collections](../../../plano-implementacao/ORDEM-DE-IMPLEMENTACAO.md).

## Evidência executada

- `node --test tests/*.test.cjs`: **51 aprovados**, incluídos na bateria completa.
- `node tests/run-e2e.cjs`: **21 suítes aprovadas, 0 falhas**.
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

## Prévia de acompanhamento por ciclo — 23/10/2026

Nova tela acompanhamento-testes.html com exemplos separados, resumo, times, filtros, cobertura planejada, histórico e painel lateral de etapas. Criar ciclo do catálogo ou reutilizar cenários mantém resultados independentes; não modifica planos HO/PROD das issues. A tela usa quality e foi incluída na navegação compartilhada.

Cinco testes de domínio adicionados e suíte test-runs-browser aprovada: motivos, confirmação de reteste, datas, cópia pendente, catálogo, persistência/reload, erro de armazenamento, isolamento e mobile. Após a bateria, a suíte foi executada novamente para conferir a apresentação mobile em cartões e o filtro A concluir. Esta prévia não adiciona collections nem conclui uma fase da integração no hospedeiro. Detalhes em modules/test-runs/README.md.

## Visões alternativas — matriz e agenda por período

A matriz de etapas compartilha os mesmos resultados da lista, permite abrir a etapa pelo botão da célula e distingue etapa fora do fluxo (—) de N/A. Filtros aplicam-se à lista e à matriz.

A agenda consulta todos os ciclos no intervalo de validação e ambiente, com sobreposição inclusiva, linhas de time/ciclo e barras clicáveis para abrir a matriz filtrada por time. O período de validação é independente da implantação prevista; registros antigos sem esse período usam a janela do ciclo com aviso explícito.

Dois testes de domínio e test-run-views-browser adicionados, incluindo comparação de datas, ambiente, filtros, passos próprios e mobile. A primeira execução de test-runs-browser encontrou ambiguidade em um seletor global, pois lista e matriz possuem ações iguais; o teste foi delimitado a #runRows e reexecutado com sucesso. Resultado final de 19 suítes validadas, nenhuma falha pendente; tentativa inicial e log da reexecução preservados nos relatórios locais.

## Planilha consolidada por produção e reutilização por data

Exibir permite selecionar o ciclo, uma data de produção ou todos os ciclos. A seleção por dia considera toda janela de implantação que inclua o dia. O consolidado preserva grupos, contexto de ciclo/ambiente e datas de validação e implantação, com uma faixa temporal no próprio painel. O resumo de um único ciclo fica oculto no consolidado.

Reutilizar cenários exibidos prepara nova rodada com datas próprias, preservando equipes/responsáveis quando selecionado e zerando resultados/motivos. O histórico anterior permanece inalterado. Comandos de edição resolvem cycleId/scenarioId para impedir que IDs repetidos em ciclos diferentes afetem outra tentativa.

Test-production-matrix-browser passou: recorte por data/todos, filtro de time mantido após salvar, edição fora do ciclo selecionado, IDs repetidos, cópia de 10 cenários com 5 times para outra data, resultados pendentes, reload e mobile. Novo teste unitário confirma inclusão pelas datas de produção e ambiente. Bateria final completa: 50 unitários e 20 suítes aprovados, sem falhas.

## Seleção rápida de datas de subida

Adicionados botões de datas junto à tabela Execução por cenário e etapa, com múltipla seleção, Todas as subidas e Este ciclo. Calendário fica disponível apenas no modo de consulta manual por data. A tabela exibe o recorte selecionado, sem duplicar ciclos que incluem mais de uma das datas escolhidas. As seleções não gravam no store.

Validação suplementar: 50 unitários e as três suítes de navegador afetadas aprovados (test-runs-browser, test-run-views-browser, test-production-matrix-browser). A suíte da planilha foi reexecutada após o ajuste visual do calendário, também aprovada. A bateria completa de 20 suítes acima refere-se à execução anterior; esta alteração foi verificada pelos testes afetados.

## Retirada da reutilização e link das evidências Jira

A pedido do usuário, retirados os botões de reutilizar por ciclo/data e o formulário de cópia; Novo ciclo continua selecionando cenários ativos do catálogo. Stores e referências de rodadas existentes preservados.

Cada execução tem evidenceUrl opcional, editável no painel lateral; links válidos aparecem também na lista e na planilha e abrem em outra aba. HTTP/HTTPS, limite e ausência de credenciais validados localmente. Não existe consulta/upload para Jira; acesso ao destino depende do usuário. Alterações/remoções geram eventos evidence_updated no histórico do ciclo, com URL anterior/nova, sem mudar outras rodadas.

Nova suíte test-evidence-browser cobre URL inválida, cadastro, abrir, edição, remoção, persistência/reload, histórico, erro de armazenamento e isolamento do ciclo. Suítes anteriores atualizadas para a remoção da cópia. Resultado final: 51 unitários e 21 suítes aprovados; a suíte de evidência foi também reexecutada após ajustar a limpeza da mensagem de erro ao corrigir a URL.
