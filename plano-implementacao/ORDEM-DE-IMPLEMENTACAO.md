> Evolução vigente: [cadastro por frente e seleção de fluxo](../docs/cadastro-cenarios-por-frente.md). A seleção de fluxo no cenário foi adicionada após a revisão anterior; referências antigas a biblioteca exclusivamente independente estão superadas nesse ponto. Escopo/revisor por US continua fora desta alteração.

# Módulos e ordem de implementação

Referência vigente em 21/10/2026. O aceite desta revisão é **local, sem conexão com banco real**: regras JavaScript, telas em navegador isolado, persistência local e contratos MongoDB com adaptadores simulados. A integração no sistema hospedeiro permanece pendente; os IDs históricos das fases são preservados.

## Ordem para subir por partes

| Ordem | Módulo / ID | Funcionalidades | Telas | Nova flag |
| --- | --- | --- | --- | --- |
| 1 | Testes / `02-catalog` | Cadastrar/editar/inativar cenários; garantia, cobertura, componentes, dimensões e etapas; montar trilhas; configurar etapas/dimensões; seleção de fluxos por frente com cópia de etapas e versão | `testes.html`, `fluxos.html`, `configuracoes.html` | `quality` |
| 2 | Entregas / `01-features` | Cadastrar/editar features/issues, equipe, componentes, ambiente e datas; consultar e filtrar | `index.html` | `delivery` |
| 3 | Homologação / `03-homologation` | Vincular cenários/trilhas à issue; validar cada etapa; registrar falha/motivo e reteste; concluir pendências em lote; aceite do PO e histórico | `homologacao.html`, `validacao-ho.html` | `homologation` |
| 4 | Preparação GMUD / `04-changes` | Vincular issues homologadas, definir janela, checklist, freeze e cenários completos para PROD | `changes.html` | `gmud` |
| 5 | Aprovação e agenda / `04b-approval` | Revisar pré-requisitos; aprovar com exceção justificada quando aplicável; rejeitar/reprogramar; consultar agenda e agir pela modal | `changes.html`, `gmud-timeline.html` | `approval` |
| 6 | Implantação e PROD / `05-production` | TL registra implantação e versão/commit/tag; PO valida etapas e motivo de falha; aceite PROD; encerramento ou rollback; nova GMUD para nova versão da mesma issue | `changes.html`, `producao.html`, `gmud-timeline.html` | `production` |
| Opcional após 2 | Planejamento / `06-calendars` | Calendário HO, concorrências e detalhes; pode funcionar sem Testes/HO/GMUD | `timeline.html` | `planning` |

As flags anteriores permanecem ligadas na sequência principal. Dependências: HO exige Entregas e Testes; GMUD exige HO; aprovação exige GMUD; PROD exige aprovação. Planejamento exige somente Entregas. Configurações são compartilhadas e acompanham as capacidades liberadas, sem uma release operacional separada.

**Agora:** somente `quality=true`; demais flags desligadas. Os testes de fases futuras usam contextos isolados de navegador, sem habilitá-las no perfil pessoal ou apagar registros.

## Critério local de cada módulo

| Módulo | Percurso e proteção verificados |
| --- | --- |
| Testes | Catálogo independente de issues; cenário/trilha/fluxo, filtros, persistência e erros de gravação; referência de trilha impede exclusão destrutiva |
| Entregas | Cadastro, edição, filtros e ações; sem liberar HO apenas por habilitar Entregas e Testes |
| HO | Plano não vazio; resultados por etapa; falha exige motivo; reteste explícito; ação em lote preserva N/A/falhas; aceite e snapshot histórico; alteração invalida aceite corrente |
| Preparação GMUD | Cenários PROD e prontidão HO; resposta Não conta como checklist respondido; justificativa de exceção; freeze; ações de aprovação/deploy bloqueadas antes da fase |
| Aprovação | Mesmas regras na gestão e calendário; pré-requisitos, responsável e motivo; reprogramação/rejeição/não realização; comandos anteriores ao deploy não alteram subida já realizada |
| PROD | Versão obrigatória na confirmação; testes por etapa e motivos; aceite antes de encerrar; rollback preserva resultados; nova GMUD da mesma issue; finalizadas protegidas |
| Planejamento | Navegação, calendário, conflitos e estados; dependência mínima sem habilitar módulos futuros |
| Liberação gradual | Perfil inicial Testes e combinações por fase; navegação e ações bloqueadas quando capacidade está desligada, inclusive em registros legados |

