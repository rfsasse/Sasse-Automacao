/*
 * ============================================================
 *  CONFIGURAÇÃO DE CONTATO — edite SOMENTE este bloco
 * ============================================================
 *
 *  - Deixe um campo vazio ('') para ESCONDER aquele item do site.
 *    Assim nenhum dado errado aparece enquanto não for confirmado.
 *  - Valores com formato inválido também são escondidos
 *    automaticamente (veja o aviso no console do navegador, F12).
 *
 *  Formatos aceitos:
 *    whatsapp : só números, com 55 + DDD. Ex.: '5547984534330'
 *    telefone : só números, com 55 + DDD. Ex.: '5547988502740'
 *    email    : endereço completo.        Ex.: 'contato@empresa.com.br'
 */

const SITE_CONFIG = Object.freeze({
  // TODO: confirmar com o cliente (diferente do telefone abaixo)
  whatsapp: '5547984534330',

  // Mensagem que já vem escrita ao abrir o WhatsApp
  whatsappMensagem: 'Olá! Vim pelo site e gostaria de solicitar um orçamento.',

  // TODO: confirmar com o cliente
  telefone: '5547988502740',

  // TODO: e-mail provisório — substituir pelo e-mail real
  email: 'sasseautomacao@email.com'
})
