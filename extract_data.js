const fs = require('fs');

const shared = [];
if (fs.existsSync('temp_xlsx/xl/sharedStrings.xml')) {
  const content = fs.readFileSync('temp_xlsx/xl/sharedStrings.xml', 'utf8');
  const matches = content.match(/<si>(.*?)<\/si>/gs) || [];
  matches.forEach(m => {
    const texts = [...m.matchAll(/<t[^>]*>(.*?)<\/t>/g)].map(x => x[1]).join('');
    shared.push(texts);
  });
}

const sheet = fs.readFileSync('temp_xlsx/xl/worksheets/sheet1.xml', 'utf8');
const rows = sheet.match(/<row[\s\S]*?<\/row>/g) || [];

function cleanText(t) {
  if (!t) return '';
  return t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
}

function parseNameMatricula(raw) {
  const cleaned = cleanText(raw);
  let matricula = '';
  let codeMatch = cleaned.match(/\b\d{5,6}\b/);
  if (codeMatch) {
    matricula = codeMatch[0];
  }
  let nameOnly = cleaned
    .replace(/\b(8H|1R|39|451)\b/gi, '')
    .replace(/\b\d{5,6}\b/g, '')
    .replace(/^[\s\-–—]+|[\s\-–—]+$/g, '')
    .replace(/[\s\-–—]{2,}/g, ' ')
    .trim();
  
  if (!nameOnly) nameOnly = cleaned;

  return { matricula, nome: nameOnly, original: cleaned };
}

function generateAdmissionDate(matricula, index) {
  const years = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
  const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  const days = ['02', '05', '10', '12', '15', '18', '20', '22', '25', '28'];
  
  let seed = index;
  if (matricula && !isNaN(parseInt(matricula, 10))) {
    seed = parseInt(matricula, 10);
  }
  const year = years[seed % years.length];
  const month = months[(seed * 7) % months.length];
  const day = days[(seed * 13) % days.length];
  return `${day}/${month}/${year}`;
}

const posts = [];
let currentPost = null;

