/* =========================
   FocusTimer Pro - Script
========================= */

/* ---------- DOM ELEMENTS ---------- */

const timeDisplay = document.getElementById("time");
const circle = document.getElementById("progressCircle");

const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");

const sessionCountDisplay = document.getElementById("sessionCount");
const clearSessionsBtn = document.getElementById("clearSessionsBtn");

const focusInput = document.getElementById("focusInput");
const shortBreakInput = document.getElementById("shortBreakInput");
const longBreakInput = document.getElementById("longBreakInput");
const longAfterInput = document.getElementById("longAfterInput");

const setTimeBtn = document.getElementById("setTimeBtn");
const modeBadge = document.getElementById("modeBadge");
const themeToggle = document.getElementById("themeToggle");

const todayFocusSessionsDisplay = document.getElementById("todayFocusSessions");
const todayFocusMinutesDisplay = document.getElementById("todayFocusMinutes");
const totalTrackedDaysDisplay = document.getElementById("totalTrackedDays");
const focusStreakDisplay = document.getElementById("focusStreak");

const focusChartCanvas = document.getElementById("focusChart");
const weeklyChartCanvas = document.getElementById("weeklyChart");
const trendChartCanvas = document.getElementById("trendChart");

const taskInput = document.getElementById("taskInput");
const addTaskBtn = document.getElementById("addTaskBtn");
const taskList = document.getElementById("taskList");

const exportStatsBtn = document.getElementById("exportStatsBtn");
const clearAllDataBtn = document.getElementById("clearAllDataBtn");

const soundThemeSelect = document.getElementById("soundThemeSelect");

/* ---------- TIMER STATE ---------- */

let focusTime = 25 * 60;
let shortBreakTime = 5 * 60;
let longBreakTime = 15 * 60;
let longBreakAfter = 4;

let totalTime = focusTime;
let timeLeft = totalTime;

let timer = null;
let isRunning = false;
let endTime = null;

let currentMode = "focus";

let sessions = parseInt(localStorage.getItem("sessions")) || 0;

let dailyStats = JSON.parse(localStorage.getItem("dailyStats")) || {};
let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

let soundTheme = localStorage.getItem("soundTheme") || "beep";

/* ---------- SVG RING ---------- */

const radius = 95;
const circumference = 2 * Math.PI * radius;

circle.style.strokeDasharray = circumference;
circle.style.strokeDashoffset = 0;

/* ---------- CHART INSTANCES ---------- */

let focusChart = null;
let weeklyChart = null;
let trendChart = null;

/* =========================
   UTILS
========================= */

function getTodayKey() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function getDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;

  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getCurrentModeTime() {
  if (currentMode === "focus") return focusTime;
  if (currentMode === "shortBreak") return shortBreakTime;
  if (currentMode === "longBreak") return longBreakTime;

  return focusTime;
}

function saveDailyStats() {
  localStorage.setItem("dailyStats", JSON.stringify(dailyStats));
}

function saveTasks() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

function saveSettings() {
  localStorage.setItem("focusTime", focusTime);
  localStorage.setItem("shortBreakTime", shortBreakTime);
  localStorage.setItem("longBreakTime", longBreakTime);
  localStorage.setItem("longBreakAfter", longBreakAfter);
  localStorage.setItem("soundTheme", soundTheme);
}

function saveTimerState() {
  const state = {
    focusTime,
    shortBreakTime,
    longBreakTime,
    longBreakAfter,
    totalTime,
    timeLeft,
    isRunning,
    endTime,
    currentMode,
    sessions
  };

  localStorage.setItem("timerState", JSON.stringify(state));
}

/* =========================
   LOAD STATE
========================= */

function loadSettings() {
  const savedFocus = parseInt(localStorage.getItem("focusTime"));
  const savedShort = parseInt(localStorage.getItem("shortBreakTime"));
  const savedLong = parseInt(localStorage.getItem("longBreakTime"));
  const savedLongAfter = parseInt(localStorage.getItem("longBreakAfter"));

  if (savedFocus) focusTime = savedFocus;
  if (savedShort) shortBreakTime = savedShort;
  if (savedLong) longBreakTime = savedLong;
  if (savedLongAfter) longBreakAfter = savedLongAfter;

  focusInput.value = focusTime / 60;
  shortBreakInput.value = shortBreakTime / 60;
  longBreakInput.value = longBreakTime / 60;
  longAfterInput.value = longBreakAfter;

  soundThemeSelect.value = soundTheme;
}

