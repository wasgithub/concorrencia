# IssueFlow

Abra `index.html` no navegador, sem instalar dependências.

## Changes / RDM e testes

Abra `changes.html` para compor uma change com issues de uma ou mais squads, definir o time responsável e acompanhar aprovação, reprogramação, rejeição e execução com histórico. Ao vincular issues ou reprogramar a change, as datas de produção e abertura da CHANGE das issues são atualizadas. O painel também oferece calendário de freeze e checklist editável. Issues e Calendário exibem o status da change vinculada.

Abra `testes.html` para cadastrar casos reutilizáveis, definir o tipo de garantia (automática ou manual), cobertura e etapa final do teste, e editar as etapas do fluxo e as dimensões do montador de nomes. Na change, use “Selecionar do catálogo” ou monte um cenário avulso para escolher os testes daquela implantação. O plano mantém uma cópia dos cenários e do fluxo. Changes é usada para selecionar os testes; os resultados por etapa são preenchidos pelo PO em Validação de PROD, sem documentos ou evidências.

`tests-store.js` compartilha catálogo, etapas e dimensões entre as páginas de Changes e Testes. Os dados ficam no localStorage deste navegador. Na tela Issues, clique em **Testes de homologação** na issue. Clique em **Selecionar cenários** para abrir as abas **Sugeridos**, **Catálogo** e **Trilhas**. Busque e filtre por cobertura ou garantia, confira o contador de seleção e clique em **Adicionar ao plano** (ou **Adicionar trilha**). A seleção é mantida entre filtros e abas; cancelar não altera o plano. Use **Cenário avulso** para um teste específico. Abra os cenários do plano para informar resultados por etapa, responsável, pedido e evidências; clique em **Salvar plano e execução**. Para aprovar, o PM/PO informa nome e parecer; todos os cenários precisam estar OK ou N/A. Alterações posteriores invalidam o aceite e ficam registradas no histórico.

As trilhas são cadastradas na tela Testes: informe um nome, selecione os cenários e salve. Aplicar uma trilha cria cópias dos casos ativos no plano da issue. Mudanças posteriores no catálogo, trilhas ou etapas não alteram as etapas das novas execuções já criadas.

Na change, abra os cenários e use **Escolher testes de PROD a partir de HO**: apenas cenários OK de issues vinculadas com homologação concluída e aceita ficam disponíveis. Escolha o subconjunto necessário em produção. Resultados, pedido e evidências começam vazios, preservando os registros de HO e a origem issue/cenário. Após o TL confirmar a subida realizada, o PO acessa **Validação de PROD**, conclui os testes e registra o aceite. O TL então encerra a GMUD pelo bloco da agenda. Esse aceite é separado da aprovação para subir. Após a subida, o plano fica somente para consulta; uma nova janela exige reprogramação e nova validação.

Os nomes dos validadores são informados manualmente; não há autenticação nem sincronização entre navegadores. A marcação manual “Validado em HO” dos cenários antigos continua disponível, mas não equivale ao aceite formal da issue.

Cadastro de issues, busca, filtros, indicadores, botão para ver componentes, alertas de concorrência e exportação JSON. Registros salvos no localStorage. `issues.json` contém 20 exemplos; `app.js` inclui a mesma carga para funcionar sem servidor. Novos exemplos são adicionados aos registros locais sem substituir cadastros existentes.

## Ambientes e concorrência

- Homologação e Homologação 2 compartilham o backend; mover uma issue de backend entre eles não elimina conflitos.
- Os frontends são separados: o mesmo frontend só concorre dentro do mesmo ambiente.
- Efêmero é tratado como isolado dos outros ambientes; issues nele ainda concorrem entre si.
- Intervalos de homologação incluem ambas as datas de limite.
- Componentes com prefixo `web-`, `frontend` ou `front-` são frontend; os demais são backend. A classificação aparece nos detalhes.

Issues com exatamente um componente frontend recebem sugestão de Homologação 2, desde que o componente esteja livre naquele ambiente durante todo o período. Se ocupado, a tela informa as issues que impedem a sugestão. No cadastro, o botão seleciona o ambiente; nos detalhes de uma issue já cadastrada, o botão atualiza o ambiente e recalcula os conflitos.

A exportação baixa os dados atuais, sem alterar automaticamente o JSON original. O status de entrega usa a data local do navegador.

## Calendário de entregas

Abra `timeline.html` ou use o menu Calendário. A visão mensal mostra períodos de homologação em barras, hachuras nos dias concorrentes e marcadores verdes de produção. Use os controles de mês e os filtros de ambiente, squad, componente ou concorrências. Clique nas issues, barras, marcadores ou cartões de concorrência para ver componentes, datas completas e a sugestão de Homologação 2. O botão para aplicar a sugestão atualiza o registro no navegador e recalcula a visão. Os indicadores resumem o mês inteiro; os filtros afetam as linhas e os cartões.

`issues-store.js` contém os exemplos e as regras compartilhadas pelas duas telas.

