// Variables globales
let token = null;
let role = null;
let currentEmpleados = [];
let currentRosters = [];
let empleadosChart = null;
let rostersChart = null;

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
    console.log('Login exitoso:', { token, role });
    if (role !== 'Gerente') {
      alert('Acceso denegado. Solo los Gerentes pueden acceder a esta página.');
      return;
    }
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('rrhh-content').style.display = 'block';
    loadEmpleados();
    loadRosters();
  } catch (err) {
    console.error('Error al iniciar sesión:', err);
    alert('Error al iniciar sesión');
  }
}

// Cerrar sesión
function logout() {
  token = null;
  role = null;
  currentEmpleados = [];
  currentRosters = [];
  if (empleadosChart) empleadosChart.destroy();
  if (rostersChart) rostersChart.destroy();
  document.getElementById('login-form').style.display = 'block';
  document.getElementById('rrhh-content').style.display = 'none';
}

// Cargar empleados con filtros
async function loadEmpleados() {
  const rol = document.getElementById('filter-rol').value;
  const estado = document.getElementById('filter-estado').value;
  const proyecto = document.getElementById('filter-proyecto').value;
  const query = new URLSearchParams({ rol, estado, proyecto }).toString();

  try {
    const response = await fetch(`http://localhost:5000/api/empleados?${query}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Respuesta al cargar empleados:', response.status, response.statusText);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Error al cargar empleados (Código: ${response.status})`);
    }
    currentEmpleados = await response.json();
    console.log('Empleados cargados:', currentEmpleados);
    const tbody = document.getElementById('empleados-body');
    tbody.innerHTML = '';
    currentEmpleados.forEach(empleado => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${empleado.nombre}</td>
        <td>${empleado.apellido}</td>
        <td>${empleado.dni}</td>
        <td>${empleado.rol}</td>
        <td>${empleado.estado}</td>
        <td>${empleado.proyecto || ''}</td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="showEditEmpleadoModal('${empleado._id}')">Editar</button>
          <button class="btn btn-sm btn-danger" onclick="deleteEmpleado('${empleado._id}')">Baja</button>
          <button class="btn btn-sm btn-info" onclick="showAddLicenciaModal('${empleado._id}')">Licencia</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
    renderEmpleadosChart();
  } catch (err) {
    console.error('Error al cargar empleados:', err);
    alert(`Error al cargar empleados: ${err.message}`);
  }
}

// Renderizar gráfico de empleados por estado
function renderEmpleadosChart() {
  const ctx = document.getElementById('empleadosChart').getContext('2d');
  const estados = ['activo', 'descanso', 'licencia', 'baja'];
  const counts = estados.map(estado => 
    currentEmpleados.filter(emp => emp.estado === estado).length
  );

  if (empleadosChart) empleadosChart.destroy();
  empleadosChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Activo', 'Descanso', 'Licencia', 'Baja'],
      datasets: [{
        data: counts,
        backgroundColor: ['#28a745', '#ffc107', '#dc3545', '#6c757d']
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
      position: 'top',
      labels: {
        color: 'black' // ✅ Color de las etiquetas de la leyenda
      }
    },
        title: { display: true,
      text: 'Empleados por Estado',
      color: 'black' }
      }
    }
  });
}

