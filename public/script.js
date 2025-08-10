let token = null;
let role = null;
let currentOrdenId = null;

// Iniciar sesión
async function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  if (!username || !password) {
    alert('Por favor, completa usuario y contraseña.');
    return;
  }

  try {
    const response = await fetch('http://localhost:5000/api/auth/login', {
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
      loadOrdenes();
    } else if (role === 'Gerente') {
      document.getElementById('orden-form').style.display = 'none';
      document.getElementById('move-stock').style.display = 'block';
      document.getElementById('gestion-depositos').style.display = 'block';
      document.getElementById('stock-report').style.display = 'block';
      loadDepositos();
      loadOrdenes();
      loadDepositosForGestion();
    }
  } catch (err) {
    console.error('Error al iniciar sesión:', err);
    alert('Error al iniciar sesión');
  }
}

// Cargar depósitos
async function loadDepositos() {
  try {
    const response = await fetch('http://localhost:5000/api/depositos', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const depositos = await response.json();
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
  } catch (err) {
    console.error('Error al cargar depósitos:', err);
    alert('Error al cargar depósitos');
  }
}

// Cargar órdenes
async function loadOrdenes() {
  try {
    const response = await fetch('http://localhost:5000/api/ordenes', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const ordenes = await response.json();
    const container = document.getElementById('ordenes-container');
    container.innerHTML = '';
    ordenes.forEach(orden => {
      const div = document.createElement('div');
      div.className = 'orden';
      let itemsList = orden.items.map(item => `
        ${item.descripcion} - ${item.cantidad} ${item.unidad_medida} 
        (Precio: $${item.precio_unitario.toFixed(2)}, Subtotal: $${item.subtotal.toFixed(2)})
      `).join('<br>');
      div.innerHTML = `
        <p><strong>Orden #${orden._id}</strong> - ${orden.proyecto} (${orden.estado})</p>
        <p>Ubicación: ${orden.ubicacion}</p>
        <p>Depósito: ${orden.deposito?.nombre || 'Desconocido'}</p>
        <p>Ítems:<br>${itemsList}</p>
        <p>Total estimado: $${orden.total_estimado.toFixed(2)}</p>
        <p>Creado por: ${orden.creado_por?.username || 'Desconocido'}</p>
        ${orden.modificado_por ? `<p>Modificado por: ${orden.modificado_por?.username || 'Desconocido'} (${new Date(orden.fecha_modificacion).toLocaleString()})</p>` : ''}
        ${orden.cotizado_por ? `<p>Cotizado por: ${orden.cotizado_por?.username || 'Desconocido'}</p>` : ''}
        ${orden.comentarios_cotizacion ? `<p>Comentarios de Cotización: ${orden.comentarios_cotizacion}</p>` : ''}
        ${orden.aprobado_por ? `<p>Aprobado por: ${orden.aprobado_por?.username || 'Desconocido'}</p>` : ''}
        ${orden.rechazado_por ? `<p>Rechazado por: ${orden.rechazado_por?.username || 'Desconocido'}</p>` : ''}
        ${orden.razon_rechazo ? `<p><strong>Razón del rechazo:</strong> ${orden.razon_rechazo}</p>` : ''}
        ${orden.factura ? `<p>Factura: ${orden.factura}</p>` : ''}
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
        ` : ''}
        ${role === 'Gerente' && (orden.estado === 'Pendiente' || orden.estado === 'Cotizada' || orden.estado === 'Modificada') ? `
          <input type="text" id="razon-rechazo-${orden._id}" placeholder="Razón del rechazo">
          <button onclick="rejectOrden('${orden._id}')">Rechazar</button>
          <button onclick="approveOrden('${orden._id}')">Aprobar</button>
        ` : ''}
        ${role === 'Gerente' && (orden.estado === 'Rechazada' || orden.estado === 'Aprobada' || orden.estado === 'Completada' ) ? `
          <button onclick="deleteOrden('${orden._id}')">Eliminar Orden</button>
        ` : ''}
      `;
      container.appendChild(div);
    });
  } catch (err) {
    console.error('Error al cargar órdenes:', err);
    alert('Error al cargar órdenes');
  }
}

// Añadir fila de ítem
function addItemRow() {
  const itemsContainer = document.getElementById('items');
  const row = document.createElement('div');
  row.className = 'item-row';
  row.innerHTML = `
    <input type="text" class="item-descripcion" placeholder="Descripción" required>
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
  const items = [];
  const itemRows = document.querySelectorAll('.item-row');
  itemRows.forEach(row => {
    const descripcion = row.querySelector('.item-descripcion').value;
    const cantidad = parseInt(row.querySelector('.item-cantidad').value);
    const unidad_medida = row.querySelector('.item-unidad').value;
    if (descripcion && cantidad > 0 && unidad_medida) {
      items.push({ descripcion, cantidad, unidad_medida });
    }
  });

  if (!proyecto || !ubicacion || !deposito || items.length === 0) {
    alert('Por favor, completa todos los campos y añade al menos un ítem válido.');
    return;
  }

  fetch('http://localhost:5000/api/ordenes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ proyecto, ubicacion, deposito, items })
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
    const response = await fetch(`http://localhost:5000/api/ordenes/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const orden = await response.json();

    document.getElementById('orden-id').value = orden._id;
    document.getElementById('proyecto').value = orden.proyecto;
    document.getElementById('ubicacion').value = orden.ubicacion;
    document.getElementById('deposito').value = orden.deposito._id;
    document.getElementById('observaciones').value = orden.observaciones || '';

    const itemsContainer = document.getElementById('items-container');
    itemsContainer.innerHTML = '';
    orden.items.forEach(item => {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'item';
      itemDiv.innerHTML = `
        <input type="text" class="descripcion" value="${item.descripcion}" placeholder="Descripción">
        <input type="text" class="codigo" value="${item.codigo || ''}" placeholder="Código">
        <input type="number" class="cantidad" value="${item.cantidad}" placeholder="Cantidad" min="1">
        <input type="text" class="unidad_medida" value="${item.unidad_medida}" placeholder="Unidad">
        <input type="number" class="precio_unitario" value="${item.precio_unitario}" placeholder="Precio Unitario" step="0.01">
        <input type="number" class="subtotal" value="${item.subtotal}" placeholder="Subtotal" readonly>
        <button onclick="removeItem(this)">Eliminar</button>
      `;
      itemsContainer.appendChild(itemDiv);
    });

    document.getElementById('orden-form').onsubmit = async (e) => {
      e.preventDefault();
      const items = Array.from(document.querySelectorAll('.item')).map(item => ({
        descripcion: item.querySelector('.descripcion').value,
        codigo: item.querySelector('.codigo').value || undefined,
        cantidad: parseInt(item.querySelector('.cantidad').value),
        unidad_medida: item.querySelector('.unidad_medida').value,
        precio_unitario: parseFloat(item.querySelector('.precio_unitario').value) || 0,
        subtotal: parseFloat(item.querySelector('.subtotal').value) || 0
      }));

      try {
        const response = await fetch(`http://localhost:5000/api/ordenes/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            proyecto: document.getElementById('proyecto').value,
            ubicacion: document.getElementById('ubicacion').value,
            deposito: document.getElementById('deposito').value,
            observaciones: document.getElementById('observaciones').value,
            items
          })
        });

        if (response.ok) {
          alert('Orden modificada exitosamente');
          loadOrdenes();
        } else {
          const error = await response.json();
          alert(`Error: ${error.error}`);
        }
      } catch (err) {
        console.error('Error al modificar orden:', err);
        alert('Error al modificar orden');
      }
    };
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
  const items = [];
  const itemRows = document.querySelectorAll('.item-row');
  itemRows.forEach(row => {
    const descripcion = row.querySelector('.item-descripcion').value;
    const cantidad = parseInt(row.querySelector('.item-cantidad').value);
    const unidad_medida = row.querySelector('.item-unidad').value;
    if (descripcion && cantidad > 0 && unidad_medida) {
      items.push({ descripcion, cantidad, unidad_medida });
    }
  });

  if (!proyecto || !ubicacion || !deposito || items.length === 0) {
    alert('Por favor, completa todos los campos y añade al menos un ítem válido.');
    return;
  }

  fetch(`http://localhost:5000/api/ordenes/${currentOrdenId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ proyecto, ubicacion, deposito, items })
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
  try {
    const response = await fetch(`http://localhost:5000/api/ordenes/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const orden = await response.json();

    const itemsContainer = document.getElementById('items-container');
    itemsContainer.innerHTML = '';
    orden.items.forEach(item => {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'item';
      itemDiv.innerHTML = `
        <input type="text" class="descripcion" value="${item.descripcion}" readonly>
        <input type="text" class="codigo" value="${item.codigo || ''}" readonly>
        <input type="number" class="cantidad" value="${item.cantidad}" readonly>
        <input type="text" class="unidad_medida" value="${item.unidad_medida}" readonly>
        <input type="number" class="precio_unitario" value="${item.precio_unitario}" placeholder="Precio Unitario" step="0.01">
        <input type="number" class="subtotal" value="${item.subtotal}" placeholder="Subtotal" readonly>
      `;
      itemsContainer.appendChild(itemDiv);
    });

    // Añadir campo para comentarios
    const comentariosDiv = document.createElement('div');
    comentariosDiv.innerHTML = `
      <label for="comentarios-cotizacion">Comentarios de Cotización:</label>
      <textarea id="comentarios-cotizacion" placeholder="Añade comentarios para el gerente"></textarea>
    `;
    itemsContainer.appendChild(comentariosDiv);

    document.getElementById('orden-form').onsubmit = async (e) => {
      e.preventDefault();
      const items = Array.from(document.querySelectorAll('.item')).map(item => ({
        descripcion: item.querySelector('.descripcion').value,
        codigo: item.querySelector('.codigo').value || undefined,
        cantidad: parseInt(item.querySelector('.cantidad').value),
        unidad_medida: item.querySelector('.unidad_medida').value,
        precio_unitario: parseFloat(item.querySelector('.precio_unitario').value) || 0,
        subtotal: parseFloat(item.querySelector('.subtotal').value) || 0
      }));

      try {
        const response = await fetch(`http://localhost:5000/api/ordenes/cotizar/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            items,
            comentarios_cotizacion: document.getElementById('comentarios-cotizacion').value
          })
        });

        if (response.ok) {
          alert('Orden cotizada exitosamente');
          loadOrdenes();
        } else {
          const error = await response.json();
          alert(`Error: ${error.error}`);
        }
      } catch (err) {
        console.error('Error al cotizar orden:', err);
        alert('Error al cotizar orden');
      }
    };
  } catch (err) {
    console.error('Error al cargar orden:', err);
    alert('Error al cargar orden');
  }
}

// Guardar cotización
function saveCotizacion() {
  const items = [];
  const itemRows = document.querySelectorAll('#cotizar-items .item-row');
  itemRows.forEach(row => {
    const precio = parseFloat(row.querySelector('.item-precio').value);
    const index = parseInt(row.querySelector('.item-precio').dataset.index);
    if (!isNaN(precio) && precio >= 0) {
      items.push({ index, precio_unitario: precio });
    }
  });

  if (items.length === 0) {
    alert('Por favor, ingresa al menos un precio válido.');
    return;
  }

  fetch(`http://localhost:5000/api/ordenes/cotizar/${currentOrdenId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ items })
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        console.error('Error al cotizar orden:', data.error);
        alert(data.error);
        return;
      }
      alert('Orden cotizada exitosamente');
      document.getElementById('cotizar-orden-details').innerHTML = '';
      document.getElementById('cotizar-items').innerHTML = '';
      document.getElementById('save-cotizacion').style.display = 'none';
      currentOrdenId = null;
      loadOrdenes();
    })
    .catch(err => {
      console.error('Error:', err);
      alert('Error al cotizar orden');
    });
}

// Cargar factura
function showFacturaForm(id) {
  currentOrdenId = id;
  document.getElementById('factura-form').style.display = 'block';
}

function uploadFactura() {
  const factura = document.getElementById('factura').value;
  if (!factura) {
    alert('Por favor, ingresa un número de factura.');
    return;
  }

  fetch(`http://localhost:5000/api/ordenes/factura/${currentOrdenId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ factura })
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        console.error('Error al cargar factura:', data.error);
        alert(data.error);
        return;
      }
      alert('Factura cargada exitosamente');
      document.getElementById('factura').value = '';
      document.getElementById('factura-form').style.display = 'none';
      currentOrdenId = null;
      loadOrdenes();
    })
    .catch(err => {
      console.error('Error:', err);
      alert('Error al cargar factura');
    });
}

// Rechazar orden
function rejectOrden(id) {
  const razon_rechazo = document.getElementById(`razon-rechazo-${id}`).value;
  if (!razon_rechazo) {
    alert('Por favor, proporciona una razón para el rechazo.');
    return;
  }

  fetch(`http://localhost:5000/api/ordenes/rechazar/${id}`, {
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
  fetch(`http://localhost:5000/api/ordenes/aprobar/${id}`, {
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
function generatePDF(id) {
  window.open(`http://localhost:5000/api/reportes/orden/${id}?token=${token}`, '_blank');
}

// Generar PDF de stock
function generateStockPDF() {
  window.open(`http://localhost:5000/api/reportes/stock?token=${token}`, '_blank');
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
    const response = await fetch('http://localhost:5000/api/depositos', {
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
    const response = await fetch('http://localhost:5000/api/depositos', {
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
  fetch(`http://localhost:5000/api/depositos/${id}`, {
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
    const response = await fetch('http://localhost:5000/api/depositos/mover-stock', {
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
  } catch (err) {
    console.error('Error:', err);
    alert('Error al mover stock');
  }
}

// Reiniciar formulario
function resetForm() {
  document.getElementById('proyecto').value = '';
  document.getElementById('ubicacion').value = '';
  document.getElementById('deposito').value = '';
  document.getElementById('items').innerHTML = `
    <div class="item-row">
      <input type="text" class="item-descripcion" placeholder="Descripción" required>
      <input type="number" class="item-cantidad" placeholder="Cantidad" required min="1">
      <input type="text" class="item-unidad" placeholder="Unidad" required>
      <button onclick="this.parentElement.remove()">Eliminar</button>
    </div>
  `;
  document.getElementById('create-orden').style.display = 'inline';
  document.getElementById('save-orden').style.display = 'none';
  currentOrdenId = null;
}
// delete borrar orden
async function deleteOrden(id) {
  if (!confirm('¿Estás seguro de que deseas eliminar esta orden?')) return;

  try {
    const response = await fetch(`http://localhost:5000/api/ordenes/${id}`, {
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