<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lider Admin — Productos</title>
  <link rel="stylesheet" href="assets/css/admin.css">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
</head>
<body>

<div class="layout">

  <!-- ===== Sidebar ===== -->
  <aside class="sidebar">
    <div class="sidebar-logo">
      🛒 Lider Admin
    </div>
    <nav class="sidebar-nav">
      <a class="nav-item active" href="#" onclick="cambiarSeccion('productos', this)" data-section="productos">
        <span class="nav-icon">📦</span> Productos
      </a>
      <a class="nav-item" href="#" onclick="cambiarSeccion('categorias', this)" data-section="categorias">
        <span class="nav-icon">🏷️</span> Categorías
      </a>
      <a class="nav-item" href="#" onclick="cambiarSeccion('pedidos', this)" data-section="pedidos">
        <span class="nav-icon">📋</span> Pedidos
      </a>
      <a class="nav-item" href="#" onclick="cambiarSeccion('config', this)" data-section="config">
        <span class="nav-icon">⚙️</span> Configuración
      </a>
    </nav>
  </aside>

  <!-- ===== Main ===== -->
  <div class="main">

    <!-- Topbar -->
    <div class="topbar">
      <div class="topbar-title">Gestión de Productos</div>
      <div class="topbar-meta" id="topbarMeta"></div>
    </div>

    <!-- Content -->
    <div class="content">

      <!-- ========== SECCIÓN PRODUCTOS ========== -->
      <div class="section" id="seccionProductos">

      <!-- Stats -->
      <div class="stats-bar">
        <div class="stat-card">
          <span class="stat-label">Total productos</span>
          <span class="stat-value orange" id="statTotal">—</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Con stock</span>
          <span class="stat-value green" id="statStock">—</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Sin stock</span>
          <span class="stat-value red" id="statSinStock">—</span>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="toolbar">
        <div class="toolbar-left">
          <input
            class="search-input"
            type="text"
            placeholder="🔍 Buscar producto..."
            oninput="onSearch(this.value)"
          >
          <select id="filterCat" onchange="onFiltroCategoria(this.value)">
            <!-- poblado por JS -->
          </select>
        </div>
        <div class="toolbar-right">
          <button class="btn btn-primary" onclick="abrirNuevo()">
            + Nuevo producto
          </button>
        </div>
      </div>

      <!-- Table -->
      <div class="table-card">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Imagen</th>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>Precio</th>
              <th>Unidad</th>
              <th>Stock</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="tbody">
            <tr class="spinner-row"><td colspan="8"><div class="spin"></div></td></tr>
          </tbody>
        </table>
      </div>

      </div><!-- /seccionProductos -->

      <!-- ========== SECCIÓN CATEGORÍAS ========== -->
      <div class="section" id="seccionCategorias" style="display:none">

        <div class="toolbar">
          <div class="toolbar-left">
            <h3 style="font-size:1rem;font-weight:600">Categorías</h3>
          </div>
          <div class="toolbar-right">
            <button class="btn btn-primary" onclick="catModal.abrir()">
              + Nueva categoría
            </button>
          </div>
        </div>

        <div class="cat-grid" id="catGrid">
          <div class="spinner-row" style="text-align:center;padding:40px"><div class="spin"></div></div>
        </div>

      </div><!-- /seccionCategorias -->

      <!-- ========== SECCIÓN PEDIDOS ========== -->
      <div class="section" id="seccionPedidos" style="display:none">

        <!-- Stats pedidos -->
        <div class="stats-bar">
          <div class="stat-card">
            <span class="stat-label">Total pedidos</span>
            <span class="stat-value orange" id="pedStatTotal">—</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Recibidos</span>
            <span class="stat-value" style="color:#3b82f6" id="pedStatRecibido">—</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Preparando</span>
            <span class="stat-value" style="color:var(--warn)" id="pedStatPreparando">—</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Entregados</span>
            <span class="stat-value green" id="pedStatEntregado">—</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Facturación</span>
            <span class="stat-value orange" id="pedStatMonto">—</span>
          </div>
        </div>

        <!-- Toolbar pedidos -->
        <div class="toolbar">
          <div class="toolbar-left">
            <input class="search-input" type="text" placeholder="🔍 Buscar pedido, cliente..." oninput="onSearchPedido(this.value)">
            <select id="filterEstado" onchange="onFiltroEstado(this.value)">
              <option value="todos">Todos los estados</option>
              <option value="recibido">📥 Recibido</option>
              <option value="preparando">🔧 Preparando</option>
              <option value="listo">✅ Listo</option>
              <option value="entregado">🚚 Entregado</option>
              <option value="cancelado">❌ Cancelado</option>
            </select>
          </div>
          <div class="toolbar-right">
            <button class="btn btn-ghost" onclick="cargarPedidos()">🔄 Actualizar</button>
          </div>
        </div>

        <!-- Lista de pedidos -->
        <div id="pedidosLista">
          <div class="spinner-row" style="text-align:center;padding:40px"><div class="spin"></div></div>
        </div>

      </div><!-- /seccionPedidos -->

      <!-- ========== SECCIÓN CONFIGURACIÓN ========== -->
      <div class="section" id="seccionConfig" style="display:none">

        <div class="config-panel">
          <div class="config-card">
            <div class="config-card-header">
              <span class="config-card-icon">💰</span>
              <div>
                <div class="config-card-title">Pedido mínimo</div>
                <div class="config-card-desc">Monto mínimo que debe alcanzar un pedido para poder ser confirmado por el cliente.</div>
              </div>
            </div>
            <div class="config-card-body">
              <div class="config-input-row">
                <span class="config-currency">$</span>
                <input type="number" id="cfgPedidoMinimo" min="0" step="1" placeholder="0" class="config-input">
              </div>
              <div class="config-hint" id="cfgPedidoMinimoHint">Valor actual: $0 — Dejá en 0 para no aplicar mínimo.</div>
            </div>
          </div>

          <div class="config-card">
            <div class="config-card-header">
              <span class="config-card-icon">📍</span>
              <div>
                <div class="config-card-title">Centro de distribución</div>
                <div class="config-card-desc">Ubicación GPS del local o centro desde donde se despachan los pedidos.</div>
              </div>
            </div>
            <div class="config-card-body">
              <div id="cfgCentroInfo" class="config-hint" style="margin-bottom:10px">Sin ubicación configurada.</div>
              <div id="cfgMiniMapa" class="config-minimapa"></div>
              <button type="button" class="btn btn-ghost" onclick="abrirMapaSelector()" style="margin-top:10px">🗺️ Elegir ubicación en el mapa</button>
            </div>
          </div>

          <div class="config-actions">
            <button class="btn btn-primary" onclick="guardarConfig()">💾 Guardar configuración</button>
            <span class="config-saved" id="configSaved" style="display:none">✅ Guardado</span>
          </div>
        </div>

      </div><!-- /seccionConfig -->

    </div><!-- /content -->
  </div><!-- /main -->