// Exportar empleados a Excel
function exportEmpleadosToExcel() {
  if (!currentEmpleados.length) {
    alert('No hay empleados para exportar.');
    return;
  }

  const data = currentEmpleados.map(empleado => ({
    Nombre: empleado.nombre,
    Apellido: empleado.apellido,
    DNI: empleado.dni,
    Rol: empleado.rol,
    Estado: empleado.estado,
    Proyecto: empleado.proyecto || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Empleados');
  XLSX.writeFile(workbook, 'empleados.xlsx');
}

// Exportar empleados a PDF
function exportEmpleadosToPDF() {
  if (!currentEmpleados.length) {
    alert('No hay empleados para exportar.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.text('Informe de Empleados', 14, 20);

  const rol = document.getElementById('filter-rol').value;
  const estado = document.getElementById('filter-estado').value;
  const proyecto = document.getElementById('filter-proyecto').value;
  let filterText = 'Filtros aplicados: ';
  filterText += rol ? `Rol: ${rol}, ` : '';
  filterText += estado ? `Estado: ${estado}, ` : '';
  filterText += proyecto ? `Proyecto: ${proyecto}` : '';
  if (!rol && !estado && !proyecto) filterText = 'Sin filtros aplicados';
  doc.text(filterText, 14, 30);

  const tableData = currentEmpleados.map(empleado => [
    empleado.nombre,
    empleado.apellido,
    empleado.dni,
    empleado.rol,
    empleado.estado,
    empleado.proyecto || ''
  ]);

  doc.autoTable({
    head: [['Nombre', 'Apellido', 'DNI', 'Rol', 'Estado', 'Proyecto']],
    body: tableData,
    startY: 40,
    theme: 'grid',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [0, 102, 204] }
  });

  doc.save('empleados.pdf');
}

// Cargar rosters con filtros
async function loadRosters() {
  const proyecto = document.getElementById('filter-proyecto-roster').value;
  const query = new URLSearchParams({ proyecto }).toString();

  try {
    const response = await fetch(`http://localhost:5000/api/rosters?${query}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Respuesta al cargar rosters:', response.status, response.statusText);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Error al cargar rosters (Código: ${response.status})`);
    }
    currentRosters = await response.json();
    console.log('Rosters cargados:', currentRosters);
    const tbody = document.getElementById('rosters-body');
    tbody.innerHTML = '';
    currentRosters.forEach(roster => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${roster.nombre}</td>
        <td>${new Date(roster.fecha_inicio).toLocaleDateString('es-ES')}</td>
        <td>${new Date(roster.fecha_fin).toLocaleDateString('es-ES')}</td>
        <td>${roster.proyecto || ''}</td>
        <td>${roster.empleados.map(e => `${e.nombre} ${e.apellido}`).join(', ')}</td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="showEditRosterModal('${roster._id}')">Editar</button>
          <button class="btn btn-sm btn-danger" onclick="deleteRoster('${roster._id}')">Eliminar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
    renderRostersChart();
  } catch (err) {
    console.error('Error al cargar rosters:', err);
    alert(`Error al cargar rosters: ${err.message}`);
  }
}

// Renderizar gráfico de rosters por proyecto
function renderRostersChart() {
  const ctx = document.getElementById('rostersChart').getContext('2d');
  const proyectos = [...new Set(currentRosters.map(roster => roster.proyecto || 'Sin Proyecto'))];
  const counts = proyectos.map(proyecto => 
    currentRosters.filter(roster => (roster.proyecto || 'Sin Proyecto') === proyecto).length
  );

  if (rostersChart) rostersChart.destroy();
  rostersChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: proyectos,
      datasets: [{
        label: 'Número de Rosters',
        data: counts,
        backgroundColor: '#28a745'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: 'black' // ✅ Letras negras en la leyenda
          }
        },
        title: {
          display: true,
          text: 'Rosters por Proyecto',
          color: 'black' // ✅ Letras negras en el título
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          precision: 0,
          ticks: {
            color: 'black' // ✅ Letras negras en eje Y
          }
        },
        x: {
          ticks: {
            color: 'black' // ✅ Letras negras en eje X
          }
        }
      }
    }
  });
}

