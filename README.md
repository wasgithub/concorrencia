# IssueFlow

Abra `index.html` no navegador, sem instalar dependências.

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
