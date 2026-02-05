import { useState, useMemo } from 'react';
import type { CPU, Memory, Storage, Platform } from '../types/hardware';
import { useBuildStore } from '../store/buildStore';
import { cn } from '../lib/utils';
import cpuData from '../../../backend/src/data/cpus.json';
import memoryData from '../../../backend/src/data/memory.json';
import storageData from '../../../backend/src/data/storage.json';

type ComponentType = 'cpus' | 'memory' | 'storage';

interface PartBrowserProps {
    nodeIndex: number;
}

export function PartBrowser({ nodeIndex }: PartBrowserProps) {
    const [selectedType, setSelectedType] = useState<ComponentType>('cpus');
    const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');

    const { build, addNodeCPU, addNodeMemory, addNodeStorage, removeNodeCPU } = useBuildStore();
    const node = build.nodes[nodeIndex];

    // Filter CPUs by platform
    const cpus = useMemo(() => {
        const allCpus = cpuData as CPU[];
        if (platformFilter === 'all') return allCpus;
        return allCpus.filter(cpu => cpu.platform === platformFilter);
    }, [platformFilter]);

    const memory = memoryData as Memory[];
    const storage = storageData as Storage[];
    const loading = false;

    const handleAddCPU = (cpu: CPU) => {
        addNodeCPU(nodeIndex, cpu);
    };

    const handleAddMemory = (mem: Memory) => {
        addNodeMemory(nodeIndex, mem);
    };

    const handleAddStorage = (stg: Storage) => {
        addNodeStorage(nodeIndex, stg);
    };

    return (
        <div className="space-y-4">
            {/* Component Type Tabs */}
            <div className="flex gap-2 border-b border-slate-700">
                <button
                    onClick={() => setSelectedType('cpus')}
                    className={cn(
                        "px-4 py-2 font-medium transition-colors border-b-2",
                        selectedType === 'cpus'
                            ? "border-blue-500 text-blue-400"
                            : "border-transparent text-slate-400 hover:text-slate-200"
                    )}
                >
                    CPUs
                </button>
                <button
                    onClick={() => setSelectedType('memory')}
                    className={cn(
                        "px-4 py-2 font-medium transition-colors border-b-2",
                        selectedType === 'memory'
                            ? "border-blue-500 text-blue-400"
                            : "border-transparent text-slate-400 hover:text-slate-200"
                    )}
                >
                    Memory
                </button>
                <button
                    onClick={() => setSelectedType('storage')}
                    className={cn(
                        "px-4 py-2 font-medium transition-colors border-b-2",
                        selectedType === 'storage'
                            ? "border-blue-500 text-blue-400"
                            : "border-transparent text-slate-400 hover:text-slate-200"
                    )}
                >
                    Storage
                </button>
            </div>

            {/* Platform Filter (CPUs only) */}
            {selectedType === 'cpus' && (
                <div className="flex gap-2">
                    <span className="text-sm text-slate-400 py-2">Platform:</span>
                    {(['all', 'Intel', 'AMD', 'Ampere'] as const).map((platform) => (
                        <button
                            key={platform}
                            onClick={() => setPlatformFilter(platform)}
                            className={cn(
                                "px-3 py-1 rounded text-sm transition-colors",
                                platformFilter === platform
                                    ? "bg-blue-600 text-white"
                                    : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                            )}
                            data-testid={`platform-${platform}`}
                        >
                            {platform === 'all' ? 'All' : platform}
                        </button>
                    ))}
                </div>
            )}

            {/* Parts List */}
            <div className="space-y-2">
                {loading && (
                    <div className="text-center py-8 text-slate-400">Loading...</div>
                )}

                {/* CPUs */}
                {!loading && selectedType === 'cpus' && cpus.map((cpu) => {
                    const isCompatible = !node.motherboard ||
                        node.motherboard.constraints.socket === cpu.constraints.socket;
                    const alreadyAdded = node.cpus.some(c => c.id === cpu.id);

                    return (
                        <div
                            key={cpu.id}
                            className={cn(
                                "p-4 rounded-lg border transition-all",
                                !isCompatible ? "border-slate-800 bg-slate-900 opacity-50" :
                                    alreadyAdded ? "border-green-700 bg-green-950/30" :
                                        "border-slate-700 bg-slate-800 hover:border-blue-600"
                            )}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <h4 className="font-semibold">{cpu.name}</h4>
                                    <p className="text-sm text-slate-400">{cpu.vendor} • {cpu.sku}</p>
                                    <div className="mt-2 flex gap-4 text-sm">
                                        <span className="text-slate-400">{cpu.cores}C/{cpu.threads}T</span>
                                        <span className="text-slate-400">{cpu.constraints.tdpW}W TDP</span>
                                        <span className="text-slate-400">{cpu.constraints.socket}</span>
                                    </div>
                                    {!isCompatible && (
                                        <p className="mt-2 text-xs text-red-400">
                                            ⚠️ Incompatible socket (motherboard: {node.motherboard?.constraints.socket})
                                        </p>
                                    )}
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    {cpu.msrp && (
                                        <span className="text-blue-400 font-semibold">
                                            ${cpu.msrp.toLocaleString()}
                                        </span>
                                    )}
                                    {alreadyAdded ? (
                                        <button
                                            onClick={() => {
                                                const idx = node.cpus.findIndex(c => c.id === cpu.id);
                                                if (idx !== -1) removeNodeCPU(nodeIndex, idx);
                                            }}
                                            className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
                                        >
                                            Remove
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleAddCPU(cpu)}
                                            disabled={!isCompatible}
                                            className={cn(
                                                "px-3 py-1 rounded text-sm",
                                                isCompatible
                                                    ? "bg-blue-600 hover:bg-blue-700"
                                                    : "bg-slate-700 cursor-not-allowed"
                                            )}
                                        >
                                            Add
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Memory */}
                {!loading && selectedType === 'memory' && memory.map((mem) => {
                    const isCompatible = !node.motherboard || (
                        node.motherboard.constraints.memory.ddrGen === mem.constraints.ddrGen &&
                        node.motherboard.constraints.memory.dimmTypes.includes(mem.constraints.type)
                    );

                    return (
                        <div
                            key={mem.id}
                            className={cn(
                                "p-4 rounded-lg border transition-all",
                                !isCompatible ? "border-slate-800 bg-slate-900 opacity-50" :
                                    "border-slate-700 bg-slate-800 hover:border-blue-600"
                            )}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <h4 className="font-semibold">{mem.name}</h4>
                                    <p className="text-sm text-slate-400">{mem.vendor} • {mem.sku}</p>
                                    <div className="mt-2 flex gap-4 text-sm">
                                        <span className="text-slate-400">{mem.constraints.capacityGB}GB</span>
                                        <span className="text-slate-400">DDR{mem.constraints.ddrGen}</span>
                                        <span className="text-slate-400">{mem.constraints.type}</span>
                                        <span className="text-slate-400">{mem.constraints.speedMT} MT/s</span>
                                    </div>
                                    {!isCompatible && node.motherboard && (
                                        <p className="mt-2 text-xs text-red-400">
                                            ⚠️ Incompatible (needs DDR{node.motherboard.constraints.memory.ddrGen} {node.motherboard.constraints.memory.dimmTypes.join('/')})
                                        </p>
                                    )}
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    {mem.msrp && (
                                        <span className="text-blue-400 font-semibold">
                                            ${mem.msrp.toLocaleString()}
                                        </span>
                                    )}
                                    <button
                                        onClick={() => handleAddMemory(mem)}
                                        disabled={!isCompatible}
                                        className={cn(
                                            "px-3 py-1 rounded text-sm",
                                            isCompatible
                                                ? "bg-blue-600 hover:bg-blue-700"
                                                : "bg-slate-700 cursor-not-allowed"
                                        )}
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Storage */}
                {!loading && selectedType === 'storage' && storage.map((stg) => (
                    <div
                        key={stg.id}
                        className="p-4 rounded-lg border border-slate-700 bg-slate-800 hover:border-blue-600 transition-all"
                    >
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <h4 className="font-semibold">{stg.name}</h4>
                                <p className="text-sm text-slate-400">{stg.vendor} • {stg.sku}</p>
                                <div className="mt-2 flex gap-4 text-sm">
                                    <span className="text-slate-400">{stg.constraints.capacityTB}TB</span>
                                    <span className="text-slate-400">{stg.type}</span>
                                    <span className="text-slate-400">{stg.constraints.formFactor}</span>
                                    <span className="text-slate-400">{stg.constraints.interface}</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                {stg.msrp && (
                                    <span className="text-blue-400 font-semibold">
                                        ${stg.msrp.toLocaleString()}
                                    </span>
                                )}
                                <button
                                    onClick={() => handleAddStorage(stg)}
                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
