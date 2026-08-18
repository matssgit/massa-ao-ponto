# 🍕 Design System & UI Specification --- Pizzaria

> Documento de referência para implementação do frontend da pizzaria.
>
> **Objetivo:** transformar o conceito visual apresentado em uma
> interface real, responsiva e funcional usando HTML, CSS e JavaScript,
> mantendo uma identidade visual única entre site institucional,
> reservas, delivery e painel administrativo.

------------------------------------------------------------------------

# 1. Direção visual

O projeto deve transmitir a sensação de uma **pizzaria artesanal
contemporânea e premium**, combinando:

-   gastronomia artesanal;
-   tecnologia;
-   conforto;
-   sofisticação;
-   experiência digital simples;
-   identidade visual forte.

A referência visual principal combina uma estética clara, elegante e
editorial com detalhes quentes inspirados em forno, tomate, queijo e
fogo.

Evitar completamente a estética genérica de pizzaria:

-   vermelho saturado ocupando toda a interface;
-   verde italiano como cor dominante;
-   xadrez;
-   madeira exagerada;
-   fontes temáticas excessivamente italianas;
-   excesso de elementos decorativos;
-   aparência de template genérico.

A interface deve parecer uma **marca real e contemporânea**, não um
projeto acadêmico.

------------------------------------------------------------------------

# 2. Conceito da marca

Nome provisório:

**FORNO PIZZERIA**

O nome pode ser alterado posteriormente, mas toda a interface deve ser
construída de maneira que a marca possa ser substituída facilmente.

A identidade deve utilizar:

-   logotipo tipográfico;
-   pequeno símbolo relacionado a forno/pizza;
-   aparência artesanal, mas sofisticada;
-   contraste entre tipografia editorial e interface moderna.

------------------------------------------------------------------------

# 3. Paleta visual

Usar uma paleta quente e neutra.

### Cores principais

``` text
Primary:
#E94F2E

Secondary:
#F5A623

Dark:
#181818

Gray:
#686868

Light:
#FAF7F2

Background:
#FFFFFF
```

### Uso das cores

**Primary** - botões principais; - links ativos; - estados
selecionados; - elementos de destaque; - preço em destaque quando
necessário.

**Secondary** - detalhes; - badges; - indicadores; - pequenos elementos
decorativos.

**Dark** - textos principais; - navegação; - fundos do painel
administrativo; - seções de contraste.

**Gray** - textos secundários; - descrições; - metadados.

**Light** - fundos de seções; - cards; - áreas de respiro.

**White** - fundo principal; - cards; - formulários; - áreas de
conteúdo.

A cor principal deve aparecer como **acento**, não dominar a página
inteira.

------------------------------------------------------------------------

# 4. Tipografia

Combinar uma fonte editorial para títulos com uma sans-serif moderna
para interface.

### Headings

Preferencialmente:

**Playfair Display**

Uso:

-   H1;
-   títulos de grandes seções;
-   frases hero;
-   títulos editoriais.

### Interface e corpo

Preferencialmente:

**Inter**

Uso:

-   navegação;
-   botões;
-   formulários;
-   cards;
-   descrições;
-   preços;
-   tabelas;
-   dashboard.

### Hierarquia

``` text
H1
grande, forte e editorial

H2
forte e elegante

H3
mais compacto

Body
limpo e altamente legível

Caption
pequeno e discreto
```

Não utilizar muitas famílias tipográficas.

------------------------------------------------------------------------

# 5. Princípios de layout

O layout deve ter:

-   bastante espaço em branco;
-   grids consistentes;
-   cards com cantos arredondados;
-   bordas discretas;
-   sombras suaves;
-   imagens grandes;
-   bastante respiro entre seções;
-   hierarquia visual clara.

Evitar:

-   excesso de bordas;
-   excesso de sombras;
-   excesso de gradientes;
-   excesso de animações;
-   elementos desalinhados;
-   páginas visualmente congestionadas.

O conteúdo deve parecer organizado mesmo quando houver muitas
informações.

------------------------------------------------------------------------

# 6. Componentes globais

Criar componentes reutilizáveis para:

