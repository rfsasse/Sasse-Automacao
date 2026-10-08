/*Formulario "Solicite um orcamento" (modal)
  O envio vai para o servidor configurado em SITE_CONFIG.formEndpoint
  (backend/contato). O e-mail da empresa nunca aparece no site.

  Seguranca no navegador (o servidor repete todas as checagens):
  - valida os campos antes de enviar
  - mostra mensagens so com textContent (nunca innerHTML)
  - bloqueia clique duplo enquanto envia
  - limite de 5 envios a cada 10 min neste navegador (o limite real e por IP, no servidor)*/

{
  const modal = document.getElementById('quote-modal')
  const form = modal && modal.querySelector('.quote-form')
  const config = typeof SITE_CONFIG === 'undefined' ? {} : SITE_CONFIG

  const MAX_SENDS = 5
  const LOCK_MS = 10 * 60 * 1000
  const STORAGE_KEY = 'sasse-quote-sends'
  const EMAIL_PATTERN = /^[^\s@<>"'(),;:\\[\]]+@[^\s@<>"'(),;:\\[\]]+\.[a-z]{2,}$/i
  const PHONE_PATTERN = /^[0-9+()\-\s.]{8,30}$/

  if (modal && form && typeof modal.showModal === 'function') {
    const status = form.querySelector('.quote-status')
    const submitButton = form.querySelector('.quote-submit')
    const message = form.querySelector('#quote-mensagem')
    const counter = form.querySelector('#quote-count')
    let turnstileWidget = null

    function setStatus(text, type) {
      status.textContent = text
      status.dataset.type = type || ''
    }

    /*envios recentes guardados neste navegador (pode falhar em aba anonima)*/
    function recentSends() {
      try {
        const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
        return Array.isArray(list) ? list.filter(time => Date.now() - time < LOCK_MS) : []
      } catch {
        return []
      }
    }

    function saveSend() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...recentSends(), Date.now()]))
      } catch {
        /*sem armazenamento: o servidor continua limitando por IP*/
      }
    }

    function minutesUntilUnlock(list) {
      const oldest = Math.min(...list)
      return Math.max(1, Math.ceil((oldest + LOCK_MS - Date.now()) / 60000))
    }

    /*anti-robo Turnstile: so carrega se a chave estiver configurada*/
    function loadTurnstile() {
      if (!config.turnstileSiteKey || turnstileWidget !== null) return
      turnstileWidget = 'carregando'
      window.onTurnstileLoad = function () {
        turnstileWidget = window.turnstile.render(form.querySelector('.quote-turnstile'), {
          sitekey: config.turnstileSiteKey,
          language: 'pt-br'
        })
      }
      const script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit'
      script.async = true
      document.head.appendChild(script)
    }

    function openModal(event) {
      if (event) event.preventDefault()
      setStatus('')
      loadTurnstile()
      modal.showModal()
      form.querySelector('#quote-nome').focus()
    }

    for (const trigger of document.querySelectorAll('[data-open-quote]')) {
      trigger.addEventListener('click', openModal)
    }

    form.querySelector('.quote-close').addEventListener('click', () => modal.close())

    /*clicar fora da caixa fecha o modal*/
    modal.addEventListener('click', function (event) {
      if (event.target === modal) modal.close()
    })

    message.addEventListener('input', function () {
      counter.textContent = `${message.value.length} / 2000`
    })

    function readForm() {
      const data = new FormData(form)
      const value = name => String(data.get(name) || '').trim()
      return {
        nome: value('nome'),
        email: value('email'),
        telefone: value('telefone'),
        mensagem: value('mensagem'),
        website: value('website')
      }
    }

    function validate(fields) {
      if (fields.nome.length < 2 || /[<>]/.test(fields.nome)) return ['quote-nome', 'Informe seu nome.']
      if (!EMAIL_PATTERN.test(fields.email)) return ['quote-email', 'Informe um e-mail válido.']
      if (fields.telefone && !PHONE_PATTERN.test(fields.telefone)) return ['quote-telefone', 'Informe um telefone válido ou deixe em branco.']
      if (fields.mensagem.length < 10) return ['quote-mensagem', 'Escreva uma mensagem com pelo menos 10 caracteres.']
      return null
    }

    form.addEventListener('submit', async function (event) {
      event.preventDefault()
      if (submitButton.disabled) return /*evita clique duplo*/

      for (const field of form.querySelectorAll('[aria-invalid]')) field.removeAttribute('aria-invalid')

      const fields = readForm()
      const problem = validate(fields)
      if (problem) {
        const [fieldId, text] = problem
        const field = form.querySelector(`#${fieldId}`)
        field.setAttribute('aria-invalid', 'true')
        field.focus()
        setStatus(text, 'error')
        return
      }

      const sends = recentSends()
      if (sends.length >= MAX_SENDS) {
        setStatus(`Você atingiu o limite de ${MAX_SENDS} envios. Tente novamente em ${minutesUntilUnlock(sends)} min.`, 'error')
        return
      }

      if (!config.formEndpoint) {
        setStatus('O formulário está em configuração. Por enquanto, fale conosco pelo WhatsApp.', 'error')
        return
      }

      const payload = { ...fields }
      if (config.turnstileSiteKey) {
        payload.turnstileToken = window.turnstile && turnstileWidget ? window.turnstile.getResponse(turnstileWidget) : ''
        if (!payload.turnstileToken) {
          setStatus('Confirme a verificação anti-robô antes de enviar.', 'error')
          return
        }
      }

      submitButton.disabled = true
      setStatus('Enviando...', 'info')
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)

      try {
        const response = await fetch(config.formEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        })
        const result = await response.json().catch(() => ({}))

        if (response.ok) {
          saveSend()
          form.reset()
          counter.textContent = '0 / 2000'
          setStatus('Mensagem enviada! Em breve entraremos em contato pelo seu e-mail.', 'success')
        } else if (response.status === 429) {
          const minutes = Math.max(1, Math.ceil((Number(result.retryAfter) || 600) / 60))
          setStatus(`Limite de envios atingido. Tente novamente em ${minutes} min.`, 'error')
        } else {
          const text = typeof result.error === 'string' ? result.error.slice(0, 200) : ''
          setStatus(text || 'Não foi possível enviar agora. Tente novamente mais tarde.', 'error')
        }
      } catch {
        setStatus('Não foi possível enviar agora. Verifique sua conexão e tente novamente.', 'error')
      } finally {
        clearTimeout(timeout)
        submitButton.disabled = false
        if (window.turnstile && turnstileWidget && turnstileWidget !== 'carregando') {
          window.turnstile.reset(turnstileWidget)
        }
      }
    })
  }
}
