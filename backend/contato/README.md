# Servidor do formulário "Solicite um orçamento"

Pequeno servidor no **Cloudflare Workers** que recebe o formulário do site e
envia o e-mail pela **Resend**, sem expor o e-mail da empresa.

```
Site (modal) → Cloudflare Worker (valida + limita por IP) → Resend → e-mail da empresa
```

## Regras de segurança

- Aceita só `POST` com JSON, vindo de `ALLOWED_ORIGINS` (o site).
- Corpo limitado a 10 KB.
- Campos validados no servidor (nome, e-mail, telefone, mensagem); quebras de
  linha e caracteres de controle bloqueados nos campos curtos (evita injeção
  de cabeçalho de e-mail, como `Bcc:`).
- E-mail enviado só em **texto puro** — nada é interpretado como HTML.
- Campo isca (honeypot): robôs que o preenchem recebem "ok", mas nada é enviado.
- **Máximo de 5 envios por IP; no 5º, o IP fica bloqueado por 10 minutos.**
- O IP é guardado como hash SHA-256 (o IP real não fica armazenado).
- Opcional: anti-robô **Cloudflare Turnstile**.

## Publicar (uma vez só)

Precisa de: conta grátis no [Cloudflare](https://dash.cloudflare.com/sign-up)
e na [Resend](https://resend.com/signup).
Com Node 20 use `wrangler@3` (o `wrangler@4` exige Node 22).

1. **Resend:** crie a conta **com o e-mail que vai receber os pedidos** e gere
   uma API Key (menu *API Keys*). Sem domínio próprio verificado, a Resend só
   entrega para o e-mail da própria conta — que é exatamente o destino aqui.
2. **Login no Cloudflare** (abre o navegador):
   ```
   cd backend/contato
   npx wrangler@3 login
   ```
3. **Criar o armazenamento do limite por IP** e colar o `id` mostrado no
   `wrangler.toml` (linha `id = "COLE_AQUI_O_ID_DO_KV"`):
   ```
   npx wrangler@3 kv namespace create RATE_LIMIT
   ```
4. **Guardar os segredos** (o terminal pede o valor; ele não fica em arquivo):
   ```
   npx wrangler@3 secret put DEST_EMAIL
   npx wrangler@3 secret put RESEND_API_KEY
   ```
5. **Publicar:**
   ```
   npx wrangler@3 deploy
   ```
   O terminal mostra um endereço como
   `https://sasse-contato.SEU-USUARIO.workers.dev`.
6. **Ligar o site ao servidor:** cole esse endereço em `scripts/config.js`,
   no campo `formEndpoint`, e publique o site.

### Anti-robô Turnstile (opcional, recomendado)

1. No painel do Cloudflare: *Turnstile → Add site* com o domínio
   `rfsasse.github.io`.
2. Coloque a **Site Key** em `scripts/config.js` (`turnstileSiteKey`).
3. Guarde a **Secret Key**: `npx wrangler@3 secret put TURNSTILE_SECRET`.

### Domínio próprio

Se o site ganhar um domínio (ex.: `sasseautomacao.com.br`):
- adicione-o em `ALLOWED_ORIGINS` no `wrangler.toml`;
- verifique o domínio na Resend e troque `MAIL_FROM` para algo como
  `Site Sasse Automação <site@sasseautomacao.com.br>`.

## Testar localmente (sem enviar e-mail)

O arquivo `.dev.vars` (fora do Git) liga o modo `MAIL_MODE=log`, que só mostra
o e-mail no terminal:

```
cd backend/contato
npx wrangler@3 dev --port 8787
```
