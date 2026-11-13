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
  updatePostoGeo: (id, cidade, lat, lng) => stmts.updatePostoGeo.run({ id, cidade, latitude: lat, longitude: lng })
};

