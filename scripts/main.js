/*Abre fecha menu*/

const nav = document.querySelector('#header nav')
const toggles = document.querySelectorAll('nav .toggle')
const menuButton = document.querySelector('nav .icon-menu')

function setMenu(open) {
  nav.classList.toggle('show', open) /*tira e coloca*/
  menuButton.setAttribute('aria-expanded', String(open))
  document.body.classList.toggle('menu-open', open)
}

for (const element of toggles) {
  element.addEventListener('click', function () {
    setMenu(!nav.classList.contains('show'))
  })
}

/*fecha o menu com a tecla Esc*/
document.addEventListener('keydown', function (event) {
  if (event.key === 'Escape' && nav.classList.contains('show')) {
    setMenu(false)
    menuButton.focus()
  }
})

/*clicar no itens do menu e fechar o menu*/

const links = document.querySelectorAll('nav ul li a')

for (const link of links) {
  link.addEventListener('click', function () {
    setMenu(false)
  })
}

/*Contatos vindos do scripts/config.js*/

const PHONE_PATTERN = /^55\d{10,11}$/ /*55 + DDD + 8 ou 9 digitos*/
const EMAIL_PATTERN = /^[^\s@<>"'()]+@[^\s@<>"'()]+\.[a-z]{2,}$/i

function validValue(value, pattern, name) {
  if (typeof value !== 'string' || value.trim() === '') return null

  const clean = value.trim()
  if (clean.length > 254 || !pattern.test(clean)) {
    console.warn(`config.js: "${name}" com formato inválido, item escondido.`)
    return null
  }
  return clean
}

function formatPhone(digits) {
  const ddd = digits.slice(2, 4)
  const number = digits.slice(4)
  return `(${ddd}) ${number.slice(0, -4)}-${number.slice(-4)}`
}

/*usa textContent e setAttribute (nunca innerHTML) para não permitir injeção de código*/
function showContact(id, href, text) {
  const item = document.getElementById(id)
  if (!item) return

  const link = item.tagName === 'A' ? item : item.querySelector('a')
  link.setAttribute('href', href)
  if (text) link.textContent = text
  item.hidden = false
}

function setupContacts(config) {
  if (!config) return

  const whatsapp = validValue(config.whatsapp, PHONE_PATTERN, 'whatsapp')
  const phone = validValue(config.telefone, PHONE_PATTERN, 'telefone')
  const email = validValue(config.email, EMAIL_PATTERN, 'email')

  if (whatsapp) {
    const message = String(config.whatsappMensagem || '').slice(0, 500)
    const query = message ? `?text=${encodeURIComponent(message)}` : ''
    showContact('whatsapp-link', `https://wa.me/${whatsapp}${query}`)
  }

  if (phone) {
    showContact('contact-phone', `tel:+${phone}`, formatPhone(phone))
  }

  if (email) {
    showContact('contact-email', `mailto:${email}`, email)
  }
}

setupContacts(typeof SITE_CONFIG === 'undefined' ? null : SITE_CONFIG)

/*Ano atual no rodapé*/
document.getElementById('year').textContent = new Date().getFullYear()

/*Mudar o header da pag quando fazer scroll*/
const header = document.querySelector('#header')
const navHeight = header.offsetHeight

function changeHeaderWhenScroll() {
  if (window.scrollY >= navHeight) {
    //maior que a altura do header
    header.classList.add('scroll')
  } else {
    //menor que altura do header
    header.classList.remove('scroll')
  }
}

/*Botão voltar para o topo*/
const backToTopButton = document.querySelector('.back-to-top')

function backToTop() {
  backToTopButton.classList.toggle('show', window.scrollY >= 560)
}

/*Swiper*/

if (typeof Swiper !== 'undefined') {
  new Swiper('.swiper', {
    slidesPerView: 1,
    spaceBetween: 24,
    pagination: {
      el: '.swiper-pagination',
      clickable: true
    },
    keyboard: true,
    breakpoints: {
      767: {
        slidesPerView: 2
      },
      1024: {
        slidesPerView: 3
      }
    }
  })
}

/*ScrollReveal (desligado para quem prefere menos animação)*/

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

if (typeof ScrollReveal !== 'undefined' && !reduceMotion) {
  const scrollReveal = ScrollReveal({
    origin: 'top',
    distance: '30px',
    duration: 700,
    reset: true
  })

  scrollReveal.reveal(
    `#home .video, #home .text,
    #about .text, #about .founder,
    #services header, #services .card,
    #products header, #products .swiper,
    #contact .text, #contact .links,
    footer .brand`,
    { interval: 100 }
  )
}

/*Menu conforme seção visivel na pagina*/
const sections = document.querySelectorAll('main section[id]')

/*Pega todos os ids dentro das seções que estão dentro do main*/
function activateMenuAtCurrentSection() {
  const checkpoint = window.scrollY + (window.innerHeight / 8) * 4

  for (const section of sections) {
    const sectionTop = section.offsetTop
    const sectionHeight = section.offsetHeight
    const sectionId = section.getAttribute('id')
    const menuLink = document.querySelector(`nav ul li a[href="#${sectionId}"]`)

    if (!menuLink) continue

    const checkpointStart = checkpoint >= sectionTop
    const checkpointEnd = checkpoint <= sectionTop + sectionHeight

    menuLink.classList.toggle('active', checkpointStart && checkpointEnd)
  }
}

/*when scroll*/
function onScroll() {
  changeHeaderWhenScroll()
  backToTop()
  activateMenuAtCurrentSection()
}

window.addEventListener('scroll', onScroll, { passive: true })
onScroll()
