# Escopo atual da primeira release

O pacote [Testes independentes](../../integration/releases/tests-first/README.md) prevalece para esta entrega. Consultar seus campos, API, manifesto e checklist. O conteúdo abaixo foi preservado como proposta de evolução; itens de cadastro genérico e execução não devem ampliar a R1 automaticamente.

# R2 — Qualidade: catálogo independente

Status: **pendente no sistema real**.

- ID canônico: `02-catalog`.
- Dependências: Somente a preparação R0; sem dependência de outro módulo funcional.
- Flags: quality.
- Referência do protótipo: testes.html; modules/test-catalog/; modules/settings/; shared/testing/
- Coleções propostas: delivery_scenarios; delivery_trails; delivery_definitions

## Jornada entregue

QA cadastra tipos, atributos, cenários e trilhas sem precisar cadastrar uma entrega.

## Frontend e backend da release

CRUD de cenários/trilhas e vocabulário; etapas com IDs estáveis; associação com componentes existentes; filtros; inativação e validações no servidor.

Adaptar as operações de [API](../../integration/contracts/api.json) e [comandos](../../integration/contracts/operations.md) ao sistema hospedeiro. Reutilizar conexão MongoDB, autenticação, usuários, equipes, workspace e UI existentes. Cada escrita exige autorização, isolamento de workspace, revisão esperada, idempotência quando aplicável e histórico no servidor.

## Limite de escopo

Não exigir PF/PJ, hipoteca ou qualquer domínio; não executar ferramentas de automação nesta release.

## Critérios de aceite

- [ ] Cenários e etapas com IDs estáveis.
- [ ] Trilhas e vínculo explícito com componentes.
- [ ] Snapshots não são atualizados por alterações posteriores do catálogo.
- [ ] Classificações e atributos configuráveis sem vínculo obrigatório com crédito.
- [ ] Passos próprios por cenário e snapshots independentes de HO/PROD.
- [ ] Catálogo disponível mesmo com Entregas, GMUD e PROD desativados.

## Testes específicos

Cadastrar autenticação API e cenário funcional com fluxos diferentes; filtrar; aplicar classificação própria; rejeitar IDs/etapas inválidos; inativar sem destruir histórico; operar com Entregas desligado.

Também executar testes de permissão, isolamento entre workspaces e persistência após recarregar/reabrir sessão. Os testes de navegador do protótipo são referência de comportamento; criar/adaptar a cobertura para a stack real.

## Liberação e reversão

Seguir [o procedimento comum](../03-validacao-e-liberacao.md). Habilitar somente capacidades desta release para o piloto. Desativar a capacidade bloqueia novos comandos e mantém histórico; não reverter dados destrutivamente. Com execução em andamento, preservar acesso de consulta e o procedimento operacional para concluir ou registrar rollback.

## Registro de conclusão

Preencher [o acompanhamento](../04-acompanhamento.md), anexar evidências dos testes e atualizar o status de `02-catalog` em [implementation-plan.json](../../integration/implementation-plan.json) apenas após frontend, backend e persistência reais validados.

## Frentes e funcionalidades

Configurações → Frentes e funcionalidades permite cadastrar áreas e seus fluxos. Cenários usam Frente, Funcionalidade, Classificação e Forma de execução, além de atributos opcionais. CPR atual é reconhecida como Crédito → CPR; CPR Dollar é uma funcionalidade separada e pode receber uma cópia adaptada pelo botão Duplicar. O campo legado Automática/Manual não é convertido em forma de execução: representa a classificação antiga de garantia.

Atributos do montador podem se aplicar a todas as frentes ou a uma frente específica. Os atributos legados de crédito ficam nessa frente. Outras frentes usam passos próprios, evitando herdar o fluxo de crédito. Filtros de Frente e Funcionalidade estão no catálogo e no seletor HO. Snapshots de HO/PROD guardam o contexto e mantêm etapas/resultados existentes. As novas definições de frente e funcionalidade devem usar IDs estáveis por workspace no sistema real; o protótipo usa nomes.

- [ ] Fluxos em tela própria, com etapas ordenadas por frente/funcionalidade e snapshots versionados; Marketplace não herda etapas de crédito.