## Datas de implantação

Nos exemplos, produção/implantação ocorre 3 dias úteis depois do fim da homologação (segunda a sexta, sem feriados). A CHANGE/GMUD abre 3 dias corridos antes da produção. No formulário, informar o fim da homologação sugere ambas as datas; alterar a produção recalcula a CHANGE. As datas podem ser ajustadas manualmente. A produção pode acontecer depois do fim da homologação. Datas antigas dos exemplos já salvos são migradas, preservando ajustes locais.

## Sugestões por progresso da homologação

Apenas concorrências diretas com início anterior entram na decisão. O progresso usa dias corridos transcorridos desde o início, dividido pela duração inclusiva da homologação concorrente.

- Antes de 50% em todas as anteriores: sugerir início conjunto com a concorrência direta mais cedo.
- A partir de 50% em qualquer anterior: aguardar o término das concorrências e buscar uma janela livre. O intervalo proposto é conferido contra todas as issues; se houver conflitos futuros, avança novamente até ficar livre.

A duração é preservada. Produção ocorre 3 dias úteis depois do fim sugerido; CHANGE/GMUD, 3 dias corridos antes da produção. Os grupos visuais separam janelas de início propostas dentro das relações de concorrência, evitando colocar toda a cadeia no mesmo começo. Detalhes e cartões mostram o percentual que motivou a decisão. Sugestões não alteram os registros. A alternativa de início conjunto ainda requer combinar componentes entre squads; conflitos novos ou restantes são informados.

A sombra representa a própria issue nas datas propostas e informa com quais issues começaria ou por quais aguardaria. Filtros ocultam linhas sem remover concorrências da análise.

As janelas sugeridas são ordenadas dentro de cada cadeia de concorrência, mantendo demandas relacionadas próximas (por exemplo, ISS-1050 e ISS-1051). O calendário inclui dias anteriores ao mês selecionado quando necessários para mostrar o início completo de homologações e sugestões. Uma faixa de meses e o intervalo exibido distinguem os dias de contexto, em tom discreto. Indicadores e seleção de issues continuam relativos ao mês selecionado.

## Organização para ajustar concorrências

A visão prioriza blocos de issues conectadas por conflitos de componentes, sem separar a rede por datas sugeridas. Blocos com mais relações aparecem primeiro; issues sem conflitos ficam em um bloco próprio. Dentro de cada rede, a ordenação reduz a distância entre pares diretamente concorrentes. O seletor de blocos permite focar uma rede e filtra também os cartões e sugestões. “Destacar concorrências” enfatiza a issue e apenas seus vizinhos diretos, reduzindo a opacidade das demais; isso evita interpretar todo o bloco como concorrência de todos contra todos. Datas continuam visíveis nas barras e sugestões, sem definir a organização global.

## Verificação das regras de testes

Execute `node --test tests/test-plans.test.cjs` para verificar isolamento entre HO e produção, conclusão por etapa, persistência e preservação das etapas de execuções já criadas.

## Sugestões por componente

Em **Testes → Novo caso / Editar**, informe os **Componentes cobertos**, separados por vírgulas. Os nomes existentes aparecem como opções. Um cenário pode cobrir vários componentes e um componente pode ter vários cenários.

Em **Issues → Testes de homologação**, as sugestões cruzam os componentes alterados da issue com esses vínculos e mostram quais componentes motivaram cada indicação. Em **Selecionar cenários → Sugeridos**, marque os cenários desejados e clique em **Adicionar ao plano**; nada é incluído automaticamente. Componentes sem cobertura cadastrada aparecem explicitamente. O cruzamento usa o nome completo, ignorando maiúsculas/minúsculas e espaços nas extremidades. Casos inativos não são sugeridos e casos já incluídos não são duplicados. Os cenários antigos continuam disponíveis no catálogo, sem vínculos presumidos.

Para validar a interface de homologação em um navegador real, execute `node tests/homologacao-browser.cjs` com Playwright disponível. O teste usa `http://127.0.0.1:8080` (ajustável por `ISSUEFLOW_URL`) e um contexto de navegador isolado, sem modificar os registros do navegador pessoal.

A janela **Selecionar cenários** permite combinar filtros de etapa final (**Testar até**), cobertura, modalidade da garantia (automática/manual) e dimensões: perfil, pessoa (PF/PJ), linha, garantia (Hipoteca, Aval etc.) e variação. Os filtros valem para Sugeridos e Catálogo; **Limpar filtros** não apaga a seleção. Casos antigos são classificados pelos segmentos explícitos do nome; valores ausentes aparecem como **Não informado**. Ao editar um caso no catálogo, as dimensões passam a ser gravadas separadamente do nome.

A seleção de HO para PROD abre uma janela própria, agrupada por issue, com checkboxes, busca, filtro por issue e contador. Marque os cenários e confirme em **Adicionar ao plano de PROD**; depois clique em **Salvar cenários**. Cenários indisponíveis permanecem visíveis com o motivo (sem aceite, incompletos ou já adicionados). **Consultar HO** é uma ação secundária que abre outra aba; cancelar a seleção não altera o plano. O teste `tests/production-picker-browser.cjs` valida esse percurso com Playwright em um contexto isolado.

