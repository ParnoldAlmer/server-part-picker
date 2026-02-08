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

function calculateEffectiveRedundantCount(count: number, mode: PsuRedundancyMode): number {
    if (mode === 'N') {
        return count;
    }
    if (mode === 'N+1') {
        return Math.max(0, count - 1);
    }
    return Math.floor(count / 2);
}

interface PsuCapacitySummary {
    mode: PsuRedundancyMode;
    perNode: boolean;
    nodeCount: number;
    installedCount: number;
    effectiveCount: number;
    nameplateCapacity: number;
    effectiveCapacity: number;
    nodeNameplateCapacity: number;
    nodeEffectiveCapacity: number;
}

function inferPerNodePsu(build: Build): boolean {
    if (!build.chassis) return false;
    const psu = build.chassis.constraints.psu;
    if (psu.perNode !== undefined) return psu.perNode;

    const constraints = build.chassis.constraints;
    const hasMultipleNodes = constraints.nodes.length > 1;
    const hasPerNodeBays = constraints.bays.length > 0 && constraints.bays.every((bay) => bay.perNode === true);

    return hasMultipleNodes && hasPerNodeBays;
}

function calculatePsuCapacitySummary(build: Build): PsuCapacitySummary | null {
    if (!build.chassis) return null;

    const psu = build.chassis.constraints.psu;
    const mode = resolveRedundancyMode(psu);
    const perNode = inferPerNodePsu(build);
    const nodeCount = build.nodes?.length || build.chassis.constraints.nodes.length || 0;
    const domains = perNode ? Math.max(1, nodeCount) : 1;
    const installedCount = psu.count * domains;
    const nodeEffectiveCount = calculateEffectiveRedundantCount(psu.count, mode);
    const effectiveCount = nodeEffectiveCount * domains;

    return {
        mode,
        perNode,
        nodeCount,
        installedCount,
        effectiveCount,
        nameplateCapacity: psu.maxWatts * installedCount,
        effectiveCapacity: psu.maxWatts * effectiveCount,
        nodeNameplateCapacity: psu.maxWatts * psu.count,
        nodeEffectiveCapacity: psu.maxWatts * nodeEffectiveCount,
    };
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
    const psuCapacity = calculatePsuCapacitySummary(build);
    if (!psuCapacity) return issues;

    const mode = psuCapacity.mode;
    const nameplateCapacity = psuCapacity.nameplateCapacity;
    const effectiveCapacity = psuCapacity.effectiveCapacity;
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

    if (effectiveCapacity <= 0 || psuConstraints.count <= 0) {
        issues.push({
            code: 'POWER_REDUNDANCY_INVALID',
            severity: 'error',
            path: 'chassis',
            message: `Redundancy mode ${mode} is invalid for ${psuConstraints.count} PSU(s)${psuCapacity.perNode ? ' per node' : ''}.`,
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

    if (psuCapacity.perNode) {
        for (let nodeIndex = 0; nodeIndex < build.nodes.length; nodeIndex += 1) {
            const node = build.nodes[nodeIndex];
            const nodeBuild: Build = {
                ...build,
                nodes: [node],
            };
            const nodePower = calculatePower(nodeBuild);
            const nodeRequiredPower = calculateRequiredPower(nodePower);

            if (nodePower > psuCapacity.nodeNameplateCapacity) {
                issues.push({
                    code: 'POWER_NODE_EXCEEDED',
                    severity: 'error',
                    path: `nodes[${nodeIndex}]`,
                    message: `Node ${nodeIndex + 1} uses ${nodePower}W, exceeding node PSU capacity ${psuCapacity.nodeNameplateCapacity}W.`,
                });
            }

            if (nodeRequiredPower > psuCapacity.nodeEffectiveCapacity) {
                issues.push({
                    code: 'POWER_NODE_REDUNDANCY_EXCEEDED',
                    severity: 'error',
                    path: `nodes[${nodeIndex}]`,
                    message: `Node ${nodeIndex + 1} requires ${nodeRequiredPower}W (including 20% overhead), exceeding ${mode} node effective capacity ${psuCapacity.nodeEffectiveCapacity}W.`,
                });
            }
        }
    }

    return issues;
};

/**
 * Export power calculation for UI use
 */
export { calculatePower, calculatePsuCapacitySummary };
