const { obterOrientacao } = require('./logic.js');

const casos = [
  ['CT01', 'estudo', 'explicar_conceito', 'nao_sei', 'Recomendado'],
  ['CT02', 'estudo', 'criar_exemplo', 'nao_sei', 'Recomendado'],
  ['CT03', 'pratica', 'interpretar_erro', 'nao_sei', 'Recomendado'],
  ['CT04', 'pratica', 'causas_erro', 'nao_sei', 'Cautela'],
  ['CT05', 'pratica', 'dica', 'nao_sei', 'Cautela'],
  ['CT06', 'pratica', 'revisar_codigo', 'nao_sei', 'Cautela'],
  ['CT07', 'trabalho', 'comparar', 'nao_sei', 'Cautela'],
  ['CT08', 'estudo', 'pseudocodigo', 'nao_sei', 'Cautela'],
  ['CT09', 'pratica', 'completar_codigo', 'nao_sei', 'Evitar'],
  ['CT10', 'pratica', 'solucao_completa', 'nao_sei', 'Evitar'],
  ['CT11', 'avaliacao', 'avaliacao', 'sim', 'Evitar'],
  ['CT12', 'avaliacao', 'explicar_conceito', 'nao', 'Evitar'],
  ['CT13', 'avaliacao', 'explicar_conceito', 'nao_sei', 'Evitar'],
  ['CT14', 'avaliacao', 'explicar_conceito', 'sim', 'Recomendado'],
];

let falhas = 0;
for (const [id, contexto, tipo, autorizacao, esperado] of casos) {
  const obtido = obterOrientacao(contexto, tipo, autorizacao)?.nivel;
  const ok = obtido === esperado;
  console.log(`${id}: esperado=${esperado} obtido=${obtido} => ${ok ? 'APROVADO' : 'FALHOU'}`);
  if (!ok) falhas++;
}

const invalido = obterOrientacao('estudo', 'tipo_inexistente');
const invalidoOk = invalido === null;
console.log(`CT15: tipo inexistente => ${invalidoOk ? 'APROVADO' : 'FALHOU'}`);
if (!invalidoOk) falhas++;

process.exitCode = falhas ? 1 : 0;
