/* ============================================================
   data.js — Dados e Regras de Segurança Patrimonial / Operacional
   ============================================================ */

const DB_KEY  = 'solicSeguranca_v2';
const CFG_KEY = 'solicSeguranca_cfg';

// ── Configurações padrão ─────────────────────────────────
function getConfig() {
  const defaults = {
    diasAlertaVermelho: 10,
    diasAlertaAmarelo:  20,
    linkColaborador: `${location.href.replace('index.html','').replace(/\/$/, '')}/solicitar.html`,
  };
  try {
    return Object.assign(defaults, JSON.parse(localStorage.getItem(CFG_KEY) || '{}'));
  } catch { return defaults; }
}

function saveConfig(cfg) {
  localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
}

// ── Categorias da Equipe de Segurança ────────────────────
const TIPOS_SEGURANCA = {
  alimentacao: { nome: 'Alimentação / Refeição Plantão', icon: '🍱', desc: 'Marmitas, lanche noturno, café de posto' },
  efetivo:     { nome: 'Reforço de Efetivo / Rendição',  icon: '👮‍♂️', desc: 'Cobertura de falta, folga, evento, reforço' },
  material:    { nome: 'Equipamentos Táticos & Apoio',   icon: '🔦', desc: 'Lanternas, pilhas, coldres, capas de chuva' },
  comunicacao: { nome: 'Comunicação / Rádios HT',        icon: '📻', desc: 'Rádios HT, baterias, fones PTT, bases' },
  epi:         { nome: 'EPI & Proteção',                icon: '🛡️', desc: 'Colete balístico, coturno, luvas, capa' },
  transporte:  { nome: 'Ronda & Transporte (VTR)',       icon: '🚔', desc: 'Combustível, manutenção VTR/moto, ronda' }
};

// ── CRUD ─────────────────────────────────────────────────
function getAll() {
  try { return JSON.parse(localStorage.getItem(DB_KEY) || '[]'); }
  catch { return []; }
}

function saveAll(list) {
  localStorage.setItem(DB_KEY, JSON.stringify(list));
}

function getById(id) {
  return getAll().find(s => s.id === id) || null;
}

function nextId() {
  const all = getAll();
  if (!all.length) return 'SEG-0001';
  const nums = all.map(s => parseInt(s.id.replace('SEG-', '')) || 0);
  return `SEG-${String(Math.max(...nums) + 1).padStart(4, '0')}`;
}

function criar(dados) {
  const lista = getAll();
  const sol = {
    id:          nextId(),
    criadoEm:    new Date().toISOString(),
    atualizadoEm:new Date().toISOString(),
    coluna:      'pendente',
    ...dados
  };
  lista.push(sol);
  saveAll(lista);
  return sol;
}

function atualizar(id, campos) {
  const lista = getAll().map(s => {
    if (s.id !== id) return s;
    return { ...s, ...campos, atualizadoEm: new Date().toISOString() };
  });
  saveAll(lista);
  return lista.find(s => s.id === id);
}

function remover(id) {
  saveAll(getAll().filter(s => s.id !== id));
}

function moverColuna(id, coluna) {
  return atualizar(id, { coluna });
}

// ── Helpers de status/prazo ──────────────────────────────
function diasRestantes(prazo) {
  if (!prazo) return null;
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const p    = new Date(prazo + 'T00:00:00');
  return Math.round((p - hoje) / 86400000);
}

function getStatusPrazo(sol, cfg) {
  if (sol.coluna === 'concluido') return 'cinza';
  if (!sol.prazo) return 'cinza';
  const dias = diasRestantes(sol.prazo);
  if (dias === null) return 'cinza';
  if (dias < 0)  return 'vermelho';
  if (dias <= (cfg?.diasAlertaVermelho ?? 10)) return 'vermelho';
  if (dias <= (cfg?.diasAlertaAmarelo  ?? 20)) return 'amarelo';
  return 'verde';
}

