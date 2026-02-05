import type { ValidationRule, ValidationIssue } from '../types';
import type { Build } from '../../../types/hardware';

/**
 * Node Topology Rule: Ensure nodes match chassis constraints
 */
export const nodeTopologyRule: ValidationRule = (build: Build): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];

    if (!build.chassis || !build.nodes) return issues;

    const chassisNodes = build.chassis.constraints.nodes;

    // Check node count
    if (build.nodes.length > chassisNodes.length) {
        issues.push({
            code: 'NODE_COUNT_EXCEEDED',
            severity: 'error',
            path: 'nodes',
            message: `${build.nodes.length} nodes configured, chassis supports maximum ${chassisNodes.length}`,
        });
    }

    // Check each node's constraints
    for (let i = 0; i < build.nodes.length; i++) {
        const node = build.nodes[i];
        const chassisNodeConfig = chassisNodes[i];

        if (!chassisNodeConfig) continue;

        // Check CPU count
        if (node.cpus && node.cpus.length > chassisNodeConfig.cpuCount) {
            issues.push({
                code: 'NODE_CPU_COUNT_EXCEEDED',
                severity: 'error',
                path: `nodes[${i}].cpus`,
                message: `Node ${i}: ${node.cpus.length} CPUs configured, chassis node supports maximum ${chassisNodeConfig.cpuCount}`,
            });
        }

        // Check motherboard form factor
        if (node.motherboard) {
            const moboFormFactor = node.motherboard.formFactor;
            if (!chassisNodeConfig.moboFormFactors.includes(moboFormFactor)) {
                issues.push({
                    code: 'NODE_MOBO_FORM_FACTOR',
                    severity: 'error',
                    path: `nodes[${i}].motherboard`,
                    message: `Node ${i}: ${moboFormFactor} motherboard incompatible (chassis accepts: ${chassisNodeConfig.moboFormFactors.join(', ')})`,
                });
            }
        }
    }

    return issues;
};