-   Navbar;
-   Footer;
-   Button;
-   IconButton;
-   Card;
-   ProductCard;
-   PizzaCard;
-   Input;
-   Select;
-   DatePicker;
-   TimeSlot;
-   Badge;
-   StatusBadge;
-   Tabs;
-   Modal;
-   Drawer;
-   Toast;
-   Stepper;
-   QuantitySelector;
-   Checkbox;
-   Radio;
-   Dropdown;
-   Breadcrumb;
-   EmptyState;
-   LoadingState;
-   ErrorState.

Todos devem seguir o mesmo design system.

------------------------------------------------------------------------

# 7. Botões

### Primário

Botão preenchido com a cor `#E94F2E`.

Características:

-   texto branco;
-   cantos arredondados;
-   altura confortável;
-   peso tipográfico médio/semibold;
-   hover discreto;
-   transição suave.

Exemplos:

``` text
Pedir agora
Reservar mesa
Adicionar ao carrinho
Confirmar reserva
Finalizar pedido
```

### Secundário

Botão com fundo transparente ou branco e borda.

Exemplos:

``` text
Ver cardápio
Saiba mais
Voltar
```

### Link

Texto + pequena seta.

Exemplo:

``` text
Ver cardápio completo →
```

------------------------------------------------------------------------

# 8. Navbar

A navegação principal deve ser minimalista.

Desktop:

``` text
[ LOGO ]

Início
Cardápio
Reservas
Sobre
Contato

[ ícone carrinho ]
[ Pedir agora ]
```

O botão "Pedir agora" deve ser visualmente destacado.

A navbar pode ser transparente sobre o hero e assumir fundo sólido
conforme a rolagem.

Mobile:

``` text
[ LOGO ]                         [ MENU ]
```

O menu deve abrir um drawer ou menu lateral elegante.

------------------------------------------------------------------------

# 9. Página Home

A Home deve ser a principal experiência institucional.

## Hero

O hero deve ocupar uma grande área inicial da tela.

Estrutura:

``` text
--------------------------------------------------
Navbar
--------------------------------------------------

[ grande headline ]       [ foto grande de pizza ]

A verdadeira             pizza artesanal
arte de fazer
pizza.

Descrição curta

[ Reservar mesa ]
[ Pedir delivery ]

Pequenos diferenciais:
Ingredientes selecionados
Forno a lenha
Ambiente aconchegante

--------------------------------------------------
```

A imagem da pizza deve ser grande e visualmente dominante.

Pode haver elementos de ingredientes ao redor da imagem, mas de maneira
discreta.

Não poluir o hero.

------------------------------------------------------------------------

# 10. Seção de benefícios

Logo abaixo do hero:

``` text
Uma experiência completa
```

Criar quatro cards:

``` text
🍕 Pedir online
Seu pedido pronto sem complicação.

📅 Reservar mesa
Garanta seu lugar para momentos especiais.

🌿 Ingredientes nobres
Qualidade em cada fatia.

🔥 Tradição e sabor
Autêntica pizza artesanal.
```

Cards claros, arredondados e minimalistas.

------------------------------------------------------------------------

# 11. Seção de pizzas

Título editorial:

``` text
Nossas Pizzas
```

Subtítulo:

``` text
Sabores que conquistam no primeiro pedaço.
```

Tabs:

``` text
Pizzas clássicas
Monte a sua
Massas & entradas
Bebidas
Sobremesas
```

Criar cards de pizza com:

-   foto;
-   nome;
-   descrição;
-   preço;
-   badge "Mais pedida" quando aplicável;
-   botão "Adicionar".

Exemplo:

``` text
[ FOTO DA PIZZA ]

Calabresa Especial

Calabresa fatiada, cebola roxa
e toque de orégano.

R$ 49,90

[ Adicionar ]
```

------------------------------------------------------------------------

# 12. Seção institucional

Criar uma seção contando a história da pizzaria.

Layout dividido:

``` text
[ texto ]                     [ imagem ]

Sobre o Forno

Mais que uma pizzaria,
um lugar para criar
momentos especiais.

Texto curto sobre tradição,
ingredientes e experiência.

Saiba mais →
```

Usar uma fotografia de ambiente da pizzaria.

------------------------------------------------------------------------

# 13. Página de reservas

A experiência de reserva deve parecer um fluxo de checkout.

No topo:

``` text
Reserve sua mesa

Viva a experiência da pizzaria no restaurante.
Escolha uma data, horário e mesa.
```

