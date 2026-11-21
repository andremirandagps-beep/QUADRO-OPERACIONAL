/**
 * MÓDULO DE INTEGRAÇÃO DO WHATSAPP — ASSISTENTE VIRTUAL BARTOLOMEU
 * Grupo GPS - Atendimento ao Efetivo
 * Número Principal: (41) 98472-1699
 */

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcodeTerminal = require('qrcode-terminal');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const database = require('./database.js');
const iaService = require('./ia_service.js');

const AUTH_DIR = path.join(__dirname, 'auth_whatsapp_bartolomeu');

let sock = null;
let statusConexao = 'desconectado'; // 'desconectado' | 'aguardando_qr' | 'conectado'
let ultimoQrCodeBase64 = null;
let numeroConectado = null;
let tentativaReconexao = 0;

// Sessões em memória dos colaboradores (chave: número do telefone sem @s.whatsapp.net)
const sessoesColaboradores = new Map();

/**
 * Normaliza número de telefone
 */
function extrairTelefone(jid) {
  if (!jid) return '';
  return jid.replace('@s.whatsapp.net', '').replace('@c.us', '').replace(/\D/g, '');
}

/**
 * Gera ID e Protocolo no padrão oficial Grupo GPS: #YYYYMMDD-XXXX
 */
function gerarProtocolo() {
  const now = new Date();
  const ymd = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return {
    id: `AT-${ymd}-${rand}`,
    protocolo: `#${ymd}-${rand}`
  };
}

/**
 * Cabeçalho oficial padrão do Grupo GPS para todas as mensagens do atendimento
 */
function formatarCabecalhoAtendimento(sessao, assuntoCustom = null) {
  const ass = assuntoCustom || sessao.assunto || 'Atendimento Geral';
  return `*GRUPO GPS — ATENDIMENTO AO EFETIVO* 🛡️
*Protocolo:* ${sessao.protocolo || '#20261120-0000'}
*Colaborador:* ${sessao.nome || 'Não informado'}
*Matrícula:* ${sessao.matricula || 'Não informada'}
*Gestão:* ${sessao.gestao || 'Base'}
*Empreendimento/Posto:* ${sessao.posto || '00001 - PR - GESTÃO OPERACIONAL E ADMINISTRATIVA'}
*Assunto:* ${ass}`;
}

/**
 * Obtém ou inicializa a sessão de conversa de um colaborador
 */
function getSessao(telefone) {
  let s = sessoesColaboradores.get(telefone);
  const agora = Date.now();
  // Se passou mais de 2 horas desde a última mensagem, reinicia o fluxo
  if (s && agora - s.ultimoContato > 2 * 60 * 60 * 1000) {
    s = null;
  }
  if (!s) {
    const proto = gerarProtocolo();
    // Tenta localizar o colaborador no banco pelo telefone ou matrícula
    const colabs = database.getAllColabs();
    const cadastrado = colabs.find(c => {
      const telCad = (c.telefone || '').replace(/\D/g, '');
      return telCad && (telCad === telefone || telCad.endsWith(telefone.slice(-8)));
    });

    s = {
      telefone,
      nome: cadastrado ? cadastrado.nome : '',
      matricula: cadastrado ? cadastrado.matricula : '',
      posto: cadastrado ? (cadastrado.posto_nome || cadastrado.posto_short_name) : '00001 - PR - GESTÃO OPERACIONAL E ADMINISTRATIVA',
      gestao: 'Base',
      assunto: '',
      etapa: 'inicio', // 'inicio' | 'aguardando_assunto' | 'aguardando_supervisao' | 'atendimento'
      atendimentoId: proto.id,
      protocolo: proto.protocolo,
      ultimoContato: agora
    };
    sessoesColaboradores.set(telefone, s);
  } else {
    s.ultimoContato = agora;
  }
  return s;
}

/**
 * Envia mensagem pelo WhatsApp com delay natural
 */
