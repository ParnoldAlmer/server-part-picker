import './index.css';
import { ChassisSelector } from './components/ChassisSelector';
import { BuildSummary } from './components/BuildSummary';
import { NodeTabs } from './components/NodeTabs';
import { useBuildStore } from './store/buildStore';

function App() {
  const { build, resetBuild } = useBuildStore();

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-700 bg-slate-800">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">ServerSpec</h1>
          <p className="text-slate-400 mt-1">Enterprise Server Configurator</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!build.chassis ? (
          <ChassisSelector />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
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
            <div>
              <BuildSummary />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
