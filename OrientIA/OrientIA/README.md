# OrientIA

Protótipo do Projeto Final II para orientar estudantes no uso de IA generativa ao estudar programação.

## Como abrir

1. Extraia todo o ZIP para uma pasta.
2. Abra `index.html` em um navegador moderno.
3. Escolha a atividade e o tipo de ajuda. Em avaliações, informe se o uso de IA foi explicitamente autorizado.
4. Selecione **Ver orientação** para consultar a recomendação, os critérios e o exemplo de pedido.

Para hospedar, publique o conteúdo da pasta `OrientIA` em uma hospedagem estática, mantendo os arquivos nas posições originais. Não há etapa de instalação ou compilação.

A análise e a escolha do tema acontecem no navegador, sem login, backend, banco de dados ou armazenamento persistente. O botão **Avaliar a ferramenta**, no final da página, abre o Google Forms em uma nova aba e requer conexão.

## Arquivos

| Arquivo | Função |
| --- | --- |
| `index.html` | Estrutura e controles da interface |
| `style.css` | Layout responsivo, temas e movimento |
| `data.js` | Matriz pedagógica original |
| `logic.js` | Regras de decisão originais |
| `app.js` | Interação, exibição e cópia do exemplo |
| `pdf.js` | Exportação das orientações abertas para PDF |
| `tests.js` | Testes do motor de decisão |

Execute `node tests.js` para testar a classificação dos cenários.
