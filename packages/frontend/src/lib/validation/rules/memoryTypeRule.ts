import type { ValidationRule, ValidationIssue } from '../types';
import type { Build } from '../../../types/hardware';

/**
 * Memory Type Rule: Check DDR generation, RDIMM/LRDIMM compatibility
 */
export const memoryTypeRule: ValidationRule = (build: Build): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];

    if (!build.nodes) return issues;

    for (let i = 0; i < build.nodes.length; i++) {
        const node = build.nodes[i];
        if (!node.motherboard || node.memory.length === 0) continue;

        const moboMemConstraints = node.motherboard.constraints.memory;
        const memoryTypes = new Set<string>();

        for (let memIdx = 0; memIdx < node.memory.length; memIdx++) {
            const mem = node.memory[memIdx];
            const memConstraints = mem.constraints;

            // Check DDR generation
            if (memConstraints.ddrGen !== moboMemConstraints.ddrGen) {
                issues.push({
                    code: 'MEMORY_DDR_MISMATCH',
                    severity: 'error',
                    path: `nodes[${i}].memory[${memIdx}]`,
                    message: `DDR${memConstraints.ddrGen} memory incompatible with DDR${moboMemConstraints.ddrGen}-only motherboard`,
                });
            }

            // Check memory type allowed
            if (!moboMemConstraints.dimmTypes.includes(memConstraints.type)) {
                issues.push({
                    code: 'MEMORY_TYPE_NOT_SUPPORTED',
                    severity: 'error',
                    path: `nodes[${i}].memory[${memIdx}]`,
                    message: `${memConstraints.type} not supported (motherboard accepts: ${moboMemConstraints.dimmTypes.join(', ')})`,
                });
            }

            memoryTypes.add(memConstraints.type);
        }

        // Check for mixed RDIMM/LRDIMM
        if (memoryTypes.size > 1 && (memoryTypes.has('RDIMM') || memoryTypes.has('LRDIMM'))) {
            issues.push({
                code: 'MEMORY_TYPE_MIXED',
                severity: 'error',
                path: `nodes[${i}].memory`,
                message: `Cannot mix RDIMM and LRDIMM in the same system (found: ${Array.from(memoryTypes).join(', ')})`,
            });
        }

        // Check slot count
        const totalSlots = moboMemConstraints.channelsPerSocket * moboMemConstraints.dimmsPerChannel * moboMemConstraints.socketsCount;
        if (node.memory.length > totalSlots) {
            issues.push({
                code: 'MEMORY_SLOT_EXCEEDED',
                severity: 'error',
                path: `nodes[${i}].memory`,
                message: `${node.memory.length} DIMMs exceeds ${totalSlots} available slots`,
            });
        }

        // Check total capacity
        const totalCapacity = node.memory.reduce((sum, m) => sum + m.constraints.capacityGB, 0);
        if (totalCapacity > moboMemConstraints.maxTotalGB) {
            issues.push({
                code: 'MEMORY_CAPACITY_EXCEEDED',
                severity: 'error',
                path: `nodes[${i}].memory`,
                message: `Total ${totalCapacity}GB exceeds maximum ${moboMemConstraints.maxTotalGB}GB`,
            });
        }

        // Check per-DIMM capacity
        for (let memIdx = 0; memIdx < node.memory.length; memIdx++) {
            const mem = node.memory[memIdx];
            if (mem.constraints.capacityGB > moboMemConstraints.maxPerDimmGB) {
                issues.push({
                    code: 'MEMORY_DIMM_CAPACITY_EXCEEDED',
                    severity: 'error',
                    path: `nodes[${i}].memory[${memIdx}]`,
                    message: `${mem.constraints.capacityGB}GB DIMM exceeds max ${moboMemConstraints.maxPerDimmGB}GB per DIMM`,
                });
            }
        }
    }

    return issues;
};
