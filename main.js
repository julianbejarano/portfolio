// Todo el contenido sale de dos archivos JSON independientes: profile.json (perfil: textos, bio, educación,
// contacto) y projects.json (array de proyectos). index.html es solo el esqueleto.
// gsap, ScrollTrigger, SplitText, ScrambleText y Lenis vienen de los CDN, que se cargan con "defer" antes que este script.
// Si algún CDN falla, cada bloque lo detecta y el sitio sigue funcionando sin esa animación.

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const canHover = window.matchMedia("(hover: hover)").matches;

let lenis = null;

// ===== Grid de proyectos =====
// Se arma con createElement/textContent (nunca innerHTML con datos).
// Los links externos solo se aceptan si son http(s), para descartar "javascript:" y similares.

function isSafeUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch (error) {
    return false;
  }
}

function createMedia(project) {
  const media = document.createElement("div");
  media.className = "media";

  if (project.video) {
    const video = document.createElement("video");
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "none";
    if (project.image) {
      video.poster = project.image;
    }
    video.src = project.video;
    media.appendChild(video);
  } else if (project.image) {
    const image = document.createElement("img");
    image.src = project.image;
    image.alt = project.title;
    image.loading = "lazy";
    media.appendChild(image);
  } else {
    media.classList.add("is-placeholder");
    const label = document.createElement("span");
    label.textContent = "Imagen / video pendiente";
    media.appendChild(label);
  }

  return media;
}

function createCard(project) {
  const hasLink = isSafeUrl(project.url);
  const card = document.createElement(hasLink ? "a" : "div");
  card.className = "project-card";

  if (hasLink) {
    card.href = project.url;
    card.target = "_blank";
    card.rel = "noopener";
  }

  const title = document.createElement("h3");
  title.textContent = project.title;

  const meta = document.createElement("div");
  meta.className = "project-meta";
  const type = document.createElement("span");
  type.textContent = project.type;
  const year = document.createElement("span");
  year.textContent = project.year ? String(project.year) : "[año]";
  if (!project.year) {
    year.dataset.placeholder = "";
  }
  meta.append(type, year);

  const summary = document.createElement("p");
  summary.className = "project-summary";
  summary.textContent = project.summary;

  const media = createMedia(project);
  card.append(media, title, meta, summary);

  // preview en video solo con mouse (o foco de teclado) y sin "movimiento reducido";
  // en táctil o con movimiento reducido se queda el poster
  const video = media.querySelector("video");
  if (video && canHover && !reduceMotion) {
    const play = function () { video.play().catch(function () {}); };
    const stop = function () { video.pause(); video.currentTime = 0; };
    card.addEventListener("mouseenter", play);
    card.addEventListener("mouseleave", stop);
    card.addEventListener("focusin", play);
    card.addEventListener("focusout", stop);
  }

  return card;
}

function renderProjects(projects) {
  const grid = document.getElementById("projects-grid");
  grid.replaceChildren(...projects.map(createCard));
}

// ===== Perfil (profile.json) =====
// Los textos sueltos se pintan con data-bind="ruta.en.el.json" (textContent); las listas y los links
// se arman con createElement. Nunca innerHTML con datos, y los links se validan antes de usarlos.

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(path + ": HTTP " + response.status);
  }
  return response.json();
}

function getByPath(object, path) {
  return path.split(".").reduce(function (value, key) {
    return value === undefined || value === null ? undefined : value[key];
  }, object);
}

function isSafeHref(href) {
  return typeof href === "string" && (href.startsWith("#") || href.startsWith("mailto:") || isSafeUrl(href));
}

function createLink(link) {
  const anchor = document.createElement("a");
  anchor.textContent = link.label;
  if (isSafeHref(link.href)) {
    anchor.href = link.href;
    if (link.external) {
      anchor.target = "_blank";
      anchor.rel = "noopener";
    }
  }
  return anchor;
}

function createListItem(content) {
  const item = document.createElement("li");
  item.append(content);
  return item;
}

