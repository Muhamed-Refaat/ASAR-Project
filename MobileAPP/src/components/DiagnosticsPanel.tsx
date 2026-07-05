import { useEffect, useState, useRef } from 'react';
import { cn } from '@/src/lib/utils';
import { Activity, Cpu, Radio, HardDrive, RefreshCw, Layers } from 'lucide-react';

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
    { id: 'websocket', name: 'App-WebSocket Link', category: 'connection', status: 'idle' },
    { id: 'esp_wifi', name: 'ESP32 Wi-Fi Signal', category: 'connection', status: 'idle' },
    { id: 'uart_link', name: 'ESP-Mega Serial Link', category: 'connection', status: 'idle' },
    { id: 'mpu_imu', name: 'MPU-6050 Gyro/IMU', category: 'sensors', status: 'idle' },
    { id: 'l_us', name: 'HC-SR04 Left Ultrasonic', category: 'sensors', status: 'idle' },
    { id: 'f_us', name: 'HC-SR04 Front Ultrasonic', category: 'sensors', status: 'idle' },
    { id: 'r_us', name: 'HC-SR04 Right Ultrasonic', category: 'sensors', status: 'idle' },
    { id: 'b_us', name: 'HC-SR04 Rear Ultrasonic', category: 'sensors', status: 'idle' },
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

    if (line.startsWith('DIAG_ESP:')) {
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
              detail: `RSSI: ${rssi} | HEAP: ${heap}`,
            };
          }
          return t;
        }),
      );

      addLog(`ESP32: WIFI=${wifi ? 'OK' : 'FAIL'} (SIG_RSSI: ${rssi}) | DYN_HEAP=${heap}`);
      addLog(`COM_SEQ: TRANS_HANDSHAKE -> MEGA_AVR...`);

      setTests((prev) =>
        prev.map((t) => (t.id === 'uart_link' ? { ...t, status: 'running' } : t)),
      );
    }

    if (line.startsWith('DIAG_RESULT:')) {
      const parts = line.slice('DIAG_RESULT:'.length).split(':');
      const results: Record<string, boolean> = {};

      parts.forEach((p) => {
        const [key, val] = p.split('=');
        if (key) results[key] = val === 'OK';
      });

      addLog(`SYSCHECK_RESP: FRAME RECEIVED.`);

      setTests((prev) =>
        prev.map((t) => {
          let status: 'pass' | 'fail' = 'fail';
          let detail = 'FAIL';

          if (t.id === 'uart_link') {
            status = 'pass';
            detail = '9600 BAUD OK';
          } else if (t.id === 'mpu_imu') {
            status = results['IMU'] ? 'pass' : 'fail';
            detail = results['IMU'] ? 'I2C 0x68 ADDR OK' : 'I2C ADDR ERR';
          } else if (t.id === 'l_us') {
            status = results['L_US'] ? 'pass' : 'fail';
            detail = results['L_US'] ? 'PINGS OK' : 'US_TIMEOUT';
          } else if (t.id === 'f_us') {
            status = results['F_US'] ? 'pass' : 'fail';
            detail = results['F_US'] ? 'PINGS OK' : 'US_TIMEOUT';
          } else if (t.id === 'r_us') {
            status = results['R_US'] ? 'pass' : 'fail';
            detail = results['R_US'] ? 'PINGS OK' : 'US_TIMEOUT';
          } else if (t.id === 'b_us') {
            status = results['B_US'] ? 'pass' : 'fail';
            detail = results['B_US'] ? 'PINGS OK' : 'US_TIMEOUT';
          } else if (t.id === 'l_mot') {
            status = results['L_MOT'] && results['L_ENC'] ? 'pass' : 'fail';
            detail = results['L_MOT'] && results['L_ENC'] ? 'MTR_PWM_PULSE OK' : 'NO_ENC_TICKS';
          } else if (t.id === 'r_mot') {
            status = results['R_MOT'] && results['R_ENC'] ? 'pass' : 'fail';
            detail = results['R_MOT'] && results['R_ENC'] ? 'MTR_PWM_PULSE OK' : 'NO_ENC_TICKS';
          }

          return { ...t, status, detail };
        }),
      );

      addLog(`--- METRIC_SUMMARY ---`);
      addLog(`MPU-6050: ${results['IMU'] ? 'VERIFIED_OK' : 'VERIFIED_FAIL'}`);
      addLog(`ULTRASONIC: L:${results['L_US'] ? 'OK' : 'FAIL'} | F:${results['F_US'] ? 'OK' : 'FAIL'} | R:${results['R_US'] ? 'OK' : 'FAIL'} | B:${results['B_US'] ? 'OK' : 'FAIL'}`);
      addLog(`ACTUATOR: L_MTR:${results['L_MOT'] ? 'OK' : 'FAIL'} | R_MTR:${results['R_MOT'] ? 'OK' : 'FAIL'}`);
      addLog(`SYS_DIAG_COMPLETE. STATE: SUCCESS.`);

      setIsRunning(false);
      setLastDiagLine(''); 
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

    setTests((prev) =>
      prev.map((t) => {
        if (t.id === 'websocket') {
          return { ...t, status: 'pass', detail: 'SOCKET_LINK_VERIFIED' };
        }
        return { ...t, status: 'idle', detail: undefined };
      }),
    );

    addLog(`INIT: SYSTEM AUTO_DIAGNOSTIC CORE...`);
    addLog(`SEQ_01: APP_WS_LINK: SUCCESS.`);
    addLog(`SEQ_02: PROBING ESP32 COMM GATEWAY...`);

    setTests((prev) =>
      prev.map((t) => (t.id === 'esp_wifi' ? { ...t, status: 'running' } : t)),
    );

    sendCommand('DIAG_START');

    timeoutRef.current = setTimeout(() => {
      setIsRunning(false);
      addLog(`[TIMEOUT] NO_RESPONSE RECEIVED FROM ROBOT CORES AFTER 10000MS.`);
      addLog(`DIAG_ABORT: CHECK COMM BAUD, WiFi LINK, AND POWER.`);
      setTests((prev) =>
        prev.map((t) => {
          if (t.status === 'idle' || t.status === 'running') {
            return { ...t, status: 'fail', detail: 'COMM_TIMEOUT_ERR' };
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
            <span className="text-[10px] font-black uppercase text-secondary tracking-wider bg-secondary/10 px-1.5 py-0.5 border border-secondary/35 glow-text-secondary">PASS</span>
            {detail && <p className="text-[8px] text-on-surface-variant mt-1 uppercase tracking-widest">{detail}</p>}
          </div>
        );
      case 'fail':
        return (
          <div className="text-right">
            <span className="text-[10px] font-black uppercase text-error tracking-wider bg-error/10 px-1.5 py-0.5 border border-error/35 glow-text-error">FAIL</span>
            {detail && <p className="text-[8px] text-error mt-1 uppercase tracking-widest">{detail}</p>}
          </div>
        );
      case 'running':
        return (
          <div className="text-right flex items-center justify-end gap-1.5">
            <span className="text-[10px] font-black uppercase text-primary tracking-wider bg-primary/10 px-1.5 py-0.5 border border-primary/35 glow-text-primary animate-pulse">RUNNING</span>
            <RefreshCw className="w-3.5 h-3.5 text-primary animate-spin" />
          </div>
        );
      default:
        return <span className="text-[9px] text-on-surface-variant/30 uppercase font-black">READY</span>;
    }
  };

  return (
    <div className="mx-4 mt-4 mb-28 space-y-4 font-mono select-none crt-flicker" id="diagnostics-panel">
      {/* Diagnostics Header */}
      <div className="p-5 rounded-none glass-panel text-center border border-primary/20 cyber-corners bg-surface-container/60">
        <Activity className={cn("w-8 h-8 mx-auto mb-3 text-primary glow-text-primary", isRunning && "animate-pulse")} />
        <h2 className="text-sm font-extrabold uppercase tracking-widest text-on-surface glow-text-primary">[ SYS_AUTOCHECK_ENGINE ]</h2>
        <p className="mt-2 text-[9px] text-on-surface-variant leading-relaxed uppercase max-w-[290px] mx-auto">
          Runs isolated hardware stress diagnostics. Motors will briefly pulse to verify encoder interrupt lines.
        </p>

        <button
          onClick={handleStartDiagnostics}
          disabled={!connected || isRunning}
          className={cn(
            "mt-5 w-full py-3 border font-sans text-xs font-black uppercase tracking-widest transition-all active:scale-[0.98]",
            connected && !isRunning
              ? "bg-primary/15 border-primary text-primary glow-primary hover:bg-primary/25 cursor-pointer"
              : "bg-surface-container-high border-white/5 text-on-surface-variant/40 cursor-not-allowed"
          )}
        >
          {isRunning ? 'RUNNING_DIAG_SEQUENCE...' : 'RUN CORE SELFCHECK'}
        </button>
      </div>

      {/* Checklist Grid */}
      <div className="space-y-4">
        {/* Category 1: Connection */}
        <div className="p-4 rounded-none glass-panel border border-primary/10 cyber-corners">
          <div className="flex items-center gap-2 border-b border-primary/20 pb-2 mb-3">
            <Radio className="w-4 h-4 text-primary glow-text-primary" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-on-surface">APP_COMM_CHANNELS</h3>
          </div>
          <div className="space-y-3.5">
            {tests
              .filter((t) => t.category === 'connection')
              .map((t) => (
                <div key={t.id} className="flex items-center justify-between">
                  <span className="text-xs font-bold text-on-surface uppercase tracking-wider">{t.name}</span>
                  {getStatusBadge(t.status, t.detail)}
                </div>
              ))}
          </div>
        </div>

        {/* Category 2: Sensors */}
        <div className="p-4 rounded-none glass-panel border border-secondary/15 cyber-corners-secondary">
          <div className="flex items-center gap-2 border-b border-secondary/25 pb-2 mb-3">
            <Layers className="w-4 h-4 text-secondary glow-text-secondary" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-on-surface">SENSORS_ARRAY_FEED</h3>
          </div>
          <div className="space-y-3.5">
            {tests
              .filter((t) => t.category === 'sensors')
              .map((t) => (
                <div key={t.id} className="flex items-center justify-between">
                  <span className="text-xs font-bold text-on-surface uppercase tracking-wider">{t.name}</span>
                  {getStatusBadge(t.status, t.detail)}
                </div>
              ))}
          </div>
        </div>

        {/* Category 3: Actuators */}
        <div className="p-4 rounded-none glass-panel border border-tertiary/15 cyber-corners-tertiary">
          <div className="flex items-center gap-2 border-b border-tertiary/25 pb-2 mb-3">
            <Cpu className="w-4 h-4 text-tertiary glow-text-tertiary" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-on-surface">MECHANICAL_ACTUATORS</h3>
          </div>
          <div className="space-y-3.5">
            {tests
              .filter((t) => t.category === 'actuators')
              .map((t) => (
                <div key={t.id} className="flex items-center justify-between">
                  <span className="text-xs font-bold text-on-surface uppercase tracking-wider">{t.name}</span>
                  {getStatusBadge(t.status, t.detail)}
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Terminal Real-Time Console */}
      <div className="p-4 rounded-none glass-panel bg-black/50 border border-primary/20 relative">
        <div className="absolute top-0.5 right-1.5 text-[6px] text-primary/15 font-black uppercase">TTY_BUFFER_SYS</div>
        <div className="flex items-center gap-2 border-b border-primary/20 pb-2 mb-3">
          <HardDrive className="w-4 h-4 text-primary glow-text-primary" />
          <h3 className="text-[10px] font-black uppercase tracking-widest text-primary glow-text-primary">LIVE_OS_CONSOLE</h3>
        </div>
        <div className="text-[9px] text-secondary glow-text-secondary leading-relaxed h-44 overflow-y-auto space-y-1.5 bg-black/40 p-3 border border-primary/10 select-all terminal-cursor">
          {logs.length === 0 ? (
            <p className="text-on-surface-variant/30 uppercase tracking-widest font-black animate-pulse">[ TTY_STANDBY: AWAITING CORE TELEMETRY KERNEL CHECK... ]</p>
          ) : (
            logs.map((log, i) => <p key={i}>{log}</p>)
          )}
          <div ref={terminalEndRef} />
        </div>
      </div>
    </div>
  );
}