// Exportar rosters a Excel
function exportRostersToExcel() {
  if (!currentRosters.length) {
    alert('No hay rosters para exportar.');
    return;
  }

  const data = currentRosters.map(roster => ({
    Nombre: roster.nombre,
    'Fecha Inicio': new Date(roster.fecha_inicio).toLocaleDateString('es-ES'),
    'Fecha Fin': new Date(roster.fecha_fin).toLocaleDateString('es-ES'),
    Proyecto: roster.proyecto || '',
    Empleados: roster.empleados.map(e => `${e.nombre} ${e.apellido}`).join(', ')
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Rosters');
  XLSX.writeFile(workbook, 'rosters.xlsx');
}

// Exportar rosters a PDF
function exportRostersToPDF() {
  if (!currentRosters.length) {
    alert('No hay rosters para exportar.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.text('Informe de Rosters', 14, 20);

  const proyecto = document.getElementById('filter-proyecto-roster').value;
  const filterText = proyecto ? `Filtro aplicado: Proyecto: ${proyecto}` : 'Sin filtros aplicados';
  doc.text(filterText, 14, 30);

  const tableData = currentRosters.map(roster => [
    roster.nombre,
    new Date(roster.fecha_inicio).toLocaleDateString('es-ES'),
    new Date(roster.fecha_fin).toLocaleDateString('es-ES'),
    roster.proyecto || '',
    roster.empleados.map(e => `${e.nombre} ${e.apellido}`).join(', ')
  ]);

  doc.autoTable({
    head: [['Nombre', 'Fecha Inicio', 'Fecha Fin', 'Proyecto', 'Empleados']],
    body: tableData,
    startY: 40,
    theme: 'grid',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [0, 102, 204] }
  });

  doc.save('rosters.pdf');
}

// Mostrar modal para agregar empleado
function showAddEmpleadoModal() {
  document.getElementById('empleadoModalTitle').textContent = 'Agregar Empleado';
  document.getElementById('empleadoForm').reset();
  document.getElementById('empleadoId').value = '';
  $('#empleadoModal').modal('show');
}

// Mostrar modal para editar empleado
async function showEditEmpleadoModal(id) {
  try {
    const response = await fetch(`http://localhost:5000/api/empleados/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Respuesta al cargar empleado:', response.status, response.statusText);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Error al cargar empleado (Código: ${response.status})`);
    }
    const empleado = await response.json();
    console.log('Empleado cargado para edición:', empleado);
    document.getElementById('empleadoModalTitle').textContent = 'Editar Empleado';
    document.getElementById('empleadoId').value = empleado._id;
    document.getElementById('nombre').value = empleado.nombre;
    document.getElementById('apellido').value = empleado.apellido;
    document.getElementById('dni').value = empleado.dni;
    document.getElementById('rol').value = empleado.rol;
    document.getElementById('estado').value = empleado.estado;
    document.getElementById('proyecto').value = empleado.proyecto || '';
    $('#empleadoModal').modal('show');
  } catch (err) {
    console.error('Error al cargar empleado:', err);
    alert(`Error al cargar empleado: ${err.message}`);
  }
}

// Guardar empleado
async function saveEmpleado() {
  const id = document.getElementById('empleadoId').value;
  const empleado = {
    nombre: document.getElementById('nombre').value,
    apellido: document.getElementById('apellido').value,
    dni: document.getElementById('dni').value,
    rol: document.getElementById('rol').value,
    estado: document.getElementById('estado').value,
    proyecto: document.getElementById('proyecto').value || undefined
  };

  try {
    const method = id ? 'PUT' : 'POST';
    const url = id ? `http://localhost:5000/api/empleados/${id}` : 'http://localhost:5000/api/empleados';
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(empleado)
    });
    console.log('Respuesta al guardar empleado:', response.status, response.statusText);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Error al guardar empleado (Código: ${response.status})`);
    }
    $('#empleadoModal').modal('hide');
    loadEmpleados();
    alert(id ? 'Empleado actualizado exitosamente' : 'Empleado creado exitosamente');
  } catch (err) {
    console.error('Error al guardar empleado:', err);
    alert(`Error al guardar empleado: ${err.message}`);
  }
}

// Dar de baja empleado
async function deleteEmpleado(id) {
  if (!confirm('¿Confirmar baja del empleado?')) return;
  try {
    const response = await fetch(`http://localhost:5000/api/empleados/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Respuesta al dar de baja empleado:', response.status, response.statusText);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Error al dar de baja empleado (Código: ${response.status})`);
    }
    loadEmpleados();
    alert('Empleado dado de baja exitosamente');
  } catch (err) {
    console.error('Error al dar de baja empleado:', err);
    alert(`Error al dar de baja empleado: ${err.message}`);
  }
}

// Mostrar modal para agregar licencia
function showAddLicenciaModal(id) {
  document.getElementById('licenciaForm').reset();
  document.getElementById('licenciaEmpleadoId').value = id;
  $('#licenciaModal').modal('show');
}

