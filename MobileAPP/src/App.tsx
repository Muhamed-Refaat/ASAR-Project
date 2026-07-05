import { useState } from 'react';
import Header from './components/Header';
import MasterStatus from './components/MasterStatus';
import ControlSwitch from './components/ControlSwitch';
import JoystickControl from './components/JoystickControl';
import ButtonControl from './components/ButtonControl';
import DistanceAwareness from './components/DistanceAwareness';
import BottomNav from './components/BottomNav';
import ConnectionSettings from './components/ConnectionSettings';
import AutoPilotPanel from './components/AutoPilotPanel';
import DataDashboard from './components/DataDashboard';
import DiagnosticsPanel from './components/DiagnosticsPanel';
import { useRobotConnection } from './lib/useRobotConnection';
import IndividualWheelControl from './components/IndividualWheelControl';

export default function App() {
  type ActiveTab = 'drive' | 'auto' | 'diagnostics' | 'data' | 'config';
  type ConnectionMode = 'direct' | 'relay';
  type ControlMode = 'joystick' | 'buttons';

  const [activeTab, setActiveTab] = useState<ActiveTab>('drive');
  const [controlMode, setControlMode] = useState<ControlMode>(
    () => {
      const saved = localStorage.getItem('robot_control_mode') as ControlMode;
      return (saved === 'joystick' || saved === 'buttons') ? saved : 'joystick';
    },
  );
  const [directUrl, setDirectUrl] = useState(
    () => localStorage.getItem('robot_direct_url') || 'ws://192.168.1.100:81',
  );
  const [relayUrl, setRelayUrl] = useState(
    () => localStorage.getItem('robot_relay_url') || 'ws://localhost:3001/ws',
  );
  const [maxSpeed, setMaxSpeed] = useState<number>(
    () => parseInt(localStorage.getItem('robot_max_speed') || '255', 10),
  );

  const robot = useRobotConnection(directUrl, relayUrl);

  const handleConnect = () => {
    robot.connect();
  };

  const handleDisconnect = () => {
    robot.disconnect();
  };

  const handleDirectUrlChange = (url: string) => {
    setDirectUrl(url);
    localStorage.setItem('robot_direct_url', url);
  };

  const handleRelayUrlChange = (url: string) => {
    setRelayUrl(url);
    localStorage.setItem('robot_relay_url', url);
  };

  const handleApplyMaxSpeed = (speed: number) => {
    const clamped = Math.max(0, Math.min(255, speed));
    setMaxSpeed(clamped);
    localStorage.setItem('robot_max_speed', String(clamped));
    robot.sendCommand(`MAX_SPD:${clamped}`);
  };

  return (
    <div className="min-h-screen bg-surface pb-32 selection:bg-primary/20" id="main-container">
      <Header connected={robot.connected} robotReady={robot.robotReady} />

      <main className="max-w-md mx-auto" id="dashboard-main">
        {activeTab === 'drive' && (
          <>
            <MasterStatus connected={robot.connected} robotReady={robot.robotReady} lastError={robot.lastError} />
            {!robot.isLeader && (
              <div className="mx-4 mt-4 flex items-center justify-between px-4 py-3 rounded-xl bg-tertiary/10 border border-tertiary/30">
                <span className="font-mono text-xs font-bold text-tertiary uppercase tracking-widest">Observer Mode — controls disabled</span>
                <button
                  onClick={robot.claimLeader}
                  className="px-3 py-1.5 rounded-lg bg-tertiary text-surface font-mono text-[10px] font-black uppercase tracking-widest"
                >
                  Claim Control
                </button>
              </div>
            )}
            <ControlSwitch
              sendCommand={robot.sendCommand}
              robotReady={robot.robotReady}
              isLeader={robot.isLeader}
              autopilotEnabled={robot.autopilotEnabled}
            />

            {/* Control Mode Toggle */}
            <div className="mx-4 mt-4 flex gap-2">
              <button
                onClick={() => {
                  setControlMode('joystick');
                  localStorage.setItem('robot_control_mode', 'joystick');
                }}
                className={`flex-1 py-2 rounded-xl font-mono text-[10px] font-bold uppercase transition-all ${
                  controlMode === 'joystick'
                    ? 'bg-primary text-surface'
                    : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
                }`}
              >
                Joystick
              </button>
              <button
                onClick={() => {
                  setControlMode('buttons');
                  localStorage.setItem('robot_control_mode', 'buttons');
                }}
                className={`flex-1 py-2 rounded-xl font-mono text-[10px] font-bold uppercase transition-all ${
                  controlMode === 'buttons'
                    ? 'bg-primary text-surface'
                    : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
                }`}
              >
                Buttons
              </button>
            </div>

            {/* Conditional Control Rendering */}
            {controlMode === 'joystick' && (
              <JoystickControl
                sendCommand={robot.sendCommand}
                robotReady={robot.robotReady}
                isLeader={robot.isLeader}
                manualLocked={robot.autopilotEnabled}
              />
            )}
            {controlMode === 'buttons' && (
              <ButtonControl
                sendCommand={robot.sendCommand}
                robotReady={robot.robotReady}
                isLeader={robot.isLeader}
                manualLocked={robot.autopilotEnabled}
              />
            )}

            <DistanceAwareness
              distFront={robot.distFront}
              distLeft={robot.distLeft}
              distRight={robot.distRight}
              distBack={robot.distBack}
            />
          </>
        )}

        {activeTab === 'auto' && (
          <>
            <MasterStatus connected={robot.connected} robotReady={robot.robotReady} lastError={robot.lastError} />
            <AutoPilotPanel
              robotReady={robot.robotReady}
              isLeader={robot.isLeader}
              autopilotEnabled={robot.autopilotEnabled}
              autopilotPhase={robot.autopilotPhase}
              autopilotRisk={robot.autopilotRisk}
              autopilotCmdLeft={robot.autopilotCmdLeft}
              autopilotCmdRight={robot.autopilotCmdRight}
              autopilotLastEvent={robot.autopilotLastEvent}
              posX={robot.posX}
              posY={robot.posY}
              heading={robot.heading}
              distLeft={robot.distLeft}
              distFront={robot.distFront}
              distRight={robot.distRight}
              distBack={robot.distBack}
              sendCommand={robot.sendCommand}
            />
          </>
        )}

        {activeTab === 'data' && (
          <>
            <MasterStatus connected={robot.connected} robotReady={robot.robotReady} lastError={robot.lastError} />
            <DataDashboard
              connected={robot.connected}
              robotReady={robot.robotReady}
              isLeader={robot.isLeader}
              rpmLeft={robot.rpmLeft}
              rpmRight={robot.rpmRight}
              distLeft={robot.distLeft}
              distFront={robot.distFront}
              distRight={robot.distRight}
              distBack={robot.distBack}
              autopilotEnabled={robot.autopilotEnabled}
              autopilotRisk={robot.autopilotRisk}
              rpmLeftHistory={robot.rpmLeftHistory}
              rpmRightHistory={robot.rpmRightHistory}
              minDistanceHistory={robot.minDistanceHistory}
              autopilotRiskHistory={robot.autopilotRiskHistory}
              eventLog={robot.eventLog}
              messageCount={robot.messageCount}
              connectionStartedAt={robot.connectionStartedAt}
              motionLoggingEnabled={robot.motionLoggingEnabled}
              motionLog={robot.motionLog}
              clearMotionLog={robot.clearMotionLog}
              sendCommand={robot.sendCommand}
            />
          </>
        )}

        {activeTab === 'diagnostics' && (
          <>
            <MasterStatus connected={robot.connected} robotReady={robot.robotReady} lastError={robot.lastError} />
            <DiagnosticsPanel
              connected={robot.connected}
              robotReady={robot.robotReady}
              sendCommand={robot.sendCommand}
              lastDiagLine={robot.lastDiagLine}
              setLastDiagLine={robot.setLastDiagLine}
            />
          </>
        )}

        {activeTab === 'config' && (
          <ConnectionSettings
            directUrl={directUrl}
            relayUrl={relayUrl}
            connected={robot.connected}
            sendCommand={robot.sendCommand}
            robotReady={robot.robotReady}
            isLeader={robot.isLeader}
            manualLocked={robot.autopilotEnabled}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onDirectUrlChange={handleDirectUrlChange}
            onRelayUrlChange={handleRelayUrlChange}
            connectionMode={robot.connectionMode}
            isConnecting={robot.isConnecting}
            currentAttemptMode={robot.currentAttemptMode}
          />
        )}
      </main>

      <BottomNav active={activeTab} onTabChange={(tab) => setActiveTab(tab as ActiveTab)} />
    </div>
  );
}
