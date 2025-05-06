// charts.js
import { getAllWorkLogs } from './db.js';
import { Chart, registerables } from 'https://cdn.jsdelivr.net/npm/chart.js/dist/chart.esm.js';
Chart.register(...registerables);

let statsChart, tasksChart;

export async function initCharts() {
  const ctx1 = document.getElementById('stats-chart').getContext('2d');
  const ctx2 = document.getElementById('tasks-chart').getContext('2d');

  statsChart = new Chart(ctx1, {
    type: 'line',
    data: { labels: [], datasets: [{ label: 'Odpracované hodiny', data: [], borderColor: '#0d6efd', tension: 0.1 }] },
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
  });

  tasksChart = new Chart(ctx2, {
    type: 'doughnut',
    data: { labels: [], datasets: [{ label: 'Úkoly', data: [], backgroundColor: ['#0d6efd', '#28a745', '#6f42c1', '#fd7e14'] }] },
    options: { responsive: true }
  });

  updateCharts();
}

export async function updateCharts(period = 'week') {
  const logs = await getAllWorkLogs();
  const filteredLogs = logs.filter(log => {
    const logDate = new Date(log.endTime);
    const now = new Date();
    switch (period) {
      case 'week': return (now - logDate) < 7 * 24 * 60 * 60 * 1000;
      case 'month': return logDate.getMonth() === now.getMonth();
      case 'year': return logDate.getFullYear() === now.getFullYear();
      default: return true;
    }
  });
  const hoursByDay = {};
  filteredLogs.forEach(log => {
    const day = new Date(log.endTime).toLocaleDateString();
    hoursByDay[day] = (hoursByDay[day] || 0) + (log.duration / (1000 * 60 * 60));
  });
  statsChart.data.labels = Object.keys(hoursByDay);
  statsChart.data.datasets[0].data = Object.values(hoursByDay);
  statsChart.update();

  const tasks = {};
  filteredLogs.forEach(log => {
    tasks[log.activity] = (tasks[log.activity] || 0) + 1;
  });
  tasksChart.data.labels = Object.keys(tasks);
  tasksChart.data.datasets[0].data = Object.values(tasks);
  tasksChart.update();
}