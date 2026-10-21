# R8 — Consolidação e migração opcional de dados

Status: **pendente no sistema real**.

- ID canônico: `07-migration`.
- Dependências: 01-features, 02-catalog, 03-homologation, 04-changes, 04b-approval, 05-production
- Flags: flags dos módulos já entregues.
- Referência do protótipo: integration/; tests/; modules/demo/ apenas como referência
- Coleções propostas: Coleções dos módulos integrados, conforme migration aprovada

## Jornada entregue

Equipe executa regressão integrada e, se houver origem real aprovada, importa dados por procedimento rastreável.

## Frontend e backend da release

Mapeamento de origem, simulação, relatório de conflitos, importação explícita idempotente, reconciliação e regressão de todas as releases; testar cada release antes desta consolidação.

Adaptar as operações de [API](../../integration/contracts/api.json) e [comandos](../../integration/contracts/operations.md) ao sistema hospedeiro. Reutilizar conexão MongoDB, autenticação, usuários, equipes, workspace e UI existentes. Cada escrita exige autorização, isolamento de workspace, revisão esperada, idempotência quando aplicável e histórico no servidor.

## Limite de escopo

Não importar localStorage automaticamente nem levar seeds/exemplos para produção; migração de dados só se existir fonte aprovada.

## Critérios de aceite

- [ ] Importação explícita idempotente; sem seed automático.
- [ ] Revisar exemplos inconsistentes; não inventar aceites.
- [ ] Fluxo ponta a ponta com sucesso, falha, rollback e nova GMUD da mesma feature.

## Testes específicos

Importar duas vezes sem duplicar; conflitos não inventam aceites; restaurar backup em ambiente controlado; sucesso/rollback/nova tentativa completos; planejamento testado se habilitado.

Também executar testes de permissão, isolamento entre workspaces e persistência após recarregar/reabrir sessão. Os testes de navegador do protótipo são referência de comportamento; criar/adaptar a cobertura para a stack real.

## Liberação e reversão

Seguir [o procedimento comum](../03-validacao-e-liberacao.md). Habilitar somente capacidades desta release para o piloto. Desativar a capacidade bloqueia novos comandos e mantém histórico; não reverter dados destrutivamente. Com execução em andamento, preservar acesso de consulta e o procedimento operacional para concluir ou registrar rollback.

## Registro de conclusão

Preencher [o acompanhamento](../04-acompanhamento.md), anexar evidências dos testes e atualizar o status de `07-migration` em [implementation-plan.json](../../integration/implementation-plan.json) apenas após frontend, backend e persistência reais validados.
