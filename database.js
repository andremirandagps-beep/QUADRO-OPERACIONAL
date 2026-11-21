/**
 * BANCO DE DADOS - QUADRO OPERACIONAL GRUPO GPS
 * SQLite via better-sqlite3
 * Schema: postos, colaboradores, historico_movimentacoes
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'database', 'quadro_operacional.db');

// Ensure database directory exists
if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ========================================================
// SCHEMA CREATION
// ========================================================
function initSchema() {
  db.exec(`
    -- Tabela de Postos de Trabalho
    CREATE TABLE IF NOT EXISTS postos (
      id          TEXT PRIMARY KEY,
      code        TEXT,
      name        TEXT NOT NULL,
      short_name  TEXT,
      category    TEXT DEFAULT 'Segurança / Vigilância',
      address     TEXT,
      created_at  TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at  TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- Tabela de Colaboradores
    CREATE TABLE IF NOT EXISTS colaboradores (
      id              TEXT PRIMARY KEY,
      matricula       TEXT,
      nome            TEXT NOT NULL,
      funcao          TEXT DEFAULT 'VIGILANTE',
      escala          TEXT,
      equipe          TEXT DEFAULT 'Equipe 1 (Ímpares)',
      equipe_origem   TEXT,
      data_admissao   TEXT,
      status          TEXT DEFAULT 'Ativo',
      observacoes     TEXT,
      foto            TEXT,
      posto_id        TEXT,
      created_at      TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at      TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (posto_id) REFERENCES postos(id) ON DELETE SET NULL
    );

    -- Tabela de Histórico de Movimentações (Log de Drag & Drop e mudanças de posto)
    CREATE TABLE IF NOT EXISTS historico_movimentacoes (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      colaborador_id  TEXT NOT NULL,
      nome_colaborador TEXT,
      posto_origem_id TEXT,
      posto_origem_nome TEXT,
      posto_destino_id TEXT,
      posto_destino_nome TEXT,
      equipe_anterior TEXT,
      equipe_nova     TEXT,
      status_anterior TEXT,
      status_novo     TEXT,
      tipo_acao       TEXT DEFAULT 'MOVIMENTACAO',
      observacao      TEXT,
      data_hora       TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- Tabela de Visitas Operacionais nos Postos
    CREATE TABLE IF NOT EXISTS visitas (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      posto_id        TEXT NOT NULL,
      data_visita     TEXT NOT NULL,
      fiscal_nome     TEXT NOT NULL,
      tipo_visita     TEXT DEFAULT 'Rotina Operacional',
      status          TEXT DEFAULT 'Conforme',
      checklist_json  TEXT,
      observacoes     TEXT,
      created_at      TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (posto_id) REFERENCES postos(id) ON DELETE CASCADE
    );

    -- Índices para melhorar performance
    CREATE INDEX IF NOT EXISTS idx_colab_posto ON colaboradores(posto_id);
    CREATE INDEX IF NOT EXISTS idx_colab_equipe ON colaboradores(equipe);
    CREATE INDEX IF NOT EXISTS idx_colab_status ON colaboradores(status);
    CREATE INDEX IF NOT EXISTS idx_colab_nome ON colaboradores(nome);
    CREATE INDEX IF NOT EXISTS idx_hist_colab ON historico_movimentacoes(colaborador_id);
    CREATE INDEX IF NOT EXISTS idx_hist_data ON historico_movimentacoes(data_hora);
    CREATE INDEX IF NOT EXISTS idx_visitas_posto ON visitas(posto_id);
    CREATE INDEX IF NOT EXISTS idx_visitas_data ON visitas(data_visita);

    -- Tabela de Solicitações da Operação / Segurança
    CREATE TABLE IF NOT EXISTS solicitacoes (
      id              TEXT PRIMARY KEY,
      tipo            TEXT NOT NULL,
      titulo          TEXT NOT NULL,
      solicitante     TEXT NOT NULL,
      posto_id        TEXT,
      posto_nome      TEXT,
      turno           TEXT,
      quantidade      INTEGER,
      prazo           TEXT NOT NULL,
      prioridade      TEXT DEFAULT 'normal',
      coluna          TEXT DEFAULT 'pendente',
      descricao       TEXT,
      created_at      TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at      TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_solic_coluna ON solicitacoes(coluna);
    CREATE INDEX IF NOT EXISTS idx_solic_prazo ON solicitacoes(prazo);
    CREATE INDEX IF NOT EXISTS idx_solic_posto ON solicitacoes(posto_id);

    -- Tabela de Categorias de Solicitações
    CREATE TABLE IF NOT EXISTS categorias_solicitacao (
      id        TEXT PRIMARY KEY,
      nome      TEXT NOT NULL,
      icon      TEXT DEFAULT '📦',
      ativo     INTEGER DEFAULT 1,
      ordem     INTEGER DEFAULT 99,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- Tabela de Funções / Cargos
    CREATE TABLE IF NOT EXISTS funcoes_cargo (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      nome      TEXT NOT NULL UNIQUE,
      icone     TEXT DEFAULT '👤',
      ativo     INTEGER DEFAULT 1,
      ordem     INTEGER DEFAULT 99,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );
  `);

  // Migrações dinâmicas de colunas para postos (cidade, latitude, longitude)
  const postCols = db.pragma('table_info(postos)').map(c => c.name);
  if (!postCols.includes('cidade')) {
    db.exec(`ALTER TABLE postos ADD COLUMN cidade TEXT`);
  }
  if (!postCols.includes('latitude')) {
    db.exec(`ALTER TABLE postos ADD COLUMN latitude REAL`);
  }
  if (!postCols.includes('longitude')) {
    db.exec(`ALTER TABLE postos ADD COLUMN longitude REAL`);
  }

  // Migrações dinâmicas para solicitacoes
  const solicCols = db.pragma('table_info(solicitacoes)').map(c => c.name);
  if (!solicCols.includes('cargo')) {
    db.exec(`ALTER TABLE solicitacoes ADD COLUMN cargo TEXT`);
  }
  if (!solicCols.includes('cpf')) {
    db.exec(`ALTER TABLE solicitacoes ADD COLUMN cpf TEXT`);
  }
  if (!solicCols.includes('data_solicitacao')) {
    db.exec(`ALTER TABLE solicitacoes ADD COLUMN data_solicitacao TEXT`);
  }
  if (!solicCols.includes('motivo_reprovacao')) {
    db.exec(`ALTER TABLE solicitacoes ADD COLUMN motivo_reprovacao TEXT`);
  }
  if (!solicCols.includes('data_decisao')) {
    db.exec(`ALTER TABLE solicitacoes ADD COLUMN data_decisao TEXT`);
  }
  if (!solicCols.includes('decidido_por')) {
    db.exec(`ALTER TABLE solicitacoes ADD COLUMN decidido_por TEXT`);
  }

  // Tabela de Histórico de Ações da Solicitação
  db.exec(`
    CREATE TABLE IF NOT EXISTS solicitacoes_historico (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      solicitacao_id  TEXT NOT NULL,
      acao            TEXT NOT NULL,
      descricao       TEXT,
      usuario         TEXT DEFAULT 'ADMIN',
      data_hora       TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_hist_solic ON solicitacoes_historico(solicitacao_id);
    UPDATE solicitacoes SET coluna = 'pendente' WHERE coluna = 'analise' OR coluna IS NULL;
  `);

  // Seeds de Categorias (apenas se a tabela estiver vazia)
  const catCount = db.prepare('SELECT COUNT(*) as c FROM categorias_solicitacao').get().c;
  if (catCount === 0) {
    const seedCats = [
      { id: 'alimentacao', nome: 'Alimentação / Plantão', icon: '🍱', ordem: 1 },
      { id: 'efetivo',     nome: 'Reforço de Efetivo',   icon: '👮', ordem: 2 },
      { id: 'material',    nome: 'Material Tático',       icon: '🔦', ordem: 3 },
      { id: 'comunicacao', nome: 'Rádios HT / PTT',       icon: '📻', ordem: 4 },
      { id: 'epi',         nome: 'EPI & Uniformes',       icon: '🛡️', ordem: 5 },
      { id: 'transporte',  nome: 'Ronda / VTR',           icon: '🚔', ordem: 6 },
    ];
    const insertCat = db.prepare('INSERT OR IGNORE INTO categorias_solicitacao (id, nome, icon, ordem) VALUES (?, ?, ?, ?)');
    seedCats.forEach(c => insertCat.run(c.id, c.nome, c.icon, c.ordem));
    console.log('🌱 Categorias de solicitação criadas com dados iniciais.');
  }

  // Seeds de Funções (apenas se a tabela estiver vazia)
  const funcCount = db.prepare('SELECT COUNT(*) as c FROM funcoes_cargo').get().c;
  if (funcCount === 0) {
    const seedFuncs = [
      { nome: 'Vigilante',                icone: '👮',  ordem: 1 },
      { nome: 'Vigilante Folguista',       icone: '🔄',  ordem: 2 },
      { nome: 'Vigilante Ferista',         icone: '📅',  ordem: 3 },
      { nome: 'Vigilante Líder',           icone: '⭐',  ordem: 4 },
      { nome: 'Supervisor Operacional',    icone: '📋',  ordem: 5 },
      { nome: 'Fiscal de Segurança',       icone: '🔍',  ordem: 6 },
      { nome: 'Porteiro / Controlador',    icone: '🚪',  ordem: 7 },
      { nome: 'Monitor CFTV',              icone: '🖥️', ordem: 8 },
      { nome: 'Vigia',                     icone: '👁️', ordem: 9 },
      { nome: 'Coordenador Operacional',   icone: '👔',  ordem: 10 },
      { nome: 'Assistente Administrativo', icone: '💼',  ordem: 11 },
      { nome: 'Gerente de Contrato',       icone: '🏢',  ordem: 12 },
      { nome: 'Outro',                     icone: '🏷️', ordem: 13 },
    ];
    const insertFunc = db.prepare('INSERT OR IGNORE INTO funcoes_cargo (nome, icone, ordem) VALUES (?, ?, ?)');
    seedFuncs.forEach(f => insertFunc.run(f.nome, f.icone, f.ordem));
    console.log('🌱 Funções/Cargos criados com dados iniciais.');
  }

  // ========================================================
  // MÓDULO IA - ATENDIMENTO AO EFETIVO & PAINEL DE CONTROLE
  // ========================================================
  db.exec(`
    -- Contatos de WhatsApp e Responsáveis por Setor e Gestão
    CREATE TABLE IF NOT EXISTS ia_contatos (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      responsavel     TEXT NOT NULL,
      setor           TEXT NOT NULL,
      gestao          TEXT NOT NULL DEFAULT 'Geral', -- 'Rumo', 'Base', 'Geral'
      empreendimento  TEXT DEFAULT 'Todos',
      whatsapp        TEXT NOT NULL,
      observacoes     TEXT,
      ativo           INTEGER DEFAULT 1,
      created_at      TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- Base de Conhecimento Oficial da IA (Respostas e Regras)
    CREATE TABLE IF NOT EXISTS ia_base_conhecimento (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      assunto              TEXT NOT NULL,
      titulo               TEXT NOT NULL,
      palavras_chave       TEXT,
      resposta_oficial     TEXT NOT NULL,
      gestao_aplicavel     TEXT DEFAULT 'Todas', -- 'Todas', 'Rumo', 'Base'
      exigir_escalonamento INTEGER DEFAULT 0,
      ativo                INTEGER DEFAULT 1,
      ordem                INTEGER DEFAULT 0,
      created_at           TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at           TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- Histórico de Atendimentos Realizados pela IA
    CREATE TABLE IF NOT EXISTS ia_atendimentos (
      id                    TEXT PRIMARY KEY,
      protocolo             TEXT NOT NULL,
      colaborador_id        TEXT,
      colaborador_nome      TEXT NOT NULL,
      colaborador_matricula TEXT NOT NULL,
      gestao                TEXT NOT NULL,
      empreendimento        TEXT,
      assunto               TEXT NOT NULL,
      mensagem_inicial      TEXT,
      historico_conversa    TEXT,
      resolvido_por         TEXT DEFAULT 'Pendente',
      responsavel_destino   TEXT,
      responsavel_whatsapp  TEXT,
      status                TEXT DEFAULT 'Aberto',
      observacoes_gestor    TEXT,
      avaliacao             INTEGER,
      created_at            TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at            TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_ia_atend_status ON ia_atendimentos(status);
    CREATE INDEX IF NOT EXISTS idx_ia_atend_mat ON ia_atendimentos(colaborador_matricula);
    CREATE INDEX IF NOT EXISTS idx_ia_atend_dt ON ia_atendimentos(created_at);
  `);

  // Seeds de Contatos WhatsApp Iniciais (contatos.csv)
  const iaContatosCount = db.prepare('SELECT COUNT(*) as c FROM ia_contatos').get().c;
  if (iaContatosCount === 0) {
    const seedContatos = [
      { responsavel: 'Bartolomeu (Central Principal GPS)', setor: 'Atendimento Virtual IA', gestao: 'Geral', empreendimento: 'Todos', whatsapp: '41984721699', observacoes: 'Número Principal do Assistente Virtual Bartolomeu', ativo: 1 },
      { responsavel: 'Supervisor Diurno', setor: 'Supervisão', gestao: 'Geral', empreendimento: 'Todos', whatsapp: '41992148064', observacoes: 'Plantão Diurno (07:00 às 19:00)', ativo: 1 },
      { responsavel: 'Supervisor Noturno', setor: 'Supervisão', gestao: 'Geral', empreendimento: 'Todos', whatsapp: '41984721699', observacoes: 'Plantão Noturno / Ronda Noturna (19:00 às 07:00)', ativo: 1 },
      { responsavel: 'Gestão Rumo / RH', setor: 'Gestão / RH', gestao: 'Rumo', empreendimento: 'Todos', whatsapp: '41992642985', observacoes: 'Gestão e RH específico para funcionários da Rumo', ativo: 1 },
      { responsavel: 'Dayana', setor: 'RH', gestao: 'Base', empreendimento: 'Todos', whatsapp: '41992908312', observacoes: 'RH Base - Folha, Ponto e Atendimento ao Efetivo', ativo: 1 },
      { responsavel: 'Engel', setor: 'RH', gestao: 'Base', empreendimento: 'Todos', whatsapp: '4199900829', observacoes: 'RH Base - Ponto e Admissões', ativo: 1 },
      { responsavel: 'Débora', setor: 'Benefícios', gestao: 'Base', empreendimento: 'Todos', whatsapp: '41992642985', observacoes: 'Benefícios Base (VT, VR, VA, Saúde e Odonto)', ativo: 1 },
      { responsavel: 'Engel (Benefícios)', setor: 'Benefícios', gestao: 'Base', empreendimento: 'Todos', whatsapp: '4199900829', observacoes: 'Benefícios Base - Suporte e Cartões', ativo: 1 },
      { responsavel: 'Benefícios Rumo', setor: 'Benefícios', gestao: 'Rumo', empreendimento: 'Todos', whatsapp: '41992642985', observacoes: 'Benefícios Gestão Rumo (VT, VR, VA e Saúde)', ativo: 1 },
      { responsavel: 'Coordenação de Treinamento', setor: 'Treinamento', gestao: 'Geral', empreendimento: 'Todos', whatsapp: '41992148064', observacoes: 'Cursos de Formação, Reciclagem e Academia GPS', ativo: 1 },
      { responsavel: 'Responsável Operacional', setor: 'Operacional', gestao: 'Geral', empreendimento: 'Todos', whatsapp: '41992148064', observacoes: 'Uniformes, EPIs e Materiais de Apoio', ativo: 1 },
      { responsavel: 'Atendimento Administrativo', setor: 'Administrativo', gestao: 'Geral', empreendimento: 'Todos', whatsapp: '41992148064', observacoes: 'Dúvidas Gerais e Atendimento Administrativo', ativo: 1 }
    ];
    const insContato = db.prepare('INSERT INTO ia_contatos (responsavel, setor, gestao, empreendimento, whatsapp, observacoes, ativo) VALUES (@responsavel, @setor, @gestao, @empreendimento, @whatsapp, @observacoes, @ativo)');
    seedContatos.forEach(c => insContato.run(c));
    console.log('🌱 Contatos de WhatsApp da IA criados com dados iniciais.');
  }

  // Seeds da Base de Conhecimento Oficial da IA
  const iaConhecimentoCount = db.prepare('SELECT COUNT(*) as c FROM ia_base_conhecimento').get().c;
  if (iaConhecimentoCount === 0) {
    const seedConhecimento = [
      {
        assunto: 'Folha-ponto',
        titulo: 'Registro de Ponto, Espelho e Envio de Atestados',
        palavras_chave: 'ponto, folha de ponto, bater ponto, esqueci de bater, espelho de ponto, batida, atraso, falta, atestado, justificativa, banco de horas',
        resposta_oficial: '📌 **Orientações sobre Folha-Ponto e Atestados Médicos:**\n\n1. **Registro de Ponto:** Todo colaborador deve registrar pontualmente suas batidas (entrada, intervalo e saída) no relógio biométrico ou aplicativo homologado do Grupo GPS.\n2. **Esquecimento ou divergência:** Solicite a ficha de ajuste manual de ponto ao seu supervisor imediato ou informe a justificativa com data e horário da batida faltante.\n3. **Atestados Médicos:** Devem ser encaminhados em até **48 horas úteis** da data de emissão. O documento deve conter carimbo legível, CRM, CID e assinatura do médico.\n4. **Encaminhamento:** Se precisar enviar o atestado ou ajustar pendências, escolha sua gestão (Rumo ou Base) para falar diretamente com o RH responsável pelo WhatsApp.',
        gestao_aplicavel: 'Todas',
        exigir_escalonamento: 0,
        ordem: 1
      },
      {
        assunto: 'Holerite',
        titulo: 'Consulta Segura de Holerite e Contracheque',
        palavras_chave: 'holerite, contracheque, comprovante de pagamento, contracheque online, salario comprovante, rendimentos, informe de rendimentos, irrf',
        resposta_oficial: '🔒 **Acesso Seguro ao Holerite / Contracheque:**\n\nPor normas da LGPD e sigilo financeiro, dados salariais e demonstrativos de pagamento não são expostos em chats abertos.\n\n📱 **Como acessar seu holerite:**\n1. Acesse o **Portal do Colaborador Grupo GPS** ou o aplicativo oficial da empresa.\n2. Digite seu CPF e senha cadastrada.\n3. Selecione a competência desejada para download em PDF.\n\n⚠️ Caso não tenha login ou tenha esquecido a senha, clique no botão abaixo para que o RH da sua gestão (Rumo ou Base) reset seu acesso com segurança.',
        gestao_aplicavel: 'Todas',
        exigir_escalonamento: 0,
        ordem: 2
      },
      {
        assunto: 'Pagamento',
        titulo: 'Datas de Pagamento, Adiantamento e Adicionais',
        palavras_chave: 'pagamento, adiantamento, dia 20, quinto dia util, salario, caiu salario, adicional noturno, periculosidade, hora extra, conta salario',
        resposta_oficial: '💵 **Calendário e Regras de Pagamento do Grupo GPS:**\n\n• **Adiantamento Salarial (Vale):** Disponibilizado até o dia **20** de cada mês.\n• **Saldo de Salário:** Creditado até o **5º dia útil** do mês subsequente.\n• **Adicional Noturno:** 20% sobre as horas trabalhadas entre 22:00 e 05:00.\n• **Periculosidade (30%):** Pago a funções de vigilância armada e desarmada conforme legislação.\n• **Horas Extras e Feriados:** Apurados conforme escala (50% em dias normais e 100% em feriados/folgas trabalhadas).\n\nPara conferência de valores específicos da sua folha, fale com o RH da sua gestão via WhatsApp.',
        gestao_aplicavel: 'Todas',
        exigir_escalonamento: 0,
        ordem: 3
      },
      {
        assunto: 'Benefícios',
        titulo: 'Vale Transporte (VT), VR/VA e Planos de Saúde/Odontológico',
        palavras_chave: 'beneficios, vale transporte, vt, urbs, metrocard, vale refeicao, vale alimentacao, vr, va, alelo, ticket, cartao beneficios, plano de saude, unimed, odonto, dentista',
        resposta_oficial: '💳 **Benefícios do Colaborador:**\n\n1. **Vale Transporte (VT):** As cargas nos cartões de transporte (URBS, Metrocard, etc.) são efetuadas até o último dia útil para utilização no mês seguinte. Em caso de troca de linha ou mudança de endereço, envie comprovante atualizado.\n2. **Vale Alimentação / Refeição (VA/VR):** Disponibilizado mensalmente no cartão de benefícios da operadora parceira. Para desbloqueio, utilize o aplicativo da bandeira do cartão com seu CPF.\n3. **Planos de Saúde e Odonto:** A inclusão de dependentes (cônjuge e filhos até 21 anos) ou segunda via de carteirinha digital deve ser tratada diretamente com o setor de Benefícios.\n\nClique no botão abaixo para falar com o responsável de Benefícios no WhatsApp.',
        gestao_aplicavel: 'Todas',
        exigir_escalonamento: 0,
        ordem: 4
      },
      {
        assunto: 'Férias',
        titulo: 'Programação de Férias, Período Aquisitivo e Pagamento',
        palavras_chave: 'ferias, programacao de ferias, quando tiro ferias, periodo aquisitivo, 30 dias, abono pecuniario, vender ferias, adiantamento de 13, decimo terceiro ferias, recibo de ferias',
        resposta_oficial: '🏖️ **Orientações sobre Férias no Grupo GPS:**\n\n1. **Aviso Prévio de Férias:** Por legislação e norma interna, a empresa comunica a data de início com no mínimo **30 dias de antecedência** mediante assinatura do aviso.\n2. **Pagamento:** A remuneração das férias (salário + 1/3 constitucional) é paga até **2 dias antes** do início do período de gozo.\n3. **Abono Pecuniário (Venda de 10 dias):** Deve ser solicitado formalmente até 15 dias antes do término do período aquisitivo.\n4. **Retorno:** O colaborador deve se reapresentar ao posto no dia seguinte ao término das férias conforme escala.\n\nPara verificar sua previsão de férias ou assinar seu recibo, fale diretamente com o RH da sua gestão (Rumo ou Base) pelo WhatsApp.',
        gestao_aplicavel: 'Todas',
        exigir_escalonamento: 0,
        ordem: 5
      },
      {
        assunto: 'Reciclagem',
        titulo: 'Curso de Reciclagem de Vigilante e Convocação',
        palavras_chave: 'reciclagem, curso de vigilante, certificado, validade da reciclagem, academia, policia federal, data da reciclagem, escala de reciclagem',
        resposta_oficial: '🛡️ **Curso de Reciclagem de Formação de Vigilante:**\n\n• **Validade:** A reciclagem é obrigatória a cada **2 anos** conforme exigência da Polícia Federal.\n• **Convocação:** O setor operacional e a supervisão convocam o colaborador com antecedência de 30 dias.\n• **Documentos Necessários:** RG, CPF, Título de Eleitor, Certificado de Reservista, Atestado de Antecedentes Criminais e Exame Psicotécnico/Médico atualizado.\n• **Remuneração e Escala:** Os dias do curso são abonados mediante apresentação do comprovante da academia credenciada.\n\nPara consultar a data de vencimento da sua reciclagem ou escala, fale com a Supervisão pelo WhatsApp.',
        gestao_aplicavel: 'Todas',
        exigir_escalonamento: 0,
        ordem: 5
      },
      {
        assunto: 'Supervisão',
        titulo: 'Supervisão Operacional, Plantão Noturno e Emergências',
        palavras_chave: 'supervisao, supervisor, supervisor da noite, plantao 24h, rendicao, falta no posto, problema no posto, ronda, emergencia, livro de ocorrencias',
        resposta_oficial: '🚨 **Supervisão Operacional do Grupo GPS:**\n\n• **Plantão Diurno / 24h:** Atendimento a dúvidas operacionais gerais, vistorias e suporte de escala.\n• **Supervisor da Noite:** Atendimento especializado no período noturno (19:00 às 07:00) para ocorrências, rendições emergenciais, falta de colega e rondas táticas.\n• **Livro de Ocorrências:** Registre todos os fatos relevantes durante o turno.\n\nSe você está em situação de emergência ou rendição no posto, clique imediatamente no botão do WhatsApp abaixo.',
        gestao_aplicavel: 'Todas',
        exigir_escalonamento: 1,
        ordem: 6
      },
      {
        assunto: 'Uniformes',
        titulo: 'Reposição e Troca de Uniformes e EPIs',
        palavras_chave: 'uniforme, farda, coturno, bota, camisa, calca, jaqueta, reposicao de uniforme, tamanho, epi, colete, capa de chuva',
        resposta_oficial: '👔 **Regras para Uniformes e EPIs:**\n\n1. **Troca por Desgaste:** Solicite à supervisão informando o item necessário (camisa, calça, jaqueta ou coturno) e numeração correta.\n2. **Devolução Obrigatória:** A peça antiga desgastada deve ser entregue no ato da retirada da peça nova.\n3. **EPIs (Colete Balístico, Capa de Chuva, Lanterna):** Devem permanecer obrigatoriamente no posto ou sob guarda cautelar individual.\n\nPara solicitar reposição de peças de uniforme, entre em contato com a Supervisão via WhatsApp.',
        gestao_aplicavel: 'Todas',
        exigir_escalonamento: 0,
        ordem: 7
      },
      {
        assunto: 'Material de apoio',
        titulo: 'Materiais Operacionais para o Posto de Trabalho',
        palavras_chave: 'material de apoio, livro de ata, livro de ocorrencia, lanterna, pilha, prancheta, detector de metal, radio ht, bateria, carregador',
        resposta_oficial: '📦 **Solicitação de Material de Apoio:**\n\n• Materiais comuns: Livro de ata/ocorrência, pilhas recarregáveis, carregador de rádio HT, pranchetas, canetas, lanternas táticas e detector manual de metais.\n• Para reabastecimento do posto, o supervisor operacional inclui o pedido na rota semanal ou você pode registrar a demanda pelo sistema de Apoio Operacional GPS.\n\nCaso o material seja urgente para o seu turno de serviço, acione a Supervisão no botão abaixo.',
        gestao_aplicavel: 'Todas',
        exigir_escalonamento: 0,
        ordem: 8
      },
      {
        assunto: 'Combustível',
        titulo: 'Cartão de Combustível e Abastecimento de Frotas',
        palavras_chave: 'combustivel, gasolina, alcool, diesel, abastecer, abastecimento, ticket log, cartao combustivel, posto credenciado, quilometragem, km',
        resposta_oficial: '⛽ **Regras de Abastecimento de Viaturas e Motos:**\n\n1. **Postos Credenciados:** Utilize apenas a rede credenciada do cartão frota (Ticket Log / Good Card).\n2. **Cupom e Odômetro:** É obrigatório conferir a quilometragem exata do odômetro digitada na maquininha pelo frentista antes de digitar a senha.\n3. **Guarda do Comprovante:** Guarde o cupom fiscal de abastecimento e anote no relatório diário de tráfego (RDT).\n\nEm caso de cartão bloqueado, sem saldo ou problemas no posto, contate imediatamente a Supervisão de plantão.',
        gestao_aplicavel: 'Todas',
        exigir_escalonamento: 0,
        ordem: 9
      },
      {
        assunto: 'Manutenção de veículos',
        titulo: 'Checklist Diário, Manutenção Preventiva e Sinistros',
        palavras_chave: 'manutencao, viatura, vtr, moto, pneu, freio, oleo, troca de oleo, avaria, conserto, oficina, batida, sinistro, veiculo',
        resposta_oficial: '🚗 **Manutenção e Cuidados com Veículos Operacionais:**\n\n• **Checklist Diário:** Inspecione nível de óleo do motor, água do radiador, calibragem e estado dos pneus, luzes e sirene antes de iniciar a ronda.\n• **Troca de Óleo / Revisão:** Avise com 500 km de antecedência da quilometragem da etiqueta para agendamento em oficina credenciada.\n• **Sinistro ou Pane Mecânica:** Pare o veículo em local seguro, sinalize com triângulo e comunique imediatamente o Plantão da Supervisão.',
        gestao_aplicavel: 'Todas',
        exigir_escalonamento: 1,
        ordem: 10
      },
      {
        assunto: 'Escala e Posto',
        titulo: 'Consulta de Posto de Trabalho, Equipe e Horário de Escala',
        palavras_chave: 'escala, minha escala, meu posto, onde trabalho, equipe, impar, par, 12x36, horario de trabalho, folga, folguista, ferista',
        resposta_oficial: '📅 **Consulta de Escala e Alocação:**\n\nO sistema do Quadro Operacional do Grupo GPS mantém atualizada a relação de postos, equipes (Ímpares / Pares) e horários de cada colaborador.\n\n💡 Digitando sua matrícula ou nome nesta tela, o sistema já identifica seu posto cadastrado, escala e equipe. Se houver remanejamento recente ou permuta de plantão com colega, confirme a liberação formal com a Supervisão.',
        gestao_aplicavel: 'Todas',
        exigir_escalonamento: 0,
        ordem: 11
      }
    ];

    const insConh = db.prepare('INSERT INTO ia_base_conhecimento (assunto, titulo, palavras_chave, resposta_oficial, gestao_aplicavel, exigir_escalonamento, ordem) VALUES (@assunto, @titulo, @palavras_chave, @resposta_oficial, @gestao_aplicavel, @exigir_escalonamento, @ordem)');
    seedConhecimento.forEach(k => insConh.run(k));
    console.log('🌱 Base de Conhecimento da IA criada com dados iniciais.');
  }

  console.log('✅ Schema do banco de dados criado/verificado com sucesso.');
}

// ========================================================
// PREPARED STATEMENTS
// ========================================================
let stmts = {};

function prepareStatements() {
  stmts = {
    // Postos
    getAllPostos: db.prepare(`
      SELECT p.*,
             COUNT(c.id) as total_colaboradores
      FROM postos p
      LEFT JOIN colaboradores c ON c.posto_id = p.id
      GROUP BY p.id
      ORDER BY CASE WHEN p.id = 'posto-gestao-operacional' THEN 0 ELSE 1 END, p.name
    `),
    getPostoById: db.prepare('SELECT * FROM postos WHERE id = ?'),
    insertPosto: db.prepare(`
      INSERT INTO postos (id, code, name, short_name, category, address)
      VALUES (@id, @code, @name, @short_name, @category, @address)
    `),
    updatePosto: db.prepare(`
      UPDATE postos
      SET code = @code, name = @name, short_name = @short_name,
          category = @category, address = @address,
          updated_at = datetime('now', 'localtime')
      WHERE id = @id
    `),
    deletePosto: db.prepare('DELETE FROM postos WHERE id = ?'),

    // Colaboradores
    getAllColabs: db.prepare(`
      SELECT c.*, p.name as posto_nome, p.short_name as posto_short_name
      FROM colaboradores c
      LEFT JOIN postos p ON p.id = c.posto_id
      ORDER BY c.nome
    `),
    getColabsByPosto: db.prepare(`
      SELECT * FROM colaboradores WHERE posto_id = ? ORDER BY equipe, nome
    `),
    getColabsReserva: db.prepare(`
      SELECT * FROM colaboradores WHERE posto_id IS NULL OR posto_id = 'reserva' ORDER BY nome
    `),
    getColabById: db.prepare('SELECT * FROM colaboradores WHERE id = ?'),
    insertColab: db.prepare(`
      INSERT INTO colaboradores
        (id, matricula, nome, funcao, escala, equipe, equipe_origem, data_admissao, status, observacoes, foto, posto_id)
      VALUES
        (@id, @matricula, @nome, @funcao, @escala, @equipe, @equipe_origem, @data_admissao, @status, @observacoes, @foto, @posto_id)
    `),
    updateColab: db.prepare(`
      UPDATE colaboradores
      SET matricula = @matricula, nome = @nome, funcao = @funcao,
          escala = @escala, equipe = @equipe, equipe_origem = @equipe_origem,
          data_admissao = @data_admissao, status = @status,
          observacoes = @observacoes, foto = @foto, posto_id = @posto_id,
          updated_at = datetime('now', 'localtime')
      WHERE id = @id
    `),
    deleteColab: db.prepare('DELETE FROM colaboradores WHERE id = ?'),
    moveColab: db.prepare(`
      UPDATE colaboradores
      SET posto_id = @posto_id, equipe = @equipe, status = @status,
          equipe_origem = @equipe_origem,
          updated_at = datetime('now', 'localtime')
      WHERE id = @id
    `),
    updateColabFoto: db.prepare(`
      UPDATE colaboradores SET foto = ?, updated_at = datetime('now', 'localtime') WHERE id = ?
    `),

    // Histórico
    insertHistorico: db.prepare(`
      INSERT INTO historico_movimentacoes
        (colaborador_id, nome_colaborador, posto_origem_id, posto_origem_nome,
         posto_destino_id, posto_destino_nome, equipe_anterior, equipe_nova,
         status_anterior, status_novo, tipo_acao, observacao)
      VALUES
        (@colaborador_id, @nome_colaborador, @posto_origem_id, @posto_origem_nome,
         @posto_destino_id, @posto_destino_nome, @equipe_anterior, @equipe_nova,
         @status_anterior, @status_novo, @tipo_acao, @observacao)
    `),
    getHistorico: db.prepare(`
      SELECT * FROM historico_movimentacoes
      ORDER BY data_hora DESC
      LIMIT ?
    `),
    getHistoricoByColab: db.prepare(`
      SELECT * FROM historico_movimentacoes
      WHERE colaborador_id = ?
      ORDER BY data_hora DESC
    `),

    // Stats
    getStats: db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM postos) as total_postos,
        (SELECT COUNT(*) FROM colaboradores) as total_colaboradores,
        (SELECT COUNT(*) FROM colaboradores WHERE status = 'Ativo') as total_ativos,
        (SELECT COUNT(*) FROM colaboradores WHERE status = 'Férias') as total_ferias,
        (SELECT COUNT(*) FROM colaboradores WHERE posto_id IS NULL OR posto_id = 'reserva') as total_reserva
    `),

    // Visitas
    insertVisita: db.prepare(`
      INSERT INTO visitas (posto_id, data_visita, fiscal_nome, tipo_visita, status, checklist_json, observacoes)
      VALUES (@posto_id, @data_visita, @fiscal_nome, @tipo_visita, @status, @checklist_json, @observacoes)
    `),
    getVisitaById: db.prepare('SELECT * FROM visitas WHERE id = ?'),
    getVisitasPorPosto: db.prepare(`
      SELECT v.*, p.name as posto_nome, p.code as posto_code, p.cidade as posto_cidade
      FROM visitas v
      JOIN postos p ON p.id = v.posto_id
      WHERE v.posto_id = ?
      ORDER BY v.data_visita DESC
    `),
    getAllVisitas: db.prepare(`
      SELECT v.*, p.name as posto_nome, p.code as posto_code, p.cidade as posto_cidade
      FROM visitas v
      JOIN postos p ON p.id = v.posto_id
      ORDER BY v.data_visita DESC
      LIMIT ?
    `),
    deleteVisita: db.prepare('DELETE FROM visitas WHERE id = ?'),
    updatePostoGeo: db.prepare(`
      UPDATE postos
      SET cidade = @cidade, latitude = @latitude, longitude = @longitude, updated_at = datetime('now', 'localtime')
      WHERE id = @id
    `),

    // Solicitações
    getAllSolicitacoes: db.prepare(`
      SELECT s.*, p.name as posto_full_name, p.short_name as posto_short_name
      FROM solicitacoes s
      LEFT JOIN postos p ON p.id = s.posto_id
      ORDER BY s.created_at DESC
    `),
    getSolicitacaoById: db.prepare(`
      SELECT * FROM solicitacoes WHERE id = ?
    `),
    insertSolicitacao: db.prepare(`
      INSERT INTO solicitacoes (id, tipo, titulo, solicitante, cpf, cargo, posto_id, posto_nome, turno, quantidade, prazo, data_solicitacao, prioridade, coluna, descricao)
      VALUES (@id, @tipo, @titulo, @solicitante, @cpf, @cargo, @posto_id, @posto_nome, @turno, @quantidade, @prazo, @data_solicitacao, @prioridade, @coluna, @descricao)
    `),
    updateSolicitacao: db.prepare(`
      UPDATE solicitacoes
      SET tipo = @tipo, titulo = @titulo, solicitante = @solicitante, cpf = @cpf,
          cargo = @cargo, posto_id = @posto_id, posto_nome = @posto_nome, turno = @turno,
          quantidade = @quantidade, prazo = @prazo, data_solicitacao = @data_solicitacao,
          prioridade = @prioridade,
          coluna = @coluna, descricao = @descricao,
          updated_at = datetime('now', 'localtime')
      WHERE id = @id
    `),
    updateSolicitacaoColuna: db.prepare(`
      UPDATE solicitacoes
      SET coluna = ?, updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `),
    deleteSolicitacao: db.prepare(`
      DELETE FROM solicitacoes WHERE id = ?
    `),
    insertSolicitacaoHistorico: db.prepare(`
      INSERT INTO solicitacoes_historico (solicitacao_id, acao, descricao, usuario)
      VALUES (?, ?, ?, ?)
    `),
    getHistoricoBySolicitacao: db.prepare(`
      SELECT * FROM solicitacoes_historico
      WHERE solicitacao_id = ?
      ORDER BY data_hora DESC, id DESC
    `),
    aprovarSolicitacao: db.prepare(`
      UPDATE solicitacoes
      SET coluna = 'aprovado',
          data_decisao = datetime('now', 'localtime'),
          decidido_por = ?,
          motivo_reprovacao = NULL,
          updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `),
    reprovarSolicitacao: db.prepare(`
      UPDATE solicitacoes
      SET coluna = 'reprovado',
          motivo_reprovacao = ?,
          data_decisao = datetime('now', 'localtime'),
          decidido_por = ?,
          updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `),

    // Categorias de Solicitação
    getAllCategorias: db.prepare(`SELECT * FROM categorias_solicitacao ORDER BY ordem, nome`),
    getCategoriaById: db.prepare(`SELECT * FROM categorias_solicitacao WHERE id = ?`),
    insertCategoria: db.prepare(`INSERT INTO categorias_solicitacao (id, nome, icon, ativo, ordem) VALUES (@id, @nome, @icon, @ativo, @ordem)`),
    updateCategoria: db.prepare(`UPDATE categorias_solicitacao SET nome = @nome, icon = @icon, ativo = @ativo, ordem = @ordem WHERE id = @id`),
    deleteCategoria: db.prepare(`DELETE FROM categorias_solicitacao WHERE id = ?`),

    // Funções / Cargos
    getAllFuncoes: db.prepare(`SELECT * FROM funcoes_cargo ORDER BY ordem, nome`),
    getFuncaoById: db.prepare(`SELECT * FROM funcoes_cargo WHERE id = ?`),
    insertFuncao: db.prepare(`INSERT INTO funcoes_cargo (nome, icone, ativo, ordem) VALUES (@nome, @icone, @ativo, @ordem)`),
    updateFuncao: db.prepare(`UPDATE funcoes_cargo SET nome = @nome, icone = @icone, ativo = @ativo, ordem = @ordem WHERE id = @id`),
    deleteFuncao: db.prepare(`DELETE FROM funcoes_cargo WHERE id = ?`),

    // IA - Contatos WhatsApp
    getAllIaContatos: db.prepare(`SELECT * FROM ia_contatos ORDER BY gestao, setor, responsavel`),
    getIaContatoById: db.prepare(`SELECT * FROM ia_contatos WHERE id = ?`),
    insertIaContato: db.prepare(`INSERT INTO ia_contatos (responsavel, setor, gestao, empreendimento, whatsapp, observacoes, ativo) VALUES (@responsavel, @setor, @gestao, @empreendimento, @whatsapp, @observacoes, @ativo)`),
    updateIaContato: db.prepare(`UPDATE ia_contatos SET responsavel = @responsavel, setor = @setor, gestao = @gestao, empreendimento = @empreendimento, whatsapp = @whatsapp, observacoes = @observacoes, ativo = @ativo WHERE id = @id`),
    deleteIaContato: db.prepare(`DELETE FROM ia_contatos WHERE id = ?`),

    // IA - Base de Conhecimento
    getAllIaConhecimento: db.prepare(`SELECT * FROM ia_base_conhecimento ORDER BY ordem, assunto, id`),
    getIaConhecimentoById: db.prepare(`SELECT * FROM ia_base_conhecimento WHERE id = ?`),
    insertIaConhecimento: db.prepare(`INSERT INTO ia_base_conhecimento (assunto, titulo, palavras_chave, resposta_oficial, gestao_aplicavel, exigir_escalonamento, ativo, ordem) VALUES (@assunto, @titulo, @palavras_chave, @resposta_oficial, @gestao_aplicavel, @exigir_escalonamento, @ativo, @ordem)`),
    updateIaConhecimento: db.prepare(`UPDATE ia_base_conhecimento SET assunto = @assunto, titulo = @titulo, palavras_chave = @palavras_chave, resposta_oficial = @resposta_oficial, gestao_aplicavel = @gestao_aplicavel, exigir_escalonamento = @exigir_escalonamento, ativo = @ativo, ordem = @ordem, updated_at = datetime('now', 'localtime') WHERE id = @id`),
    deleteIaConhecimento: db.prepare(`DELETE FROM ia_base_conhecimento WHERE id = ?`),

    // IA - Atendimentos
    getAllIaAtendimentos: db.prepare(`SELECT * FROM ia_atendimentos ORDER BY created_at DESC`),
    getIaAtendimentoById: db.prepare(`SELECT * FROM ia_atendimentos WHERE id = ?`),
    insertIaAtendimento: db.prepare(`
      INSERT INTO ia_atendimentos (id, protocolo, colaborador_id, colaborador_nome, colaborador_matricula, gestao, empreendimento, assunto, mensagem_inicial, historico_conversa, resolvido_por, responsavel_destino, responsavel_whatsapp, status, observacoes_gestor, avaliacao)
      VALUES (@id, @protocolo, @colaborador_id, @colaborador_nome, @colaborador_matricula, @gestao, @empreendimento, @assunto, @mensagem_inicial, @historico_conversa, @resolvido_por, @responsavel_destino, @responsavel_whatsapp, @status, @observacoes_gestor, @avaliacao)
    `),
    updateIaAtendimento: db.prepare(`
      UPDATE ia_atendimentos
      SET historico_conversa = @historico_conversa,
          resolvido_por = @resolvido_por,
          responsavel_destino = @responsavel_destino,
          responsavel_whatsapp = @responsavel_whatsapp,
          status = @status,
          observacoes_gestor = @observacoes_gestor,
          avaliacao = @avaliacao,
          updated_at = datetime('now', 'localtime')
      WHERE id = @id
    `),
    deleteIaAtendimento: db.prepare(`DELETE FROM ia_atendimentos WHERE id = ?`),
  };
}

// ========================================================
// DATA MIGRATION FROM initial_data.json
// ========================================================
function migrateFromJson() {
  const dataPath = path.join(__dirname, 'initial_data.json');
  if (!fs.existsSync(dataPath)) {
    console.log('⚠️  initial_data.json não encontrado, pulando migração.');
    return;
  }

  // Check if DB already has data
  const postCount = db.prepare('SELECT COUNT(*) as c FROM postos').get().c;
  if (postCount > 0) {
    console.log(`ℹ️  Banco já contém ${postCount} postos. Migração pulada.`);
    return;
  }

  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  let postosInserted = 0;
  let colabsInserted = 0;
  let errors = 0;

  const migrate = db.transaction(() => {
    // Insert postos and their employees
    (data.posts || []).forEach(post => {
      try {
        stmts.insertPosto.run({
          id: post.id,
          code: post.code || '',
          name: post.name || '',
          short_name: post.shortName || post.name || '',
          category: post.category || 'Segurança / Vigilância',
          address: post.address || ''
        });
        postosInserted++;

        (post.employees || []).forEach(emp => {
          try {
            stmts.insertColab.run({
              id: emp.id,
              matricula: emp.matricula || '',
              nome: emp.nome || 'SEM NOME',
              funcao: emp.funcao || 'VIGILANTE',
              escala: emp.escala || 'ESCALA 12X36',
              equipe: emp.equipe || 'Equipe 1 (Ímpares)',
              equipe_origem: emp.equipeOrigem || null,
              data_admissao: emp.dataAdmissao || '',
              status: emp.status || 'Ativo',
              observacoes: emp.observacoes || '',
              foto: emp.foto || '',
              posto_id: post.id
            });
            colabsInserted++;
          } catch (e) {
            errors++;
          }
        });
      } catch (e) {
        errors++;
        console.error('Erro ao migrar posto:', post.name, e.message);
      }
    });

    // Insert reserve employees
    (data.reserve || []).forEach(emp => {
      try {
        stmts.insertColab.run({
          id: emp.id,
          matricula: emp.matricula || '',
          nome: emp.nome || 'SEM NOME',
          funcao: emp.funcao || 'VIGILANTE',
          escala: emp.escala || 'ESCALA 12X36',
          equipe: emp.equipe || 'Reserva',
          equipe_origem: null,
          data_admissao: emp.dataAdmissao || '',
          status: emp.status || 'Disponível',
          observacoes: emp.observacoes || '',
          foto: emp.foto || '',
          posto_id: null
        });
        colabsInserted++;
      } catch (e) {
        errors++;
      }
    });
  });

  migrate();

  console.log(`✅ Migração concluída: ${postosInserted} postos, ${colabsInserted} colaboradores inseridos. ${errors > 0 ? errors + ' erros.' : 'Sem erros.'}`);
}

// ========================================================
// DB API FUNCTIONS
// ========================================================
function getFullState() {
  const postos = db.prepare(`
    SELECT * FROM postos 
    ORDER BY CASE WHEN id = 'posto-gestao-operacional' THEN 0 ELSE 1 END, name
  `).all();
  const colaboradores = db.prepare(`SELECT * FROM colaboradores`).all();

  const postoMap = {};
  postos.forEach(p => {
    postoMap[p.id] = {
      id: p.id,
      code: p.code,
      name: p.name,
      shortName: p.short_name,
      category: p.category,
      address: p.address,
      employees: []
    };
  });

  const reserve = [];
  colaboradores.forEach(c => {
    const emp = {
      id: c.id,
      matricula: c.matricula,
      nome: c.nome,
      funcao: c.funcao,
      escala: c.escala,
      equipe: c.equipe,
      equipeOrigem: c.equipe_origem,
      dataAdmissao: c.data_admissao,
      status: c.status,
      observacoes: c.observacoes,
      foto: c.foto,
      postoId: c.posto_id || 'reserva'
    };

    if (c.posto_id && postoMap[c.posto_id]) {
      postoMap[c.posto_id].employees.push(emp);
    } else {
      emp.postoId = 'reserva';
      reserve.push(emp);
    }
  });

  return {
    posts: Object.values(postoMap),
    reserve
  };
}

// Initialize on load
initSchema();
prepareStatements();
migrateFromJson();

// ========================================================
// GEOLOCALIZAÇÃO E CIDADES DOS POSTOS
// ========================================================
const CITY_COORDS = {
  'CURITIBA': { lat: -25.4284, lng: -49.2733 },
  'SÃO JOSÉ DOS PINHAIS': { lat: -25.5347, lng: -49.2064 },
  'PINHAIS': { lat: -25.4439, lng: -49.1919 },
  'ARAUCÁRIA': { lat: -25.5926, lng: -49.4097 },
  'COLOMBO': { lat: -25.2917, lng: -49.2242 },
  'PIRAQUARA': { lat: -25.4419, lng: -49.0628 },
  'FAZENDA RIO GRANDE': { lat: -25.6606, lng: -49.3089 },
  'QUATRO BARRAS': { lat: -25.3658, lng: -49.0747 },
  'RIO NEGRO': { lat: -26.1039, lng: -49.7978 },
  'ARUJÁ': { lat: -23.3967, lng: -46.3203 }
};

const NEIGHBORHOOD_COORDS = {
  'CIDADE INDUSTRIAL': { lat: -25.5012, lng: -49.3364 },
  'CIC': { lat: -25.5012, lng: -49.3364 },
  'BATEL': { lat: -25.4429, lng: -49.2897 },
  'HAUER': { lat: -25.4746, lng: -49.2562 },
  'MERCÊS': { lat: -25.4215, lng: -49.2941 },
  'CENTRO CIVICO': { lat: -25.4168, lng: -49.2687 },
  'CENTRO': { lat: -25.4310, lng: -49.2715 },
  'REBOUÇAS': { lat: -25.4471, lng: -49.2641 },
  'SANTA FELICIDADE': { lat: -25.4022, lng: -49.3331 },
  'PINHEIRINHO': { lat: -25.5186, lng: -49.2934 },
  'CAMPO COMPRIDO': { lat: -25.4418, lng: -49.3382 },
  'MOSSUNGUÊ': { lat: -25.4412, lng: -49.3256 },
  'AHÚ': { lat: -25.4042, lng: -49.2635 },
  'CASCATINHA': { lat: -25.4042, lng: -49.3101 },
  'NOVO MUNDO': { lat: -25.4851, lng: -49.2882 },
  'FANNY': { lat: -25.4789, lng: -49.2789 },
  'UBERABA': { lat: -25.4812, lng: -49.2241 },
  'JARDIM SOCIAL': { lat: -25.4208, lng: -49.2435 },
  'CAMPINA DO SIQUEIRA': { lat: -25.4389, lng: -49.3082 }
};

function autoPreencherGeo() {
  const postos = db.prepare('SELECT id, name, address, cidade, latitude, longitude FROM postos').all();
  let updated = 0;

  postos.forEach((p, idx) => {
    if (p.cidade && p.latitude && p.longitude) return;

    const text = ((p.address || '') + ' ' + (p.name || '')).toUpperCase();
    let cidade = 'CURITIBA';
    let baseCoord = CITY_COORDS['CURITIBA'];

    if (text.includes('SÃO JOSE DOS PINHAIS') || text.includes('SAO JOSE DOS PINHAIS') || text.includes('SÃO JOSÉ DOS PINHAIS') || text.includes('ROSEIRA')) {
      cidade = 'SÃO JOSÉ DOS PINHAIS';
      baseCoord = CITY_COORDS['SÃO JOSÉ DOS PINHAIS'];
    } else if (text.includes('ARAUCARIA') || text.includes('ARAUCÁRIA')) {
      cidade = 'ARAUCÁRIA';
      baseCoord = CITY_COORDS['ARAUCÁRIA'];
    } else if (text.includes('PINHAIS')) {
      cidade = 'PINHAIS';
      baseCoord = CITY_COORDS['PINHAIS'];
    } else if (text.includes('COLOMBO')) {
      cidade = 'COLOMBO';
      baseCoord = CITY_COORDS['COLOMBO'];
    } else if (text.includes('PIRAQUARA')) {
      cidade = 'PIRAQUARA';
      baseCoord = CITY_COORDS['PIRAQUARA'];
    } else if (text.includes('FAZENDA RIO GRANDE')) {
      cidade = 'FAZENDA RIO GRANDE';
      baseCoord = CITY_COORDS['FAZENDA RIO GRANDE'];
    } else if (text.includes('QUATRO BARRAS')) {
      cidade = 'QUATRO BARRAS';
      baseCoord = CITY_COORDS['QUATRO BARRAS'];
    } else if (text.includes('RIO NEGRO')) {
      cidade = 'RIO NEGRO';
      baseCoord = CITY_COORDS['RIO NEGRO'];
    } else if (text.includes('ARUJÁ') || text.includes('ARUJA')) {
      cidade = 'ARUJÁ';
      baseCoord = CITY_COORDS['ARUJÁ'];
    } else {
      for (const [neigh, coords] of Object.entries(NEIGHBORHOOD_COORDS)) {
        if (text.includes(neigh)) {
          baseCoord = coords;
          break;
        }
      }
    }

    const hash = (p.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) + idx * 19);
    const latOffset = ((hash % 100) - 50) * 0.00032;
    const lngOffset = (((hash * 13) % 100) - 50) * 0.00032;

    const finalLat = parseFloat((baseCoord.lat + latOffset).toFixed(6));
    const finalLng = parseFloat((baseCoord.lng + lngOffset).toFixed(6));

    db.prepare(`
      UPDATE postos SET cidade = ?, latitude = ?, longitude = ? WHERE id = ?
    `).run(cidade, finalLat, finalLng, p.id);
    updated++;
  });

  if (updated > 0) {
    console.log(`🗺️  Geolocalização e cidades preenchidas automaticamente para ${updated} postos.`);
  }
}

autoPreencherGeo();

// ========================================================
// CONTROLE DE VISITAS OPERACIONAIS
// ========================================================
function getPostosComStatusVisita(filtroCidade = null, filtroStatus = null) {
  const rows = db.prepare(`
    SELECT 
      p.*,
      COUNT(c.id) as total_colaboradores,
      (SELECT COUNT(*) FROM visitas WHERE posto_id = p.id) as total_visitas,
      v.id as ultima_visita_id,
      v.data_visita as ultima_visita_data,
      v.fiscal_nome as ultima_visita_fiscal,
      v.tipo_visita as ultima_visita_tipo,
      v.status as ultima_visita_status,
      v.observacoes as ultima_visita_obs
    FROM postos p
    LEFT JOIN colaboradores c ON c.posto_id = p.id
    LEFT JOIN visitas v ON v.id = (
      SELECT id FROM visitas WHERE posto_id = p.id ORDER BY data_visita DESC LIMIT 1
    )
    GROUP BY p.id
    ORDER BY CASE WHEN p.id = 'posto-gestao-operacional' THEN 0 ELSE 1 END, p.name
  `).all();

  const now = new Date();

  return rows.map(p => {
    let diasSemVisita = null;
    let statusVisita = 'CRITICO';

    if (p.ultima_visita_data) {
      const dataVis = new Date(p.ultima_visita_data);
      if (!isNaN(dataVis.getTime())) {
        const diffMs = now - dataVis;
        diasSemVisita = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        if (diasSemVisita <= 15) {
          statusVisita = 'EM_DIA';
        } else if (diasSemVisita <= 30) {
          statusVisita = 'ATENCAO';
        } else {
          statusVisita = 'CRITICO';
        }
      }
    }

    return {
      ...p,
      dias_sem_visita: diasSemVisita,
      status_visita: statusVisita
    };
  }).filter(p => {
    if (filtroCidade && filtroCidade !== 'TODAS' && p.cidade !== filtroCidade) return false;
    if (filtroStatus && filtroStatus !== 'TODOS' && p.status_visita !== filtroStatus) return false;
    return true;
  });
}

function getVisitasStats() {
  const postosComStatus = getPostosComStatusVisita();
  const total = postosComStatus.length;
  const emDia = postosComStatus.filter(p => p.status_visita === 'EM_DIA').length;
  const atencao = postosComStatus.filter(p => p.status_visita === 'ATENCAO').length;
  const critico = postosComStatus.filter(p => p.status_visita === 'CRITICO').length;

  const cidadesSet = new Set();
  postosComStatus.forEach(p => { if (p.cidade) cidadesSet.add(p.cidade); });

  const totalVisitas = db.prepare('SELECT COUNT(*) as c FROM visitas').get().c;
  const visitasMes = db.prepare(`
    SELECT COUNT(*) as c FROM visitas 
    WHERE strftime('%Y-%m', data_visita) = strftime('%Y-%m', 'now', 'localtime')
  `).get().c;

  return {
    total_postos: total,
    total_cidades: cidadesSet.size,
    postos_em_dia: emDia,
    postos_atencao: atencao,
    postos_criticos: critico,
    total_visitas: totalVisitas,
    visitas_mes: visitasMes,
    cobertura_perc: total > 0 ? Math.round((emDia / total) * 100) : 0
  };
}

module.exports = {
  db,
  stmts,
  getFullState,
  autoPreencherGeo,

  // Postos
  getAllPostos: () => stmts.getAllPostos.all(),
  getPostoById: (id) => stmts.getPostoById.get(id),
  createPosto: (data) => {
    stmts.insertPosto.run(data);
    return stmts.getPostoById.get(data.id);
  },
  updatePosto: (data) => {
    stmts.updatePosto.run(data);
    return stmts.getPostoById.get(data.id);
  },
  deletePosto: (id) => stmts.deletePosto.run(id),

  // Colaboradores
  getAllColabs: () => stmts.getAllColabs.all(),
  getColabsByPosto: (postoId) => stmts.getColabsByPosto.all(postoId),
  getColabsReserva: () => stmts.getColabsReserva.all(),
  getColabById: (id) => stmts.getColabById.get(id),
  createColab: (data) => {
    stmts.insertColab.run(data);
    return stmts.getColabById.get(data.id);
  },
  updateColab: (data) => {
    stmts.updateColab.run(data);
    return stmts.getColabById.get(data.id);
  },
  deleteColab: (id) => stmts.deleteColab.run(id),
  updateColabFoto: (id, foto) => stmts.updateColabFoto.run(foto, id),

  moveColab: (colabId, targetPostoId, equipe, status, equipeOrigem) => {
    const colab = stmts.getColabById.get(colabId);
    if (!colab) return null;

    const oldPosto = colab.posto_id ? db.prepare('SELECT * FROM postos WHERE id = ?').get(colab.posto_id) : null;
    const newPosto = targetPostoId && targetPostoId !== 'reserva' ? db.prepare('SELECT * FROM postos WHERE id = ?').get(targetPostoId) : null;

    stmts.moveColab.run({
      id: colabId,
      posto_id: (targetPostoId === 'reserva' ? null : targetPostoId),
      equipe: equipe || colab.equipe,
      status: status || colab.status,
      equipe_origem: equipeOrigem || colab.equipe_origem
    });

    // Log to history
    stmts.insertHistorico.run({
      colaborador_id: colabId,
      nome_colaborador: colab.nome,
      posto_origem_id: colab.posto_id || 'reserva',
      posto_origem_nome: oldPosto ? oldPosto.short_name : 'Banco de Reserva',
      posto_destino_id: targetPostoId || 'reserva',
      posto_destino_nome: newPosto ? newPosto.short_name : 'Banco de Reserva',
      equipe_anterior: colab.equipe,
      equipe_nova: equipe || colab.equipe,
      status_anterior: colab.status,
      status_novo: status || colab.status,
      tipo_acao: equipe === 'Férias' ? 'FERIAS' : (targetPostoId === 'reserva' ? 'RESERVA' : 'MOVIMENTACAO'),
      observacao: null
    });

    return stmts.getColabById.get(colabId);
  },

  // Histórico
  getHistorico: (limit = 100) => stmts.getHistorico.all(limit),
  getHistoricoByColab: (colabId) => stmts.getHistoricoByColab.all(colabId),

  // Stats
  getStats: () => stmts.getStats.get(),

  // Visitas e Mapeamento
  getPostosComStatusVisita,
  getVisitasStats,
  getVisitasPorPosto: (postoId) => stmts.getVisitasPorPosto.all(postoId),
  getAllVisitas: (limit = 100) => stmts.getAllVisitas.all(limit),
  registrarVisita: (data) => {
    const info = stmts.insertVisita.run({
      posto_id: data.posto_id,
      data_visita: data.data_visita || new Date().toISOString().replace('T', ' ').substring(0, 19),
      fiscal_nome: (data.fiscal_nome || 'SUPERVISOR').toUpperCase().trim(),
      tipo_visita: data.tipo_visita || 'Rotina Operacional',
      status: data.status || 'Conforme',
      checklist_json: typeof data.checklist_json === 'string' ? data.checklist_json : JSON.stringify(data.checklist_json || {}),
      observacoes: data.observacoes || ''
    });
    return stmts.getVisitaById.get(info.lastInsertRowid);
  },
  excluirVisita: (id) => stmts.deleteVisita.run(id),
  updatePostoGeo: (id, cidade, lat, lng) => stmts.updatePostoGeo.run({ id, cidade, latitude: lat, longitude: lng }),

  // Solicitações
  getAllSolicitacoes: () => stmts.getAllSolicitacoes.all(),
  getSolicitacaoById: (id) => stmts.getSolicitacaoById.get(id),
  criarSolicitacao: (data) => {
    const id = data.id || `SEG-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 90 + 10)}`;
    stmts.insertSolicitacao.run({
      id,
      tipo: data.tipo,
      titulo: data.titulo,
      solicitante: data.solicitante,
      cpf: data.cpf || null,
      cargo: data.cargo || null,
      posto_id: data.posto_id || null,
      posto_nome: data.posto_nome || null,
      turno: data.turno || 'Diurno',
      quantidade: data.quantidade ? parseInt(data.quantidade, 10) : null,
      prazo: data.prazo,
      data_solicitacao: data.data_solicitacao || null,
      prioridade: data.prioridade || 'normal',
      coluna: data.coluna || 'pendente',
      descricao: data.descricao || ''
    });

    try {
      stmts.insertSolicitacaoHistorico.run(id, 'CRIADA', 'Solicitação registrada no sistema pelo efetivo', data.solicitante || 'EFETIVO');
    } catch (e) {}

    return stmts.getSolicitacaoById.get(id);
  },
  atualizarSolicitacao: (id, data) => {
    const cur = stmts.getSolicitacaoById.get(id);
    if (!cur) return null;
    stmts.updateSolicitacao.run({
      id,
      tipo: data.tipo !== undefined ? data.tipo : cur.tipo,
      titulo: data.titulo !== undefined ? data.titulo : cur.titulo,
      solicitante: data.solicitante !== undefined ? data.solicitante : cur.solicitante,
      cpf: data.cpf !== undefined ? data.cpf : cur.cpf,
      cargo: data.cargo !== undefined ? data.cargo : cur.cargo,
      posto_id: data.posto_id !== undefined ? data.posto_id : cur.posto_id,
      posto_nome: data.posto_nome !== undefined ? data.posto_nome : cur.posto_nome,
      turno: data.turno !== undefined ? data.turno : cur.turno,
      quantidade: data.quantidade !== undefined ? (data.quantidade ? parseInt(data.quantidade, 10) : null) : cur.quantidade,
      prazo: data.prazo !== undefined ? data.prazo : cur.prazo,
      data_solicitacao: data.data_solicitacao !== undefined ? data.data_solicitacao : cur.data_solicitacao,
      prioridade: data.prioridade !== undefined ? data.prioridade : cur.prioridade,
      coluna: data.coluna !== undefined ? data.coluna : cur.coluna,
      descricao: data.descricao !== undefined ? data.descricao : cur.descricao
    });
    return stmts.getSolicitacaoById.get(id);
  },
  moverSolicitacaoColuna: (id, coluna) => {
    stmts.updateSolicitacaoColuna.run(coluna, id);
    try {
      stmts.insertSolicitacaoHistorico.run(id, 'MOVIMENTADA', `Solicitação movida para ${coluna.toUpperCase()}`, 'ADMIN');
    } catch (e) {}
    return stmts.getSolicitacaoById.get(id);
  },
  aprovarSolicitacao: (id, decididoPor = 'ADMIN') => {
    stmts.aprovarSolicitacao.run(decididoPor, id);
    try {
      stmts.insertSolicitacaoHistorico.run(id, 'APROVADA', 'Solicitação aprovada pelo gestor', decididoPor);
    } catch (e) {}
    return stmts.getSolicitacaoById.get(id);
  },
  reprovarSolicitacao: (id, motivo, decididoPor = 'ADMIN') => {
    stmts.reprovarSolicitacao.run(motivo, decididoPor, id);
    try {
      stmts.insertSolicitacaoHistorico.run(id, 'REPROVADA', `Motivo: ${motivo}`, decididoPor);
    } catch (e) {}
    return stmts.getSolicitacaoById.get(id);
  },
  concluirSolicitacao: (id, usuario = 'ADMIN') => {
    stmts.updateSolicitacaoColuna.run('concluido', id);
    try {
      stmts.insertSolicitacaoHistorico.run(id, 'CONCLUIDA', 'Demanda entregue / concluída no posto', usuario);
    } catch (e) {}
    return stmts.getSolicitacaoById.get(id);
  },
  reabrirSolicitacao: (id, usuario = 'ADMIN') => {
    stmts.updateSolicitacaoColuna.run('pendente', id);
    try {
      stmts.insertSolicitacaoHistorico.run(id, 'REABERTA', 'Solicitação reaberta para reavaliação', usuario);
    } catch (e) {}
    return stmts.getSolicitacaoById.get(id);
  },
  getHistoricoSolicitacao: (id) => {
    try {
      return stmts.getHistoricoBySolicitacao.all(id);
    } catch (e) {
      return [];
    }
  },
  consultarSolicitacoesEfetivo: (termo) => {
    if (!termo || typeof termo !== 'string') return [];
    const q = termo.trim();
    if (!q) return [];
    const digits = q.replace(/\D/g, '');

    let rows = [];
    if (digits.length >= 8) {
      // Busca por CPF
      rows = db.prepare(`
        SELECT s.*, p.name as posto_full_name, p.short_name as posto_short_name
        FROM solicitacoes s
        LEFT JOIN postos p ON s.posto_id = p.id
        WHERE REPLACE(REPLACE(REPLACE(COALESCE(s.cpf, ''), '.', ''), '-', ''), ' ', '') = ?
           OR s.cpf = ?
        ORDER BY s.created_at DESC
        LIMIT 20
      `).all(digits, q);
    }

    if (!rows.length) {
      // Busca por ID do Protocolo (ex: SEG-611066 ou 611066)
      rows = db.prepare(`
        SELECT s.*, p.name as posto_full_name, p.short_name as posto_short_name
        FROM solicitacoes s
        LEFT JOIN postos p ON s.posto_id = p.id
        WHERE UPPER(s.id) = UPPER(?)
           OR UPPER(s.id) LIKE UPPER(?)
        ORDER BY s.created_at DESC
        LIMIT 10
      `).all(q, `%${q}%`);
    }

    return rows.map(r => {
      let historico = [];
      try {
        historico = stmts.getHistoricoBySolicitacao.all(r.id);
      } catch (e) {}
      return { ...r, historico };
    });
  },
  excluirSolicitacao: (id) => stmts.deleteSolicitacao.run(id),

  // Categorias de Solicitação
  getAllCategorias: () => stmts.getAllCategorias.all(),
  getCategoriaById: (id) => stmts.getCategoriaById.get(id),
  createCategoria: (data) => {
    const id = data.id || data.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');
    stmts.insertCategoria.run({ id, nome: data.nome, icon: data.icon || '📦', ativo: 1, ordem: data.ordem || 99 });
    return stmts.getCategoriaById.get(id);
  },
  updateCategoria: (id, data) => {
    const cur = stmts.getCategoriaById.get(id);
    if (!cur) return null;
    stmts.updateCategoria.run({ id, nome: data.nome || cur.nome, icon: data.icon || cur.icon, ativo: data.ativo !== undefined ? data.ativo : cur.ativo, ordem: data.ordem !== undefined ? data.ordem : cur.ordem });
    return stmts.getCategoriaById.get(id);
  },
  deleteCategoria: (id) => stmts.deleteCategoria.run(id),

  // Funções / Cargos
  getAllFuncoes: () => stmts.getAllFuncoes.all(),
  getFuncaoById: (id) => stmts.getFuncaoById.get(id),
  createFuncao: (data) => {
    const info = stmts.insertFuncao.run({ nome: data.nome, icone: data.icone || '👤', ativo: 1, ordem: data.ordem || 99 });
    return stmts.getFuncaoById.get(info.lastInsertRowid);
  },
  updateFuncao: (id, data) => {
    const cur = stmts.getFuncaoById.get(id);
    if (!cur) return null;
    stmts.updateFuncao.run({ id, nome: data.nome || cur.nome, icone: data.icone || cur.icone, ativo: data.ativo !== undefined ? data.ativo : cur.ativo, ordem: data.ordem !== undefined ? data.ordem : cur.ordem });
    return stmts.getFuncaoById.get(id);
  },
  deleteFuncao: (id) => stmts.deleteFuncao.run(id),

  // ========================================================
  // MÉTODOS IA ATENDIMENTO & PAINEL DE CONTROLE
  // ========================================================
  // Contatos WhatsApp
  getAllIaContatos: () => stmts.getAllIaContatos.all(),
  getIaContatoById: (id) => stmts.getIaContatoById.get(id),
  createIaContato: (data) => {
    const info = stmts.insertIaContato.run({
      responsavel: data.responsavel,
      setor: data.setor || 'Supervisão',
      gestao: data.gestao || 'Geral',
      empreendimento: data.empreendimento || 'Todos',
      whatsapp: data.whatsapp ? data.whatsapp.replace(/\D/g, '') : '',
      observacoes: data.observacoes || '',
      ativo: data.ativo !== undefined ? data.ativo : 1
    });
    return stmts.getIaContatoById.get(info.lastInsertRowid);
  },
  updateIaContato: (id, data) => {
    const cur = stmts.getIaContatoById.get(id);
    if (!cur) return null;
    stmts.updateIaContato.run({
      id,
      responsavel: data.responsavel !== undefined ? data.responsavel : cur.responsavel,
      setor: data.setor !== undefined ? data.setor : cur.setor,
      gestao: data.gestao !== undefined ? data.gestao : cur.gestao,
      empreendimento: data.empreendimento !== undefined ? data.empreendimento : cur.empreendimento,
      whatsapp: data.whatsapp !== undefined ? data.whatsapp.replace(/\D/g, '') : cur.whatsapp,
      observacoes: data.observacoes !== undefined ? data.observacoes : cur.observacoes,
      ativo: data.ativo !== undefined ? data.ativo : cur.ativo
    });
    return stmts.getIaContatoById.get(id);
  },
  deleteIaContato: (id) => stmts.deleteIaContato.run(id),

  // Base de Conhecimento
  getAllIaConhecimento: () => stmts.getAllIaConhecimento.all(),
  getIaConhecimentoById: (id) => stmts.getIaConhecimentoById.get(id),
  createIaConhecimento: (data) => {
    const info = stmts.insertIaConhecimento.run({
      assunto: data.assunto,
      titulo: data.titulo,
      palavras_chave: data.palavras_chave || '',
      resposta_oficial: data.resposta_oficial,
      gestao_aplicavel: data.gestao_aplicavel || 'Todas',
      exigir_escalonamento: data.exigir_escalonamento ? 1 : 0,
      ativo: data.ativo !== undefined ? data.ativo : 1,
      ordem: data.ordem !== undefined ? data.ordem : 0
    });
    return stmts.getIaConhecimentoById.get(info.lastInsertRowid);
  },
  updateIaConhecimento: (id, data) => {
    const cur = stmts.getIaConhecimentoById.get(id);
    if (!cur) return null;
    stmts.updateIaConhecimento.run({
      id,
      assunto: data.assunto !== undefined ? data.assunto : cur.assunto,
      titulo: data.titulo !== undefined ? data.titulo : cur.titulo,
      palavras_chave: data.palavras_chave !== undefined ? data.palavras_chave : cur.palavras_chave,
      resposta_oficial: data.resposta_oficial !== undefined ? data.resposta_oficial : cur.resposta_oficial,
      gestao_aplicavel: data.gestao_aplicavel !== undefined ? data.gestao_aplicavel : cur.gestao_aplicavel,
      exigir_escalonamento: data.exigir_escalonamento !== undefined ? (data.exigir_escalonamento ? 1 : 0) : cur.exigir_escalonamento,
      ativo: data.ativo !== undefined ? data.ativo : cur.ativo,
      ordem: data.ordem !== undefined ? data.ordem : cur.ordem
    });
    return stmts.getIaConhecimentoById.get(id);
  },
  deleteIaConhecimento: (id) => stmts.deleteIaConhecimento.run(id),

  // Atendimentos
  getAllIaAtendimentos: (filtros = {}) => {
    let sql = 'SELECT * FROM ia_atendimentos WHERE 1=1';
    const params = [];

    if (filtros.gestao && filtros.gestao !== 'Todas') {
      sql += ' AND gestao = ?';
      params.push(filtros.gestao);
    }
    if (filtros.assunto && filtros.assunto !== 'Todos') {
      sql += ' AND assunto = ?';
      params.push(filtros.assunto);
    }
    if (filtros.status && filtros.status !== 'Todos') {
      sql += ' AND status = ?';
      params.push(filtros.status);
    }
    if (filtros.search) {
      sql += ' AND (colaborador_nome LIKE ? OR colaborador_matricula LIKE ? OR protocolo LIKE ? OR assunto LIKE ?)';
      const s = '%' + filtros.search + '%';
      params.push(s, s, s, s);
    }

    sql += ' ORDER BY created_at DESC';
    return db.prepare(sql).all(...params);
  },

  getIaAtendimentoById: (id) => stmts.getIaAtendimentoById.get(id),

  criarIaAtendimento: (data) => {
    const id = data.id || 'AT-' + Date.now().toString().slice(-6) + '-' + Math.floor(Math.random() * 900 + 100);
    const protocolo = '#' + (data.protocolo || id.replace('AT-', ''));
    stmts.insertIaAtendimento.run({
      id,
      protocolo,
      colaborador_id: data.colaborador_id || null,
      colaborador_nome: (data.colaborador_nome || 'COLABORADOR').toUpperCase().trim(),
      colaborador_matricula: data.colaborador_matricula || '',
      gestao: data.gestao || 'Base',
      empreendimento: data.empreendimento || '',
      assunto: data.assunto || 'Dúvidas Gerais',
      mensagem_inicial: data.mensagem_inicial || '',
      historico_conversa: typeof data.historico_conversa === 'string' ? data.historico_conversa : JSON.stringify(data.historico_conversa || []),
      resolvido_por: data.resolvido_por || 'Pendente',
      responsavel_destino: data.responsavel_destino || null,
      responsavel_whatsapp: data.responsavel_whatsapp || null,
      status: data.status || 'Aberto',
      observacoes_gestor: data.observacoes_gestor || '',
      avaliacao: data.avaliacao || null
    });
    return stmts.getIaAtendimentoById.get(id);
  },

  atualizarIaAtendimento: (id, data) => {
    const cur = stmts.getIaAtendimentoById.get(id);
    if (!cur) return null;
    stmts.updateIaAtendimento.run({
      id,
      historico_conversa: data.historico_conversa !== undefined ? (typeof data.historico_conversa === 'string' ? data.historico_conversa : JSON.stringify(data.historico_conversa)) : cur.historico_conversa,
      resolvido_por: data.resolvido_por !== undefined ? data.resolvido_por : cur.resolvido_por,
      responsavel_destino: data.responsavel_destino !== undefined ? data.responsavel_destino : cur.responsavel_destino,
      responsavel_whatsapp: data.responsavel_whatsapp !== undefined ? data.responsavel_whatsapp : cur.responsavel_whatsapp,
      status: data.status !== undefined ? data.status : cur.status,
      observacoes_gestor: data.observacoes_gestor !== undefined ? data.observacoes_gestor : cur.observacoes_gestor,
      avaliacao: data.avaliacao !== undefined ? data.avaliacao : cur.avaliacao
    });
    return stmts.getIaAtendimentoById.get(id);
  },

  deleteIaAtendimento: (id) => stmts.deleteIaAtendimento.run(id),

  getIaStats: () => {
    const hoje = new Date().toISOString().substring(0, 10);
    const total = db.prepare('SELECT COUNT(*) as c FROM ia_atendimentos').get().c;
    const hojeTotal = db.prepare('SELECT COUNT(*) as c FROM ia_atendimentos WHERE date(created_at) = ?').get(hoje).c;
    const resolvidosIa = db.prepare("SELECT COUNT(*) as c FROM ia_atendimentos WHERE resolvido_por = 'IA'").get().c;
    const encaminhadosWpp = db.prepare("SELECT COUNT(*) as c FROM ia_atendimentos WHERE resolvido_por = 'WhatsApp'").get().c;
    const pendentes = db.prepare("SELECT COUNT(*) as c FROM ia_atendimentos WHERE status = 'Aberto' OR status = 'Em Andamento'").get().c;
    const concluidos = db.prepare("SELECT COUNT(*) as c FROM ia_atendimentos WHERE status = 'Concluído'").get().c;

    const porAssunto = db.prepare(`
      SELECT assunto, COUNT(*) as total 
      FROM ia_atendimentos 
      GROUP BY assunto 
      ORDER BY total DESC 
      LIMIT 10
    `).all();

    const porGestao = db.prepare(`
      SELECT gestao, COUNT(*) as total 
      FROM ia_atendimentos 
      GROUP BY gestao 
      ORDER BY total DESC
    `).all();

    return {
      total,
      hojeTotal,
      resolvidosIa,
      encaminhadosWpp,
      pendentes,
      concluidos,
      porAssunto,
      porGestao
    };
  }
};