async function enviarTexto(jid, texto) {
  if (!sock) return;
  try {
    await sock.sendPresenceUpdate('composing', jid);
    await new Promise(r => setTimeout(r, 600));
    await sock.sendMessage(jid, { text: texto });
    await sock.sendPresenceUpdate('available', jid);
  } catch (err) {
    console.error('❌ Erro ao enviar mensagem WhatsApp:', err.message);
  }
}

/**
 * Mensagem do Menu Principal do Bartolomeu com cabeçalho oficial
 */
function getTextoMenuPrincipal(sessao) {
  const saudacaoNome = sessao.nome ? `, *${sessao.nome.split(' ')[0]}*` : '';
  const cabecalho = formatarCabecalhoAtendimento(sessao, 'Recepção / Menu');

  return `${cabecalho}

Olá${saudacaoNome}! Sou o *Bartolomeu*, assistente virtual oficial do Grupo GPS 🛡️. Seja muito bem-vindo!

Estou aqui para tirar suas dúvidas com agilidade ou te direcionar para o responsável do seu setor.

Por favor, escolha o *número do assunto* desejado:

1️⃣ *RH / Folha-ponto* (Atestados, batidas e espelho)
2️⃣ *Pagamento / Holerite* (Contracheque e dia 20 / 5º útil)
3️⃣ *Benefícios* (VT, VR/VA, saúde e odonto)
4️⃣ *Férias* (Programação, aviso e recibos)
5️⃣ *Cursos / Reciclagem* (Vigilante, academia e CNV)
6️⃣ *Supervisão* (☀️ Diurno / 🌙 Noturno)
7️⃣ *Uniformes / Materiais* (Fardamento, EPIs e suprimentos)
8️⃣ *Outros assuntos* (Atendimento administrativo)
9️⃣ *Falar com Atendente Humano*

_Digite apenas o número de 1 a 9 ou descreva diretamente o que você precisa._`;
}

/**
 * Processa mensagens recebidas pelo WhatsApp
 */
