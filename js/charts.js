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
    data: { labels: [], datasets: [{ label: 'Odpracované hodiny', data: [] }] },
    options: { responsive:true }
  });

  tasksChart = new Chart(ctx2, {
    type: 'doughnut',
    data: { labels: [], datasets: [{ label: 'Úkoly', data: [] }] },
    options: { responsive:true }
  });

  updateCharts();
}

export async function updateCharts(period='week') {
  const logs = await getAllWorkLogs();
  // Vyfiltruj dle period a spočti sumy…
  // Naplň statsChart.data.labels a .data.datasets[0].data
  // Naplň tasksChart.data.labels a .datasets[0].data
  statsChart.update();
  tasksChart.update();
}
