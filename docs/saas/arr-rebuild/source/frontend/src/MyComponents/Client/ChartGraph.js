import React from 'react';
import { Bar } from 'react-chartjs-2';

const CombinedChart = () => {
  const data = {
    labels: ['Label 1', 'Label 2', 'Label 3', 'Label 4', 'Label 5'],
    datasets: [
      {
        type: 'bar',
        label: 'Bar Dataset 1',
        data: [10, 20, 30, 40, 50],
        backgroundColor: 'rgba(75, 192, 192, 0.5)', // Adjust the color as per your preference
        barThickness: -20, // Negative value to overlap bars
      },
      {
        type: 'line',
        label: 'Line Dataset',
        data: [50, 40, 30, 20, 10],
        borderColor: 'rgba(255, 99, 132, 1)', // Adjust the color as per your preference
        fill: false,
      },
      {
        type: 'bar',
        label: 'Bar Dataset 2',
        data: [5, 15, 25, 35, 45],
        backgroundColor: 'rgba(54, 162, 235, 0.5)', // Adjust the color as per your preference
      },
      {
        type: 'bar',
        label: 'Down Bar Dataset',
        data: [-15, -25, -35, -45, -55],
        backgroundColor: 'rgba(255, 159, 64, 0.5)', // Adjust the color as per your preference
      },
    ],
  };

  const options = {
    indexAxis: 'x',
    scales: {
      x: {
        beginAtZero: true,
      },
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div>
      <Bar data={data} options={options} />
    </div>
  );
};

export default CombinedChart;










