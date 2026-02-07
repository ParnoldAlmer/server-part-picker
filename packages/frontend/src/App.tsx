import './index.css';
import { ChassisSelector } from './components/ChassisSelector';
import { BuildSummary } from './components/BuildSummary';
import { NodeTabs } from './components/NodeTabs';
import { useBuildStore } from './store/buildStore';
import {
  runValidation,
  socketRule,
  memoryTypeRule,
  memoryBalanceRule,
  memorySlotRule,
  bayLimitRule,
  powerRule,
  nodeTopologyRule,
  compatibilityGraphRule,
} from './lib/validation';
import { calculatePower } from './lib/validation/rules/powerRule';

function App() {
  const { build, resetBuild } = useBuildStore();
  const rules = [
    socketRule,
    memoryTypeRule,
    memoryBalanceRule,
    memorySlotRule,
    bayLimitRule,
    powerRule,
    nodeTopologyRule,
    compatibilityGraphRule,
  ];
  const issues = build.chassis ? runValidation(build, rules) : [];
  const errorCount = issues.filter((issue) => issue.severity === 'error').length;
  const warningCount = issues.filter((issue) => issue.severity === 'warn').length;
  const compatibilityStatus = errorCount > 0
    ? `${errorCount} blocking compatibility issue${errorCount > 1 ? 's' : ''}`
    : warningCount > 0
      ? `${warningCount} warning${warningCount > 1 ? 's' : ''}, review recommended`
      : 'No blocking incompatibilities found';
  const compatibilityTone = errorCount > 0
    ? 'bg-red-600/90'
    : warningCount > 0
      ? 'bg-amber-600/90'
      : 'bg-emerald-600/90';
  const estimatedWattage = build.chassis ? calculatePower(build) : 0;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-700 bg-slate-800">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">ServerSpec</h1>
          <p className="text-slate-400 mt-1">Server Build Planner (PCPartPicker-style workflow)</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!build.chassis ? (
          <ChassisSelector />
        ) : (
          <div className="space-y-6">
            <div className="rounded-lg border border-slate-700 overflow-hidden shadow-lg bg-slate-800/70">
              <div className="px-3 py-3 bg-slate-800 border-b border-slate-700 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0 rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-300 truncate">
                  https://serverspec.local/list/{build.id.slice(0, 8)}
                </div>
                <div className="flex items-center gap-2">
                  <button className="h-8 px-3 rounded-md text-xs font-semibold text-slate-200 bg-slate-700 hover:bg-slate-600">
                    Markup
                  </button>
                  <button className="h-8 px-3 rounded-md text-xs font-semibold text-slate-200 bg-slate-700 hover:bg-slate-600">
                    History
                  </button>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row">
                <div className={`flex-1 px-4 py-2.5 text-sm font-semibold ${compatibilityTone}`}>
                  Compatibility: {compatibilityStatus}
                </div>
                <div className="px-4 py-2.5 text-sm font-semibold bg-blue-600 text-white sm:min-w-[220px]">
                  Estimated Wattage: {estimatedWattage}W
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 min-w-0">
                <div className="mb-8">
                  <button
                    onClick={() => resetBuild()}
                    className="text-blue-400 hover:text-blue-300 text-sm"
                  >
                    ← Change Chassis
                  </button>
                </div>
                <h2 className="text-2xl font-bold mb-2">Configure Nodes</h2>
                <p className="text-slate-400 mb-6">
                  Selected: {build.chassis.name} ({build.nodes.length} node
                  {build.nodes.length > 1 ? 's' : ''})
                </p>
                <NodeTabs />
              </div>
              <div className="min-w-0">
                <BuildSummary />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
