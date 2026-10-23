# Cadastro de qualidade: UX e modelo MongoDB

Proposta de integração atualizada e refletida no protótipo. Backend, autenticação e MongoDB continuam pendentes no sistema real; nenhum banco foi acessado.

## Separar as tarefas nas telas

| Tela | Tarefa principal | Conteúdo |
| --- | --- | --- |
| Fluxos de testes (`fluxos.html`) | Preparar sequências reutilizáveis | Lista por frente/funcionalidade, busca, novo fluxo, editar, duplicar e inativar |
| Frentes e funcionalidades (modal de Fluxos) | Organizar o domínio | Frente individual e funcionalidade individual vinculada à frente; sem listas digitadas em bloco |
| Cenários e trilhas (`testes.html`) | Descrever situações e montar conjuntos | Identificação, escolha do fluxo ou passos próprios, prévia da sequência, condições/atributos opcionais |
| Homologação | Executar e aceitar HO | Resultados por etapa, motivo de falha, reteste e histórico |
| Validação PROD | Executar após implantação confirmada | Cópia completa do cenário selecionado, resultados independentes e aceite PROD |

Fluxo não é sinônimo de funcionalidade. Marketplace → Compra pode ter fluxos diferentes: Compra com entrega, Retirada e Cancelamento. Um fluxo pertence a uma frente e pode atender uma funcionalidade específica ou todas daquela frente. Cenários usam uma cópia das etapas desse fluxo. Uma trilha referencia cenários; não é mais uma hierarquia de etapas.

## Comportamento de formulário

1. Identificar frente, funcionalidade e nome do cenário.
2. Escolher um fluxo compatível ou escrever passos específicos. Prévia numerada sempre mostra o que será executado.
3. Ao escolher um modelo, o escopo pode usar todas as etapas ou terminar em uma etapa específica do próprio modelo. Nenhum produto recebe Desembolso automaticamente.
4. Condições, resultado esperado, atributos, cobertura e componentes são seções opcionais. Campos de crédito aparecem apenas no contexto configurado.
5. Falha durante execução não altera o escopo: a etapa fica com falha e as seguintes continuam pendentes. Escopo parcial é uma decisão do plano; não é uma forma de esconder uma falha.
6. Editar cenário mantém a cópia salva; selecionar um modelo novamente é uma adoção explícita da versão corrente. Sem atualização automática de cenários, HO ou PROD.

Exemplo: Marketplace → Compra → Compra com cartão → Adicionar ao carrinho / Efetuar pagamento / Confirmar pedido. Se pagamento falhar, o cenário continua com essas três etapas e a falha é registrada na segunda. CPR continua com suas etapas atuais e CPR Dollar pode ter outro fluxo.

