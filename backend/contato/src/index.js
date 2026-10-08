/**
 * Sasse Automação - envio do formulário "Solicite um orçamento"
 *
 * Roda no Cloudflare Workers. Recebe o formulário do site, valida,
 * aplica o limite por IP e envia o e-mail pela API da Resend.
 *
 * O e-mail de destino fica SOMENTE nos secrets do Cloudflare
 * (DEST_EMAIL); ele nunca aparece no código do site.
 *
 * Regras de segurança:
 *  - aceita só POST com JSON, vindo das origens permitidas (CORS)
 *  - corpo limitado a 10 KB
 *  - campos validados e limpos (sem caracteres de controle, sem quebra
 *    de linha em nome/e-mail/telefone: evita injeção de cabeçalho de e-mail)
 *  - e-mail enviado só como texto puro (sem HTML: nada é interpretado)
 *  - campo "isca" (honeypot) para robôs
 *  - no máximo 5 envios por IP; ao chegar em 5, o IP fica bloqueado 10 min
 *  - o IP é guardado como hash (não fica o IP real armazenado - LGPD)
 *  - verificação anti-robô Cloudflare Turnstile (opcional, se configurada)
 */

const MAX_SENDS = 5
const LOCK_SECONDS = 10 * 60
const MAX_BODY_BYTES = 10 * 1024

const LIMITS = { nome: 100, email: 254, telefone: 30, mensagem: 2000 }

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || ''
    const allowedOrigins = (env.ALLOWED_ORIGINS || '')
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
    const cors = allowedOrigins.includes(origin) ? corsHeaders(origin) : null

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: cors ? 204 : 403, headers: cors || {} })
    }
    if (!cors) return json({ error: 'Origem não permitida.' }, 403)
    if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405, cors)

    const contentType = request.headers.get('Content-Type') || ''
    if (!contentType.includes('application/json')) {
      return json({ error: 'Formato inválido.' }, 415, cors)
    }

    const declaredSize = Number(request.headers.get('Content-Length') || 0)
    if (declaredSize > MAX_BODY_BYTES) return json({ error: 'Mensagem grande demais.' }, 413, cors)
    const raw = await request.text()
    if (raw.length > MAX_BODY_BYTES) return json({ error: 'Mensagem grande demais.' }, 413, cors)

    let data
    try {
      data = JSON.parse(raw)
    } catch {
      return json({ error: 'Formato inválido.' }, 400, cors)
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return json({ error: 'Formato inválido.' }, 400, cors)
    }

    /*1) bloqueio por IP*/
    const ip = request.headers.get('CF-Connecting-IP') || 'sem-ip'
    const rateKey = `ip:${await sha256(ip)}`
    const now = Date.now()
    const state = (await env.RATE_LIMIT.get(rateKey, 'json')) || { count: 0, lockedUntil: 0 }

    if (state.lockedUntil > now) {
      const retryAfter = Math.ceil((state.lockedUntil - now) / 1000)
      return json(
        { error: 'Limite de envios atingido.', retryAfter },
        429,
        { ...cors, 'Retry-After': String(retryAfter) }
      )
    }

    /*2) isca para robos: finge sucesso e nao envia nada*/
    if (typeof data.website === 'string' && data.website.trim() !== '') {
      return json({ ok: true }, 200, cors)
    }

    /*3) validacao dos campos*/
    const result = validate(data)
    if (result.error) return json({ error: result.error }, 400, cors)

    /*4) anti-robo (Turnstile), se configurado*/
    if (env.TURNSTILE_SECRET) {
      const human = await verifyTurnstile(env.TURNSTILE_SECRET, data.turnstileToken, ip)
      if (!human) return json({ error: 'Verificação anti-robô falhou. Tente novamente.' }, 400, cors)
    }

    /*5) envio do e-mail*/
    try {
      await sendMail(env, result.value)
    } catch (error) {
      console.error('Falha no envio:', error.message)
      return json({ error: 'Não foi possível enviar agora. Tente mais tarde.' }, 502, cors)
    }

    /*6) conta o envio; no 5o o IP fica bloqueado por 10 min*/
    state.count += 1
    if (state.count >= MAX_SENDS) state.lockedUntil = now + LOCK_SECONDS * 1000
    await env.RATE_LIMIT.put(rateKey, JSON.stringify(state), { expirationTtl: LOCK_SECONDS })

    return json({ ok: true, remaining: Math.max(0, MAX_SENDS - state.count) }, 200, cors)
  }
}