</div><!-- /layout -->

<!-- ===== Modal Producto ===== -->
<div class="modal-backdrop" id="modalBackdrop" onclick="if(event.target===this)cerrarModal()">

  <div class="modal">

    <div class="modal-header">
      <div class="modal-title" id="modalTitle">Nuevo producto</div>
      <button class="btn btn-ghost" onclick="cerrarModal()">✕</button>
    </div>

    <div class="modal-body">

      <div class="form-row">
        <div class="form-group">
          <label>Nombre *</label>
          <input type="text" id="fNombre" placeholder="Ej: Manzana Roja">
        </div>
        <div class="form-group">
          <label>Precio *</label>
          <input type="number" id="fPrecio" placeholder="0" min="0" step="0.01">
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Categoría *</label>
          <select id="fCategoria"><!-- poblado por JS --></select>
        </div>
        <div class="form-group">
          <label>Unidad *</label>
          <select id="fUnidad" onchange="togglePesoPieza()"><!-- poblado por JS --></select>
        </div>
      </div>

      <div class="form-group" id="grupoPesoPieza" style="display:none">
        <label>Peso aprox. por pieza (kg)</label>
        <input type="number" id="fPesoPieza" placeholder="Ej: 0.250" min="0" step="0.001">
        <small style="color:var(--muted);font-size:.72rem">Peso aproximado de una unidad cuando se vende por kilo</small>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Emoji</label>
          <input type="text" id="fEmoji" placeholder="🍎" maxlength="4">
        </div>
        <div class="form-group" style="justify-content:flex-end">
          <label>Stock disponible</label>
          <div class="toggle-row">
            <label class="toggle">
              <input type="checkbox" id="fStock" checked>
              <span class="toggle-slider"></span>
            </label>
            <span id="stockLabel" style="font-size:.85rem;color:var(--muted)">Con stock</span>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label>Imagen del producto</label>
        <div class="upload-area" id="uploadArea">
          <div class="upload-preview" id="uploadPreview">
            <img id="imgPreview" class="img-preview" alt="preview">
            <button type="button" class="upload-remove" id="btnRemoveImg" onclick="removerImagen()" title="Quitar imagen">✕</button>
          </div>
          <div class="upload-controls" id="uploadControls">
            <div class="upload-dropzone" id="dropzone" onclick="document.getElementById('fArchivo').click()">
              <span class="upload-icon">📷</span>
              <span class="upload-text">Arrastrá o hacé clic para subir imagen</span>
              <span class="upload-hint">JPG, PNG, WEBP, GIF — máx 5MB</span>
            </div>
            <input type="file" id="fArchivo" accept="image/jpeg,image/png,image/webp,image/gif" style="display:none" onchange="subirImagen(this.files[0])">
            <div class="upload-separator"><span>o pegá una URL</span></div>
            <input type="url" id="fImagen" placeholder="https://..." oninput="actualizarPreview()">
          </div>
          <div class="upload-loading" id="uploadLoading" style="display:none">
            <div class="spin"></div>
            <span>Subiendo imagen...</span>
          </div>
        </div>
      </div>

    </div>

    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="cerrarModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="guardarProducto()">Guardar</button>
    </div>

  </div>
  
