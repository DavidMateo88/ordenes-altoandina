let token = null;
let role = null;
let currentOrdenId = null;
let showFinalizadas = true;

document.addEventListener('DOMContentLoaded', () => {
  // No cargar productos automáticamente al inicio
});

// Iniciar sesión
async function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  if (!username || !password) {
    alert('Por favor, completa usuario y contraseña.');
    return;
  }

  try {
    const response = await fetch('https://ordenes-altoandina.onrender.com/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    if (data.error) {
      alert(data.error);
      return;
    }
    token = data.token;
    role = data.role;
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    if (role === 'Solicitante') {
      document.getElementById('orden-form').style.display = 'block';
      loadDepositos();
      loadOrdenes();
    } else if (role === 'Cotizador') {
  document.getElementById('cotizar-form').style.display = 'block';
  document.getElementById('items-list').style.display = 'block';
  loadOrdenes();
  loadItemsForCotizador();
  loadProyectosForFilter(); // Cargar proyectos para el filtro
    } else if (role === 'Gerente') {
      document.getElementById('ordenes-controls').style.display = 'block';
      document.getElementById('move-stock').style.display = 'block';
      document.getElementById('gestion-depositos').style.display = 'block';
      document.getElementById('stock-report').style.display = 'block';
      loadDepositos();
      loadOrdenes();
      loadDepositosForGestion();
      loadProyectosForFilter();
      loadProductosSugeridos();
    }
    document.getElementById('filtro-estado').addEventListener('change', loadOrdenes);
    document.getElementById('filtro-proyecto').addEventListener('change', loadOrdenes);
    document.getElementById('ordenar-por').addEventListener('change', loadOrdenes);
  } catch (err) {
    console.error('Error al iniciar sesión:', err);
    alert('Error al iniciar sesión');
  }
}

// Cargar depósitos
async function loadDepositos() {
  try {
    const response = await fetch('https://ordenes-altoandina.onrender.com/api/depositos', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al cargar depósitos');
    }
    const depositos = await response.json();
    console.log('Depósitos cargados:', depositos); // Log para depuración
    const select = document.getElementById('deposito');
    const origenSelect = document.getElementById('origen-deposito');
    const destinoSelect = document.getElementById('destino-deposito');
    select.innerHTML = '<option value="">Seleccionar Depósito</option>';
    origenSelect.innerHTML = '<option value="">Seleccionar Depósito Origen</option>';
    destinoSelect.innerHTML = '<option value="">Seleccionar Depósito Destino</option>';
    depositos.forEach(deposito => {
      const option = document.createElement('option');
      option.value = deposito._id;
      option.text = `${deposito.nombre} (${deposito.ubicacion})`;
      select.appendChild(option.cloneNode(true));
      origenSelect.appendChild(option.cloneNode(true));
      destinoSelect.appendChild(option.cloneNode(true));
    });
    // Asegurar que el evento change esté configurado
    origenSelect.removeEventListener('change', handleDepositoChange); // Evitar múltiples listeners
    origenSelect.addEventListener('change', handleDepositoChange);
  } catch (err) {
    console.error('Error al cargar depósitos:', err);
    alert(`Error al cargar depósitos: ${err.message}`);
  }
}

function handleDepositoChange() {
  const depositoId = document.getElementById('origen-deposito').value;
  if (depositoId) {
    console.log('Depósito seleccionado:', depositoId); // Log para depuración
    loadStockDeposito(depositoId);
  } else {
    document.getElementById('stock-deposito-container').innerHTML = '';
  }
}

