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
import { useRobotConnection } from './lib/useRobotConnection';
import IndividualWheelControl from './components/IndividualWheelControl';

export default function App() {
  type ActiveTab = 'drive' | 'auto' | 'data' | 'config';
  type ConnectionMode = 'direct' | 'relay';
  type ControlMode = 'joystick' | 'buttons' | 'individual';

  const [activeTab, setActiveTab] = useState<ActiveTab>('drive');
  const [controlMode, setControlMode] = useState<ControlMode>(
    () => (localStorage.getItem('robot_control_mode') as ControlMode) || 'joystick',
  );
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>(
    () => (localStorage.getItem('robot_connection_mode') as ConnectionMode) || 'direct',
  );
  const [directUrl, setDirectUrl] = useState(
    () => localStorage.getItem('robot_direct_url') || 'ws://192.168.100.34:81',
  );
  const [relayUrl, setRelayUrl] = useState(
    () => localStorage.getItem('robot_relay_url') || 'ws://localhost:3001/ws',
  );
  const [maxSpeed, setMaxSpeed] = useState<number>(
    () => parseInt(localStorage.getItem('robot_max_speed') || '255', 10),
  );

  const activeUrl = connectionMode === 'direct' ? directUrl : relayUrl;
  const robot = useRobotConnection(activeUrl);

  const handleConnect = (url: string, mode: ConnectionMode) => {
    if (mode === 'direct') {
      setDirectUrl(url);
      localStorage.setItem('robot_direct_url', url);
    } else {
      setRelayUrl(url);
      localStorage.setItem('robot_relay_url', url);
    }
    // Updating connectionMode changes activeUrl, which triggers useRobotConnection's
    // useEffect([url]) to disconnect from the old WS and connect to the new one.
    setConnectionMode(mode);
    localStorage.setItem('robot_connection_mode', mode);
  };

  const handleDisconnect = () => {
    robot.disconnect();
  };

  const handleModeChange = (mode: ConnectionMode) => {
    setConnectionMode(mode);
    localStorage.setItem('robot_connection_mode', mode);
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
              <button
                onClick={() => {
                  setControlMode('individual');
                  localStorage.setItem('robot_control_mode', 'individual');
                }}
                className={`flex-1 py-2 rounded-xl font-mono text-[10px] font-bold uppercase transition-all ${
                  controlMode === 'individual'
                    ? 'bg-primary text-surface'
                    : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
                }`}
              >
                Individual
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
            {controlMode === 'individual' && (
              <IndividualWheelControl
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
            />
          </>
        )}

        {activeTab === 'config' && (
          <ConnectionSettings
            connectionMode={connectionMode}
            directUrl={directUrl}
            relayUrl={relayUrl}
            connected={robot.connected}
            maxSpeed={maxSpeed}
            maxSpeedAck={robot.maxSpeedAck}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onModeChange={handleModeChange}
            onDirectUrlChange={handleDirectUrlChange}
            onRelayUrlChange={handleRelayUrlChange}
            onApplyMaxSpeed={handleApplyMaxSpeed}
          />
        )}
      </main>

      <BottomNav active={activeTab} onTabChange={(tab) => setActiveTab(tab as ActiveTab)} />
    </div>
  );
}
