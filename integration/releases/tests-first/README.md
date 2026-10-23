> Evolução vigente: [cadastro por frente e seleção de fluxo](../../../docs/cadastro-cenarios-por-frente.md). A seleção de fluxo no cenário foi adicionada após a revisão anterior; referências antigas a biblioteca exclusivamente independente estão superadas nesse ponto. Escopo/revisor por US continua fora desta alteração.

# Release 1 — Testes independentes

Status: protótipo HTML/JS disponível; integração no sistema real **pendente**. Nenhum MongoDB foi conectado ou alterado.

## Escopo fechado

Entrada: `testes.html`. Flags: quality=true; delivery/gmud/production/planning=false. Configurações antigas do navegador não reabilitam módulos implicitamente: o perfil `tests-first-v1` exige uma escolha explícita em Configurações para liberar outras partes. Os cadastros existentes são preservados.

Nesta release, Testes significa **biblioteca de cenários e trilhas**, não uma campanha de execução. Não inclui OK/Falhou, aceite de HO, issue, deploy, GMUD, rollback, cobertura unitária ou sincronização Jira. Esses controles continuam nas releases posteriores. O Jira mantém testes específicos da US/TP e resultados técnicos da pipeline.

## Fluxo do usuário

1. Acessar **Testes → Cenários e trilhas**. Não cadastrar issue.
2. Conferir **Etapas do fluxo**. Adicionar etapas na ordem desejada e reordenar com as setas. A sequência clássica é compartilhada como modelo para novos cenários; editar o modelo não altera a sequência já copiada nos cenários existentes.
3. Conferir **Dimensões do montador**. Manter atributos/opções como Pessoa=PF/PJ, Linha=CPR, Garantia=Hipoteca, ou atributos próprios. São opcionais. Usar o montador ou escrever o nome do cenário.
4. Clicar **Novo caso**, informar nome, **Tipo de garantia**, **Testar até**, cobertura e componentes alterados relacionados. Salvar. Não é necessário cadastrar componentes em outro módulo; são identificadores de texto neste protótipo e devem reutilizar o catálogo do hospedeiro, se existir.
5. Buscar por nome/componente, filtrar por cobertura, garantia e somente ativos. Editar, desativar e reativar; recarregar para conferir persistência.
6. Em **Trilhas de testes**, informar nome, marcar cenários e **Salvar trilha**. Uma trilha é um conjunto reutilizável, por exemplo “Regressivo CPR PF”. Não é execução nem comprovação de teste realizado.
7. Editar a trilha para incluir/retirar cenários. Cenários inativos já vinculados permanecem identificáveis para manutenção; não selecionar inativos em novas trilhas no backend. Cenários referenciados não podem ser removidos pelo protótipo; desativar preserva o vínculo.
8. Acessar **Biblioteca de fluxos** para cadastrar frente, funcionalidade e sequência de etapas. No cenário, selecionar Frente → Produto/funcionalidade → Fluxo. Marketplace/Site usam etapas próprias; garantia/PF/PJ de crédito não aparecem por padrão. A edição pode manter o snapshot salvo, mesmo após alteração/desativação do modelo. Campos específicos são configurados em Dimensões → Aplicar em.

## Pacote para o sistema real

- `manifest.json`: flags, ordem da entrega e allowlist das collections desta release.
- `campos.md`: dicionário definitivo, tipos, obrigatoriedade e mapeamento tela → BSON.
- `api.json`: endpoints, comandos, campos aceitos, filtros, erros e permissões desta release. Complementa o contrato geral, prevalecendo para o escopo da R1.
- `../../mongodb/collections.json`: validators e índices canônicos; não duplicar schemas em outro arquivo.
- `apply-schema.cjs`: wrapper que limita a migration às seis collections da R1. Importar e adaptar na migration do hospedeiro; não executar automaticamente.
- `exemplos.json`: exemplos em Extended JSON, não seed nem massa para importar automaticamente.
- `validacao.md`: resultado dos testes do protótipo e limites da evidência.
- `checklist.md`: critérios para validar a integração real, incluindo backend/MongoDB.

Começar por esta release (`02-catalog`) antes de Entregas (`01-features`). Os IDs históricos das fases são mantidos para compatibilidade; o manifesto define a ordem. O módulo de testes não depende de features, planos HO, GMUD ou produção. Não instalar outro banco, framework, autenticação ou conexão.

## Regras de implementação

Usar workspace e usuário autenticado do hospedeiro. Não confiar em IDs de workspace recebidos no body. Consultas e alterações sempre incluem workspaceId; referências precisam existir no mesmo workspace. Usar capacidades de leitura/escrita do sistema, permitindo DEV/PO/TL participarem da qualidade sem QA obrigatório. Não inventar uma entidade QA.

Toda alteração recebe expectedVersion, quando aplicável, e Idempotency-Key. Transações com entidade, evento e recibo exigem MongoDB em replica set/cluster compatível ou infraestrutura transacional equivalente já disponível; validar isso no hospedeiro antes de aplicar a migration. Servidor compara e incrementa version, devolve 409 em conflito, e registra entidade + evento + recibo na mesma transação. Reusar implementação de auditoria/idempotência do sistema quando disponível, mapeando estes contratos em vez de duplicar infraestrutura. Índices únicos complementam a validação de duplicatas. Nenhuma execução de pipeline ou efeito externo dentro da transação.

No sistema real, usar arquivamento active=false. Não implementar DELETE destrutivo da tela de demonstração. Trilhas referenciam cenários; snapshots de etapas ficam embutidos, limitados a 50. Versão é inteiro técnico, não rótulo de negócio. Não usar nome de etapa como chave de resultado futura.

## Limites e diferença entre protótipo e produto

O protótipo continua em localStorage, com IDs locais e nomes de etapas, sem autenticação. E2E no navegador valida interface e persistência local; **não valida MongoDB, API, permissões ou transações reais**. A integração permanece pendente até cumprir o checklist contra o hospedeiro.

A configuração de módulos do protótipo não é autorização. No hospedeiro, a flag quality e as permissões devem ser aplicadas também no servidor, inclusive em URLs/endpoints diretos. Não migrar os valores da demonstração automaticamente. Nenhuma evidência/documento faz parte da R1.

Referência técnica conferida em 21/10/2026: [validação de schema](https://www.mongodb.com/docs/manual/core/schema-validation/), [atomicidade e comparação de versão](https://www.mongodb.com/docs/manual/core/write-operations-atomicity/), [índices únicos](https://www.mongodb.com/docs/manual/core/index-unique/). O desenho de domínio acima é específico deste projeto.
