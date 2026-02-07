import type {
    BayInterface,
    Build,
    ControllerCard,
    EccSupport,
    Memory,
    MemoryBuffering,
    MemoryRankDensity,
    NetworkAdapter,
    Node,
    PcieBifurcationMode,
    Storage,
    SwitchPortProfile,
    Transceiver,
} from '../../types/hardware';
import type { ValidationIssue } from './types';

type GraphComponentKind =
    | 'chassis'
    | 'motherboard'
    | 'cpu'
    | 'memory'
    | 'storage'
    | 'controller'
    | 'network-adapter'
    | 'transceiver'
    | 'switch';

interface GraphComponentNode {
    id: string;
    kind: GraphComponentKind;
    path: string;
    nodeIndex?: number;
    value: unknown;
}

class ConstraintGraph {
    private nodes: GraphComponentNode[] = [];

    add(node: GraphComponentNode) {
        this.nodes.push(node);
    }

    all(kind?: GraphComponentKind): GraphComponentNode[] {
        if (!kind) return this.nodes;
        return this.nodes.filter((node) => node.kind === kind);
    }

    byNode(nodeIndex: number, kind: GraphComponentKind): GraphComponentNode[] {
        return this.nodes.filter((node) => node.nodeIndex === nodeIndex && node.kind === kind);
    }
}

const DEFAULT_1U_CPU_TDP_LIMIT_W = 250;
const DEFAULT_MEMORY_PER_CORE_GB = 8;

const inferBuffering = (memory: Memory): MemoryBuffering => {
    if (memory.constraints.buffering) return memory.constraints.buffering;
    if (memory.constraints.type === 'RDIMM') return 'Registered';
    if (memory.constraints.type === 'LRDIMM') return 'LoadReduced';
    return 'Unbuffered';
};

const inferEcc = (memory: Memory): EccSupport => {
    if (memory.constraints.ecc) return memory.constraints.ecc;
    if (memory.constraints.type === 'UDIMM') return 'Non-ECC';
    return 'ECC';
};

const inferRankDensity = (memory: Memory): MemoryRankDensity => {
    if (memory.constraints.rankDensity) return memory.constraints.rankDensity;
    if (memory.constraints.ranks <= 1) return 'SR';
    if (memory.constraints.ranks === 2) return 'DR';
    return 'QR';
};

const toBifurcationSet = (node: Node): Set<PcieBifurcationMode> => {
    const modes = new Set<PcieBifurcationMode>();
    const profiles = node.motherboard?.constraints.pcie.bifurcation ?? [];
    profiles.forEach((profile) => {
        profile.modes.forEach((mode) => modes.add(mode));
    });
    return modes;
};

const inferDrivesPerPort = (iface: BayInterface): number => {
    if (iface === 'NVMe') return 1;
    return 4;
};

const computeScore = (node: Node): { score: number; memoryPerCoreGB: number; targetMemoryPerCoreGB: number } => {
    const totalCores = node.cpus.reduce((sum, cpu) => sum + cpu.cores, 0);
    const totalMemoryGB = node.memory.reduce((sum, dimm) => sum + dimm.constraints.capacityGB, 0);
    const targetMemoryPerCoreGB =
        Math.max(
            DEFAULT_MEMORY_PER_CORE_GB,
            ...node.cpus.map((cpu) => cpu.constraints.recommendedMemoryPerCoreGB ?? DEFAULT_MEMORY_PER_CORE_GB)
        );
    const memoryPerCoreGB = totalCores > 0 ? totalMemoryGB / totalCores : 0;
    const memoryRatioScore = Math.min(memoryPerCoreGB / targetMemoryPerCoreGB, 1) * 70;

    const aggregateSpecInt = node.cpus.reduce((sum, cpu) => sum + (cpu.constraints.specIntRate ?? cpu.cores * 10), 0);
    const memPerSpecInt = aggregateSpecInt > 0 ? totalMemoryGB / aggregateSpecInt : 0;
    const perfScore = Math.min(memPerSpecInt / 0.08, 1) * 30;

    return {
        score: Math.round(Math.min(100, memoryRatioScore + perfScore)),
        memoryPerCoreGB: Number(memoryPerCoreGB.toFixed(2)),
        targetMemoryPerCoreGB,
    };
};

