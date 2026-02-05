import type { ValidationRule, ValidationIssue } from '../types';
import type { Build } from '../../../types/hardware';

/**
 * Bay Limit Rule: Check storage doesn't exceed chassis bay limits
 */
export const bayLimitRule: ValidationRule = (build: Build): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];

    if (!build.chassis || !build.nodes) return issues;

    const bayConstraints = build.chassis.constraints.bays;

    // Aggregate storage across all nodes
    const storageByType: Record<string, number> = {};

    for (let i = 0; i < build.nodes.length; i++) {
        const node = build.nodes[i];
        if (!node.storage) continue;

        for (const drive of node.storage) {
            const formFactor = drive.constraints.formFactor;
            storageByType[formFactor] = (storageByType[formFactor] || 0) + 1;
        }
    }

    // Check each bay type
    for (const bayConfig of bayConstraints) {
        const driveCount = storageByType[bayConfig.type] || 0;

        if (driveCount > bayConfig.count) {
            issues.push({
                code: 'BAY_LIMIT_EXCEEDED',
                severity: 'error',
                path: 'chassis',
                message: `${driveCount} ${bayConfig.type} drives exceeds ${bayConfig.count} available ${bayConfig.type} bays`,
            });
        }

        // Check interface compatibility
        for (let i = 0; i < build.nodes.length; i++) {
            const node = build.nodes[i];
            if (!node.storage) continue;

            for (let storageIdx = 0; storageIdx < node.storage.length; storageIdx++) {
                const drive = node.storage[storageIdx];
                if (drive.constraints.formFactor === bayConfig.type &&
                    drive.constraints.interface !== bayConfig.interface) {
                    issues.push({
                        code: 'BAY_INTERFACE_MISMATCH',
                        severity: 'error',
                        path: `nodes[${i}].storage[${storageIdx}]`,
                        message: `${drive.constraints.interface} drive incompatible with ${bayConfig.interface}-only ${bayConfig.type} bay`,
                    });
                }
            }
        }

        // Warn if per-node limit exists and is violated
        if (bayConfig.perNode) {
            for (let i = 0; i < build.nodes.length; i++) {
                const node = build.nodes[i];
                if (!node.storage) continue;

                const nodeStorage = node.storage.filter(
                    s => s.constraints.formFactor === bayConfig.type
                );

                if (nodeStorage.length > bayConfig.perNode) {
                    issues.push({
                        code: 'BAY_PER_NODE_EXCEEDED',
                        severity: 'error',
                        path: `nodes[${i}].storage`,
                        message: `Node ${i} has ${nodeStorage.length} ${bayConfig.type} drives, exceeds ${bayConfig.perNode} per-node limit`,
                    });
                }
            }
        }
    }

    return issues;
};
