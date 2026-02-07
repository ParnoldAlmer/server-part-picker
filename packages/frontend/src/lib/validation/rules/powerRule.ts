import type { ValidationRule, ValidationIssue } from '../types';
import type { Build, PsuRedundancyMode, RedundantPsuConstraints } from '../../../types/hardware';

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

function resolveRedundancyMode(psu: RedundantPsuConstraints): PsuRedundancyMode {
    if (psu.redundancyMode) return psu.redundancyMode;
    return psu.redundancy ? 'N+1' : 'N';
}

function calculateEffectiveRedundantCapacity(psu: RedundantPsuConstraints): number {
    const mode = resolveRedundancyMode(psu);
    if (mode === 'N') {
        return psu.maxWatts * psu.count;
    }
    if (mode === 'N+1') {
        return psu.maxWatts * Math.max(0, psu.count - 1);
    }
    return psu.maxWatts * Math.floor(psu.count / 2);
}

function calculateRequiredPower(totalPower: number): number {
    return Math.ceil(totalPower * 1.2);
}

/**
 * Power Rule: Check power budget and warn on low headroom
 */
export const powerRule: ValidationRule = (build: Build): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];

    if (!build.chassis || !build.nodes) return issues;

    const psuConstraints = build.chassis.constraints.psu;
    const totalPower = calculatePower(build);
    const mode = resolveRedundancyMode(psuConstraints);
    const nameplateCapacity = psuConstraints.maxWatts * psuConstraints.count;
    const effectiveCapacity = calculateEffectiveRedundantCapacity(psuConstraints);
    const requiredPower = calculateRequiredPower(totalPower);

    // Error if exceeds total installed PSU nameplate capacity
    if (totalPower > nameplateCapacity) {
        issues.push({
            code: 'POWER_EXCEEDED',
            severity: 'error',
            path: 'chassis',
            message: `Total ${totalPower}W exceeds installed PSU capacity ${nameplateCapacity}W.`,
        });
    }

    if (effectiveCapacity <= 0) {
        issues.push({
            code: 'POWER_REDUNDANCY_INVALID',
            severity: 'error',
            path: 'chassis',
            message: `Redundancy mode ${mode} is invalid for ${psuConstraints.count} PSU(s).`,
        });
        return issues;
    }

    // Error if required power (TDP + 20% overhead) exceeds effective capacity in selected redundancy mode.
    if (requiredPower > effectiveCapacity) {
        issues.push({
            code: 'POWER_REDUNDANCY_EXCEEDED',
            severity: 'error',
            path: 'chassis',
            message: `Required ${requiredPower}W (including 20% overhead) exceeds ${mode} effective capacity ${effectiveCapacity}W.`,
        });
    }

    // Warn if headroom under selected redundancy mode is less than 20%
    const headroom = (effectiveCapacity - requiredPower) / effectiveCapacity;
    if (headroom < 0.2 && requiredPower <= effectiveCapacity) {
        issues.push({
            code: 'POWER_HEADROOM_LOW',
            severity: 'warn',
            path: 'chassis',
            message: `${mode} headroom only ${(headroom * 100).toFixed(1)}% (${requiredPower}W required / ${effectiveCapacity}W effective).`,
        });
    }

    return issues;
};

/**
 * Export power calculation for UI use
 */
export { calculatePower };
