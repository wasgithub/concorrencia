# Revisão ponta a ponta do fluxo

Revisão de 20/10/2026. Escopo: protótipo HTML/CSS/JS com armazenamento local. Testes de navegador usam contextos isolados; não criam registros no navegador pessoal nem executam implantação ou acessam MongoDB.

## Jornada avaliada

1. QA/TL cadastra frente, funcionalidade e fluxo com etapas próprias.
2. QA cria cenário e define seu escopo, classificação, instruções e componentes; trilhas agrupam cenários quando necessário.
3. TL cadastra a entrega; QA monta HO por seleção explícita ou sugestão dos componentes.
4. QA executa, registra falha e motivo na etapa e retesta após correção. Passar pela etapa de novo não apaga a falha histórica.
5. PO/PM aceita HO não vazia e concluída. Alterar o plano/resultados invalida o aceite.
6. TL prepara GMUD com a entrega, checklist e cenários completos escolhidos de HO para PROD.
7. Gerente aprova a subida com os requisitos válidos. Aprovação não confirma implantação.
8. A implantação acontece fora do protótipo; TL registra a subida realizada. A data sozinha não libera PROD.
9. PO executa os cenários por etapa; falhas exigem motivo. TL decide eventual rollback. Aceite PROD é separado do aceite HO e da aprovação de subida.
10. TL encerra após aceite PROD. Sucesso/rollback ficam para consulta. Nova versão exige nova GMUD da mesma entrega, com resultados novos e histórico anterior preservado.

## Achados e ajustes implementados

| Achado | Efeito observado no código | Ajuste |
| --- | --- | --- |
| Ação rápida sobrescrevia falhas e N/A | Um clique podia aparentar resolução sem reteste explícito | Trata somente pendências; bloqueada enquanto houver falha; falha exige alteração individual |
| HO não tinha motivo por etapa nem eventos de reteste | Não ficava claro onde travou ou por que passou depois | Motivo obrigatório, registro das mudanças, preservação do motivo e indicação da etapa de retomada |
| Próxima ação dependia de conhecer o menu | Após executar ou aceitar HO, era necessário descobrir a próxima tela | Orientação contextual e ligação para GMUD com a entrega selecionada |
| Verificação da origem comparava só parte do cenário | Mudanças em instruções/resultado esperado podiam não exigir nova seleção PROD | Comparação da definição completa, mantendo resultados de HO e PROD independentes |
| Montador podia substituir nome digitado | Escolher um atributo podia apagar a descrição escolhida pelo usuário | Nome digitado é respeitado; geração automática só enquanto o nome não foi editado |
| Erro de armazenamento no catálogo fechava o formulário | O usuário podia acreditar que o cadastro havia sido salvo | Mantém formulário preenchido e mostra o erro; restaura o estado anterior em memória |
| Nova GMUD sem entregas podia acessar equipe inexistente | Exceção no formulário com base vazia | Mensagem para cadastrar a entrega primeiro, sem abrir formulário inválido |

São decisões deste produto. Não se acrescentaram uploads, execução de pipeline, novos papéis ou exceções implícitas de aprovação.

## Validação reproduzível

`node --test tests/*.test.cjs` verifica os domínios e o blueprint MongoDB. `node tests/run-e2e.cjs` executa os testes de navegador e gera `test-results/e2e/report.md` e logs por suíte.

Percursos completos: crédito legado, API com passos próprios e Marketplace com modelo reutilizável. Cada percurso cobre sucesso, reprogramação, rollback, implantação com PROD pendente, PROD aceito aguardando encerramento e nova GMUD após rollback. Marketplace também cobre falha de pagamento em HO, motivo obrigatório, correção explícita, preservação do histórico e transição direta para preparação da GMUD.

Testes adicionais verificam concorrência entre abas, origem de cenário alterada, planos vazios, checklist, catálogo independente, configuração de frentes e etapas, inativação de modelos, snapshots, mobile e consultas de histórico.

## O que manter customizável

Frentes, funcionalidades, tipos, atributos por frente, fluxos e passos próprios, trilhas, componentes para sugestões e módulos disponíveis. A sugestão não deve incluir testes automaticamente sem seleção do usuário. Um teste classificado como API/automatizado continua apenas descritivo neste protótipo.

Aceites, autorização, preservação do histórico e limites de estado permanecem regras verificadas no servidor na integração real; não tornar todos os estados livremente editáveis como se fossem rótulos.

## Limites operacionais que exigem decisão na integração

- Legado: existem registros/caminhos antigos com confirmação manual `validadoHO`. Eles não equivalem a aceite autenticado e origem rastreável. A integração deve impedir novos cenários PROD sem origem em HO e tratar o legado por migração explícita, sem inventar aceites.
- Um cenário inteiramente N/A pode concluir HO, mas não é um cenário OK elegível para repetir em PROD. A política atual continua exigindo pelo menos um cenário válido de PROD; se houver entregas sem validação aplicável, desenhar uma exceção formal e auditada antes de liberar esse caso.
- A classificação Automatizada descreve o teste; o resultado ainda é informado por uma pessoa. Sem executor integrado, não apresentar isso como execução automática comprovada.

## Melhorias posteriores, por prioridade

1. Integração real: identidade e escopo autenticados, comandos com versão/idempotência, MongoDB, auditoria e testes de API. Os status das releases continuam pendentes.
2. Rascunhos recuperáveis de cadastros: considerar autosave separado de publicação, após definir concorrência e duração dos rascunhos. Hoje HO/PROD têm gravação explícita e aviso de alterações; fluxo/cenário ainda não têm recuperação automática de rascunho.
3. Volumes reais: paginação no servidor e buscas indexadas em catálogo/trilhas, revisando limites com uso real.
4. Preferências operacionais: avaliar filtros por equipe/PO e notificações após medir uso; não criar tarefas adicionais obrigatórias sem necessidade.
5. Integração opcional com automação: execução por ferramenta externa e resultados associados por IDs/versão, sem substituir aprovação humana automaticamente.

## Referências usadas

- [GOV.UK: Check answers](https://design-system.service.gov.uk/patterns/check-answers/): facilitar revisão e correção antes de concluir uma ação.
- [GOV.UK: Recover from validation errors](https://design-system.service.gov.uk/patterns/validation/): explicar o que corrigir e manter respostas preenchidas.
- [ASTQB: Test monitoring, control and completion](https://astqb.org/5-3-test-monitoring-test-control-and-test-completion/): acompanhar execução, resultados e conclusão.
- [Google SRE: Release Engineering and Canarying](https://sre.google/workbook/canarying-releases/): observar resultados da implantação e permitir reversão. Não foi implementado canary ou automação de deploy.

As referências orientaram a análise; não constituem certificação ou auditoria de conformidade do protótipo.