const buildConstraintGraph = (build: Build): ConstraintGraph => {
    const graph = new ConstraintGraph();

    if (build.chassis) {
        graph.add({
            id: 'chassis',
            kind: 'chassis',
            path: 'chassis',
            value: build.chassis,
        });
    }

    build.nodes.forEach((node, nodeIndex) => {
        if (node.motherboard) {
            graph.add({
                id: `node-${nodeIndex}-motherboard`,
                kind: 'motherboard',
                path: `nodes[${nodeIndex}].motherboard`,
                nodeIndex,
                value: node.motherboard,
            });
        }

        node.cpus.forEach((cpu, cpuIndex) => {
            graph.add({
                id: `node-${nodeIndex}-cpu-${cpuIndex}`,
                kind: 'cpu',
                path: `nodes[${nodeIndex}].cpus[${cpuIndex}]`,
                nodeIndex,
                value: cpu,
            });
        });

        node.memory.forEach((memory, memoryIndex) => {
            graph.add({
                id: `node-${nodeIndex}-memory-${memoryIndex}`,
                kind: 'memory',
                path: `nodes[${nodeIndex}].memory[${memoryIndex}]`,
                nodeIndex,
                value: memory,
            });
        });

        node.storage.forEach((storage, storageIndex) => {
            graph.add({
                id: `node-${nodeIndex}-storage-${storageIndex}`,
                kind: 'storage',
                path: `nodes[${nodeIndex}].storage[${storageIndex}]`,
                nodeIndex,
                value: storage,
            });
        });

        (node.controllers ?? []).forEach((controller, controllerIndex) => {
            graph.add({
                id: `node-${nodeIndex}-controller-${controllerIndex}`,
                kind: 'controller',
                path: `nodes[${nodeIndex}].controllers[${controllerIndex}]`,
                nodeIndex,
                value: controller,
            });
        });

        (node.networkAdapters ?? []).forEach((adapter, adapterIndex) => {
            graph.add({
                id: `node-${nodeIndex}-nic-${adapterIndex}`,
                kind: 'network-adapter',
                path: `nodes[${nodeIndex}].networkAdapters[${adapterIndex}]`,
                nodeIndex,
                value: adapter,
            });
        });

        (node.transceivers ?? []).forEach((transceiver, transceiverIndex) => {
            graph.add({
                id: `node-${nodeIndex}-trx-${transceiverIndex}`,
                kind: 'transceiver',
                path: `nodes[${nodeIndex}].transceivers[${transceiverIndex}]`,
                nodeIndex,
                value: transceiver,
            });
        });
    });

    (build.fabricSwitches ?? []).forEach((sw, switchIndex) => {
        graph.add({
            id: `switch-${switchIndex}`,
            kind: 'switch',
            path: `fabricSwitches[${switchIndex}]`,
            value: sw,
        });
    });

    return graph;
};