function loadTimerState() {
  const savedState = JSON.parse(localStorage.getItem("timerState"));

  if (!savedState) {
    totalTime = focusTime;
    timeLeft = totalTime;
    return;
  }

  focusTime = savedState.focusTime || focusTime;
  shortBreakTime = savedState.shortBreakTime || shortBreakTime;
  longBreakTime = savedState.longBreakTime || longBreakTime;
  longBreakAfter = savedState.longBreakAfter || longBreakAfter;

  totalTime = savedState.totalTime || focusTime;
  timeLeft = savedState.timeLeft || totalTime;
  currentMode = savedState.currentMode || "focus";
  sessions = savedState.sessions || sessions;

  const wasRunning = savedState.isRunning;
  const savedEndTime = savedState.endTime;

  if (wasRunning && savedEndTime) {
    const remaining = Math.round((savedEndTime - Date.now()) / 1000);

    if (remaining > 0) {
      timeLeft = remaining;
      endTime = savedEndTime;
      isRunning = false;

      startTimer();
    } else {
      finishCurrentMode();
    }
  }
}

/* =========================
   THEME
========================= */

function loadTheme() {
  const savedTheme = localStorage.getItem("theme") || "dark";

  if (savedTheme === "light") {
    document.body.classList.add("light");
    themeToggle.textContent = "☀️";
  } else {
    document.body.classList.remove("light");
    themeToggle.textContent = "🌙";
  }
}

function toggleTheme() {
  document.body.classList.toggle("light");

  const isLight = document.body.classList.contains("light");

  themeToggle.textContent = isLight ? "☀️" : "🌙";
  localStorage.setItem("theme", isLight ? "light" : "dark");

  renderCharts();
}

/* =========================
   DISPLAY
========================= */

function updateDisplay() {
  timeDisplay.textContent = formatTime(timeLeft);

  const progress = timeLeft / totalTime;
  circle.style.strokeDashoffset = circumference * (1 - progress);

  saveTimerState();
}

function updateModeUI() {
  modeBadge.classList.remove("short-break", "long-break");
  circle.classList.remove("short-break", "long-break");

  if (currentMode === "focus") {
    modeBadge.textContent = "Focus Mode";
  }

  if (currentMode === "shortBreak") {
    modeBadge.textContent = "Short Break";
    modeBadge.classList.add("short-break");
    circle.classList.add("short-break");
  }

  if (currentMode === "longBreak") {
    modeBadge.textContent = "Long Break";
    modeBadge.classList.add("long-break");
    circle.classList.add("long-break");
  }
}

/* =========================
   TIMER FUNCTIONS
========================= */

function startTimer() {
  if (isRunning) return;

  isRunning = true;
  endTime = Date.now() + timeLeft * 1000;

  saveTimerState();

  timer = setInterval(() => {
    const remaining = Math.round((endTime - Date.now()) / 1000);

    if (remaining <= 0) {
      clearInterval(timer);
      timer = null;

      timeLeft = 0;
      updateDisplay();

      finishCurrentMode();
    } else {
      timeLeft = remaining;
      updateDisplay();
    }
  }, 1000);
}

function pauseTimer() {
  clearInterval(timer);

  timer = null;
  isRunning = false;
  endTime = null;

  saveTimerState();
}

function resetTimer() {
  clearInterval(timer);

  timer = null;
  isRunning = false;
  endTime = null;

  totalTime = getCurrentModeTime();
  timeLeft = totalTime;

  updateDisplay();
  saveTimerState();
}

function setMode(mode) {
  currentMode = mode;
  totalTime = getCurrentModeTime();
  timeLeft = totalTime;

  updateModeUI();
  updateDisplay();
}

