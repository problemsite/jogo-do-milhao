# De R$ 1 a R$ 1 Milhão em 7 Dias

Jogo de navegador para o vídeo do Problems. É o contrário do Gaste 1 Trilhão: você começa no Rio com **R$ 1** e tem **7 dias** pra chegar em **R$ 1 milhão**, só com coisas que dariam pra fazer de verdade (com um pouco de sorte e de forçação de barra).

## Arquivos
- `index.html`: o jogo (palco de 1920×1080, se ajusta a qualquer janela)
- `ADM/`: **painel ADM ao vivo** (abre em `.../jogo-do-milhao/ADM/`)
- `data.js`: **catálogo de ações** (custo, tempo, retorno, requisitos). Edite aqui.
- `core.js`: regras (tempo, sono, comida, viagem, negócios rendendo)
- `game.js`: tela, animações, slides, menu e introdução
- `dinheiro.js`: onde o dinheiro aparece: **carteira** (até R$ 999), **mesa** (R$ 1 mil a 99 mil) e **celular com app do banco** (R$ 100 mil pra cima), com o Problems segurando a carteira/celular e reagindo
- `mesa.js`: a mesa do dinheiro (notas, pacotinhos e maços de R$ 10 mil)
- `art.js`: ilustrações de cada ação
- `problems.js`: o Problems de bloquinho (ciano, rosto do Problems0) em 3D, com poses: parado, apontando, uau, dando de ombros, olhando o relógio, preocupado, comemorando, triste
- `cube.js`: sobrou do Trilhão (pode ficar)
- `net.js`: ligação jogo ↔ ADM (Firebase único pela trava, ou modo local)
- `map-data.js` + `mapa_mundi_em_branco.png`: o mapa (do Trilhão)
- `milhao.css` (novo) por cima do `style.css` (do Trilhão)

## Regras do jogo
- Começa segunda, 8h, no Rio, com R$ 1. O tempo só anda quando ele faz alguma coisa.
- **Resultados fixos**: cada ação sempre custa, demora e devolve o mesmo valor.
- **Sono**: passou de 18h acordado, ele dorme 7h antes da próxima ação. Viagem longa (ônibus/avião) conta como dormir. Dá pra digitar "dormir" a qualquer hora.
- **Comida**: R$ 20 por dia, cobrados quando ele acorda.
- **Gastar pra ganhar**: algumas ações devolvem na hora; outras viram **negócio rendendo** (o dinheiro entra enquanto o tempo passa, até dormindo); outras pagam **depois** (leilão, empréstimo).
- **Orçamento flexível** em algumas ações (Saara, latão, Brás, China, leilão): ele escolhe quanto investir, com botão "Tudo que dá".
- Vídeo viral no TikTok é a "dose de sorte" e libera o final (vender a loja ou vender 25% pra um investidor).
- Trabalho por hora mostra a crítica: "nesse ritmo, R$ 1 milhão levaria X anos".
- Bloqueados com mensagem: loteria, aposta, cripto, crime, contrabando, cambismo, ajuda da família, emprego CLT (salário só no mês que vem), banco, agiota, EUA (visto), Uber.

## Rota de referência (testada: chega em R$ 1.026.558 com 11h sobrando)
| # | Digite | O que acontece |
|---|---|---|
| 1 | catar latinha na praia | R$ 1 → R$ 27 |
| 2–3 | vender água no sinal (2×) | R$ 107 |
| 4 | catar latinha no show | R$ 237 |
| 5 | vender água na praia | dorme antes; compra o isopor |
| 6–7 | vender cerveja no bloco (2×, tudo que dá) | R$ 1.448 · marco R$ 1 mil |
| 8 | abrir um MEI | grátis |
| 9 | pedir microcrédito | R$ 21 mil caem 1 dia depois (dívida) |
| 10–11 | revender coisas do Saara (2×, tudo que dá) | R$ 7.388 |
| 12 | abrir uma loja online | o microcrédito cai |
| 13 | comprar estoque no Brás | ônibus pra SP de noite; a loja começa a render |
| 14 | gravar vídeo pro TikTok | viraliza: vendas ×2 |
| 15–17 | esperar · pagar anúncios · esperar | |
| 18 | dormir | a loja vende enquanto ele dorme · marco R$ 10 mil |
| 19–21 | mais estoque do Brás · esperar · esperar | |
| 22–25 | mais estoque do Brás · esperar · dormir · esperar | marco R$ 100 mil (ao dormir) |
| 26 | vender a loja | **+R$ 900 mil → MILHÃO** |

O ADM mostra essa rota com o próximo passo destacado.

## Durante a gravação
- **Menu**: botão COMEÇAR → introdução animada (moeda, 7 dias, a meta, a escada do pouco ao muito, as regras) → as peças voam pro HUD e o mapa dá zoom no Rio.
- Depois de cada ação a sequência roda como slides e **para até clicar ou apertar espaço/Enter** (ou ▸ AVANÇAR no ADM). Dá pra trocar pra automático no ADM.
- Mapa: começa com zoom no Brasil. Roda do mouse dá zoom, arrastar move, ↺ volta, 🌎 mostra o mundo.
- O canto de baixo à esquerda fica livre pra câmera.

## ADM ao vivo
Abra `.../jogo-do-milhao/ADM/` no **seu** computador. Ele mostra:
- **Onde ele está**: menu, introdução, card aberto (com custo/retorno), animação, slide, dormindo, final…
- **O que ele está digitando**, em tempo real.
- Saldo, dívida, relógio, tempo restante, cansaço, cidade, negócios rendendo, itens, histórico e a rota.

E dá pra:
- Avançar slide, desfazer, fechar card, mostrar o card de qualquer ação, fazer qualquer ação (animada ou instantânea), forçar a próxima busca a mostrar uma ação, escrever na caixa de texto dele.
- **Segurar ele no menu** até você liberar.
- Mudar saldo, dívida, tempo, cansaço, cidade, itens; zerar a contagem de uma ação.
- Mudar os valores de qualquer ação (custo, retorno, horas, quantas vezes), configurações (sono, comida, avanço automático, sem som).

## Publicar no GitHub
1. Crie o repositório **`jogo-do-milhao`** em problemsite (o nome tem que bater com `data-site="jogo-do-milhao"` no `index.html`, no `ADM/index.html` e no `net.js`; se usar outro nome, troque nos três).
2. Suba o conteúdo do `jogo-do-milhao.zip` (o site do GitHub aceita até 100 arquivos por vez).
3. Na Central, libere o site. Na primeira vez que o **seu** navegador (da equipe) abrir o jogo ou o ADM, ele mesmo cadastra a pasta gravável `sala`.
4. Os dados ficam em `sites/jogo-do-milhao/sala` no Firebase único.
5. Se mudar algum arquivo depois, troque o `?v=1` dos `<script>` no `index.html` (cache do GitHub Pages) ou peça Ctrl+F5.

## Testar no PC (sem GitHub)
Abra o `index.html` e, **no mesmo navegador**, o `ADM/index.html`. Sem a trava, os dois conversam em modo local.
