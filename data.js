// =====================================================================
//  DE R$ 1 A R$ 1 MILHÃO EM 7 DIAS — catálogo de ações (edite aqui)
// ---------------------------------------------------------------------
//  Resultados FIXOS: cada ação sempre custa, demora e devolve o mesmo.
//  cost  = quanto sai do bolso na hora     hours = quanto tempo você gasta
//  gain  = quanto volta no fim da ação     repeat = quantas vezes dá pra fazer
//  costIf = custo menor se você já tem um item (ex.: o isopor)
//  needs  = itens que precisa ter          gives = itens que você ganha
//  stream = negócio que fica RENDENDO sozinho (perDay; total = até esgotar;
//           delayH = só começa depois de X horas, ex.: estoque chegando)
//  payout = dinheiro que cai depois de X horas (ex.: carro vendido)
//  boost  = multiplica o que um tipo de negócio rende (ex.: anúncios)
//  work   = trabalho por hora (mostra "nesse ritmo, 1 milhão em X anos")
//  Os valores vêm de pesquisa (fontes no README).
// =====================================================================
(function () {
  const MIL = 1e3;

  // itens que você pode ter
  const ASSETS = {
    isopor: { name: 'Isopor', icon: '🧊', need: 'um isopor (venda água na praia primeiro)' },
    bike: { name: 'Bicicleta', icon: '🚲', need: 'uma bicicleta' },
    mei: { name: 'MEI (CNPJ)', icon: '📄', need: 'um CNPJ de MEI' },
    loja: { name: 'Loja online', icon: '🛒', need: 'uma loja online aberta' },
    carrinho: { name: 'Carrinho de churrasco', icon: '🍢', need: 'um carrinho de churrasquinho' },
    barraca: { name: 'Barraca na praia', icon: '⛱️', need: 'uma barraca na praia' },
    viral: { name: 'Vídeo viral', icon: '🔥', need: 'um vídeo viral da loja (o mercado precisa conhecer a marca)' }
  };

  // por que demora (aparece no card)
  const WHY = {
    trabalho: 'Trabalho por hora: você troca tempo por dinheiro.',
    venda: 'Compra o estoque de manhã e vende até acabar.',
    revenda: 'Comprar barato, anunciar e entregar pra quem comprou.',
    compra: 'Compra de usado: achar o anúncio, ir buscar e pagar.',
    papel: 'Burocracia rápida: tudo pelo celular.',
    negocio: 'Montou uma vez, fica rendendo sozinho todo dia.',
    estoque: 'Estoque pra loja: vende aos poucos até acabar.',
    marketing: 'Faz a loja vender mais rápido.',
    leilao: 'Arremata hoje, o dinheiro da revenda cai depois.',
    credito: 'Dinheiro emprestado: entra hoje, mas é dívida.',
    grande: 'Negociação grande, cara a cara.',
    sono: 'Seu corpo precisa.',
    espera: 'O tempo passa e os negócios continuam rendendo.'
  };

  const A = [];
  const add = o => A.push(o);

  /* ============================ SEM DINHEIRO ============================ */
  add({ id: 'latinhas', city: 'rio', cat: 'cans', kind: 'trabalho', work: true, cost: 0, hours: 4, gain: 26, repeat: 3,
    name: 'Catar latinhas na praia', short: 'Latinhas na praia', hint: '🥫 catar latinha',
    aliases: ['catar latinha', 'catar latinhas', 'juntar latinha', 'recolher latinhas', 'reciclagem', 'catar lata', 'juntar lata na praia', 'vender latinha', 'reciclar latinhas'],
    keys: ['latinha', 'latinhas', 'lata', 'reciclagem', 'reciclar', 'catar'],
    msg: 'Uns 4 kg (cerca de 280 latas) a R$ 6,50 o quilo no ferro-velho.' });
  add({ id: 'latinhas_show', city: 'rio', cat: 'cans', kind: 'trabalho', work: true, cost: 0, hours: 6, gain: 130, repeat: 1,
    name: 'Catar latinhas no show de hoje à noite', short: 'Latinhas no show', hint: '🎤 latinhas num show',
    aliases: ['catar latinha no show', 'latinha no show', 'catar latinha em evento', 'latinhas no evento', 'catar latinha no bloco', 'latinha no estadio'],
    keys: ['show', 'evento', 'bloco', 'estadio'],
    msg: 'Show cheio: 20 kg de latinhas. Catador experiente tira isso numa noite boa.' });
  add({ id: 'servente', city: 'rio', cat: 'obra', kind: 'trabalho', work: true, cost: 0, hours: 10, gain: 248, repeat: 2,
    name: 'Arranjar uma diária de servente de obra', short: 'Diária de servente', hint: '🧱 diária numa obra',
    aliases: ['servente', 'diaria de servente', 'ajudante de pedreiro', 'trabalhar numa obra', 'trabalhar em obra', 'diaria na obra', 'bico', 'fazer um bico', 'trabalhar de servente', 'arrumar um trabalho', 'arranjar um trabalho', 'trabalhar', 'arranjar emprego', 'arrumar emprego', 'procurar emprego', 'arranjar um emprego'],
    keys: ['servente', 'obra', 'pedreiro', 'diaria', 'bico', 'trabalho', 'trabalhar', 'emprego'],
    msg: 'Duas horas batendo de porta em porta e oito carregando saco de cimento. Diária no Rio: R$ 248.' });
  add({ id: 'panfleto', city: 'rio', cat: 'flyer', kind: 'trabalho', work: true, cost: 0, hours: 6, gain: 80, repeat: 2,
    name: 'Distribuir panfletos no centro', short: 'Panfletagem', hint: '📄 panfletagem',
    aliases: ['panfletagem', 'entregar panfleto', 'distribuir panfleto', 'panfletar', 'segurar placa', 'homem placa'],
    keys: ['panfleto', 'panfletagem', 'placa'], msg: 'Seis horas em pé no sol por R$ 80.' });
  add({ id: 'figurante', city: 'rio', cat: 'film', kind: 'trabalho', work: true, cost: 0, hours: 9, gain: 150, repeat: 1,
    name: 'Fazer figuração numa novela', short: 'Figuração', hint: '🎬 figuração em novela',
    aliases: ['figurante', 'figuracao', 'ser figurante', 'trabalhar de figurante', 'aparecer na novela', 'fazer figuracao na globo'],
    keys: ['figurante', 'figuracao', 'novela', 'globo', 'ator'], msg: 'Você aparece 2 segundos no fundo da cena. Cachê de figuração: R$ 50 a R$ 150.' });
  add({ id: 'entregas_bike', city: 'rio', cat: 'bike', kind: 'trabalho', work: true, cost: 0, hours: 8, gain: 140, repeat: 3, needs: ['bike'],
    name: 'Fazer entregas de bike por aplicativo', short: 'Entregas de bike', hint: '🚲 entregas por app',
    aliases: ['entregador', 'fazer entrega', 'entregas de bike', 'ifood', 'trabalhar de entregador', 'entregar comida', 'rappi', 'motoboy', 'entregador de app'],
    keys: ['entrega', 'entregas', 'entregador', 'ifood', 'rappi'], msg: '17 entregas em 8 horas. Média real de entregador de bike: R$ 17 por hora.' });

  /* ============================== PRAIA ============================== */
  add({ id: 'agua', city: 'rio', cat: 'beach', kind: 'venda', cost: 95, costIf: { asset: 'isopor', cost: 50 }, hours: 6, gain: 240, repeat: 3, gives: ['isopor'],
    name: 'Vender água gelada na praia', short: 'Água na praia', hint: '🏖️ vender água gelada na areia',
    aliases: ['vender agua', 'vender agua na praia', 'ambulante', 'vender bebida na praia', 'vender agua gelada', 'ser ambulante', 'vender refrigerante', 'vender na praia', 'isopor'],
    keys: ['agua', 'ambulante', 'praia', 'isopor', 'refrigerante', 'vender'],
    msg: '48 garrafinhas a R$ 5. No atacado cada uma sai por R$ 0,69.', costNote: 'isopor R$ 45 + 48 águas R$ 33 + gelo R$ 17' });
  add({ id: 'agua_sinal', city: 'rio', cat: 'bottle', kind: 'venda', cost: 20, hours: 3, gain: 60, repeat: 2,
    name: 'Vender água no sinal de trânsito', short: 'Água no sinal', hint: '🚦 vender água no sinal',
    aliases: ['vender agua no sinal', 'vender no sinal', 'vender no farol', 'vender agua no semaforo', 'vender bala no sinal', 'vender bala', 'vender agua na rua', 'vender na rua'],
    keys: ['sinal', 'semaforo', 'farol', 'bala', 'rua'], msg: '12 garrafinhas a R$ 5. O fardo custou R$ 8 e o gelo com a sacola térmica, R$ 12.' });
  add({ id: 'latao', city: 'rio', cat: 'beer', kind: 'venda', hours: 6, repeat: 2, needs: ['isopor'],
    flex: { min: 200, max: 1600, opts: [200, 480, 1000, 1600], ret: 2, label: 'QUANTOS LATÕES (R$ 4 CADA)' },
    name: 'Vender latão de cerveja num bloco', short: 'Latão no bloco', hint: '🍺 vender latão num bloco',
    aliases: ['vender cerveja', 'vender latao', 'vender cerveja no bloco', 'vender cerveja no show', 'vender bebida no show', 'vender latao no show', 'vender cerveja no evento'],
    keys: ['cerveja', 'latao', 'bebida'], msg: 'Latão a R$ 8 no bloco. No atacado sai por R$ 4. Mais de 400 latões não cabem no isopor nem no braço.' });
  add({ id: 'bike', city: 'rio', cat: 'bike', kind: 'compra', cost: 300, hours: 2, gain: 0, repeat: 1, gives: ['bike'],
    name: 'Comprar uma bicicleta usada', short: 'Bicicleta usada', hint: '🚲 uma bike usada',
    aliases: ['comprar bike', 'comprar bicicleta', 'bicicleta usada', 'bike usada', 'uma bike', 'uma bicicleta'],
    keys: ['bike', 'bicicleta'], msg: 'Aro 26, freio meio ruim, mas anda. R$ 300 na OLX.' });
  add({ id: 'churrasquinho', city: 'rio', cat: 'grill', kind: 'negocio', cost: 2200, hours: 4, gain: 0, repeat: 1, gives: ['carrinho'],
    stream: { tag: 'rua', name: 'Carrinho de churrasquinho', perDay: 450 },
    name: 'Montar um carrinho de churrasquinho com um ajudante', short: 'Carrinho de churrasquinho', hint: '🍢 carrinho de churrasquinho',
    aliases: ['churrasquinho', 'carrinho de churrasquinho', 'vender churrasquinho', 'espetinho', 'vender espetinho', 'carrinho de comida', 'vender comida'],
    keys: ['churrasquinho', 'espetinho', 'espeto', 'carrinho'], msg: 'Espeto custa R$ 3,50 e sai por R$ 10. Tirando o ajudante, sobra uns R$ 450 por dia.' });
  add({ id: 'barraca', city: 'rio', cat: 'tent', kind: 'negocio', cost: 4500, hours: 5, gain: 0, repeat: 1, needs: ['isopor'], gives: ['barraca'],
    stream: { tag: 'praia', name: 'Barraca na praia', perDay: 800 },
    name: 'Montar uma barraca na praia com 2 ajudantes', short: 'Barraca na praia', hint: '⛱️ barraca com cadeiras e guarda-sol',
    aliases: ['barraca de praia', 'montar barraca', 'barraca na praia', 'alugar cadeira de praia', 'alugar guarda sol', 'quiosque'],
    keys: ['barraca', 'quiosque', 'cadeira', 'guarda'], msg: 'Cadeira, guarda-sol, bebida e caipirinha. Uns R$ 800 de lucro por dia de sol.' });

  /* ============================== REVENDA ============================== */
  add({ id: 'saara', city: 'rio', cat: 'bags', kind: 'revenda', hours: 8, repeat: 3,
    flex: { min: 300, max: 6000, opts: [300, 1000, 3000, 6000], ret: 2.3, label: 'QUANTO COMPRAR NO SAARA' },
    name: 'Comprar fones e capinhas no Saara e revender', short: 'Revenda do Saara', hint: '🛍️ revender coisas do Saara',
    aliases: ['saara', 'revender', 'revenda', 'comprar e revender', 'revender capinha', 'revender fone', 'vender capinha', 'vender fone de ouvido', 'comprar no atacado e revender', 'marketplace', 'vender na olx'],
    keys: ['saara', 'revender', 'revenda', 'capinha', 'fone', 'atacado', 'olx'],
    msg: 'No Saara o fone sai a R$ 8 e vende a R$ 25 no Marketplace. Tirando as taxas, volta 2,3 vezes o que você pôs.', capNote: 'Acima de R$ 6 mil não tem cliente pra tanta capinha numa tarde.' });
  add({ id: 'mei', remote: true, cat: 'doc', kind: 'papel', cost: 0, hours: 1, gain: 0, repeat: 1, gives: ['mei'],
    name: 'Abrir um MEI (CNPJ)', short: 'MEI aberto', hint: '📄 abrir um CNPJ',
    aliases: ['abrir mei', 'abrir cnpj', 'virar mei', 'abrir empresa', 'abrir uma empresa', 'cnpj', 'formalizar', 'microempreendedor'],
    keys: ['mei', 'cnpj', 'empresa', 'formalizar'], msg: 'Grátis e na hora pelo gov.br. Agora você tem CNPJ.' });
  add({ id: 'leilao_carro', city: 'rio', cat: 'car', kind: 'leilao', hours: 8, repeat: 1,
    flex: { min: 31000, max: 124000, opts: [31000, 62000, 93000, 124000], unit: 31000, unitName: ['carro', 'carros'], label: 'QUANTOS CARROS', payout: { ret: 38500 / 31000, afterH: 48, name: 'Carros do leilão vendidos' } },
    name: 'Arrematar um carro em leilão e revender', short: 'Carro de leilão', hint: '🚗 carro de leilão do Detran',
    aliases: ['leilao de carro', 'carro de leilao', 'comprar carro no leilao', 'revender carro', 'leilao', 'comprar carro e revender', 'leilao do detran'],
    keys: ['leilao', 'carro'], msg: 'Cada um: Gol 2018 de FIPE R$ 42 mil, arrematado a 70% + 5% do leiloeiro + pátio = R$ 31 mil. Revendido por R$ 38,5 mil 2 dias depois.' });

  /* ============================== LOJA ONLINE ============================== */
  add({ id: 'loja', remote: true, cat: 'shop', kind: 'papel', cost: 1500, hours: 5, gain: 0, repeat: 1, needs: ['mei'], gives: ['loja'],
    name: 'Abrir uma loja online', short: 'Loja online', hint: '🛒 abrir loja online',
    aliases: ['loja online', 'abrir loja', 'abrir uma loja', 'loja virtual', 'ecommerce', 'e commerce', 'shopee', 'mercado livre', 'tiktok shop', 'vender pela internet', 'loja na internet'],
    keys: ['loja', 'ecommerce', 'shopee', 'online', 'internet'], msg: 'Conta de vendedor, fotos e embalagens. Falta o que vender.' });
  add({ id: 'bras', city: 'sao_paulo', cat: 'boxes', kind: 'estoque', hours: 6, repeat: 3, needs: ['loja'],
    flex: { min: 5000, max: 60000, opts: [5000, 15000, 30000, 60000], label: 'QUANTO DE ESTOQUE', stream: { tag: 'loja', name: 'Estoque do Brás', ret: 2.2, speed: 0.45 } },
    name: 'Comprar estoque no Brás para a loja', short: 'Estoque do Brás', hint: '📦 atacado do Brás e da 25 de Março',
    aliases: ['bras', 'comprar estoque', 'estoque', '25 de marco', 'atacado em sao paulo', 'comprar mercadoria', 'comprar no bras', 'fornecedor'],
    keys: ['bras', 'estoque', 'mercadoria', 'fornecedor', 'marco'], msg: 'Roupa e acessório de atacado. Na loja vende por 2,2 vezes o que custou, aos poucos (uns 45% do estoque por dia; mais rápido com divulgação).' });
  add({ id: 'china', remote: true, cat: 'ship', kind: 'estoque', hours: 4, repeat: 1, needs: ['loja'],
    flex: { min: 20000, max: 200000, opts: [20000, 50000, 100000, 200000], label: 'TAMANHO DA ENCOMENDA', stream: { tag: 'loja', name: 'Lote da China', ret: 2.5, speed: 0.5, delayH: 48 } },
    name: 'Encomendar um produto viral da China', short: 'Importação da China', hint: '🚢 importar da China',
    aliases: ['importar da china', 'importar', 'alibaba', 'aliexpress', 'produto da china', 'comprar da china', 'produto viral', 'importacao', 'encomendar da china'],
    keys: ['china', 'importar', 'importacao', 'alibaba', 'aliexpress', 'viral'],
    msg: 'Custa R$ 18 na fábrica e vende a R$ 99. Com frete aéreo expresso e impostos, vende por 2,5 vezes o que custou e chega em 2 dias.' });
  add({ id: 'cantao', city: 'guangzhou', cat: 'factory', kind: 'estoque', hours: 10, repeat: 1, needs: ['loja'],
    flex: { min: 40000, max: 250000, opts: [40000, 100000, 250000], label: 'TAMANHO DO PEDIDO', stream: { tag: 'loja', name: 'Lote da Feira de Cantão', ret: 3.5, speed: 0.5, delayH: 30 } },
    name: 'Negociar direto com a fábrica na Feira de Cantão', short: 'Feira de Cantão', hint: '🏭 Feira de Cantão (fábricas direto)',
    aliases: ['feira de cantao', 'ir pra china', 'ir para a china', 'viajar pra china', 'fabrica na china', 'guangzhou', 'cantao', 'negociar com a fabrica'],
    keys: ['cantao', 'guangzhou', 'fabrica', 'feira'],
    msg: 'Cara a cara, a fábrica faz mais barato e manda junto no seu voo de volta. Brasileiro não precisa de visto até 30 dias.' });
  add({ id: 'tiktok', remote: true, cat: 'video', kind: 'marketing', cost: 0, hours: 4, gain: 0, repeat: 1, needs: ['loja'],
    boost: { tag: 'loja', mult: 2 }, gives: ['viral'],
    name: 'Gravar vídeos do produto pro TikTok', short: 'Vídeos no TikTok', hint: '📱 divulgar no TikTok',
    aliases: ['tiktok', 'fazer video', 'gravar video', 'divulgar', 'postar no tiktok', 'fazer videos', 'divulgar a loja', 'viralizar', 'reels', 'postar video'],
    keys: ['tiktok', 'video', 'divulgar', 'reels', 'viralizar', 'postar'], msg: 'Um dos vídeos VIRALIZOU: 2 milhões de views em um dia. A loja passa a vender o dobro. (Essa foi a sua dose de sorte.)' });
  add({ id: 'anuncios', remote: true, cat: 'ads', kind: 'marketing', cost: 8000, hours: 2, gain: 0, repeat: 1, needs: ['loja'],
    boost: { tag: 'loja', mult: 1.5 },
    name: 'Pagar anúncios para a loja', short: 'Anúncios pagos', hint: '📣 tráfego pago',
    aliases: ['anuncio', 'anunciar', 'pagar anuncio', 'trafego pago', 'impulsionar', 'propaganda', 'fazer propaganda', 'ads', 'marketing'],
    keys: ['anuncio', 'anuncios', 'propaganda', 'trafego', 'impulsionar', 'marketing', 'ads'], msg: 'R$ 8 mil em anúncios. A loja vende 50% mais rápido.' });
  add({ id: 'influencer', remote: true, cat: 'star', kind: 'marketing', cost: 40000, hours: 3, gain: 0, repeat: 1, needs: ['loja'],
    boost: { tag: 'loja', mult: 2 },
    name: 'Pagar um influenciador grande pra divulgar', short: 'Publi com influenciador', hint: '⭐ publi com influenciador',
    aliases: ['influenciador', 'publi', 'pagar um influencer', 'influencer', 'pagar publi', 'youtuber', 'pagar um youtuber', 'patrocinio'],
    keys: ['influenciador', 'influencer', 'publi', 'youtuber', 'patrocinio'], msg: 'Publi com perfil de milhões de seguidores. A loja vende o dobro.' });

  /* ============================== CRÉDITO ============================== */
  add({ id: 'microcredito', remote: true, cat: 'bank', kind: 'credito', cost: 0, hours: 3, gain: 0, repeat: 1, needs: ['mei'], loan: 21000,
    needsEarned: { min: 1000, text: 'ter faturado pelo menos R$ 1 mil (o banco pede comprovante)' },
    payout: { afterH: 24, amount: 21000, name: 'Microcrédito liberado' },
    name: 'Pedir microcrédito para MEI', short: 'Microcrédito', hint: '🏦 microcrédito de MEI',
    aliases: ['microcredito', 'emprestimo', 'pegar emprestimo', 'pedir emprestimo', 'credito', 'financiamento', 'pegar dinheiro emprestado', 'agerio'],
    keys: ['microcredito', 'emprestimo', 'credito', 'financiamento'], msg: 'Até R$ 21 mil para MEI, juros de 0,25% ao mês. Cai em 1 dia. Lembre: é dívida.' });

  /* ============================== IMÓVEL / GRANDE ============================== */
  add({ id: 'imovel', city: 'rio', cat: 'house', kind: 'leilao', cost: 135000, hours: 10, gain: 0, repeat: 1,
    payout: { afterH: 60, amount: 205000, name: 'Apartamento repassado' },
    name: 'Arrematar um apartamento em leilão da Caixa e repassar', short: 'Apartamento de leilão', hint: '🏠 leilão de imóveis da Caixa',
    aliases: ['leilao de imovel', 'apartamento de leilao', 'leilao da caixa', 'comprar apartamento', 'comprar imovel', 'imovel', 'casa de leilao', 'comprar casa', 'flipar imovel'],
    keys: ['imovel', 'apartamento', 'casa', 'caixa'],
    msg: 'Avaliado em R$ 250 mil, arrematado com 46% de desconto. Um investidor fica com ele por R$ 205 mil.' });
  add({ id: 'paraguai', city: 'cde', cat: 'phone', kind: 'leilao', cost: 52000, hours: 6, gain: 0, repeat: 1,
    payout: { afterH: 30, amount: 63000, name: 'iPhones do Paraguai vendidos' },
    name: 'Comprar 10 iPhones no Paraguai e revender no Brasil', short: 'iPhones do Paraguai', hint: '📱 iPhones mais baratos',
    aliases: ['paraguai', 'comprar no paraguai', 'iphone no paraguai', 'ciudad del este', 'muamba', 'sacoleiro', 'ir pro paraguai', 'eletronicos no paraguai'],
    keys: ['paraguai', 'muamba', 'sacoleiro', 'ciudad'],
    msg: 'Lá o iPhone sai 45% mais barato, mas passa da cota de US$ 500 e paga 50% de imposto na volta. Ainda sobra lucro.' });
  add({ id: 'investidor', city: 'sao_paulo', cat: 'deal', kind: 'grande', cost: 0, hours: 8, gain: 400000, repeat: 1,
    needs: ['loja', 'viral'], needsStream: { tag: 'loja', min: 60000, text: 'uma loja que já vendeu pelo menos R$ 60 mil' },
    name: 'Vender 25% da loja para um investidor', short: 'Investidor (25%)', hint: '💼 investidores da Faria Lima',
    aliases: ['investidor', 'vender parte da loja', 'shark tank', 'investimento', 'socio', 'arrumar um socio', 'vender cotas', 'faria lima', 'investidor anjo', 'pitch'],
    keys: ['investidor', 'shark', 'socio', 'cotas', 'investimento', 'pitch'],
    msg: 'Uma marca nova, com vídeo viral e vendendo dezenas de milhares por dia. O investidor pagou R$ 400 mil por 25% (no papel, a loja vale R$ 1,6 milhão).' });
  add({ id: 'vender_loja', city: 'sao_paulo', cat: 'deal', kind: 'grande', cost: 0, hours: 8, gain: 900000, repeat: 1, needs: ['loja', 'viral'], takes: ['loja'], stop: ['loja'], notDone: ['investidor'], notDoneText: 'não ter vendido parte da loja pra um investidor',
    needsStream: { tag: 'loja', min: 100000, text: 'uma loja que já vendeu pelo menos R$ 100 mil' },
    name: 'Vender a loja inteira', short: 'Loja vendida', hint: '🤝 vender a loja inteira',
    aliases: ['vender a loja', 'vender a empresa', 'vender meu negocio', 'vender o negocio', 'vender a loja inteira', 'vender tudo'],
    keys: ['vender'], msg: 'Uma empresa grande quis a marca que viralizou: comprou a loja, o estoque e os clientes por R$ 900 mil. A loja para de render pra você.' });

  add({ id: 'pagar_divida', remote: true, cat: 'bank', kind: 'credito', cost: 0, hours: 1, gain: 0, repeat: 1, payDebt: true, needsDebt: true,
    name: 'Pagar o empréstimo', short: 'Empréstimo pago', hint: '',
    aliases: ['pagar o emprestimo', 'pagar divida', 'quitar divida', 'quitar o emprestimo', 'pagar o microcredito', 'pagar o banco'],
    keys: ['pagar', 'quitar', 'divida'], msg: 'Dívida quitada. O que sobra agora é todo seu.' });

  /* ============================== VIAGENS ============================== */
  const go = (id, city, name, aliases, keys) => add({ id, city, cat: 'trip', kind: 'viagem', cost: 0, hours: 0, gain: 0, repeat: 99, name, short: name, hint: '', aliases, keys, msg: '' });
  go('ir_sp', 'sao_paulo', 'Ir para São Paulo', ['ir para sao paulo', 'viajar para sao paulo', 'ir pra sp', 'ir pra sao paulo', 'pegar onibus pra sao paulo', 'sao paulo'], ['sp', 'paulo']);
  go('ir_rio', 'rio', 'Voltar para o Rio de Janeiro', ['voltar pro rio', 'ir para o rio', 'ir pro rio', 'voltar para o rio de janeiro', 'rio de janeiro'], ['rio']);
  go('ir_py', 'cde', 'Ir para o Paraguai', ['ir para o paraguai', 'ir pro paraguai', 'viajar pro paraguai', 'ir pra ciudad del este', 'foz do iguacu'], ['paraguai', 'foz', 'ciudad']);
  go('ir_china', 'guangzhou', 'Ir para a China', ['ir para a china', 'ir pra china', 'viajar pra china', 'voar pra china', 'ir para guangzhou'], ['china', 'guangzhou']);

  /* ============================== CORPO ============================== */
  add({ id: 'dormir', cat: 'sleep', kind: 'sono', remote: true, cost: 0, hours: 0, gain: 0, repeat: 99,
    name: 'Dormir', short: 'Dormiu', hint: '',
    aliases: ['dormir', 'ir dormir', 'descansar', 'tirar um cochilo', 'dormir agora', 'cochilar'],
    keys: ['dormir', 'descansar', 'cochilo', 'sono'], msg: '' });
  add({ id: 'esperar', cat: 'clock', kind: 'espera', remote: true, cost: 0, hours: 3, gain: 0, repeat: 99,
    name: 'Esperar 3 horas', short: 'Esperou', hint: '',
    aliases: ['esperar', 'aguardar', 'esperar as vendas', 'esperar o dinheiro', 'passar o tempo', 'nao fazer nada', 'ficar parado'],
    keys: ['esperar', 'aguardar'], msg: '' });

  /* ============================== IMPOSSÍVEIS ============================== */
  const blk = (id, title, msg, aliases, keys, extra) => add(Object.assign({ id, cat: 'block', kind: 'bloqueado', name: title, aliases, keys, block: { title, msg } }, extra || {}));
  blk('x_loteria', 'NADA DE LOTERIA.', 'A chance de ganhar a Mega-Sena com um jogo simples é de 1 em 50 milhões. Isso não é um plano.',
    ['mega sena', 'loteria', 'jogar na mega', 'jogar na loteria', 'raspadinha', 'lotofacil', 'quina', 'bilhete premiado'], ['mega', 'loteria', 'raspadinha', 'lotofacil', 'quina', 'sena']);
  blk('x_aposta', 'NADA DE APOSTA.', 'Bet, cassino e jogo do tigrinho: a casa sempre ganha. Aqui só vale o que dá pra fazer de verdade.',
    ['apostar', 'aposta', 'bet', 'tigrinho', 'jogo do tigrinho', 'cassino', 'apostar no futebol', 'blaze', 'roleta', 'jogo do bicho', 'fortune tiger'], ['apostar', 'aposta', 'bet', 'tigrinho', 'cassino', 'roleta', 'bicho', 'blaze']);
  blk('x_cripto', 'NADA DE CRIPTO NEM DAY TRADE.', 'Multiplicar dinheiro em uma semana no mercado é sorte pura. Não conta.',
    ['bitcoin', 'cripto', 'criptomoeda', 'day trade', 'investir em acoes', 'bolsa de valores', 'forex', 'memecoin', 'investir'], ['bitcoin', 'cripto', 'criptomoeda', 'trade', 'acoes', 'bolsa', 'forex', 'memecoin']);
  blk('x_crime', 'NADA DE CRIME.', 'Roubo, golpe, pirâmide e tráfico estão fora. O desafio é chegar no milhão sem passar por cima de ninguém.',
    ['roubar', 'assaltar', 'golpe', 'piramide', 'traficar', 'trafico', 'aplicar golpe', 'roubar um banco', 'pix falso', 'clonar cartao', 'estelionato', 'sequestro'], ['roubar', 'assalto', 'assaltar', 'golpe', 'piramide', 'trafico', 'traficar', 'clonar', 'sequestro']);
  blk('x_contrabando', 'CONTRABANDO É CRIME.', 'Trazer mercadoria escondida sem declarar dá apreensão e processo. No jogo, só vale importar declarando e pagando imposto.',
    ['contrabando', 'trazer sem declarar', 'passar sem pagar imposto', 'descaminho'], ['contrabando', 'descaminho']);
  blk('x_cambista', 'CAMBISMO É CRIME.', 'Revender ingresso acima do preço é crime no Brasil.',
    ['cambista', 'revender ingresso', 'vender ingresso', 'ser cambista', 'ingresso de show'], ['cambista', 'ingresso', 'cambismo']);
  blk('x_familia', 'SEM AJUDA DA FAMÍLIA.', 'Você começa do zero: sem herança, sem pix de parente, sem empréstimo de amigo.',
    ['pedir dinheiro', 'pedir pros pais', 'heranca', 'pedir emprestado pra um amigo', 'pedir pro meu pai', 'pedir pra minha mae', 'pix da familia', 'vaquinha'], ['heranca', 'pais', 'familia', 'vaquinha', 'mae', 'pai']);
  blk('x_orgao', 'ISSO NÃO.', 'Vender órgão é crime no Brasil. E não, nem pensar.',
    ['vender um rim', 'vender orgao', 'vender meu rim', 'vender sangue'], ['rim', 'orgao']);
  blk('x_clt', 'O SALÁRIO SÓ CAI NO MÊS QUE VEM.', 'Você conseguiu uma vaga de carteira assinada! Mas o primeiro salário (R$ 1.621) só cai daqui a uns 30 dias. Ganhando o mínimo, juntar R$ 1 milhão levaria uns 47 anos.',
    ['carteira assinada', 'emprego fixo', 'clt', 'emprego de carteira assinada', 'trabalhar de carteira assinada', 'arranjar um emprego fixo', 'jovem aprendiz', 'trabalhar no mercado', 'trabalhar no mcdonalds', 'caixa de supermercado'],
    ['clt', 'carteira', 'fixo', 'salario', 'mcdonalds', 'supermercado'], { block: { type: 'tempo', title: 'O SALÁRIO SÓ CAI NO MÊS QUE VEM.', msg: 'Você conseguiu uma vaga de carteira assinada! Mas o primeiro salário (R$ 1.621) só cai daqui a uns 30 dias. Ganhando o mínimo, juntar R$ 1 milhão levaria uns 47 anos.', days: 30 } });
  blk('x_banco', 'O BANCO NÃO EMPRESTA.', 'Empréstimo grande pede histórico: CNPJ de dias de vida e nome sem renda não passam na análise. Para MEI novo, só o microcrédito.',
    ['emprestimo no banco', 'pronampe', 'financiamento no banco', 'emprestimo grande', 'cheque especial', 'cartao de credito'], ['banco', 'pronampe', 'cheque', 'cartao']);
  blk('x_agiota', 'AGIOTA É CRIME.', 'E os juros são impagáveis. Fora.', ['agiota', 'pegar com agiota'], ['agiota']);
  blk('x_eua', 'VOCÊ NÃO TEM VISTO AMERICANO.', 'Pra entrar nos Estados Unidos, brasileiro precisa de visto. A entrevista no consulado leva meses pra marcar.',
    ['ir pra miami', 'ir para os estados unidos', 'comprar em miami', 'ir pros eua', 'viajar pros estados unidos', 'nova york', 'ir pra orlando'], ['miami', 'eua', 'orlando', 'americano', 'estados'], { block: { type: 'tempo', title: 'VOCÊ NÃO TEM VISTO AMERICANO.', msg: 'Pra entrar nos Estados Unidos, brasileiro precisa de visto. A entrevista no consulado leva meses pra marcar.', days: 120 } });
  blk('x_motorista', 'VOCÊ NÃO TEM CARRO.', 'Pra ser motorista de aplicativo precisa de carro (ou alugar um por uns R$ 700 por semana, com caução) e CNH na mão.',
    ['uber', 'motorista de aplicativo', 'ser motorista de uber', '99', 'dirigir uber', 'motorista de app'], ['uber', 'motorista', 'taxi']);
  blk('x_doacao', 'NÃO CONTA.', 'Pedir doação ou fazer rifa de algo que você não tem não é o desafio.', ['pedir doacao', 'rifa', 'fazer uma rifa', 'pedir pix', 'pedir dinheiro na rua', 'live pedindo pix'], ['doacao', 'rifa', 'pix']);

  // viagens (ida OU volta, valores reais aproximados)
  const TRIPS = {
    'rio>sao_paulo': { h: 6, cost: 130, mode: 'ônibus' },
    'rio>cde': { h: 27, cost: 560, mode: 'ônibus', label: 'via Foz do Iguaçu' },
    'sao_paulo>cde': { h: 17, cost: 380, mode: 'ônibus', label: 'via Foz do Iguaçu' },
    'rio>guangzhou': { h: 32, cost: 4200, mode: 'avião', label: '2 conexões' },
    'sao_paulo>guangzhou': { h: 30, cost: 3900, mode: 'avião', label: '1 conexão' },
    'cde>guangzhou': { h: 36, cost: 4600, mode: 'avião', label: 'via São Paulo' }
  };
  // cidades novas (somam com as do mapa)
  const CITIES = {
    cde: { name: 'Ciudad del Este', country: 'PY', lon: -54.61, lat: -25.51, x: 451.8, y: 667.2 },
    guangzhou: { name: 'Cantão (Guangzhou)', country: 'CN', lon: 113.26, lat: 23.13, x: 1361.9, y: 376.6 }
  };
  const HINTS = { US: '🚫 precisa de visto (meses)', PY: '📱 eletrônicos mais baratos', CN: '🏭 fábricas e Feira de Cantão' };

  // marcos da meta
  const MILESTONES = [
    { v: 100, title: 'R$ 100', sub: 'Cem vezes o que você tinha.' },
    { v: 1000, title: 'R$ 1 MIL', sub: 'O primeiro mil.' },
    { v: 10000, title: 'R$ 10 MIL', sub: 'Um por cento do caminho.' },
    { v: 100000, title: 'R$ 100 MIL', sub: 'Dez por cento da meta.' },
    { v: 500000, title: 'MEIO MILHÃO', sub: 'Metade do caminho.' }
  ];

  // rota de referência (testada: chega no milhão com umas 11h sobrando). O ADM mostra o próximo passo.
  const ROUTE = [
    { id: 'latinhas', say: 'catar latinha na praia' },
    { id: 'agua_sinal', say: 'vender água no sinal' },
    { id: 'agua_sinal', say: 'vender água no sinal de novo' },
    { id: 'latinhas_show', say: 'catar latinha no show' },
    { id: 'agua', say: 'vender água na praia (compra o isopor)' },
    { id: 'latao', say: 'vender cerveja no bloco (tudo que dá)' },
    { id: 'latao', say: 'vender cerveja no bloco de novo' },
    { id: 'mei', say: 'abrir um MEI' },
    { id: 'microcredito', say: 'pedir microcrédito' },
    { id: 'saara', say: 'revender coisas do Saara (tudo que dá)' },
    { id: 'saara', say: 'revender do Saara de novo' },
    { id: 'loja', say: 'abrir uma loja online' },
    { id: 'bras', say: 'comprar estoque no Brás (viaja pra SP)' },
    { id: 'tiktok', say: 'gravar vídeo pro TikTok (viraliza)' },
    { id: 'esperar', say: 'esperar' },
    { id: 'anuncios', say: 'pagar anúncios' },
    { id: 'esperar', say: 'esperar' },
    { id: 'dormir', say: 'dormir' },
    { id: 'bras', say: 'mais estoque do Brás' },
    { id: 'esperar', say: 'esperar' },
    { id: 'esperar', say: 'esperar' },
    { id: 'bras', say: 'mais estoque do Brás (última vez)' },
    { id: 'esperar', say: 'esperar' },
    { id: 'dormir', say: 'dormir' },
    { id: 'esperar', say: 'esperar' },
    { id: 'vender_loja', say: 'vender a loja → MILHÃO' }
  ];

  window.GAMEDATA = {
    ROUTE,
    ACTIONS: A, ASSETS, WHY, TRIPS, CITIES, HINTS, MILESTONES,
    START_BALANCE: 1, GOAL: 1e6, DAYS: 7,
    START_CITY: 'rio', START_HOUR: 8, START_AWAKE: 1, START_WEEKDAY: 1,
    WEEKDAYS: ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'],
    MIN_WAGE: 1621, // salário mínimo 2026
    DEFAULTS: { sleepH: 7, maxAwakeH: 18, food: 20 }
  };
})();
