import { useState } from 'react';
import type { Chassis } from '../types/hardware';
import { cn } from '../lib/utils';
import { useBuildStore } from '../store/buildStore';
import chassisData from '../../../backend/src/data/chassis.json';

export function ChassisSelector() {
    const [chassis] = useState<Chassis[]>(chassisData as Chassis[]);
    const [loading] = useState(false);
    const { build, setChassis: setSelectedChassis } = useBuildStore();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-slate-400">Loading chassis...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold mb-2">Select Chassis</h2>
                <p className="text-slate-400">
                    Start by selecting a chassis. This determines node count, drive bays, and power capacity.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {chassis.map((c) => (
                    <button
                        key={c.id}
                        data-testid={`chassis-${c.sku}`}
                        onClick={() => setSelectedChassis(c)}
                        className={cn(
                            "p-6 rounded-lg border-2 text-left transition-all hover:border-blue-500",
                            build.chassis?.id === c.id
                                ? "border-blue-500 bg-blue-950/30"
                                : "border-slate-700 bg-slate-800"
                        )}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h3 className="font-semibold text-lg">{c.name}</h3>
                                <p className="text-sm text-slate-400">{c.vendor} • {c.sku}</p>
                            </div>
                            <span className="text-xs bg-slate-700 px-2 py-1 rounded">
                                {c.formFactor}
                            </span>
                        </div>

                        <div className="mt-4 space-y-1 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-400">Nodes:</span>
                                <span className="font-medium">{c.constraints.nodes.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Bays:</span>
                                <span className="font-medium">
                                    {c.constraints.bays.map(b => `${b.count}× ${b.formFactor}`).join(', ')}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">PSU:</span>
                                <span className="font-medium">{c.constraints.psu.maxWatts}W</span>
                            </div>
                            {c.msrp && (
                                <div className="flex justify-between mt-2 pt-2 border-t border-slate-700">
                                    <span className="text-slate-400">Price:</span>
                                    <span className="font-semibold text-blue-400">
                                        ${c.msrp.toLocaleString()}
                                    </span>
                                </div>
                            )}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
