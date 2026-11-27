const BASE_REGRAS = (typeof REGRAS !== 'undefined') ? REGRAS : require('./data.js');

/**
 * Retorna a orientação correspondente ao contexto e ao tipo de uso.
 * Em avaliações, a autorização explícita da atividade é tratada como
 * condição adicional: sem autorização (ou em caso de dúvida), o uso é Evitar.
 */
function obterOrientacao(contextoId, tipoId, autorizacaoAvaliacao = 'nao_sei') {
  const regra = BASE_REGRAS.find(r => r.id === tipoId);
  if (!regra) return null;

  const resultado = { ...regra, contexto: contextoId, autorizacaoAvaliacao };

  if (contextoId === 'avaliacao') {
    if (autorizacaoAvaliacao !== 'sim') {
      resultado.nivel = 'Evitar';
      resultado.risco = 'O uso pode comprometer a autoria e a finalidade avaliativa da atividade.';
      resultado.mitigacao = 'Verifique as regras definidas pelo professor. Utilize IA somente se houver autorização explícita e dentro dos limites estabelecidos.';
      resultado.contextAlert = 'Contexto de avaliação: sem autorização explícita, a recomendação é não utilizar IA.';
      return resultado;
    }

    // Quando há autorização explícita, a regra pedagógica original continua válida.
    // Usos que já eram classificados como Evitar permanecem nessa categoria.
    resultado.contextAlert = 'Uso autorizado na avaliação: respeite os limites definidos pelo professor ou pela instituição.';
  }

  return resultado;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { obterOrientacao };
}
