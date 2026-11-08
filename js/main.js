// Crystal Cosmetics — shared site behaviour
var BOOKING_URL = 'https://bookings.gettimely.com/crystalcosmetics/bb/book';

// Mobile menu
(function mobileMenu() {
  var nav = document.querySelector('nav');
  var btn = nav && nav.querySelector('.nav-toggle');
  if (!btn) return;
  function setOpen(open) {
    nav.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  btn.addEventListener('click', function () { setOpen(!nav.classList.contains('open')); });
  nav.querySelectorAll('.nav-links a').forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
  document.addEventListener('click', function (e) { if (nav.classList.contains('open') && !nav.contains(e.target)) setOpen(false); });
})();

// Lazy background photos: download each photo only when it's about to scroll into view
(function lazyBackgrounds() {
  var els = Array.prototype.slice.call(document.querySelectorAll('.ph:not(.bg-in), .prod-img-bg:not(.bg-in)'));
  function show(el) { el.classList.add('bg-in'); }
  if (!('IntersectionObserver' in window)) { els.forEach(show); return; }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } });
  }, { rootMargin: '600px 0px' });
  els.forEach(function (el) {
    if (el.closest('.hero-slide')) return; // handled by the slideshow below
    io.observe(el);
  });
})();

// Hero slideshow (home page only — safe no-op elsewhere)
(function heroSlideshow() {
  var slides = document.querySelectorAll('.hero-slide');
  var dots = document.querySelectorAll('.hdot');
  if (!slides.length) return;
  var cur = 0;
  function load(i) { var ph = slides[i] && slides[i].querySelector('.ph'); if (ph) ph.classList.add('bg-in'); }
  load(0);
  // fetch the other slides once the page has finished loading, so they never slow the first view
  window.addEventListener('load', function () { setTimeout(function () { for (var i = 1; i < slides.length; i++) load(i); }, 300); });
  window.goSlide = function (n) {
    load(n);
    slides[cur].classList.remove('active');
    if (dots[cur]) dots[cur].classList.remove('on');
    cur = n;
    slides[cur].classList.add('active');
    if (dots[cur]) dots[cur].classList.add('on');
  };
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  setInterval(function () { window.goSlide((cur + 1) % slides.length); }, 5200);
})();

// Scroll reveal
(function scrollReveal() {
  var items = document.querySelectorAll('.fu');
  if (!('IntersectionObserver' in window)) { items.forEach(function (el) { el.classList.add('in'); }); return; }
  var obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); } });
  }, { threshold: 0.1 });
  items.forEach(function (el) { obs.observe(el); });
})();

// FAQ accordion
(function faqAccordion() {
  document.querySelectorAll('.faq-q').forEach(function (btn) {
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', function () {
      var item = btn.closest('.faq-item');
      var wasOpen = item.classList.contains('open');
      item.parentElement.querySelectorAll('.faq-item.open').forEach(function (o) {
        if (o !== item) { o.classList.remove('open'); var b = o.querySelector('.faq-q'); if (b) b.setAttribute('aria-expanded', 'false'); }
      });
      item.classList.toggle('open', !wasOpen);
      btn.setAttribute('aria-expanded', !wasOpen ? 'true' : 'false');
    });
  });
})();

// Sticky "Book Now" bar on phones — appears once the visitor scrolls past the first screen
(function mobileBookBar() {
  var bar = document.createElement('a');
  bar.className = 'mbb';
  bar.href = BOOKING_URL;
  bar.target = '_blank';
  bar.rel = 'noopener';
  bar.innerHTML = 'Book your appointment <em>→</em>';
  document.body.appendChild(bar);
  var ticking = false;
  function update() { bar.classList.toggle('show', window.scrollY > window.innerHeight * 0.6); ticking = false; }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();
})();

// Newsletter / contact form wiring (Formspree)
var FORMSPREE_ENDPOINT = "https://formspree.io/f/xeaoqeqd";
var CONTACT_EMAIL = "info@crystalcosmetics.com.au";

document.querySelectorAll('form[data-noop]').forEach(function (f) {
  var msg = document.createElement('p');
  msg.className = 'form-msg';
  msg.setAttribute('role', 'status');
  msg.setAttribute('aria-live', 'polite');
  f.insertAdjacentElement('afterend', msg);
  var isNewsletter = f.getAttribute('data-kind') === 'newsletter';

  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var data = new FormData(f);
    var btn = f.querySelector('button');
    function say(text, ok) { msg.textContent = text; msg.className = 'form-msg ' + (ok ? 'ok' : 'err'); }
    var fail = 'Sorry, that didn’t send. Please email us at ' + CONTACT_EMAIL + ' or call 0499 453 555.';

    if (!FORMSPREE_ENDPOINT) {
      var subject = encodeURIComponent('Website enquiry from ' + (data.get('name') || 'your website'));
      var lines = [];
      data.forEach(function (v, k) { lines.push(k + ': ' + v); });
      window.location.href = 'mailto:' + CONTACT_EMAIL + '?subject=' + subject + '&body=' + encodeURIComponent(lines.join('\n'));
      return;
    }
    if (btn) btn.disabled = true;
    fetch(FORMSPREE_ENDPOINT, { method: 'POST', headers: { 'Accept': 'application/json' }, body: data })
      .then(function (res) {
        if (res.ok) {
          say(isNewsletter ? 'You’re on the list — thank you!' : 'Thank you! Your message has been sent — Crystal will be in touch soon.', true);
          f.reset();
        } else { say(fail, false); }
      })
      .catch(function () { say(fail, false); })
      .then(function () { if (btn) btn.disabled = false; });
  });
});