// Guardar licencia
async function saveLicencia() {
  const id = document.getElementById('licenciaEmpleadoId').value;
  const licencia = {
    tipo: document.getElementById('tipo').value,
    fecha_inicio: document.getElementById('fecha_inicio').value,
    fecha_fin: document.getElementById('fecha_fin').value,
    comentarios: document.getElementById('comentarios').value || undefined
  };

  try {
    const response = await fetch(`http://localhost:5000/api/empleados/${id}/licencia`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(licencia)
    });
    console.log('Respuesta al guardar licencia:', response.status, response.statusText);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Error al guardar licencia (Código: ${response.status})`);
    }
    $('#licenciaModal').modal('hide');
    loadEmpleados();
    alert('Licencia registrada exitosamente');
  } catch (err) {
    console.error('Error al guardar licencia:', err);
    alert(`Error al guardar licencia: ${err.message}`);
  }
}

// Mostrar modal para crear roster
async function showAddRosterModal() {
  document.getElementById('rosterModalTitle').textContent = 'Crear Roster';
  document.getElementById('rosterForm').reset();
  document.getElementById('rosterId').value = '';
  await loadEmpleadosSelect();
  $('#rosterModal').modal('show');
  setTimeout(() => {
    $('#rosterEmpleados').selectpicker('refresh');
    console.log('Bootstrap Select refrescado para nuevo roster');
    console.log('Contenido del select:', document.getElementById('rosterEmpleados').innerHTML);
  }, 500);
}

// Mostrar modal para editar roster
async function showEditRosterModal(id) {
  try {
    const response = await fetch(`http://localhost:5000/api/rosters/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Respuesta al cargar roster:', response.status, response.statusText);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Error al cargar roster (Código: ${response.status})`);
    }
    const roster = await response.json();
    console.log('Roster cargado para edición:', roster);
    document.getElementById('rosterModalTitle').textContent = 'Editar Roster';
    document.getElementById('rosterId').value = roster._id;
    document.getElementById('rosterNombre').value = roster.nombre;
    document.getElementById('rosterFechaInicio').value = new Date(roster.fecha_inicio).toISOString().split('T')[0];
    document.getElementById('rosterFechaFin').value = new Date(roster.fecha_fin).toISOString().split('T')[0];
    document.getElementById('rosterProyecto').value = roster.proyecto || '';
    await loadEmpleadosSelect(roster.empleados.map(e => e._id.toString()));
    $('#rosterModal').modal('show');
    setTimeout(() => {
      $('#rosterEmpleados').selectpicker('refresh');
      console.log('Bootstrap Select refrescado para edición de roster');
      console.log('Contenido del select:', document.getElementById('rosterEmpleados').innerHTML);
    }, 500);
  } catch (err) {
    console.error('Error al cargar roster:', err);
    alert(`Error al cargar roster: ${err.message}`);
  }
}

