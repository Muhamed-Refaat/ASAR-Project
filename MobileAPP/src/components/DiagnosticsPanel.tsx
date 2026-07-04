import { useEffect, useState, useRef } from 'react';
import { cn } from '@/src/lib/utils';
import { Activity, ShieldCheck, ShieldAlert, Cpu, Radio, HardDrive, RefreshCw, Layers } from 'lucide-react';

interface DiagnosticsPanelProps {
  connected: boolean;
  robotReady: boolean;
  sendCommand: (cmd: string) => void;
  lastDiagLine: string;
  setLastDiagLine: (line: string) => void;
}

interface TestItem {
  id: string;
  name: string;
  category: 'connection' | 'sensors' | 'actuators';
  status: 'idle' | 'running' | 'pass' | 'fail';
  detail?: string;
}

export default function DiagnosticsPanel({
  connected,
  robotReady,
  sendCommand,
  lastDiagLine,
  setLastDiagLine,
}: DiagnosticsPanelProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const [tests, setTests] = useState<TestItem[]>([
    // Category: Connection
    { id: 'websocket', name: 'App-WebSocket Link', category: 'connection', status: 'idle' },
    { id: 'esp_wifi', name: 'ESP32 Wi-Fi Signal', category: 'connection', status: 'idle' },
    { id: 'uart_link', name: 'ESP-Mega Serial Link', category: 'connection', status: 'idle' },
    // Category: Sensors
    { id: 'mpu_imu', name: 'MPU-6050 Gyro/IMU', category: 'sensors', status: 'idle' },
    { id: 'l_us', name: 'HC-SR04 Left Ultrasonic', category: 'sensors', status: 'idle' },
    { id: 'f_us', name: 'HC-SR04 Front Ultrasonic', category: 'sensors', status: 'idle' },
    { id: 'r_us', name: 'HC-SR04 Right Ultrasonic', category: 'sensors', status: 'idle' },
    { id: 'b_us', name: 'HC-SR04 Rear Ultrasonic', category: 'sensors', status: 'idle' },
    // Category: Actuators
    { id: 'l_mot', name: 'Left Motors & Encoder', category: 'actuators', status: 'idle' },
    { id: 'r_mot', name: 'Right Motors & Encoder', category: 'actuators', status: 'idle' },
  ]);

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Handle incoming diagnostics payloads
  useEffect(() => {
    if (!isRunning || !lastDiagLine) return;

    const line = lastDiagLine.trim();

    // 1. ESP32 local diagnostics packet
    if (line.startsWith('DIAG_ESP:')) {
      // Format: DIAG_ESP:WIFI=OK:RSSI=-54dBm:HEAP=182KB
      const parts = line.slice('DIAG_ESP:'.length).split(':');
      const wifi = parts[0]?.split('=')[1] === 'OK';
      const rssi = parts[1]?.split('=')[1] || 'N/A';
      const heap = parts[2]?.split('=')[1] || 'N/A';

      setTests((prev) =>
        prev.map((t) => {
          if (t.id === 'esp_wifi') {
            return {
              ...t,
              status: wifi ? 'pass' : 'fail',
              detail: `RSSI: ${rssi} | Heap: ${heap}`,
            };
          }
          return t;
        }),
      );

      addLog(`ESP32 Local: WiFi=${wifi ? 'OK' : 'FAIL'} (${rssi}) | Heap=${heap}`);
      addLog(`ESP32 -> Mega Serial Handshake sent. Wiggling wheels...`);

      setTests((prev) =>
        prev.map((t) => (t.id === 'uart_link' ? { ...t, status: 'running' } : t)),
      );
    }

    // 2. Arduino Mega full subsystems results packet
    if (line.startsWith('DIAG_RESULT:')) {
      // Format: DIAG_RESULT:IMU=OK:L_US=OK:F_US=OK:R_US=OK:B_US=OK:L_MOT=OK:R_MOT=OK:L_ENC=OK:R_ENC=OK
      const parts = line.slice('DIAG_RESULT:'.length).split(':');
      const results: Record<string, boolean> = {};

      parts.forEach((p) => {
        const [key, val] = p.split('=');
        if (key) results[key] = val === 'OK';
      });

      addLog(`Diagnostics Completed! Result frame received.`);

      setTests((prev) =>
        prev.map((t) => {
          let status: 'pass' | 'fail' = 'fail';
          let detail = 'FAIL';

          if (t.id === 'uart_link') {
            status = 'pass';
            detail = '9600 Baud OK';
          } else if (t.id === 'mpu_imu') {
            status = results['IMU'] ? 'pass' : 'fail';
            detail = results['IMU'] ? 'I2C 0x68 Handshake OK' : 'I2C Handshake Fail';
          } else if (t.id === 'l_us') {
            status = results['L_US'] ? 'pass' : 'fail';
            detail = results['L_US'] ? 'Pings OK' : 'Time-out / No Echo';
          } else if (t.id === 'f_us') {
            status = results['F_US'] ? 'pass' : 'fail';
            detail = results['F_US'] ? 'Pings OK' : 'Time-out / No Echo';
          } else if (t.id === 'r_us') {
            status = results['R_US'] ? 'pass' : 'fail';
            detail = results['R_US'] ? 'Pings OK' : 'Time-out / No Echo';
          } else if (t.id === 'b_us') {
            status = results['B_US'] ? 'pass' : 'fail';
            detail = results['B_US'] ? 'Pings OK' : 'Time-out / No Echo';
          } else if (t.id === 'l_mot') {
            status = results['L_MOT'] && results['L_ENC'] ? 'pass' : 'fail';
            detail = results['L_MOT'] && results['L_ENC'] ? 'Pulse Wiggle OK' : 'No Encoder Ticks';
          } else if (t.id === 'r_mot') {
            status = results['R_MOT'] && results['R_ENC'] ? 'pass' : 'fail';
            detail = results['R_MOT'] && results['R_ENC'] ? 'Pulse Wiggle OK' : 'No Encoder Ticks';
          }

          return { ...t, status, detail };
        }),
      );

      // Print final summaries to terminal
      addLog(`--- SUMMARY ---`);
      addLog(`MPU-6050 IMU: ${results['IMU'] ? 'PASSED' : 'FAILED'}`);
      addLog(`Ultrasonic Arrays: L:${results['L_US'] ? 'OK' : 'FAIL'} | F:${results['F_US'] ? 'OK' : 'FAIL'} | R:${results['R_US'] ? 'OK' : 'FAIL'} | B:${results['B_US'] ? 'OK' : 'FAIL'}`);
      addLog(`Motors & Encoders: Left:${results['L_MOT'] ? 'OK' : 'FAIL'} | Right:${results['R_MOT'] ? 'OK' : 'FAIL'}`);
      addLog(`System Selfcheck Complete.`);

      setIsRunning(false);
      setLastDiagLine(''); // Reset connected telemetry frame
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [isRunning, lastDiagLine, setLastDiagLine]);

  const handleStartDiagnostics = () => {
    if (!connected) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setIsRunning(true);
    setLastDiagLine('');
    setLogs([]);

    // Initialize all states
    setTests((prev) =>
      prev.map((t) => {
        if (t.id === 'websocket') {
          return { ...t, status: 'pass', detail: 'WebSocket Connected' };
        }
        return { ...t, status: 'idle', detail: undefined };
      }),
    );

    addLog(`Initiating System Self-Diagnostics...`);
    addLog(`Step 1: WebSocket Link Verified. [OK]`);
    addLog(`Step 2: Checking ESP32 Gateway and Local RSSI...`);

    setTests((prev) =>
      prev.map((t) => (t.id === 'esp_wifi' ? { ...t, status: 'running' } : t)),
    );

    // Trigger diagnostics on microcontroller
    sendCommand('DIAG_START');

    // Start a 10-second timeout watchdog
    timeoutRef.current = setTimeout(() => {
      setIsRunning(false);
      addLog(`[TIMEOUT] Diagnostics timed out. No response received from robot after 10s.`);
      addLog(`Please check physical connection, power, and Wi-Fi networks.`);
      setTests((prev) =>
        prev.map((t) => {
          if (t.status === 'idle' || t.status === 'running') {
            return { ...t, status: 'fail', detail: 'TIMEOUT - No Response' };
          }
          return t;
        })
      );
    }, 10000);
  };

  const getStatusBadge = (status: TestItem['status'], detail?: string) => {
    switch (status) {
      case 'pass':
        return (
          <div className="text-right">
            <span className="font-sans text-[10px] font-black uppercase text-secondary tracking-wider bg-secondary/10 px-2 py-0.5 rounded">PASS</span>
            {detail && <p className="font-mono text-[9px] text-on-surface-variant mt-0.5">{detail}</p>}
          </div>
        );
      case 'fail':
        return (
          <div className="text-right">
            <span className="font-sans text-[10px] font-black uppercase text-error tracking-wider bg-error/10 px-2 py-0.5 rounded">FAIL</span>
            {detail && <p className="font-mono text-[9px] text-error mt-0.5">{detail}</p>}
          </div>
        );
      case 'running':
        return (
          <div className="text-right flex items-center justify-end gap-1">
            <span className="font-sans text-[10px] font-black uppercase text-primary tracking-wider bg-primary/10 px-2 py-0.5 rounded animate-pulse">CHECKING</span>
            <RefreshCw className="w-3.5 h-3.5 text-primary animate-spin" />
          </div>
        );
      default:
        return <span className="font-mono text-[10px] text-on-surface-variant/40 uppercase">READY</span>;
    }
  };

  return (
    <div className="mx-4 mt-4 mb-28 space-y-4" id="diagnostics-panel">
      {/* Diagnostics Header */}
      <div className="p-5 rounded-2xl glass-panel text-center">
        <Activity className={cn("w-10 h-10 mx-auto mb-3 text-primary", isRunning && "animate-pulse")} />
        <h2 className="font-sans text-base font-bold uppercase tracking-widest text-on-surface">Hardware Diagnostics</h2>
        <p className="mt-1 text-xs text-on-surface-variant max-w-[280px] mx-auto">
          Performs full end-to-end self-tests. The robot will briefly pulse motors to verify encoder and actuator interlocks.
        </p>

        <button
          onClick={handleStartDiagnostics}
          disabled={!connected || isRunning}
          className={cn(
            "mt-4 w-full py-3 rounded-xl font-sans text-xs font-black uppercase tracking-wider transition-all",
            connected && !isRunning
              ? "bg-primary text-surface hover:brightness-110 active:scale-[0.98] cursor-pointer shadow-lg"
              : "bg-white/10 text-on-surface-variant cursor-not-allowed"
          )}
        >
          {isRunning ? 'Checking Subsystems...' : 'Run Systems Check'}
        </button>
      </div>

      {/* Group Classification Checklist */}
      <div className="space-y-4">
        {/* Category 1: Connection */}
        <div className="p-4 rounded-2xl glass-panel space-y-3">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <Radio className="w-4 h-4 text-primary" />
            <h3 className="font-mono text-[10px] font-black uppercase tracking-widest text-on-surface">App & Comms Gateway</h3>
          </div>
          <div className="divide-y divide-white/5">
            {tests
              .filter((t) => t.category === 'connection')
              .map((t) => (
                <div key={t.id} className="flex items-center justify-between py-2.5">
                  <span className="font-sans text-xs font-semibold text-on-surface">{t.name}</span>
                  {getStatusBadge(t.status, t.detail)}
                </div>
              ))}
          </div>
        </div>

        {/* Category 2: Sensors */}
        <div className="p-4 rounded-2xl glass-panel space-y-3">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <Layers className="w-4 h-4 text-secondary" />
            <h3 className="font-mono text-[10px] font-black uppercase tracking-widest text-on-surface">Sensors Array</h3>
          </div>
          <div className="divide-y divide-white/5">
            {tests
              .filter((t) => t.category === 'sensors')
              .map((t) => (
                <div key={t.id} className="flex items-center justify-between py-2.5">
                  <span className="font-sans text-xs font-semibold text-on-surface">{t.name}</span>
                  {getStatusBadge(t.status, t.detail)}
                </div>
              ))}
          </div>
        </div>

        {/* Category 3: Actuators */}
        <div className="p-4 rounded-2xl glass-panel space-y-3">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <Cpu className="w-4 h-4 text-tertiary" />
            <h3 className="font-mono text-[10px] font-black uppercase tracking-widest text-on-surface">Mechanical Actuators</h3>
          </div>
          <div className="divide-y divide-white/5">
            {tests
              .filter((t) => t.category === 'actuators')
              .map((t) => (
                <div key={t.id} className="flex items-center justify-between py-2.5">
                  <span className="font-sans text-xs font-semibold text-on-surface">{t.name}</span>
                  {getStatusBadge(t.status, t.detail)}
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Terminal Real-Time Logs Console */}
      <div className="p-4 rounded-2xl glass-panel bg-black/40 border border-white/5">
        <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-3">
          <HardDrive className="w-4 h-4 text-on-surface-variant" />
          <h3 className="font-mono text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Live Console Log</h3>
        </div>
        <div className="font-mono text-[9px] text-secondary leading-normal h-44 overflow-y-auto space-y-1 bg-black/20 p-2 rounded-lg border border-white/5">
          {logs.length === 0 ? (
            <p className="text-on-surface-variant/40 uppercase">Terminal idle. Waiting for selfcheck...</p>
          ) : (
            logs.map((log, i) => <p key={i}>{log}</p>)
          )}
          <div ref={terminalEndRef} />
        </div>
      </div>
    </div>
  );
}
