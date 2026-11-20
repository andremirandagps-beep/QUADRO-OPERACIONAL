/**
 * MÓDULO DE IA - ATENDIMENTO AO EFETIVO GRUPO GPS
 * Regras de Negócio, Base de Conhecimento e Encaminhamento WhatsApp
 */

const database = require('./database.js');

// Helper para normalizar texto (sem acentos e minúsculas)
function normalizar(texto) {
  if (!texto) return '';
  return texto
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Busca colaborador no banco por matrícula ou nome
 */
function buscarColaborador(query) {
  if (!query) return null;
  const qNorm = normalizar(query);
  const qNum = query.toString().replace(/\D/g, '');

  const todos = database.getAllColabs();
  
  // 1. Busca exata por matrícula
  if (qNum) {
    const porMat = todos.find(c => {
      const mat = (c.matricula || '').replace(/\D/g, '');
      return mat && (mat === qNum || mat.endsWith(qNum) || qNum.endsWith(mat));
    });
    if (porMat) return porMat;
  }

  // 2. Busca por nome completo ou parcial
  const porNome = todos.find(c => {
    const nomeNorm = normalizar(c.nome);
    return nomeNorm.includes(qNorm) || qNorm.includes(nomeNorm);
  });

  return porNome || null;
}

/**
 * Busca sugestões de colaboradores para auto-complete
 */
function pesquisarColaboradores(termo, limite = 8) {
  if (!termo || termo.length < 2) return [];
  const termoNorm = normalizar(termo);
  const termoNum = termo.replace(/\D/g, '');

  const todos = database.getAllColabs();
  const resultados = [];

  for (const c of todos) {
    const nomeNorm = normalizar(c.nome);
    const mat = (c.matricula || '').replace(/\D/g, '');

    const matchNome = nomeNorm.includes(termoNorm);
    const matchMat = termoNum && mat.includes(termoNum);

    if (matchNome || matchMat) {
      resultados.push({
        id: c.id,
        nome: c.nome,
        matricula: c.matricula || 'N/I',
        funcao: c.funcao || 'VIGILANTE',
        escala: c.escala || '12x36',
        equipe: c.equipe || 'Equipe Operacional',
        posto_nome: c.posto_nome || 'Reserva / Empreendimento GPS'
      });
      if (resultados.length >= limite) break;
    }
  }

  return resultados;
}

/**
 * Determina o contato responsável do WhatsApp baseado na Gestão (Rumo ou Base) e Assunto
 */
function determinarDestinoWhatsApp(gestao, assunto, empreendimento, mensagem = '') {
  const contatos = database.getAllIaContatos().filter(c => c.ativo === 1);
  const horaAtual = new Date().getHours();
  const isNoturno = (horaAtual >= 19 || horaAtual < 7);

  const gestaoNorm = normalizar(gestao || 'base');
  const assuntoNorm = normalizar(assunto || '');
  const msgNorm = normalizar(mensagem);

  // 1. Verificar se há contato específico para este empreendimento
  if (empreendimento && empreendimento !== 'Todos') {
    const empNorm = normalizar(empreendimento);
    const contatoEmp = contatos.find(c => normalizar(c.empreendimento) === empNorm);
    if (contatoEmp) return contatoEmp;
  }

  // 2. Assuntos de RH (Folha-ponto, Holerite, Pagamento, Atestados)
  if (
    assuntoNorm.includes('folha') ||
    assuntoNorm.includes('ponto') ||
    assuntoNorm.includes('holerite') ||
    assuntoNorm.includes('pagamento') ||
    assuntoNorm.includes('salario') ||
    assuntoNorm.includes('atestado') ||
    msgNorm.includes('holerite') ||
    msgNorm.includes('folha') ||
    msgNorm.includes('contracheque')
  ) {
    if (gestaoNorm.includes('rumo')) {
      const cRumo = contatos.find(c => normalizar(c.gestao) === 'rumo' && normalizar(c.setor).includes('rh'));
      if (cRumo) return cRumo;
    } else {
      // Base - Dayana ou Engel
      const cDayana = contatos.find(c => normalizar(c.responsavel).includes('dayana'));
      if (cDayana) return cDayana;
      const cEngel = contatos.find(c => normalizar(c.responsavel).includes('engel') && normalizar(c.setor).includes('rh'));
      if (cEngel) return cEngel;
    }
  }

  // 3. Benefícios (VT, VR, VA, Plano de Saúde, Odonto)
  if (
    assuntoNorm.includes('beneficio') ||
    assuntoNorm.includes('transporte') ||
    assuntoNorm.includes('refeicao') ||
    assuntoNorm.includes('alimentacao') ||
    assuntoNorm.includes('saude') ||
    assuntoNorm.includes('odonto') ||
    msgNorm.includes('vt') ||
    msgNorm.includes('vr') ||
    msgNorm.includes('va') ||
    msgNorm.includes('alelo') ||
    msgNorm.includes('ticket') ||
    msgNorm.includes('unimed')
  ) {
    if (gestaoNorm.includes('rumo')) {
      const cRumo = contatos.find(c => normalizar(c.gestao) === 'rumo');
      if (cRumo) return cRumo;
    } else {
      // Base - Débora ou Engel
      const cDebora = contatos.find(c => normalizar(c.responsavel).includes('debora'));
      if (cDebora) return cDebora;
      const cEngel = contatos.find(c => normalizar(c.responsavel).includes('engel') && normalizar(c.setor).includes('beneficio'));
      if (cEngel) return cEngel;
    }
  }

  // 4. Operacional e Noturno (Supervisão, Reciclagem, Uniforme, Material, Combustível, Manutenção)
  if (isNoturno) {
    const cNoite = contatos.find(c => normalizar(c.responsavel).includes('noite'));
    if (cNoite) return cNoite;
  }

  const c24h = contatos.find(c => normalizar(c.responsavel).includes('24h') || normalizar(c.setor).includes('supervisao'));
  if (c24h) return c24h;

  // Fallback geral
  return contatos[0] || {
    responsavel: 'Supervisão Geral',
    setor: 'Supervisão',
    whatsapp: '41992148064',
    gestao: 'Geral'
  };
}

/**
 * Cria a URL do WhatsApp com mensagem pronta e profissional
 */
function gerarLinkWhatsApp({ telefone, protocolo, colaborador_nome, colaborador_matricula, gestao, empreendimento, assunto, mensagem, responsavel_nome }) {
  if (!telefone) return '';
  const numLimpo = telefone.replace(/\D/g, '');
  const ddi = numLimpo.startsWith('55') ? numLimpo : `55${numLimpo}`;

  const textoMsg = 
`*GRUPO GPS — ATENDIMENTO AO EFETIVO* 🛡️
*Protocolo:* ${protocolo}
*Colaborador:* ${colaborador_nome}
*Matrícula:* ${colaborador_matricula || 'Não informada'}
*Gestão:* ${gestao}
*Empreendimento/Posto:* ${empreendimento || 'Geral'}
*Assunto:* ${assunto}

*Demanda / Mensagem:*
"${mensagem.trim()}"

_Encaminhado automaticamente pelo Assistente Virtual Bartolomeu (Grupo GPS) para: ${responsavel_nome}_`;

  return `https://api.whatsapp.com/send?phone=${ddi}&text=${encodeURIComponent(textoMsg)}`;
}

/**
 * Processamento Inteligente do Chat da IA
 */
function processarChatIA(dados) {
  const {
    atendimento_id,
    colaborador_nome = 'COLABORADOR',
    colaborador_matricula = '',
    gestao = 'Base',
    empreendimento = '',
    assunto = 'Dúvidas Gerais',
    mensagem = ''
  } = dados;

  // 1. Tentar localizar dados do colaborador no banco de postos
  const colabCadastrado = buscarColaborador(colaborador_matricula || colaborador_nome);
  const nomeExibicao = colabCadastrado ? colabCadastrado.nome : colaborador_nome.toUpperCase().trim();
  const matExibicao = colabCadastrado ? colabCadastrado.matricula : colaborador_matricula;
  const postoExibicao = empreendimento || (colabCadastrado ? (colabCadastrado.posto_nome || colabCadastrado.posto_short_name) : 'Posto Operacional GPS');

  // 2. Obter base de conhecimento ativa
  const baseConhecimento = database.getAllIaConhecimento().filter(k => k.ativo === 1);
  const msgNorm = normalizar(mensagem);
  const assuntoNorm = normalizar(assunto);
  const gestaoNorm = normalizar(gestao);

  // 3. Sistema de Match Semântico e Palavras-chave
  let melhorMatch = null;
  let maiorScore = 0;

  for (const item of baseConhecimento) {
    let score = 0;

    // Verificar se aplica à gestão
    const gestaoItemNorm = normalizar(item.gestao_aplicavel);
    if (gestaoItemNorm !== 'todas' && !gestaoItemNorm.includes(gestaoNorm)) {
      continue;
    }

    // Match por assunto direto
    const itemAssuntoNorm = normalizar(item.assunto);
    if (assuntoNorm === itemAssuntoNorm) {
      score += 15;
    } else if (assuntoNorm.includes(itemAssuntoNorm) || itemAssuntoNorm.includes(assuntoNorm)) {
      score += 8;
    }

    // Match pelas palavras-chave cadastradas
    if (item.palavras_chave) {
      const tags = item.palavras_chave.split(',').map(t => normalizar(t));
      tags.forEach(tag => {
        if (tag && msgNorm.includes(tag)) {
          score += 5;
        }
      });
    }

    // Match por palavras no título
    const tituloNorm = normalizar(item.titulo);
    if (msgNorm.includes(tituloNorm) || tituloNorm.includes(msgNorm)) {
      score += 6;
    }

    if (score > maiorScore) {
      maiorScore = score;
      melhorMatch = item;
    }
  }

  // 4. Determinar contato para escalonamento humano no WhatsApp
  const contatoDestino = determinarDestinoWhatsApp(gestao, assunto, postoExibicao, mensagem);

  // 5. Gerar protocolo e ID
  const now = new Date();
  const idAtend = atendimento_id || `AT-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
  const protocolo = `#${idAtend.replace('AT-', '')}`;

  // 6. Montar resposta estruturada da IA
  let respostaTexto = '';
  let exigirEscalonamento = false;

  // Saudação personalizada
  const saudacao = `Olá, **${nomeExibicao}**! Sou o **Bartolomeu**, assistente virtual do Grupo GPS. `;
  const infoPosto = colabCadastrado 
    ? `Identifiquei seu cadastro como **${colabCadastrado.funcao || 'Vigilante'}** alocado no posto **${colabCadastrado.posto_nome || 'Operacional'}** (${colabCadastrado.escala || '12x36'}).\n\n`
    : `Estou aqui para te orientar em seu atendimento.\n\n`;

  if (melhorMatch && maiorScore >= 5) {
    respostaTexto = saudacao + infoPosto + melhorMatch.resposta_oficial;
    exigirEscalonamento = (melhorMatch.exigir_escalonamento === 1);
  } else {
    // Resposta padrão inteligente
    respostaTexto = saudacao + infoPosto + 
      `Recebi sua mensagem sobre **${assunto}**:\n\n` +
      `_"${mensagem}"_\n\n` +
      `Para garantir que sua solicitação seja atendida com a máxima agilidade e pelas pessoas certas da gestão **${gestao.toUpperCase()}**, organizei todos os dados do seu atendimento.\n\n` +
      `Se você deseja que o responsável analise seu caso agora, basta clicar no botão verde abaixo para abrir uma conversa direta no WhatsApp.`;
    exigirEscalonamento = true;
  }

  // 7. Gerar link de WhatsApp
  const linkWhatsApp = gerarLinkWhatsApp({
    telefone: contatoDestino.whatsapp,
    protocolo,
    colaborador_nome: nomeExibicao,
    colaborador_matricula: matExibicao,
    gestao,
    empreendimento: postoExibicao,
    assunto,
    mensagem: mensagem || 'Dúvidas e orientações operacionais',
    responsavel_nome: `${contatoDestino.responsavel} (${contatoDestino.setor})`
  });

  // 8. Salvar ou atualizar atendimento no SQLite
  let atendimentoExistente = database.getIaAtendimentoById(idAtend);
  let historico = [];

  if (atendimentoExistente && atendimentoExistente.historico_conversa) {
    try {
      historico = JSON.parse(atendimentoExistente.historico_conversa);
    } catch (e) {
      historico = [];
    }
  }

  const timestampIso = now.toISOString();
  historico.push({
    sender: 'user',
    text: mensagem,
    time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    timestamp: timestampIso
  });

  historico.push({
    sender: 'ia',
    text: respostaTexto,
    time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    timestamp: timestampIso,
    escalonamento: {
      responsavel: contatoDestino.responsavel,
      setor: contatoDestino.setor,
      whatsapp: contatoDestino.whatsapp,
      link: linkWhatsApp
    }
  });

  if (!atendimentoExistente) {
    database.criarIaAtendimento({
      id: idAtend,
      protocolo,
      colaborador_id: colabCadastrado ? colabCadastrado.id : null,
      colaborador_nome: nomeExibicao,
      colaborador_matricula: matExibicao,
      gestao,
      empreendimento: postoExibicao,
      assunto,
      mensagem_inicial: mensagem,
      historico_conversa: JSON.stringify(historico),
      resolvido_por: 'Pendente',
      responsavel_destino: `${contatoDestino.responsavel} (${contatoDestino.setor})`,
      responsavel_whatsapp: contatoDestino.whatsapp,
      status: 'Aberto'
    });
  } else {
    database.atualizarIaAtendimento(idAtend, {
      historico_conversa: JSON.stringify(historico),
      responsavel_destino: `${contatoDestino.responsavel} (${contatoDestino.setor})`,
      responsavel_whatsapp: contatoDestino.whatsapp,
      status: atendimentoExistente.status || 'Aberto'
    });
  }

  return {
    atendimento_id: idAtend,
    protocolo,
    resposta: respostaTexto,
    colaborador: {
      nome: nomeExibicao,
      matricula: matExibicao,
      posto: postoExibicao,
      gestao
    },
    destino_whatsapp: {
      responsavel: contatoDestino.responsavel,
      setor: contatoDestino.setor,
      whatsapp: contatoDestino.whatsapp,
      observacoes: contatoDestino.observacoes,
      link: linkWhatsApp
    },
    exigir_escalonamento: exigirEscalonamento,
    assunto_identificado: melhorMatch ? melhorMatch.assunto : assunto
  };
}

module.exports = {
  buscarColaborador,
  pesquisarColaboradores,
  determinarDestinoWhatsApp,
  gerarLinkWhatsApp,
  processarChatIA
};
