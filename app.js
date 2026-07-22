import { Analytics } from "@vercel/analytics/next"

// ---------- hero typing effect ----------
const heading = document.querySelector('.hero h1');
const cursor = heading?.querySelector('.cursor');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (heading && cursor && !reduceMotion) {
  const full = "Hey, I'm Giorgi";
  heading.firstChild.textContent = '';
  let i = 0;
  const type = () => {
    if (i <= full.length) {
      heading.firstChild.textContent = full.slice(0, i);
      i++;
      setTimeout(type, 70);
    }
  };
  setTimeout(type, 250);
}

// ---------- click-to-enlarge (lightbox) ----------
const lightbox = document.createElement('div');
lightbox.className = 'lightbox';
lightbox.setAttribute('role', 'dialog');
lightbox.setAttribute('aria-modal', 'true');
const lightboxImg = document.createElement('img');
lightbox.appendChild(lightboxImg);
document.body.appendChild(lightbox);

function openLightbox(src, alt) {
  lightboxImg.src = src;
  lightboxImg.alt = alt || '';
  lightbox.classList.add('is-open');
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  lightbox.classList.remove('is-open');
  document.body.style.overflow = '';
}

document.querySelectorAll('.gallery img, .item__thumb img').forEach((img) => {
  img.addEventListener('click', () => openLightbox(img.currentSrc || img.src, img.alt));
});
lightbox.addEventListener('click', closeLightbox);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeLightbox();
});
