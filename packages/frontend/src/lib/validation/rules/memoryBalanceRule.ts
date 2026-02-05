import type { ValidationRule, ValidationIssue } from '../types';
import type { Build } from '../../../types/hardware';

/**
 * Memory Balance Rule: Warn if memory population is unbalanced across channels
 */
export const memoryBalanceRule: ValidationRule = (build: Build): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];

    if (!build.nodes) return issues;

    for (let i = 0; i < build.nodes.length; i++) {
        const node = build.nodes[i];
        if (!node.motherboard || node.memory.length === 0) continue;

        const channels = node.motherboard.constraints.mem.channels;
        const cpuCount = node.motherboard.socketCount;
        const totalChannels = channels * cpuCount;

        // Warn if not populated evenly across channels
        if (node.memory.length % totalChannels !== 0) {
            issues.push({
                code: 'MEMORY_UNBALANCED',
                severity: 'warn',
                path: `nodes[${i}].memory`,
                message: `Memory not evenly distributed (${node.memory.length} DIMMs across ${totalChannels} channels). Consider populating ${Math.ceil(node.memory.length / totalChannels) * totalChannels} DIMMs for optimal performance.`,
            });
        }

        // Warn if mixing different capacities
        const capacities = new Set(node.memory.map(m => m.constraints.capacityGB));
        if (capacities.size > 1) {
            issues.push({
                code: 'MEMORY_MIXED_CAPACITY',
                severity: 'warn',
                path: `nodes[${i}].memory`,
                message: `Mixing DIMM capacities (${Array.from(capacities).join('GB, ')}GB) may reduce maximum memory speed`,
            });
        }

        // Warn if mixing speeds
        const speeds = new Set(node.memory.map(m => m.constraints.speedMT));
        if (speeds.size > 1) {
            const minSpeed = Math.min(...Array.from(speeds));
            issues.push({
                code: 'MEMORY_SPEED_DOWNRATE',
                severity: 'warn',
                path: `nodes[${i}].memory`,
                message: `Mixing memory speeds (${Array.from(speeds).join(', ')} MT/s). System will run at lowest speed: ${minSpeed} MT/s`,
            });
        }
    }

    return issues;
};
