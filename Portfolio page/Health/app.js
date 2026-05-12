const STORAGE_KEY = "careflow-dashboard-state-v1";

const demoAppointments = [
  {
    id: crypto.randomUUID(),
    patient: "Ava Thompson",
    provider: "Dr. Malik",
    type: "Annual physical",
    time: "08:30",
    mode: "In person",
    priority: "Routine",
    notes: "Fasting bloodwork before consult.",
  },
  {
    id: crypto.randomUUID(),
    patient: "Noah Bennett",
    provider: "Dr. Rivera",
    type: "Telehealth",
    time: "09:15",
    mode: "Telehealth",
    priority: "Urgent",
    notes: "Review worsening asthma symptoms.",
  },
  {
    id: crypto.randomUUID(),
    patient: "Lila Foster",
    provider: "Dr. Chen",
    type: "Lab review",
    time: "10:00",
    mode: "In person",
    priority: "High risk",
    notes: "A1C trend check and medication update.",
  },
  {
    id: crypto.randomUUID(),
    patient: "Miles Carter",
    provider: "NP Jordan",
    type: "Vaccination",
    time: "11:45",
    mode: "In person",
    priority: "Routine",
    notes: "Bring prior immunization record.",
  },
  {
    id: crypto.randomUUID(),
    patient: "Sofia Patel",
    provider: "Dr. Malik",
    type: "Follow-up",
    time: "14:10",
    mode: "Telehealth",
    priority: "Routine",
    notes: "Post-op recovery check.",
  },
  {
    id: crypto.randomUUID(),
    patient: "Ethan Brooks",
    provider: "Dr. Rivera",
    type: "Follow-up",
    time: "15:30",
    mode: "In person",
    priority: "Urgent",
    notes: "Reassess blood pressure after medication change.",
  },
];

const queueItems = [
  { label: "Waiting room", value: 7, detail: "Average wait 11 min" },
  { label: "Lab turnaround", value: 4, detail: "Results pending review" },
  { label: "Telehealth ready", value: 3, detail: "Pre-check complete" },
];

const careTasks = [
  { title: "Call high-risk patients with missed follow-ups", owner: "Outreach team", due: "Before 1:00 PM" },
  { title: "Confirm imaging referrals for tomorrow morning", owner: "Front desk", due: "Within 2 hours" },
  { title: "Close charting gaps for discharged patients", owner: "Nurse station", due: "End of day" },
];

const defaultState = {
  theme: "ocean",
  compact: false,
  widgets: {
    capacity: true,
    alerts: true,
    tasks: true,
  },
  appointments: demoAppointments,
};

const state = loadState();

