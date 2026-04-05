/* ===== Config ===== */
const API = 'api/productos.php';
const UPLOAD_API = 'api/upload.php';
const CAT_API = 'api/categorias.php';
const PED_API = 'api/pedidos.php';
const CFG_API = 'api/configuracion.php';
const CLI_API = 'api/clientes.php';

let CATEGORIAS = [];

const UNIDADES = ['kg', 'u', 'lt', 'g', 'docena', 'pack'];

/* ===== State ===== */
let productos = [];
let filtroCategoria = 'todos';
let filtroBusqueda  = '';
let editandoId      = null;
let confirmCallback = null;

/* ===== API calls ===== */
async function cargarCategorias() {
  try {
    const res = await fetch(CAT_API + '?todas=1');
    const data = await res.json();
    if (data.ok) CATEGORIAS = data.data;
  } catch (e) { console.error('Error cargando categorías', e); }
}
async function apiGet(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${API}${qs ? '?' + qs : ''}`);
  return res.json();
}
async function apiPost(body) {
  const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return res.json();
}
async function apiPut(body) {
  const res = await fetch(API, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return res.json();
}
async function apiDelete(id) {
  const res = await fetch(`${API}?id=${id}`, { method: 'DELETE' });
  return res.json();
}

/* ===== Load ===== */
async function cargarProductos() {
  showTableLoading();
  const data = await apiGet({ categoria: filtroCategoria, q: filtroBusqueda });
  productos = data.data || [];
  renderTabla();
  renderStats();
}

/* ===== Stats ===== */
async function renderStats() {
  const all = await apiGet({});
  const lista = all.data || [];
  const total   = lista.length;
  const conStock = lista.filter(p => p.stock).length;
  const sinStock = lista.filter(p => !p.stock).length;
  document.getElementById('statTotal').textContent   = total;
  document.getElementById('statStock').textContent   = conStock;
  document.getElementById('statSinStock').textContent = sinStock;
}

/* ===== Table ===== */
function showTableLoading() {
  document.getElementById('tbody').innerHTML = `<tr class="spinner-row"><td colspan="8"><div class="spin"></div></td></tr>`;
}

function renderTabla() {
  const tbody = document.getElementById('tbody');
  if (!productos.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="table-empty">Sin productos para los filtros aplicados</td></tr>`;
    return;
  }
  tbody.innerHTML = productos.map(p => `
    <tr data-id="${p.id}">
      <td class="td-id">#${p.id}</td>
      <td><img class="td-img" src="${p.imagen || ''}" alt="${p.nombre}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2244%22 height=%2244%22><rect width=%2244%22 height=%2244%22 fill=%22%23e2e8f0%22/><text x=%2250%25%22 y=%2254%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%2220%22>${p.emoji || '📦'}</text></svg>'"></td>
      <td class="td-nombre">${esc(p.nombre)}</td>
      <td><span class="badge badge-cat">${esc(p.categoria)}</span></td>
      <td>$${Number(p.precio).toLocaleString('es-AR')}</td>
      <td>${esc(p.unidad)}</td>
      <td>${p.stock
        ? '<span class="badge badge-stock">Con stock</span>'
        : '<span class="badge badge-nostock">Sin stock</span>'
      }</td>
      <td>
        <div class="actions">
          <button class="btn-icon-sm" title="Editar" onclick="abrirEditar(${p.id})">✏️</button>
          <button class="btn-icon-sm" title="Eliminar" onclick="confirmarEliminar(${p.id}, '${esc(p.nombre)}')">🗑️</button>
        </div>
      </td>
    </tr>`).join('');
}

function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

/* ===== Modal: poblar selects ===== */
function poblarSelects() {
  const selCat = document.getElementById('fCategoria');
  selCat.innerHTML = CATEGORIAS.map(c => `<option value="${c.id}">${c.emoji} ${c.label}</option>`).join('');

  const selUn = document.getElementById('fUnidad');
  selUn.innerHTML = UNIDADES.map(u => `<option value="${u}">${u}</option>`).join('');

  // filtro categoría
  const selFil = document.getElementById('filterCat');
  selFil.innerHTML = `<option value="todos">Todas las categorías</option>` +
    CATEGORIAS.map(c => `<option value="${c.id}">${c.emoji} ${c.label}</option>`).join('');
}

