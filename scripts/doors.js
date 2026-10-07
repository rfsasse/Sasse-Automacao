/*Portas de automação: abrem ao mexer e fecham depois de um tempo parado*/

{
  const doors = document.querySelector('.doors')
  const IDLE_TIME = 5 * 60 * 1000 /*5 minutos sem mexer fecha as portas*/
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (doors && reduceMotion) {
    /*quem prefere menos animação entra direto no site*/
    doors.remove()
  } else if (doors) {
    let lastActivity = Date.now()

    function openDoors() {
      doors.classList.add('is-open')
    }

    function closeDoors() {
      doors.classList.remove('is-open')
    }

    function onActivity() {
      lastActivity = Date.now()
      if (!doors.classList.contains('is-open')) openDoors()
    }

    /*mouse, toque, scroll e teclado contam como "mexer"*/
    const activityEvents = ['mousemove', 'pointerdown', 'wheel', 'scroll', 'keydown', 'touchstart']

    for (const eventName of activityEvents) {
      window.addEventListener(eventName, onActivity, { passive: true })
    }

    /*ao entrar no site, abre sozinha depois de 4s mesmo sem mexer
      (quem mexer antes abre na hora). Bom para o Google e para quem nao usa mouse*/
    const AUTO_OPEN_TIME = 4000
    setTimeout(function () {
      lastActivity = Date.now()
      openDoors()
    }, AUTO_OPEN_TIME)

    /*confere 1x por segundo se ficou parado tempo demais*/
    setInterval(function () {
      const idle = Date.now() - lastActivity
      if (idle >= IDLE_TIME && doors.classList.contains('is-open')) closeDoors()
    }, 1000)
  }
}
