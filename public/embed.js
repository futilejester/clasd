/**
 * Clasd embeddable signup form.
 *
 * Usage on a third-party site:
 *
 *   <div data-clasd-form="your-form-slug"></div>
 *   <script src="https://your-clasd-app.com/embed.js" async></script>
 *
 * The script finds every <div data-clasd-form="..."> on the page and
 * mounts an iframe pointing at /f/{slug}?embed=1. The iframe renders
 * a chromeless version of the form, and posts a 'clasd-form:resized'
 * message to the parent so the iframe can size to its content.
 *
 * On submission success, the iframe posts 'clasd-form:submitted' and the
 * embed shows a thank-you message in place.
 */
(function () {
  // Resolve the origin from the script's own src so the embed works on
  // any deploy URL without configuration.
  var scripts = document.getElementsByTagName('script');
  var origin = '';
  for (var i = 0; i < scripts.length; i++) {
    var src = scripts[i].src || '';
    if (src.indexOf('/embed.js') !== -1) {
      origin = src.substring(0, src.indexOf('/embed.js'));
      break;
    }
  }
  if (!origin) {
    origin = window.location.origin;
  }

  function mount(container, slug) {
    if (container.dataset.clasdMounted === '1') return;
    container.dataset.clasdMounted = '1';

    var iframe = document.createElement('iframe');
    iframe.src = origin + '/f/' + encodeURIComponent(slug) + '?embed=1';
    iframe.style.border = '0';
    iframe.style.width = '100%';
    iframe.style.minHeight = '420px';
    iframe.style.display = 'block';
    iframe.setAttribute('title', 'Signup form');
    iframe.setAttribute('loading', 'lazy');
    container.innerHTML = '';
    container.appendChild(iframe);

    // Resize iframe to its content height
    window.addEventListener('message', function (event) {
      if (event.source !== iframe.contentWindow) return;
      var data = event.data || {};
      if (
        data &&
        data.type === 'clasd-form:resized' &&
        typeof data.height === 'number'
      ) {
        iframe.style.height = data.height + 'px';
      }
    });
  }

  function init() {
    var els = document.querySelectorAll('[data-clasd-form]');
    for (var i = 0; i < els.length; i++) {
      var slug = els[i].getAttribute('data-clasd-form');
      if (slug) mount(els[i], slug);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