/* ===== Modal: abrir / cerrar ===== */
function abrirNuevo() {
  editandoId = null;
  document.getElementById('modalTitle').textContent = 'Nuevo producto';
  limpiarForm();
  document.getElementById('modalBackdrop').classList.add('open');
}

function abrirEditar(id) {
  const p = productos.find(x => x.id === id);
  if (!p) return;
  editandoId = id;
  document.getElementById('modalTitle').textContent = 'Editar producto';
  document.getElementById('fNombre').value    = p.nombre;
  document.getElementById('fPrecio').value    = p.precio;
  document.getElementById('fCategoria').value = p.categoria;
  document.getElementById('fEmoji').value     = p.emoji || '';
  document.getElementById('fImagen').value    = p.imagen || '';
  document.getElementById('fUnidad').value    = p.unidad;
  document.getElementById('fPesoPieza').value  = p.peso_pieza || '';
  document.getElementById('fStock').checked   = p.stock;
  togglePesoPieza();
  actualizarPreview();
  document.getElementById('modalBackdrop').classList.add('open');
}

function cerrarModal() {
  document.getElementById('modalBackdrop').classList.remove('open');
}

function limpiarForm() {
  ['fNombre','fPrecio','fEmoji','fImagen','fPesoPieza'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('fCategoria').value = 'frutas';
  document.getElementById('fUnidad').value    = 'kg';
  document.getElementById('fStock').checked   = true;
  document.getElementById('fArchivo').value   = '';
  togglePesoPieza();
  actualizarPreview();
}

function togglePesoPieza() {
  const unidad = document.getElementById('fUnidad').value;
  document.getElementById('grupoPesoPieza').style.display = unidad === 'kg' ? '' : 'none';
}

/* ===== Preview imagen ===== */
function actualizarPreview() {
  const url = document.getElementById('fImagen').value.trim();
  const img = document.getElementById('imgPreview');
  const preview = document.getElementById('uploadPreview');
  const controls = document.getElementById('uploadControls');
  if (url) {
    img.src = url;
    img.onload = () => {
      preview.classList.add('visible');
      controls.classList.add('has-image');
    };
    img.onerror = () => {
      preview.classList.remove('visible');
      controls.classList.remove('has-image');
    };
  } else {
    preview.classList.remove('visible');
    controls.classList.remove('has-image');
  }
}

/* ===== Upload imagen ===== */
async function subirImagen(file) {
  if (!file) return;

  // Validar tipo
  const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!tiposPermitidos.includes(file.type)) {
    showToast('Solo se permiten imágenes JPG, PNG, WEBP o GIF', true);
    return;
  }

  // Validar tamaño (5MB)
  if (file.size > 5 * 1024 * 1024) {
    showToast('La imagen no puede superar los 5MB', true);
    return;
  }

  const loading = document.getElementById('uploadLoading');
  const controls = document.getElementById('uploadControls');
  controls.style.display = 'none';
  loading.style.display = 'flex';

  try {
    const formData = new FormData();
    formData.append('imagen', file);

    const res = await fetch(UPLOAD_API, { method: 'POST', body: formData });
    const data = await res.json();

    if (data.ok) {
      document.getElementById('fImagen').value = data.url;
      actualizarPreview();
      showToast('Imagen subida correctamente');
    } else {
      showToast(data.error || 'Error al subir imagen', true);
    }
  } catch (e) {
    showToast('Error de conexión al subir imagen', true);
  } finally {
    loading.style.display = 'none';
    controls.style.display = '';
  }

  // Resetear input file para permitir subir el mismo archivo de nuevo
  document.getElementById('fArchivo').value = '';
}

function removerImagen() {
  document.getElementById('fImagen').value = '';
  document.getElementById('fArchivo').value = '';
  actualizarPreview();
}

/* ===== Drag & Drop ===== */
function initDragDrop() {
  const dropzone = document.getElementById('dropzone');
  if (!dropzone) return;

  ['dragenter', 'dragover'].forEach(ev => {
    dropzone.addEventListener(ev, e => { e.preventDefault(); dropzone.classList.add('dragover'); });
  });
  ['dragleave', 'drop'].forEach(ev => {
    dropzone.addEventListener(ev, e => { e.preventDefault(); dropzone.classList.remove('dragover'); });
  });
  dropzone.addEventListener('drop', e => {
    const files = e.dataTransfer.files;
    if (files.length > 0) subirImagen(files[0]);
  });
}

