// tunnel.js — Gerenciador de Túnel Seguro Cloudflare / Local
// Gera link HTTPS oficial que passa livre por Bitdefender, Fortinet e redes 4G/5G

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3333;
const TUNNEL_FILE = path.join(__dirname, 'tunnel-url.txt');
const CLOUDFLARED_BIN = path.join(__dirname, 'cloudflared.exe');

console.log('');
console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║   INICIANDO TÚNEL SEGURO CLOUDFLARE (4G/5G/EXTERNO)      ║');
console.log('║   100% Criptografado HTTPS • Livre de Bloqueio Antivírus ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log('');

// Limpa URL anterior
try { fs.writeFileSync(TUNNEL_FILE, '', 'utf8'); } catch(e) {}

const cf = spawn(CLOUDFLARED_BIN, ['tunnel', '--url', `http://localhost:${PORT}`], {
  windowsHide: false
});

let linkPronto = false;

cf.stderr.on('data', (data) => {
  const texto = data.toString();

  // Procura padrão de URL do Cloudflare: https://*.trycloudflare.com
  const match = texto.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
  if (match && !linkPronto) {
    linkPronto = true;
    const urlBase = match[0];
    const linkSolicitar = `${urlBase}/solicitar.html`;

    try {
      fs.writeFileSync(TUNNEL_FILE, linkSolicitar, 'utf8');
    } catch(e) {}

    console.log('');
    console.log('════════════════════════════════════════════════════════════');
    console.log('  LINK CLOUDFLARE GERADO COM SUCESSO! (SEGURO HTTPS)');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');
    console.log('  📱 LINK PARA OS EFETIVOS (ABRE NO 4G, 5G OU WI-FI):');
    console.log('  ' + linkSolicitar);
    console.log('');
    console.log('  💻 PAINEL NO SEU COMPUTADOR:');
    console.log(`  http://localhost:${PORT}/solicitacoes.html`);
    console.log('');
    console.log('════════════════════════════════════════════════════════════');
    console.log('  O QR Code e o botão de WhatsApp no seu painel já foram');
    console.log('  atualizados automaticamente com esse link!');
    console.log('  [MANTENHA ESTA JANELA ABERTA ENQUANTO USAR]');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');
  }
});

cf.on('close', (code) => {
  console.log('Túnel Cloudflare encerrado.');
  try { fs.writeFileSync(TUNNEL_FILE, '', 'utf8'); } catch(e) {}
});

cf.on('error', (err) => {
  console.error('Erro ao iniciar Cloudflare:', err.message);
});

// Impede que o processo encerre
setInterval(() => {}, 60000);
