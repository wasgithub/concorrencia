# Aceite da R1 no sistema real

Todos os itens abaixo estão pendentes na integração. O E2E local não os conclui.

- [ ] Inspecionar stack, entidades de usuário/equipe/workspace, permissões, componentes de UI e conexão MongoDB existente.
- [ ] Ligar somente quality; esconder e bloquear módulos futuros no servidor e no frontend.
- [ ] Executar migration revisada somente nas collections do manifest; validar contra MongoDB real de homologação, sem dados demo automáticos.
- [ ] Validar tipos BSON, campos obrigatórios, limites, índices e repetição da migration sem destruição de dados existentes.
- [ ] Criar etapas e dimensões com IDs estáveis; criar cenário pelo alvo; conferir steps e origem/versão no MongoDB.
- [ ] Editar cenário, nome e componentes; conferir version/auditoria e que editar definições não muda snapshots existentes.
- [ ] Criar/editar trilha e arquivar cenário; tratar referências inativas sem perda de vínculo.
- [ ] Cadastrar frente, funcionalidade e fluxo; selecionar no cenário e validar escopo, referência pai-filho, versão e unicidade no workspace.
- [ ] Testar Marketplace sem atributos de crédito, configuração de escopo das dimensões e preservação/ampliação do snapshot salvo mesmo com modelo inativo.
- [ ] Dimensões explícitas, inclusive vazias, prevalecem sobre inferência pelo nome; limpar campos do montador não mantém nome automático antigo.
- [ ] Simular workspace trocado, usuário sem permissão, flag desligada e request contendo campos de auditoria falsos; bloquear.
- [ ] Simular dois editores na mesma version; somente o primeiro grava, segundo recebe 409 sem sobrescrever.
- [ ] Repetir comando com mesma Idempotency-Key/hash e com hash diferente; conferir resultado e ausência de duplicação.
- [ ] Simular falha entre entidade/evento/recibo: não pode haver gravação parcial.
- [ ] Testar nomes vazios, lista de etapas vazia, IDs repetidos, referências de outro workspace, limite de 50 etapas e 200 cenários/trilha.
- [ ] Testar busca, paginação, filtros, teclado/mobile, erro da API, retry e recarregamento sem perda de rascunho.
- [ ] Testar importação somente se autorizada, com relatório de legados/rejeitados e segunda execução idempotente. Não importar localStorage automaticamente.
- [ ] Executar testes do backend e E2E do hospedeiro contra persistência real; registrar evidências, versões e arquivos modificados.
- [ ] Atualizar progresso da fase 02-catalog apenas quando frontend/backend/MongoDB estiverem entregues, sem marcar mocks como integração concluída.
