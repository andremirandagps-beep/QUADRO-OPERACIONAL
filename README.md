# Quadro Operacional de Postos de Trabalho & Crachás Interativos

Sistema visual e operacional para gestão de postos de trabalho e alocação de equipes (Vigilância, Portaria e Facilities), com suporte a crachás completos com foto, drag-and-drop para remanejamento de colaboradores e escalas.

---

## 🚀 Como Iniciar

Você tem duas opções simples para abrir o sistema:

1. **Opção 1 (Recomendada):** Dê um duplo-clique no arquivo **`INICIAR_QUADRO.bat`**.
   - O servidor local iniciará e abrirá automaticamente no seu navegador padrão (`http://localhost:3333`).
2. **Opção 2 (Direta):** Dê um duplo-clique no arquivo **`index.html`** para abrir diretamente no Google Chrome, Microsoft Edge ou Firefox sem precisar de terminal.

---

## 🪪 O que cada Crachá contém

Cada crachá de identificação foi desenhado no formato padrão operacional com slot de cordão e traz:
- **Foto do Colaborador:** Foto personalizada ou avatar com iniciais coloridas. Ao clicar na foto ou no botão de editar, você pode carregar qualquer foto do seu computador (JPG, PNG ou WEBP).
- **Nome Completo:** Em destaque no cabeçalho do crachá.
- **Função / Cargo:** Tag com identificação por cores (Vigilante, Porteiro, Líder, Folguista, etc.).
- **Matrícula / Código:** Código de registro do colaborador (ex: `011159`).
- **Data de Admissão:** Data formatada + cálculo de tempo de empresa (ex: `15/06/2022 • 4a 4m`).
- **Escala / Horário:** Detalhamento da jornada (ex: `12x36 - 19:00 às 07:00`).
- **Equipe / Turno:** Indicador de `Equipe 1 (Dias Ímpares)` ou `Equipe 2 (Dias Pares)`.
- **Status Operacional:** Ponto luminoso indicador (`Ativo`, `Férias`, `Afastado`, `Disponível`).

---

## 🎯 Funcionalidades Principais

### 1. Arrastar e Soltar (Drag & Drop)
- **Mudar de Posto:** Clique e segure o crachá e solte-o no posto de destino desejado.
- **Mudar de Equipe:** Mova o crachá entre a coluna da *Equipe 1 (Ímpares)* e da *Equipe 2 (Pares)* no mesmo posto ou em outro posto.
- **Banco de Reserva:** Na parte inferior da tela há uma gaveta de **Banco de Reserva / Folguistas**. Você pode arrastar crachás para a reserva para liberar vagas em um posto, ou puxar da reserva para preencher postos com rapidez.
- **Desfazer (Ctrl+Z):** Se arrastar por engano, clique no botão de desfazer ou pressione `Ctrl+Z`.

### 2. Fotos e Personalização
- Passe o mouse sobre a foto do crachá e clique no ícone da câmera para enviar uma imagem direto do computador.
- As imagens são automaticamente otimizadas e compactadas para salvar no navegador sem pesar.

### 3. Filtros e Pesquisa em Tempo Real
- **Busca Global:** Encontre instantaneamente qualquer colaborador por nome, número de matrícula, nome do posto ou endereço.
- **Filtro por Equipe:** Veja apenas a Equipe 1, Equipe 2 ou Reserva.
- **Filtro por Função:** Filtre por Vigilantes, Porteiros, Líderes ou Folguistas.
- **Filtro por Status:** Visualize apenas quem está em atividade ou quem está em período de férias.
- **Zoom dos Crachás:** Controle deslizante para diminuir ou aumentar os crachás na tela.

### 4. Gestão Completa de Dados
- **Cadastrar Novo Crachá:** Botão `+ Novo Crachá` para cadastrar novos funcionários.
- **Novo Posto de Trabalho:** Cadastre novos clientes, endereços e categorias.
- **Editar / Excluir:** Edite todas as informações a qualquer momento clicando no botão `Editar` do crachá ou do posto.

### 5. Exportação e Impressão
- **Imprimir Crachás:** Layout configurado para folhas A4 com guias de corte para confecção de crachás físicos.
- **Exportar para Excel (CSV):** Gera relatório com todo o efetivo atualizado.
- **Backup e Restauração (JSON):** Salve cópias de segurança de todo o seu quadro.
- **Restaurar Dados Originais:** Permite voltar aos dados originais extraídos da planilha `EQUIPES NOTURNAS.xlsx`.