async function processarMensagemRecebida(msg) {
  const jid = msg.key.remoteJid;
  const telefone = extrairTelefone(jid);
  if (!telefone) return;

  // Extrair texto da mensagem
  const textoMsg = (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    ''
  ).trim();

  if (!textoMsg) return;

  console.log(`📩 [WhatsApp recebido de ${telefone}]: "${textoMsg}"`);

  const sessao = getSessao(telefone);

  // Se o colaborador não estiver com nome definido, tenta identificar pelo perfil do WhatsApp (pushName)
  if ((!sessao.nome || sessao.nome === 'Colaborador') && msg.pushName) {
    const achado = iaService.buscarColaborador(msg.pushName);
    if (achado) {
      sessao.nome = achado.nome;
      sessao.matricula = achado.matricula || sessao.matricula;
      sessao.posto = achado.posto_nome || achado.posto_short_name || sessao.posto;
    } else {
      sessao.nome = msg.pushName.toUpperCase();
    }
  }

  // Tenta identificar se o colaborador enviou uma matrícula no texto
  const matchMatricula = textoMsg.match(/\b\d{5,8}\b/);
  if (matchMatricula) {
    const achadoMat = iaService.buscarColaborador(matchMatricula[0]);
    if (achadoMat) {
      sessao.nome = achadoMat.nome;
      sessao.matricula = achadoMat.matricula;
      sessao.posto = achadoMat.posto_nome || achadoMat.posto_short_name || sessao.posto;
    }
  }

  const textoNorm = textoMsg.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Comandos de reinício
  if (['oi', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'menu', 'inicio', 'ajuda', 'bartolomeu', 'comecar'].includes(textoNorm)) {
    sessao.etapa = 'inicio';
    await enviarTexto(jid, getTextoMenuPrincipal(sessao));
    return;
  }

  // Opção de atendimento humano direto
  if (textoNorm === '9' || textoNorm === 'humano' || textoNorm.includes('falar com humano') || textoNorm.includes('atendente humano')) {
    await encaminharParaHumano(jid, sessao, textoMsg || 'Solicitação de atendimento humano direto via WhatsApp');
    return;
  }

  // Etapa 1: Escolha do menu de 1 a 8
  const mapaAssuntos = {
    '1': 'RH / Folha-ponto',
    '2': 'Pagamento / Holerite',
    '3': 'Benefícios',
    '4': 'Férias',
    '5': 'Cursos / Reciclagem',
    '6': 'Supervisão',
    '7': 'Uniformes / Materiais',
    '8': 'Outros assuntos'
  };

  if (mapaAssuntos[textoNorm]) {
    const assuntoEscolhido = mapaAssuntos[textoNorm];
    sessao.assunto = assuntoEscolhido;

    // Se for Supervisão, perguntar se quer Diurno ou Noturno
    if (assuntoEscolhido === 'Supervisão') {
      sessao.etapa = 'aguardando_supervisao';
      const cabecalho = formatarCabecalhoAtendimento(sessao, 'Supervisão');
      const msgSupervisao = `${cabecalho}

🚨 *PLANTÃO DA SUPERVISÃO OPERACIONAL* 🛡️

Com qual supervisor você deseja falar?

*A* ☀️ *Supervisor Diurno*
↳ Plantão das 07:00 às 19:00 • Tel: (41) 99214-8064

*B* 🌙 *Supervisor Noturno*
↳ Plantão das 19:00 às 07:00 • Tel: (41) 98472-1699

_Digite *A* para Diurno ou *B* para Noturno._`;
      await enviarTexto(jid, msgSupervisao);
      return;
    }

    sessao.etapa = 'atendimento';
    const cabecalho = formatarCabecalhoAtendimento(sessao, assuntoEscolhido);
    await enviarTexto(jid, `${cabecalho}\n\nVocê selecionou: *${assuntoEscolhido}* ✅\n\nPor favor, *digite sua dúvida ou necessidade* com detalhes. Eu irei analisar para responder com inteligência virtual ou direcionar ao responsável do seu setor.`);
    return;
  }

  // Escolha do turno de supervisão
  if (sessao.etapa === 'aguardando_supervisao') {
    if (textoNorm === 'a' || textoNorm.includes('diurno') || textoNorm.includes('dia')) {
      sessao.assunto = 'Supervisão (Diurno)';
      sessao.etapa = 'atendimento';
      await encaminharParaHumano(jid, sessao, 'Solicitação de contato com Supervisor Diurno (07h às 19h)', 'Supervisor Diurno');
      return;
    } else if (textoNorm === 'b' || textoNorm.includes('noturno') || textoNorm.includes('noite')) {
      sessao.assunto = 'Supervisão (Noturno)';
      sessao.etapa = 'atendimento';
      await encaminharParaHumano(jid, sessao, 'Solicitação de contato com Supervisor Noturno (19h às 07h)', 'Supervisor Noturno');
      return;
    } else {
      await enviarTexto(jid, `Por favor, digite *A* para Supervisor Diurno ou *B* para Supervisor Noturno.`);
      return;
    }
  }

  // Processamento inteligente da mensagem com IA
  const resultadoIA = iaService.processarChatIA({
    atendimento_id: sessao.atendimentoId,
    colaborador_nome: sessao.nome || `COLABORADOR (${telefone.slice(-4)})`,
    colaborador_matricula: sessao.matricula || '',
    gestao: sessao.gestao || 'Base',
    empreendimento: sessao.posto || '00001 - PR - GESTÃO OPERACIONAL E ADMINISTRATIVA',
    assunto: sessao.assunto || 'Dúvidas Gerais',
    mensagem: textoMsg
  });

  sessao.atendimentoId = resultadoIA.atendimento_id;
  sessao.protocolo = resultadoIA.protocolo;
  if (resultadoIA.colaborador && resultadoIA.colaborador.nome && resultadoIA.colaborador.nome !== 'COLABORADOR') {
    sessao.nome = resultadoIA.colaborador.nome;
    sessao.matricula = resultadoIA.colaborador.matricula || sessao.matricula;
    sessao.posto = resultadoIA.colaborador.posto_nome || sessao.posto;
  }

  // Se a IA conseguir responder dúvida simples com segurança
  if (!resultadoIA.exigir_escalonamento) {
    const cabecalho = formatarCabecalhoAtendimento(sessao, sessao.assunto || 'Dúvidas Gerais');
    const respostaFormatada = `${cabecalho}

🤖 *BARTOLOMEU (IA GPS):*
${resultadoIA.resposta.replace(/\*\*/g, '*')}

---
💡 _Essa orientação resolveu sua dúvida?_
• Se resolveu, seu atendimento está concluído!
• Se ainda precisar de análise humana, digite *HUMANO* ou *MENU* para voltar.`;
    await enviarTexto(jid, respostaFormatada);
  } else {
    // Se exigir direcionamento para humano
    await encaminharParaHumano(jid, sessao, textoMsg, resultadoIA.destino_whatsapp?.responsavel, resultadoIA);
  }
}