const evaluateNodeConstraints = (build: Build, graph: ConstraintGraph): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];

    build.nodes.forEach((node, nodeIndex) => {
        if (!node.motherboard) return;
        const motherboard = node.motherboard;

        const cpus = graph.byNode(nodeIndex, 'cpu').map((nodeEntry) => nodeEntry.value as Node['cpus'][number]);
        const memory = graph.byNode(nodeIndex, 'memory').map((nodeEntry) => nodeEntry.value as Memory);
        const storage = graph.byNode(nodeIndex, 'storage').map((nodeEntry) => nodeEntry.value as Storage);
        const controllers = graph.byNode(nodeIndex, 'controller').map((nodeEntry) => nodeEntry.value as ControllerCard);
        const nics = graph.byNode(nodeIndex, 'network-adapter').map((nodeEntry) => nodeEntry.value as NetworkAdapter);
        const transceivers = graph.byNode(nodeIndex, 'transceiver').map((nodeEntry) => nodeEntry.value as Transceiver);

        const cpuCount = cpus.length;
        const moboSocketCapacity = motherboard.constraints.memory.socketsCount;

        if (cpuCount > moboSocketCapacity) {
            issues.push({
                code: 'SOCKET_POPULATION_EXCEEDED',
                severity: 'error',
                path: `nodes[${nodeIndex}].cpus`,
                message: `Configured ${cpuCount} CPU(s), motherboard supports up to ${moboSocketCapacity} socket(s).`,
            });
        }

        if (
            motherboard.constraints.supportedSocketCounts &&
            !motherboard.constraints.supportedSocketCounts.includes(cpuCount as 1 | 2 | 4)
        ) {
            issues.push({
                code: 'MOTHERBOARD_SOCKET_COUNT_UNSUPPORTED',
                severity: 'error',
                path: `nodes[${nodeIndex}].cpus`,
                message: `CPU population ${cpuCount} is unsupported by motherboard socket policy.`,
            });
        }

        cpus.forEach((cpu, cpuIndex) => {
            if (cpu.constraints.supportedSocketCounts && !cpu.constraints.supportedSocketCounts.includes(cpuCount as 1 | 2 | 4)) {
                issues.push({
                    code: 'CPU_SOCKET_COUNT_UNSUPPORTED',
                    severity: 'error',
                    path: `nodes[${nodeIndex}].cpus[${cpuIndex}]`,
                    message: `${cpu.name} does not support ${cpuCount}-socket configurations.`,
                });
            }

            const requiresRegisteredEcc = cpu.constraints.requiresRegisteredEcc === true;
            if (requiresRegisteredEcc && memory.length > 0) {
                memory.forEach((dimm, dimmIndex) => {
                    const buffering = inferBuffering(dimm);
                    const ecc = inferEcc(dimm);
                    if (buffering !== 'Registered' && buffering !== 'LoadReduced') {
                        issues.push({
                            code: 'CPU_REQUIRES_REGISTERED_MEMORY',
                            severity: 'error',
                            path: `nodes[${nodeIndex}].memory[${dimmIndex}]`,
                            message: `${cpu.name} requires Registered/LRDIMM memory.`,
                        });
                    }
                    if (ecc !== 'ECC') {
                        issues.push({
                            code: 'CPU_REQUIRES_ECC_MEMORY',
                            severity: 'error',
                            path: `nodes[${nodeIndex}].memory[${dimmIndex}]`,
                            message: `${cpu.name} requires ECC DIMMs.`,
                        });
                    }
                });

                if (!['EATX', 'SSI-EEB'].includes(motherboard.formFactor)) {
                    issues.push({
                        code: 'CPU_FORM_FACTOR_RESTRICTED',
                        severity: 'error',
                        path: `nodes[${nodeIndex}].motherboard`,
                        message: `${cpu.name} requires E-ATX or SSI-EEB motherboard form factors.`,
                    });
                }
            }

            if (
                cpu.constraints.preferredBoardFormFactors &&
                !cpu.constraints.preferredBoardFormFactors.includes(motherboard.formFactor)
            ) {
                issues.push({
                    code: 'CPU_BOARD_FORM_FACTOR_MISMATCH',
                    severity: 'error',
                    path: `nodes[${nodeIndex}].motherboard`,
                    message: `${cpu.name} expects motherboard form factor: ${cpu.constraints.preferredBoardFormFactors.join(', ')}.`,
                });
            }
        });

        memory.forEach((dimm, dimmIndex) => {
            const buffering = inferBuffering(dimm);
            const ecc = inferEcc(dimm);
            const rankDensity = inferRankDensity(dimm);
            const memRules = motherboard.constraints.memory;

            if (memRules.bufferingSupported && !memRules.bufferingSupported.includes(buffering)) {
                issues.push({
                    code: 'MEMORY_BUFFERING_MISMATCH',
                    severity: 'error',
                    path: `nodes[${nodeIndex}].memory[${dimmIndex}]`,
                    message: `${buffering} DIMM is not supported by motherboard buffering policy.`,
                });
            }

            if (memRules.eccSupport && !memRules.eccSupport.includes(ecc)) {
                issues.push({
                    code: 'MEMORY_ECC_MISMATCH',
                    severity: 'error',
                    path: `nodes[${nodeIndex}].memory[${dimmIndex}]`,
                    message: `${ecc} DIMM is not supported by motherboard ECC policy.`,
                });
            }

            if (memRules.rankDensitySupported && !memRules.rankDensitySupported.includes(rankDensity)) {
                issues.push({
                    code: 'MEMORY_RANK_DENSITY_MISMATCH',
                    severity: 'error',
                    path: `nodes[${nodeIndex}].memory[${dimmIndex}]`,
                    message: `Rank density ${rankDensity} is not supported by motherboard.`,
                });
            }

            if (memRules.voltageRange) {
                const inRange =
                    dimm.constraints.voltage >= memRules.voltageRange.min &&
                    dimm.constraints.voltage <= memRules.voltageRange.max;
                if (!inRange) {
                    issues.push({
                        code: 'MEMORY_VOLTAGE_MISMATCH',
                        severity: 'error',
                        path: `nodes[${nodeIndex}].memory[${dimmIndex}]`,
                        message: `DIMM voltage ${dimm.constraints.voltage}V is outside supported range ${memRules.voltageRange.min}-${memRules.voltageRange.max}V.`,
                    });
                }
            }
        });

        const bifurcationModes = toBifurcationSet(node);
        storage.forEach((drive, driveIndex) => {
            if (drive.constraints.requiredBifurcationMode && !bifurcationModes.has(drive.constraints.requiredBifurcationMode)) {
                issues.push({
                    code: 'PCIE_BIFURCATION_UNSUPPORTED',
                    severity: 'error',
                    path: `nodes[${nodeIndex}].storage[${driveIndex}]`,
                    message: `Drive requires PCIe bifurcation mode ${drive.constraints.requiredBifurcationMode}, which is unavailable on the selected motherboard.`,
                });
            }

            if (drive.constraints.requiredControllerTypes && drive.constraints.requiredControllerTypes.length > 0) {
                const hasMatchingType = controllers.some((controller) =>
                    drive.constraints.requiredControllerTypes?.includes(controller.constraints.type)
                );
                if (!hasMatchingType) {
                    issues.push({
                        code: 'STORAGE_CONTROLLER_TYPE_REQUIRED',
                        severity: 'error',
                        path: `nodes[${nodeIndex}].storage[${driveIndex}]`,
                        message: `Drive requires controller type ${drive.constraints.requiredControllerTypes.join(', ')}.`,
                    });
                }
            }

            if (drive.constraints.requiredControllerConnector) {
                const hasRequiredConnector = controllers.some((controller) =>
                    controller.constraints.ports.some((port) => port.connector === drive.constraints.requiredControllerConnector)
                );
                if (!hasRequiredConnector) {
                    issues.push({
                        code: 'STORAGE_CONTROLLER_CONNECTOR_REQUIRED',
                        severity: 'error',
                        path: `nodes[${nodeIndex}].storage[${driveIndex}]`,
                        message: `Drive requires controller connector ${drive.constraints.requiredControllerConnector}.`,
                    });
                }
            }
        });

        if (build.chassis?.constraints.backplanes && build.chassis.constraints.backplanes.length > 0) {
            const connectorDemand: Record<string, number> = {};

            storage.forEach((drive, driveIndex) => {
                const backplane = build.chassis?.constraints.backplanes?.find(
                    (candidate) =>
                        candidate.bayFormFactor === drive.constraints.formFactor &&
                        candidate.supportedInterfaces.includes(drive.constraints.interface)
                );

                if (!backplane) {
                    issues.push({
                        code: 'BACKPLANE_PATH_MISSING',
                        severity: 'error',
                        path: `nodes[${nodeIndex}].storage[${driveIndex}]`,
                        message: `No compatible backplane path exists for ${drive.constraints.formFactor} ${drive.constraints.interface} drive.`,
                    });
                    return;
                }

                if (drive.constraints.requiredCaddyTypes) {
                    const caddyCompatible = drive.constraints.requiredCaddyTypes.some((type) =>
                        backplane.caddyTypes.includes(type)
                    );
                    if (!caddyCompatible) {
                        issues.push({
                            code: 'CADDY_MISMATCH',
                            severity: 'error',
                            path: `nodes[${nodeIndex}].storage[${driveIndex}]`,
                            message: `Drive caddy requirement does not match chassis backplane caddies.`,
                        });
                    }
                }

                const matchingPath = backplane.pathing.find((p) => p.interface === drive.constraints.interface);
                if (matchingPath) {
                    const drivesPerPort = inferDrivesPerPort(drive.constraints.interface);
                    const key = `${matchingPath.connector}:${drive.constraints.interface}`;
                    connectorDemand[key] = (connectorDemand[key] ?? 0) + (1 / drivesPerPort);
                }
            });

            const connectorSupply: Record<string, number> = {};
            controllers.forEach((controller) => {
                controller.constraints.ports.forEach((port) => {
                    const key = `${port.connector}:${port.interface}`;
                    connectorSupply[key] = (connectorSupply[key] ?? 0) + port.count;
                });
            });

            const totalMaxDrives = controllers.reduce((sum, controller) => sum + (controller.constraints.maxDrives ?? 0), 0);
            if (totalMaxDrives > 0 && storage.length > totalMaxDrives) {
                issues.push({
                    code: 'CONTROLLER_DRIVE_LIMIT_EXCEEDED',
                    severity: 'error',
                    path: `nodes[${nodeIndex}].storage`,
                    message: `Selected controllers support ${totalMaxDrives} drives total, but ${storage.length} drives are configured.`,
                });
            }

            Object.entries(connectorDemand).forEach(([key, demandPortCount]) => {
                const required = Math.ceil(demandPortCount);
                const available = connectorSupply[key] ?? 0;
                if (required > available) {
                    issues.push({
                        code: 'BACKPLANE_CONTROLLER_PORT_SHORTAGE',
                        severity: 'error',
                        path: `nodes[${nodeIndex}].storage`,
                        message: `Backplane path requires ${required} ${key} port(s), but only ${available} are provided by selected HBA/RAID controllers.`,
                    });
                }
            });
        }

        if (nics.length > 0) {
            const ocpSlots = build.chassis?.constraints.nodes[nodeIndex]?.ocp3Slots ?? 0;
            const ocpCards = nics.filter((nic) => nic.constraints.ocp3Compatible === true);
            if (ocpCards.length > ocpSlots) {
                issues.push({
                    code: 'OCP3_SLOT_EXCEEDED',
                    severity: 'error',
                    path: `nodes[${nodeIndex}].networkAdapters`,
                    message: `Selected ${ocpCards.length} OCP 3.0 card(s), but chassis node provides ${ocpSlots} OCP 3.0 slot(s).`,
                });
            }

            const switches = graph.all('switch').map((nodeEntry) => nodeEntry.value as SwitchPortProfile);
            nics.forEach((nic, nicIndex) => {
                nic.constraints.ports.forEach((port) => {
                    if (!nic.constraints.requiresTransceiver) return;
                    const matchingTransceiver = transceivers.find(
                        (trx) =>
                            trx.constraints.connector === port.connector &&
                            trx.constraints.speedGbps === port.speedGbps
                    );
                    if (!matchingTransceiver) {
                        issues.push({
                            code: 'TRANSCEIVER_REQUIRED',
                            severity: 'error',
                            path: `nodes[${nodeIndex}].networkAdapters[${nicIndex}]`,
                            message: `No compatible transceiver selected for ${port.connector} ${port.speedGbps}GbE port.`,
                        });
                        return;
                    }

                    if (switches.length > 0) {
                        const switchCompatible = switches.some((sw) => {
                            const hasPort = sw.ports.some(
                                (swPort) => swPort.connector === port.connector && swPort.speedGbps === port.speedGbps
                            );
                            const mediaSupported = sw.supportedTransceiverMedia.includes(matchingTransceiver.constraints.media);
                            return hasPort && mediaSupported;
                        });

                        if (!switchCompatible) {
                            issues.push({
                                code: 'TRANSCEIVER_SWITCH_MISMATCH',
                                severity: 'error',
                                path: `nodes[${nodeIndex}].transceivers`,
                                message: `Selected transceiver is incompatible with configured switch port profiles.`,
                            });
                        }
                    }
                });
            });
        }

        const { score, memoryPerCoreGB, targetMemoryPerCoreGB } = computeScore(node);
        if (score < 65) {
            issues.push({
                code: 'BALANCED_CONFIGURATION_LOW',
                severity: 'warn',
                path: `nodes[${nodeIndex}]`,
                message: `Balanced Configuration score ${score}/100 (memory/core ${memoryPerCoreGB}GB vs target ${targetMemoryPerCoreGB}GB).`,
            });
        }
    });

    return issues;
};

