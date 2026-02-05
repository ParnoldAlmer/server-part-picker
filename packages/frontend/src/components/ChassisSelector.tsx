import { useState, useEffect } from 'react';
import type { Chassis } from '../types/hardware';
import { cn } from '../lib/utils';
import { useBuildStore } from '../store/buildStore';

export function ChassisSelector() {
    const [chassis, setChassis] = useState<Chassis[]>([]);
    const [loading, setLoading] = useState(true);
    const { build, setChassis: setSelectedChassis } = useBuildStore();

    useEffect(() => {
        fetch('http://localhost:3001/api/catalog/chassis')
            .then((res) => res.json())
            .then((data) => {
                setChassis(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error('Failed to load chassis:', err);
                setLoading(false);
            });
    }, []);

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
                                    {c.constraints.bays.map(b => `${b.count}× ${b.type}`).join(', ')}
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