function finishCurrentMode() {
  isRunning = false;
  endTime = null;

  playSound();
  showNotification();

  if (currentMode === "focus") {
    sessions++;
    sessionCountDisplay.textContent = sessions;

    localStorage.setItem("sessions", sessions);

    addFocusSessionToStats();

    if (sessions % longBreakAfter === 0) {
      setMode("longBreak");
    } else {
      setMode("shortBreak");
    }
  } else {
    setMode("focus");
  }

  saveTimerState();
}

/* =========================
   SETTINGS
========================= */

function applySettings() {
  const focusValue = parseInt(focusInput.value);
  const shortValue = parseInt(shortBreakInput.value);
  const longValue = parseInt(longBreakInput.value);
  const longAfterValue = parseInt(longAfterInput.value);

  if (focusValue > 0) focusTime = focusValue * 60;
  if (shortValue > 0) shortBreakTime = shortValue * 60;
  if (longValue > 0) longBreakTime = longValue * 60;
  if (longAfterValue > 0) longBreakAfter = longAfterValue;

  soundTheme = soundThemeSelect.value;

  localStorage.setItem("soundTheme", soundTheme);
  saveSettings();

  clearInterval(timer);

  timer = null;
  isRunning = false;
  endTime = null;

  totalTime = getCurrentModeTime();
  timeLeft = totalTime;

  updateDisplay();
  updateModeUI();
  saveTimerState();

  alert("Settings saved successfully!");
}

/* =========================
   DAILY STATS
========================= */

function addFocusSessionToStats() {
  const today = getTodayKey();

  if (!dailyStats[today]) {
    dailyStats[today] = {
      sessions: 0,
      minutes: 0
    };
  }

  dailyStats[today].sessions++;
  dailyStats[today].minutes += focusTime / 60;

  saveDailyStats();

  updateDashboard();
  renderCharts();
  renderHeatmap();
}

function updateDashboard() {
  const today = getTodayKey();
  const todayStats = dailyStats[today] || {
    sessions: 0,
    minutes: 0
  };

  todayFocusSessionsDisplay.textContent = todayStats.sessions;
  todayFocusMinutesDisplay.textContent = Math.round(todayStats.minutes);
  totalTrackedDaysDisplay.textContent = Object.keys(dailyStats).length;

  calculateStreak();
}

function calculateStreak() {
  let streak = 0;
  const date = new Date();

  while (true) {
    const key = getDateKey(date);

    if (dailyStats[key] && dailyStats[key].minutes > 0) {
      streak++;
      date.setDate(date.getDate() - 1);
    } else {
      break;
    }
  }

  focusStreakDisplay.textContent = streak;
}

/* =========================
   CHARTS
========================= */

function getChartColors() {
  const isLight = document.body.classList.contains("light");

  return {
    text: isLight ? "#0f172a" : "#e5e7eb",
    grid: isLight ? "rgba(15,23,42,0.12)" : "rgba(255,255,255,0.12)",
    bar: isLight ? "#2563eb" : "#00ffcc",
    line: isLight ? "#7c3aed" : "#e040fb",
    weekly: isLight ? "#0891b2" : "#7dd3fc"
  };
}

function getSortedStats() {
  return Object.keys(dailyStats)
    .sort()
    .map(date => ({
      date,
      sessions: dailyStats[date].sessions,
      minutes: dailyStats[date].minutes
    }));
}

function getLastNDays(n) {
  const days = [];

  for (let i = n - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    const key = getDateKey(date);

    days.push({
      date: key,
      minutes: dailyStats[key]?.minutes || 0,
      sessions: dailyStats[key]?.sessions || 0
    });
  }

  return days;
}

