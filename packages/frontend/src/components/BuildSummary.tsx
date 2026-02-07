import { useBuildStore } from '../store/buildStore';
import {
    runValidation,
    categorizeIssues,
    socketRule,
    memoryTypeRule,
    memoryBalanceRule,
    bayLimitRule,
    powerRule,
    nodeTopologyRule,
    memorySlotRule,
    compatibilityGraphRule,
} from '../lib/validation';
import { calculatePower } from '../lib/validation/rules/powerRule';
import type { PlannerCostCategory } from '../store/buildStore';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

const allRules = [
    socketRule,
    memoryTypeRule,
    memoryBalanceRule,
    memorySlotRule,
    bayLimitRule,
    powerRule,
    nodeTopologyRule,
    compatibilityGraphRule,
];

const PART_CATEGORY_OPTIONS: PlannerCostCategory[] = ['Network', 'Accessories', 'Service', 'Other'];

interface PlannerRow {
    key: string;
    category: string;
    location: string;
    item: string;
    quantity: number;
    defaultUnitPrice: number;
    overrideKey?: string;
}

const getOverrideKey = (type: string, id: string): string => `${type}:${id}`;

interface DraftNumberInputProps {
    value: number;
    min?: number;
    step?: number | string;
    className: string;
    onCommit: (value: number) => void;
}

function DraftNumberInput({ value, min, step, className, onCommit }: DraftNumberInputProps) {
    const [draft, setDraft] = useState(String(value));
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        if (!isFocused) {
            setDraft(String(value));
        }
    }, [isFocused, value]);

    const normalize = (raw: string): number => {
        const parsed = Number(raw);
        const fallback = min ?? 0;
        if (raw === '' || Number.isNaN(parsed)) {
            return fallback;
        }
        return min !== undefined ? Math.max(min, parsed) : parsed;
    };

    const commit = (raw: string) => {
        const next = normalize(raw);
        onCommit(next);
        setDraft(String(next));
    };

    return (
        <input
            type="number"
            min={min}
            step={step}
            value={draft}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
                setIsFocused(false);
                commit(draft);
            }}
            onKeyDown={(event) => {
                if (event.key === 'Enter') {
                    commit(draft);
                }
            }}
            onChange={(event) => {
                const next = event.target.value;
                setDraft(next);
                if (next === '' || next === '-' || next === '.' || next === '-.') {
                    return;
                }
                const parsed = Number(next);
                if (Number.isNaN(parsed)) {
                    return;
                }
                onCommit(min !== undefined ? Math.max(min, parsed) : parsed);
            }}
            className={className}
        />
    );
}

