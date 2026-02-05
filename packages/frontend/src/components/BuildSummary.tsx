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
} from '../lib/validation';
import { calculatePower } from '../lib/validation/rules/powerRule';

const allRules = [
    socketRule,
    memoryTypeRule,
    memoryBalanceRule,
    bayLimitRule,
    powerRule,
    nodeTopologyRule,
];

export function BuildSummary() {
    const { build } = useBuildStore();

    if (!build.chassis) {
        return null;
    }

    const issues = runValidation(build, allRules);
    const { errors, warnings } = categorizeIssues(issues);
    const totalPower = calculatePower(build);

    // Calculate total price
    const totalPrice = (build.chassis.msrp || 0) +
        build.nodes.reduce((sum, node) => {
            const nodeCost =
                (node.motherboard?.msrp || 0) +
                node.cpus.reduce((s, cpu) => s + (cpu.msrp || 0), 0) +
                node.memory.reduce((s, mem) => s + (mem.msrp || 0), 0) +
                node.storage.reduce((s, stg) => s + (stg.msrp || 0), 0);
            return sum + nodeCost;
        }, 0);

    return (
        <div className="sticky top-4 space-y-4">
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
                    {totalPrice > 0 && (
                        <div className="flex justify-between text-blue-400 font-semibold">
                            <span>Total Price:</span>
                            <span>${totalPrice.toLocaleString()}</span>
                        </div>
                    )}
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
        </div>
    );
}
