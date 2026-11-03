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

    -- Índices para melhorar performance
    CREATE INDEX IF NOT EXISTS idx_colab_posto ON colaboradores(posto_id);
    CREATE INDEX IF NOT EXISTS idx_colab_equipe ON colaboradores(equipe);
    CREATE INDEX IF NOT EXISTS idx_colab_status ON colaboradores(status);
    CREATE INDEX IF NOT EXISTS idx_colab_nome ON colaboradores(nome);
    CREATE INDEX IF NOT EXISTS idx_hist_colab ON historico_movimentacoes(colaborador_id);
    CREATE INDEX IF NOT EXISTS idx_hist_data ON historico_movimentacoes(data_hora);
  `);

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
      ORDER BY p.name
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
  const postos = db.prepare(`SELECT * FROM postos ORDER BY name`).all();
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

module.exports = {
  db,
  stmts,
  getFullState,

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
  getStats: () => stmts.getStats.get()
};

