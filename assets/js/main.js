// ===========================
// GENUSSAUTOMATEN - MAIN JS
// ===========================

document.addEventListener('DOMContentLoaded', function () {

  // --- Sticky Header ---
  const header = document.querySelector('.site-header');
  const alwaysScrolled = header.classList.contains('scrolled');
  const updateHeader = () => {
    header.classList.toggle('scrolled', alwaysScrolled || window.scrollY > 50);
  };
  updateHeader();
  window.addEventListener('scroll', updateHeader);

  // --- Mobile Menu ---
  const toggle = document.querySelector('.mobile-toggle');
  const mobileMenu = document.querySelector('.mobile-menu');
  if (toggle && mobileMenu) {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('open');
      mobileMenu.classList.toggle('open');
    });
  }

  // --- FAQ Accordion ---
  document.querySelectorAll('.faq-question').forEach(q => {
    q.addEventListener('click', () => {
      const item = q.closest('.faq-item');
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });

  // --- Fade-in on scroll ---
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

  // --- Active nav link ---
  const currentPath = window.location.pathname;
  document.querySelectorAll('.nav-menu a, .mobile-menu a').forEach(link => {
    if (link.getAttribute('href') === currentPath || link.getAttribute('href') === currentPath.replace(/\/$/, '') + '/') {
      link.classList.add('active');
    }
  });

  // --- Contact Form ---
  const form = document.getElementById('contactForm');
  if (form) {
    // Set submit timestamp for server-side bot timing check (matches form_ts hidden field)
    const formTs = form.querySelector('#form_ts');
    if (formTs) formTs.value = Math.floor(Date.now() / 1000);

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const msg = document.getElementById('formMessage');

      // Client-side validation — same rules as server (unified limits)
      const firmEl   = form.querySelector('#unternehmensname');
      const emailEl  = form.querySelector('#email');
      const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const clientErrors = [];

      if (!firmEl.value.trim()) {
        clientErrors.push('Bitte geben Sie Ihren Unternehmensnamen an.');
        firmEl.classList.add('invalid');
      } else {
        firmEl.classList.remove('invalid');
      }
      if (!emailEl.value.trim() || !validEmail.test(emailEl.value.trim())) {
        clientErrors.push('Bitte geben Sie eine gültige E-Mail-Adresse an.');
        emailEl.classList.add('invalid');
      } else {
        emailEl.classList.remove('invalid');
      }
      if (clientErrors.length) {
        msg.className = 'form-message error';
        msg.textContent = clientErrors.join(' ');
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Wird gesendet...';

      const data = new FormData(form);
      // Honeypot check
      if (data.get('website')) { btn.disabled = false; btn.textContent = 'Anfrage absenden'; return; }

      try {
        const res = await fetch('contact.php', { method: 'POST', body: data });
        const json = await res.json();
        msg.className = 'form-message ' + (json.success ? 'success' : 'error');
        msg.textContent = json.message;
        if (json.success) form.reset();
      } catch {
        msg.className = 'form-message error';
        msg.textContent = 'Ein Fehler ist aufgetreten. Bitte versuche es später erneut.';
      }
      btn.disabled = false;
      btn.textContent = 'Anfrage absenden';
    });
  }

  // --- Smooth scroll for anchor links ---
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // --- Parallax ---
  const pxHeroVideo   = document.querySelector('.hero .hero-video');
  const pxHeroContent = document.querySelector('.hero .hero-content');
  const pxIsFullHero  = !!document.querySelector('.hero:not(.hero--section)');

  // Collect parallax targets with individual speeds
  const pxTargets = [
    // Feature section images (homepage + automatenloesungen etc.)
    ...Array.from(document.querySelectorAll('.feature-image')).map(w => ({ wrap: w, img: w.querySelector('img'), speed: 0.08 })),
    // Service-flow images — slightly stronger
    ...Array.from(document.querySelectorAll('.service-flow__image')).map(w => ({ wrap: w, img: w.querySelector('img'), speed: 0.10 })),
    // Produkt-detail images — gentle
    ...Array.from(document.querySelectorAll('.produkt-detail__image')).map(w => ({ wrap: w, img: w.querySelector('img'), speed: 0.06 })),
    // Genuss-station standalone image
    ...Array.from(document.querySelectorAll('.genuss-station-image__inner, .gs-product-frame')).map(w => ({ wrap: w, img: w.querySelector('img'), speed: 0.07 })),
    // gs-process steamer image
    ...Array.from(document.querySelectorAll('.gs-process__inner')).map(w => ({ wrap: w, img: w.querySelector('img'), speed: 0.05 })),
  ].filter(t => t.img);

  // Prepare imgs
  pxTargets.forEach(t => { t.img.style.willChange = 'transform'; });

  let pxTick = false;

  function runParallax() {
    const sy   = window.scrollY;
    const vh   = window.innerHeight;

    // Hero video — full hero scrolls faster, section hero gentler
    if (pxHeroVideo) {
      pxHeroVideo.style.transform = `translateY(${sy * (pxIsFullHero ? 0.38 : 0.22)}px)`;
    }

    // Hero content — barely drifts for depth on full hero
    if (pxHeroContent && pxIsFullHero) {
      pxHeroContent.style.transform = `translateY(${sy * 0.12}px)`;
    }

    // Section images
    pxTargets.forEach(({ wrap, img, speed }) => {
      const rect = wrap.getBoundingClientRect();
      // Only process elements near/in viewport
      if (rect.bottom < -200 || rect.top > vh + 200) return;
      const mid = rect.top + rect.height / 2 - vh / 2;
      img.style.transform = `translateY(${mid * speed}px)`;
    });

    pxTick = false;
  }

  window.addEventListener('scroll', () => {
    if (!pxTick) { pxTick = true; requestAnimationFrame(runParallax); }
  }, { passive: true });

  runParallax();

  // --- Product Slider ---
  const psTrack = document.getElementById('psTrack');
  const psDots = document.getElementById('psDots');
  const psViewport = document.getElementById('psViewport');
  const psPrev = document.getElementById('psPrev');
  const psNext = document.getElementById('psNext');

  if (psTrack && psDots && psViewport && psPrev && psNext) {
    const psSection = psViewport.closest('.ps-section');
    const hotDrinkSlides = [
      { src: 'assets/images/Heißgetränke/1-Kaffee.png', title: 'Kaffee', sub: 'Kräftig & aromatisch' },
      { src: 'assets/images/Heißgetränke/2-CafeLatte.png', title: 'Cafe Latte', sub: 'Sanft & cremig' },
      { src: 'assets/images/Heißgetränke/3-Cappuchino.png', title: 'Cappuccino', sub: 'Mit feinem Milchschaum' },
      { src: 'assets/images/Heißgetränke/4-Früchtetee.png', title: 'Früchtetee', sub: 'Warm & fruchtig' },
      { src: 'assets/images/Heißgetränke/5-Zitronentee.png', title: 'Zitronentee', sub: 'Frisch & wohltuend' },
      { src: 'assets/images/Heißgetränke/6-Heisse-Schokolade.png', title: 'Heiße Schokolade', sub: 'Süß & cremig' },
    ];
    const drinkSlides = [
      { src: 'assets/images/Getränke/1-CocaCola.webp', title: 'Coca-Cola', sub: 'Klassisch & erfrischend' },
      { src: 'assets/images/Getränke/2-CocaCola-Zero.webp', title: 'Coca-Cola Zero', sub: 'Eiskalt & zuckerfrei' },
      { src: 'assets/images/Getränke/3-Almdudler.webp', title: 'Almdudler', sub: 'Original Kräuterlimonade' },
      { src: 'assets/images/Getränke/4-Marille-Sprizz.webp', title: 'Marille Sprizz', sub: 'Fruchtig & erfrischend' },
      { src: 'assets/images/Getränke/5-Apfel-Sprizz.webp', title: 'Apfel Sprizz', sub: 'Frisch & fruchtig' },
      { src: 'assets/images/Getränke/6-Johannisbeere-Sprizz.webp', title: 'Johannisbeere Sprizz', sub: 'Fruchtig-herb' },
      { src: 'assets/images/Getränke/7-Eistee-Zitrone.webp', title: 'Eistee Zitrone', sub: 'Klassisch gekühlt' },
      { src: 'assets/images/Getränke/8-Eistee-Pfirsich.webp', title: 'Eistee Pfirsich', sub: 'Klassisch gekühlt' },
      { src: 'assets/images/Getränke/9-Sprite.webp', title: 'Sprite', sub: 'Zitronig & frisch' },
      { src: 'assets/images/Getränke/10-Multivitamin.webp', title: 'Multivitamin', sub: 'Fruchtig & vielseitig' },
      { src: 'assets/images/Getränke/11-Voeslauer-Balance.webp', title: 'Vöslauer Balance', sub: 'Leicht & erfrischend' },
      { src: 'assets/images/Getränke/12-Voeslauer-Zitrone.webp', title: 'Vöslauer Zitrone', sub: 'Spritzig & frisch' },
      { src: 'assets/images/Getränke/13-Makava.webp', title: 'Makava', sub: 'Belebend & herb' },
      { src: 'assets/images/Getränke/14-Lemonaid.webp', title: 'Lemonaid', sub: 'Natürlich & frisch' },
      { src: 'assets/images/Getränke/15-Eiskaffee.webp', title: 'Eiskaffee', sub: 'Kühl & cremig' },
      { src: 'assets/images/Getränke/16-CocaCola.webp', title: 'Coca-Cola', sub: 'Klassisch & erfrischend' },
      { src: 'assets/images/Getränke/17-CocaCola-Zero.webp', title: 'Coca-Cola Zero', sub: 'Eiskalt & zuckerfrei' },
      { src: 'assets/images/Getränke/18-CocaCola-Lemon-Zero.webp', title: 'Coca-Cola Lemon Zero', sub: 'Zitronig & zuckerfrei' },
      { src: 'assets/images/Getränke/19-Lemon-Soda.webp', title: 'Lemon Soda', sub: 'Spritzig & zitronig' },
      { src: 'assets/images/Getränke/20-Schartner-Bombe.webp', title: 'Schartner Bombe', sub: 'Fruchtig prickelnd' },
      { src: 'assets/images/Getränke/21-Fanta.webp', title: 'Fanta', sub: 'Fruchtig prickelnd' },
    ];
    const snackSlides = [
      { src: 'assets/images/snacks/1-Schokoriegel.webp', title: 'Schokoriegel', sub: 'Süß & klassisch' },
      { src: 'assets/images/snacks/2-Klassiker.webp', title: 'Haselnuss Klassiker', sub: 'Knusprig & nussig' },
      { src: 'assets/images/snacks/3-Proteinriegel.webp', title: 'Proteinriegel', sub: 'Sättigend & praktisch' },
      { src: 'assets/images/snacks/4-Fruchtgummi.webp', title: 'Fruchtgummi', sub: 'Fruchtig & weich' },
      { src: 'assets/images/snacks/5-Nuesse.webp', title: 'Nüsse', sub: 'Herzhaft & ausgewogen' },
      { src: 'assets/images/snacks/6-Chips.webp', title: 'Chips', sub: 'Salzig & knusprig' },
      { src: 'assets/images/snacks/7-Sandwiches.webp', title: 'Sandwiches', sub: 'Frisch & sättigend' },
      { src: 'assets/images/snacks/8-Baguettes.webp', title: 'Baguettes', sub: 'Frisch & herzhaft' },
    ];
    const foodSlides = [
      { src: 'assets/images/essen/Bami-Goreng.webp', title: 'Bami Goreng', sub: 'Würzig & aromatisch' },
      { src: 'assets/images/essen/Bauerneintopf.webp', title: 'Bauerneintopf', sub: 'Herzhaft & sättigend' },
      { src: 'assets/images/essen/Butter-Chicken.webp', title: 'Butter Chicken', sub: 'Cremig & würzig' },
      { src: 'assets/images/essen/Chicken-Rice-Bowl.webp', title: 'Chicken Rice Bowl', sub: 'Leicht & ausgewogen' },
      { src: 'assets/images/essen/Green-Thai-Curry.webp', title: 'Green Thai Curry', sub: 'Frisch & pikant' },
      { src: 'assets/images/essen/Linguine-alle-Bolognese.webp', title: 'Linguine alle Bolognese', sub: 'Klassisch italienisch' },
      { src: 'assets/images/essen/Mustard-Turkey.webp', title: 'Mustard Turkey', sub: 'Fein & herzhaft' },
      { src: 'assets/images/essen/Paella-con-Pollo.webp', title: 'Paella con Pollo', sub: 'Mediterran & würzig' },
      { src: 'assets/images/essen/Paprika-Gulasch.webp', title: 'Paprika Gulasch', sub: 'Kräftig & deftig' },
      { src: 'assets/images/essen/Penne-all-Arrabiata.webp', title: 'Penne all Arrabiata', sub: 'Pikant & tomatig' },
      { src: 'assets/images/essen/Ratatouille-Quinoa.webp', title: 'Ratatouille Quinoa', sub: 'Gemüsig & leicht' },
      { src: 'assets/images/essen/Ravioli-Napoletana.webp', title: 'Ravioli Napoletana', sub: 'Tomatig & fein' },
      { src: 'assets/images/essen/Risotto-ai-Funghi.webp', title: 'Risotto ai Funghi', sub: 'Cremig & aromatisch' },
      { src: 'assets/images/essen/Risotto-alle-Verdure.webp', title: 'Risotto alle Verdure', sub: 'Gemüsig & cremig' },
      { src: 'assets/images/essen/Spaghetti-Carbonara.webp', title: 'Spaghetti Carbonara', sub: 'Cremig & klassisch' },
      { src: 'assets/images/essen/Spaghetti-Pomodoro.webp', title: 'Spaghetti Pomodoro', sub: 'Fruchtig & italienisch' },
      { src: 'assets/images/essen/Vegane-Curry-Bowl.webp', title: 'Vegane Curry Bowl', sub: 'Pflanzlich & würzig' },
      { src: 'assets/images/essen/Yellow-Lentil-Curry.webp', title: 'Yellow Lentil Curry', sub: 'Wärmend & vegan' },
    ];
    const sliderType = psSection ? psSection.dataset.slider : '';
    const slides = sliderType === 'getraenke' ? drinkSlides : sliderType === 'snacks' ? snackSlides : sliderType === 'essen' ? foodSlides : hotDrinkSlides;
    let current = 0;
    let timer;

    slides.forEach((slide, index) => {
      const slideEl = document.createElement('div');
      slideEl.className = 'ps-slide' + (index === 0 ? ' ps-active' : '');

      const card = document.createElement('div');
      card.className = 'ps-card';

      const img = document.createElement('img');
      img.src = slide.src;
      img.alt = slide.title;
      img.loading = 'lazy';
      card.appendChild(img);

      const label = document.createElement('div');
      label.className = 'ps-label';

      const title = document.createElement('h3');
      title.textContent = slide.title;
      label.appendChild(title);

      if (slide.sub) {
        const sub = document.createElement('p');
        sub.textContent = slide.sub;
        label.appendChild(sub);
      }

      slideEl.appendChild(card);
      slideEl.appendChild(label);
      psTrack.appendChild(slideEl);

      const dot = document.createElement('button');
      dot.className = 'ps-dot' + (index === 0 ? ' ps-active' : '');
      dot.setAttribute('aria-label', 'Produkt ' + (index + 1));
      dot.addEventListener('click', () => goTo(index));
      psDots.appendChild(dot);
    });

    const goTo = (nextIndex) => {
      current = ((nextIndex % slides.length) + slides.length) % slides.length;

      psTrack.querySelectorAll('.ps-slide').forEach((slideEl, index) => {
        slideEl.classList.toggle('ps-active', index === current);
      });
      psDots.querySelectorAll('.ps-dot').forEach((dot, index) => {
        dot.classList.toggle('ps-active', index === current);
      });

      const isMobile = window.innerWidth <= 640;
      const perView = isMobile ? 1 : 3;
      const slideWidth = psViewport.offsetWidth / perView;
      // On mobile slides are 85% wide — center the active one with the correct offset
      const offset = isMobile
        ? psViewport.offsetWidth * (0.075 - current * 0.85)
        : -current * slideWidth + slideWidth;
      psTrack.style.transform = 'translateX(' + offset + 'px)';
    };

    psPrev.addEventListener('click', () => goTo(current - 1));
    psNext.addEventListener('click', () => goTo(current + 1));
    window.addEventListener('resize', () => goTo(current));

    const startTimer = () => {
      timer = window.setInterval(() => goTo(current + 1), 4500);
    };

    psViewport.addEventListener('mouseenter', () => window.clearInterval(timer));
    psViewport.addEventListener('mouseleave', startTimer);

    goTo(0);
    startTimer();
  }

});