/**
 * Realiza o encaminhamento oficial para o responsável humano
 */
async function encaminharParaHumano(jid, sessao, mensagemTexto, responsavelEspecifico = null, resultadoIAPrevio = null) {
  const resultado = resultadoIAPrevio || iaService.processarChatIA({
    atendimento_id: sessao.atendimentoId,
    colaborador_nome: sessao.nome || `COLABORADOR (${sessao.telefone.slice(-4)})`,
    colaborador_matricula: sessao.matricula || '',
    gestao: sessao.gestao || 'Base',
    empreendimento: sessao.posto || '00001 - PR - GESTÃO OPERACIONAL E ADMINISTRATIVA',
    assunto: sessao.assunto || 'Supervisão',
    mensagem: mensagemTexto,
    solicitar_humano: true
  });

  sessao.atendimentoId = resultado.atendimento_id;
  sessao.protocolo = resultado.protocolo;

  const destino = resultado.destino_whatsapp || {
    responsavel: responsavelEspecifico || 'Supervisor Diurno',
    setor: 'Supervisão',
    whatsapp: '41992148064'
  };

  const foneLimpo = destino.whatsapp.replace(/\D/g, '');
  const linkDireto = `https://wa.me/55${foneLimpo}`;

  // 1. Mensagem de confirmação para o colaborador no WhatsApp com cabeçalho oficial
  const cabecalho = formatarCabecalhoAtendimento(sessao, sessao.assunto || 'Atendimento Operacional');
  const msgParaColaborador = `${cabecalho}

✅ *ATENDIMENTO DIRECIONADO COM SUCESSO!* 🛡️

*Responsável do Setor:* ${destino.responsavel} (${destino.setor})
*Telefone de Contato:* (41) ${foneLimpo.slice(-9, -4)}-${foneLimpo.slice(-4)}

Seus dados e sua demanda já foram registrados no nosso painel.
Você também pode iniciar a conversa direta com o responsável tocando no link:
👉 ${linkDireto}

_O Bartolomeu e o Grupo GPS agradecem seu contato!_`;

  await enviarTexto(jid, msgParaColaborador);

  // 2. Notificação automática para o WhatsApp do Gestor / Responsável
  try {
    const jidResponsavel = `55${foneLimpo}@s.whatsapp.net`;

    // Formata número do colaborador de forma legível
    const telFormatado = sessao.telefone.length >= 11
      ? `(${sessao.telefone.slice(-11,-9)}) ${sessao.telefone.slice(-9,-4)}-${sessao.telefone.slice(-4)}`
      : sessao.telefone;

    // Mensagem no mesmo formato visual do painel — idêntico ao modelo aprovado
    const msgNotificacaoGestor = `*GRUPO GPS — ATENDIMENTO AO EFETIVO* 🛡️

*Protocolo:* ${sessao.protocolo}
*Colaborador:* ${sessao.nome || 'Não identificado'}
*Matrícula:* ${sessao.matricula || 'Não informada'}
*Gestão:* ${sessao.gestao || 'Base'}
*Empreendimento/Posto:* ${sessao.posto || '00001 - PR - GESTÃO OPERACIONAL E ADMINISTRATIVA'}
*Assunto:* ${sessao.assunto || 'Supervisão'}

📱 *Contato do Colaborador:* ${telFormatado}
wa.me/55${sessao.telefone}

📝 *Demanda / Mensagem:*
_"${mensagemTexto.trim()}"_

_Encaminhado automaticamente pelo Assistente Virtual *Bartolomeu* — Grupo GPS_`;

    // Envia aviso ao gestor caso o número não seja o próprio bot
    if (foneLimpo !== numeroConectado) {
      await enviarTexto(jidResponsavel, msgNotificacaoGestor);
      console.log(`📲 Notificação do chamado ${resultado.protocolo} enviada ao responsável (${destino.responsavel}: ${foneLimpo})`);
    }
  } catch (e) {
    console.warn('Não foi possível notificar o gestor:', e.message);
  }
}