As escolhas de UX seguem a recomendação de perguntar apenas o necessário e revelar seções pertinentes à tarefa: [GOV.UK: question pages](https://design-system.service.gov.uk/patterns/question-pages/). A divisão destas telas é uma decisão deste projeto, não uma prescrição do GOV.UK.

## Modelo documental proposto

| Coleção | Organização e referências |
| --- | --- |
| `delivery_definitions` | Um documento por frente (`scenario_front`) e por funcionalidade (`scenario_functionality`); funcionalidade usa `parentId` da frente. Vocabulário e atributos têm seus próprios documentos. |
| `delivery_test_flows` | Um documento por fluxo, `frontId`, `functionalityId` ou null, nome normalizado, ativo, versão e array ordenado de até 50 etapas `{id, name}`. |
| `delivery_scenarios` | Referências à frente/funcionalidade e ao fluxo de origem, versão de origem e cópia de etapas com IDs. Condições, resultado esperado, componentes e atributos pertencem ao cenário. |
| `delivery_trails` | Referências a cenários; não embutir o catálogo inteiro. |
| `delivery_ho_plans` | Snapshots de cenários: contexto, versão, etapas, resultados e aceite da revisão. |
| `delivery_changes` | Snapshots PROD independentes, com origem em HO e resultados inicialmente pendentes. |
| `delivery_audit_events` | Histórico paginado de alterações e resultados; sem array ilimitado dentro do fluxo/plano. |

Frentes/funcionalidades usam IDs estáveis: renomear um cadastro não quebra os vínculos. Nomes são rótulos e os rótulos históricos ficam nos snapshots. Etapas têm IDs próprios preservados ao reordenar ou corrigir texto; remover e adicionar uma etapa semanticamente diferente cria um novo ID.

Embuto as etapas porque são pequenas, limitadas e consultadas/atualizadas com o fluxo. Referencio catálogos reutilizáveis e guardo snapshots nas execuções porque os resultados precisam conservar o significado original. Essa combinação segue os critérios de [embedding do MongoDB](https://www.mongodb.com/docs/manual/data-modeling/embedding/) e [versionamento de documentos](https://www.mongodb.com/docs/manual/data-modeling/design-patterns/data-versioning/). A decisão concreta depende também das consultas e volumes do hospedeiro.

## Regras de API e persistência

- Sessão fornece workspace e ator; validar permissão e módulo/capacidade no servidor.
- Validar que frente e funcionalidade existem no mesmo workspace e que o fluxo escolhido é ativo e compatível.
- Nome de fluxo único por workspace + frente + funcionalidade, normalizado; índices correspondentes em `collections.json`.
- Entre 1 e 50 etapas, IDs únicos e nomes únicos no fluxo; rejeitar nomes vazios ou longos. MongoDB valida estrutura; a API valida relações e unicidade dentro do array.
- Edição usa `expectedVersion`, atualização condicional e evento de auditoria. Retry de escrita usa idempotência conforme o contrato existente.
- Inativar impede novas seleções, mantendo consultas e snapshots; nenhuma exclusão em cascata.
- Adotar nova versão do fluxo muda somente o cenário editado. Alterar plano HO invalida o aceite, conforme as regras existentes. GMUD implantada/encerrada não é reaberta por mudança do catálogo.
- Definições usam unicidade por workspace + kind + parentId + nameNormalized. Assim, duas frentes podem ter uma funcionalidade chamada Compra. Em banco com o índice antigo `definition_unique`, primeiro preencher `nameNormalized` e validar conflitos; depois substituir o índice por migration revisada. Não manter a unicidade global antiga de funcionalidades.
- Adaptadores convertem IDs JSON para ObjectId; omitem referências opcionais e versões de origem desconhecidas, em vez de gravar strings vazias ou null onde o schema exige ID/inteiro. `functionalityId` de fluxo usa null explícito para escopo de toda a frente.
- Validar migrações em MongoDB real antes do rollout; o blueprint é preparação, não evidência de persistência funcional.

## Compatibilidade e releases

A mudança integra R2 (catálogo) e a captura de origem integra R3/R6. Todos os status reais continuam pendentes. Referências: [plano](../integration/implementation-plan.json), [schemas](../integration/mongodb/collections.json), [API](../integration/contracts/api.json).

No protótipo, a organização ainda usa nomes e o localStorage; isso não é o modelo de identidade do backend. As chaves antigas foram preservadas e foi adicionada `issueflow.testflows.v1`. O fluxo global antigo fica em configuração avançada para compatibilidade; novos cadastros usam modelos por frente ou passos próprios. O modelo legado Crédito é apresentado sem modificar cenários existentes. Modelos salvos passam a evoluir independentemente das etapas globais antigas.

Na migração real, mapear nomes para IDs explicitamente, copiar arrays existentes sem recalcular etapas ou resultados e registrar ambiguidades. `delivery_definitions.kind = test_flow` é a representação antiga; migrar esses documentos explicitamente para `delivery_test_flows` quando houver origem aprovada, sem apagar histórico nem aplicar seed automático.
