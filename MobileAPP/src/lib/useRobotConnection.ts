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

export interface MotionLogEntry {
  millis: number;
  targetL: number;
  targetR: number;
  currL: number;
  currR: number;
  rpmL: number;
  rpmR: number;
  yawRate: number;
  bias: number;
  x: number;
  y: number;
  heading: number;
  raw: string;
}

function pushHistory(arr: { val: number }[], val: number): { val: number }[] {
  return [...arr.slice(-(MAX_HISTORY - 1)), { val }];
}

function pushEvent(arr: RobotEvent[], event: RobotEvent): RobotEvent[] {
  return [...arr.slice(-(LOG_LIMIT - 1)), event];
}

export function useRobotConnection(directUrl: string, relayUrl: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const eventSeqRef = useRef(1);
  const obstacleWarnAtRef = useRef(0);
  const wasConnectedRef = useRef(false);
  const retryCountRef = useRef(0);

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

  // Custom Automated Connection State Machine
  const [connectionMode, setConnectionMode] = useState<'idle' | 'direct' | 'relay'>('idle');
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentAttemptMode, setCurrentAttemptMode] = useState<'idle' | 'direct' | 'relay'>('idle');

  const [lastError, setLastError] = useState('');
  const [maxSpeedAck, setMaxSpeedAck] = useState<number | null>(null);
  const [motionLoggingEnabled, setMotionLoggingEnabled] = useState(false);
  const [motionLog, setMotionLog] = useState<MotionLogEntry[]>([]);
  const [autopilotEnabled, setAutopilotEnabled] = useState(false);
  const [autopilotPhase, setAutopilotPhase] = useState('OFF');
  const [autopilotCmdLeft, setAutopilotCmdLeft] = useState(0);
  const [autopilotCmdRight, setAutopilotCmdRight] = useState(0);
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [heading, setHeading] = useState(0);
  const [autopilotRisk, setAutopilotRisk] = useState(0);
  const [autopilotLastEvent, setAutopilotLastEvent] = useState('');
  const [rpmHistory, setRpmHistory] = useState<{ val: number }[]>([]);
  const [rpmLeftHistory, setRpmLeftHistory] = useState<{ val: number }[]>([]);
  const [rpmRightHistory, setRpmRightHistory] = useState<{ val: number }[]>([]);
  const [minDistanceHistory, setMinDistanceHistory] = useState<{ val: number }[]>([]);
  const [autopilotRiskHistory, setAutopilotRiskHistory] = useState<{ val: number }[]>([]);
  const [lastDiagLine, setLastDiagLine] = useState('');
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

  const clearMotionLog = useCallback(() => {
    setMotionLog([]);
  }, []);

  const disconnect = useCallback(() => {
    wasConnectedRef.current = false;
    retryCountRef.current = 0;
    if (reconnectRef.current) {
      clearTimeout(reconnectRef.current);
      reconnectRef.current = null;
    }
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    if (mountedRef.current) {
      setConnected(false);
      setRobotReady(false);
      setConnectionMode('idle');
      setIsConnecting(false);
      setCurrentAttemptMode('idle');
    }
  }, []);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    if (reconnectRef.current) clearTimeout(reconnectRef.current);
    if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnecting(true);
    setConnectionMode('idle');
    setConnected(false);
    setRobotReady(false);

    // Phase 1: Try Direct connection
    setCurrentAttemptMode('direct');
    addEvent('info', 'AUTO', `[Direct Attempt] Probing direct IP: ${directUrl}...`);

    try {
      const wsDirect = new WebSocket(directUrl);
      wsRef.current = wsDirect;

      connectTimeoutRef.current = setTimeout(() => {
        if (wsRef.current === wsDirect && wsDirect.readyState !== WebSocket.OPEN) {
          addEvent('warn', 'AUTO', `[Direct Timeout] Connection to ${directUrl} timed out.`);
          wsDirect.onclose = null;
          wsDirect.onerror = null;
          wsDirect.close();
          tryRelayFallback();
        }
      }, 2500);

      wsDirect.onopen = () => {
        if (!mountedRef.current || wsRef.current !== wsDirect) return;
        if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);

        wasConnectedRef.current = true;
        retryCountRef.current = 0;

        setConnected(true);
        setConnectionMode('direct');
        setIsConnecting(false);
        setCurrentAttemptMode('idle');
        setConnectionStartedAt(Date.now());

        addEvent('info', 'WS', `[SUCCESS] Connected directly on ${directUrl}`);
        wsDirect.send('START\n');
        addEvent('info', 'CMD', 'START sent');

        setupMessageAndCloseHandlers(wsDirect, 'direct');
      };

      wsDirect.onerror = () => {
        if (wsRef.current === wsDirect) {
          if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);
          wsDirect.close();
          tryRelayFallback();
        }
      };

      wsDirect.onclose = () => {
        if (wsRef.current === wsDirect) {
          if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);
          tryRelayFallback();
        }
      };
    } catch (err) {
      tryRelayFallback();
    }

    function tryRelayFallback() {
      if (!mountedRef.current) return;
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
        wsRef.current = null;
      }

      // Phase 2: Try Relay connection
      setCurrentAttemptMode('relay');
      addEvent('info', 'AUTO', `[Relay Fallback] Trying Relay backend: ${relayUrl}...`);

      try {
        const wsRelay = new WebSocket(relayUrl);
        wsRef.current = wsRelay;

        wsRelay.onopen = () => {
          if (!mountedRef.current || wsRef.current !== wsRelay) return;

          wasConnectedRef.current = true;
          retryCountRef.current = 0;

          setConnected(true);
          setConnectionMode('relay');
          setIsConnecting(false);
          setCurrentAttemptMode('idle');
          setConnectionStartedAt(Date.now());

          addEvent('info', 'WS', `[SUCCESS] Connected to relay on ${relayUrl}`);
          wsRelay.send('START\n');
          addEvent('info', 'CMD', 'START sent');

          setupMessageAndCloseHandlers(wsRelay, 'relay');
        };

        wsRelay.onerror = () => {
          if (wsRef.current === wsRelay) {
            wsRelay.close();
            handleAllFailed();
          }
        };

        wsRelay.onclose = () => {
          if (wsRef.current === wsRelay) {
            handleAllFailed();
          }
        };
      } catch (err) {
        handleAllFailed();
      }
    }

    function handleAllFailed() {
      if (!mountedRef.current) return;
      setConnected(false);
      setRobotReady(false);
      setConnectionMode('idle');
      setIsConnecting(false);
      setCurrentAttemptMode('idle');
      setConnectionStartedAt(null);
      wsRef.current = null;

      if (wasConnectedRef.current) {
        if (retryCountRef.current < 5) {
          retryCountRef.current++;
          addEvent('warn', 'AUTO', `[DISCONNECTED] Connection lost. Retrying auto-connect (${retryCountRef.current}/5) in 10s...`);
          reconnectRef.current = setTimeout(() => connect(), 10000);
        } else {
          addEvent('error', 'AUTO', '[CONNECT FAILED] Maximum reconnection retries (5/5) reached. Stopped.');
          wasConnectedRef.current = false;
          retryCountRef.current = 0;
        }
      } else {
        addEvent('error', 'AUTO', '[CONNECT FAILED] Initial connection failed. Handshake stopped.');
      }
    }

    function setupMessageAndCloseHandlers(ws: WebSocket, mode: 'direct' | 'relay') {
      ws.onmessage = (event: MessageEvent) => {
        if (!mountedRef.current || wsRef.current !== ws) return;
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
              const keys = ['l', 'f', 'r', 'b'] as const;
              const filtered = rawVals.map((v, i) => {
                const k = keys[i];
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
              setPosX(parseFloat(parts[4]) || 0);
              setPosY(parseFloat(parts[5]) || 0);
              setHeading(parseFloat(parts[6]) || 0);
              const risk = parseFloat(parts[7]) || 0;
              setAutopilotRisk(risk);
              setAutopilotRiskHistory((prev) => pushHistory(prev, risk));
            }
          } else if (line.startsWith('AUTO_EVT:')) {
            setAutopilotLastEvent(line.slice('AUTO_EVT:'.length));
            addEvent('info', 'AUTO', line.slice('AUTO_EVT:'.length));
          } else if (line.startsWith('LOG:')) {
            const parts = line.slice(4).split(':');
            if (parts.length === 12) {
              const entry: MotionLogEntry = {
                millis: parseInt(parts[0], 10) || 0,
                targetL: parseInt(parts[1], 10) || 0,
                targetR: parseInt(parts[2], 10) || 0,
                currL: parseInt(parts[3], 10) || 0,
                currR: parseInt(parts[4], 10) || 0,
                rpmL: parseInt(parts[5], 10) || 0,
                rpmR: parseInt(parts[6], 10) || 0,
                yawRate: parseInt(parts[7], 10) || 0,
                bias: parseInt(parts[8], 10) || 0,
                x: parseFloat(parts[9]) || 0,
                y: parseFloat(parts[10]) || 0,
                heading: parseFloat(parts[11]) || 0,
                raw: line,
              };
              setMotionLog((prev) => [...prev.slice(-1499), entry]);
            }
          } else if (line === 'ACK:LOG_ON') {
            setMotionLoggingEnabled(true);
            addEvent('info', 'MEGA', 'Motion telemetry logging enabled');
          } else if (line === 'ACK:LOG_OFF') {
            setMotionLoggingEnabled(false);
            addEvent('info', 'MEGA', 'Motion telemetry logging disabled');
          } else if (line.startsWith('DIAG_ESP:') || line.startsWith('DIAG_RESULT:')) {
            setLastDiagLine(line);
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

      ws.onerror = () => {
        if (wsRef.current === ws) {
          ws.close();
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current || wsRef.current !== ws) return;
        setConnected(false);
        setRobotReady(false);
        setConnectionStartedAt(null);
        setConnectionMode('idle');
        wsRef.current = null;

        if (wasConnectedRef.current) {
          if (retryCountRef.current < 5) {
            retryCountRef.current++;
            addEvent('warn', 'WS', `Connection to ${mode === 'direct' ? 'Direct' : 'Relay'} lost. Retrying auto-connect (${retryCountRef.current}/5) in 10s...`);
            reconnectRef.current = setTimeout(() => connect(), 10000); // 10 second interval
          } else {
            addEvent('error', 'WS', 'Maximum reconnection retries (5/5) reached. Stopped.');
            wasConnectedRef.current = false;
            retryCountRef.current = 0;
            setIsConnecting(false);
          }
        } else {
          addEvent('error', 'WS', 'Connection closed.');
        }
      };
    }
  }, [addEvent, directUrl, relayUrl]);

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
    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [disconnect]);

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
    posX,
    posY,
    heading,
    autopilotRisk,
    autopilotLastEvent,
    rpmHistory,
    rpmLeftHistory,
    rpmRightHistory,
    minDistanceHistory,
    autopilotRiskHistory,
    lastDiagLine,
    setLastDiagLine,
    messageCount,
    connectionStartedAt,
    eventLog,
    motionLoggingEnabled,
    motionLog,
    clearMotionLog,
    sendCommand,
    claimLeader,
    connect,
    disconnect,
    connectionMode,
    isConnecting,
    currentAttemptMode,
  };
}