Evidências e problemas corrigidos: [relatório local](../integration/releases/all-phases/validacao.md). Execução reproduzível: `node tests/run-e2e.cjs`, que inclui `node --test tests/*.test.cjs` e as suítes de navegador da interface vigente. Não usa MongoDB. Testes de propostas retiradas da interface não contam como cobertura do fluxo atual.

## Collections e campos para implementação

| Fase | Novas collections previstas |
| --- | --- |
| 1 | `delivery_scenarios`, `delivery_trails`, `delivery_definitions`, `delivery_test_flows`; infraestrutura `delivery_audit_events`, `delivery_commands` |
| 2 | `delivery_features` |
| 3 | `delivery_ho_plans` |
| 4 | `delivery_changes`, `delivery_feature_locks`, `delivery_freezes` |
| 5 e 6 | Evolução dos documentos e regras já existentes; sem duplicar GMUD ou plano por tela |
| Planejamento | Usa os mesmos registros de Entregas; sem coleção de calendário duplicada |

`delivery_module_settings` é opcional: preferir flags já existentes no hospedeiro. Também reutilizar auditoria/comandos quando houver infraestrutura equivalente. A lista técnica por dependência e a cumulativa estão no [manifesto](../integration/releases/all-phases/manifest.json). Nomes de campos, tipos, objetos aninhados e índices: [dicionário completo](../integration/releases/all-phases/campos.md). Contratos: [API](../integration/contracts/api.json) e [schemas](../integration/mongodb/collections.json).

## Fluxo operacional completo após liberar as seis fases

1. Cadastrar cenários e montar trilhas reutilizáveis.
2. TL cadastra a issue e seus componentes/equipe/datas.
3. Selecionar cenários para HO; executar etapas, corrigir falhas e retestar; PO dá aceite.
4. TL cria GMUD, associa a issue, responde checklist e seleciona cenários completos de PROD.
5. Gerência revisa e aprova a subida; reprograma se necessário.
6. Após implantação externa, TL registra a subida com a referência da versão. O sistema não executa pipeline.
7. PO valida as etapas de PROD, sem upload de evidências. Falhas mantêm motivo/etapa no histórico.
8. Com aceite PROD, encerrar com sucesso. Se houver rollback, registrar o motivo e preservar a tentativa; correção com outro código usa nova GMUD vinculada à mesma issue.

Aceite HO, aprovação da subida, implantação, aceite PROD e encerramento continuam estados distintos.

## O que não entra como funcionalidade pronta

- Escopo/revisor por US na HO continua proposta futura. A seleção de fluxo no cadastro de cenário já faz parte desta evolução, com snapshot de etapas e versão.
- `07-migration`: eventual importação explícita e consolidação, não um módulo operacional nem importador implementado. Cada fase já exige sua regressão.
- Backend, autenticação, permissões e integração MongoDB: implementar no hospedeiro por fase, reutilizando sua infraestrutura. Os testes locais de contrato não são prova de persistência real.

Antes de implementar cada fase no hospedeiro, seguir [IMPLEMENTAR_NO_SISTEMA.md](../IMPLEMENTAR_NO_SISTEMA.md). Entregar frontend, backend e regras do servidor juntos. Não habilitar a fase seguinte automaticamente nem marcar integração concluída só porque o protótipo passou nos testes locais.