Na execução de HO, abra um cenário e use **Marcar fluxo como OK** para preencher todas as etapas aplicáveis até a etapa final, substituindo os resultados anteriores desse cenário. As etapas continuam editáveis individualmente. A ação atualiza o progresso, invalida um aceite anterior e precisa ser gravada em **Salvar plano e execução**.

Cenários importados de HO para PROD mantêm o fluxo completo e a etapa final de HO, sem redefinir a configuração. Na tela Validação de PROD, as etapas ficam abertas para registrar Pendente, OK, Falhou ou N/A; o resultado geral é calculado pelas etapas. **Marcar fluxo como OK** preenche as etapas de uma vez. A execução de PROD começa pendente e os registros de HO são preservados.

Ao marcar uma etapa como **Falhou**, preencha **Motivo da falha** e clique em **Salvar andamento** na Validação de PROD. As transições de resultado são registradas com cenário, etapa, horário, responsável informado e motivo no histórico da change, inclusive quando uma falha é corrigida depois. Um motivo é obrigatório para salvar uma falha, inclusive se ela tiver sido corrigida na mesma sessão.

Se a subida tiver sido revertida operacionalmente, use **Registrar rollback** no plano de testes de PROD ou nas ações dos detalhes da change (disponível nas fases Aprovada e Executada). Selecione a origem, informe responsável, motivo e resultado da reversão. A confirmação salva os testes, registra uma cópia dos resultados no histórico e muda a change para **Rollback realizado**, invalidando eventual aceite de produção. As issues ficam disponíveis para uma nova change. O botão registra o fato; não executa rollback nos sistemas. Nos detalhes, **Histórico → Rollback realizado → Ver resultados preservados no rollback** mostra o cenário, etapa e motivo que foram registrados.

## Fluxo do TL, time executor e PO

1. **TL → Changes / RDM:** cadastre a GMUD, indique TL e PO, vincule issues e selecione os cenários de produção.
2. **TL → Agenda de changes:** após a aprovação e a execução da subida pelo time responsável, clique em **Subida realizada** e confirme seu nome. Isso marca a GMUD como Executada e libera os testes para o PO. A data agendada não libera a validação automaticamente. Não é necessário registrar solicitação ou início de pipeline.
3. **PO → Validação de PROD:** acompanhe a aba inicial **Em acompanhamento** e as filas **Aguardando subida**, **Para validar** e **Finalizadas**, com busca, filtro de PO e período. Abra a GMUD, informe seu nome e valide as etapas dos cenários definidos pelo TL. Use **Marcar fluxo como OK** ou registre resultados individuais. Falhas exigem apenas um motivo em texto; não há campos de documento, upload ou evidência nessa tela.
4. **Salvar andamento** mantém resultados parciais e histórico; **Concluir validação** exige todos os cenários OK ou N/A e registra o aceite com nome e horário. Falhas de negócio ficam pendentes de decisão técnica; rollback continua na tela do TL/time executor.
5. **TL → Agenda de changes:** após o aceite, clique em **Encerrar GMUD**. Reprogramar uma subida já iniciada preserva os resultados anteriores no histórico e reinicia a execução técnica e a validação de produção para a nova janela.

A primeira versão usa os dados do navegador, sem autenticação ou compartilhamento entre computadores. Abas na mesma origem compartilham os registros; a validação detecta alterações concorrentes para evitar sobrescrever resultados. Testes do fluxo: `node --test tests/*.test.cjs` e, com Playwright, `node tests/po-workflow-browser.cjs`.

## Regras do fluxo simplificado

- A aprovação e a confirmação da subida exigem HO aceita para todas as issues vinculadas e ao menos um cenário de PROD. Casos avulsos exigem confirmação de validação em HO. A origem dos cenários importados é conferida novamente.
- Aprovação mostra o resumo do checklist, da HO e do plano. Checklist respondido não significa aprovado: respostas Não aparecem como itens de atenção. Aprovar com pendências ou atenção exige confirmação explícita e registra a exceção no histórico.
- Alterações na janela, nas issues, no checklist ou no plano de uma GMUD aprovada exigem nova aprovação. Ajustes de texto preservam a aprovação. Mudanças em HO após aprovar são detectadas ao confirmar a subida e exigem revisão.
- Changes seleciona o plano; Validação de PROD executa os testes. Após a subida, o plano não pode ser editado. O PO pode corrigir e retestar falhas antes do aceite; o histórico preserva o motivo. O TL pode registrar rollback diretamente na agenda quando há falha em PROD.
- GMUD encerrada é somente consulta: não permite editar, reprogramar, excluir, mudar checklist, alterar plano ou registrar rollback. Para outra implantação, cadastre outra GMUD.

Validação adicional das regras: `node tests/flow-guards-browser.cjs` (Playwright).