/**
 * Inicializa a conexão do WhatsApp via Baileys
 */
async function iniciarBotWhatsApp() {
  try {
    console.log('🔄 Iniciando conexão com o WhatsApp do Bartolomeu...');
    statusConexao = 'conectando';

    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      browser: ['Bartolomeu GPS', 'Chrome', '1.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        statusConexao = 'aguardando_qr';
        try {
          ultimoQrCodeBase64 = await QRCode.toDataURL(qr);
        } catch (e) {}

        console.log('\n============================================================');
        console.log('   📲 ESCANEIE O QR CODE NO WHATSAPP DO APARELHO:');
        console.log('                 (41) 98472-1699');
        console.log('============================================================\n');
        qrcodeTerminal.generate(qr, { small: true });
        console.log('\n💡 Você também pode escanear no navegador pelo link:');
        console.log('   👉 http://localhost:3333/conectar-whatsapp.html\n');
      }

      if (connection === 'open') {
        statusConexao = 'conectado';
        ultimoQrCodeBase64 = null;
        tentativaReconexao = 0;
        numeroConectado = (sock.user?.id || '').split(':')[0] || '41984721699';

        console.log('\n============================================================');
        console.log('  ✅ BARTOLOMEU CONECTADO AO WHATSAPP COM SUCESSO!');
        console.log(`  Número Conectado: +${numeroConectado}`);
        console.log('  Atendimento ao efetivo 100% ativo via WhatsApp!');
        console.log('============================================================\n');
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const deveReconectar = statusCode !== DisconnectReason.loggedOut;
        statusConexao = 'desconectado';
        console.log(`⚠️ Conexão WhatsApp encerrada (Status: ${statusCode}). Reconectando: ${deveReconectar}`);

        if (deveReconectar) {
          tentativaReconexao++;
          const espera = Math.min(tentativaReconexao * 2000, 10000);
          setTimeout(() => iniciarBotWhatsApp(), espera);
        } else {
          console.log('🔴 Sessão desconectada pelo aparelho. É necessário escanear o QR Code novamente.');
          ultimoQrCodeBase64 = null;
        }
      }
    });

    // Escuta novas mensagens
    sock.ev.on('messages.upsert', async (m) => {
      if (m.type !== 'notify') return;
      for (const msg of m.messages) {
        if (!msg.message) continue;
        if (msg.key.fromMe) continue;
        if (msg.key.remoteJid && msg.key.remoteJid.endsWith('@g.us')) continue; // ignora grupos

        await processarMensagemRecebida(msg);
      }
    });

  } catch (err) {
    console.error('❌ Erro fatal ao iniciar robô do WhatsApp:', err);
    statusConexao = 'desconectado';
  }
}

/**
 * Retorna status da conexão para o painel / API
 */
function getStatusWhatsApp() {
  return {
    status: statusConexao,
    numero: numeroConectado || '41984721699',
    qrCode: ultimoQrCodeBase64
  };
}

/**
 * Desconecta e limpa sessão
 */
async function desconectarWhatsApp() {
  if (sock) {
    try {
      await sock.logout();
    } catch(e) {}
    sock = null;
  }
  statusConexao = 'desconectado';
  ultimoQrCodeBase64 = null;
  try {
    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    }
  } catch(e) {}
}

module.exports = {
  iniciarBotWhatsApp,
  getStatusWhatsApp,
  desconectarWhatsApp
};