const evaluateChassisThermals = (build: Build): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];
    if (!build.chassis) return issues;

    if (build.chassis.formFactor !== '1U') return issues;

    const oneULimit =
        build.chassis.constraints.thermal?.maxCpuTdpPerSocketW?.['1U'] ?? DEFAULT_1U_CPU_TDP_LIMIT_W;
    const passiveSockets = new Set(build.chassis.constraints.thermal?.supportsPassiveHeatsinkSockets ?? []);

    build.nodes.forEach((node, nodeIndex) => {
        node.cpus.forEach((cpu, cpuIndex) => {
            if (cpu.constraints.tdpW <= oneULimit) return;
            const passiveSupported = passiveSockets.has(cpu.constraints.socket);
            if (!passiveSupported || cpu.constraints.requiresPassiveHeatsink) {
                issues.push({
                    code: 'THERMAL_1U_CPU_UNSUPPORTED',
                    severity: 'error',
                    path: `nodes[${nodeIndex}].cpus[${cpuIndex}]`,
                    message: `1U chassis thermal policy blocks ${cpu.name} (${cpu.constraints.tdpW}W) without explicit passive heatsink support.`,
                });
            }
        });
    });

    return issues;
};

export function runCompatibilityCheck(build: Build): ValidationIssue[] {
    if (!build.chassis) return [];

    const graph = buildConstraintGraph(build);
    return [...evaluateNodeConstraints(build, graph), ...evaluateChassisThermals(build)];
}
