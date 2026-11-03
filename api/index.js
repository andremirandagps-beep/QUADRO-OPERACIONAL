const fs = require('fs');
const path = require('path');

let cachedData = null;

function getInitialData() {
  if (!cachedData) {
    const jsonPath = path.join(process.cwd(), 'initial_data.json');
    if (fs.existsSync(jsonPath)) {
      cachedData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    } else {
      cachedData = { posts: [], reserve: [] };
    }
  }
  return JSON.parse(JSON.stringify(cachedData));
}

// In-memory state for serverless execution
let memoryState = getInitialData();

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const url = req.url || '';
  const pathname = url.split('?')[0];

  try {
    // GET /api/state
    if (pathname.endsWith('/state') && req.method === 'GET') {
      return res.status(200).json(memoryState);
    }

    // GET /api/stats
    if (pathname.endsWith('/stats') && req.method === 'GET') {
      let totalColabs = 0;
      let totalAtivos = 0;
      let totalFerias = 0;
      memoryState.posts.forEach(p => {
        p.employees.forEach(e => {
          totalColabs++;
          if (e.status === 'Férias') totalFerias++;
          else totalAtivos++;
        });
      });
      totalColabs += memoryState.reserve.length;
      return res.status(200).json({
        total_postos: memoryState.posts.length,
        total_colaboradores: totalColabs,
        total_ativos: totalAtivos,
        total_ferias: totalFerias,
        total_reserva: memoryState.reserve.length
      });
    }

    // POST /api/colaboradores/:id/mover
    if (pathname.includes('/mover') && req.method === 'POST') {
      const body = req.body || {};
      const match = pathname.match(/\/colaboradores\/([^/]+)\/mover/);
      const colabId = match ? match[1] : null;

      if (colabId) {
        let found = null;
        // remove from posts
        memoryState.posts.forEach(p => {
          const idx = p.employees.findIndex(e => e.id === colabId);
          if (idx !== -1) found = p.employees.splice(idx, 1)[0];
        });
        // remove from reserve
        if (!found) {
          const idx = memoryState.reserve.findIndex(e => e.id === colabId);
          if (idx !== -1) found = memoryState.reserve.splice(idx, 1)[0];
        }

        if (found) {
          found.equipe = body.equipe || found.equipe;
          found.status = body.status || found.status;
          found.equipeOrigem = body.equipeOrigem !== undefined ? body.equipeOrigem : found.equipeOrigem;

          if (body.postoId === 'reserva' || !body.postoId) {
            found.postoId = 'reserva';
            memoryState.reserve.push(found);
          } else {
            const targetPost = memoryState.posts.find(p => p.id === body.postoId);
            if (targetPost) {
              found.postoId = targetPost.id;
              targetPost.employees.push(found);
            } else {
              found.postoId = 'reserva';
              memoryState.reserve.push(found);
            }
          }
        }
      }
      return res.status(200).json({ success: true });
    }

    // Default fallback: return current state
    return res.status(200).json(memoryState);
  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ error: err.message });
  }
};