Abaixo, um stepper:

``` text
01
Data e horário

02
Pessoas

03
Escolha a mesa

04
Confirmação
```

O passo atual deve utilizar a cor primária.

------------------------------------------------------------------------

# 14. Etapa de data e horário

Layout em duas áreas:

``` text
[ Calendário ]       [ Horários disponíveis ]

Agosto 2026

D  S  T  Q  Q  S  S
...

Horários:

18:30
19:00
19:30
20:00
20:30
21:00
```

Horários disponíveis devem aparecer como botões/chips.

Horário selecionado:

``` text
background primary
texto branco
```

Horário indisponível:

``` text
disabled
opacity reduzida
```

------------------------------------------------------------------------

# 15. Etapa de pessoas

Mostrar um contador:

``` text
Para quantas pessoas?

[ − ]     4 pessoas     [ + ]
```

O sistema deve respeitar a capacidade das mesas.

------------------------------------------------------------------------

# 16. Mapa do salão

Esta é uma das features visuais mais importantes do projeto.

Criar uma representação gráfica do salão.

Exemplo conceitual:

``` text
┌───────────────────────────────┐
│                               │
│     [ M01 ]      [ M02 ]      │
│                               │
│ [ M03 ]             [ M04 ]   │
│                               │
│          [ M05 ]              │
│                               │
│ [ M06 ]             [ M07 ]   │
│                               │
│            ENTRADA            │
└───────────────────────────────┘
```

Estados:

``` text
Verde  = disponível
Laranja = selecionada
Vermelho = indisponível
Cinza = desativada
```

A mesa selecionada deve ter destaque visual.

Ao clicar na mesa, mostrar:

``` text
Mesa 05

4 pessoas
12/08/2026
19:30

[ Confirmar reserva ]
```

O mapa deve ser responsivo.

No mobile, não tentar simplesmente reduzir o mapa até ficar ilegível.

------------------------------------------------------------------------

# 17. Resumo da reserva

Antes da confirmação:

``` text
Mesa 05
4 pessoas

12/08/2026
19:30

Nome
Telefone
E-mail
Observação

-------------------------

Política de cancelamento

Você pode cancelar sua reserva
com até 2h de antecedência.

[ Confirmar reserva ]
```

------------------------------------------------------------------------

# 18. Página de delivery

O delivery deve parecer um **mini aplicativo dentro do site**.

A navegação do delivery pode ser mais funcional que a Home.

Header:

``` text
[ LOGO ]

Cardápio
Promoções
Acompanhar pedido

[ localização ]
[ carrinho ]
```

Layout:

``` text
Sidebar / categorias       Produtos
```

Categorias:

``` text
Pizzas
Monte sua pizza
Massas & Entradas
Bebidas
Sobremesas
Combos
```

------------------------------------------------------------------------

# 19. Personalizador de pizza

Esta é outra feature central do projeto.

Título:

``` text
Monte sua Pizza
```

Mostrar uma grande imagem da pizza.

Depois:

### Tamanho

``` text
P
M
G
GG
```

O selecionado utiliza a cor primária.

### Sabores

Exemplo:

``` text
SABORES (até 2)

[ Calabresa ✓ ]
[ Frango c/ Catupiry ✓ ]
[ Portuguesa ]
[ Marguerita ]
[ Quatro Queijos ]
```

O limite de sabores deve ser respeitado pelo sistema.

### Borda

``` text
Tradicional
Catupiry + R$ 6
Cheddar + R$ 6
```

### Adicionais

``` text
☐ Bacon             + R$ 5
☐ Cebola Roxa       + R$ 3
☐ Azeitona          + R$ 3
☐ Queijo Extra      + R$ 6
```

------------------------------------------------------------------------

# 20. Preço da pizza

Sempre mostrar o total de maneira muito clara.

Exemplo:

``` text
Total

R$ 68,90

[ Adicionar ao carrinho ]
```

No mobile, transformar isso em uma barra fixa inferior.

------------------------------------------------------------------------

# 21. Cardápio

O cardápio deve utilizar cards grandes de produto.

Desktop:

``` text
[ Pizza ] [ Pizza ] [ Pizza ]
[ Pizza ] [ Pizza ] [ Pizza ]
```

Cada card:

``` text
[ imagem ]

Nome

Descrição curta

R$ 49,90

[ + ]
```

Adicionar microinterações ao passar o mouse.

------------------------------------------------------------------------

# 22. Carrinho

O carrinho deve funcionar como uma área própria.

Exemplo:

``` text
Seu carrinho

Pizza Grande
Calabresa + Frango
Borda Catupiry

[ − ] 1 [ + ]     R$ 68,90

Coca-Cola 2L

[ − ] 1 [ + ]     R$ 12,90

--------------------------------

Cupom
[ inserir cupom ] [ Aplicar ]

Subtotal             R$ 81,80
Taxa de entrega       R$ 7,00

Total                R$ 88,80

[ Finalizar pedido ]
```

------------------------------------------------------------------------

# 23. Checkout

Fluxo:

``` text
Carrinho
   ↓
Endereço
   ↓
Entrega/Retirada
   ↓
Pagamento
   ↓
Revisão
   ↓
Pedido confirmado
```

O checkout deve ser simples e extremamente claro.

------------------------------------------------------------------------

# 24. Acompanhamento do pedido

Criar uma timeline visual:

``` text
✓ Pedido recebido
✓ Pagamento aprovado
● Em preparação
○ Pronto
○ Saiu para entrega
○ Entregue
```

Mostrar horário dos eventos.

Exemplo:

``` text
Pedido #1024

Recebido       19:22
Pagamento      19:23
Preparação     19:25
```

Também mostrar previsão:

``` text
Previsão de entrega
20:15
```

------------------------------------------------------------------------

# 25. Painel administrativo

O painel administrativo deve possuir identidade visual própria, mas
compartilhar os mesmos componentes do sistema.

Aqui podemos utilizar um tema escuro.

Background:

``` text
#181818
```

Cards:

``` text
#222222
```

Texto:

``` text
#FFFFFF
```

Acento:

``` text
#E94F2E
```

Sidebar:

``` text
Dashboard
Reservas
Mesas
Pedidos
Cardápio
Cupons
Clientes
Relatórios
Configurações
```

------------------------------------------------------------------------

# 26. Dashboard

Mostrar indicadores:

``` text
Faturamento
R$ 8.421,50

Pedidos
132

Reservas
32

Ocupação
82%
```

Abaixo:

### Reservas de hoje

``` text
19:00 João Silva     Mesa 05   Confirmada
19:30 Maria Souza    Mesa 12   Confirmada
20:00 Carlos Lima    Sala 02   Agendada
21:00 Ana Prado      Mesa 03   Confirmada
```

### Pedidos em andamento

Criar um pequeno Kanban:

``` text
NOVOS
PREPARANDO
PRONTOS
SAIU PARA ENTREGA
```

### Ocupação por horário

Adicionar gráfico de barras.

------------------------------------------------------------------------

# 27. Página de pedidos administrativos

Cards compactos:

``` text
#1024
João Silva
R$ 89,90
19:22

[ Ver detalhes ]
```

Filtros:

``` text
Todos
Novos
Preparando
Prontos
Entrega
Finalizados
Cancelados
```

------------------------------------------------------------------------

# 28. Mobile

A experiência mobile não deve ser apenas uma versão reduzida do desktop.

Priorizar:

-   navegação simples;
-   botões grandes;
-   informações essenciais;
-   checkout rápido;
-   carrinho acessível;
-   barra inferior fixa quando necessário.

Telas principais:

1.  Home
2.  Reserva
3.  Mapa de mesas
4.  Personalização da pizza
5.  Carrinho
6.  Checkout
7.  Acompanhamento do pedido
8.  Admin de pedidos

------------------------------------------------------------------------

# 29. Responsividade

Breakpoints podem seguir uma estratégia simples:

``` text
Mobile
até ~767px

Tablet
768px – 1023px

Desktop
1024px+
```

Não é obrigatório utilizar exatamente esses valores se o layout exigir
outros breakpoints.

O importante é que a interface seja realmente responsiva.

------------------------------------------------------------------------

# 30. Animações

Utilizar animações pequenas e elegantes:

-   fade-in;
-   slide-up;
-   hover suave;
-   scale pequeno em cards;
-   transições em botões;
-   seleção de mesa;
-   mudança de quantidade;
-   feedback ao adicionar produto;
-   transição entre etapas da reserva.

