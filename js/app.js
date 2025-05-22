(() => {
  const taskForm = document.getElementById('taskForm');
  const taskInput = document.getElementById('taskInput');
  const taskList = document.getElementById('taskList');
  const searchInput = document.getElementById('searchInput');
  const dateFromInput = document.getElementById('dateFrom');
  const dateToInput = document.getElementById('dateTo');

  const totalTasksElem = document.getElementById('totalTasks');
  const leadTimeElem = document.getElementById('leadTime');
  const progressPercentElem = document.getElementById('progressPercent');
  const progressCircle = document.getElementById('progressCircle');
  const leadtimeFill = document.getElementById('leadtimeFill');

  const STATUS = ["Pendiente", "En progreso", "Resuelto"];
  let tasks = [];

  // Formatear fecha para mostrar: DD/MM/YYYY HH:mm
  function formatDate(isoString) {
    const d = new Date(isoString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hour = String(d.getHours()).padStart(2, '0');
    const minute = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hour}:${minute}`;
  }

  // Load tasks from localStorage or default to empty array
  function loadTasks() {
    const saved = localStorage.getItem('tasks');
    tasks = saved ? JSON.parse(saved) : [];
  }

  // Save tasks to localStorage
  function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }

  // Filter tasks based on search query (text) and date range (dateFrom, dateTo)
  // Matches if description includes search text (case-insensitive) AND
  // createdAt or updatedAt is within date range if set
  function getFilteredTasks() {
    const query = searchInput.value.trim().toLowerCase();
    const dateFrom = dateFromInput.value ? new Date(dateFromInput.value) : null;
    const dateTo = dateToInput.value ? new Date(dateToInput.value) : null;

    return tasks.filter(task => {
      // Text filter
      const matchText = !query || task.description.toLowerCase().includes(query);

      // Date filter
      if (!dateFrom && !dateTo) return matchText;

      const created = new Date(task.createdAt);
      const updated = new Date(task.updatedAt);

      // Check if either created or updated falls in range
      let inRange = false;
      if (dateFrom && dateTo) {
        inRange = (created >= dateFrom && created <= dateTo) || (updated >= dateFrom && updated <= dateTo);
      } else if (dateFrom) {
        inRange = (created >= dateFrom) || (updated >= dateFrom);
      } else if (dateTo) {
        inRange = (created <= dateTo) || (updated <= dateTo);
      }

      return matchText && inRange;
    });
  }

  // Calculate lead time in hours average for resolved tasks
  // Lead time = difference between createdAt and updatedAt for Resuelto tasks
  function calculateLeadTime() {
    const resolvedTasks = tasks.filter(t => t.status === "Resuelto");
    if (resolvedTasks.length === 0) return 0;
    const totalMs = resolvedTasks.reduce((acc, t) => {
      const created = new Date(t.createdAt);
      const updated = new Date(t.updatedAt);
      return acc + (updated - created);
    }, 0);
    const avgMs = totalMs / resolvedTasks.length;
    return (avgMs / (1000 * 60 * 60)).toFixed(1); // hours 1 decimal
  }

  // Calculate percent progress considering Resuelto tasks over total
  function calculateProgressPercent() {
    if (tasks.length === 0) return 0;
    const resolvedCount = tasks.filter(t => t.status === "Resuelto").length;
    return Math.round((resolvedCount / tasks.length) * 100);
  }

  // Update circular progress stroke based on percent
  function updateProgressCircle(percent) {
    const radius = 16;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;
    progressCircle.style.strokeDasharray = `${circumference}`;
    progressCircle.style.strokeDashoffset = `${offset}`;
  }

  // Update leadtime fill bar and color based on lead time
  function updateLeadtimeBar(hours) {
    // Max 48 hours for full bar; clamp
    const maxHours = 48;
    const clamped = Math.min(hours, maxHours);
    const percent = (clamped / maxHours) * 100;
    leadtimeFill.style.width = percent + '%';

    // Color from green (<12h) to orange (12-36) to red (>36)
    let color = '#27ae60';
    if (hours > 36) {
      color = '#e74c3c';
    } else if (hours > 12) {
      color = '#f39c12';
    }
    leadtimeFill.style.background = color;
  }

  // Update stats indicators
  function updateStats() {
    totalTasksElem.textContent = tasks.length.toString();
    const leadTimeVal = +calculateLeadTime();
    leadTimeElem.textContent = leadTimeVal.toFixed(1);
    progressPercentElem.textContent = calculateProgressPercent() + '%';
    updateProgressCircle(calculateProgressPercent());
    updateLeadtimeBar(leadTimeVal);
  }

  // Render the list of tasks with filter applied
  function renderTasks() {
    taskList.innerHTML = '';
    const filteredTasks = getFilteredTasks();
    if (filteredTasks.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'No hay tareas que coincidan con la búsqueda.';
      li.style.textAlign = 'center';
      li.style.color = '#7f8c8d';
      li.style.padding = '1rem';
      taskList.appendChild(li);
      updateStats();
      return;
    }

    filteredTasks.forEach(task => {
      const li = document.createElement('li');
      li.className = 'task-item';
      li.setAttribute('data-id', task.id);
      li.setAttribute('data-status', task.status);

      const mainDiv = document.createElement('div');
      mainDiv.className = 'task-main';

      const desc = document.createElement('span');
      desc.className = 'task-desc';
      desc.textContent = task.description;

      mainDiv.appendChild(desc);

      const actions = document.createElement('div');
      actions.className = 'task-actions';

      // Status change button
      const btnStatus = document.createElement('button');
      btnStatus.className = 'btn btn-status';
      btnStatus.textContent = task.status === "Resuelto" ? "Reabrir" : "Siguiente Estado";
      btnStatus.setAttribute('aria-label', `Cambiar estado de la tarea "${task.description}"`);
      btnStatus.addEventListener('click', () => {
        changeStatus(task.id);
      });
      actions.appendChild(btnStatus);

      mainDiv.appendChild(actions);
      li.appendChild(mainDiv);

      // Dates display
      const datesDiv = document.createElement('div');
      datesDiv.className = 'task-dates';

      const createdDateText = `Creado: ${formatDate(task.createdAt)}`;
      const updatedDateText = `Última actualización: ${formatDate(task.updatedAt)}`;

      datesDiv.textContent = `${createdDateText} | ${updatedDateText}`;
      li.appendChild(datesDiv);

      taskList.appendChild(li);
    });
    updateStats();
  }

  // Add a new task
  function addTask(description) {
    if (!description.trim()) return;
    const now = new Date().toISOString();
    const newTask = {
      id: Date.now().toString(),
      description: description.trim(),
      status: "Pendiente",
      createdAt: now,
      updatedAt: now
    };
    tasks.push(newTask);
    saveTasks();
    renderTasks();
  }

  // Change status of task and update update date
  function changeStatus(taskId) {
    const idx = tasks.findIndex(t => t.id === taskId);
    if (idx === -1) return;
    const currentStatus = tasks[idx].status;
    if (currentStatus === "Pendiente") {
      tasks[idx].status = "En progreso";
    } else if (currentStatus === "En progreso") {
      tasks[idx].status = "Resuelto";
    } else if (currentStatus === "Resuelto") {
      tasks[idx].status = "Pendiente";
    }
    tasks[idx].updatedAt = new Date().toISOString();
    saveTasks();
    renderTasks();
  }

  // Handle form submit
  taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    addTask(taskInput.value);
    taskInput.value = '';
    taskInput.focus();
  });

  // Filter inputs event listeners
  function onFilterChange() {
    renderTasks();
  }
  searchInput.addEventListener('input', onFilterChange);
  dateFromInput.addEventListener('change', onFilterChange);
  dateToInput.addEventListener('change', onFilterChange);

  // Initial load and render
  loadTasks();
  renderTasks();
  taskInput.focus();
})();

