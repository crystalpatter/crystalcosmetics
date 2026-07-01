// Crystal Cosmetics — shared site behaviour

// Hero slideshow (home page only — safe no-op elsewhere)
(function heroSlideshow() {
  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.hdot');
  if (!slides.length) return;
  let cur = 0;
  window.goSlide = function (n) {
    slides[cur].classList.remove('active');
    if (dots[cur]) dots[cur].classList.remove('on');
    cur = n;
    slides[cur].classList.add('active');
    if (dots[cur]) dots[cur].classList.add('on');
  };
  setInterval(() => window.goSlide((cur + 1) % slides.length), 5200);
})();

// Scroll reveal
(function scrollReveal() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); });
  }, { threshold: 0.1 });
  document.querySelectorAll('.fu').forEach(el => obs.observe(el));
})();

// FAQ accordion
(function faqAccordion() {
  document.querySelectorAll('.faq-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const wasOpen = item.classList.contains('open');
      item.parentElement.querySelectorAll('.faq-item.open').forEach(o => { if (o !== item) o.classList.remove('open'); });
      item.classList.toggle('open', !wasOpen);
    });
  });
})();

// Newsletter / contact form wiring
var FORMSPREE_ENDPOINT = ""; // paste your Formspree endpoint here once verified, e.g. "https://formspree.io/f/xxxxxxx"
var CONTACT_EMAIL = "info@crystalcosmetics.com.au";

document.querySelectorAll('form[data-noop]').forEach(f => {
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var data = new FormData(f);

    if (FORMSPREE_ENDPOINT) {
      fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: data
      }).then(function (res) {
        if (res.ok) {
          alert('Thanks! Your message has been sent.');
          f.reset();
        } else {
          alert('Something went wrong sending your message. Please email us directly at ' + CONTACT_EMAIL + '.');
        }
      }).catch(function () {
        alert('Something went wrong sending your message. Please email us directly at ' + CONTACT_EMAIL + '.');
      });
    } else {
      var subject = encodeURIComponent('Website enquiry from ' + (data.get('name') || 'your website'));
      var bodyLines = [];
      data.forEach(function (value, key) { bodyLines.push(key + ': ' + value); });
      var body = encodeURIComponent(bodyLines.join('\n'));
      window.location.href = 'mailto:' + CONTACT_EMAIL + '?subject=' + subject + '&body=' + body;
    }
  });
});
