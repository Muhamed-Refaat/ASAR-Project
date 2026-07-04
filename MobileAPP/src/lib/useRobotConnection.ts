import { useCallback, useEffect, useRef, useState } from 'react';

const MAX_HISTORY = 20;
const LOG_LIMIT = 80;

export type RobotEventLevel = 'info' | 'warn' | 'error';

export interface RobotEvent {
  id: number;
  at: number;
  level: RobotEventLevel;
  source: string;
  message: string;
}

function pushHistory(arr: { val: number }[], val: number): { val: number }[] {
  return [...arr.slice(-(MAX_HISTORY - 1)), { val }];
}

function pushEvent(arr: RobotEvent[], event: RobotEvent): RobotEvent[] {
  return [...arr.slice(-(LOG_LIMIT - 1)), event];
}

export function useRobotConnection(url: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const eventSeqRef = useRef(1);
  const obstacleWarnAtRef = useRef(0);

  const [connected, setConnected] = useState(false);
  const [robotReady, setRobotReady] = useState(false);
  const [isLeader, setIsLeader] = useState(true);
  const [rpmLeft, setRpmLeft] = useState(0);
  const [rpmRight, setRpmRight] = useState(0);
  const [distLeft, setDistLeft] = useState(0);
  const [distFront, setDistFront] = useState(0);
  const [distRight, setDistRight] = useState(0);
  const [distBack, setDistBack] = useState(0);
  const lastDistRef = useRef({ l: 0, f: 0, r: 0, b: 0 });

  const [lastError, setLastError] = useState('');
  const [maxSpeedAck, setMaxSpeedAck] = useState<number | null>(null);
  const [autopilotEnabled, setAutopilotEnabled] = useState(false);
  const [autopilotPhase, setAutopilotPhase] = useState('OFF');
  const [autopilotCmdLeft, setAutopilotCmdLeft] = useState(0);
  const [autopilotCmdRight, setAutopilotCmdRight] = useState(0);
  const [autopilotRisk, setAutopilotRisk] = useState(0);
  const [autopilotLastEvent, setAutopilotLastEvent] = useState('');
  const [rpmHistory, setRpmHistory] = useState<{ val: number }[]>([]);
  const [rpmLeftHistory, setRpmLeftHistory] = useState<{ val: number }[]>([]);
  const [rpmRightHistory, setRpmRightHistory] = useState<{ val: number }[]>([]);
  const [minDistanceHistory, setMinDistanceHistory] = useState<{ val: number }[]>([]);
  const [autopilotRiskHistory, setAutopilotRiskHistory] = useState<{ val: number }[]>([]);
  const [messageCount, setMessageCount] = useState(0);
  const [connectionStartedAt, setConnectionStartedAt] = useState<number | null>(null);
  const [eventLog, setEventLog] = useState<RobotEvent[]>([]);

  const addEvent = useCallback((level: RobotEventLevel, source: string, message: string) => {
    setEventLog((prev) =>
      pushEvent(prev, {
        id: eventSeqRef.current++,
        at: Date.now(),
        level,
        source,
        message,
      }),
    );
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectRef.current) {
      clearTimeout(reconnectRef.current);
      reconnectRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    if (mountedRef.current) {
      setConnected(false);
      setRobotReady(false);
    }
  }, []);

  const connect = useCallback(() => {
    if (!url || !mountedRef.current) return;
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setConnected(true);
        setConnectionStartedAt(Date.now());
        addEvent('info', 'WS', 'Connected to robot endpoint');
        ws.send('START\n');
        addEvent('info', 'CMD', 'START sent');
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setConnected(false);
        setRobotReady(false);
        setConnectionStartedAt(null);
        wsRef.current = null;
        addEvent('warn', 'WS', 'Connection closed, retrying in 3s');
        reconnectRef.current = setTimeout(() => connect(), 3000);
      };

      ws.onerror = () => {
        // triggers onclose
      };

      ws.onmessage = (event: MessageEvent) => {
        if (!mountedRef.current) return;
        const raw = String(event.data);
        const lines = raw.split('\n');
        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line) continue;
          setMessageCount((prev) => prev + 1);

          if (line === 'RDY') {
            setRobotReady(true);
            addEvent('info', 'MEGA', 'RDY handshake received');
          } else if (line.startsWith('RPM:')) {
            const parts = line.slice(4).split(':');
            if (parts.length === 2) {
              const l = parseFloat(parts[0]) || 0;
              const r = parseFloat(parts[1]) || 0;
              setRpmLeft(l);
              setRpmRight(r);
              setRpmHistory((prev) => pushHistory(prev, (l + r) / 2));
              setRpmLeftHistory((prev) => pushHistory(prev, l));
              setRpmRightHistory((prev) => pushHistory(prev, r));
            }
          } else if (line.startsWith('DIST:')) {
            const parts = line.slice(5).split(':');
            if (parts.length === 4) {
              const rawVals = [
                parseFloat(parts[0]) || 0,
                parseFloat(parts[1]) || 0,
                parseFloat(parts[2]) || 0,
                parseFloat(parts[3]) || 0,
              ];

              // Simple denoising: if exactly one value is 0 and it was significantly > 0 before, 
              // we keep the previous value for ONE frame to avoid flicker.
              const keys = ['l', 'f', 'r', 'b'] as const;
              const filtered = rawVals.map((v, i) => {
                const k = keys[i];
                const prev = lastDistRef.current[k];
                if (v === 0 && prev > 20) {
                  // Potential flicker, but we must update eventually if it's really 0.
                  // For now, let's just trust the report and fix UI presentation.
                  lastDistRef.current[k] = v;
                  return v;
                }
                lastDistRef.current[k] = v;
                return v;
              });

              setDistLeft(filtered[0]);
              setDistFront(filtered[1]);
              setDistRight(filtered[2]);
              setDistBack(filtered[3]);

              const observed = filtered.filter((value) => value > 0);
              const minDistance = observed.length > 0 ? Math.min(...observed) : 0;
              setMinDistanceHistory((prev) => pushHistory(prev, minDistance));

              const now = Date.now();
              if (minDistance > 0 && minDistance < 30 && now - obstacleWarnAtRef.current > 3000) {
                obstacleWarnAtRef.current = now;
                addEvent('warn', 'SAFE', `Obstacle close (${minDistance.toFixed(0)}cm)`);
              }
            }
          } else if (line.startsWith('ERR:')) {
            setLastError(line.slice(4));
            addEvent('error', 'ERR', line.slice(4));
          } else if (line.startsWith('ACK:MAX_SPD:')) {
            const val = parseInt(line.slice('ACK:MAX_SPD:'.length), 10);
            if (!isNaN(val)) setMaxSpeedAck(val);
            if (!isNaN(val)) addEvent('info', 'ACK', `Max speed set to ${val}`);
          } else if (line.startsWith('AUTO_STAT:')) {
            const parts = line.slice('AUTO_STAT:'.length).split(':');
            if (parts.length === 8) {
              setAutopilotEnabled(parts[0] === '1');
              setAutopilotPhase(parts[1] || 'OFF');
              setAutopilotCmdLeft(parseFloat(parts[2]) || 0);
              setAutopilotCmdRight(parseFloat(parts[3]) || 0);
              const risk = parseFloat(parts[7]) || 0;
              setAutopilotRisk(risk);
              setAutopilotRiskHistory((prev) => pushHistory(prev, risk));
            }
          } else if (line.startsWith('AUTO_EVT:')) {
            setAutopilotLastEvent(line.slice('AUTO_EVT:'.length));
            addEvent('info', 'AUTO', line.slice('AUTO_EVT:'.length));
          } else if (line.startsWith('{')) {
            try {
              const obj = JSON.parse(line);
              if (obj.type === 'esp32_disconnected') setRobotReady(false);
              if (obj.type === 'role') {
                setIsLeader(obj.role === 'leader');
                addEvent('info', 'ROLE', obj.role === 'leader' ? 'Control role granted' : 'Observer mode active');
              }
            } catch {
              // ignore
            }
          }
        }
      };
    } catch {
      if (mountedRef.current) {
        addEvent('warn', 'WS', 'Connection attempt failed');
        reconnectRef.current = setTimeout(() => connect(), 3000);
      }
    }
  }, [addEvent, url]);

  const sendCommand = useCallback((cmd: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(cmd.endsWith('\n') ? cmd : `${cmd}\n`);
    }
  }, []);

  const claimLeader = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'claim_leader' }));
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [url]);

  return {
    connected,
    robotReady,
    isLeader,
    rpmLeft,
    rpmRight,
    distLeft,
    distFront,
    distRight,
    distBack,
    lastError,
    maxSpeedAck,
    autopilotEnabled,
    autopilotPhase,
    autopilotCmdLeft,
    autopilotCmdRight,
    autopilotRisk,
    autopilotLastEvent,
    rpmHistory,
    rpmLeftHistory,
    rpmRightHistory,
    minDistanceHistory,
    autopilotRiskHistory,
    messageCount,
    connectionStartedAt,
    eventLog,
    sendCommand,
    claimLeader,
    connect,
    disconnect,
  };
}
