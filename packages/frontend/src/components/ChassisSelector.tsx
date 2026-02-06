import { useState, useMemo, useEffect } from 'react';
import type { Chassis, BayFormFactor, BayInterface, FormFactor } from '../types/hardware';
import { cn } from '../lib/utils';
import { useBuildStore } from '../store/buildStore';
import chassisData from '../../../backend/src/data/chassis.json';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { v4 as uuidv4 } from 'uuid';
import { Trash2, Plus, RotateCcw, AlertTriangle, X, Pencil } from 'lucide-react';

interface BayGroupInput {
    count: number;
    formFactor: BayFormFactor;
    interface: BayInterface;
    hotSwap: boolean;
    perNode: boolean;
}

interface ChassisFormState {
    vendor: string;
    name: string;
    sku: string;
    formFactor: FormFactor;
    nodeCount: number;
    psuWatts: number;
    maxDimmsPerNode?: number;
    bayGroups: BayGroupInput[];
}

const INITIAL_FORM_STATE: ChassisFormState = {
    vendor: '',
    name: '',
    sku: '',
    formFactor: '1U',
    nodeCount: 1,
    psuWatts: 0,
    bayGroups: [],
};

const BAY_FORM_FACTORS: BayFormFactor[] = ["2.5\"", "3.5\"", "E1.S", "E1.L", "E3.S", "E3.L", "M.2", "U.2", "U.3"];
const BAY_INTERFACES: BayInterface[] = ["SATA", "SAS", "NVMe"];

