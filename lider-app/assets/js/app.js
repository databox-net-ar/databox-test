/* ===== Constants ===== */
const OM = 'https://cdn.jsdelivr.net/npm/openmoji@15.0.0/color/svg/';
// Pexels CDN — fotos gratuitas (pexels.com)
function px(id) { return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=120&h=120&fit=crop`; }

/* ===== State ===== */
let pedidoMinimo = 0;
const state = {
  productos: [],
  cart: [],
  categoriaActual: 'todos',
  busqueda: '',
  loading: false,
};

/* ===== Theme ===== */
const tema = {
  init() {
    const saved = localStorage.getItem('tema') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    this.updateIcon(saved);
  },
  toggle() {
    const actual = document.documentElement.getAttribute('data-theme');
    const nuevo  = actual === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nuevo);
    localStorage.setItem('tema', nuevo);
    this.updateIcon(nuevo);
  },
  updateIcon(t) {
    const btn = document.getElementById('btnTema');
    if (btn) btn.innerHTML = t === 'dark'
      ? `<img src="${OM}2600.svg" alt="día" width="22" height="22">`
      : `<img src="${OM}1F319.svg" alt="noche" width="22" height="22">`;
  },
};

/* ===== API ===== */
async function fetchProductos(cat = 'todos', q = '') {
  state.loading = true;
  renderProducts([]);

  const params = new URLSearchParams({ categoria: cat, q });
  const res  = await fetch(`api/productos.php?${params}`);
  const data = await res.json();

  state.productos = data.data || [];
  state.loading   = false;
  renderProducts(state.productos);
}

async function enviarPedido(datos) {
  const res  = await fetch('api/pedidos.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    console.error('Respuesta no JSON de pedidos.php:', text);
    return { ok: false, error: text };
  }
}

/* ===== Cart ===== */
const cart = {
  add(producto) {
    const idx = state.cart.findIndex(i => i.id === producto.id);
    if (idx >= 0) {
      state.cart[idx].cantidad++;
    } else {
      state.cart.push({ ...producto, cantidad: 1 });
    }
    this.save(); this.updateUI();
    showToast(`${producto.nombre} agregado`);
  },
  remove(id) {
    const idx = state.cart.findIndex(i => i.id === id);
    if (idx < 0) return;
    if (state.cart[idx].cantidad > 1) {
      state.cart[idx].cantidad--;
    } else {
      state.cart.splice(idx, 1);
    }
    this.save(); this.updateUI();
  },
  qty(id) {
    return state.cart.find(i => i.id === id)?.cantidad || 0;
  },
  total() {
    return state.cart.reduce((s, i) => s + i.precio * i.cantidad, 0);
  },
  count() {
    return state.cart.reduce((s, i) => s + i.cantidad, 0);
  },
  clear() {
    state.cart = [];
    this.save(); this.updateUI();
  },
  save() {
    localStorage.setItem('cart', JSON.stringify(state.cart));
  },
  load() {
    try { state.cart = JSON.parse(localStorage.getItem('cart')) || []; }
    catch { state.cart = []; }
  },
  updateUI() {
    // Badge
    const c = this.count();
    const badge = document.getElementById('cartBadge');
    if (badge) {
      badge.textContent = c;
      badge.classList.toggle('visible', c > 0);
    }
    // Drawer items
    renderCartItems();
    // Products (qty buttons)
    renderProducts(state.productos);
  },
};

/* ===== Render productos ===== */
function renderProducts(lista) {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  if (state.loading) {
    grid.innerHTML = `<div class="spinner"><div class="spin"></div></div>`;
    return;
  }
  if (!lista.length) {
    grid.innerHTML = `<div class="empty"><div class="empty-icon"><img src="${OM}1F50D.svg" alt="sin resultados" width="56" height="56"></div><p>No hay productos para esta búsqueda</p></div>`;
    return;
  }

  // Update section subtitle
  const sub = document.getElementById('productCount');
  if (sub) sub.textContent = `${lista.length} producto${lista.length !== 1 ? 's' : ''}`;

  grid.innerHTML = lista.map(p => {
    const qty = cart.qty(p.id);
    const controles = qty > 0
      ? `<div class="card-qty-wrap">
           <button class="btn-minus" onclick="cart.remove(${p.id});event.stopPropagation()">−</button>
           <span class="qty-label">${qty}</span>
           <button class="btn-add" onclick="cart.add(${JSON.stringify(p).replace(/"/g,'&quot;')});event.stopPropagation()">+</button>
         </div>`
      : `<button class="btn-add" onclick="cart.add(${JSON.stringify(p).replace(/"/g,'&quot;')});event.stopPropagation()">+</button>`;

    return `
      <div class="card ${!p.stock ? 'sin-stock' : ''}" onclick="cart.add(${JSON.stringify(p).replace(/"/g,'&quot;')})">
        ${!p.stock ? '<span class="stock-tag">Sin stock</span>' : ''}
        <div class="card-thumb"><img src="${p.imagen}" alt="${p.nombre}" loading="lazy" width="72" height="72"></div>
        <div class="card-body">
          <div class="card-name">${p.nombre}</div>
          <div class="card-unit">por ${p.unidad}</div>
          <div class="card-footer">
            <div class="card-price">$${p.precio.toLocaleString('es-AR')} <span>/ ${p.unidad}</span></div>
            ${controles}
          </div>
        </div>
      </div>`;
  }).join('');
}

