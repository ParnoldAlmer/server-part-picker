import type { Build } from '../../../types/hardware';
import type { ValidationRule, ValidationIssue } from '../types';

export const memorySlotRule: ValidationRule = (build: Build): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];
    const maxDimms = build.chassis?.constraints.maxDimmsPerNode;

    if (!maxDimms || !build.nodes) {
        return issues;
    }

    for (let nodeIndex = 0; nodeIndex < build.nodes.length; nodeIndex++) {
        const node = build.nodes[nodeIndex];
        if (node.memory.length <= maxDimms) {
            continue;
        }

        issues.push({
            code: 'DIMM_SLOT_LIMIT',
            severity: 'error',
            path: `nodes[${nodeIndex}].memory`,
            message: `DIMM limits exceeded: ${node.memory.length} installed, max ${maxDimms} allowed for this chassis.`,
        });
    }

    return issues;
};
