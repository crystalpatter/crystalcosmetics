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

// Newsletter / contact form placeholders — replace action with your form handler
document.querySelectorAll('form[data-noop]').forEach(f => {
  f.addEventListener('submit', e => {
    e.preventDefault();
    alert('Form wiring goes here — connect to Formspree, GoDaddy email forms, or your handler of choice. See README.');
  });
});