/* ===== Guardar ===== */
async function guardarProducto() {
  const nombre    = document.getElementById('fNombre').value.trim();
  const precio    = parseFloat(document.getElementById('fPrecio').value);
  const categoria = document.getElementById('fCategoria').value;
  const emoji     = document.getElementById('fEmoji').value.trim();
  const imagen    = document.getElementById('fImagen').value.trim();
  const unidad    = document.getElementById('fUnidad').value;
  const stock     = document.getElementById('fStock').checked;
  const peso_pieza = unidad === 'kg' ? (document.getElementById('fPesoPieza').value || null) : null;

  if (!nombre) { showToast('El nombre es obligatorio', true); return; }
  if (isNaN(precio) || precio < 0) { showToast('Precio inválido', true); return; }

  const body = { nombre, precio, categoria, emoji, imagen, unidad, stock, peso_pieza };
  let res;
  if (editandoId) {
    body.id = editandoId;
    res = await apiPut(body);
  } else {
    res = await apiPost(body);
  }

  if (res.ok) {
    cerrarModal();
    showToast(editandoId ? 'Producto actualizado' : 'Producto creado');
    await cargarProductos();
  } else {
    showToast(res.error || 'Error al guardar', true);
  }
}

/* ===== Eliminar ===== */
function confirmarEliminar(id, nombre) {
  document.getElementById('confirmMsg').textContent = `¿Eliminás "${nombre}"? Esta acción no se puede deshacer.`;
  confirmCallback = async () => {
    const res = await apiDelete(id);
    if (res.ok) {
      showToast('Producto eliminado');
      await cargarProductos();
    } else {
      showToast(res.error || 'Error al eliminar', true);
    }
  };
  document.getElementById('confirmBackdrop').classList.add('open');
}

function cerrarConfirm(ejecutar) {
  document.getElementById('confirmBackdrop').classList.remove('open');
  if (ejecutar && confirmCallback) confirmCallback();
  confirmCallback = null;
}

/* ===== Filtros ===== */
let searchTimer;
function onSearch(val) {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { filtroBusqueda = val; cargarProductos(); }, 300);
}

function onFiltroCategoria(val) {
  filtroCategoria = val;
  cargarProductos();
}

/* ===== Toast ===== */
let toastTimer;
function showToast(msg, error = false) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show' + (error ? ' error' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2500);
}

/* ===== Navegación de secciones ===== */
function cambiarSeccion(seccion, navEl) {
  // Actualizar sidebar
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (navEl) navEl.classList.add('active');

  // Mostrar/ocultar secciones
  document.querySelectorAll('.section').forEach(s => s.style.display = 'none');

  const topbar = document.querySelector('.topbar-title');

  if (seccion === 'productos') {
    document.getElementById('seccionProductos').style.display = '';
    topbar.textContent = 'Gestión de Productos';
  } else if (seccion === 'categorias') {
    document.getElementById('seccionCategorias').style.display = '';
    topbar.textContent = 'Gestión de Categorías';
    renderCatGrid();
  } else if (seccion === 'pedidos') {
    document.getElementById('seccionPedidos').style.display = '';
    topbar.textContent = 'Gestión de Pedidos';
    cargarPedidos();
  } else if (seccion === 'config') {
    document.getElementById('seccionConfig').style.display = '';
    topbar.textContent = 'Configuración';
    cargarConfiguracion();
  } else if (seccion === 'clientes') {
    document.getElementById('seccionClientes').style.display = '';
    topbar.textContent = 'Gestión de Clientes';
    cargarClientes();
  }
}

/* ===== Categorías: Grid ===== */
function renderCatGrid() {
  const grid = document.getElementById('catGrid');
  if (!CATEGORIAS.length) {
    grid.innerHTML = '<div class="table-empty">No hay categorías cargadas</div>';
    return;
  }
  grid.innerHTML = CATEGORIAS.map(c => `
    <div class="cat-card ${c.activa === false ? 'cat-inactiva' : ''}">
      <div class="cat-card-emoji">${esc(c.emoji)}</div>
      <div class="cat-card-info">
        <div class="cat-card-label">${esc(c.label)}</div>
        <div class="cat-card-id">${esc(c.id)}</div>
      </div>
      <div class="cat-card-orden">#${c.orden}</div>
      <div class="cat-card-actions">
        <button class="btn-icon-sm" title="Editar" onclick="catModal.editar('${esc(c.id)}')">✏️</button>
        <button class="btn-icon-sm" title="Eliminar" onclick="catModal.eliminar('${esc(c.id)}', '${esc(c.label)}')">🗑️</button>
      </div>
    </div>`).join('');
}

