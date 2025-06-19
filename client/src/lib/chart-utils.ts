import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { CashFlowResult } from '@shared/schema';

// Register Chart.js components
Chart.register(...registerables);

interface ChartData {
  labels: string[];
  data: number[];
}

interface StackedChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
  }[];
}

let chartInstance: Chart | null = null;

/**
 * Safely destroy any existing chart on the canvas
 */
function destroyExistingChart(canvas: HTMLCanvasElement) {
  // Destroy the global chart instance if it exists
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
  
  // Also check for any chart attached to the canvas element
  const existingChart = Chart.getChart(canvas);
  if (existingChart) {
    existingChart.destroy();
  }
}

export function createChart(canvas: HTMLCanvasElement, data: ChartData): Chart {
  // Destroy existing chart if it exists
  destroyExistingChart(canvas);

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
              family: 'IBM Plex Mono, monospace',
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
            family: 'IBM Plex Mono, monospace',
          },
          bodyFont: {
            family: 'IBM Plex Mono, monospace',
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
              family: 'IBM Plex Mono, monospace',
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
              family: 'IBM Plex Mono, monospace',
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
  destroyExistingChart(canvas);

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
              family: 'IBM Plex Mono, monospace',
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
              family: 'IBM Plex Mono, monospace',
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
              family: 'IBM Plex Mono, monospace',
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

/**
 * Process cash flows into chart-ready format with payment type categorization
 */
export function processCashFlowsForChart(cashFlows: CashFlowResult[]): StackedChartData {
  if (!cashFlows || cashFlows.length === 0) {
    return {
      labels: [],
      datasets: []
    };
  }

  // Generate labels from cash flow dates
  const labels = cashFlows.map(flow => {
    const date = new Date(flow.date);
    return date.toLocaleDateString('en-US', { 
      year: '2-digit', 
      month: 'short' 
    });
  });

  // Categorize payments by type
  const couponData: number[] = [];
  const principalData: number[] = [];
  const optionsData: number[] = [];

  cashFlows.forEach(flow => {
    // Always include coupon payment (even if 0)
    couponData.push(flow.couponPayment || 0);
    
    // Principal includes amortization and maturity payments
    if (flow.paymentType === 'MATURITY' || flow.paymentType === 'AMORTIZATION' || flow.principalPayment > 0) {
      principalData.push(flow.principalPayment || 0);
    } else {
      principalData.push(0);
    }
    
    // Options include call and put payments
    if (flow.paymentType === 'CALL' || flow.paymentType === 'PUT') {
      optionsData.push(flow.totalPayment || 0);
      // Don't double count - zero out other categories
      couponData[couponData.length - 1] = 0;
      principalData[principalData.length - 1] = 0;
    } else {
      optionsData.push(0);
    }
  });

  return {
    labels,
    datasets: [
      {
        label: 'Coupons',
        data: couponData,
        backgroundColor: '#00FF41', // Terminal green
        borderColor: '#33FF66',
        borderWidth: 1,
      },
      {
        label: 'Principal',
        data: principalData,
        backgroundColor: '#34D399', // green-400
        borderColor: '#10B981',
        borderWidth: 1,
      },
      {
        label: 'Options',
        data: optionsData,
        backgroundColor: '#F59E0B', // amber-400
        borderColor: '#D97706',
        borderWidth: 1,
      },
    ],
  };
}

/**
 * Create a stacked bar chart for payment timeline visualization
 */
export function createStackedChart(canvas: HTMLCanvasElement, data: StackedChartData): Chart {
  // Destroy existing chart if it exists
  destroyExistingChart(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  const config: ChartConfiguration = {
    type: 'bar',
    data: {
      labels: data.labels,
      datasets: data.datasets,
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
          display: false, // We have custom legend in the UI
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          titleColor: '#00FF41',
          bodyColor: '#D9D9D9',
          borderColor: '#00FF41',
          borderWidth: 1,
          titleFont: {
            family: 'IBM Plex Mono, monospace',
            size: 11,
          },
          bodyFont: {
            family: 'IBM Plex Mono, monospace',
            size: 10,
          },
          callbacks: {
            title: function(context) {
              return `Payment: ${context[0].label}`;
            },
            label: function(context) {
              const value = context.parsed.y;
              if (value > 0) {
                return `${context.dataset.label}: $${value.toLocaleString()}`;
              }
              return '';
            },
            footer: function(context) {
              const total = context.reduce((sum, ctx) => sum + (ctx.parsed.y || 0), 0);
              return total > 0 ? `Total: $${total.toLocaleString()}` : '';
            },
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          ticks: {
            color: '#808080',
            font: {
              family: 'IBM Plex Mono, monospace',
              size: 9,
            },
            maxRotation: 45,
            minRotation: 0,
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
          stacked: true,
          ticks: {
            color: '#808080',
            font: {
              family: 'IBM Plex Mono, monospace',
              size: 9,
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
        bar: {
          borderRadius: 2,
        },
      },
    },
  };

  chartInstance = new Chart(ctx, config);
  return chartInstance;
}
