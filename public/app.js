// Palette for user avatars
const COLORS = [
  '#4f73ff','#e74c3c','#2ecc71','#f39c12',
  '#9b59b6','#1abc9c','#e67e22','#3498db',
  '#e91e63','#00bcd4'
];

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function avatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

function formatDate(iso) {
  const d = new Date(iso + (iso.endsWith('Z') ? '' : 'Z'));
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ---- Gallery ----
const gallery      = document.getElementById('gallery');
const galleryEmpty = document.getElementById('gallery-empty');
const galleryLoad  = document.getElementById('gallery-loading');
const photoCount   = document.getElementById('photo-count');

async function loadGallery() {
  galleryLoad.classList.remove('hidden');
  gallery.innerHTML = '';
  galleryEmpty.classList.add('hidden');

  try {
    const res = await fetch('/api/photos');
    const photos = await res.json();

    galleryLoad.classList.add('hidden');
    photoCount.textContent = photos.length === 0
      ? ''
      : `${photos.length} foto${photos.length !== 1 ? 's' : ''}`;

    if (photos.length === 0) {
      galleryEmpty.classList.remove('hidden');
      return;
    }

    gallery.innerHTML = photos.map(p => {
      const color  = avatarColor(p.uploader);
      const initials = p.uploader.slice(0, 2).toUpperCase();
      return `
        <div class="card" data-id="${p.id}">
          <div class="card-img-wrap" data-src="/uploads/${escapeHtml(p.filename)}" data-caption="${escapeHtml(p.caption || '')} &mdash; ${escapeHtml(p.uploader)}">
            <img src="/uploads/${escapeHtml(p.filename)}" alt="${escapeHtml(p.caption || 'foto')}" loading="lazy" />
          </div>
          <div class="card-info">
            <div class="card-uploader">
              <span class="avatar" style="background:${color}">${initials}</span>
              ${escapeHtml(p.uploader)}
            </div>
            ${p.caption ? `<p class="card-caption">${escapeHtml(p.caption)}</p>` : '<p class="card-caption"></p>'}
            <div class="card-footer">
              <time class="card-date">${formatDate(p.uploaded_at)}</time>
              <button class="btn-delete" data-id="${p.id}" title="Eliminar foto">&#128465;</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Lightbox clicks
    gallery.querySelectorAll('.card-img-wrap').forEach(wrap => {
      wrap.addEventListener('click', () => openLightbox(wrap.dataset.src, wrap.dataset.caption));
    });

    // Delete clicks
    gallery.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        deletePhoto(parseInt(btn.dataset.id, 10));
      });
    });

  } catch (err) {
    galleryLoad.classList.add('hidden');
    galleryEmpty.classList.remove('hidden');
    galleryEmpty.querySelector('p').textContent = 'Error al cargar las fotos. Recarga la pagina.';
  }
}

async function deletePhoto(id) {
  if (!confirm('Eliminar esta foto del album?')) return;
  try {
    await fetch(`/api/photos/${id}`, { method: 'DELETE' });
    loadGallery();
  } catch (err) {
    alert('No se pudo eliminar la foto.');
  }
}

// ---- Upload form ----
const form         = document.getElementById('upload-form');
const fileInput    = document.getElementById('photo');
const fileLabelTxt = document.getElementById('file-label-text');
const previewWrap  = document.getElementById('preview-wrap');
const previewImg   = document.getElementById('preview-img');
const clearFile    = document.getElementById('clear-file');
const submitBtn    = document.getElementById('submit-btn');
const submitText   = document.getElementById('submit-text');
const submitSpin   = document.getElementById('submit-spinner');
const uploadError  = document.getElementById('upload-error');

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (!file) return;
  fileLabelTxt.textContent = file.name;
  const reader = new FileReader();
  reader.onload = e => {
    previewImg.src = e.target.result;
    previewWrap.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
});

clearFile.addEventListener('click', () => {
  fileInput.value = '';
  previewWrap.classList.add('hidden');
  previewImg.src = '';
  fileLabelTxt.textContent = 'Elegir imagen (JPG, PNG, GIF, WEBP \u2014 max 10 MB)';
});

function showError(msg) {
  uploadError.textContent = msg;
  uploadError.classList.remove('hidden');
}
function clearError() {
  uploadError.classList.add('hidden');
  uploadError.textContent = '';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();

  const uploader = document.getElementById('uploader').value.trim();
  if (!uploader) { showError('Por favor ingresa tu nombre.'); return; }
  if (!fileInput.files[0]) { showError('Por favor selecciona una imagen.'); return; }

  submitBtn.disabled = true;
  submitText.textContent = 'Subiendo...';
  submitSpin.classList.remove('hidden');

  try {
    const data = new FormData(form);
    const res  = await fetch('/api/photos', { method: 'POST', body: data });
    const json = await res.json();

    if (!res.ok) {
      showError(json.error || 'Error al subir la foto.');
    } else {
      form.reset();
      previewWrap.classList.add('hidden');
      previewImg.src = '';
      fileLabelTxt.textContent = 'Elegir imagen (JPG, PNG, GIF, WEBP \u2014 max 10 MB)';
      loadGallery();
    }
  } catch (err) {
    showError('Error de red. Intenta de nuevo.');
  } finally {
    submitBtn.disabled = false;
    submitText.textContent = 'Subir foto';
    submitSpin.classList.add('hidden');
  }
});

// ---- Lightbox ----
const lightbox      = document.getElementById('lightbox');
const lightboxImg   = document.getElementById('lightbox-img');
const lightboxCap   = document.getElementById('lightbox-caption');
const lightboxClose = document.getElementById('lightbox-close');

function openLightbox(src, caption) {
  lightboxImg.src = src;
  lightboxCap.innerHTML = caption || '';
  lightbox.showModal();
}

lightboxClose.addEventListener('click', () => lightbox.close());
lightbox.addEventListener('click', (e) => { if (e.target === lightbox) lightbox.close(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') lightbox.close(); });

// ---- Init ----
loadGallery();
