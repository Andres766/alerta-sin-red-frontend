// Fija el tema y el idioma ANTES de pintar, para evitar el destello de tema claro.
// Es un archivo externo (no un <script> en línea) para respetar la CSP estricta.
;(function () {
  var root = document.documentElement
  var theme = 'system'
  var lang = ''
  try {
    theme = localStorage.getItem('alerta-sin-red:theme') || 'system'
    lang = localStorage.getItem('alerta-sin-red:lang') || ''
  } catch (e) {
    /* almacenamiento bloqueado: se usan las preferencias del sistema */
  }
  var dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  root.dataset.theme = dark ? 'dark' : 'light'
  if (!lang) lang = (navigator.language || 'es').toLowerCase().indexOf('en') === 0 ? 'en' : 'es'
  root.lang = lang === 'en' ? 'en' : 'es-CO'
})()