/* ===== Render cart drawer ===== */
function renderCartItems() {
  const el = document.getElementById('cartItemsList');
  const footer = document.getElementById('cartFooter');
  if (!el) return;

  if (!state.cart.length) {
    el.innerHTML = `<div class="cart-empty"><span class="empty-icon"><img src="${OM}1F6D2.svg" alt="carrito" width="48" height="48"></span><p>Tu carrito está vacío</p></div>`;
    if (footer) footer.style.display = 'none';
    return;
  }

  if (footer) footer.style.display = '';
  el.innerHTML = state.cart.map(item => `
    <div class="cart-item">
      <img class="ci-img" src="${item.imagen}" alt="${item.nombre}" loading="lazy" width="36" height="36">
      <div class="ci-info">
        <div class="ci-name">${item.nombre}</div>
        <div class="ci-price">$${item.precio.toLocaleString('es-AR')} c/u</div>
      </div>
      <div class="ci-controls">
        <button class="ci-btn" onclick="cart.remove(${item.id})">−</button>
        <span class="ci-qty">${item.cantidad}</span>
        <button class="ci-btn" onclick="cart.add(${JSON.stringify(item).replace(/"/g,'&quot;')})">+</button>
      </div>
      <span class="ci-subtotal">$${(item.precio * item.cantidad).toLocaleString('es-AR')}</span>
    </div>`).join('');

  const totalEl = document.getElementById('cartTotal');
  if (totalEl) totalEl.textContent = cart.total().toLocaleString('es-AR');
}

