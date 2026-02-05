import type { ValidationRule, ValidationIssue } from '../types';
import type { Build } from '../../../types/hardware';

/**
 * Socket Rule: CPU socket must match motherboard socket
 */
export const socketRule: ValidationRule = (build: Build): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];

    if (!build.nodes) return issues;

    for (let i = 0; i < build.nodes.length; i++) {
        const node = build.nodes[i];
        if (!node.motherboard || node.cpus.length === 0) continue;

        const moboSocket = node.motherboard.constraints.socket;

        for (let cpuIdx = 0; cpuIdx < node.cpus.length; cpuIdx++) {
            const cpu = node.cpus[cpuIdx];
            const cpuSocket = cpu.constraints.socket;

            if (moboSocket !== cpuSocket) {
                issues.push({
                    code: 'SOCKET_MISMATCH',
                    severity: 'error',
                    path: `nodes[${i}].cpus[${cpuIdx}]`,
                    message: `CPU socket ${cpuSocket} incompatible with motherboard socket ${moboSocket}`,
                });
            }
        }
    }

    return issues;
};