</div>

<!-- ===== Modal Categoría ===== -->
<div class="modal-backdrop" id="catModalBackdrop" onclick="if(event.target===this)catModal.cerrar()">
  <div class="modal" style="max-width:420px">
    <div class="modal-header">
      <div class="modal-title" id="catModalTitle">Nueva categoría</div>
      <button class="btn btn-ghost" onclick="catModal.cerrar()">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label>ID (slug) *</label>
        <input type="text" id="catId" placeholder="ej: fiambres" pattern="[a-z0-9_-]+" title="Solo minúsculas, números, guiones">
        <small style="color:var(--muted);font-size:.72rem">Identificador único, sin espacios ni mayúsculas</small>
      </div>
      <div class="form-group">
        <label>Nombre *</label>
        <input type="text" id="catLabel" placeholder="ej: Fiambres">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Emoji *</label>
          <input type="text" id="catEmoji" placeholder="🥓" maxlength="4" style="font-size:1.4rem;text-align:center">
        </div>
        <div class="form-group" style="justify-content:flex-end">
          <label>Activa</label>
          <div class="toggle-row">
            <label class="toggle">
              <input type="checkbox" id="catActiva" checked>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>
      <div class="form-group">
        <label>Orden</label>
        <input type="number" id="catOrden" placeholder="1" min="0">
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="catModal.cerrar()">Cancelar</button>
      <button class="btn btn-primary" onclick="catModal.guardar()">Guardar</button>
    </div>
  </div>
</div>

