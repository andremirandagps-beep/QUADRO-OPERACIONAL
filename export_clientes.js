const fs = require('fs');
const db = require('./database.js');

const postos = db.getAllPostos();

const rows = postos.map(p => {
  let cliente = p.short_name || p.name;
  cliente = cliente.replace(/^\d+\s*-\s*PR\s*-\s*(SEG|POR|MON|MAP)\s*-\s*/i, '').trim();

  return {
    codigo: p.code || '',
    cliente: cliente,
    nome_posto: p.name || '',
    cidade: p.cidade || 'CURITIBA',
    endereco: p.address || ''
  };
});

fs.writeFileSync('clientes_e_enderecos.json', JSON.stringify(rows, null, 2), 'utf8');

const csvHeader = 'Código;Nome do Cliente;Posto Completo;Cidade;Endereço\r\n';
const csvLines = rows.map(r => {
  const c1 = (r.codigo || '').replace(/"/g, '""');
  const c2 = (r.cliente || '').replace(/"/g, '""');
  const c3 = (r.nome_posto || '').replace(/"/g, '""');
  const c4 = (r.cidade || '').replace(/"/g, '""');
  const c5 = (r.endereco || '').replace(/"/g, '""');
  return `"${c1}";"${c2}";"${c3}";"${c4}";"${c5}"`;
}).join('\r\n');

fs.writeFileSync('clientes_e_enderecos.csv', '\uFEFF' + csvHeader + csvLines, 'utf8');
console.log(`✅ Sucesso! ${rows.length} clientes e endereços exportados para clientes_e_enderecos.csv e .json`);