export function ChassisSelector() {
    const defaultChassis = useMemo(() => chassisData as Chassis[], []);

    // Persistence
    const [customChassis, setCustomChassis] = useLocalStorage<Chassis[]>('chassis_custom_v1', []);
    const [hiddenChassisIds, setHiddenChassisIds] = useLocalStorage<string[]>('chassis_hidden_v1', []);

    // Local UI State
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formState, setFormState] = useState<ChassisFormState>(INITIAL_FORM_STATE);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [undoState, setUndoState] = useState<{ id: string, type: 'default' | 'custom', chassis?: Chassis } | null>(null);

    const { build, setChassis: setSelectedChassis } = useBuildStore();

    // Derived Selection
    const visibleChassis = useMemo(() => {
        const defaults = defaultChassis.filter(c => !hiddenChassisIds.includes(c.id));
        return [...defaults, ...customChassis];
    }, [defaultChassis, customChassis, hiddenChassisIds]);

    // Cleanup selection if selected chassis is removed
    useEffect(() => {
        if (build.chassis && !visibleChassis.some(c => c.id === build.chassis?.id)) {
            // Ideally we'd set to null, but store might not support it cleanly depending on types.
            // For now, if the user removes the active one, we keep it in the store but it's gone from the list.
            // This is "safe" but maybe confusing. 
            // Better behavior: If the selected chassis becomes hidden, clear it?
            // Let's decide to keep it selected (it's in the text summary) but user can select another.
        }
    }, [visibleChassis, build.chassis]);

    const handleRestoreDefaults = () => {
        setHiddenChassisIds([]);
    };

    const handleRemove = (id: string, isCustom: boolean) => {
        if (isCustom) {
            const chassisToRemove = customChassis.find(c => c.id === id);
            setCustomChassis(prev => prev.filter(c => c.id !== id));
            setUndoState({ id, type: 'custom', chassis: chassisToRemove });
        } else {
            setHiddenChassisIds(prev => [...prev, id]);
            setUndoState({ id, type: 'default' });
        }

        // Clear undo after 5 seconds
        setTimeout(() => setUndoState(null), 5000);
    };

    const handleUndo = () => {
        if (!undoState) return;

        if (undoState.type === 'custom' && undoState.chassis) {
            setCustomChassis(prev => [...prev, undoState.chassis!]);
        } else if (undoState.type === 'default') {
            setHiddenChassisIds(prev => prev.filter(id => id !== undoState.id));
        }
        setUndoState(null);
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formState.vendor) newErrors.vendor = "Vendor is required";
        if (!formState.name) newErrors.name = "Model name is required";
        if (formState.nodeCount < 1) newErrors.nodeCount = "Must have at least 1 node";
        if (formState.psuWatts < 0) newErrors.psuWatts = "Watts cannot be negative";

        // Check duplicates (exclude the chassis being edited)
        const isDuplicate = visibleChassis.some(c =>
            c.id !== editingId &&
            c.vendor.toLowerCase() === formState.vendor.toLowerCase() &&
            c.name.toLowerCase() === formState.name.toLowerCase() &&
            c.formFactor === formState.formFactor
        );
        if (isDuplicate) newErrors.general = "A chassis with this Vendor, Name and Form Factor already exists.";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleAddChassis = () => {
        if (!validateForm()) return;

        const chassisData: Chassis = {
            id: editingId || `custom_${uuidv4()}`,
            vendor: formState.vendor,
            name: formState.name,
            sku: formState.sku || 'Custom',
            formFactor: formState.formFactor,
            msrp: 0,
            constraints: {
                nodes: Array.from({ length: formState.nodeCount }).map((_, i) => ({
                    index: i,
                    moboFormFactors: ['EATX', 'ATX', 'Proprietary'], // Default to permissive
                    cpuCount: 2 // Default to dual socket capable
                })),
                bays: formState.bayGroups.map(g => ({
                    count: g.count,
                    formFactor: g.formFactor,
                    interface: g.interface,
                    hotSwap: g.hotSwap,
                    perNode: g.perNode
                })),
                psu: {
                    maxWatts: formState.psuWatts,
                    count: 2,
                    redundancy: true
                },
                maxDimmsPerNode: formState.maxDimmsPerNode
            }
        };

        if (editingId) {
            // Update existing
            setCustomChassis(prev => prev.map(c => c.id === editingId ? chassisData : c));
        } else {
            // Add new
            setCustomChassis(prev => [...prev, chassisData]);
        }

        setIsAdding(false);
        setEditingId(null);
        setFormState(INITIAL_FORM_STATE);
        setErrors({});
    };

    const handleEdit = (chassis: Chassis) => {
        setEditingId(chassis.id);
        setFormState({
            vendor: chassis.vendor,
            name: chassis.name,
            sku: chassis.sku,
            formFactor: chassis.formFactor,
            nodeCount: chassis.constraints.nodes.length,
            psuWatts: chassis.constraints.psu.maxWatts,
            maxDimmsPerNode: chassis.constraints.maxDimmsPerNode,
            bayGroups: chassis.constraints.bays.map(b => ({
                count: b.count,
                formFactor: b.formFactor,
                interface: b.interface,
                hotSwap: b.hotSwap,
                perNode: b.perNode ?? false
            }))
        });
        setIsAdding(true);
        setErrors({});
    };

    const handleCancelForm = () => {
        setIsAdding(false);
        setEditingId(null);
        setFormState(INITIAL_FORM_STATE);
        setErrors({});
    };

    const addBayGroup = () => {
        setFormState(prev => ({
            ...prev,
            bayGroups: [...prev.bayGroups, { count: 0, formFactor: '2.5"', interface: 'NVMe', hotSwap: true, perNode: false }]
        }));
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold mb-2">Select Chassis</h2>
                    <p className="text-slate-400">
                        Select a chassis to determine node capacity and constraints.
                    </p>
                </div>
                {!isAdding && (
                    <button
                        onClick={() => {
                            setIsAdding(true);
                            setEditingId(null);
                            setFormState(INITIAL_FORM_STATE);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                    >
                        <Plus size={16} />
                        Add Custom Chassis
                    </button>
                )}
            </div>

            {/* Undo Toast */}
            {undoState && (
                <div className="fixed bottom-6 right-6 z-50 flex items-center gap-4 bg-slate-800 border border-slate-700 p-4 rounded-lg shadow-xl animate-in fade-in slide-in-from-bottom-4">
                    <span>Chassis removed.</span>
                    <button
                        onClick={handleUndo}
                        className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                    >
                        <RotateCcw size={14} /> Undo
                    </button>
                </div>
            )}

            {/* Add Custom Chassis Form */}
            {isAdding && (
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-6">
                    <div className="flex justify-between items-center border-b border-slate-700 pb-4">
                        <h3 className="text-xl font-semibold">{editingId ? 'Edit Chassis' : 'New Custom Chassis'}</h3>
                        <button onClick={handleCancelForm} className="text-slate-400 hover:text-white">
                            <X size={20} />
                        </button>
                    </div>

                    {errors.general && (
                        <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded flex items-center gap-2">
                            <AlertTriangle size={16} /> {errors.general}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm text-slate-400">Vendor *</label>
                            <input
                                value={formState.vendor}
                                onChange={e => setFormState({ ...formState, vendor: e.target.value })}
                                className={cn("w-full bg-slate-900 border rounded px-3 py-2", errors.vendor ? "border-red-500" : "border-slate-700")}
                                placeholder="e.g. Dell, Supermicro"
                            />
                            {errors.vendor && <span className="text-xs text-red-500">{errors.vendor}</span>}
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm text-slate-400">Model Name *</label>
                            <input
                                value={formState.name}
                                onChange={e => setFormState({ ...formState, name: e.target.value })}
                                className={cn("w-full bg-slate-900 border rounded px-3 py-2", errors.name ? "border-red-500" : "border-slate-700")}
                                placeholder="e.g. R760"
                            />
                            {errors.name && <span className="text-xs text-red-500">{errors.name}</span>}
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm text-slate-400">SKU (Optional)</label>
                            <input
                                value={formState.sku}
                                onChange={e => setFormState({ ...formState, sku: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm text-slate-400">Form Factor *</label>
                            <select
                                value={formState.formFactor}
                                onChange={e => setFormState({ ...formState, formFactor: e.target.value as FormFactor })}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2"
                            >
                                <option value="1U">1U</option>
                                <option value="2U">2U</option>
                                <option value="4U">4U</option>
                                <option value="Blade">Blade</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm text-slate-400">Node Count *</label>
                            <input
                                type="number"
                                min={1}
                                value={formState.nodeCount}
                                onChange={e => setFormState({ ...formState, nodeCount: parseInt(e.target.value) || 0 })}
                                className={cn("w-full bg-slate-900 border rounded px-3 py-2", errors.nodeCount ? "border-red-500" : "border-slate-700")}
                            />
                            {errors.nodeCount && <span className="text-xs text-red-500">{errors.nodeCount}</span>}
                        </div>
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-slate-400 mb-1">
                                PSU Max Watts
                            </label>
                            <input
                                type="number"
                                value={formState.psuWatts}
                                onChange={e => setFormState({ ...formState, psuWatts: parseInt(e.target.value) || 0 })}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2"
                                placeholder="0"
                            />
                            {errors.psuWatts && <p className="text-sm text-red-500 mt-1">{errors.psuWatts}</p>}
                        </div>
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-slate-400 mb-1">
                                Max DIMMs/Node
                            </label>
                            <input
                                type="number"
                                min={1}
                                value={formState.maxDimmsPerNode ?? ''}
                                onChange={e => {
                                    const val = e.target.value === '' ? undefined : parseInt(e.target.value);
                                    setFormState({ ...formState, maxDimmsPerNode: val });
                                }}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2"
                                placeholder="No Limit"
                            />
                            {errors.maxDimmsPerNode && <p className="text-sm text-red-500 mt-1">{errors.maxDimmsPerNode}</p>}
                        </div>
                    </div>

                    {/* Drive Bays */}
                    <div className="space-y-3 pt-4 border-t border-slate-700">
                        <div className="flex justify-between items-center">
                            <h4 className="font-medium">Drive Bays</h4>
                            <button onClick={addBayGroup} className="text-sm text-blue-400 hover:text-blue-300">
                                + Add Bay Group
                            </button>
                        </div>

                        {formState.bayGroups.length === 0 && (
                            <p className="text-sm text-slate-500 italic">No drive bays configured.</p>
                        )}

                        {formState.bayGroups.map((group, idx) => (
                            <div key={idx} className="flex gap-2 items-end bg-slate-900/50 p-3 rounded">
                                <div className="w-20">
                                    <label className="text-xs text-slate-400">Count</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={group.count}
                                        onChange={e => {
                                            const newGroups = [...formState.bayGroups];
                                            newGroups[idx].count = parseInt(e.target.value) || 0;
                                            setFormState({ ...formState, bayGroups: newGroups });
                                        }}
                                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1"
                                    />
                                </div>
                                <div className="w-32">
                                    <label className="text-xs text-slate-400">Size</label>
                                    <select
                                        value={group.formFactor}
                                        onChange={e => {
                                            const newGroups = [...formState.bayGroups];
                                            newGroups[idx].formFactor = e.target.value as BayFormFactor;
                                            setFormState({ ...formState, bayGroups: newGroups });
                                        }}
                                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1"
                                    >
                                        {BAY_FORM_FACTORS.map(f => <option key={f} value={f}>{f}</option>)}
                                    </select>
                                </div>
                                <div className="w-32">
                                    <label className="text-xs text-slate-400">Interface</label>
                                    <select
                                        value={group.interface}
                                        onChange={e => {
                                            const newGroups = [...formState.bayGroups];
                                            newGroups[idx].interface = e.target.value as BayInterface;
                                            setFormState({ ...formState, bayGroups: newGroups });
                                        }}
                                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1"
                                    >
                                        {BAY_INTERFACES.map(i => <option key={i} value={i}>{i}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-center gap-2 px-3">
                                    <input
                                        type="checkbox"
                                        id={`perNode-${idx}`}
                                        checked={group.perNode}
                                        onChange={e => {
                                            const newGroups = [...formState.bayGroups];
                                            newGroups[idx].perNode = e.target.checked;
                                            setFormState({ ...formState, bayGroups: newGroups });
                                        }}
                                        className="w-4 h-4 bg-slate-800 border border-slate-700 rounded"
                                    />
                                    <label htmlFor={`perNode-${idx}`} className="text-xs text-slate-400 whitespace-nowrap">Per Node</label>
                                </div>
                                <button
                                    onClick={() => {
                                        const newGroups = formState.bayGroups.filter((_, i) => i !== idx);
                                        setFormState({ ...formState, bayGroups: newGroups });
                                    }}
                                    className="p-2 text-red-500 hover:bg-red-900/20 rounded"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end gap-3 border-t border-slate-700 pt-4">
                        <button
                            onClick={handleCancelForm}
                            className="px-4 py-2 hover:bg-slate-700 rounded"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAddChassis}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium"
                        >
                            {editingId ? 'Update Chassis' : 'Save Chassis'}
                        </button>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {visibleChassis.length === 0 && !isAdding && (
                <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-lg">
                    <p className="text-slate-400 mb-4">No chassis available.</p>
                    <button
                        onClick={handleRestoreDefaults}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-md text-sm font-medium"
                    >
                        Restore Defaults
                    </button>
                </div>
            )}

            {/* Chassis Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {visibleChassis.map((c) => {
                    const isCustom = c.id.startsWith('custom_');
                    return (
                        <div
                            key={c.id}
                            className={cn(
                                "group relative overflow-hidden rounded-lg border-2 text-left transition-all hover:border-blue-500",
                                build.chassis?.id === c.id
                                    ? "border-blue-500 bg-blue-950/30"
                                    : "border-slate-700 bg-slate-800"
                            )}
                        >
                            {/* Clickable Area */}
                            <button
                                onClick={() => setSelectedChassis(c)}
                                className="w-full h-full p-6 text-left"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="font-semibold text-lg">{c.name}</h3>
                                        <p className="text-sm text-slate-400">{c.vendor} • {c.sku}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className={cn(
                                            "text-xs px-2 py-1 rounded",
                                            isCustom ? "bg-purple-900/50 text-purple-200" : "bg-slate-700"
                                        )}>
                                            {c.formFactor}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-4 space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Nodes:</span>
                                        <span className="font-medium">{c.constraints.nodes.length}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Bays:</span>
                                        <span className="font-medium text-right max-w-[60%]">
                                            {c.constraints.bays.length > 0
                                                ? c.constraints.bays.map(b => `${b.count}× ${b.formFactor}`).join(', ')
                                                : "None"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">PSU:</span>
                                        <span className="font-medium">{c.constraints.psu.maxWatts}W</span>
                                    </div>
                                </div>
                            </button>

                            {/* Action Buttons (Hover only) */}
                            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                {isCustom && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleEdit(c);
                                        }}
                                        className="p-2 bg-slate-900/80 hover:bg-blue-900/80 text-slate-400 hover:text-blue-200 rounded transition-all"
                                        title="Edit Custom Chassis"
                                    >
                                        <Pencil size={16} />
                                    </button>
                                )}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemove(c.id, isCustom);
                                    }}
                                    className="p-2 bg-slate-900/80 hover:bg-red-900/80 text-slate-400 hover:text-red-200 rounded transition-all"
                                    title={isCustom ? "Delete Custom Chassis" : "Hide Default Chassis"}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
