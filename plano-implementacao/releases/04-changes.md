# R4 — GMUD: preparação

Status: **pendente no sistema real**.

- ID canônico: `04-changes`.
- Dependências: 03-homologation
- Flags: gmud (capacidade de preparação).
- Referência do protótipo: changes.html; modules/changes/; shared/testing/
- Coleções propostas: delivery_changes; delivery_feature_locks; delivery_freezes

## Jornada entregue

TL cria GMUD, vincula entregas, responde checklist e escolhe cenários completos de HO para PROD.

## Frontend e backend da release

Cadastro da GMUD, time/TL, RDM único, janela, checklist, seleção de snapshots completos e vínculo exclusivo da entrega com GMUD ativa.

Adaptar as operações de [API](../../integration/contracts/api.json) e [comandos](../../integration/contracts/operations.md) ao sistema hospedeiro. Reutilizar conexão MongoDB, autenticação, usuários, equipes, workspace e UI existentes. Cada escrita exige autorização, isolamento de workspace, revisão esperada, idempotência quando aplicável e histórico no servidor.

## Limite de escopo

Não publicar aprovação nem confirmação de implantação antes das releases correspondentes.

## Critérios de aceite

- [ ] Criar e vincular features sem outra GMUD ativa.
- [ ] Checklist considera resposta Não válida; exceção incompleta explícita e auditada.
- [ ] Preparar cenários PROD a partir de HO; não liberar confirmação da subida com módulo PROD desativado.

## Testes específicos

Resposta Não conta como respondida; falta de resposta é pendência; exceção exige autorização e motivo; plano PROD vazio bloqueia aprovação futura; duas GMUDs simultâneas não podem capturar a mesma entrega.

Também executar testes de permissão, isolamento entre workspaces e persistência após recarregar/reabrir sessão. Os testes de navegador do protótipo são referência de comportamento; criar/adaptar a cobertura para a stack real.

## Liberação e reversão

Seguir [o procedimento comum](../03-validacao-e-liberacao.md). Habilitar somente capacidades desta release para o piloto. Desativar a capacidade bloqueia novos comandos e mantém histórico; não reverter dados destrutivamente. Com execução em andamento, preservar acesso de consulta e o procedimento operacional para concluir ou registrar rollback.

## Registro de conclusão

Preencher [o acompanhamento](../04-acompanhamento.md), anexar evidências dos testes e atualizar o status de `04-changes` em [implementation-plan.json](../../integration/implementation-plan.json) apenas após frontend, backend e persistência reais validados.
