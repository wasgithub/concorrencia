# Retorno das telas de cenários e homologação

Em 21/10/2026, por solicitação do usuário, o cadastro de cenários e a montagem/execução do plano de HO voltaram à interface do commit `b6e77e9`.

- Cadastro anterior de cenários, dimensões, etapas e trilhas.
- Seleção de cenários e trilhas para HO sem a configuração de escopo, executor, revisor e referências Jira na tela do plano.
- Resultados por etapa e salvamento pelo botão original no topo.
- Removidos da tela de HO o salvamento adicional junto às etapas e a abertura automática do primeiro cenário.

Foram preservados a organização dos módulos, configurações, tela independente de fluxos, documentos e preparação da integração, além dos campos já persistidos. O cadastro antigo aceita etapas próprias de cenários existentes e atualiza a sequência ao modificar a etapa final, para manter compatibilidade com os registros criados antes da reversão. Não houve limpeza de dados do navegador.

As funções de armazenamento mais recentes continuam disponíveis para compatibilidade; isso não significa que seus controles estejam presentes nas telas restauradas. A proposta em `plano-implementacao/07-escopo-por-us-e-jira.md` permanece como referência, mas a interface descrita nela foi retirada do plano de HO.

O runner `node tests/run-e2e.cjs` voltou às 12 suítes correspondentes ao fluxo anterior. Os testes experimentais de contexto, escopo, Marketplace e personalização permanecem como referência das funcionalidades retiradas e não são executados por esse runner. Os testes unitários continuam sendo executados com `node --test tests/*.test.cjs`.

Backup anterior à reversão: `/tmp/concorrencia-antes-reversao-20261021-103133.tar.gz`. O arquivo está fora do projeto e deve ser tratado como cópia temporária.

## Validação após a restauração

- `node --test tests/*.test.cjs`: 31 testes aprovados.
- `node tests/run-e2e.cjs`: 12 suítes aprovadas na execução final, incluindo cadastro, HO, aprovação, deploy, aceite PROD, encerramento, rollback e concorrência entre abas.
- Verificação adicional no servidor da porta 8080: editar um cenário com tipo API e etapas próprias preserva tipo e contexto, e salva corretamente a alteração da etapa final.
- O teste de ações da lista passou a aguardar o título da página de HO estar preenchido antes de verificá-lo, evitando a leitura prematura durante a navegação.
