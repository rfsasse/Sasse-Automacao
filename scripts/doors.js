/*Portas de automação: abrem ao mexer e fecham depois de um tempo parado*/

{
  const doors = document.querySelector('.doors')
  const IDLE_TIME = 30000 /*30s sem mexer fecha as portas*/
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

    /*confere 1x por segundo se ficou parado tempo demais*/
    setInterval(function () {
      const idle = Date.now() - lastActivity
      if (idle >= IDLE_TIME && doors.classList.contains('is-open')) closeDoors()
    }, 1000)
  }
}