function renderFeatured(featured, projects) {
  const project = projects.find(function (item) { return item.id === featured.projectId; });
  if (!project) {
    console.warn('profile.json: featured.projectId "' + featured.projectId + '" no existe en projects.json');
    document.getElementById("featured").hidden = true;
    return;
  }

  document.getElementById("featured-name").textContent = project.title;

  const link = document.getElementById("featured-link");
  if (isSafeUrl(project.url)) {
    link.href = project.url;
  }

  // la imagen o el video del proyecto destacado salen de su propio objeto en projects.json
  const media = createMedia(project);
  media.id = "featured-media";
  media.dataset.reveal = "";
  const video = media.querySelector("video");
  if (video && !reduceMotion) {
    video.autoplay = true;
    video.play().catch(function () {});
  }
  document.getElementById("featured-media").replaceWith(media);
}

function renderInfo(profile) {
  const info = profile.info;

  const portrait = document.getElementById("portrait");
  portrait.src = info.portrait.src;
  portrait.alt = info.portrait.alt;

  document.getElementById("bio-paragraphs").replaceChildren(...info.bio.map(function (paragraph) {
    const element = document.createElement("p");
    element.textContent = paragraph.text;
    if (paragraph.lang !== profile.site.lang) {
      element.lang = paragraph.lang;
    }
    return element;
  }));

  document.getElementById("education-list").replaceChildren(...info.education.map(function (entry) {
    const date = document.createElement("span");
    date.textContent = entry.date;
    const item = document.createElement("li");
    item.append(date, " " + entry.text);
    return item;
  }));
}

function renderProfile(profile, projects) {
  document.documentElement.lang = profile.site.lang;
  document.title = profile.site.title;
  document.querySelector('meta[name="description"]').content = profile.site.description;

  document.querySelectorAll("[data-bind]").forEach(function (element) {
    const value = getByPath(profile, element.dataset.bind);
    if (typeof value === "string") {
      element.textContent = value;
    } else {
      console.warn('profile.json: falta "' + element.dataset.bind + '"');
    }
  });

  document.getElementById("menu-list").replaceChildren(...profile.nav.map(function (item) {
    return createListItem(createLink(item));
  }));

  document.getElementById("capabilities-list").replaceChildren(...profile.services.capabilities.map(function (text) {
    return createListItem(text);
  }));

  document.getElementById("contact-list").replaceChildren(
    ...profile.contact.links.map(function (link) { return createListItem(createLink(link)); }),
    createListItem(profile.contact.location)
  );

  renderFeatured(profile.featured, projects);
  renderInfo(profile);
}

function showLoadError(error) {
  console.error(error);
  const message = document.createElement("p");
  message.className = "load-error";
  message.textContent = "No se pudo cargar el contenido (profile.json / projects.json). " +
    "Si abriste index.html con doble clic, usa un servidor local: python3 -m http.server.";
  document.getElementById("main").prepend(message);
}

// ===== Scroll suave (Lenis, sincronizado con GSAP) =====

function initSmoothScroll() {
  if (reduceMotion || typeof Lenis === "undefined") {
    return;
  }

  const hasGsap = typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined";
  lenis = new Lenis({ autoRaf: !hasGsap });

  if (hasGsap) {
    gsap.registerPlugin(ScrollTrigger);
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
}

function scrollToTarget(target) {
  if (lenis) {
    lenis.scrollTo(target);
  } else {
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  }
}

// ===== Menú overlay =====
// Mientras está abierto: se detiene el scroll, el resto de la página queda "inert"
// (no recibe foco ni clics) y Esc lo cierra devolviendo el foco al botón.

function initMenu() {
  const toggle = document.getElementById("menu-toggle");
  const overlay = document.getElementById("menu-overlay");
  const behindMenu = [document.getElementById("main"), document.querySelector(".site-footer")];

  function setOpen(open) {
    overlay.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.textContent = open ? "Cerrar" : "Menú";
    behindMenu.forEach(function (element) { element.inert = open; });

    if (lenis) {
      if (open) { lenis.stop(); } else { lenis.start(); }
    } else {
      document.body.style.overflow = open ? "hidden" : "";
    }

    if (open) {
      overlay.querySelector("a").focus();
    }
  }

  toggle.addEventListener("click", function () {
    setOpen(!overlay.classList.contains("is-open"));
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && overlay.classList.contains("is-open")) {
      setOpen(false);
      toggle.focus();
    }
  });

  // todos los links internos (menú, logo, "Más sobre mí") pasan por el mismo scroll
  document.querySelectorAll('a[href^="#"]:not(.skip-link)').forEach(function (link) {
    link.addEventListener("click", function (event) {
      const target = document.querySelector(link.getAttribute("href"));
      if (!target) {
        return;
      }
      event.preventDefault();
      if (overlay.classList.contains("is-open")) {
        setOpen(false);
      }
      scrollToTarget(target);
    });
  });
}

