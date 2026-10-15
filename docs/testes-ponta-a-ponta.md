# Testes ponta a ponta

## Executar

```sh
node tests/run-e2e.cjs
```

O runner inicia um servidor HTTP local em uma porta livre, executa as suítes em sequência e fecha o servidor ao terminar. O navegador usa contextos isolados: não limpa nem modifica o navegador pessoal. O protótipo continua HTML/CSS/JavaScript puro.

A automação precisa de Playwright e um navegador no ambiente de testes. O runner usa uma instalação já disponível, inclusive no cache npm local, e detecta Chrome no macOS. Não instala pacotes. Se o ambiente exigir caminho explícito:

```sh
PLAYWRIGHT_MODULE=/caminho/node_modules/playwright \
CHROME_PATH=/caminho/do/chrome \
node tests/run-e2e.cjs
```

`ISSUEFLOW_URL` permite usar um servidor existente. Sem essa variável, o runner usa seu próprio servidor e não depende do serviço em 8080. Os testes não exigem criar package.json ou instalar bibliotecas na aplicação.

## Relatórios

- `test-results/e2e/report.md`: resumo por suíte.
- `test-results/e2e/report.json`: status, duração e datas de execução.
- `test-results/e2e/*.log`: saída completa e erro da suíte, quando houver.

A pasta é ignorada pelo Git para não versionar resultados de cada execução. Falha em qualquer suíte retorna código 1; o runner continua as demais para reunir todos os resultados. Cada suíte tem timeout de 120 segundos.

## Cobertura

| Suíte | Validação |
| --- | --- |
| Unitários | Regras de snapshot, resultados, HO, PROD e preparação MongoDB |
| Ações de Features / Issues | Seis colunas compactas, detalhes completos, paginação/filtros, abertura da modal, acesso HO por teclado e mobile |
| Navegação | Menu, módulo expansível, página ativa, fila HO, histórico e mobile |
| Limpeza | Excluir issues/execuções e preservar cenários personalizados, trilhas e configurações |
| Homologação | Sugestões, filtros, seleção, cancelamento, trilhas, resultados, persistência e aceite |
| Seleção PROD | Cenário inteiro herdado de HO, plano independente e aprovação invalidada ao alterar |
| Bloqueios de fluxo | Checklist Não válido, pré-requisitos, revisão HO, janela e proteção de GMUD encerrada |
| Operação PO | Subida confirmada, bloqueio pré-deploy, falha/motivo, correção, aceite, encerramento e edição em abas antigas |
| Timeline de issues | Foco após deploy, rollback, sucesso e planejamento após reprogramação pré-deploy |
| Calendário de implantações | Estados, filtros, modais, aprovação, links, plano legado e tentativas separadas |
| Regressões de ciclo de vida | Liberação da issue encerrada, rollback imutável, rollback somente pós-deploy, nova tentativa, revisão concorrente HO, RDM única e status baseado em implantação real |
| Percurso completo pelas telas | Cadastro → HO → aceite → GMUD → checklist → aprovação → registro de deploy → PROD → encerramento; também replanejamento, rollback e nova GMUD para a mesma issue |

O percurso completo cria cinco entregas de demonstração em sua sessão isolada. No caso de rollback, também cria e encerra uma segunda GMUD para a mesma issue, compara a tentativa anterior integralmente e consulta ambas no calendário. O caso de replanejamento ocorre antes do deploy.

## Correções verificadas nesta ampliação

1. GMUD encerrada libera a issue para outra GMUD, sem apagar a tentativa concluída.
2. Rollback torna a tentativa antiga somente consulta, inclusive plano de PROD e checklist.
3. Registrar rollback exige subida realizada; aprovação sozinha não basta.
4. Depois do deploy, edição/reprogramação/exclusão da tentativa são bloqueadas. Para outra implantação, criar nova GMUD. Resultados continuam editáveis pelo PO até o aceite; rollback e encerramento continuam disponíveis nas fases adequadas.
5. Salvar/aprovar HO com uma aba antiga verifica a versão persistida do plano e bloqueia sobrescrita de alterações feitas pelo QA.
6. RDM duplicada é rejeitada, inclusive comparação sem diferença de caixa/espaços externos.
7. Issue só fica Em produção quando a GMUD registra implantação. Passar da data prevista não confirma deploy. Rollback possui resultado próprio.

## Dados de exemplo e limites

Executar a suíte não reescreve `modules/demo/examples.json`. Para regenerar a massa de exemplos explicitamente, execute apenas `tests/full-flow-browser.cjs` com `UPDATE_EXAMPLES=1` e as variáveis do navegador; a exportação mantém os cinco exemplos de referência, sem a tentativa adicional da regressão.

Os testes de navegador executam o protótipo e seu localStorage. Confirmar subida e registrar rollback simulam registros operacionais: não executam pipelines ou reversões. O teste MongoDB verifica o blueprint e o bootstrap com adaptador simulado; não conecta a um banco, não comprova validators/índices em uma instalação real e não valida autenticação ou permissões de um backend futuro.