rows.forEach((r, idx) => {
  const cellRegex = /<c r="([A-Z]+)(\d+)"(?:[^>]*?t="([^"]+)")?[^>]*>(?:<v>([\s\S]*?)<\/v>)?/g;
  let m;
  const rowData = {};
  while ((m = cellRegex.exec(r)) !== null) {
    let val = m[4] || '';
    if (m[3] === 's') val = shared[parseInt(val, 10)] || '';
    rowData[m[1]] = cleanText(val);
  }

  const colA = rowData['A'] || '';
  const colI = rowData['I'] || '';
  const colJ = rowData['J'] || '';

  // Is this row starting a new post?
  const isPostHeader = colA && (
    colA.match(/\b\d{3,6}\s*-\s*PR\b/i) || 
    colA.includes('PR - SEG') || 
    colA.includes('PR - POR') ||
    colA.includes('CONDOMINIO') ||
    colA.includes('COND.')
  );

  if (isPostHeader) {
    let rawTitle = colA;
    let code = '';
    const codeM = rawTitle.match(/\b\d{3,6}\b/);
    if (codeM) code = codeM[0];
    
    currentPost = {
      id: 'posto-' + (posts.length + 1),
      code: code,
      name: rawTitle,
      shortName: rawTitle.replace(/^\d+\s*-\s*PR\s*-\s*(SEG|POR)\s*-\s*/i, '').trim(),
      category: rawTitle.includes('- POR -') ? 'Portaria' : 'Segurança / Vigilância',
      addressParts: [],
      address: '',
      employees: []
    };
    if (colI) currentPost.addressParts.push(colI);
    if (colJ) currentPost.addressParts.push(colJ);
    posts.push(currentPost);
  } else if (currentPost) {
    if (colI && !colI.includes('MÊS') && !colI.includes('EQUIPE') && !colI.includes('OBS') && !currentPost.addressParts.includes(colI)) {
      currentPost.addressParts.push(colI);
    }
    if (colJ && !currentPost.addressParts.includes(colJ)) {
      currentPost.addressParts.push(colJ);
    }
  }

  if (!currentPost) return;

  // Check employees in this row
  const name1 = rowData['D'];
  const func1 = rowData['B'];
  const escala1 = rowData['C'];
  const obs1 = rowData['A'];

  const name2 = rowData['H'];
  const func2 = rowData['F'];
  const escala2 = rowData['G'];
  const obs2 = rowData['E'];

  if (name1 && name1 !== 'NOME' && name1.length > 3 && !name1.includes('EQUIPE') && !name1.includes('MÊS')) {
    const parsed = parseNameMatricula(name1);
    const isFerias = (obs1 && obs1.toUpperCase().includes('FÉRIAS'));
    currentPost.employees.push({
      id: 'emp-' + Math.random().toString(36).substr(2, 9),
      matricula: parsed.matricula,
      nome: parsed.nome,
      originalText: parsed.original,
      funcao: func1 || (currentPost.category === 'Portaria' ? 'PORTEIRO' : 'VIGILANTE'),
      escala: escala1 || 'ESCALA 12X36 - 19:00 ÀS 07:00',
      equipe: 'Equipe 1 (Ímpares)',
      dataAdmissao: generateAdmissionDate(parsed.matricula, posts.length * 20 + currentPost.employees.length),
      status: isFerias ? 'Férias' : (obs1 ? obs1 : 'Ativo'),
      foto: '',
      postoId: currentPost.id
    });
  }

  if (name2 && name2 !== 'NOME' && name2.length > 3 && !name2.includes('EQUIPE') && !name2.includes('MÊS')) {
    const parsed = parseNameMatricula(name2);
    const isFerias = (obs2 && obs2.toUpperCase().includes('FÉRIAS'));
    currentPost.employees.push({
      id: 'emp-' + Math.random().toString(36).substr(2, 9),
      matricula: parsed.matricula,
      nome: parsed.nome,
      originalText: parsed.original,
      funcao: func2 || (currentPost.category === 'Portaria' ? 'PORTEIRO' : 'VIGILANTE'),
      escala: escala2 || 'ESCALA 12X36 - 19:00 ÀS 07:00',
      equipe: 'Equipe 2 (Pares)',
      dataAdmissao: generateAdmissionDate(parsed.matricula, posts.length * 20 + currentPost.employees.length + 1),
      status: isFerias ? 'Férias' : (obs2 ? obs2 : 'Ativo'),
      foto: '',
      postoId: currentPost.id
    });
  }
});

posts.forEach(p => {
  p.address = p.addressParts.filter(Boolean).join(' - ') || 'Curitiba e Região';
  delete p.addressParts;
});

const reservePool = [
  {
    id: 'emp-res-1',
    matricula: '019842',
    nome: 'RODRIGO ALVES DOS SANTOS',
    funcao: 'VIGILANTE FERISTA',
    escala: 'ESCALA 12X36',
    equipe: 'Reserva',
    dataAdmissao: '14/03/2021',
    status: 'Disponível',
    foto: '',
    postoId: 'reserva'
  },
  {
    id: 'emp-res-2',
    matricula: '020411',
    nome: 'MARCOS VINICIUS RIBEIRO',
    funcao: 'VIGILANTE FOLGUISTA',
    escala: 'ESCALA 12X36',
    equipe: 'Reserva',
    dataAdmissao: '08/01/2023',
    status: 'Disponível',
    foto: '',
    postoId: 'reserva'
  },
  {
    id: 'emp-res-3',
    matricula: '018933',
    nome: 'TIAGO DE LIMA SILVA',
    funcao: 'PORTEIRO RESERVA',
    escala: 'ESCALA 12X36',
    equipe: 'Reserva',
    dataAdmissao: '19/08/2022',
    status: 'Disponível',
    foto: '',
    postoId: 'reserva'
  }
];

const result = {
  posts: posts,
  reserve: reservePool
};

fs.writeFileSync('initial_data.json', JSON.stringify(result, null, 2), 'utf8');
console.log(`Extracted ${posts.length} posts and total ${posts.reduce((a,b)=>a+b.employees.length,0)} employees + ${reservePool.length} reserves.`);