export function BuildSummary() {
    const {
        build,
        priceOverrides,
        setPriceOverride,
        nodeTargets,
        setNodeTarget,
        customCosts,
        addCustomCostItem,
        updateCustomCostItem,
        removeCustomCostItem,
    } = useBuildStore();

    if (!build.chassis) {
        return null;
    }

    const issues = runValidation(build, allRules);
    const { errors, warnings } = categorizeIssues(issues);
    const totalPower = calculatePower(build);
    const plannerRows: PlannerRow[] = [];

    plannerRows.push({
        key: `chassis-${build.chassis.id}`,
        category: 'Chassis',
        location: 'Global',
        item: `${build.chassis.vendor} ${build.chassis.name}`,
        quantity: 1,
        defaultUnitPrice: build.chassis.msrp || 0,
        overrideKey: getOverrideKey('chassis', build.chassis.id),
    });

    build.nodes.forEach((node, nodeIdx) => {
        if (node.motherboard) {
            plannerRows.push({
                key: `mobo-${nodeIdx}-${node.motherboard.id}`,
                category: 'Motherboard',
                location: `Node ${nodeIdx + 1}`,
                item: `${node.motherboard.vendor} ${node.motherboard.name}`,
                quantity: 1,
                defaultUnitPrice: node.motherboard.msrp || 0,
                overrideKey: getOverrideKey('motherboard', node.motherboard.id),
            });
        }

        const cpuGroups = Object.values(
            node.cpus.reduce<Record<string, { id: string; item: string; qty: number; msrp: number }>>((acc, cpu) => {
                if (!acc[cpu.id]) {
                    acc[cpu.id] = {
                        id: cpu.id,
                        item: `${cpu.vendor} ${cpu.name}`,
                        qty: 0,
                        msrp: cpu.msrp || 0,
                    };
                }
                acc[cpu.id].qty += 1;
                return acc;
            }, {})
        );

        const memoryGroups = Object.values(
            node.memory.reduce<Record<string, { id: string; item: string; qty: number; msrp: number }>>((acc, dimm) => {
                if (!acc[dimm.id]) {
                    acc[dimm.id] = {
                        id: dimm.id,
                        item: `${dimm.vendor} ${dimm.name}`,
                        qty: 0,
                        msrp: dimm.msrp || 0,
                    };
                }
                acc[dimm.id].qty += 1;
                return acc;
            }, {})
        );

        const storageGroups = Object.values(
            node.storage.reduce<Record<string, { id: string; item: string; qty: number; msrp: number }>>((acc, drive) => {
                if (!acc[drive.id]) {
                    acc[drive.id] = {
                        id: drive.id,
                        item: `${drive.vendor} ${drive.name}`,
                        qty: 0,
                        msrp: drive.msrp || 0,
                    };
                }
                acc[drive.id].qty += 1;
                return acc;
            }, {})
        );
        const controllerGroups = Object.values(
            (node.controllers ?? []).reduce<Record<string, { id: string; item: string; qty: number; msrp: number }>>((acc, controller) => {
                if (!acc[controller.id]) {
                    acc[controller.id] = {
                        id: controller.id,
                        item: `${controller.vendor} ${controller.name}`,
                        qty: 0,
                        msrp: controller.msrp || 0,
                    };
                }
                acc[controller.id].qty += 1;
                return acc;
            }, {})
        );
        const networkGroups = Object.values(
            (node.networkAdapters ?? []).reduce<Record<string, { id: string; item: string; qty: number; msrp: number }>>((acc, nic) => {
                if (!acc[nic.id]) {
                    acc[nic.id] = {
                        id: nic.id,
                        item: `${nic.vendor} ${nic.name}`,
                        qty: 0,
                        msrp: nic.msrp || 0,
                    };
                }
                acc[nic.id].qty += 1;
                return acc;
            }, {})
        );

        cpuGroups.forEach((group) => {
            plannerRows.push({
                key: `cpu-${nodeIdx}-${group.id}`,
                category: 'CPU',
                location: `Node ${nodeIdx + 1}`,
                item: group.item,
                quantity: group.qty,
                defaultUnitPrice: group.msrp,
                overrideKey: getOverrideKey('cpu', group.id),
            });
        });

        memoryGroups.forEach((group) => {
            plannerRows.push({
                key: `memory-${nodeIdx}-${group.id}`,
                category: 'Memory',
                location: `Node ${nodeIdx + 1}`,
                item: group.item,
                quantity: group.qty,
                defaultUnitPrice: group.msrp,
                overrideKey: getOverrideKey('memory', group.id),
            });
        });

        storageGroups.forEach((group) => {
            plannerRows.push({
                key: `storage-${nodeIdx}-${group.id}`,
                category: 'Storage',
                location: `Node ${nodeIdx + 1}`,
                item: group.item,
                quantity: group.qty,
                defaultUnitPrice: group.msrp,
                overrideKey: getOverrideKey('storage', group.id),
            });
        });

        controllerGroups.forEach((group) => {
            plannerRows.push({
                key: `controller-${nodeIdx}-${group.id}`,
                category: 'Controller',
                location: `Node ${nodeIdx + 1}`,
                item: group.item,
                quantity: group.qty,
                defaultUnitPrice: group.msrp,
                overrideKey: getOverrideKey('controller', group.id),
            });
        });

        networkGroups.forEach((group) => {
            plannerRows.push({
                key: `network-${nodeIdx}-${group.id}`,
                category: 'Networking',
                location: `Node ${nodeIdx + 1}`,
                item: group.item,
                quantity: group.qty,
                defaultUnitPrice: group.msrp,
                overrideKey: getOverrideKey('network', group.id),
            });
        });
    });

    const hardwareTotal = plannerRows.reduce((sum, row) => {
        const unitPrice = row.overrideKey !== undefined && priceOverrides[row.overrideKey] !== undefined
            ? priceOverrides[row.overrideKey]
            : row.defaultUnitPrice;
        return sum + unitPrice * row.quantity;
    }, 0);
    const customTotal = customCosts.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const totalPrice = hardwareTotal + customTotal;
    const nodeActuals = build.nodes.map((node) => ({
        cores: node.cpus.reduce((sum, cpu) => sum + cpu.cores, 0),
        memoryGB: node.memory.reduce((sum, dimm) => sum + dimm.constraints.capacityGB, 0),
        storageTB: Number(node.storage.reduce((sum, drive) => sum + drive.constraints.capacityTB, 0).toFixed(2)),
    }));

    return (
        <div className="space-y-4 lg:sticky lg:top-4">
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                <h3 className="text-lg font-semibold mb-4">Build Summary</h3>

                {/* Chassis */}
                <div className="mb-4">
                    <h4 className="text-sm font-medium text-slate-400 mb-2">Chassis</h4>
                    <div className="bg-slate-900 rounded p-3">
                        <div className="font-medium">{build.chassis.name}</div>
                        <div className="text-sm text-slate-400">{build.chassis.vendor}</div>
                    </div>
                </div>

                {/* Nodes */}
                {build.nodes.map((node, idx) => (
                    <div key={idx} className="mb-4">
                        <h4 className="text-sm font-medium text-slate-400 mb-2">
                            Node {idx + 1}
                        </h4>
                        <div className="space-y-2 text-sm">
                            {node.motherboard && (
                                <div className="bg-slate-900 rounded p-2">
                                    <span className="text-slate-400">Mobo:</span>{' '}
                                    {node.motherboard.name}
                                </div>
                            )}
                            {node.cpus.map((cpu, cpuIdx) => (
                                <div key={cpuIdx} className="bg-slate-900 rounded p-2">
                                    <span className="text-slate-400">CPU {cpuIdx + 1}:</span>{' '}
                                    {cpu.name}
                                </div>
                            ))}
                            {node.memory.length > 0 && (
                                <div className="bg-slate-900 rounded p-2">
                                    <span className="text-slate-400">Memory:</span>{' '}
                                    {node.memory.length}× DIMMs
                                </div>
                            )}
                            {node.storage.length > 0 && (
                                <div className="bg-slate-900 rounded p-2">
                                    <span className="text-slate-400">Storage:</span>{' '}
                                    {node.storage.length}× Drives
                                </div>
                            )}
                            {(node.controllers ?? []).length > 0 && (
                                <div className="bg-slate-900 rounded p-2">
                                    <span className="text-slate-400">Controllers:</span>{' '}
                                    {(node.controllers ?? []).length}× Cards
                                </div>
                            )}
                            {(node.networkAdapters ?? []).length > 0 && (
                                <div className="bg-slate-900 rounded p-2">
                                    <span className="text-slate-400">Networking:</span>{' '}
                                    {(node.networkAdapters ?? []).length}× Cards
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {/* Power & Price */}
                <div className="border-t border-slate-700 pt-4 space-y-2">
                    <div className="flex justify-between">
                        <span className="text-slate-400">Total Power:</span>
                        <span className="font-medium">{totalPower}W</span>
                    </div>
                    {build.chassis.constraints.psu && (
                        <div className="flex justify-between">
                            <span className="text-slate-400">PSU Capacity:</span>
                            <span className="font-medium">
                                {build.chassis.constraints.psu.maxWatts}W
                            </span>
                        </div>
                    )}
                    <div className="flex justify-between">
                        <span className="text-slate-400">Hardware Total:</span>
                        <span className="font-medium">${hardwareTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">Custom Costs:</span>
                        <span className="font-medium">${customTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-blue-400 font-semibold">
                        <span>Grand Total:</span>
                        <span>${totalPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                </div>

                {/* Validation Issues */}
                {(errors.length > 0 || warnings.length > 0) && (
                    <div className="border-t border-slate-700 pt-4 space-y-2">
                        {errors.length > 0 && (
                            <div className="bg-red-950/30 border border-red-900 rounded p-3">
                                <div className="font-medium text-red-400 mb-2">
                                    {errors.length} Error{errors.length > 1 ? 's' : ''}
                                </div>
                                {errors.map((issue, idx) => (
                                    <div key={idx} className="text-sm text-red-300">
                                        • {issue.message}
                                    </div>
                                ))}
                            </div>
                        )}
                        {warnings.length > 0 && (
                            <div className="bg-yellow-950/30 border border-yellow-900 rounded p-3">
                                <div className="font-medium text-yellow-400 mb-2">
                                    {warnings.length} Warning{warnings.length > 1 ? 's' : ''}
                                </div>
                                {warnings.map((issue, idx) => (
                                    <div key={idx} className="text-sm text-yellow-300">
                                        • {issue.message}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Planner BOM</h3>
                    <span className="text-xs text-slate-400">Edit unit prices to match vendor quotes</span>
                </div>
                <div className="space-y-3">
                    {plannerRows.map((row) => {
                        const overrideKey = row.overrideKey;
                        const overrideValue = overrideKey ? priceOverrides[overrideKey] : undefined;
                        const unitPrice = overrideValue ?? row.defaultUnitPrice;
                        const subtotal = unitPrice * row.quantity;

                        return (
                            <div key={row.key} className="rounded border border-slate-700 bg-slate-900 p-3 space-y-3">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <div>
                                        <div className="text-[11px] uppercase tracking-wide text-slate-500">Category</div>
                                        <div className="text-sm text-slate-300">{row.category}</div>
                                    </div>
                                    <div>
                                        <div className="text-[11px] uppercase tracking-wide text-slate-500">Location</div>
                                        <div className="text-sm text-slate-400">{row.location}</div>
                                    </div>
                                    <div>
                                        <div className="text-[11px] uppercase tracking-wide text-slate-500">Qty</div>
                                        <div className="text-sm">{row.quantity}</div>
                                    </div>
                                    <div>
                                        <div className="text-[11px] uppercase tracking-wide text-slate-500">Subtotal</div>
                                        <div className="text-sm font-medium text-slate-200">
                                            ${subtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="text-[11px] uppercase tracking-wide text-slate-500">Part</div>
                                    <div className="text-sm text-slate-200 break-words">{row.item}</div>
                                </div>

                                <div>
                                    <div className="text-[11px] uppercase tracking-wide text-slate-500">Unit</div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <input
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            value={unitPrice}
                                            onChange={(event) => {
                                                const nextValue = event.target.value === '' ? undefined : Number(event.target.value);
                                                if (overrideKey) {
                                                    setPriceOverride(overrideKey, nextValue);
                                                }
                                            }}
                                            className="w-full sm:w-32 min-w-0 bg-slate-950 border border-slate-700 rounded px-2 py-1"
                                        />
                                        {overrideValue !== undefined && overrideKey && (
                                            <button
                                                onClick={() => setPriceOverride(overrideKey, undefined)}
                                                className="text-xs text-slate-400 hover:text-slate-200 whitespace-nowrap"
                                            >
                                                MSRP
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Custom Cost Lines</h3>
                    <button
                        onClick={() => addCustomCostItem()}
                        className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                    >
                        <Plus size={14} />
                        Add
                    </button>
                </div>
                {customCosts.length === 0 && (
                    <p className="text-sm text-slate-400">No custom lines yet. Add network cards, services, shipping, or misc parts.</p>
                )}
                {customCosts.length > 0 && (
                    <div className="hidden md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_90px_120px_120px_40px] gap-2 text-xs uppercase tracking-wide text-slate-400">
                        <div>Item</div>
                        <div>Category</div>
                        <div>Qty</div>
                        <div>Unit</div>
                        <div>Subtotal</div>
                        <div></div>
                    </div>
                )}
                {customCosts.map((item) => (
                    <div key={item.id} className="rounded border border-slate-700 bg-slate-900 p-3 md:p-0 md:border-0 md:bg-transparent md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_90px_120px_120px_40px] md:gap-2 md:items-center">
                        <div className="text-xs uppercase tracking-wide text-slate-500 md:hidden mb-1">Item</div>
                        <input
                            value={item.label}
                            onChange={(event) => updateCustomCostItem(item.id, { label: event.target.value })}
                            className="w-full min-w-0 bg-slate-950 md:bg-slate-900 border border-slate-700 rounded px-2 py-1"
                            placeholder="Line item"
                        />
                        <div className="text-xs uppercase tracking-wide text-slate-500 md:hidden mb-1 mt-2 md:mt-0">Category</div>
                        <select
                            value={item.category}
                            onChange={(event) => updateCustomCostItem(item.id, { category: event.target.value as PlannerCostCategory })}
                            className="w-full min-w-0 bg-slate-950 md:bg-slate-900 border border-slate-700 rounded px-2 py-1"
                        >
                            {PART_CATEGORY_OPTIONS.map((category) => (
                                <option key={category} value={category}>
                                    {category}
                                </option>
                            ))}
                        </select>
                        <div className="text-xs uppercase tracking-wide text-slate-500 md:hidden mb-1 mt-2 md:mt-0">Qty</div>
                        <DraftNumberInput
                            value={item.quantity}
                            min={1}
                            onCommit={(quantity) => updateCustomCostItem(item.id, { quantity })}
                            className="w-full min-w-0 bg-slate-950 md:bg-slate-900 border border-slate-700 rounded px-2 py-1"
                        />
                        <div className="text-xs uppercase tracking-wide text-slate-500 md:hidden mb-1 mt-2 md:mt-0">Unit Price</div>
                        <DraftNumberInput
                            value={item.unitPrice}
                            min={0}
                            step="0.01"
                            onCommit={(unitPrice) => updateCustomCostItem(item.id, { unitPrice })}
                            className="w-full min-w-0 bg-slate-950 md:bg-slate-900 border border-slate-700 rounded px-2 py-1"
                        />
                        <div className="text-xs uppercase tracking-wide text-slate-500 md:hidden mb-1 mt-2 md:mt-0">Subtotal</div>
                        <div className="text-left md:text-right text-sm font-medium mt-1 md:mt-0">
                            ${(item.quantity * item.unitPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </div>
                        <button
                            onClick={() => removeCustomCostItem(item.id)}
                            className="mt-2 md:mt-0 flex items-center justify-center md:justify-self-end text-red-400 hover:text-red-300"
                            aria-label={`remove-${item.id}`}
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>

            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 space-y-4">
                <h3 className="text-lg font-semibold">Node Targets</h3>
                <p className="text-sm text-slate-400">Set target specs per node to compare planned vs selected hardware.</p>
                <div className="space-y-3">
                    {build.nodes.map((node, idx) => {
                        const target = nodeTargets[node.index] ?? { cores: 0, memoryGB: 0, storageTB: 0 };
                        const actual = nodeActuals[idx];
                        const coreGap = target.cores > 0 && actual.cores < target.cores;
                        const ramGap = target.memoryGB > 0 && actual.memoryGB < target.memoryGB;
                        const storageGap = target.storageTB > 0 && actual.storageTB < target.storageTB;

                        return (
                            <div key={node.index} className="rounded border border-slate-700 bg-slate-900 p-3 space-y-3">
                                <div className="text-sm font-medium text-slate-200">Node {idx + 1}</div>

                                <div className="grid grid-cols-1 gap-2">
                                    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 items-center">
                                        <label className="text-xs text-slate-400">Target Cores</label>
                                        <span className={`text-sm font-semibold ${coreGap ? 'text-red-400' : 'text-green-400'}`}>
                                            Actual: {actual.cores}
                                        </span>
                                        <DraftNumberInput
                                            value={target.cores}
                                            min={0}
                                            onCommit={(cores) => setNodeTarget(node.index, { cores })}
                                            className="col-span-2 w-full min-w-0 bg-slate-950 border border-slate-700 rounded px-2 py-1"
                                        />
                                    </div>

                                    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 items-center">
                                        <label className="text-xs text-slate-400">Target RAM (GB)</label>
                                        <span className={`text-sm font-semibold ${ramGap ? 'text-red-400' : 'text-green-400'}`}>
                                            Actual: {actual.memoryGB}
                                        </span>
                                        <DraftNumberInput
                                            value={target.memoryGB}
                                            min={0}
                                            onCommit={(memoryGB) => setNodeTarget(node.index, { memoryGB })}
                                            className="col-span-2 w-full min-w-0 bg-slate-950 border border-slate-700 rounded px-2 py-1"
                                        />
                                    </div>

                                    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 items-center">
                                        <label className="text-xs text-slate-400">Target Storage (TB)</label>
                                        <span className={`text-sm font-semibold ${storageGap ? 'text-red-400' : 'text-green-400'}`}>
                                            Actual: {actual.storageTB}
                                        </span>
                                        <DraftNumberInput
                                            value={target.storageTB}
                                            min={0}
                                            step="0.1"
                                            onCommit={(storageTB) => setNodeTarget(node.index, { storageTB })}
                                            className="col-span-2 w-full min-w-0 bg-slate-950 border border-slate-700 rounded px-2 py-1"
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