// Cargar productos para sugerencias
async function loadProductosSugeridos() {
  if (!token || role !== 'Gerente') return;
  try {
    const response = await fetch('https://ordenes-altoandina.onrender.com/api/stock/productos', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    const productos = await response.json();
    console.log('Productos sugeridos:', productos); // Log para depuración
    if (!Array.isArray(productos)) {
      throw new Error('La respuesta del servidor no es un array');
    }
    const datalist = document.getElementById('productos-sugeridos');
    datalist.innerHTML = '';
    productos.sort((a, b) => a.localeCompare(b)).forEach(producto => {
      const option = document.createElement('option');
      option.value = producto;
      datalist.appendChild(option);
    });
    document.getElementById('producto').addEventListener('input', () => {
      const input = document.getElementById('producto').value.toLowerCase();
      const filtered = productos
        .filter(p => p.toLowerCase().includes(input))
        .sort((a, b) => a.localeCompare(b));
      datalist.innerHTML = '';
      filtered.forEach(producto => {
        const option = document.createElement('option');
        option.value = producto;
        datalist.appendChild(option);
      });
    });
  } catch (err) {
    console.error('Error al cargar productos:', err);
    alert('Error al cargar productos');
  }
}

// Cargar stock de un depósito
async function loadStockDeposito(depositoId) {
  try {
    const response = await fetch(`https://ordenes-altoandina.onrender.com/api/stock/deposito/${depositoId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al cargar stock');
    }
    const stock = await response.json();
    //console.log('Stock cargado para depósito', depositoId, ':', stock); // Log para depuración
    const container = document.getElementById('stock-deposito-container');
    if (!container) {
      console.error('Contenedor stock-deposito-container no encontrado en el DOM');
      alert('Error: Contenedor de stock no encontrado');
      return;
    }
    container.innerHTML = `
      <h3>Stock en Depósito</h3>
      <label for="ordenar-stock">Ordenar por:</label>
      <select id="ordenar-stock">
        <option value="nombre">Nombre</option>
        <option value="codigo">Código</option>
      </select>
      <div id="stock-items"></div>
    `;
    const stockItems = document.getElementById('stock-items');
    if (!stock || !Array.isArray(stock) || stock.length === 0) {
      stockItems.innerHTML = '<p>No hay stock disponible en este depósito.</p>';
      console.warn('No se encontró stock para el depósito:', depositoId);
    } else {
      const renderStock = (stockData) => {
        stockItems.innerHTML = '';
        const ordenarPor = document.getElementById('ordenar-stock').value;
        stockData
          .filter(item => item.cantidad > 0)
          .sort((a, b) => {
            if (ordenarPor === 'nombre') return a.nombre.localeCompare(b.nombre);
            return a.codigo.localeCompare(b.codigo);
          })
          .forEach(item => {
            const row = document.createElement('div');
            row.className = 'stock-row';
            row.innerHTML = `
              <span>${item.nombre}</span>
              <span>${item.codigo}</span>
              <span>${item.cantidad}</span>
            `;
            stockItems.appendChild(row);
          });
      };
      renderStock(stock);
      const ordenarStockSelect = document.getElementById('ordenar-stock');
      ordenarStockSelect.removeEventListener('change', () => renderStock(stock));
      ordenarStockSelect.addEventListener('change', () => renderStock(stock));
    }
  } catch (err) {
    console.error('Error al cargar stock:', err);
    alert(`Error al cargar stock: ${err.message}`);
    document.getElementById('stock-deposito-container').innerHTML = '<p>Error al cargar stock.</p>';
  }
}

function renderStock(stock) {
  const sortBy = document.getElementById('ordenar-stock')?.value || 'nombre';
  const container = document.getElementById('stock-items');
  container.innerHTML = '';
  stock
    .filter(item => item.cantidad > 0)
    .sort((a, b) => sortBy === 'nombre' ? a.nombre.localeCompare(b.nombre) : a.codigo.localeCompare(b.codigo))
    .forEach(item => {
      const div = document.createElement('div');
      div.innerHTML = `
        <p>${item.nombre} (Código: ${item.codigo}) - Cantidad: ${item.cantidad}</p>
      `;
      container.appendChild(div);
    });
}

// Cargar proyectos para filtro
async function loadProyectosForFilter() {
  try {
    const response = await fetch('https://ordenes-altoandina.onrender.com/api/ordenes/proyectos', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const proyectos = await response.json();
    const select = document.getElementById('filtro-proyecto');
    const selectItems = document.getElementById('filtro-proyecto-items');
    select.innerHTML = '<option value="">Todos</option>';
    if (selectItems) {
      selectItems.innerHTML = '<option value="">Todos</option>';
    }
    proyectos.forEach(proyecto => {
      const option = document.createElement('option');
      option.value = proyecto;
      option.text = proyecto;
      select.appendChild(option);
      if (selectItems) {
        selectItems.appendChild(option.cloneNode(true));
      }
    });
  } catch (err) {
    console.error('Error al cargar proyectos:', err);
    alert('Error al cargar proyectos');
  }
}

// Cargar órdenes
async function loadOrdenes() {
  try {
    const estado = document.getElementById('filtro-estado')?.value || '';
    const proyecto = document.getElementById('filtro-proyecto')?.value || '';
    const ordenarPor = document.getElementById('ordenar-por')?.value || 'fecha';
    const response = await fetch(`https://ordenes-altoandina.onrender.com/api/ordenes?estado=${estado}&proyecto=${proyecto}&ordenarPor=${ordenarPor}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const ordenes = await response.json();
    const container = document.getElementById('ordenes-container');
    container.innerHTML = '';
    ordenes
      .filter(orden => {
        // Para Cotizador, excluir siempre órdenes completadas
        if (role === 'Cotizador') {
          return orden.estado !== 'Completada';
        }
        // Para Gerente, respetar showFinalizadas
        return role === 'Gerente' ? (showFinalizadas || orden.estado !== 'Completada') : true;
      })
      .forEach(orden => {
        const div = document.createElement('div');
        div.className = 'orden';
        let itemsList = orden.items.map(item => `
          ${item.descripcion} - ${item.cantidad} ${item.unidad_medida} 
          (Precio: $${item.precio_unitario?.toFixed(2) || '0.00'}, Subtotal: $${item.subtotal?.toFixed(2) || '0.00'})
        `).join('<br>');
        div.innerHTML = `
          <p><strong>Orden #${orden._id}</strong> - ${orden.proyecto} (${orden.estado})</p>
          <p>Ubicación: ${orden.ubicacion}</p>
          <p>Depósito: ${orden.deposito?.nombre || 'Desconocido'}</p>
          <p>Ítems:<br>${itemsList}</p>
          <p>Total estimado: $${orden.total_estimado?.toFixed(2) || '0.00'}</p>
          <p>Creado por: ${orden.creado_por?.username || 'Desconocido'}</p>
          ${orden.modificado_por ? `<p>Modificado por: ${orden.modificado_por?.username || 'Desconocido'} (${new Date(orden.fecha_modificacion).toLocaleString()})</p>` : ''}
          ${orden.cotizado_por ? `<p>Cotizado por: ${orden.cotizado_por?.username || 'Desconocido'}</p>` : ''}
          ${orden.comentarios_cotizacion ? `<p>Comentarios de Cotización: ${orden.comentarios_cotizacion}</p>` : ''}
          ${orden.aprobado_por ? `<p>Aprobado por: ${orden.aprobado_por?.username || 'Desconocido'}</p>` : ''}
          ${orden.rechazado_por ? `<p>Rechazado por: ${orden.rechazado_por?.username || 'Desconocido'}</p>` : ''}
          ${orden.razon_rechazo ? `<p><strong>Razón del rechazo:</strong> ${orden.razon_rechazo}</p>` : ''}
          ${orden.facturas?.length ? `<p>Facturas: ${orden.facturas.join(', ')}</p>` : ''}
          ${orden.estado === 'Rechazada' && role === 'Solicitante' ? `
            <button onclick="editOrden('${orden._id}')">Corregir Orden</button>
          ` : ''}
          ${role === 'Cotizador' && (orden.estado === 'Pendiente' || orden.estado === 'Modificada') ? `
            <button onclick="cotizarOrden('${orden._id}')">Cotizar Orden</button>
          ` : ''}
          ${role === 'Cotizador' && orden.estado === 'Aprobada' ? `
            <button onclick="showFacturaForm('${orden._id}')">Cargar Factura</button>
          ` : ''}
          ${role === 'Cotizador' || role === 'Gerente' ? `
            <button onclick="generatePDF('${orden._id}')">Generar PDF</button>
            <button onclick="generateExcel('${orden._id}')">Generar Excel</button>
          ` : ''}
          ${role === 'Gerente' && (orden.estado === 'Pendiente' || orden.estado === 'Cotizada' || orden.estado === 'Modificada') ? `
            <input type="text" id="razon-rechazo-${orden._id}" placeholder="Razón del rechazo">
            <button onclick="rejectOrden('${orden._id}')">Rechazar</button>
            <button onclick="approveOrden('${orden._id}')">Aprobar</button>
          ` : ''}
          ${role === 'Gerente' && (orden.estado === 'Rechazada' || orden.estado === 'Aprobada' || orden.estado === 'Completada') ? `
            <button onclick="deleteOrden('${orden._id}')">Eliminar Orden</button>
          ` : ''}
        `;
        container.appendChild(div);
      });
    if (role === 'Cotizador') {
      loadItemsForCotizador();
    }
  } catch (err) {
    console.error('Error al cargar órdenes:', err);
    alert('Error al cargar órdenes');
  }
}
//LISTA COTIZADOR
async function loadItemsForCotizador() {
  try {
    const response = await fetch('https://ordenes-altoandina.onrender.com/api/ordenes?estado=', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al cargar órdenes');
    }
    const ordenes = await response.json();
    
    // Filtrar órdenes no finalizadas ni completadas
    const filteredOrdenes = ordenes.filter(orden => 
      ['Pendiente', 'Cotizada', 'Modificada', 'Aprobada'].includes(orden.estado)
    );
    
    // Extraer ítems
    const items = [];
    filteredOrdenes.forEach(orden => {
      orden.items.forEach(item => {
        items.push({
          descripcion: item.descripcion,
          codigo: item.codigo || 'N/A',
          cantidad: item.cantidad,
          unidad_medida: item.unidad_medida,
          proyecto: orden.proyecto,
          solicitante: orden.creado_por?.username || 'Desconocido',
          cotizador: orden.cotizado_por?.username || 'No cotizado',
          precio_unitario: item.precio_unitario ? `$${item.precio_unitario.toFixed(2)}` : 'No cotizado'
        });
      });
    });
    
    // Aplicar filtros
    const filtroProyecto = document.getElementById('filtro-proyecto-items')?.value || '';
    const mostrarCotizados = document.getElementById('filtro-cotizados')?.checked;
    const ordenarPor = document.getElementById('ordenar-items')?.value || 'default';
    
    let filteredItems = items;
    if (filtroProyecto) {
      filteredItems = filteredItems.filter(item => item.proyecto === filtroProyecto);
    }
    if (!mostrarCotizados) {
      filteredItems = filteredItems.filter(item => item.precio_unitario === 'No cotizado');
    }
    if (ordenarPor === 'descripcion') {
      filteredItems.sort((a, b) => a.descripcion.localeCompare(b.descripcion));
    } else if (ordenarPor === 'descripcion-desc') {
      filteredItems.sort((a, b) => b.descripcion.localeCompare(a.descripcion));
    }
    
    // Renderizar ítems en la tabla
    const tableBody = document.getElementById('items-table-body');
    tableBody.innerHTML = '';
    if (filteredItems.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="8">No hay ítems que coincidan con los filtros.</td></tr>';
      return;
    }
    filteredItems.forEach(item => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${item.descripcion}</td>
        <td>${item.codigo}</td>
        <td>${item.cantidad}</td>
        <td>${item.unidad_medida}</td>
        <td>${item.proyecto}</td>
        <td>${item.solicitante}</td>
        <td>${item.cotizador}</td>
        <td>${item.precio_unitario}</td>
      `;
      tableBody.appendChild(row);
    });
    
    // Agregar eventos a los filtros
    const proyectoSelect = document.getElementById('filtro-proyecto-items');
    const cotizadosCheckbox = document.getElementById('filtro-cotizados');
    const ordenarSelect = document.getElementById('ordenar-items');
    [proyectoSelect, cotizadosCheckbox, ordenarSelect].forEach(element => {
      if (element) {
        element.removeEventListener('change', loadItemsForCotizador);
        element.addEventListener('change', loadItemsForCotizador);
      }
    });
  } catch (err) {
    console.error('Error al cargar ítems para cotizador:', err);
    alert(`Error al cargar ítems: ${err.message}`);
  }
}

// Añadir fila de ítem
function addItemRow() {
  const itemsContainer = document.getElementById('items-container');
  const row = document.createElement('div');
  row.className = 'item-row';
  row.innerHTML = `
    <input type="text" class="item-descripcion" placeholder="Descripción" required>
    <input type="text" class="item-codigo" placeholder="Código" required>
    <input type="number" class="item-cantidad" placeholder="Cantidad" required min="1">
    <input type="text" class="item-unidad" placeholder="Unidad" required>
    <button onclick="this.parentElement.remove()">Eliminar</button>
  `;
  itemsContainer.appendChild(row);
}

// Crear orden
function createOrden() {
  const proyecto = document.getElementById('proyecto').value;
  const ubicacion = document.getElementById('ubicacion').value;
  const deposito = document.getElementById('deposito').value;
  const observaciones = document.getElementById('observaciones').value;
  const items = [];
  const itemRows = document.querySelectorAll('.item-row');
  itemRows.forEach(row => {
    const descripcionInput = row.querySelector('.item-descripcion');
    const codigoInput = row.querySelector('.item-codigo');
    const cantidadInput = row.querySelector('.item-cantidad');
    const unidadInput = row.querySelector('.item-unidad');
    if (descripcionInput && codigoInput && cantidadInput && unidadInput) {
      const descripcion = descripcionInput.value;
      const codigo = codigoInput.value;
      const cantidad = parseInt(cantidadInput.value) || 0;
      const unidad_medida = unidadInput.value;
      if (descripcion && codigo && cantidad > 0 && unidad_medida) {
        items.push({ descripcion, codigo, cantidad, unidad_medida });
      }
    } else {
      console.warn('Fila item-row incompleta:', row);
    }
  });

  if (!proyecto || !ubicacion || !deposito || items.length === 0) {
    alert('Por favor, completa todos los campos y añade al menos un ítem válido.');
    return;
  }

  fetch('https://ordenes-altoandina.onrender.com/api/ordenes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ proyecto, ubicacion, deposito, observaciones, items })
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        console.error('Error en createOrden:', data.error);
        alert(data.error);
        return;
      }
      alert('Orden creada exitosamente');
      resetForm();
      loadOrdenes();
    })
    .catch(err => {
      console.error('Error:', err);
      alert('Error al crear orden');
    });
}

// Editar orden
async function editOrden(id) {
  try {
    const response = await fetch(`https://ordenes-altoandina.onrender.com/api/ordenes/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const orden = await response.json();
    currentOrdenId = id;
    document.getElementById('orden-id').value = orden._id;
    document.getElementById('proyecto').value = orden.proyecto;
    document.getElementById('ubicacion').value = orden.ubicacion;
    document.getElementById('deposito').value = orden.deposito?._id || '';
    document.getElementById('observaciones').value = orden.observaciones || '';
    const itemsContainer = document.getElementById('items-container');
    itemsContainer.innerHTML = '';
    orden.items.forEach(item => {
      const row = document.createElement('div');
      row.className = 'item-row';
      row.innerHTML = `
        <input type="text" class="item-descripcion" value="${item.descripcion}" placeholder="Descripción" required>
        <input type="text" class="item-codigo" value="${item.codigo || ''}" placeholder="Código" required>
        <input type="number" class="item-cantidad" value="${item.cantidad}" placeholder="Cantidad" required min="1">
        <input type="text" class="item-unidad" value="${item.unidad_medida}" placeholder="Unidad" required>
        <button onclick="this.parentElement.remove()">Eliminar</button>
      `;
      itemsContainer.appendChild(row);
    });
    document.getElementById('create-orden').style.display = 'none';
    document.getElementById('save-orden').style.display = 'inline';
  } catch (err) {
    console.error('Error al cargar orden:', err);
    alert('Error al cargar orden');
  }
}

// Guardar cambios en orden
function saveOrden() {
  const proyecto = document.getElementById('proyecto').value;
  const ubicacion = document.getElementById('ubicacion').value;
  const deposito = document.getElementById('deposito').value;
  const observaciones = document.getElementById('observaciones').value;
  const items = [];
  const itemRows = document.querySelectorAll('.item-row');
  itemRows.forEach(row => {
    const descripcionInput = row.querySelector('.item-descripcion');
    const codigoInput = row.querySelector('.item-codigo');
    const cantidadInput = row.querySelector('.item-cantidad');
    const unidadInput = row.querySelector('.item-unidad');
    if (descripcionInput && codigoInput && cantidadInput && unidadInput) {
      const descripcion = descripcionInput.value;
      const codigo = codigoInput.value;
      const cantidad = parseInt(cantidadInput.value) || 0;
      const unidad_medida = unidadInput.value;
      if (descripcion && codigo && cantidad > 0 && unidad_medida) {
        items.push({ descripcion, codigo, cantidad, unidad_medida });
      }
    } else {
      console.warn('Fila item-row incompleta:', row);
    }
  });

  if (!proyecto || !ubicacion || !deposito || items.length === 0) {
    alert('Por favor, completa todos los campos y añade al menos un ítem válido.');
    return;
  }

  fetch(`https://ordenes-altoandina.onrender.com/api/ordenes/${currentOrdenId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ proyecto, ubicacion, deposito, observaciones, items })
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        console.error('Error al actualizar orden:', data.error);
        alert(data.error);
        return;
      }
      alert('Orden actualizada exitosamente');
      resetForm();
      loadOrdenes();
    })
    .catch(err => {
      console.error('Error:', err);
      alert('Error al actualizar orden');
    });
}

// Cotizar orden
async function cotizarOrden(id) {
  document.getElementById('cotizar-form').style.display = 'block';
  try {
    const response = await fetch(`https://ordenes-altoandina.onrender.com/api/ordenes/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al cargar orden');
    }
    const orden = await response.json();
    console.log('Orden cargada para cotizar:', orden);
    currentOrdenId = id;
    document.getElementById('cotizar-orden-details').innerHTML = `
      <p><strong>Orden #${orden._id}</strong> - ${orden.proyecto} (${orden.estado})</p>
      <p>Ubicación: ${orden.ubicacion}</p>
      <p>Depósito: ${orden.deposito?.nombre || 'Desconocido'}</p>
    `;
    const itemsContainer = document.getElementById('cotizar-items-container');
    itemsContainer.innerHTML = '';
    if (!orden.items || orden.items.length === 0) {
      itemsContainer.innerHTML = '<p>No hay ítems en esta orden.</p>';
      return;
    }
    orden.items.forEach(item => {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'item-row';
      itemDiv.innerHTML = `
        <input type="text" class="item-descripcion" value="${item.descripcion || ''}" readonly>
        <input type="text" class="item-codigo" value="${item.codigo || ''}" readonly>
        <input type="number" class="item-cantidad" value="${item.cantidad || 0}" readonly>
        <input type="text" class="item-unidad" value="${item.unidad_medida || ''}" readonly>
        <input type="number" class="item-precio" value="${item.precio_unitario || ''}" placeholder="Precio Unitario" step="0.01">
        <input type="number" class="item-subtotal" value="${item.subtotal || 0}" placeholder="Subtotal" readonly>
      `;
      itemsContainer.appendChild(itemDiv);
      const precioInput = itemDiv.querySelector('.item-precio');
      precioInput.addEventListener('input', () => {
        const cantidad = parseFloat(itemDiv.querySelector('.item-cantidad').value) || 0;
        const precio = parseFloat(precioInput.value) || 0;
        const subtotal = +(cantidad * precio).toFixed(2);
        itemDiv.querySelector('.item-subtotal').value = subtotal;
      });
    });
    const comentariosDiv = document.createElement('div');
    comentariosDiv.innerHTML = `
      <label for="comentarios-cotizacion">Comentarios de Cotización:</label>
      <textarea id="comentarios-cotizacion" placeholder="Añade comentarios para el gerente">${orden.comentarios_cotizacion || ''}</textarea>
    `;
    itemsContainer.appendChild(comentariosDiv);
  } catch (err) {
    console.error('Error al cargar orden:', err);
    alert(`❌ Error al cargar orden: ${err.message}`);
  }
}

// Guardar cotización
function saveCotizacion() {
  const items = [];
  const itemRows = document.querySelectorAll('#cotizar-items-container .item-row');
  itemRows.forEach(row => {
    const descripcion = row.querySelector('.item-descripcion')?.value;
    const codigo = row.querySelector('.item-codigo')?.value;
    const cantidad = parseInt(row.querySelector('.item-cantidad')?.value) || 0;
    const unidad_medida = row.querySelector('.item-unidad')?.value;
    const precio_unitario = parseFloat(row.querySelector('.item-precio')?.value) || 0;
    const subtotal = parseFloat(row.querySelector('.item-subtotal')?.value) || 0;
    if (descripcion && cantidad > 0 && unidad_medida) {
      items.push({ descripcion, codigo, cantidad, unidad_medida, precio_unitario, subtotal });
    }
  });
  const total_estimado = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  const comentarios_cotizacion = document.getElementById('comentarios-cotizacion')?.value || '';

  if (items.length === 0) {
    alert('Por favor, añade al menos un ítem válido.');
    return;
  }

  fetch(`https://ordenes-altoandina.onrender.com/api/ordenes/cotizar/${currentOrdenId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ items, total_estimado, comentarios_cotizacion })
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        console.error('Error al guardar cotización:', data.error);
        alert(data.error);
        return;
      }
      alert('Cotización guardada exitosamente');
      document.getElementById('cotizar-form').style.display = 'none';
      // Al final de saveCotizacion, antes de loadOrdenes()
if (role === 'Cotizador') {
  loadItemsForCotizador();
}
      loadOrdenes();
    })
    .catch(err => {
      console.error('Error:', err);
      alert('Error al guardar cotización');
    });
}

// Añadir input para factura
function addFacturaInput() {
  const container = document.getElementById('facturas-container');
  const input = document.createElement('div');
  input.innerHTML = `
    <input type="text" class="factura-input" placeholder="Número de Factura">
    <button onclick="this.parentElement.remove()">Eliminar</button>
  `;
  container.appendChild(input);
}

// Cargar facturas
function showFacturaForm(id) {
  currentOrdenId = id;
  document.getElementById('facturas-container').innerHTML = `
    <input type="text" class="factura-input" placeholder="Número de Factura">
  `;
  document.getElementById('factura-form').style.display = 'block';
}

async function uploadFacturas() {
  const facturas = Array.from(document.querySelectorAll('.factura-input'))
    .map(input => input.value)
    .filter(value => value.trim() !== '');
  if (facturas.length === 0) {
    alert('Por favor, ingresa al menos un número de factura.');
    return;
  }

  try {
    // Obtener la orden para enviar sus ítems
    const response = await fetch(`https://ordenes-altoandina.onrender.com/api/ordenes/${currentOrdenId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al cargar orden');
    }
    const orden = await response.json();
    console.log('Orden cargada:', orden);
    const items = orden.items || [];
    console.log('Ítems enviados:', items); // Log adicional

    // Enviar facturas e ítems al backend
    const updateResponse = await fetch(`https://ordenes-altoandina.onrender.com/api/ordenes/factura/${currentOrdenId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ facturas, items })
    });
    const data = await updateResponse.json();
    if (data.error) {
      console.error('Error al cargar facturas:', data.error);
      alert(data.error);
      return;
    }
    alert('Facturas cargadas exitosamente');
    document.getElementById('facturas-container').innerHTML = `
      <input type="text" class="factura-input" placeholder="Número de Factura">
    `;
    document.getElementById('factura-form').style.display = 'none';
    currentOrdenId = null;
    // Al final de uploadFacturas, antes de loadOrdenes()
if (role === 'Cotizador') {
  loadItemsForCotizador();
}
    loadOrdenes();
    // Recargar el stock para reflejar los cambios
    const depositoId = orden.deposito?._id;
    if (depositoId && role === 'Gerente') {
      loadStockDeposito(depositoId);
    }
  } catch (err) {
    console.error('Error:', err);
    alert('Error al cargar facturas');
  }
}

// Rechazar orden
function rejectOrden(id) {
  const razon_rechazo = document.getElementById(`razon-rechazo-${id}`).value;
  if (!razon_rechazo) {
    alert('Por favor, proporciona una razón para el rechazo.');
    return;
  }

  fetch(`https://ordenes-altoandina.onrender.com/api/ordenes/rechazar/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ razon_rechazo })
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        console.error('Error al rechazar orden:', data.error);
        alert(data.error);
        return;
      }
      alert('Orden rechazada');
      loadOrdenes();
    })
    .catch(err => {
      console.error('Error:', err);
      alert('Error al rechazar orden');
    });
}