<!-- ===== Modal Pedido Detalle ===== -->
<div class="modal-backdrop" id="pedModalBackdrop" onclick="if(event.target===this)cerrarPedModal()">
  <div class="modal" style="max-width:560px">
    <div class="modal-header">
      <div>
        <div class="modal-title" id="pedModalTitle">Pedido</div>
        <div style="font-size:.78rem;color:var(--muted)" id="pedModalFecha"></div>
      </div>
      <button class="btn btn-ghost" onclick="cerrarPedModal()">✕</button>
    </div>
    <div class="modal-body">
      <!-- Info cliente -->
      <div class="ped-detail-section">
        <div class="ped-detail-label">Cliente</div>
        <div id="pedDetCliente" style="font-weight:600"></div>
        <div id="pedDetTelefono" style="font-size:.85rem;color:var(--muted)"></div>
        <div id="pedDetDireccion" style="font-size:.85rem;color:var(--muted)"></div>
        <div id="pedDetUbicacion" style="font-size:.85rem;display:none"><a id="pedDetMapLink" href="#" target="_blank" style="color:var(--primary);font-weight:600;text-decoration:none">📍 Ver en Google Maps</a></div>
        <div id="pedDetNotas" style="font-size:.85rem;color:var(--muted);font-style:italic;display:none"></div>
      </div>
      <!-- Items -->
      <div class="ped-detail-section">
        <div class="ped-detail-label">Productos</div>
        <div id="pedDetItems"></div>
      </div>
      <!-- Total -->
      <div class="ped-detail-total">
        <span>Total</span>
        <span id="pedDetTotal" style="font-weight:700;font-size:1.1rem"></span>
      </div>
      <!-- Cambiar estado -->
      <div class="ped-detail-section">
        <div class="ped-detail-label">Estado</div>
        <div class="ped-estado-btns" id="pedEstadoBtns"></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-danger" onclick="eliminarPedido()" style="margin-right:auto">🗑️ Eliminar</button>
      <button class="btn btn-ghost" onclick="cerrarPedModal()">Cerrar</button>
    </div>
  </div>
</div>

<!-- ===== Modal Mapa Selector ===== -->
<div class="modal-backdrop" id="mapaBackdrop" onclick="if(event.target===this)cerrarMapaSelector()">
  <div class="modal" style="max-width:700px">
    <div class="modal-header">
      <div class="modal-title">📍 Elegir ubicación del centro de distribución</div>
      <button class="btn btn-ghost" onclick="cerrarMapaSelector()">✕</button>
    </div>
    <div class="modal-body" style="padding:0">
      <div id="mapaSelector" style="height:420px;width:100%;border-radius:0 0 14px 14px"></div>
    </div>
    <div class="modal-footer" style="flex-wrap:wrap;gap:8px">
      <div style="flex:1;font-size:.82rem;color:var(--muted)" id="mapaCoords">Hacé clic en el mapa o arrastrá el marcador</div>
      <button class="btn btn-ghost" onclick="cerrarMapaSelector()">Cancelar</button>
      <button class="btn btn-primary" id="btnAceptarMapa" onclick="aceptarUbicacion()">Aceptar ubicación</button>
    </div>
  </div>
</div>

<!-- ===== Confirm dialog ===== -->
<div class="confirm-backdrop" id="confirmBackdrop">
  <div class="confirm-box">
    <div class="confirm-title">Confirmar eliminación</div>
    <div class="confirm-msg" id="confirmMsg"></div>
    <div class="confirm-actions">
      <button class="btn btn-ghost" onclick="cerrarConfirm(false)">Cancelar</button>
      <button class="btn btn-danger" onclick="cerrarConfirm(true)">Eliminar</button>
    </div>
  </div>
</div>

<!-- ===== Toast ===== -->
<div class="toast" id="toast"></div>

<script src="assets/js/admin.js"></script>
<script>
  // Toggle label del stock
  document.getElementById('fStock').addEventListener('change', function() {
    document.getElementById('stockLabel').textContent = this.checked ? 'Con stock' : 'Sin stock';
  });

  // Fecha en topbar
  document.getElementById('topbarMeta').textContent =
    new Date().toLocaleDateString('es-AR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
</script>
</body>
</html>