function labelPrazo(sol) {
  if (!sol.prazo) return { texto: 'Sem prazo', classe: 'prazo-cinza' };
  const dias = diasRestantes(sol.prazo);
  if (dias === null) return { texto: 'Sem prazo', classe: 'prazo-cinza' };
  if (sol.coluna === 'concluido') return { texto: `✓ Atendido`, classe: 'prazo-cinza' };
  if (dias < 0)  return { texto: `🚨 Vencido há ${Math.abs(dias)}d`, classe: 'prazo-vermelho' };
  if (dias === 0) return { texto: `🔴 VENCE HOJE`, classe: 'prazo-vermelho' };
  if (dias === 1) return { texto: `🔴 Vence amanhã`, classe: 'prazo-vermelho' };
  if (dias <= 10) return { texto: `🔴 Vence em ${dias} dias`, classe: 'prazo-vermelho' };
  if (dias <= 20) return { texto: `🟡 Vence em ${dias} dias`, classe: 'prazo-amarelo' };
  return { texto: `🟢 Em dia (${dias} dias)`, classe: 'prazo-verde' };
}

// ── Seeds específicos para Segurança ─────────────────────
function seed() {
  if (localStorage.getItem('solicSeguranca_seeded_v2')) return;
  const hoje = new Date();
  const daqui = (d) => {
    const dt = new Date(hoje);
    dt.setDate(dt.getDate() + d);
    return dt.toISOString().split('T')[0];
  };

  const exemplos = [
    {
      tipo: 'alimentacao',
      titulo: 'Jantar e Lanche Noturno - Posto Portaria Principal',
      solicitante: 'Inspetor Carlos Silva',
      posto: 'Portaria 01 - Acesso Principal',
      turno: 'Noturno (18h às 06h)',
      quantidade: 6,
      prazo: daqui(1),
      prioridade: 'urgente',
      coluna: 'pendente',
      descricao: 'Alimentação para os 6 vigilantes da escala de serviço noturno do final de semana.'
    },
    {
      tipo: 'comunicacao',
      titulo: 'Baterias e Fones PTT para Rádios HT Motorola',
      solicitante: 'Sup. Marcos Oliveira',
      posto: 'Central de Operações / CFTV',
      turno: 'Geral',
      quantidade: 8,
      prazo: daqui(5),
      prioridade: 'alta',
      coluna: 'analise',
      descricao: '4 rádios HT da ronda descarregando em menos de 4h. Necessidade urgente de baterias novas e fones lapela.'
    },
    {
      tipo: 'efetivo',
      titulo: 'Reforço de 2 Vigilantes para Evento no Galpão',
      solicitante: 'Vig. Chefe Pereira',
      posto: 'Galpão Logístico Sul',
      turno: 'Diurno (06h às 18h)',
      quantidade: 2,
      prazo: daqui(8),
      prioridade: 'alta',
      coluna: 'aprovado',
      descricao: 'Aumento expressivo no fluxo de carretas previsto para os próximos dias.'
    },
    {
      tipo: 'material',
      titulo: 'Lanternas Táticas LED Recarregáveis para Ronda Externa',
      solicitante: 'Vig. Roberto Souza',
      posto: 'Perímetro e Muros Externos',
      turno: 'Noturno (18h às 06h)',
      quantidade: 4,
      prazo: daqui(25),
      prioridade: 'normal',
      coluna: 'pendente',
      descricao: 'Lanternas atuais com baixa luminosidade nos pontos escuros do fundo da fábrica.'
    },
    {
      tipo: 'transporte',
      titulo: 'Revisão e Abastecimento da Viatura de Ronda 02',
      solicitante: 'Inspetor Lima',
      posto: 'Pátio Central',
      turno: '24 Horas',
      quantidade: 1,
      prazo: daqui(2),
      prioridade: 'urgente',
      coluna: 'analise',
      descricao: 'Pastilha de freio gasta e cartão de combustível zerado para ronda perimetral.'
    },
    {
      tipo: 'epi',
      titulo: 'Capas de Chuva Reforçadas e Botas de Segurança',
      solicitante: 'Vig. Santos',
      posto: 'Guarita de Triagem',
      turno: 'Misto',
      quantidade: 10,
      prazo: daqui(14),
      prioridade: 'normal',
      coluna: 'concluido',
      descricao: 'Renovação dos EPIs para período de chuvas fortes nos postos desabrigados.'
    }
  ];

  exemplos.forEach(ex => criar({
    ...ex,
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString()
  }));

  localStorage.setItem('solicSeguranca_seeded_v2', '1');
}