// Aprobar orden
function approveOrden(id) {
  fetch(`https://ordenes-altoandina.onrender.com/api/ordenes/aprobar/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        console.error('Error al aprobar orden:', data.error);
        alert(data.error);
        return;
      }
      alert('Orden aprobada');
      loadOrdenes();
    })
    .catch(err => {
      console.error('Error:', err);
      alert('Error al aprobar orden');
    });
}

// Generar PDF de orden
async function generatePDF(id) {
  try {
    const response = await fetch(`https://ordenes-altoandina.onrender.com/api/reportes/orden/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al generar PDF');
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orden_${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Error al generar PDF:', err);
    alert(`Error al generar PDF: ${err.message}`);
  }
}

async function generateExcel(id) {
  try {
    const response = await fetch(`https://ordenes-altoandina.onrender.com/api/ordenes/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al cargar orden');
    }
    const orden = await response.json();

    // Preparar datos para Excel
    const data = [
      ['Orden de Compra'],
      ['ID', orden._id],
      ['Proyecto', orden.proyecto],
      ['Ubicación', orden.ubicacion],
      ['Depósito', orden.deposito?.nombre || 'Desconocido'],
      ['Estado', orden.estado],
      ['Total Estimado', `$${orden.total_estimado?.toFixed(2) || '0.00'}`],
      ['Creado por', orden.creado_por?.username || 'Desconocido'],
      orden.modificado_por ? ['Modificado por', `${orden.modificado_por?.username || 'Desconocido'} (${new Date(orden.fecha_modificacion).toLocaleString()})`] : [],
      orden.cotizado_por ? ['Cotizado por', orden.cotizado_por?.username || 'Desconocido'] : [],
      orden.comentarios_cotizacion ? ['Comentarios de Cotización', orden.comentarios_cotizacion] : [],
      orden.aprobado_por ? ['Aprobado por', orden.aprobado_por?.username || 'Desconocido'] : [],
      orden.rechazado_por ? ['Rechazado por', orden.rechazado_por?.username || 'Desconocido'] : [],
      orden.razon_rechazo ? ['Razón del Rechazo', orden.razon_rechazo] : [],
      orden.facturas?.length ? ['Facturas', orden.facturas.join(', ')] : [],
      [], // Línea en blanco
      ['Ítems'],
      ['Descripción', 'Código', 'Cantidad', 'Unidad', 'Precio Unitario', 'Subtotal']
    ];

    // Agregar ítems
    orden.items.forEach(item => {
      data.push([
        item.descripcion,
        item.codigo || '',
        item.cantidad,
        item.unidad_medida,
        `$${item.precio_unitario?.toFixed(2) || '0.00'}`,
        `$${item.subtotal?.toFixed(2) || '0.00'}`
      ]);
    });

    // Crear hoja de Excel
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Orden');
    XLSX.writeFile(wb, `orden_${id}.xlsx`);
  } catch (err) {
    console.error('Error al generar Excel:', err);
    alert(`Error al generar Excel: ${err.message}`);
  }
}

async function generateAllOrdersExcel() {
  try {
    const estado = document.getElementById('filtro-estado')?.value || '';
    const proyecto = document.getElementById('filtro-proyecto')?.value || '';
    const ordenarPor = document.getElementById('ordenar-por')?.value || 'fecha';
    const response = await fetch(`https://ordenes-altoandina.onrender.com/api/ordenes?estado=${estado}&proyecto=${proyecto}&ordenarPor=${ordenarPor}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al cargar órdenes');
    }
    const ordenes = await response.json();

    // Preparar datos para Excel
    const data = [
      ['Reporte de Órdenes de Compra'],
      ['ID', 'Proyecto', 'Ubicación', 'Depósito', 'Estado', 'Total Estimado', 'Creado por', 'Ítems', 'Facturas']
    ];

    ordenes
      .filter(orden => showFinalizadas || orden.estado !== 'Completada')
      .forEach(orden => {
        const itemsList = orden.items.map(item => 
          `${item.descripcion} (${item.cantidad} ${item.unidad_medida}, $${item.subtotal?.toFixed(2) || '0.00'})`
        ).join('; ');
        data.push([
          orden._id,
          orden.proyecto,
          orden.ubicacion,
          orden.deposito?.nombre || 'Desconocido',
          orden.estado,
          `$${orden.total_estimado?.toFixed(2) || '0.00'}`,
          orden.creado_por?.username || 'Desconocido',
          itemsList,
          orden.facturas?.join(', ') || ''
        ]);
      });

    // Crear hoja de Excel
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Órdenes');
    XLSX.writeFile(wb, 'ordenes_compras.xlsx');
  } catch (err) {
    console.error('Error al generar Excel de órdenes:', err);
    alert(`Error al generar Excel: ${err.message}`);
  }
}
// Generar PDF de stock
async function generateStockPDF() {
  try {
    const response = await fetch('https://ordenes-altoandina.onrender.com/api/reportes/stock', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al generar PDF de stock');
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stock_report.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Error al generar PDF de stock:', err);
    alert(`Error al generar PDF de stock: ${err.message}`);
  }
}

// Crear depósito
async function createDeposito() {
  const nombre = document.getElementById('nuevo-deposito-nombre').value;
  const ubicacion = document.getElementById('nuevo-deposito-ubicacion').value;

  if (!nombre || !ubicacion) {
    alert('Por favor, completa nombre y ubicación del depósito.');
    return;
  }

  try {
    const response = await fetch('https://ordenes-altoandina.onrender.com/api/depositos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ nombre, ubicacion })
    });
    const data = await response.json();
    if (data.error) {
      console.error('Error al crear depósito:', data.error);
      alert(data.error);
      return;
    }
    alert('Depósito creado exitosamente');
    document.getElementById('nuevo-deposito-nombre').value = '';
    document.getElementById('nuevo-deposito-ubicacion').value = '';
    loadDepositos();
    loadDepositosForGestion();
  } catch (err) {
    console.error('Error:', err);
    alert('Error al crear depósito');
  }
}

// Cargar depósitos para gestión
async function loadDepositosForGestion() {
  try {
    const response = await fetch('https://ordenes-altoandina.onrender.com/api/depositos', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const depositos = await response.json();
    const container = document.getElementById('depositos-container');
    container.innerHTML = '';
    depositos.forEach(deposito => {
      const div = document.createElement('div');
      div.className = 'deposito';
      div.innerHTML = `
        <p>${deposito.nombre} (${deposito.ubicacion})</p>
        <button onclick="loadStockDeposito('${deposito._id}')">Ver Stock</button>
        <button onclick="deleteDeposito('${deposito._id}')">Eliminar</button>
      `;
      container.appendChild(div);
    });
  } catch (err) {
    console.error('Error al cargar depósitos:', err);
    alert('Error al cargar depósitos');
  }
}

// Eliminar depósito
function deleteDeposito(id) {
  if (!confirm('¿Estás seguro de eliminar este depósito?')) return;
  fetch(`https://ordenes-altoandina.onrender.com/api/depositos/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        console.error('Error al eliminar depósito:', data.error);
        alert(data.error);
        return;
      }
      alert('Depósito eliminado');
      loadDepositos();
      loadDepositosForGestion();
    })
    .catch(err => {
      console.error('Error:', err);
      alert('Error al eliminar depósito');
    });
}

// Mover stock
async function moveStock() {
  const producto = document.getElementById('producto').value;
  const origenDeposito = document.getElementById('origen-deposito').value;
  const destinoDeposito = document.getElementById('destino-deposito').value;
  const cantidad = parseInt(document.getElementById('cantidad').value);

  if (!producto || !origenDeposito || !destinoDeposito || !cantidad || cantidad <= 0) {
    alert('Por favor, completa todos los campos con valores válidos.');
    return;
  }

  try {
    const response = await fetch('https://ordenes-altoandina.onrender.com/api/depositos/mover-stock', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ producto, origenDeposito, destinoDeposito, cantidad })
    });
    const data = await response.json();
    if (data.error) {
      console.error('Error al mover stock:', data.error);
      alert(data.error);
      return;
    }
    alert('Stock movido exitosamente');
    document.getElementById('producto').value = '';
    document.getElementById('origen-deposito').value = '';
    document.getElementById('destino-deposito').value = '';
    document.getElementById('cantidad').value = '';
    document.getElementById('stock-deposito-container').innerHTML = '';
  } catch (err) {
    console.error('Error:', err);
    alert('Error al mover stock');
  }
}

// Mostrar/ocultar órdenes finalizadas
function toggleFinalizadas() {
  showFinalizadas = !showFinalizadas;
  document.querySelector('#ordenes-controls button').textContent = showFinalizadas ? 'Ocultar Finalizadas' : 'Mostrar Finalizadas';
  loadOrdenes();
}

// Reiniciar formulario
function resetForm() {
  document.getElementById('orden-id').value = '';
  document.getElementById('proyecto').value = '';
  document.getElementById('ubicacion').value = '';
  document.getElementById('deposito').value = '';
  document.getElementById('observaciones').value = '';
  document.getElementById('items-container').innerHTML = `
    <div class="item-row">
      <input type="text" class="item-descripcion" placeholder="Descripción" required>
      <input type="text" class="item-codigo" placeholder="Código" required>
      <input type="number" class="item-cantidad" placeholder="Cantidad" required min="1">
      <input type="text" class="item-unidad" placeholder="Unidad" required>
      <button onclick="this.parentElement.remove()">Eliminar</button>
    </div>
  `;
  document.getElementById('create-orden').style.display = 'inline';
  document.getElementById('save-orden').style.display = 'none';
  currentOrdenId = null;
}

// Eliminar orden
async function deleteOrden(id) {
  if (!confirm('¿Estás seguro de que deseas eliminar esta orden?')) return;

  try {
    const response = await fetch(`https://ordenes-altoandina.onrender.com/api/ordenes/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      alert('Orden eliminada exitosamente');
      loadOrdenes();
    } else {
      const error = await response.json();
      alert(`Error: ${error.error}`);
    }
  } catch (err) {
    console.error('Error al eliminar orden:', err);
    alert('Error al eliminar orden');
  }
}

// Cargar productos al iniciar la sección de mover stock (solo para Gerente después de login)


// Cargar productos para sugerencias
async function loadProductosSugeridos() {
  if (!token || role !== 'Gerente') return; // Solo cargar si hay token y el usuario es Gerente
  try {
    const response = await fetch('https://ordenes-altoandina.onrender.com/api/stock/productos', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    const productos = await response.json();
    if (!Array.isArray(productos)) {
      throw new Error('La respuesta del servidor no es un array');
    }
    const datalist = document.getElementById('productos-sugeridos');
    datalist.innerHTML = '';
    productos.sort((a, b) => a.localeCompare(b)).forEach(producto => {
      const option = document.createElement('option');
      option.value = producto;
      datalist.appendChild(option);
    });
    document.getElementById('producto').addEventListener('input', () => {
      const input = document.getElementById('producto').value.toLowerCase();
      const filtered = productos
        .filter(p => p.toLowerCase().includes(input))
        .sort((a, b) => a.localeCompare(b));
      datalist.innerHTML = '';
      filtered.forEach(producto => {
        const option = document.createElement('option');
        option.value = producto;
        datalist.appendChild(option);
      });
    });
  } catch (err) {
    console.error('Error al cargar productos:', err);
    alert('Error al cargar productos');
  }
}
//FUNCION EXCEL TBLA ITEMS
async function generateItemsExcel() {
  try {
    const response = await fetch('https://ordenes-altoandina.onrender.com/api/ordenes?estado=', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al cargar órdenes');
    }
    const ordenes = await response.json();
    const filteredOrdenes = ordenes.filter(orden => 
      ['Pendiente', 'Cotizada', 'Modificada', 'Aprobada'].includes(orden.estado)
    );
    
    const items = [];
    filteredOrdenes.forEach(orden => {
      orden.items.forEach(item => {
        items.push({
          descripcion: item.descripcion,
          codigo: item.codigo || 'N/A',
          cantidad: item.cantidad,
          unidad_medida: item.unidad_medida,
          proyecto: orden.proyecto,
          solicitante: orden.creado_por?.username || 'Desconocido',
          cotizador: orden.cotizado_por?.username || 'No cotizado',
          precio_unitario: item.precio_unitario ? `$${item.precio_unitario.toFixed(2)}` : 'No cotizado'
        });
      });
    });
    
    // Aplicar filtros
    const filtroProyecto = document.getElementById('filtro-proyecto-items')?.value || '';
    const mostrarCotizados = document.getElementById('filtro-cotizados')?.checked;
    const ordenarPor = document.getElementById('ordenar-items')?.value || 'default';
    
    let filteredItems = items;
    if (filtroProyecto) {
      filteredItems = filteredItems.filter(item => item.proyecto === filtroProyecto);
    }
    if (!mostrarCotizados) {
      filteredItems = filteredItems.filter(item => item.precio_unitario === 'No cotizado');
    }
    if (ordenarPor === 'descripcion') {
      filteredItems.sort((a, b) => a.descripcion.localeCompare(b.descripcion));
    } else if (ordenarPor === 'descripcion-desc') {
      filteredItems.sort((a, b) => b.descripcion.localeCompare(a.descripcion));
    }
    
    // Preparar datos para Excel
    const data = [
      ['Lista de Ítems en Órdenes No Finalizadas'],
      ['Descripción', 'Código', 'Cantidad', 'Unidad', 'Proyecto', 'Solicitante', 'Cotizador', 'Precio Unitario']
    ];
    filteredItems.forEach(item => {
      data.push([
        item.descripcion,
        item.codigo,
        item.cantidad,
        item.unidad_medida,
        item.proyecto,
        item.solicitante,
        item.cotizador,
        item.precio_unitario
      ]);
    });
    
    // Crear hoja de Excel
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ítems');
    XLSX.writeFile(wb, 'items_no_finalizados.xlsx');
  } catch (err) {
    console.error('Error al generar Excel de ítems:', err);
    alert(`Error al generar Excel: ${err.message}`);
  }
}
// GENERAR PDF LISTA ITEMS
async function generateItemsPDF() {
  try {
    const response = await fetch('https://ordenes-altoandina.onrender.com/api/ordenes?estado=', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al cargar órdenes');
    }
    const ordenes = await response.json();
    const filteredOrdenes = ordenes.filter(orden => 
      ['Pendiente', 'Cotizada', 'Modificada', 'Aprobada'].includes(orden.estado)
    );
    
    const items = [];
    filteredOrdenes.forEach(orden => {
      orden.items.forEach(item => {
        items.push({
          descripcion: item.descripcion,
          codigo: item.codigo || 'N/A',
          cantidad: item.cantidad,
          unidad_medida: item.unidad_medida,
          proyecto: orden.proyecto,
          solicitante: orden.creado_por?.username || 'Desconocido',
          cotizador: orden.cotizado_por?.username || 'No cotizado',
          precio_unitario: item.precio_unitario ? `$${item.precio_unitario.toFixed(2)}` : 'No cotizado'
        });
      });
    });
    
    // Aplicar filtros
    const filtroProyecto = document.getElementById('filtro-proyecto-items')?.value || '';
    const mostrarCotizados = document.getElementById('filtro-cotizados')?.checked;
    const ordenarPor = document.getElementById('ordenar-items')?.value || 'default';
    
    let filteredItems = items;
    if (filtroProyecto) {
      filteredItems = filteredItems.filter(item => item.proyecto === filtroProyecto);
    }
    if (!mostrarCotizados) {
      filteredItems = filteredItems.filter(item => item.precio_unitario === 'No cotizado');
    }
    if (ordenarPor === 'descripcion') {
      filteredItems.sort((a, b) => a.descripcion.localeCompare(b.descripcion));
    } else if (ordenarPor === 'descripcion-desc') {
      filteredItems.sort((a, b) => b.descripcion.localeCompare(a.descripcion));
    }
    
    // Generar PDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text('Lista de Ítems en Órdenes No Finalizadas', 10, 10);
    let y = 20;
    doc.setFontSize(10);
    doc.text(['Descripción', 'Código', 'Cantidad', 'Unidad', 'Proyecto', 'Solicitante', 'Cotizador', 'Precio Unitario'].join('\t'), 10, y);
    y += 10;
    filteredItems.forEach(item => {
      const row = [
        item.descripcion.substring(0, 20), // Limitar longitud para evitar desbordes
        item.codigo,
        item.cantidad.toString(),
        item.unidad_medida,
        item.proyecto.substring(0, 15),
        item.solicitante.substring(0, 15),
        item.cotizador.substring(0, 15),
        item.precio_unitario
      ].join('\t');
      doc.text(row, 10, y);
      y += 10;
      if (y > 280) { // Nueva página si se pasa del límite
        doc.addPage();
        y = 10;
      }
    });
    doc.save('items_no_finalizados.pdf');
  } catch (err) {
    console.error('Error al generar PDF de ítems:', err);
    alert(`Error al generar PDF: ${err.message}`);
  }
}
window.cotizarOrden = cotizarOrden;