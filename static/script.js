const ws = new WebSocket(`ws://${location.host}/ws`);

const maxPoints = 20; // cuántos puntos mostrar en el gráfico

// Crear un gráfico genérico
function createChart(ctx, label, color) {
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label,
        data: [],
        borderColor: color,
        borderWidth: 2,
        fill: false,
        tension: 0.2
      }]
    },
    options: {
      animation: false,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

const cpuChart  = createChart(document.getElementById('cpuChart'),  'CPU %',    'red');
const memChart  = createChart(document.getElementById('memChart'),  'Memoria %','blue');
const diskChart = createChart(document.getElementById('diskChart'), 'Disco %',  'green');
const netChart  = createChart(document.getElementById('netChart'),  'Red KB/s', 'purple');

// Variables para calcular tráfico de red por segundo
let lastRx = null;
let lastTx = null;
let lastTime = null;

ws.onmessage = (event) => {
  const stats = JSON.parse(event.data);
  const now = new Date().toLocaleTimeString();

  console.log(stats)
  // CPU y memoria
  updateChart(cpuChart, now, stats.cpu[0]);
  const cpuTitle = document.getElementById('cpu_usage')
  cpuTitle.textContent = Math.floor(stats.cpu[0] * 100) / 100;
  updateChart(memChart, now, stats.memory.usedPercent);
  const memoryTitle = document.getElementById('memory_usage')
  memoryTitle.textContent = (Math.floor(stats.memory.usedPercent * 100) / 100).toFixed(2);

  // Disco (primer disco o raíz)
  if (stats.disk.length > 0) {
    updateChart(diskChart, now, stats.disk[0].usedPercent);
    const diskTitle = document.getElementById('disk_usage')
    diskTitle.textContent = Math.floor(stats.disk[0].usedPercent * 100) / 100;
  }

  // Red (si tenemos valores previos, calculamos KB/s)
  if (stats.net.length > 0) {
    const rx = stats.net[0].bytesRecv;
    const tx = stats.net[0].bytesSent;
    const t = Date.now();

    if (lastRx !== null && lastTx !== null && lastTime !== null) {
        const dt = (t - lastTime) / 1000; // segundos
        const rxRate = ((rx - lastRx) / 1024 / dt).toFixed(2); // KB/s
        const txRate = ((tx - lastTx) / 1024 / dt).toFixed(2);
        updateChart(netChart, now, rxRate);
        const netTitle = document.getElementById('net_usage')
        netTitle.textContent =  rxRate;
      // Si quieres también enviar tx en otra línea, se puede añadir otro dataset
    }

    lastRx = rx;
    lastTx = tx;
    lastTime = t;
  }
};

function updateChart(chart, label, value) {
  chart.data.labels.push(label);
  chart.data.datasets[0].data.push(value);
  if (chart.data.labels.length > maxPoints) {
    chart.data.labels.shift();
    chart.data.datasets[0].data.shift();
  }
  chart.update();
}
