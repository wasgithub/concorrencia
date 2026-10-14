# Validação ponta a ponta do protótipo

Exemplos cadastrados pelas telas em 08/10/2026, usando uma sessão isolada de navegador e o teste `tests/full-flow-browser.cjs`. O deploy foi simulado pelo registro de subida realizada. Os dados gerados estão em `modules/demo/examples.json`; abra `exemplos.html` para adicioná-los ao seu navegador preservando os registros existentes.

| Issue | GMUD | Resultado |
|---|---|---|
| DEMO-E2E-SUCESSO | DEMO-SUCESSO | Encerrada com sucesso; somente consulta |
| DEMO-E2E-REPLANEJADA | DEMO-REPLANEJADA | Reprogramada, reaprovada e aguardando subida |
| DEMO-E2E-ROLLBACK | DEMO-ROLLBACK | Rollback com resultado e motivo preservados |

## Passos executados

1. Cadastrar um cenário de catálogo, com garantia manual, componente `api-demo-e2e` e fluxo até Criação de Pedido.
2. Cadastrar uma issue para cada percurso, usando o mesmo componente.
3. Abrir HO, selecionar o cenário sugerido, registrar resultados OK, salvar e registrar o aceite de Produto.
4. Cadastrar a GMUD e vincular a issue. Conferir a sugestão de data de produção.
5. Tentar cadastrar a subida no último dia da HO: bloqueada. Corrigir para uma data posterior e salvar.
6. Tentar aprovar sem plano de PROD: confirmação desabilitada.
7. Selecionar o fluxo a partir de HO e salvar o plano.
8. Responder o checklist com Não e texto, deixando um item sem resposta para exercitar a exceção. A resposta **Não** é tratada como válida e fica verde.
9. Preencher a gerente, conferir o botão bloqueado, marcar Aprovar mesmo assim e aprovar.
10. Editar apenas a observação e conferir que a aprovação é preservada.
11. No percurso replanejado, tentar uma janela anterior ao fim da HO: bloqueada. Reprogramar para 16/10, conferir retorno à aprovação e aprovar novamente.
12. Nos outros percursos, TL confirma Subida realizada; PO abre Validação de PROD.
13. No sucesso, PO marca os cenários OK, conclui a validação e TL encerra. Conferir ausência de ações de edição no bloco e nos detalhes.
14. No rollback, PO marca Criação de Pedido como Falhou; tentar salvar sem motivo: bloqueado. Informar motivo, salvar; TL registra rollback e motivo da reversão.
15. Conferir as cores e os estados dos três percursos na timeline.
16. Conferir importação dos exemplos: preserva registros anteriores e não duplica exemplos ao repetir.

## Gap encontrado e corrigido

A nova GMUD mantinha a data do dia mesmo após selecionar uma issue com produção futura. Agora a seleção sugere a maior data de produção entre as issues selecionadas, respeitando uma data já escolhida manualmente. Cadastro, edição e replanejamento pela tela impedem subida no mesmo dia ou antes do fim da HO.

## Regressão complementar

Os testes de regras e de navegador também cobrem HO alterada após aprovação, resultados parciais, falha corrigida mantendo histórico, atualização concorrente entre abas e bloqueio das alterações de uma GMUD encerrada. O armazenamento permanece local ao navegador nesta fase de validação da ideia.
