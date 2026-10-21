# R7 — Planejamento HO (opcional)

Status: **pendente no sistema real**.

- ID canônico: `06-calendars`.
- Dependências: 01-features
- Flags: planning.
- Referência do protótipo: timeline.html; modules/planning/; modules/features/
- Coleções propostas: delivery_features

## Jornada entregue

TL/QA visualiza períodos HO e conflitos por ambiente e componente antes de ajustar o planejamento.

## Frontend e backend da release

Projeção dos dados de entregas, filtros, conflitos e sugestões; alterações chamam os mesmos serviços de Entregas.

Adaptar as operações de [API](../../integration/contracts/api.json) e [comandos](../../integration/contracts/operations.md) ao sistema hospedeiro. Reutilizar conexão MongoDB, autenticação, usuários, equipes, workspace e UI existentes. Cada escrita exige autorização, isolamento de workspace, revisão esperada, idempotência quando aplicável e histórico no servidor.

## Limite de escopo

Calendário de GMUD já pertence à R5; esta release não é requisito para produção.

## Critérios de aceite

- [ ] Calendário de HO e concorrências como evolução opcional.
- [ ] Calendário de GMUD pertence ao módulo GMUD e usa seus mesmos registros.

## Testes específicos

Validar limites inclusivos, ambientes compartilhados/isolados e filtros; consulta não muda status; ajuste concorrente verifica revisão; flags e autorização iguais às telas de gestão.

Também executar testes de permissão, isolamento entre workspaces e persistência após recarregar/reabrir sessão. Os testes de navegador do protótipo são referência de comportamento; criar/adaptar a cobertura para a stack real.

## Liberação e reversão

Seguir [o procedimento comum](../03-validacao-e-liberacao.md). Habilitar somente capacidades desta release para o piloto. Desativar a capacidade bloqueia novos comandos e mantém histórico; não reverter dados destrutivamente. Com execução em andamento, preservar acesso de consulta e o procedimento operacional para concluir ou registrar rollback.

## Registro de conclusão

Preencher [o acompanhamento](../04-acompanhamento.md), anexar evidências dos testes e atualizar o status de `06-calendars` em [implementation-plan.json](../../integration/implementation-plan.json) apenas após frontend, backend e persistência reais validados.
