/**
 * SERVIDOR LOCAL COM API REST + BANCO DE DADOS SQLite
 * Grupo GPS - Quadro Operacional de Postos de Trabalho
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Load Database
const database = require('./database.js');

const PORT = 3333;
const BASE_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// ========================================================
// HELPERS
// ========================================================
function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=UTF-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-cache'
  });
  res.end(body);
}

function sendError(res, statusCode, message) {
  sendJson(res, statusCode, { error: message });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function generateId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
}

// ========================================================
// API ROUTER
// ========================================================
async function handleApi(req, res, pathname, method) {
  // OPTIONS pre-flight
  if (method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE', 'Access-Control-Allow-Headers': 'Content-Type' });
    res.end();
    return;
  }

  try {
    // -------------------------------------------------------
    // GET /api/state - full board state (used by frontend)
    // -------------------------------------------------------
    if (pathname === '/api/state' && method === 'GET') {
      const state = database.getFullState();
      sendJson(res, 200, state);
      return;
    }

    // -------------------------------------------------------
    // GET /api/stats
    // -------------------------------------------------------
    if (pathname === '/api/stats' && method === 'GET') {
      sendJson(res, 200, database.getStats());
      return;
    }

    // -------------------------------------------------------
    // GET /api/historico
    // -------------------------------------------------------
    if (pathname === '/api/historico' && method === 'GET') {
      sendJson(res, 200, database.getHistorico(200));
      return;
    }

    // -------------------------------------------------------
    // POSTOS
    // -------------------------------------------------------
    if (pathname === '/api/postos' && method === 'GET') {
      sendJson(res, 200, database.getAllPostos());
      return;
    }

    if (pathname === '/api/postos' && method === 'POST') {
      const body = await parseBody(req);
      if (!body.name) return sendError(res, 400, 'Campo "name" obrigatório');
      const id = body.id || generateId('posto');
      const result = database.createPosto({
        id,
        code: body.code || '',
        name: body.name,
        short_name: body.shortName || body.name.replace(/^\d+\s*-\s*PR\s*-\s*(SEG|POR)\s*-\s*/i, '').trim(),
        category: body.category || 'Segurança / Vigilância',
        address: body.address || ''
      });
      sendJson(res, 201, result);
      return;
    }

    const postoMatch = pathname.match(/^\/api\/postos\/([^/]+)$/);
    if (postoMatch) {
      const postoId = decodeURIComponent(postoMatch[1]);

      if (method === 'GET') {
        const posto = database.getPostoById(postoId);
        if (!posto) return sendError(res, 404, 'Posto não encontrado');
        const employees = database.getColabsByPosto(postoId);
        sendJson(res, 200, { ...posto, employees });
        return;
      }

      if (method === 'PUT') {
        const body = await parseBody(req);
        const posto = database.getPostoById(postoId);
        if (!posto) return sendError(res, 404, 'Posto não encontrado');
        const result = database.updatePosto({
          id: postoId,
          code: body.code !== undefined ? body.code : posto.code,
          name: body.name || posto.name,
          short_name: body.shortName || posto.short_name,
          category: body.category || posto.category,
          address: body.address !== undefined ? body.address : posto.address
        });
        sendJson(res, 200, result);
        return;
      }

      if (method === 'DELETE') {
        database.deletePosto(postoId);
        sendJson(res, 200, { success: true });
        return;
      }
    }

    // -------------------------------------------------------
    // COLABORADORES
    // -------------------------------------------------------
    if (pathname === '/api/colaboradores' && method === 'GET') {
      sendJson(res, 200, database.getAllColabs());
      return;
    }

    if (pathname === '/api/colaboradores/reserva' && method === 'GET') {
      sendJson(res, 200, database.getColabsReserva());
      return;
    }

    if (pathname === '/api/colaboradores' && method === 'POST') {
      const body = await parseBody(req);
      if (!body.nome) return sendError(res, 400, 'Campo "nome" obrigatório');
      const id = body.id || generateId('emp');
      const result = database.createColab({
        id,
        matricula: body.matricula || '',
        nome: body.nome.toUpperCase().trim(),
        funcao: (body.funcao || 'VIGILANTE').toUpperCase(),
        escala: body.escala || 'ESCALA 12X36 - 19:00 ÀS 07:00',
        equipe: body.equipe || 'Equipe 1 (Ímpares)',
        equipe_origem: body.equipeOrigem || null,
        data_admissao: body.dataAdmissao || '',
        status: body.status || 'Ativo',
        observacoes: body.observacoes || '',
        foto: body.foto || '',
        posto_id: body.postoId === 'reserva' ? null : (body.postoId || null)
      });
      sendJson(res, 201, result);
      return;
    }

    const colabMatch = pathname.match(/^\/api\/colaboradores\/([^/]+)$/);
    if (colabMatch) {
      const colabId = decodeURIComponent(colabMatch[1]);

      if (method === 'GET') {
        const colab = database.getColabById(colabId);
        if (!colab) return sendError(res, 404, 'Colaborador não encontrado');
        sendJson(res, 200, colab);
        return;
      }

      if (method === 'PUT') {
        const body = await parseBody(req);
        const colab = database.getColabById(colabId);
        if (!colab) return sendError(res, 404, 'Colaborador não encontrado');
        const result = database.updateColab({
          id: colabId,
          matricula: body.matricula !== undefined ? body.matricula : colab.matricula,
          nome: (body.nome || colab.nome).toUpperCase().trim(),
          funcao: (body.funcao || colab.funcao).toUpperCase(),
          escala: body.escala || colab.escala,
          equipe: body.equipe || colab.equipe,
          equipe_origem: body.equipeOrigem !== undefined ? body.equipeOrigem : colab.equipe_origem,
          data_admissao: body.dataAdmissao || colab.data_admissao,
          status: body.status || colab.status,
          observacoes: body.observacoes !== undefined ? body.observacoes : colab.observacoes,
          foto: body.foto !== undefined ? body.foto : colab.foto,
          posto_id: body.postoId === 'reserva' ? null : (body.postoId !== undefined ? body.postoId : colab.posto_id)
        });
        sendJson(res, 200, result);
        return;
      }

      if (method === 'DELETE') {
        database.deleteColab(colabId);
        sendJson(res, 200, { success: true });
        return;
      }
    }

    // -------------------------------------------------------
    // POST /api/colaboradores/:id/mover - Move (Drag & Drop)
    // -------------------------------------------------------
    const moverMatch = pathname.match(/^\/api\/colaboradores\/([^/]+)\/mover$/);
    if (moverMatch && method === 'POST') {
      const colabId = decodeURIComponent(moverMatch[1]);
      const body = await parseBody(req);

      const targetPostoId = body.postoId === 'reserva' ? null : body.postoId;
      let equipe = body.equipe;
      let status = body.status;
      let equipeOrigem = body.equipeOrigem;

      const colab = database.getColabById(colabId);
      if (!colab) return sendError(res, 404, 'Colaborador não encontrado');

      if (equipe === 'Férias') {
        status = 'Férias';
        equipeOrigem = colab.equipe_origem || colab.equipe;
      } else if (!targetPostoId) {
        status = colab.status === 'Férias' ? 'Férias' : 'Disponível';
        equipe = 'Reserva';
      } else {
        if (colab.status === 'Disponível') status = 'Ativo';
        equipeOrigem = null;
      }

      const result = database.moveColab(colabId, targetPostoId || 'reserva', equipe, status, equipeOrigem);
      sendJson(res, 200, result);
      return;
    }

    // -------------------------------------------------------
    // POST /api/colaboradores/:id/foto - Update photo
    // -------------------------------------------------------
    const fotoMatch = pathname.match(/^\/api\/colaboradores\/([^/]+)\/foto$/);
    if (fotoMatch && method === 'POST') {
      const colabId = decodeURIComponent(fotoMatch[1]);
      const body = await parseBody(req);
      if (!body.foto) return sendError(res, 400, 'Campo "foto" obrigatório');
      database.updateColabFoto(colabId, body.foto);
      sendJson(res, 200, { success: true });
      return;
    }

    // -------------------------------------------------------
    // GET /api/historico/colaborador/:id
    // -------------------------------------------------------
    const histColabMatch = pathname.match(/^\/api\/historico\/colaborador\/([^/]+)$/);
    if (histColabMatch && method === 'GET') {
      const colabId = decodeURIComponent(histColabMatch[1]);
      sendJson(res, 200, database.getHistoricoByColab(colabId));
      return;
    }

    sendError(res, 404, 'Rota não encontrada');

  } catch (err) {
    console.error('API Error:', err);
    sendError(res, 500, 'Erro interno do servidor: ' + err.message);
  }
}

// ========================================================
// HTTP SERVER
// ========================================================
const server = http.createServer(async (req, res) => {
  const method = req.method.toUpperCase();
  let pathname = req.url.split('?')[0];
  try { pathname = decodeURI(pathname); } catch (e) { }

  // API routes
  if (pathname.startsWith('/api/')) {
    return handleApi(req, res, pathname, method);
  }

  // Static files
  if (pathname === '/' || pathname === '') pathname = '/index.html';

  const filePath = path.join(BASE_DIR, pathname);
  if (!filePath.startsWith(BASE_DIR)) {
    res.writeHead(403); res.end('403 Proibido'); return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Arquivo Não Encontrado');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-cache' });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   GRUPO GPS - QUADRO OPERACIONAL DE CRACHÁS          ║');
  console.log('║   Servidor + Banco de Dados SQLite                   ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║   Acesse: ${url}                       ║`);
  console.log('║   Banco de Dados: database/quadro_operacional.db     ║');
  console.log('║   Pressione Ctrl+C para encerrar                     ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');
  exec(`start ${url}`);
});
