# Gestão de entregas: referência de integração

Este projeto contém um protótipo HTML/CSS/JavaScript e a preparação para implementar suas funcionalidades em outro sistema com MongoDB.

Ao implementar no sistema hospedeiro:
- Comece por IMPLEMENTAR_NO_SISTEMA.md e integration/implementation-plan.json.
- Inspecione o sistema real antes de escolher framework, diretórios, driver/ODM, autenticação, menu ou design system. Siga as instruções e convenções do repositório hospedeiro.
- Use esta pasta como referência; altere os módulos reais do sistema. Preserve o protótipo para comparar o fluxo.
- Reutilize usuários, equipes, workspace, componentes de UI e conexão MongoDB existentes.
- Implemente por responsabilidade, com frontend e backend completos por fase. Os status do plano se referem à integração real, não à existência da tela de demonstração.
- As regras operacionais são verificadas no servidor. Não migre localStorage, nomes de validadores digitados, globais JS ou iframe como arquitetura de produção.
- Autorização, revisão esperada, idempotência, histórico e isolamento de workspace fazem parte dos comandos. Calendário e gestão usam as mesmas regras.
- Aceite HO, aprovação da subida, implantação, aceite PROD e encerramento são diferentes. Rollback preserva resultados; outro código/versão usa nova GMUD vinculada à mesma feature.
- Valide a funcionalidade entregue e registre decisões e progresso. Não marque uma fase concluída com mock de persistência.

Ao alterar somente este protótipo, mantenha HTML/JS puro e as URLs e chaves existentes. Valide as regras com node --test tests/*.test.cjs e os testes de navegador afetados. Bootstrap de MongoDB é preparação; não o execute em um banco automaticamente.
