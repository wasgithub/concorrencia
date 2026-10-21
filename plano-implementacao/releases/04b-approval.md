# R5 — GMUD: aprovação e agenda

Status: **pendente no sistema real**.

- ID canônico: `04b-approval`.
- Dependências: 04-changes
- Flags: gmud (capacidade de aprovação).
- Referência do protótipo: gmud-timeline.html; changes.html; modules/changes/
- Coleções propostas: delivery_changes; delivery_feature_locks; delivery_freezes

## Jornada entregue

Gerente consulta a agenda e abre a mesma modal da gestão para aprovar, rejeitar ou reprogramar.

## Frontend e backend da release

Aprovação no servidor com revisão esperada, HO aceita, plano PROD válido e checklist/exceção; calendário com status objetivo e histórico; invalidação de aprovação quando conteúdo relevante mudar.

Adaptar as operações de [API](../../integration/contracts/api.json) e [comandos](../../integration/contracts/operations.md) ao sistema hospedeiro. Reutilizar conexão MongoDB, autenticação, usuários, equipes, workspace e UI existentes. Cada escrita exige autorização, isolamento de workspace, revisão esperada, idempotência quando aplicável e histórico no servidor.

## Limite de escopo

Com PROD desativado, manter apenas preparação/aprovação: confirmar implantação continua bloqueado.

## Critérios de aceite

- [ ] Gerente aprova somente com HO e plano PROD válidos.
- [ ] Calendário e gestão usam a mesma modal e regras.
- [ ] Reprogramar somente antes de deploy; sem confirmação de subida até habilitar PROD.

## Testes específicos

Negar aprovação com HO pendente ou plano vazio; testar exceção de checklist autorizada; mudanças invalidam aprovação; modal e gestão usam o mesmo comando; reprogramar só antes do deploy; falha de autorização não altera dados.

Também executar testes de permissão, isolamento entre workspaces e persistência após recarregar/reabrir sessão. Os testes de navegador do protótipo são referência de comportamento; criar/adaptar a cobertura para a stack real.

## Liberação e reversão

Seguir [o procedimento comum](../03-validacao-e-liberacao.md). Habilitar somente capacidades desta release para o piloto. Desativar a capacidade bloqueia novos comandos e mantém histórico; não reverter dados destrutivamente. Com execução em andamento, preservar acesso de consulta e o procedimento operacional para concluir ou registrar rollback.

## Registro de conclusão

Preencher [o acompanhamento](../04-acompanhamento.md), anexar evidências dos testes e atualizar o status de `04b-approval` em [implementation-plan.json](../../integration/implementation-plan.json) apenas após frontend, backend e persistência reais validados.
