import type { Node, Build } from '../../../types/hardware';
import type { ValidationResult, ValidationRule } from '../types';

export const memorySlotRule: ValidationRule = {
    id: "memory-slot-limit",
    name: "Memory Slot Limit",
    severity: "error",
    validate: (node: Node, build: Build): ValidationResult[] => {
        const chassis = build.chassis;
        if (!chassis?.constraints.maxDimmsPerNode) {
            return [];
        }

        // Using simple length for now as per user instruction, assuming 1 entry = 1 physical DIMM
        const dimmCount = node.memory.length;
        const maxDimms = chassis.constraints.maxDimmsPerNode;

        if (dimmCount > maxDimms) {
            return [{
                ruleId: "memory-slot-limit",
                severity: "error",
                message: `DIMM limits exceeded: ${dimmCount} installed, max ${maxDimms} allowed for this chassis.`,
                componentId: node.memory[maxDimms]?.id // Point to the first overflowing DIMM if possible
            }];
        }

        return [];
    }
};
