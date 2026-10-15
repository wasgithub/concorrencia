# Tema visual e-agro

A paleta fica em `shared/ui/theme.css`, carregado antes dos estilos comuns e dos módulos.

| Uso | Cor de referência |
| --- | --- |
| Símbolo / identidade | `#35C537` |
| Degradê da identidade | `#24B732` → `#09A12A` |
| Secundária / informações | `#008AEB` |
| Atenção | `#EDBA12` |
| Superfícies e fundo | `#FFFFFF` |

Verde é a cor das ações principais, links, seleção e navegação ativa. Azul é secundário, usado em ações de apoio e estados informativos. Amarelo indica atenção; erros e rollback mantêm vermelho para preservar o significado operacional.

Em textos pequenos e botões com texto branco, usar variantes verdes mais escuras, mantendo o matiz da marca: `--color-primary: #0B7D28` e início do preenchimento `#16892E`. Texto azul secundário usa `#006CB8`. Essas combinações com branco têm contraste calculado de aproximadamente 5,28:1, 4,51:1 e 5,47:1, respectivamente. As cores claras da marca ficam na identidade e nos realces, acompanhadas de texto escuro.

Na integração futura, mapear os tokens para o design system do sistema hospedeiro. O tema é CSS nativo; não requer framework ou biblioteca. Os módulos usam os mesmos tokens sem redefinir uma cor primária própria.
