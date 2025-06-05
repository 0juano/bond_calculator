import { Chart, ChartConfiguration, registerables } from 'chart.js';

// Register Chart.js components
Chart.register(...registerables);

interface ChartData {
  labels: string[];
  data: number[];
}

let chartInstance: Chart | null = null;

export function createChart(canvas: HTMLCanvasElement, data: ChartData): Chart {
  // Destroy existing chart if it exists
  if (chartInstance) {
    chartInstance.destroy();
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  const config: ChartConfiguration = {
    type: 'line',
    data: {
      labels: data.labels,
      datasets: [
        {
          label: 'Cash Flow',
          data: data.data,
          borderColor: '#00FF41', // Terminal green
          backgroundColor: 'rgba(0, 255, 65, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.1,
          pointBackgroundColor: '#00FF41',
          pointBorderColor: '#00FF41',
          pointHoverBackgroundColor: '#33FF66',
          pointHoverBorderColor: '#33FF66',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart',
      },
      plugins: {
        legend: {
          labels: {
            color: '#00FF41',
            font: {
              family: 'JetBrains Mono, monospace',
              size: 10,
            },
          },
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#00FF41',
          bodyColor: '#D9D9D9',
          borderColor: '#00FF41',
          borderWidth: 1,
          titleFont: {
            family: 'JetBrains Mono, monospace',
          },
          bodyFont: {
            family: 'JetBrains Mono, monospace',
          },
          callbacks: {
            label: function(context) {
              return `Cash Flow: $${context.parsed.y.toLocaleString()}`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: '#808080',
            font: {
              family: 'JetBrains Mono, monospace',
              size: 10,
            },
          },
          grid: {
            color: '#333333',
            lineWidth: 1,
          },
          border: {
            color: '#333333',
          },
        },
        y: {
          ticks: {
            color: '#808080',
            font: {
              family: 'JetBrains Mono, monospace',
              size: 10,
            },
            callback: function(value) {
              return '$' + (value as number).toLocaleString();
            },
          },
          grid: {
            color: '#333333',
            lineWidth: 1,
          },
          border: {
            color: '#333333',
          },
        },
      },
      interaction: {
        intersect: false,
        mode: 'index',
      },
      elements: {
        point: {
          radius: 3,
          hoverRadius: 6,
        },
        line: {
          borderCapStyle: 'round',
          borderJoinStyle: 'round',
        },
      },
    },
  };

  chartInstance = new Chart(ctx, config);
  return chartInstance;
}

export function updateChart(data: ChartData): void {
  if (!chartInstance) {
    return;
  }

  chartInstance.data.labels = data.labels;
  chartInstance.data.datasets[0].data = data.data;
  chartInstance.update('active');
}

export function destroyChart(): void {
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
}

// Chart color scheme for terminal theme
export const CHART_COLORS = {
  primary: '#00FF41',      // Terminal green
  secondary: '#33FF66',    // Bright green
  tertiary: '#FFD700',     // Amber
  danger: '#FF4444',       // Red
  muted: '#808080',        // Gray
  background: '#0D0D0D',   // Terminal black
  grid: '#333333',         // Dark gray
};

// Utility function to create different chart types
export function createBarChart(canvas: HTMLCanvasElement, data: ChartData): Chart {
  if (chartInstance) {
    chartInstance.destroy();
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  const config: ChartConfiguration = {
    type: 'bar',
    data: {
      labels: data.labels,
      datasets: [
        {
          label: 'Payment Amount',
          data: data.data,
          backgroundColor: CHART_COLORS.primary,
          borderColor: CHART_COLORS.secondary,
          borderWidth: 1,
          hoverBackgroundColor: CHART_COLORS.secondary,
          hoverBorderColor: CHART_COLORS.primary,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: CHART_COLORS.primary,
            font: {
              family: 'JetBrains Mono, monospace',
              size: 10,
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: CHART_COLORS.muted,
            font: {
              family: 'JetBrains Mono, monospace',
              size: 10,
            },
          },
          grid: {
            color: CHART_COLORS.grid,
          },
        },
        y: {
          ticks: {
            color: CHART_COLORS.muted,
            font: {
              family: 'JetBrains Mono, monospace',
              size: 10,
            },
            callback: function(value) {
              return '$' + (value as number).toLocaleString();
            },
          },
          grid: {
            color: CHART_COLORS.grid,
          },
        },
      },
    },
  };

  chartInstance = new Chart(ctx, config);
  return chartInstance;
}
