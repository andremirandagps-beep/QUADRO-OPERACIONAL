# Quadro Operacional de Postos & Mapeamento de Visitas em Tempo Real

Sistema visual e operacional para gestão de postos de trabalho, alocação de equipes (Vigilância, Portaria e Facilities) e **Mapeamento Geográfico de Clientes por Cidades com Baixa de Visitas de Fiscalização em Campo**.

---

## 🚀 Como Iniciar

Você tem opções simples para abrir o sistema conforme sua necessidade:

1. **Painel de Monitoramento TV / Monitor (Rotação Automática):** Duplo-clique em **`INICIAR_MODO_MONITOR.bat`**
   - Abre o painel em **Tela Cheia** com alternância automática e contínua a cada 60 segundos entre:
     - 📋 **Quadro Operacional** (1 min)
     - 🗺️ **Mapeamento de Clientes & Visitas** (1 min)
     - 🛡️ **Solicitações de Efetivo & Apoio** (1 min)
   - Permite pausar/retomar a rotação a qualquer momento (tecla `Espaço`), alternar tela cheia (`F11`), mudar abas manualmente ou alterar o tempo de rotação.
2. **Mapeamento de Clientes & Baixa de Visitas:** Duplo-clique em **`INICIAR_MAPA.bat`**
   - Abre o mapa interativo com todos os clientes divididos por cidades, status de visita em tempo real e formulário de baixa.
3. **Quadro Operacional de Crachás:** Duplo-clique em **`INICIAR_QUADRO.bat`**
   - Abre o painel de gestão de crachás, escalas e postos de trabalho.
4. **Solicitações de Efetivo:** Duplo-clique em **`INICIAR_SOLICITACOES.bat`**
   - Abre o painel Kanban de chamados e demandas operacionais com links para celulares do efetivo.
5. **Central de Atendimento ao Efetivo (IA + WhatsApp + Painel):** Duplo-clique em **`INICIAR_IA_ATENDIMENTO.bat`**
   - Inicia o servidor e abre simultaneamente:
     - 📱 **Atendimento Virtual do Efetivo:** Autoatendimento com 8 assuntos unificados para Gestão Rumo e Base, supervisores diurno/noturno e atendimento humano sob demanda.
     - 🖥️ **Painel Administrativo (Gestor / RH):** Histórico de chamados em tempo real, controle de status, métricas e gestão de contatos de WhatsApp.

Todos os módulos são integrados e contam com o botão **`🖥️ Modo Monitor (TV)`** nos cabeçalhos.

---

## 🤖 Módulo: Atendimento Virtual ao Efetivo & Painel Administrativo

Fluxo completo de autoatendimento e suporte operacional:

1. **Menu Unificado de Assuntos (Gestão Rumo e Base):**
   - 📅 **RH / Folha-ponto:** Atestados (prazo 48h), batidas e espelho de ponto.
   - 💵 **Pagamento / Holerite:** Datas (dia 20 e 5º dia útil), adiantamento e acesso seguro ao holerite.
   - 💳 **Benefícios:** Recarga de VT, VR/VA, planos de saúde e odontológico.
   - 🏖️ **Férias:** Programação, aviso de 30 dias e abono pecuniário.
   - 🛡️ **Cursos / Reciclagem:** Academia credenciada, agendamento e validade de CNV.
   - 🚨 **Supervisão (Diurno e Noturno):** Escolha imediata de turno:
     - ☀️ **Supervisor Diurno (07:00 às 19:00):** Tel: (41) 99214-8064
     - 🌙 **Supervisor Noturno (19:00 às 07:00):** Tel: (41) 98472-1699
   - 👔 **Uniformes / Materiais:** Reposição de fardamento, coturnos, EPIs e materiais de posto.
   - 💬 **Outros assuntos:** Triagem e atendimento administrativo geral.

2. **Funcionamento do Atendimento:**
   - O funcionário informa seu Nome e Empreendimento (com preenchimento automático para colaboradores cadastrados).
   - A IA responde às dúvidas operacionais com base nas diretrizes oficiais da empresa.
   - Se a dúvida não for resolvida ou se o colaborador clicar em **"👤 Falar com Humano"** a qualquer momento, o sistema gera o protocolo oficial e transfere a conversa diretamente para o WhatsApp do responsável com a mensagem pré-formatada.
   - **Registro Simultâneo:** Todo chamado é registrado no banco de dados SQLite (`ia_atendimentos`) e disponibilizado no **Painel Administrativo** (`painel-atendimento.html`) para acompanhamento de SLA, status e auditoria.

---

## 🗺️ Novo Módulo: Mapeamento de Clientes & Controle de Visitas

O novo módulo foi construído especificamente para controle de fiscalização e visitas em postos:

1. **Mapeamento por Cidades (Leaflet / OpenStreetMap):**
   - Todos os clientes localizados geograficamente com marcadores de alta precisão.
   - Filtro instantâneo por cidades (Curitiba, São José dos Pinhais, Araucária, Pinhais, Colombo, Piraquara, Fazenda Rio Grande, Quatro Barras, Rio Negro, Arujá).
2. **Destaque Visual por Status de Visita:**
   - 🟢 **Em Dia (Verde):** Posto visitado nos últimos 15 dias.
   - 🟡 **Atenção (Amarelo):** Sem visita há 16 a 30 dias.
   - 🔴 **Crítico (Vermelho):** Sem visita há mais de 30 dias ou nenhuma visita registrada.
3. **Dar Baixa na Visita (Celular & Computador):**
   - Botão **"Dar Baixa"** direto no card do cliente ou clicando no marcador no mapa.
   - Registro de: Fiscal responsável, Data/Hora, Tipo de Visita (Rotina, Auditoria, Ronda, Alinhamento, Ocorrência), Avaliação e Checklist Operacional.
   - Atualização em tempo real sem recarregar a tela.
4. **Histórico de Visitas:**
   - Linha do tempo completa de todas as baixas realizadas no posto.
5. **Exportação de Relatórios:**
   - Exportação em formato compatível com Excel (.CSV) com cobertura e status de todos os clientes.

---

## 🌐 Como Colocar Tudo Online (Acesso Remoto / Celular dos Fiscais)

Para os fiscais na rua acessarem pelo celular sem complicação:

- **Opção 1 (Gratuita via Nuvem - Render / Railway / Fly.io):**
  - Conecte o repositório GitHub e suba como Web Service com comando de start `node server.js`. O sistema roda com SQLite persistente.
- **Opção 2 (Acesso Imediato via Cloudflare Tunnel ou Ngrok):**
  - No computador onde o sistema roda, execute: `npx cloudflared tunnel --url http://localhost:3333`
  - Ele gera na hora um link público seguro HTTPS (ex: `https://grupo-gps-visitas.trycloudflare.com`) para abrir no celular de qualquer lugar!

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