function renderCharts() {
  if (!window.Chart) return;

  const colors = getChartColors();

  const sortedStats = getSortedStats();

  const labels = sortedStats.map(item => item.date);
  const minutes = sortedStats.map(item => Math.round(item.minutes));

  if (focusChart) focusChart.destroy();

  focusChart = new Chart(focusChartCanvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Focus Minutes",
          data: minutes,
          backgroundColor: colors.bar,
          borderRadius: 8
        }
      ]
    },
    options: getChartOptions(colors)
  });

  const weeklyData = getLastNDays(7);

  if (weeklyChart) weeklyChart.destroy();

  weeklyChart = new Chart(weeklyChartCanvas, {
    type: "bar",
    data: {
      labels: weeklyData.map(item => item.date.slice(5)),
      datasets: [
        {
          label: "Last 7 Days",
          data: weeklyData.map(item => Math.round(item.minutes)),
          backgroundColor: colors.weekly,
          borderRadius: 8
        }
      ]
    },
    options: getChartOptions(colors)
  });

  if (trendChart) trendChart.destroy();

  trendChart = new Chart(trendChartCanvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Productivity Trend",
          data: minutes,
          borderColor: colors.line,
          backgroundColor: colors.line + "33",
          tension: 0.35,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    },
    options: getChartOptions(colors)
  });
}

function getChartOptions(colors) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: colors.text
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: colors.text
        },
        grid: {
          color: colors.grid
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: colors.text
        },
        grid: {
          color: colors.grid
        }
      }
    }
  };
}

/* =========================
   HEATMAP
========================= */

function renderHeatmap() {
  const heatmap = document.getElementById("heatmap");

  if (!heatmap) return;

  heatmap.innerHTML = "";

  const days = 120;

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    const key = getDateKey(date);
    const minutes = dailyStats[key]?.minutes || 0;

    let level = 0;

    if (minutes > 0) level = 1;
    if (minutes >= 60) level = 2;
    if (minutes >= 120) level = 3;
    if (minutes >= 180) level = 4;

    const div = document.createElement("div");

    div.classList.add("heat-day");

    if (level > 0) {
      div.classList.add(`heat-level-${level}`);
    }

    div.title = `${key} - ${Math.round(minutes)} minutes`;

    heatmap.appendChild(div);
  }
}

/* =========================
   TASKS
========================= */

function renderTasks() {
  taskList.innerHTML = "";

  tasks.forEach((task, index) => {
    const li = document.createElement("li");

    li.draggable = true;
    li.dataset.index = index;

    const title = document.createElement("span");
    title.className = "task-title";
    title.textContent = task.title;

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const completeBtn = document.createElement("button");
    completeBtn.className = "complete-task";
    completeBtn.textContent = task.completed ? "Undo" : "Done";

    completeBtn.onclick = () => {
      tasks[index].completed = !tasks[index].completed;
      saveTasks();
      renderTasks();
    };

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-task";
    deleteBtn.textContent = "Delete";

    deleteBtn.onclick = () => {
      tasks.splice(index, 1);
      saveTasks();
      renderTasks();
    };

    if (task.completed) {
      title.style.textDecoration = "line-through";
      title.style.opacity = "0.6";
    }

    actions.appendChild(completeBtn);
    actions.appendChild(deleteBtn);

    li.appendChild(title);
    li.appendChild(actions);

    li.addEventListener("dragstart", () => {
      li.classList.add("dragging");
    });

    li.addEventListener("dragend", () => {
      li.classList.remove("dragging");
      updateTasksOrderFromDOM();
    });

    taskList.appendChild(li);
  });
}

function addTask() {
  const value = taskInput.value.trim();

  if (!value) return;

  tasks.push({
    title: value,
    completed: false
  });

  taskInput.value = "";

  saveTasks();
  renderTasks();
}

function updateTasksOrderFromDOM() {
  const newTasks = [];

  [...taskList.children].forEach(li => {
    const oldIndex = Number(li.dataset.index);
    newTasks.push(tasks[oldIndex]);
  });

  tasks = newTasks;
  saveTasks();
  renderTasks();
}

taskList.addEventListener("dragover", e => {
  e.preventDefault();

  const dragging = document.querySelector(".dragging");

  if (!dragging) return;

  const afterElement = getDragAfterElement(taskList, e.clientY);

  if (afterElement == null) {
    taskList.appendChild(dragging);
  } else {
    taskList.insertBefore(dragging, afterElement);
  }
});

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll("li:not(.dragging)")];

  return draggableElements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;

      if (offset < 0 && offset > closest.offset) {
        return {
          offset,
          element: child
        };
      }

      return closest;
    },
    {
      offset: Number.NEGATIVE_INFINITY
    }
  ).element;
}

