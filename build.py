#!/usr/bin/env python3
"""Generates every page of the Crystal Cosmetics static site from shared
header/footer templates so nav + footer stay identical across the site."""
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
BOOK_URL = "https://bookings.gettimely.com/crystalcosmetics/bb/book"
IG_URL = "https://www.instagram.com/crystal.cosmetics.gc/"
FB_URL = "https://www.facebook.com/crystalpcosmetics/"

def rel(depth, path):
    """path is root-relative e.g. 'shop/index.html'; depth is how many
    folders deep the current page lives (0 = root, 1 = one subfolder)."""
    prefix = "../" * depth
    return prefix + path

def header(depth, active):
    r = lambda p: rel(depth, p)
    def navcls(name):
        return ' class="active"' if name == active else ''
    return f'''<div class="announce">Gold Coast's Finest Beauty Studio &nbsp;·&nbsp; Book Online &nbsp;·&nbsp; <em>Free Shipping Over $80</em></div>
<nav>
  <a href="{r('index.html')}" class="nav-brand">
    <span class="nav-brand-name">Crystal Cosmetics</span>
    <span class="nav-brand-sub">Gold Coast · Nude by Crystal</span>
  </a>
  <ul class="nav-links">
    <li><a href="{r('shop/index.html')}"{navcls('shop')}>Shop</a></li>
    <li><a href="{r('services/cosmetic-tattooing.html')}"{navcls('services')}>Services</a></li>
    <li><a href="{r('training/index.html')}"{navcls('training')}>Training</a></li>
    <li><a href="{r('about.html')}"{navcls('about')}>About</a></li>
    <li><a href="{r('blog/index.html')}"{navcls('blog')}>Blog</a></li>
    <li><a href="{r('contact.html')}"{navcls('contact')}>Contact</a></li>
  </ul>
  <a href="{BOOK_URL}" class="btn-nav" target="_blank">Book Now</a>
</nav>
'''

def footer(depth):
    r = lambda p: rel(depth, p)
    return f'''<div class="nl-sec">
  <div class="nl-bg-word">CRYSTAL</div>
  <div class="nl-inner fu">
    <span class="lbl" style="display:block;margin-bottom:12px;">Stay Connected</span>
    <h2 class="nl-h">Stay in the <em>Glow</em><br>with Crystal</h2>
    <p class="nl-p">Beauty trends, exclusive offers, treatment insights &amp; new product drops — straight to your inbox.</p>
    <form class="nl-form" data-noop="1">
      <input type="email" class="nl-input" placeholder="Your email address" required>
      <button class="nl-btn">Subscribe</button>
    </form>
  </div>
</div>

<footer>
  <div class="ft-top">
    <div>
      <div class="ft-brand-n">Crystal Cosmetics</div>
      <div class="ft-brand-s">+ Nude by Crystal · Gold Coast, QLD</div>
      <p class="ft-desc">Gold Coast's premier destination for cosmetic tattooing, beauty services, premium skincare, and professional training.</p>
      <div class="ft-social">
        <a href="{IG_URL}" class="ft-soc" target="_blank" rel="noopener">◎</a>
        <a href="{FB_URL}" class="ft-soc" target="_blank" rel="noopener">f</a>
        <a href="{r('contact.html')}" class="ft-soc">✉</a>
      </div>
    </div>
    <div>
      <div class="ft-col-h">Shop</div>
      <ul class="ft-links">
        <li><a href="{r('shop/skin.html')}">Skincare</a></li>
        <li><a href="{r('shop/lips.html')}">Lip Products</a></li>
        <li><a href="{r('shop/face-tools.html')}">Face Tools</a></li>
        <li><a href="{r('shop/pmu.html')}">PMU Supplies</a></li>
        <li><a href="{r('shop/disposables.html')}">Beauty Disposables</a></li>
      </ul>
    </div>
    <div>
      <div class="ft-col-h">Services</div>
      <ul class="ft-links">
        <li><a href="{r('services/cosmetic-tattooing.html')}">Lip Blushing</a></li>
        <li><a href="{r('services/cosmetic-tattooing.html')}">Powder Brows</a></li>
        <li><a href="{r('services/cosmetic-tattooing.html')}">Eyeliner Tattoo</a></li>
        <li><a href="{r('services/collagen-induction-therapy.html')}">CIT Skin Needling</a></li>
        <li><a href="{r('services/lashes-and-brows.html')}">Lashes &amp; Brows</a></li>
      </ul>
    </div>
    <div>
      <div class="ft-col-h">Learn &amp; Connect</div>
      <ul class="ft-links">
        <li><a href="{r('training/online-lip-tattooing-masterclass.html')}">Online Course</a></li>
        <li><a href="{r('training/1-1-lip-tattooing-training.html')}">1:1 Training</a></li>
        <li><a href="{r('about.html')}">About Crystal</a></li>
        <li><a href="{r('blog/index.html')}">Beauty Blog</a></li>
        <li><a href="{r('contact.html')}">Contact</a></li>
      </ul>
    </div>
  </div>
  <div class="ft-bottom">
    <span>© 2026 Crystal Cosmetics · Nude by Crystal · Gold Coast, Queensland</span>
    <div>
      <a href="{r('policies/privacy-policy.html')}">Privacy</a>
      <a href="{r('policies/refund-policy.html')}">Refunds</a>
      <a href="{r('policies/shipping-policy.html')}">Shipping</a>
      <a href="{r('policies/terms-of-service.html')}">Terms</a>
    </div>
  </div>
</footer>
<script src="{r('js/main.js')}"></script>
'''

def page(depth, active, title, description, body):
    r = lambda p: rel(depth, p)
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<meta name="description" content="{description}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Jost:wght@300;400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{r('css/style.css')}">
</head>
<body>
{header(depth, active)}
{body}
{footer(depth)}
</body>
</html>
'''

def write(path, content):
    full = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, 'w', encoding='utf-8') as f:
        f.write(content)
    print("wrote", path)

def page_hero(ph_class, eyebrow, title_html, sub):
    return f'''<section class="page-hero">
  <div class="ph {ph_class}"></div>
  <div class="page-hero-overlay"></div>
  <div class="page-hero-content">
    <div class="breadcrumb">{eyebrow}</div>
    <h1 class="page-h1">{title_html}</h1>
    <p class="page-sub">{sub}</p>
  </div>
</section>'''

def book_band(text_html, btn_text="Book Now"):
    return f'''<div class="book-band">
  <div class="book-band-txt">{text_html}</div>
  <a href="{BOOK_URL}" class="btn-dark" target="_blank">{btn_text}</a>
</div>'''

if __name__ == "__main__":
    print("templates ready")
