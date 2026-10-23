# R6 — Produção: implantação até encerramento

Status: **pendente no sistema real**.

- ID canônico: `05-production`.
- Dependências: 04b-approval
- Flags: production.
- Referência do protótipo: producao.html; modules/production/; modules/changes/; shared/testing/
- Coleções propostas: delivery_changes; delivery_feature_locks

## Jornada entregue

TL confirma implantação externa; PO valida etapas e aceita PROD; TL encerra ou registra rollback com motivo.

## Frontend e backend da release

Confirmação com referência da versão/release, testes por etapa, fila do PO, aceite PROD, encerramento e rollback auditados; não há execução de pipeline.

Adaptar as operações de [API](../../integration/contracts/api.json) e [comandos](../../integration/contracts/operations.md) ao sistema hospedeiro. Reutilizar conexão MongoDB, autenticação, usuários, equipes, workspace e UI existentes. Cada escrita exige autorização, isolamento de workspace, revisão esperada, idempotência quando aplicável e histórico no servidor.

## Limite de escopo

Não exigir upload de documentos; não reaproveitar a GMUD de rollback para uma versão diferente.

## Critérios de aceite

- [ ] TL confirma implantação externa com releaseRef.
- [ ] PO valida etapas e registra motivos; sem upload de documentos.
- [ ] Encerrar apenas após aceite PROD; rollback preserva resultados; nova versão gera nova GMUD.

## Testes específicos

Aprovada ainda não é implantada; só implantação confirmada libera testes; falha guarda etapa e motivo; encerramento exige aceite; rollback preserva resultados; terminal fica somente leitura; nova GMUD da mesma entrega aceita nova versão; retry idempotente não duplica eventos.

Também executar testes de permissão, isolamento entre workspaces e persistência após recarregar/reabrir sessão. Os testes de navegador do protótipo são referência de comportamento; criar/adaptar a cobertura para a stack real.

## Liberação e reversão

Seguir [o procedimento comum](../03-validacao-e-liberacao.md). Habilitar somente capacidades desta release para o piloto. Desativar a capacidade bloqueia novos comandos e mantém histórico; não reverter dados destrutivamente. Com execução em andamento, preservar acesso de consulta e o procedimento operacional para concluir ou registrar rollback.

## Registro de conclusão

Preencher [o acompanhamento](../04-acompanhamento.md), anexar evidências dos testes e atualizar o status de `05-production` em [implementation-plan.json](../../integration/implementation-plan.json) apenas após frontend, backend e persistência reais validados.