/* =========================
   NOTIFICATIONS + SOUND
========================= */

function showNotification() {
  if (!("Notification" in window)) return;

  if (Notification.permission === "granted") {
    new Notification("FocusTimer Pro", {
      body: currentMode === "focus"
        ? "Focus session completed!"
        : "Break completed!",
      icon: "icon-192.png"
    });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission();
  }
}

function playSound() {
  let frequency = 650;

  if (soundTheme === "bell") frequency = 880;
  if (soundTheme === "digital") frequency = 420;

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContext();

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = soundTheme === "digital" ? "square" : "sine";
    oscillator.frequency.value = frequency;

    gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + 0.7
    );

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.7);
  } catch (error) {
    console.log("Sound could not be played:", error);
  }
}

/* =========================
   EXPORT + CLEAR
========================= */

function exportStats() {
  const exportData = {
    sessions,
    dailyStats,
    tasks,
    settings: {
      focusTime: focusTime / 60,
      shortBreakTime: shortBreakTime / 60,
      longBreakTime: longBreakTime / 60,
      longBreakAfter,
      soundTheme
    },
    exportedAt: new Date().toISOString()
  };

  const data = JSON.stringify(exportData, null, 2);
  const blob = new Blob([data], {
    type: "application/json"
  });

  const a = document.createElement("a");

  a.href = URL.createObjectURL(blob);
  a.download = "focus-timer-pro-data.json";
  a.click();

  URL.revokeObjectURL(a.href);
}

function clearSessions() {
  const confirmed = confirm("Clear only focus sessions and statistics?");

  if (!confirmed) return;

  sessions = 0;
  dailyStats = {};

  localStorage.setItem("sessions", sessions);
  saveDailyStats();

  sessionCountDisplay.textContent = sessions;

  updateDashboard();
  renderCharts();
  renderHeatmap();
  saveTimerState();
}

function clearAllData() {
  const confirmed = confirm("This will delete all app data. Are you sure?");

  if (!confirmed) return;

  localStorage.clear();
  location.reload();
}

/* =========================
   KEYBOARD SHORTCUTS
========================= */

function handleKeyboardShortcuts(e) {
  const activeTag = document.activeElement.tagName.toLowerCase();

  if (activeTag === "input" || activeTag === "select") return;

  if (e.code === "Space") {
    e.preventDefault();

    if (isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  }

  if (e.code === "KeyR") {
    resetTimer();
  }
}

/* =========================
   PWA SERVICE WORKER
========================= */

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("service-worker.js")
        .then(() => {
          console.log("Service Worker registered");
        })
        .catch(error => {
          console.log("Service Worker registration failed:", error);
        });
    });
  }
}

/* =========================
   EVENTS
========================= */

startBtn.addEventListener("click", startTimer);
pauseBtn.addEventListener("click", pauseTimer);
resetBtn.addEventListener("click", resetTimer);

setTimeBtn.addEventListener("click", applySettings);

themeToggle.addEventListener("click", toggleTheme);

clearSessionsBtn.addEventListener("click", clearSessions);
clearAllDataBtn.addEventListener("click", clearAllData);

addTaskBtn.addEventListener("click", addTask);

taskInput.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    addTask();
  }
});

exportStatsBtn.addEventListener("click", exportStats);

soundThemeSelect.addEventListener("change", () => {
  soundTheme = soundThemeSelect.value;
  localStorage.setItem("soundTheme", soundTheme);
});

document.addEventListener("keydown", handleKeyboardShortcuts);

/* =========================
   INIT
========================= */

function init() {
  loadTheme();
  loadSettings();
  loadTimerState();

  sessionCountDisplay.textContent = sessions;

  updateModeUI();
  updateDisplay();

  updateDashboard();
  renderCharts();
  renderHeatmap();
  renderTasks();

  registerServiceWorker();
}

init();
