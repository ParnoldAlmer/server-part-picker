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

    const {
        build,
        addNodeCPU,
        addNodeMemory,
        addNodeStorage,
        removeNodeCPU,
        removeNodeMemory,
        removeNodeStorage,
    } = useBuildStore();
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
                    const selectedCount = node.cpus.filter(c => c.id === cpu.id).length;
                    const cpuLimit =
                        node.motherboard?.constraints.memory.socketsCount ??
                        build.chassis?.constraints.nodes[nodeIndex]?.cpuCount ??
                        2;
                    const slotsFull = node.cpus.length >= cpuLimit;

                    return (
                        <div
                            key={cpu.id}
                            className={cn(
                                "p-4 rounded-lg border transition-all",
                                !isCompatible ? "border-slate-800 bg-slate-900 opacity-50" :
                                    selectedCount > 0 ? "border-green-700 bg-green-950/30" :
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
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                const idx = node.cpus.findIndex(c => c.id === cpu.id);
                                                if (idx !== -1) removeNodeCPU(nodeIndex, idx);
                                            }}
                                            disabled={selectedCount === 0}
                                            className={cn(
                                                "px-2 py-1 rounded text-sm",
                                                selectedCount === 0
                                                    ? "bg-slate-700 cursor-not-allowed"
                                                    : "bg-red-600 hover:bg-red-700"
                                            )}
                                        >
                                            -
                                        </button>
                                        <span className="w-6 text-center text-sm font-medium">{selectedCount}</span>
                                        <button
                                            onClick={() => handleAddCPU(cpu)}
                                            disabled={!isCompatible || slotsFull}
                                            className={cn(
                                                "px-2 py-1 rounded text-sm",
                                                isCompatible && !slotsFull
                                                    ? "bg-blue-600 hover:bg-blue-700"
                                                    : "bg-slate-700 cursor-not-allowed"
                                            )}
                                        >
                                            +
                                        </button>
                                    </div>
                                    {slotsFull && selectedCount === 0 && (
                                        <span className="text-xs text-amber-500">CPU slots full</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Memory */}
                {!loading && selectedType === 'memory' && memory.map((mem) => {
                    const motherboardCompatible = !node.motherboard || (
                        node.motherboard.constraints.memory.ddrGen === mem.constraints.ddrGen &&
                        node.motherboard.constraints.memory.dimmTypes.includes(mem.constraints.type)
                    );

                    // Check if *any* of the selected CPUs support this memory generation
                    // If no CPUs are selected, we don't block based on CPU
                    const cpuCompatible = node.cpus.length === 0 || node.cpus.some(cpu =>
                        cpu.constraints.memGenSupported.includes(mem.constraints.ddrGen)
                    );

                    const isCompatible = motherboardCompatible && cpuCompatible;
                    const selectedCount = node.memory.filter((dimm) => dimm.id === mem.id).length;

                    // Check for max DIMM constraint
                    const currentDimmCount = node.memory.length;
                    const chassisMaxDimms = build.chassis?.constraints.maxDimmsPerNode;
                    const motherboardDimmSlots = node.motherboard
                        ? node.motherboard.constraints.memory.channelsPerSocket *
                        node.motherboard.constraints.memory.dimmsPerChannel *
                        node.motherboard.constraints.memory.socketsCount
                        : undefined;
                    const computedMaxDimms = [chassisMaxDimms, motherboardDimmSlots].filter((value): value is number => value !== undefined);
                    const maxDimms = computedMaxDimms.length > 0 ? Math.min(...computedMaxDimms) : undefined;
                    const slotsFull = maxDimms !== undefined && currentDimmCount >= maxDimms;

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
                                    {!isCompatible && (
                                        <div className="mt-2 text-xs text-red-400 space-y-1">
                                            {!motherboardCompatible && node.motherboard && (
                                                <p>⚠️ Incompatible with motherboard (needs DDR{node.motherboard.constraints.memory.ddrGen} {node.motherboard.constraints.memory.dimmTypes.join('/')})</p>
                                            )}
                                            {!cpuCompatible && node.cpus.length > 0 && (
                                                <p>⚠️ Incompatible with CPU (needs DDR{node.cpus[0].constraints.memGenSupported.join('/')})</p>
                                            )}
                                        </div>
                                    )}
                                    {isCompatible && slotsFull && (
                                        <p className="mt-2 text-xs text-amber-500">
                                            ⚠️ DIMM slots full ({currentDimmCount}/{maxDimms})
                                        </p>
                                    )}
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    {mem.msrp && (
                                        <span className="text-blue-400 font-semibold">
                                            ${mem.msrp.toLocaleString()}
                                        </span>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                const idx = node.memory.findIndex((dimm) => dimm.id === mem.id);
                                                if (idx !== -1) removeNodeMemory(nodeIndex, idx);
                                            }}
                                            disabled={selectedCount === 0}
                                            className={cn(
                                                "px-2 py-1 rounded text-sm",
                                                selectedCount === 0
                                                    ? "bg-slate-700 cursor-not-allowed"
                                                    : "bg-red-600 hover:bg-red-700"
                                            )}
                                        >
                                            -
                                        </button>
                                        <span className="w-6 text-center text-sm font-medium">{selectedCount}</span>
                                        <button
                                            onClick={() => handleAddMemory(mem)}
                                            disabled={!isCompatible || slotsFull}
                                            className={cn(
                                                "px-2 py-1 rounded text-sm",
                                                !isCompatible || slotsFull
                                                    ? "bg-slate-700 cursor-not-allowed"
                                                    : "bg-blue-600 hover:bg-blue-700"
                                            )}
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Storage */}
                {!loading && selectedType === 'storage' && storage.map((stg) => {
                    const selectedCount = node.storage.filter((drive) => drive.id === stg.id).length;
                    return (
                        <div
                            key={stg.id}
                            className={cn(
                                "p-4 rounded-lg border transition-all",
                                selectedCount > 0
                                    ? "border-green-700 bg-green-950/30"
                                    : "border-slate-700 bg-slate-800 hover:border-blue-600"
                            )}
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
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                const idx = node.storage.findIndex((drive) => drive.id === stg.id);
                                                if (idx !== -1) removeNodeStorage(nodeIndex, idx);
                                            }}
                                            disabled={selectedCount === 0}
                                            className={cn(
                                                "px-2 py-1 rounded text-sm",
                                                selectedCount === 0
                                                    ? "bg-slate-700 cursor-not-allowed"
                                                    : "bg-red-600 hover:bg-red-700"
                                            )}
                                        >
                                            -
                                        </button>
                                        <span className="w-6 text-center text-sm font-medium">{selectedCount}</span>
                                        <button
                                            onClick={() => handleAddStorage(stg)}
                                            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
