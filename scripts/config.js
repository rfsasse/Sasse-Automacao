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
 *
 *  O e-mail da empresa NÃO fica aqui: ele fica guardado em segredo no
 *  servidor do formulário (backend/contato), para não ficar exposto.
 */

const SITE_CONFIG = Object.freeze({
  // TODO: confirmar com o cliente (diferente do telefone abaixo)
  whatsapp: '5547984534330',

  // Mensagem que já vem escrita ao abrir o WhatsApp
  whatsappMensagem: 'Olá! Vim pelo site e gostaria de solicitar um orçamento.',

  // TODO: confirmar com o cliente
  telefone: '5547988502740',

  // Endereço do servidor do formulário "Solicite um orçamento"
  // (aparece depois de publicar o backend/contato no Cloudflare).
  // Vazio = o formulário avisa que está em configuração.
  formEndpoint: '',

  // Chave pública do anti-robô Cloudflare Turnstile (opcional)
  turnstileSiteKey: ''
})