// ===== Animaciones de scroll (GSAP) =====

// glifos con los que "baraja" cada letra antes de quedar en su valor final
const SCRAMBLE_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789#/+*<>";

// títulos: cada letra sube y aparece, una tras otra
function splitReveal(element) {
  SplitText.create(element, {
    type: "chars,words",
    autoSplit: true,
    onSplit: function (split) {
      return gsap.from(split.chars, {
        yPercent: 60,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.015,
        scrollTrigger: { trigger: element, start: "top 88%", once: true },
      });
    },
  });
}

// hero: cada letra aparece en su turno y mientras tanto cambia de glifo hasta quedar en la letra real
function splitScramble(element) {
  SplitText.create(element, {
    type: "chars,words",
    autoSplit: true,
    onSplit: function (split) {
      // se fija el ancho real de cada letra para que el texto no "salte" cuando el glifo barajado es más ancho o angosto
      split.chars.forEach(function (char) {
        char.style.width = char.getBoundingClientRect().width + "px";
      });

      const timeline = gsap.timeline({
        scrollTrigger: { trigger: element, start: "top 88%", once: true },
      });

      split.chars.forEach(function (char, index) {
        const finalLetter = char.textContent;
        const startAt = index * 0.035;

        timeline.from(char, { opacity: 0, duration: 0.05 }, startAt);
        timeline.to(char, {
          duration: 0.7,
          scrambleText: { text: finalLetter, chars: SCRAMBLE_CHARS, speed: 0.6 },
        }, startAt);
      });

      return timeline;
    },
  });
}

// párrafo "lead": en vez de aparecer una sola vez, se enfoca y aclara en sincronía con el scroll (scrub, no "once")
function scrollBlurReveal(element) {
  gsap.fromTo(element, {
    opacity: 0.2,
    filter: "blur(10px)",
  }, {
    opacity: 1,
    filter: "blur(0px)",
    ease: "none",
    scrollTrigger: {
      trigger: element,
      start: "top 90%",
      end: "top 35%",
      scrub: true,
    },
  });
}

function initAnimations() {
  if (reduceMotion || typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // texto que entra letra por letra; con autoSplit se vuelve a dividir si cambia el ancho o cargan las fuentes
  // data-split="scramble" (el h1) además "descifra" cada letra con ScrambleText; los demás títulos solo suben y aparecen
  if (typeof SplitText !== "undefined") {
    gsap.registerPlugin(SplitText);
    const canScramble = typeof ScrambleTextPlugin !== "undefined";
    if (canScramble) {
      gsap.registerPlugin(ScrambleTextPlugin);
    }

    document.querySelectorAll("[data-split]").forEach(function (element) {
      if (canScramble && element.dataset.split === "scramble") {
        splitScramble(element);
      } else {
        splitReveal(element);
      }
    });
  }

  gsap.utils.toArray("[data-reveal]").forEach(function (element) {
    if (element.dataset.reveal === "blur") {
      scrollBlurReveal(element);
      return;
    }

    gsap.from(element, {
      y: 32,
      opacity: 0,
      duration: 0.9,
      ease: "power3.out",
      scrollTrigger: { trigger: element, start: "top 90%", once: true },
    });
  });

  // las tarjetas del grid aparecen por tandas, según las que entren a la vez en pantalla
  gsap.set(".project-card", { y: 40, autoAlpha: 0 });
  ScrollTrigger.batch(".project-card", {
    start: "top 92%",
    once: true,
    onEnter: function (cards) {
      gsap.to(cards, { y: 0, autoAlpha: 1, duration: 0.8, ease: "power3.out", stagger: 0.1 });
    },
  });
}

// Primero se carga y se pinta todo el contenido; recién después se inician el scroll suave, el menú y las
// animaciones, porque SplitText/ScrollTrigger necesitan que el texto y las tarjetas ya existan en el DOM.
async function init() {
  try {
    const content = await Promise.all([loadJson("profile.json"), loadJson("projects.json")]);
    renderProfile(content[0], content[1]);
    renderProjects(content[1]);
  } catch (error) {
    showLoadError(error);
    return;
  }

  initSmoothScroll();
  initMenu();
  initAnimations();
}

init();
