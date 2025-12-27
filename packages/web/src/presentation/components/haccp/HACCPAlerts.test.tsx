import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HACCPAlerts } from './HACCPAlerts';
import { useStore } from '@/presentation/store/useStore';

// Mock the store
vi.mock('../../store/useStore');

describe('HACCPAlerts', () => {
  const mockPCCs = [
    { id: 'pcc-1', name: 'Nevera 1', minTemp: 0, maxTemp: 5, isActive: true },
    { id: 'pcc-2', name: 'Congelador', minTemp: -18, maxTemp: -20, isActive: true },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "All clear" message when no alerts', () => {
    (useStore as any).mockReturnValue({
      pccs: [],
      haccpLogs: [],
      haccpTasks: [],
      haccpTaskCompletions: [],
      notifications: [],
    });

    render(<HACCPAlerts />);
    expect(screen.getByText('Protocolos Asegurados')).toBeInTheDocument();
    expect(screen.getByText(/No se detectan anomalías/)).toBeInTheDocument();
  });

  it('displays critical alert from logs', () => {
    const now = new Date();
    const criticalLog = {
      id: 'log-1',
      pccId: 'pcc-1',
      value: 8,
      timestamp: now.toISOString(),
      status: 'CRITICAL',
    };

    (useStore as any).mockReturnValue({
      pccs: mockPCCs,
      haccpLogs: [criticalLog],
      haccpTasks: [],
      haccpTaskCompletions: [],
      notifications: [],
    });

    render(<HACCPAlerts />);
    expect(screen.getByText(/Alerta Crítica: 1 anomalía/)).toBeInTheDocument();
    expect(screen.getByText('Temperatura Crítica: Nevera 1')).toBeInTheDocument();
    expect(screen.getByText(/Registrada 8°C/)).toBeInTheDocument();
  });

  it('displays AI anomaly notification', () => {
    const aiNotification = {
      id: 'notif-1',
      type: 'HACCP_ALERT',
      message: 'Unusual temperature rise detected',
      pccId: 'pcc-1',
      read: false,
      timestamp: new Date(),
    };

    (useStore as any).mockReturnValue({
      pccs: mockPCCs,
      haccpLogs: [],
      haccpTasks: [],
      haccpTaskCompletions: [],
      notifications: [aiNotification],
    });

    render(<HACCPAlerts />);
    expect(screen.getByText('Alerta IA: Anomalía Detectada')).toBeInTheDocument();
    expect(screen.getByText('Unusual temperature rise detected')).toBeInTheDocument();
  });
});
