import { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { useBuildStore } from '../store/buildStore';
import { PartBrowser } from './PartBrowser';
import type { Motherboard } from '../types/hardware';

export function NodeTabs() {
    const { build, setNodeMotherboard } = useBuildStore();
    const [selectedNodeIndex, setSelectedNodeIndex] = useState(0);
    const [motherboards, setMotherboards] = useState<Motherboard[]>([]);
    const [showMoboSelector, setShowMoboSelector] = useState(false);

    useEffect(() => {
        fetch('http://localhost:3001/api/catalog/motherboards')
            .then(res => res.json())
            .then(data => setMotherboards(data))
            .catch(console.error);
    }, []);

    if (!build.chassis) return null;

    const currentNode = build.nodes[selectedNodeIndex];

    return (
        <div className="space-y-6">
            {/* Node Tabs */}
            <div className="flex gap-2 border-b border-slate-700">
                {build.nodes.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => setSelectedNodeIndex(idx)}
                        className={cn(
                            "px-4 py-2 font-medium transition-colors border-b-2",
                            selectedNodeIndex === idx
                                ? "border-blue-500 text-blue-400"
                                : "border-transparent text-slate-400 hover:text-slate-200"
                        )}
                        data-testid={`node-tab`}
                    >
                        Node {idx + 1}
                    </button>
                ))}
            </div>

            {/* Motherboard Selection */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                <h3 className="font-semibold mb-3">Motherboard</h3>
                {currentNode.motherboard ? (
                    <div className="flex justify-between items-start bg-slate-900 rounded p-3">
                        <div>
                            <div className="font-medium">{currentNode.motherboard.name}</div>
                            <div className="text-sm text-slate-400">
                                {currentNode.motherboard.vendor} • {currentNode.motherboard.constraints.socket}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                                {currentNode.motherboard.constraints.memory.socketsCount} socket{currentNode.motherboard.constraints.memory.socketsCount > 1 ? 's' : ''} •
                                DDR{currentNode.motherboard.constraints.memory.ddrGen} •
                                {currentNode.motherboard.constraints.memory.channelsPerSocket * currentNode.motherboard.constraints.memory.dimmsPerChannel * currentNode.motherboard.constraints.memory.socketsCount} DIMM slots
                            </div>
                        </div>
                        <button
                            onClick={() => setShowMoboSelector(true)}
                            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm"
                        >
                            Change
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setShowMoboSelector(true)}
                        className="w-full p-3 bg-slate-900 hover:bg-slate-800 rounded border border-dashed border-slate-600 text-slate-400"
                    >
                        + Select Motherboard
                    </button>
                )}

                {/* Motherboard Selector Modal */}
                {showMoboSelector && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold">Select Motherboard</h3>
                                <button
                                    onClick={() => setShowMoboSelector(false)}
                                    className="text-slate-400 hover:text-white"
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="space-y-2">
                                {motherboards.map((mobo) => (
                                    <button
                                        key={mobo.id}
                                        onClick={() => {
                                            setNodeMotherboard(selectedNodeIndex, mobo);
                                            setShowMoboSelector(false);
                                        }}
                                        className="w-full text-left p-4 bg-slate-900 hover:bg-slate-800 rounded border border-slate-700 hover:border-blue-600 transition-all"
                                    >
                                        <div className="font-semibold">{mobo.name}</div>
                                        <div className="text-sm text-slate-400 mt-1">
                                            {mobo.vendor} • {mobo.sku}
                                        </div>
                                        <div className="flex gap-4 text-xs text-slate-500 mt-2">
                                            <span>{mobo.constraints.socket}</span>
                                            <span>{mobo.constraints.memory.socketsCount} socket{mobo.constraints.memory.socketsCount > 1 ? 's' : ''}</span>
                                            <span>DDR{mobo.constraints.memory.ddrGen}</span>
                                            <span>{mobo.constraints.memory.channelsPerSocket * mobo.constraints.memory.dimmsPerChannel * mobo.constraints.memory.socketsCount} slots</span>
                                        </div>
                                        {mobo.msrp && (
                                            <div className="text-blue-400 font-semibold mt-2">
                                                ${mobo.msrp.toLocaleString()}
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Current Node Components */}
            <div className="space-y-4">
                {/* CPUs */}
                {currentNode.cpus.length > 0 && (
                    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                        <h3 className="font-semibold mb-3">CPUs ({currentNode.cpus.length})</h3>
                        <div className="space-y-2">
                            {currentNode.cpus.map((cpu, idx) => (
                                <div key={idx} className="flex justify-between bg-slate-900 rounded p-3 text-sm">
                                    <span>{cpu.name} ({cpu.cores}C, {cpu.constraints.tdpW}W)</span>
                                    {cpu.msrp && <span className="text-blue-400">${cpu.msrp.toLocaleString()}</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Memory */}
                {currentNode.memory.length > 0 && (
                    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                        <h3 className="font-semibold mb-3">Memory ({currentNode.memory.length} DIMMs)</h3>
                        <div className="text-sm text-slate-400">
                            Total: {currentNode.memory.reduce((sum, m) => sum + m.constraints.capacityGB, 0)}GB
                        </div>
                    </div>
                )}

                {/* Storage */}
                {currentNode.storage.length > 0 && (
                    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                        <h3 className="font-semibold mb-3">Storage ({currentNode.storage.length} drives)</h3>
                        <div className="text-sm text-slate-400">
                            Total: {currentNode.storage.reduce((sum, s) => sum + s.constraints.capacityTB, 0)}TB
                        </div>
                    </div>
                )}
            </div>

            {/* Part Browser */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                <h3 className="font-semibold mb-4">Add Components</h3>
                <PartBrowser nodeIndex={selectedNodeIndex} />
            </div>
        </div>
    );
}
