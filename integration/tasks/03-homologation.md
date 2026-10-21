# Homologação e aceite

Status: pendente no sistema real. O protótipo é referência funcional.

Módulos: homologation

## Critérios de aceite

- [ ] Fila de HO por situação.
- [ ] Execução por etapa e motivo de falha.
- [ ] Aceite de PO apenas com plano não vazio concluído; alteração posterior invalida aceite.

## Entrega

Registrar arquivos integrados no sistema hospedeiro, mapeamentos e testes executados. A implementação só está concluída após frontend, backend e persistência reais; a existência da tela do protótipo não conclui a release.

- [ ] Motivo obrigatório por falha, histórico de falha/reteste e indicação da etapa em que retomar.
- [ ] Ação rápida trata somente pendências e não sobrescreve falhas/N/A; fica indisponível enquanto houver falha.
- [ ] HO aceita permite preparar GMUD com a entrega já selecionada.

## Incrementos opcionais futuros, fora da interface restaurada

- [ ] Escopo por cenário na US/TP, origem/versionamento preservados e fora do escopo sem resultados artificiais.
- [ ] Referências manuais ao Jira, responsável e revisor opcionais, com indicação de bloqueios.
- [ ] Escopo bloqueado após resultado; PROD recebe apenas o alcance homologado.

## Banco e habilitação por fase

Usar flag explícita homologation. Consultar `integration/releases/all-phases/manifest.json` e `campos.md`. O aceite registra snapshot imutável da revisão em auditoria e não permite substituir uma prova antiga pelo plano corrente. A integração permanece pendente.