/*remove caracteres de controle (exceto quebra de linha quando permitida)*/
function clean(value, { multiline = false } = {}) {
  let text = typeof value === 'string' ? value : ''
  text = text.normalize('NFC')
  text = multiline
    ? text.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000B-\u001F\u007F\u2028\u2029]/g, '')
    : text.replace(/[\u0000-\u001F\u007F\u2028\u2029]/g, ' ')
  return text.trim()
}

const EMAIL_PATTERN = /^[^\s@<>"'(),;:\\[\]]+@[^\s@<>"'(),;:\\[\]]+\.[a-z]{2,}$/i
const PHONE_PATTERN = /^[0-9+()\-\s.]{8,30}$/

function validate(data) {
  const nome = clean(data.nome)
  const email = clean(data.email).toLowerCase()
  const telefone = clean(data.telefone)
  const mensagem = clean(data.mensagem, { multiline: true })

  if (nome.length < 2 || nome.length > LIMITS.nome) return { error: 'Informe um nome válido.' }
  if (/[<>]/.test(nome)) return { error: 'O nome contém caracteres não permitidos.' }
  if (email.length > LIMITS.email || !EMAIL_PATTERN.test(email)) return { error: 'Informe um e-mail válido.' }
  if (telefone && !PHONE_PATTERN.test(telefone)) return { error: 'Informe um telefone válido.' }
  if (mensagem.length < 10) return { error: 'A mensagem precisa ter pelo menos 10 caracteres.' }
  if (mensagem.length > LIMITS.mensagem) return { error: 'A mensagem passou do limite de caracteres.' }

  return { value: { nome, email, telefone, mensagem } }
}

async function sendMail(env, { nome, email, telefone, mensagem }) {
  const subject = `Pedido de orçamento pelo site - ${nome}`.slice(0, 150)
  const text = [
    'Novo pedido de orçamento enviado pelo site da Sasse Automação.',
    '',
    `Nome: ${nome}`,
    `E-mail: ${email}`,
    `Telefone: ${telefone || 'não informado'}`,
    '',
    'Mensagem:',
    mensagem,
    '',
    '---',
    'Para responder, use o botão "Responder" do seu e-mail.'
  ].join('\n')

  /*modo de teste local: nao envia, so mostra no terminal*/
  if (env.MAIL_MODE === 'log') {
    console.log(`[MAIL_MODE=log] Para: (DEST_EMAIL) | Assunto: ${subject}\n${text}`)
    return
  }

  if (!env.RESEND_API_KEY || !env.DEST_EMAIL) {
    throw new Error('RESEND_API_KEY ou DEST_EMAIL não configurados')
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: env.MAIL_FROM || 'Site Sasse Automação <onboarding@resend.dev>',
      to: [env.DEST_EMAIL],
      reply_to: email,
      subject,
      text /*somente texto puro: nada e interpretado como HTML*/
    })
  })

  if (!response.ok) {
    throw new Error(`Resend respondeu ${response.status}`)
  }
}

async function verifyTurnstile(secret, token, ip) {
  if (typeof token !== 'string' || token.length === 0 || token.length > 2048) return false
  const body = new FormData()
  body.append('secret', secret)
  body.append('response', token)
  body.append('remoteip', ip)
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body
  })
  const result = await response.json().catch(() => ({}))
  return result.success === true
}

async function sha256(text) {
  const bytes = new TextEncoder().encode(text)
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin'
  }
}

function json(body, status, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      ...headers
    }
  })
}