const appointmentList = document.getElementById("appointmentList");
const scheduleHeader = document.getElementById("scheduleHeader");
const queueList = document.getElementById("queueList");
const taskList = document.getElementById("taskList");
const providerGrid = document.getElementById("providerGrid");
const searchInput = document.getElementById("searchInput");
const themeSelect = document.getElementById("themeSelect");
const densityToggle = document.getElementById("densityToggle");
const widgetCheckboxes = document.querySelectorAll("[data-widget]");
const appointmentModal = document.getElementById("appointmentModal");
const appointmentForm = document.getElementById("appointmentForm");

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return structuredClone(defaultState);
  }

  try {
    const parsed = JSON.parse(saved);
    return {
      ...structuredClone(defaultState),
      ...parsed,
      widgets: {
        ...defaultState.widgets,
        ...parsed.widgets,
      },
      appointments: Array.isArray(parsed.appointments) && parsed.appointments.length
        ? parsed.appointments
        : structuredClone(defaultState.appointments),
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatFriendlyDate() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

function toMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function getPriorityClass(priority) {
  return priority.toLowerCase().replace(/\s+/g, "-");
}

function filteredAppointments() {
  const query = searchInput.value.trim().toLowerCase();
  return [...state.appointments]
    .sort((a, b) => toMinutes(a.time) - toMinutes(b.time))
    .filter((appointment) => {
      if (!query) {
        return true;
      }

      return [appointment.patient, appointment.provider, appointment.type, appointment.mode]
        .some((value) => value.toLowerCase().includes(query));
    });
}

function computeStats(appointments) {
  const urgentCount = appointments.filter((item) => item.priority !== "Routine").length;
  const telehealthCount = appointments.filter((item) => item.mode === "Telehealth").length;
  const providerLoad = appointments.reduce((accumulator, appointment) => {
    accumulator[appointment.provider] = (accumulator[appointment.provider] || 0) + 1;
    return accumulator;
  }, {});

  return {
    confirmed: Math.max(appointments.length * 3, 0),
    utilization: Math.min(appointments.length * 11 + 16, 97),
    openSlots: Math.max(16 - appointments.length, 0),
    alerts: urgentCount + (telehealthCount > 2 ? 1 : 0),
    providerLoad,
  };
}

function renderHeader(stats, visibleCount) {
  document.getElementById("todayDate").textContent = formatFriendlyDate();
  document.getElementById("todaySummary").textContent = `${state.appointments.length} scheduled visits and ${stats.alerts} care alerts to review.`;

  document.getElementById("statCheckins").textContent = stats.confirmed;
  document.getElementById("statUtilization").textContent = `${stats.utilization}%`;
  document.getElementById("statOpenSlots").textContent = stats.openSlots;
  document.getElementById("statAlerts").textContent = stats.alerts;

  scheduleHeader.innerHTML = `
    <span>${visibleCount} appointments visible</span>
    <span>${stats.openSlots} open slots remaining</span>
  `;
}

function renderAppointments() {
  const appointments = filteredAppointments();

  if (!appointments.length) {
    appointmentList.innerHTML = `
      <article class="schedule-item">
        <div class="schedule-main">
          <strong>No matches found</strong>
          <span class="schedule-meta">Try a different search term or add a new appointment.</span>
        </div>
      </article>
    `;
    return appointments;
  }

  appointmentList.innerHTML = appointments
    .map(
      (appointment) => `
        <article class="schedule-item">
          <div class="schedule-main">
            <div class="schedule-badge">${appointment.time}</div>
            <strong>${appointment.patient}</strong>
            <span class="schedule-meta">${appointment.type} with ${appointment.provider}</span>
            <span class="schedule-meta">${appointment.notes}</span>
          </div>
          <div class="schedule-side">
            <span class="pill ${getPriorityClass(appointment.priority)}">${appointment.priority}</span>
            <span class="schedule-meta">${appointment.mode}</span>
          </div>
        </article>
      `
    )
    .join("");

  return appointments;
}

function renderQueue() {
  queueList.innerHTML = queueItems
    .map(
      (item) => `
        <article class="queue-item">
          <strong>${item.label}</strong>
          <span>${item.value} active</span>
          <small>${item.detail}</small>
        </article>
      `
    )
    .join("");
}

function renderTasks() {
  taskList.innerHTML = careTasks
    .map(
      (task) => `
        <li>
          <span class="task-marker"></span>
          <div>
            <strong>${task.title}</strong>
            <span>${task.owner}</span>
          </div>
          <small>${task.due}</small>
        </li>
      `
    )
    .join("");
}

function renderProviders(providerLoad) {
  const cards = Object.entries(providerLoad);
  providerGrid.innerHTML = cards
    .map(([provider, count]) => {
      const level = Math.min(Math.round((count / 6) * 100), 100);
      return `
        <article class="provider-card">
          <strong>${provider}</strong>
          <small>${count} visits assigned</small>
          <div class="progress-track">
            <div class="progress-bar" style="width:${level}%"></div>
          </div>
          <small>${level}% of preferred daily load</small>
        </article>
      `;
    })
    .join("");
}

function applyPreferences() {
  document.body.dataset.theme = state.theme;
  document.body.classList.toggle("compact", state.compact);
  themeSelect.value = state.theme;
  densityToggle.checked = state.compact;

  widgetCheckboxes.forEach((checkbox) => {
    const key = checkbox.dataset.widget;
    const isVisible = Boolean(state.widgets[key]);
    checkbox.checked = isVisible;

    const card = document.querySelector(`[data-widget-card="${key}"]`);
    const panel = document.querySelector(`[data-widget-panel="${key}"]`);

    if (card) {
      card.hidden = !isVisible;
    }

    if (panel) {
      panel.hidden = !isVisible;
    }
  });
}

function renderApp() {
  applyPreferences();
  const visibleAppointments = renderAppointments();
  const stats = computeStats(state.appointments);
  renderHeader(stats, visibleAppointments.length);
  renderQueue();
  renderTasks();
  renderProviders(stats.providerLoad);
  saveState();
}

function resetFormWithSuggestion() {
  appointmentForm.reset();
  document.getElementById("visitTime").value = "13:00";
}

document.getElementById("openModalBtn").addEventListener("click", () => {
  resetFormWithSuggestion();
  appointmentModal.showModal();
});

document.getElementById("closeModalBtn").addEventListener("click", () => appointmentModal.close());
document.getElementById("cancelModalBtn").addEventListener("click", () => appointmentModal.close());

document.getElementById("fillDemoBtn").addEventListener("click", () => {
  searchInput.value = "Dr.";
  renderApp();
});

searchInput.addEventListener("input", renderApp);

themeSelect.addEventListener("change", (event) => {
  state.theme = event.target.value;
  renderApp();
});

densityToggle.addEventListener("change", (event) => {
  state.compact = event.target.checked;
  renderApp();
});

widgetCheckboxes.forEach((checkbox) => {
  checkbox.addEventListener("change", (event) => {
    state.widgets[event.target.dataset.widget] = event.target.checked;
    renderApp();
  });
});

appointmentForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const appointment = {
    id: crypto.randomUUID(),
    patient: document.getElementById("patientName").value.trim(),
    provider: document.getElementById("providerName").value,
    type: document.getElementById("visitType").value,
    time: document.getElementById("visitTime").value,
    mode: document.getElementById("visitMode").value,
    priority: document.getElementById("visitPriority").value,
    notes: document.getElementById("visitNotes").value.trim() || "No additional notes added.",
  };

  state.appointments.push(appointment);
  appointmentModal.close();
  searchInput.value = "";
  renderApp();
});

renderApp();
