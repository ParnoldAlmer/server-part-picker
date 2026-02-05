import type { ValidationRule, ValidationIssue } from '../types';
import type { Build } from '../../../types/hardware';

/**
 * Calculate total power consumption
 */
function calculatePower(build: Build): number {
    let totalWatts = 0;

    if (!build.nodes) return totalWatts;

    for (const node of build.nodes) {
        // CPU power
        for (const cpu of node.cpus || []) {
            totalWatts += cpu.constraints.tdpW;
        }

        // Memory power (approximately 10W per DIMM)
        totalWatts += (node.memory?.length || 0) * 10;

        // Storage power
        for (const drive of node.storage || []) {
            totalWatts += drive.constraints.tdpW;
        }
    }

    // System overhead (motherboard, fans, etc.)
    totalWatts += 75;

    return totalWatts;
}

/**
 * Power Rule: Check power budget and warn on low headroom
 */
export const powerRule: ValidationRule = (build: Build): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];

    if (!build.chassis || !build.nodes) return issues;

    const psuConstraints = build.chassis.constraints.psu;
    const totalPower = calculatePower(build);
    const availablePower = psuConstraints.maxWatts;

    // Error if exceeds PSU capacity
    if (totalPower > availablePower) {
        issues.push({
            code: 'POWER_EXCEEDED',
            severity: 'error',
            path: 'chassis',
            message: `Total ${totalPower}W exceeds PSU capacity ${availablePower}W`,
        });
    }

    // Warn if headroom is less than 20%
    const headroom = (availablePower - totalPower) / availablePower;
    if (headroom < 0.2 && totalPower <= availablePower) {
        issues.push({
            code: 'POWER_HEADROOM_LOW',
            severity: 'warn',
            path: 'chassis',
            message: `Power headroom only ${(headroom * 100).toFixed(1)}% (${totalPower}W / ${availablePower}W). Consider higher wattage PSU for safety margin.`,
        });
    }

    return issues;
};

/**
 * Export power calculation for UI use
 */
export { calculatePower };