/* ===== Drawer ===== */
function openCart() {
  document.getElementById('overlay').classList.add('open');
  document.getElementById('cartDrawer').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeCart() {
  document.getElementById('overlay').classList.remove('open');
  document.getElementById('cartDrawer').classList.remove('open');
  document.body.style.overflow = '';
}

/* ===== Checkout Modal ===== */
function openCheckout() {
  if (!state.cart.length) return;
  if (pedidoMinimo > 0 && cart.total() < pedidoMinimo) {
    showToast('El pedido mínimo es $' + pedidoMinimo.toLocaleString('es-AR'));
    return;
  }
  closeCart();
  renderSummary();
  document.getElementById('checkoutModal').classList.add('open');
  document.getElementById('confirmScreen').classList.remove('show');
  document.getElementById('checkoutForm').style.display = '';
  document.body.style.overflow = 'hidden';
}
function closeCheckout() {
  document.getElementById('checkoutModal').classList.remove('open');
  document.body.style.overflow = '';
}

function renderSummary() {
  const el = document.getElementById('orderSummaryLines');
  if (!el) return;
  el.innerHTML = state.cart.map(i =>
    `<div class="summary-line">
       <span><img src="${i.imagen}" alt="${i.nombre}" width="18" height="18" style="vertical-align:middle;margin-right:4px"> ${i.nombre} ×${i.cantidad}</span>
       <span>$${(i.precio * i.cantidad).toLocaleString('es-AR')}</span>
     </div>`).join('');
  const totalEl = document.getElementById('summaryTotal');
  if (totalEl) totalEl.textContent = cart.total().toLocaleString('es-AR');
}

async function handleCheckout(e) {
  e.preventDefault();
  const btn = document.getElementById('btnConfirmar');
  btn.disabled = true;

  // Paso 1: Mostrar aviso de ubicación y solicitar permiso
  btn.textContent = 'Obteniendo ubicación...';
  const geoOverlay = document.getElementById('geoOverlay');
  let coords = { lat: null, lng: null };

  try {
    coords = await new Promise(function(resolve, reject) {
      // Mostrar aviso informativo
      geoOverlay.classList.add('show');
      var btnPermit = document.getElementById('geoPermitir');
      var btnSkip   = document.getElementById('geoOmitir');

      function cleanup() {
        geoOverlay.classList.remove('show');
        btnPermit.onclick = null;
        btnSkip.onclick = null;
      }

      btnSkip.onclick = function() {
        cleanup();
        resolve({ lat: null, lng: null });
      };

      btnPermit.onclick = function() {
        cleanup();
        if (!navigator.geolocation) {
          resolve({ lat: null, lng: null });
          return;
        }
        navigator.geolocation.getCurrentPosition(
          function(pos) {
            resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          },
          function() {
            resolve({ lat: null, lng: null });
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
      };
    });
  } catch (err) {
    // Si falla, continuamos sin coordenadas
  }

  // Paso 2: Enviar pedido con coordenadas
  btn.textContent = 'Enviando...';

  const datos = {
    cliente:   document.getElementById('fCliente').value.trim(),
    telefono:  document.getElementById('fTelefono').value.trim(),
    direccion: document.getElementById('fDireccion').value.trim(),
    notas:     document.getElementById('fNotas').value.trim(),
    items:     state.cart,
    lat:       coords.lat,
    lng:       coords.lng,
  };

  try {
    const res = await enviarPedido(datos);
    if (res.ok) {
      document.getElementById('checkoutForm').style.display = 'none';
      document.getElementById('confirmNum').textContent = res.pedido.numero;
      document.getElementById('confirmScreen').classList.add('show');
      cart.clear();
    } else {
      console.error('Error pedido:', res);
      showToast(res.error || 'Error al enviar el pedido. Intentá de nuevo.');
    }
  } catch (err) {
    console.error('Excepción pedido:', err);
    showToast('Sin conexión. Verificá tu internet.');
  }

  btn.disabled = false;
  btn.textContent = 'Confirmar pedido';
}

/* ===== Categories ===== */
let categorias = [
  { id: 'todos', label: 'Todos', emoji: '🛒', imagen: px(256318) },
];

async function cargarCategorias() {
  try {
    const res = await fetch('api/categorias.php');
    const data = await res.json();
    if (data.ok && data.data.length) {
      categorias = [
        { id: 'todos', label: 'Todos', emoji: '🛒', imagen: px(256318) },
        ...data.data
      ];
    }
  } catch (e) { console.error('Error cargando categorías', e); }
}

function renderCats() {
  const wrap = document.getElementById('catsContainer');
  if (!wrap) return;
  wrap.innerHTML = categorias.map(c => `
    <button class="cat-btn ${state.categoriaActual === c.id ? 'active' : ''}"
            onclick="selectCat('${c.id}')">
      <span class="cat-emoji">${c.emoji}</span>${c.label}
    </button>`).join('');
}

function selectCat(id) {
  state.categoriaActual = id;
  renderCats();
  fetchProductos(id, state.busqueda);
}

/* ===== Search ===== */
let searchTimer;
function onSearch(val) {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.busqueda = val;
    fetchProductos(state.categoriaActual, val);
  }, 300);
}

/* ===== Toast ===== */
let toastTimer;
function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ===== Init ===== */
document.addEventListener('DOMContentLoaded', async () => {
  tema.init();
  cart.load();
  // Cargar config
  try {
    const cfgRes = await fetch('api/configuracion.php');
    const cfgData = await cfgRes.json();
    if (cfgData.ok && cfgData.data) {
      pedidoMinimo = parseInt(cfgData.data.pedido_minimo) || 0;
    }
  } catch (e) { /* silencioso */ }
  await cargarCategorias();
  renderCats();
  fetchProductos();
  cart.updateUI();

  // Search
  const inp = document.getElementById('searchInput');
  if (inp) inp.addEventListener('input', e => onSearch(e.target.value));

  // Swipe to close drawer
  let startY = 0;
  const drawer = document.getElementById('cartDrawer');
  if (drawer) {
    drawer.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, { passive: true });
    drawer.addEventListener('touchend', e => {
      if (e.changedTouches[0].clientY - startY > 80) closeCart();
    }, { passive: true });
  }
});