Evitar:

-   animações exageradas;
-   parallax excessivo;
-   elementos pulando;
-   efeitos que atrapalhem o pedido.

------------------------------------------------------------------------

# 31. Imagens

A fotografia é parte importante da identidade.

Priorizar:

-   pizzas em close;
-   forno;
-   ingredientes;
-   ambiente da pizzaria;
-   bebidas;
-   sobremesas.

As imagens devem parecer profissionais e apetitosas.

Não utilizar imagens genéricas de baixa qualidade.

Durante o desenvolvimento, placeholders podem ser usados, mas o layout
deve ser preparado para imagens grandes e de alta qualidade.

------------------------------------------------------------------------

# 32. Sistema de estados

Todos os componentes interativos devem possuir estados:

``` text
default
hover
focus
active
selected
disabled
loading
success
error
```

Exemplo de mesa:

``` text
disponível
selecionada
indisponível
desativada
```

Exemplo de pedido:

``` text
recebido
pago
preparando
pronto
entrega
entregue
cancelado
```

------------------------------------------------------------------------

# 33. Acessibilidade

O design deve considerar:

-   contraste adequado;
-   navegação por teclado;
-   labels em inputs;
-   estados de foco;
-   textos alternativos;
-   botões semanticamente corretos;
-   tamanho adequado de áreas clicáveis;
-   mensagens de erro claras.

Não sacrificar acessibilidade em favor de estética.

------------------------------------------------------------------------

# 34. Regras para implementação

Não transformar tudo em uma única página HTML gigantesca.

Estruturar o frontend de maneira organizada e reutilizável.

Separar:

-   componentes;
-   páginas;
-   estilos;
-   dados;
-   lógica;
-   assets.

Criar um design system reutilizável.

Não duplicar estilos ou componentes sem necessidade.

------------------------------------------------------------------------

# 35. Prioridade visual

A hierarquia geral deve ser:

``` text
1. Fotografia / produto
2. Título
3. Ação principal
4. Informação essencial
5. Informação secundária
```

O usuário deve entender rapidamente:

-   onde está;
-   o que pode fazer;
-   quanto custa;
-   qual é o próximo passo.

------------------------------------------------------------------------

# 36. Regra principal para o desenvolvimento

O objetivo NÃO é copiar literalmente uma imagem de referência.

A imagem deve ser tratada como **direção visual**.

O sistema final deve:

-   manter a identidade;
-   melhorar UX;
-   adaptar o layout às funcionalidades reais;
-   funcionar em desktop e mobile;
-   ter componentes consistentes;
-   ser acessível;
-   ser tecnicamente organizado.

Quando houver conflito entre estética e usabilidade, priorizar
**usabilidade sem perder a identidade visual**.

------------------------------------------------------------------------

# 37. Resultado esperado

O resultado final deve parecer um produto comercial real.

A pessoa deve conseguir:

``` text
Entrar no site
     ↓
Conhecer a pizzaria
     ↓
Ver o cardápio
     ↓
Reservar uma mesa
     ↓
Ou pedir uma pizza
     ↓
Personalizar
     ↓
Adicionar ao carrinho
     ↓
Aplicar cupom
     ↓
Informar endereço
     ↓
Pagar
     ↓
Acompanhar pedido
```

E a equipe da pizzaria deve conseguir:

``` text
Entrar no painel
     ↓
Ver dashboard
     ↓
Gerenciar reservas
     ↓
Visualizar mapa de mesas
     ↓
Gerenciar pedidos
     ↓
Gerenciar cardápio
     ↓
Gerenciar cupons
     ↓
Ver clientes
     ↓
Ver relatórios
```

------------------------------------------------------------------------

# 38. Instrução para a IA responsável pela implementação

Use este documento como **Design Specification**.

Antes de implementar uma nova página, verifique se ela está coerente
com:

-   paleta;
-   tipografia;
-   espaçamento;
-   componentes;
-   bordas;
-   sombras;
-   estados;
-   responsividade;
-   hierarquia visual.

Não invente uma nova identidade visual para cada página.

**Todo o produto deve parecer ter sido desenhado pela mesma equipe de
design.**

O objetivo é criar uma experiência única e consistente entre:

**Site → Reservas → Delivery → Checkout → Acompanhamento → Painel
Administrativo.**
