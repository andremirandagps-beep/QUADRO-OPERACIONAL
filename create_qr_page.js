const fs = require('fs');

const qrBase64 = fs.readFileSync('qrcode_gps_apoio.png').toString('base64');
const targetUrl = 'https://generations-martin-chart-boot.trycloudflare.com/solicitar.html';

const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Acesso Mobile - Demanda Operacional</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 20px; padding: 30px; max-width: 500px; width: 100%; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
    h1 { margin-top: 0; color: #38bdf8; font-size: 22px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
    p { color: #94a3b8; font-size: 14px; margin: 10px 0 20px; }
    .qr-box { background: white; padding: 15px; border-radius: 16px; display: inline-block; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
    .qr-box img { display: block; width: 260px; height: 260px; }
    .btn-wa { display: flex; align-items: center; justify-content: center; gap: 10px; background: #22c55e; color: white; text-decoration: none; font-weight: 700; padding: 14px 20px; border-radius: 12px; margin-bottom: 12px; font-size: 15px; transition: 0.2s; }
    .btn-wa:hover { background: #16a34a; transform: translateY(-1px); }
    .link-box { background: #0f172a; border: 1px solid #334155; border-radius: 10px; padding: 12px; margin-bottom: 15px; word-break: break-all; font-family: monospace; font-size: 14px; color: #38bdf8; font-weight: bold; }
    .instrucao { background: rgba(56, 189, 248, 0.1); border-left: 4px solid #38bdf8; text-align: left; padding: 12px 14px; border-radius: 8px; font-size: 13px; color: #cbd5e1; line-height: 1.5; }
    .btn-copy { background: #334155; color: #f8fafc; border: none; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; margin-bottom: 15px; }
    .btn-copy:hover { background: #475569; }
  </style>
</head>
<body>
  <div class="card">
    <h1>📱 App no Celular</h1>
    <p>Aponte a câmera do seu celular para este QR Code:</p>
    <div class="qr-box">
      <img src="data:image/png;base64,${qrBase64}" alt="QR Code">
    </div>
    <div class="link-box" id="linkText">${targetUrl}</div>
    <button class="btn-copy" onclick="navigator.clipboard.writeText('${targetUrl}').then(()=>alert('Link copiado!'));">📋 Copiar Link</button>
    
    <a class="btn-wa" href="https://api.whatsapp.com/send?text=${encodeURIComponent('Olá! Acesse o app de Apoio Operacional do Grupo GPS por aqui: ' + targetUrl)}" target="_blank">
      💬 Enviar Link para meu WhatsApp
    </a>

    <div class="instrucao">
      <strong>Como instalar no celular:</strong><br>
      1. Abra o link no celular.<br>
      2. Toque nos <strong>3 pontinhos (⋮)</strong> no topo do navegador.<br>
      3. Escolha <strong>"Instalar aplicativo"</strong> (ou "Adicionar à tela inicial").
    </div>
  </div>
</body>
</html>`;

fs.writeFileSync('abrir_no_celular.html', html, 'utf8');
console.log('abrir_no_celular.html atualizado!');