/* ===== Categorías: Modal CRUD ===== */
const catModal = {
  editandoId: null,

  abrir() {
    this.editandoId = null;
    document.getElementById('catModalTitle').textContent = 'Nueva categoría';
    document.getElementById('catId').value = '';
    document.getElementById('catId').disabled = false;
    document.getElementById('catLabel').value = '';
    document.getElementById('catEmoji').value = '';
    document.getElementById('catActiva').checked = true;
    document.getElementById('catOrden').value = CATEGORIAS.length + 1;
    document.getElementById('catModalBackdrop').classList.add('open');
  },

  editar(id) {
    const cat = CATEGORIAS.find(c => c.id === id);
    if (!cat) return;
    this.editandoId = id;
    document.getElementById('catModalTitle').textContent = 'Editar categoría';
    document.getElementById('catId').value = cat.id;
    document.getElementById('catId').disabled = true;
    document.getElementById('catLabel').value = cat.label;
    document.getElementById('catEmoji').value = cat.emoji;
    document.getElementById('catActiva').checked = cat.activa !== false;
    document.getElementById('catOrden').value = cat.orden || 0;
    document.getElementById('catModalBackdrop').classList.add('open');
  },

  cerrar() {
    document.getElementById('catModalBackdrop').classList.remove('open');
  },

  async guardar() {
    const id     = document.getElementById('catId').value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const label  = document.getElementById('catLabel').value.trim();
    const emoji  = document.getElementById('catEmoji').value.trim();
    const activa = document.getElementById('catActiva').checked;
    const orden  = parseInt(document.getElementById('catOrden').value) || 0;

    if (!id)    { showToast('El ID es obligatorio', true); return; }
    if (!label) { showToast('El nombre es obligatorio', true); return; }
    if (!emoji) { showToast('El emoji es obligatorio', true); return; }

    const body = { id, label, emoji, activa, orden };
    let res;

    try {
      if (this.editandoId) {
        res = await fetch(CAT_API, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      } else {
        res = await fetch(CAT_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      }
      const data = await res.json();

      if (data.ok) {
        this.cerrar();
        showToast(this.editandoId ? 'Categoría actualizada' : 'Categoría creada');
        await cargarCategorias();
        poblarSelects();
        renderCatGrid();
      } else {
        showToast(data.error || 'Error al guardar', true);
      }
    } catch (e) {
      showToast('Error de conexión', true);
    }
  },

  eliminar(id, label) {
    document.getElementById('confirmMsg').textContent = `¿Eliminás la categoría "${label}"? Solo se puede eliminar si no tiene productos asociados.`;
    confirmCallback = async () => {
      try {
        const res = await fetch(`${CAT_API}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.ok) {
          showToast('Categoría eliminada');
          await cargarCategorias();
          poblarSelects();
          renderCatGrid();
        } else {
          showToast(data.error || 'Error al eliminar', true);
        }
      } catch (e) {
        showToast('Error de conexión', true);
      }
    };
    document.getElementById('confirmBackdrop').classList.add('open');
  },
};

/* ===== Pedidos ===== */
const ESTADOS = {
  recibido:   { label: 'Recibido',   emoji: '📥', color: '#3b82f6' },
  preparando: { label: 'Preparando', emoji: '🔧', color: '#f59e0b' },
  listo:      { label: 'Listo',      emoji: '✅', color: '#22c55e' },
  entregado:  { label: 'Entregado',  emoji: '🚚', color: '#16a34a' },
  cancelado:  { label: 'Cancelado',  emoji: '❌', color: '#ef4444' },
};

let pedidos = [];
let filtroEstado = 'todos';
let filtroBusqPedido = '';
let pedidoActual = null;
let pedSearchTimer;

function onSearchPedido(val) {
  clearTimeout(pedSearchTimer);
  pedSearchTimer = setTimeout(function() { filtroBusqPedido = val; cargarPedidos(); }, 300);
}
function onFiltroEstado(val) {
  filtroEstado = val;
  cargarPedidos();
}

async function cargarPedidos() {
  var params = [];
  if (filtroEstado && filtroEstado !== 'todos') params.push('estado=' + encodeURIComponent(filtroEstado));
  if (filtroBusqPedido) params.push('q=' + encodeURIComponent(filtroBusqPedido));
  var qs = params.length ? '?' + params.join('&') : '';

  try {
    var res = await fetch(PED_API + qs);
    var data = await res.json();
    if (data.ok) {
      pedidos = data.data || [];
      renderPedStats(data.stats || {});
      renderPedidos();
    } else {
      showToast(data.error || 'Error al cargar pedidos', true);
    }
  } catch (e) {
    showToast('Error de conexión al cargar pedidos', true);
  }
}

function renderPedStats(stats) {
  var total = 0, monto = 0;
  for (var key in stats) {
    total += stats[key].cant;
    monto += stats[key].monto;
  }
  document.getElementById('pedStatTotal').textContent = total;
  document.getElementById('pedStatRecibido').textContent = (stats.recibido ? stats.recibido.cant : 0);
  document.getElementById('pedStatPreparando').textContent = (stats.preparando ? stats.preparando.cant : 0);
  document.getElementById('pedStatEntregado').textContent = (stats.entregado ? stats.entregado.cant : 0);
  document.getElementById('pedStatMonto').textContent = '$' + monto.toLocaleString('es-AR');
}

function renderPedidos() {
  var lista = document.getElementById('pedidosLista');
  if (!pedidos.length) {
    lista.innerHTML = '<div class="table-empty">No hay pedidos para los filtros aplicados</div>';
    return;
  }
  lista.innerHTML = pedidos.map(function(p) {
    var est = ESTADOS[p.estado] || ESTADOS.recibido;
    var itemCount = 0;
    for (var i = 0; i < (p.items || []).length; i++) {
      itemCount += (p.items[i].cantidad || 1);
    }
    var fecha = p.fecha ? new Date(p.fecha).toLocaleString('es-AR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }) : '';
    return '<div class="ped-card" onclick="abrirPedido(' + p.id + ')">' +
      '<div class="ped-card-head">' +
        '<span class="ped-card-num">' + esc(p.numero) + '</span>' +
        '<span class="ped-card-badge" style="background:' + est.color + '15;color:' + est.color + '">' + est.emoji + ' ' + est.label + '</span>' +
      '</div>' +
      '<div class="ped-card-body">' +
        '<div class="ped-card-cliente">' + esc(p.cliente) + '</div>' +
        '<div class="ped-card-meta">' +
          '<span>📞 ' + esc(p.telefono || '—') + '</span>' +
          '<span>🏠 ' + esc(p.direccion ? (p.direccion.length > 30 ? p.direccion.substring(0, 30) + '...' : p.direccion) : '—') + '</span>' +
          '<span>📍 ' + parseFloat(p.distancia_km || 0).toFixed(1) + ' km • ' + parseInt(p.tiempo_min || 0) + ' min' + (cfgPrecioKm > 0 ? ' • $' + (parseFloat(p.distancia_km || 0) * cfgPrecioKm).toLocaleString('es-AR', {minimumFractionDigits:0, maximumFractionDigits:0}) : '') + '</span>' +
        '</div>' +
        '<div class="ped-card-footer">' +
          '<span class="ped-card-items">' + itemCount + ' producto' + (itemCount !== 1 ? 's' : '') + '</span>' +
          '<span class="ped-card-total">$' + Number(p.total).toLocaleString('es-AR') + '</span>' +
          '<span class="ped-card-fecha">' + fecha + '</span>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

function abrirPedido(id) {
  pedidoActual = null;
  for (var i = 0; i < pedidos.length; i++) {
    if (pedidos[i].id === id || pedidos[i].id == id) { pedidoActual = pedidos[i]; break; }
  }
  if (!pedidoActual) return;

  var est = ESTADOS[pedidoActual.estado] || ESTADOS.recibido;
  document.getElementById('pedModalTitle').textContent = pedidoActual.numero;
  document.getElementById('pedModalFecha').textContent = pedidoActual.fecha ? new Date(pedidoActual.fecha).toLocaleString('es-AR') : '';

  document.getElementById('pedDetCliente').textContent = pedidoActual.cliente;
  document.getElementById('pedDetTelefono').textContent = '📞 ' + (pedidoActual.telefono || '—');
  document.getElementById('pedDetDireccion').textContent = '🏠 ' + (pedidoActual.direccion || '—');

  var ubiEl = document.getElementById('pedDetUbicacion');
  if (pedidoActual.lat && pedidoActual.lng) {
    var mapUrl = 'https://www.google.com/maps?q=' + pedidoActual.lat + ',' + pedidoActual.lng;
    document.getElementById('pedDetMapLink').href = mapUrl;
    var distKm = parseFloat(pedidoActual.distancia_km || 0);
    var costoEnvio = cfgPrecioKm > 0 ? ' • $' + (distKm * cfgPrecioKm).toLocaleString('es-AR', {minimumFractionDigits:0, maximumFractionDigits:0}) : '';
    document.getElementById('pedDetMapLink').textContent = '📍 ' + distKm.toFixed(1) + ' km • ' + parseInt(pedidoActual.tiempo_min || 0) + ' min' + costoEnvio + ' — Ver en mapa';
    ubiEl.style.display = '';
  } else {
    ubiEl.style.display = 'none';
  }

  var notasEl = document.getElementById('pedDetNotas');
  if (pedidoActual.notas) {
    notasEl.textContent = '📝 ' + pedidoActual.notas;
    notasEl.style.display = '';
  } else {
    notasEl.style.display = 'none';
  }

  // Items
  var itemsHtml = '';
  var items = pedidoActual.items || [];
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var subtotal = (it.precio * (it.cantidad || 1));
    itemsHtml += '<div class="ped-item-row">' +
      '<span class="ped-item-name">' + esc(it.nombre) + ' ×' + (it.cantidad || 1) + '</span>' +
      '<span class="ped-item-price">$' + Number(subtotal).toLocaleString('es-AR') + '</span>' +
    '</div>';
  }
  document.getElementById('pedDetItems').innerHTML = itemsHtml;
  document.getElementById('pedDetTotal').textContent = '$' + Number(pedidoActual.total).toLocaleString('es-AR');

  // Estado buttons
  var btnsHtml = '';
  var keys = ['recibido', 'preparando', 'listo', 'entregado', 'cancelado'];
  for (var k = 0; k < keys.length; k++) {
    var key = keys[k];
    var e = ESTADOS[key];
    var active = pedidoActual.estado === key;
    btnsHtml += '<button class="ped-estado-btn' + (active ? ' active' : '') + '" ' +
      'style="--est-color:' + e.color + '" ' +
      'onclick="cambiarEstado(\'' + key + '\')">' +
      e.emoji + ' ' + e.label + '</button>';
  }
  document.getElementById('pedEstadoBtns').innerHTML = btnsHtml;

  document.getElementById('pedModalBackdrop').classList.add('open');
}

function cerrarPedModal() {
  document.getElementById('pedModalBackdrop').classList.remove('open');
  pedidoActual = null;
}

async function cambiarEstado(nuevoEstado) {
  if (!pedidoActual) return;
  try {
    var res = await fetch(PED_API, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: pedidoActual.id, estado: nuevoEstado })
    });
    var data = await res.json();
    if (data.ok) {
      pedidoActual.estado = nuevoEstado;
      showToast('Estado actualizado a: ' + ESTADOS[nuevoEstado].label);
      abrirPedido(pedidoActual.id);
      cargarPedidos();
    } else {
      showToast(data.error || 'Error al cambiar estado', true);
    }
  } catch (e) {
    showToast('Error de conexión', true);
  }
}

async function eliminarPedido() {
  if (!pedidoActual) return;
  var num = pedidoActual.numero;
  document.getElementById('confirmMsg').textContent = '¿Eliminás el pedido "' + num + '"? Esta acción no se puede deshacer.';
  confirmCallback = async function() {
    try {
      var res = await fetch(PED_API + '?id=' + pedidoActual.id, { method: 'DELETE' });
      var data = await res.json();
      if (data.ok) {
        cerrarPedModal();
        showToast('Pedido ' + num + ' eliminado');
        cargarPedidos();
      } else {
        showToast(data.error || 'Error al eliminar', true);
      }
    } catch (e) {
      showToast('Error de conexión', true);
    }
  };
  document.getElementById('confirmBackdrop').classList.add('open');
}

/* ===== Clientes ===== */
var clientes = [];
var cliSearchTimer = null;
var filtroBusqCliente = '';

function onSearchCliente(val) {
  clearTimeout(cliSearchTimer);
  cliSearchTimer = setTimeout(function() { filtroBusqCliente = val; cargarClientes(); }, 300);
}

async function cargarClientes() {
  try {
    var url = CLI_API + '?q=' + encodeURIComponent(filtroBusqCliente);
    var res = await fetch(url);
    var data = await res.json();
    if (data.ok) {
      clientes = data.data || [];
      renderClientes();
      if (data.stats) {
        document.getElementById('cliStatTotal').textContent = data.stats.total;
        document.getElementById('cliStatConPedidos').textContent = data.stats.con_pedidos;
      }
    } else {
      showToast(data.error || 'Error al cargar clientes', true);
    }
  } catch (e) {
    showToast('Error de conexión', true);
  }
}

function renderClientes() {
  var lista = document.getElementById('clientesLista');
  if (!clientes.length) {
    lista.innerHTML = '<div class="table-empty">No hay clientes registrados</div>';
    return;
  }
  lista.innerHTML = '<table class="table"><thead><tr>' +
    '<th>Nombre</th><th>Teléfono</th><th>Dirección</th><th>Pedidos</th><th>Total gastado</th><th>Último pedido</th><th></th>' +
    '</tr></thead><tbody>' +
    clientes.map(function(c) {
      var ultimo = c.ultimo_pedido ? new Date(c.ultimo_pedido).toLocaleDateString('es-AR') : '—';
      return '<tr>' +
        '<td><strong>' + esc(c.nombre) + '</strong></td>' +
        '<td>' + esc(c.telefono || '—') + '</td>' +
        '<td>' + esc(c.direccion ? (c.direccion.length > 35 ? c.direccion.substring(0,35) + '...' : c.direccion) : '—') + '</td>' +
        '<td style="text-align:center">' + c.total_pedidos + '</td>' +
        '<td>$' + Number(c.total_gastado).toLocaleString('es-AR') + '</td>' +
        '<td>' + ultimo + '</td>' +
        '<td><button class="btn btn-ghost btn-sm" onclick="eliminarCliente(' + c.id + ',\'' + esc(c.nombre).replace(/'/g, "\\'") + '\')">🗑️</button></td>' +
        '</tr>';
    }).join('') +
    '</tbody></table>';
}

function eliminarCliente(id, nombre) {
  document.getElementById('confirmMsg').textContent = '¿Eliminás el cliente "' + nombre + '"? Sus pedidos no se eliminarán.';
  confirmCallback = async function() {
    try {
      var res = await fetch(CLI_API + '?id=' + id, { method: 'DELETE' });
      var data = await res.json();
      if (data.ok) {
        showToast('Cliente eliminado');
        cargarClientes();
      } else {
        showToast(data.error || 'Error al eliminar', true);
      }
    } catch (e) {
      showToast('Error de conexión', true);
    }
  };
  document.getElementById('confirmBackdrop').classList.add('open');
}

/* ===== Configuración ===== */
async function cargarConfiguracion() {
  try {
    var res = await fetch(CFG_API);
    var data = await res.json();
    if (data.ok && data.data) {
      var min = data.data.pedido_minimo || '0';
      document.getElementById('cfgPedidoMinimo').value = min;
      document.getElementById('cfgPedidoMinimoHint').textContent =
        'Valor actual: $' + Number(min).toLocaleString('es-AR') + (min === '0' ? ' \u2014 Dej\u00e1 en 0 para no aplicar m\u00ednimo.' : '');

      // Centro de distribución
      var cLat = data.data.centro_dist_lat || '';
      var cLng = data.data.centro_dist_lng || '';
      centroDistLat = cLat ? parseFloat(cLat) : null;
      centroDistLng = cLng ? parseFloat(cLng) : null;
      actualizarCentroInfo();

      // Precio por km
      var precioKm = data.data.precio_km || '0';
      cfgPrecioKm = parseFloat(precioKm);
      document.getElementById('cfgPrecioKm').value = precioKm;
      document.getElementById('cfgPrecioKmHint').textContent =
        'Valor actual: $' + Number(precioKm).toLocaleString('es-AR', {minimumFractionDigits:0, maximumFractionDigits:2}) + ' / km' + (precioKm === '0' ? ' — Dejá en 0 para no cobrar envío por distancia.' : '');
    }
  } catch (e) {
    showToast('Error al cargar configuraci\u00f3n', true);
  }
}

async function guardarConfig() {
  var pedidoMinimo = document.getElementById('cfgPedidoMinimo').value || '0';
  var precioKm = document.getElementById('cfgPrecioKm').value || '0';
  var body = { pedido_minimo: pedidoMinimo, precio_km: precioKm };
  if (centroDistLat !== null && centroDistLng !== null) {
    body.centro_dist_lat = String(centroDistLat);
    body.centro_dist_lng = String(centroDistLng);
  }
  try {
    var res = await fetch(CFG_API, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    var data = await res.json();
    if (data.ok) {
      showToast('Configuraci\u00f3n guardada');
      document.getElementById('cfgPedidoMinimoHint').textContent =
        'Valor actual: $' + Number(pedidoMinimo).toLocaleString('es-AR') + (pedidoMinimo === '0' ? ' \u2014 Dej\u00e1 en 0 para no aplicar m\u00ednimo.' : '');
      var saved = document.getElementById('configSaved');
      saved.style.display = 'inline';
      setTimeout(function() { saved.style.display = 'none'; }, 2000);
    } else {
      showToast(data.error || 'Error al guardar', true);
    }
  } catch (e) {
    showToast('Error de conexi\u00f3n', true);
  }
}

/* ===== Distancia Haversine ===== */
function calcDistanciaKm(lat1, lng1, lat2, lng2) {
  var R = 6371;
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLng = (lng2 - lng1) * Math.PI / 180;
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ===== Mapa centro de distribución ===== */
var centroDistLat = null;
var centroDistLng = null;
var cfgPrecioKm = 0;
var mapaSelector = null;
var mapaMarker = null;
var miniMapa = null;
var miniMarker = null;

function actualizarCentroInfo() {
  var info = document.getElementById('cfgCentroInfo');
  var miniEl = document.getElementById('cfgMiniMapa');
  if (centroDistLat !== null && centroDistLng !== null) {
    info.innerHTML = '\ud83d\udccd Ubicaci\u00f3n: <strong>' + centroDistLat.toFixed(5) + ', ' + centroDistLng.toFixed(5) + '</strong>';
    miniEl.style.display = 'block';
    // Renderizar mini mapa
    setTimeout(function() {
      var center = { lat: centroDistLat, lng: centroDistLng };
      miniMapa = new google.maps.Map(miniEl, {
        center: center,
        zoom: 15,
        disableDefaultUI: true,
        gestureHandling: 'none',
        clickableIcons: false
      });
      miniMarker = new google.maps.Marker({ position: center, map: miniMapa });
    }, 100);
  } else {
    info.textContent = 'Sin ubicaci\u00f3n configurada.';
    miniEl.style.display = 'none';
  }
}

function abrirMapaSelector() {
  document.getElementById('mapaBackdrop').classList.add('open');

  setTimeout(function() {
    var defaultLat = centroDistLat || -34.6037;
    var defaultLng = centroDistLng || -58.3816;
    var center = { lat: defaultLat, lng: defaultLng };

    mapaSelector = new google.maps.Map(document.getElementById('mapaSelector'), {
      center: center,
      zoom: centroDistLat ? 16 : 12
    });

    mapaMarker = new google.maps.Marker({
      position: center,
      map: mapaSelector,
      draggable: true
    });

    actualizarCoordsTxt(defaultLat, defaultLng);

    mapaMarker.addListener('dragend', function() {
      var pos = mapaMarker.getPosition();
      actualizarCoordsTxt(pos.lat(), pos.lng());
    });

    mapaSelector.addListener('click', function(e) {
      mapaMarker.setPosition(e.latLng);
      actualizarCoordsTxt(e.latLng.lat(), e.latLng.lng());
    });
  }, 200);
}

function actualizarCoordsTxt(lat, lng) {
  document.getElementById('mapaCoords').innerHTML =
    '\ud83d\udccd <strong>' + lat.toFixed(6) + ', ' + lng.toFixed(6) + '</strong>';
}

function cerrarMapaSelector() {
  document.getElementById('mapaBackdrop').classList.remove('open');
  mapaSelector = null;
  mapaMarker = null;
}

function aceptarUbicacion() {
  if (!mapaMarker) return;
  var pos = mapaMarker.getPosition();
  centroDistLat = pos.lat();
  centroDistLng = pos.lng();
  cerrarMapaSelector();
  actualizarCentroInfo();
  showToast('Ubicaci\u00f3n seleccionada. Record\u00e1 guardar la configuraci\u00f3n.');
}

/* ===== Init ===== */
document.addEventListener('DOMContentLoaded', async () => {
  await cargarCategorias();
  poblarSelects();
  cargarProductos();
  initDragDrop();
  cargarConfiguracion();

  // cerrar modal con Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { cerrarModal(); catModal.cerrar(); cerrarPedModal(); cerrarMapaSelector(); cerrarConfirm(false); }
  });
});