// Cargar empleados en el select múltiple con validaciones
async function loadEmpleadosSelect(selected = []) {
  const rosterId = document.getElementById('rosterId').value;
  const fechaInicio = document.getElementById('rosterFechaInicio').value;
  const fechaFin = document.getElementById('rosterFechaFin').value;
  const startDate = fechaInicio ? new Date(fechaInicio) : null;
  const endDate = fechaFin ? new Date(fechaFin) : null;

  try {
    console.log('Iniciando carga de empleados para select, preseleccionados:', selected);
    const response = await fetch('http://localhost:5000/api/empleados?estado=activo', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Respuesta del servidor:', response.status, response.statusText);
    if (!response.ok) {
      const error = await response.json();
      console.error('Error en la respuesta:', error);
      throw new Error(error.error || `Error al cargar empleados para roster (Código: ${response.status})`);
    }
    let empleados = await response.json();
    console.log('Empleados recibidos:', empleados);

    // Filtrar empleados en licencia o con rosters superpuestos
    if (startDate && endDate) {
      const allRosters = await fetch('http://localhost:5000/api/rosters', {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(res => res.json());
      const allLicencias = await fetch('http://localhost:5000/api/empleados/licencias', {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(res => res.json());

      empleados = empleados.filter(empleado => {
        // Excluir empleados en licencia durante el período del roster
        const enLicencia = allLicencias.some(licencia => 
          licencia.empleado.toString() === empleado._id.toString() &&
          new Date(licencia.fecha_inicio) <= endDate &&
          new Date(licencia.fecha_fin) >= startDate
        );
        if (enLicencia) {
          console.log(`Empleado ${empleado.nombre} ${empleado.apellido} excluido por estar en licencia`);
          return false;
        }

        // Excluir empleados asignados a rosters superpuestos (excepto el roster actual)
        const enRosterSuperpuesto = allRosters.some(roster => {
          if (roster._id.toString() === rosterId) return false; // Ignorar el roster actual
          const rosterStart = new Date(roster.fecha_inicio);
          const rosterEnd = new Date(roster.fecha_fin);
          const isOverlap = 
            (startDate <= rosterEnd && endDate >= rosterStart) &&
            !(endDate.toDateString() === rosterStart.toDateString() || startDate.toDateString() === rosterEnd.toDateString());
          return isOverlap && roster.empleados.some(e => e._id.toString() === empleado._id.toString());
        });
        if (enRosterSuperpuesto) {
          console.log(`Empleado ${empleado.nombre} ${empleado.apellido} excluido por roster superpuesto`);
          return false;
        }

        return true;
      });
    }

    const select = document.getElementById('rosterEmpleados');
    if (!select) {
      console.error('Elemento rosterEmpleados no encontrado en el DOM');
      alert('Error: Elemento de selección de empleados no encontrado');
      return;
    }

    select.innerHTML = '';
    if (!Array.isArray(empleados) || empleados.length === 0) {
      select.innerHTML = '<option value="" disabled>No hay empleados disponibles</option>';
      console.warn('No se encontraron empleados disponibles');
      alert('No hay empleados disponibles para asignar al roster');
    } else {
      empleados.forEach(empleado => {
        const option = document.createElement('option');
        option.value = empleado._id;
        option.textContent = `${empleado.nombre} ${empleado.apellido} (${empleado.rol})`;
        option.selected = selected.includes(empleado._id.toString());
        select.appendChild(option);
      });
      console.log('Opciones añadidas al select:', select.options.length);
    }

    $('#rosterEmpleados').selectpicker('destroy');
    $('#rosterEmpleados').selectpicker({
      noneSelectedText: 'Selecciona empleados',
      selectAllText: 'Seleccionar todos',
      deselectAllText: 'Deseleccionar todos',
      actionsBox: true,
      liveSearch: true
    });
    console.log('Bootstrap Select inicializado');
    setTimeout(() => {
      $('#rosterEmpleados').selectpicker('refresh');
      console.log('Bootstrap Select refrescado');
      console.log('Contenido del select después de refresco:', document.getElementById('rosterEmpleados').innerHTML);
    }, 500);
  } catch (err) {
    console.error('Error al cargar empleados para roster:', err);
    alert(`Error al cargar empleados para roster: ${err.message}`);
  }
}

// Guardar roster
async function saveRoster() {
  const id = document.getElementById('rosterId').value;
  const fechaInicio = document.getElementById('rosterFechaInicio').value;
  const fechaFin = document.getElementById('rosterFechaFin').value;
  if (new Date(fechaFin) <= new Date(fechaInicio)) {
    alert('La fecha de fin debe ser posterior a la fecha de inicio.');
    return;
  }
  const roster = {
    nombre: document.getElementById('rosterNombre').value,
    fecha_inicio: fechaInicio,
    fecha_fin: fechaFin,
    proyecto: document.getElementById('rosterProyecto').value || undefined,
    empleados: Array.from(document.getElementById('rosterEmpleados').selectedOptions).map(option => option.value)
  };

  console.log('Guardando roster:', roster);

  try {
    const method = id ? 'PUT' : 'POST';
    const url = id ? `http://localhost:5000/api/rosters/${id}` : 'http://localhost:5000/api/rosters';
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(roster)
    });
    console.log('Respuesta al guardar roster:', response.status, response.statusText);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Error al guardar roster (Código: ${response.status})`);
    }
    $('#rosterModal').modal('hide');
    loadRosters();
    alert(id ? 'Roster actualizado exitosamente' : 'Roster creado exitosamente');
  } catch (err) {
    console.error('Error al guardar roster:', err);
    alert(`Error al guardar roster: ${err.message}`);
  }
}

// Eliminar roster
async function deleteRoster(id) {
  if (!confirm('¿Confirmar eliminación del roster?')) return;
  try {
    const response = await fetch(`http://localhost:5000/api/rosters/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Respuesta al eliminar roster:', response.status, response.statusText);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Error al eliminar roster (Código: ${response.status})`);
    }
    loadRosters();
    alert('Roster eliminado exitosamente');
  } catch (err) {
    console.error('Error al eliminar roster:', err);
    alert(`Error al eliminar roster: ${err.message}`);
  }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  console.log('rrhh.js cargado');
  document.getElementById('add-empleado-btn').addEventListener('click', showAddEmpleadoModal);
  document.getElementById('add-roster-btn').addEventListener('click', showAddRosterModal);
});