import { useState } from 'react';
import { cn } from '../lib/utils';
import { useBuildStore } from '../store/buildStore';
import { PartBrowser, type ComponentType } from './PartBrowser';
import type { Motherboard } from '../types/hardware';
import motherboardData from '../../../backend/src/data/motherboards.json';

export function NodeTabs() {
    const {
        build,
        priceOverrides,
        setNodeMotherboard,
        removeNodeCPU,
        removeNodeMemory,
        removeNodeStorage,
    } = useBuildStore();
    const [selectedNodeIndex, setSelectedNodeIndex] = useState(0);
    const [motherboards] = useState<Motherboard[]>(motherboardData as Motherboard[]);
    const [showMoboSelector, setShowMoboSelector] = useState(false);
    const [partBrowserType, setPartBrowserType] = useState<ComponentType>('cpus');

    if (!build.chassis) return null;

    const getOverrideKey = (type: string, id: string): string => `${type}:${id}`;
    const getDisplayPrice = (type: string, id: string, fallback?: number): number | undefined => {
        const overrideValue = priceOverrides[getOverrideKey(type, id)];
        if (overrideValue !== undefined) return overrideValue;
        return fallback;
    };
    const focusPartPicker = (type: ComponentType) => {
        setPartBrowserType(type);
        const pickerId = `part-browser-${selectedNodeIndex}`;
        requestAnimationFrame(() => {
            const pickerEl = document.getElementById(pickerId);
            if (pickerEl) {
                pickerEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    };

    const currentNode = build.nodes[selectedNodeIndex];
    const groupedCpus = Object.values(
        currentNode.cpus.reduce<Record<string, { id: string; name: string; cores: number; tdpW: number; msrp?: number; qty: number }>>((acc, cpu) => {
            if (!acc[cpu.id]) {
                acc[cpu.id] = {
                    id: cpu.id,
                    name: cpu.name,
                    cores: cpu.cores,
                    tdpW: cpu.constraints.tdpW,
                    msrp: cpu.msrp,
                    qty: 0,
                };
            }
            acc[cpu.id].qty += 1;
            return acc;
        }, {})
    );
    const groupedMemory = Object.values(
        currentNode.memory.reduce<Record<string, { id: string; name: string; capacityGB: number; ddrGen: number; speedMT: number; msrp?: number; qty: number }>>((acc, dimm) => {
            if (!acc[dimm.id]) {
                acc[dimm.id] = {
                    id: dimm.id,
                    name: dimm.name,
                    capacityGB: dimm.constraints.capacityGB,
                    ddrGen: dimm.constraints.ddrGen,
                    speedMT: dimm.constraints.speedMT,
                    msrp: dimm.msrp,
                    qty: 0,
                };
            }
            acc[dimm.id].qty += 1;
            return acc;
        }, {})
    );
    const groupedStorage = Object.values(
        currentNode.storage.reduce<Record<string, { id: string; name: string; capacityTB: number; formFactor: string; iface: string; msrp?: number; qty: number }>>((acc, drive) => {
            if (!acc[drive.id]) {
                acc[drive.id] = {
                    id: drive.id,
                    name: drive.name,
                    capacityTB: drive.constraints.capacityTB,
                    formFactor: drive.constraints.formFactor,
                    iface: drive.constraints.interface,
                    msrp: drive.msrp,
                    qty: 0,
                };
            }
            acc[drive.id].qty += 1;
            return acc;
        }, {})
    );
    const motherboardPrice = currentNode.motherboard
        ? getDisplayPrice('motherboard', currentNode.motherboard.id, currentNode.motherboard.msrp)
        : undefined;
    const cpuTotalPrice = groupedCpus.reduce(
        (sum, cpu) => sum + ((getDisplayPrice('cpu', cpu.id, cpu.msrp) ?? 0) * cpu.qty),
        0
    );
    const memoryTotalPrice = groupedMemory.reduce(
        (sum, dimm) => sum + ((getDisplayPrice('memory', dimm.id, dimm.msrp) ?? 0) * dimm.qty),
        0
    );
    const storageTotalPrice = groupedStorage.reduce(
        (sum, drive) => sum + ((getDisplayPrice('storage', drive.id, drive.msrp) ?? 0) * drive.qty),
        0
    );
    const cpuSummary = groupedCpus.length > 0
        ? `${groupedCpus[0].qty}x ${groupedCpus[0].name}${groupedCpus.length > 1 ? ` +${groupedCpus.length - 1} more` : ''}`
        : 'No CPU selected';
    const memorySummary = groupedMemory.length > 0
        ? `${currentNode.memory.length} DIMMs (${currentNode.memory.reduce((sum, m) => sum + m.constraints.capacityGB, 0)}GB total)`
        : 'No memory selected';
    const storageSummary = groupedStorage.length > 0
        ? `${currentNode.storage.length} drive${currentNode.storage.length > 1 ? 's' : ''}`
        : 'No storage selected';
    const chooseButtonClass = 'h-8 px-3 rounded-md text-[12px] font-semibold text-white bg-blue-600 hover:bg-blue-700 whitespace-nowrap';
    const partRows: Array<{
        key: string;
        component: string;
        selection: string;
        qty: number;
        price?: number;
        actionLabel: string;
        onChoose: () => void;
    }> = [
        {
            key: 'motherboard',
            component: 'Motherboard',
            selection: currentNode.motherboard ? `${currentNode.motherboard.vendor} ${currentNode.motherboard.name}` : 'No motherboard selected',
            qty: currentNode.motherboard ? 1 : 0,
            price: motherboardPrice,
            actionLabel: currentNode.motherboard ? 'Change Motherboard' : 'Choose Motherboard',
            onChoose: () => setShowMoboSelector(true),
        },
        {
            key: 'cpu',
            component: 'CPU',
            selection: cpuSummary,
            qty: currentNode.cpus.length,
            price: cpuTotalPrice > 0 ? cpuTotalPrice : undefined,
            actionLabel: 'Choose CPU',
            onChoose: () => focusPartPicker('cpus'),
        },
        {
            key: 'memory',
            component: 'Memory',
            selection: memorySummary,
            qty: currentNode.memory.length,
            price: memoryTotalPrice > 0 ? memoryTotalPrice : undefined,
            actionLabel: 'Choose Memory',
            onChoose: () => focusPartPicker('memory'),
        },
        {
            key: 'storage',
            component: 'Storage',
            selection: storageSummary,
            qty: currentNode.storage.length,
            price: storageTotalPrice > 0 ? storageTotalPrice : undefined,
            actionLabel: 'Choose Storage',
            onChoose: () => focusPartPicker('storage'),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Node Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-slate-700">
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

            <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-700">
                    <h3 className="font-semibold text-slate-100">Choose Your Server Parts</h3>
                </div>

                <div className="md:hidden p-3 space-y-2 bg-slate-800">
                    {partRows.map((row) => (
                        <div key={row.key} className="rounded-md border border-slate-700 bg-slate-900 p-3">
                            <div className="flex items-center justify-between gap-2">
                                <div className="text-sm font-semibold text-blue-300">{row.component}</div>
                                <div className="text-xs text-slate-400">Qty: {row.qty}</div>
                            </div>
                            <div className="mt-1 text-xs text-slate-300">{row.selection}</div>
                            <div className="mt-2 flex items-center justify-between">
                                <div className="text-sm font-semibold text-slate-200">
                                    {row.price !== undefined ? `$${row.price.toLocaleString()}` : '—'}
                                </div>
                                <button onClick={row.onChoose} className={chooseButtonClass}>
                                    {row.actionLabel}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full min-w-[760px] text-sm">
                        <colgroup>
                            <col className="w-[18%]" />
                            <col className="w-[42%]" />
                            <col className="w-[10%]" />
                            <col className="w-[15%]" />
                            <col className="w-[15%]" />
                        </colgroup>
                        <thead className="bg-slate-900 text-slate-400 text-xs uppercase tracking-wide">
                            <tr>
                                <th className="text-left font-medium px-4 py-2.5">Component</th>
                                <th className="text-left font-medium px-4 py-2.5">Selection</th>
                                <th className="text-center font-medium px-4 py-2.5">Qty</th>
                                <th className="text-right font-medium px-4 py-2.5">Price</th>
                                <th className="text-right font-medium px-4 py-2.5">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {partRows.map((row) => (
                                <tr key={row.key} className="border-t border-slate-700 hover:bg-slate-900/60">
                                    <td className="px-4 py-3 font-semibold text-blue-300">{row.component}</td>
                                    <td className="px-4 py-3 text-slate-300 truncate">{row.selection}</td>
                                    <td className="px-4 py-3 text-center text-slate-300">{row.qty}</td>
                                    <td className="px-4 py-3 text-right text-slate-200 font-medium">
                                        {row.price !== undefined ? `$${row.price.toLocaleString()}` : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={row.onChoose} className={chooseButtonClass}>
                                            {row.actionLabel}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Motherboard Selection */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                <h3 className="font-semibold mb-3">Motherboard</h3>
                {currentNode.motherboard ? (
                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start bg-slate-900 rounded p-3">
                        <div className="min-w-0">
                            <div className="font-medium">{currentNode.motherboard.name}</div>
                            <div className="text-sm text-slate-400 break-words">
                                {currentNode.motherboard.vendor} • {currentNode.motherboard.constraints.socket}
                            </div>
                            <div className="text-xs text-slate-500 mt-1 break-words">
                                {currentNode.motherboard.constraints.memory.socketsCount} socket{currentNode.motherboard.constraints.memory.socketsCount > 1 ? 's' : ''} •
                                DDR{currentNode.motherboard.constraints.memory.ddrGen} •
                                {currentNode.motherboard.constraints.memory.channelsPerSocket * currentNode.motherboard.constraints.memory.dimmsPerChannel * currentNode.motherboard.constraints.memory.socketsCount} DIMM slots
                            </div>
                            {getDisplayPrice('motherboard', currentNode.motherboard.id, currentNode.motherboard.msrp) !== undefined && (
                                <div className="text-sm text-blue-400 font-semibold mt-2">
                                    ${getDisplayPrice('motherboard', currentNode.motherboard.id, currentNode.motherboard.msrp)?.toLocaleString()}
                                </div>
                            )}
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
                                        {getDisplayPrice('motherboard', mobo.id, mobo.msrp) !== undefined && (
                                            <div className="text-blue-400 font-semibold mt-2">
                                                ${getDisplayPrice('motherboard', mobo.id, mobo.msrp)?.toLocaleString()}
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
                            {groupedCpus.map((cpu) => (
                                <div key={cpu.id} className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center bg-slate-900 rounded p-3 text-sm">
                                    <span className="min-w-0 break-words">{cpu.qty}x {cpu.name} ({cpu.cores}C, {cpu.tdpW}W)</span>
                                    <div className="flex items-center gap-3 self-start sm:self-auto sm:shrink-0">
                                        {getDisplayPrice('cpu', cpu.id, cpu.msrp) !== undefined && (
                                            <span className="text-blue-400">${getDisplayPrice('cpu', cpu.id, cpu.msrp)?.toLocaleString()}</span>
                                        )}
                                        <button
                                            onClick={() => {
                                                const idx = currentNode.cpus.findIndex((selected) => selected.id === cpu.id);
                                                if (idx !== -1) removeNodeCPU(selectedNodeIndex, idx);
                                            }}
                                            className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded"
                                        >
                                            Remove 1
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Memory */}
                {currentNode.memory.length > 0 && (
                    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                        <h3 className="font-semibold mb-3">Memory ({currentNode.memory.length} DIMMs)</h3>
                        <div className="text-sm text-slate-400 mb-3">
                            Total: {currentNode.memory.reduce((sum, m) => sum + m.constraints.capacityGB, 0)}GB
                        </div>
                        <div className="space-y-2">
                            {groupedMemory.map((dimm) => (
                                <div key={dimm.id} className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center bg-slate-900 rounded p-3 text-sm">
                                    <span className="min-w-0 break-words">{dimm.qty}x {dimm.name} ({dimm.capacityGB}GB DDR{dimm.ddrGen} {dimm.speedMT}MT/s)</span>
                                    <div className="flex items-center gap-3 self-start sm:self-auto sm:shrink-0">
                                        {getDisplayPrice('memory', dimm.id, dimm.msrp) !== undefined && (
                                            <span className="text-blue-400">${getDisplayPrice('memory', dimm.id, dimm.msrp)?.toLocaleString()}</span>
                                        )}
                                        <button
                                            onClick={() => {
                                                const idx = currentNode.memory.findIndex((selected) => selected.id === dimm.id);
                                                if (idx !== -1) removeNodeMemory(selectedNodeIndex, idx);
                                            }}
                                            className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded"
                                        >
                                            Remove 1
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Storage */}
                {currentNode.storage.length > 0 && (
                    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                        <h3 className="font-semibold mb-3">Storage ({currentNode.storage.length} drives)</h3>
                        <div className="text-sm text-slate-400 mb-3">
                            Total: {currentNode.storage.reduce((sum, s) => sum + s.constraints.capacityTB, 0)}TB
                        </div>
                        <div className="space-y-2">
                            {groupedStorage.map((drive) => (
                                <div key={drive.id} className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center bg-slate-900 rounded p-3 text-sm">
                                    <span className="min-w-0 break-words">{drive.qty}x {drive.name} ({drive.capacityTB}TB {drive.formFactor} {drive.iface})</span>
                                    <div className="flex items-center gap-3 self-start sm:self-auto sm:shrink-0">
                                        {getDisplayPrice('storage', drive.id, drive.msrp) !== undefined && (
                                            <span className="text-blue-400">${getDisplayPrice('storage', drive.id, drive.msrp)?.toLocaleString()}</span>
                                        )}
                                        <button
                                            onClick={() => {
                                                const idx = currentNode.storage.findIndex((selected) => selected.id === drive.id);
                                                if (idx !== -1) removeNodeStorage(selectedNodeIndex, idx);
                                            }}
                                            className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded"
                                        >
                                            Remove 1
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Part Browser */}
            <div id={`part-browser-${selectedNodeIndex}`} className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                <h3 className="font-semibold mb-4">Add Components</h3>
                <PartBrowser
                    nodeIndex={selectedNodeIndex}
                    selectedType={partBrowserType}
                    onSelectedTypeChange={setPartBrowserType}
                />
            </div>
        </div>
    );
}
