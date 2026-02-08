import { describe, it, expect } from 'vitest';
import { socketRule } from './rules/socketRule';
import { memoryTypeRule } from './rules/memoryTypeRule';
import { bayLimitRule } from './rules/bayLimitRule';
import { powerRule } from './rules/powerRule';
import { compatibilityGraphRule } from './rules/compatibilityGraphRule';
import type { Build } from '../../types/hardware';

// Test data helpers
const createTestBuild = (overrides: Partial<Build> = {}): Build => ({
    id: 'test-build',
    schemaVersion: 1,
    catalogVersion: '2026-02-04',
    chassis: null,
    nodes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
});

describe('Socket Rule', () => {
    it('should fail when Intel CPU is on AMD motherboard', () => {
        const build = createTestBuild({
            nodes: [
                {
                    index: 0,
                    motherboard: {
                        id: 'mobo-1',
                        sku: 'TEST-MOBO',
                        vendor: 'Test',
                        name: 'AMD SP5 Board',
                        formFactor: 'EATX',

                        constraints: {
                            socket: 'SP5',
                            memory: { ddrGen: 5, dimmTypes: ['RDIMM'], channelsPerSocket: 12, dimmsPerChannel: 1, socketsCount: 1, maxPerDimmGB: 128, maxTotalGB: 1536 },
                            pcie: { gen: 5, lanes: 128, slots: [] },
                            storage: { headers: [], onboardSlots: [] },
                        },
                    },
                    cpus: [
                        {
                            id: 'cpu-1',
                            sku: 'INTEL-TEST',
                            vendor: 'Intel',
                            name: 'Test Intel CPU',
                            family: 'Test',
                            platform: 'Intel',
                            cores: 64,
                            threads: 128,
                            baseClock: 2.0,
                            constraints: {
                                socket: 'LGA4677',
                                memGenSupported: [5],
                                tdpW: 350,
                                maxMemSpeedMT: 4800,
                                lanes: 80,
                            },
                        },
                    ],
                    memory: [],
                    storage: [],
                },
            ],
        });

        const issues = socketRule(build);
        expect(issues).toHaveLength(1);
        expect(issues[0].code).toBe('SOCKET_MISMATCH');
        expect(issues[0].severity).toBe('error');
    });

    it('should pass when CPU socket matches motherboard socket', () => {
        const build = createTestBuild({
            nodes: [
                {
                    index: 0,
                    motherboard: {
                        id: 'mobo-1',
                        sku: 'TEST-MOBO',
                        vendor: 'Test',
                        name: 'AMD SP5 Board',
                        formFactor: 'EATX',

                        constraints: {
                            socket: 'SP5',
                            memory: { ddrGen: 5, dimmTypes: ['RDIMM'], channelsPerSocket: 12, dimmsPerChannel: 1, socketsCount: 1, maxPerDimmGB: 128, maxTotalGB: 1536 },
                            pcie: { gen: 5, lanes: 128, slots: [] },
                            storage: { headers: [], onboardSlots: [] },
                        },
                    },
                    cpus: [
                        {
                            id: 'cpu-1',
                            sku: 'AMD-TEST',
                            vendor: 'AMD',
                            name: 'Test AMD CPU',
                            family: 'Test',
                            platform: 'AMD',
                            cores: 96,
                            threads: 192,
                            baseClock: 2.4,
                            constraints: {
                                socket: 'SP5',
                                memGenSupported: [5],
                                tdpW: 360,
                                maxMemSpeedMT: 4800,
                                lanes: 128,
                            },
                        },
                    ],
                    memory: [],
                    storage: [],
                },
            ],
        });

        const issues = socketRule(build);
        expect(issues).toHaveLength(0);
    });
});

describe('Memory Type Rule', () => {
    it('should fail when DDR4 memory is used on DDR5-only motherboard', () => {
        const build = createTestBuild({
            nodes: [
                {
                    index: 0,
                    motherboard: {
                        id: 'mobo-1',
                        sku: 'TEST-MOBO',
                        vendor: 'Test',
                        name: 'DDR5 Board',
                        formFactor: 'EATX',
                        constraints: {
                            socket: 'SP5',
                            memory: { ddrGen: 5, dimmTypes: ['RDIMM'], channelsPerSocket: 12, dimmsPerChannel: 1, socketsCount: 1, maxPerDimmGB: 128, maxTotalGB: 1536 },
                            pcie: { gen: 5, lanes: 128, slots: [] },
                            storage: { headers: [], onboardSlots: [] },
                        },
                    },
                    cpus: [],
                    memory: [
                        {
                            id: 'mem-1',
                            sku: 'TEST-DDR4',
                            vendor: 'Test',
                            name: 'DDR4 DIMM',
                            constraints: {
                                ddrGen: 4,
                                type: 'RDIMM',
                                speedMT: 3200,
                                capacityGB: 32,
                                ranks: 2,
                                voltage: 1.2,
                            },
                        },
                    ],
                    storage: [],
                },
            ],
        });

        const issues = memoryTypeRule(build);
        expect(issues.length).toBeGreaterThan(0);
        expect(issues[0].code).toBe('MEMORY_DDR_MISMATCH');
    });

    it('should fail when mixing RDIMM and LRDIMM', () => {
        const build = createTestBuild({
            nodes: [
                {
                    index: 0,
                    motherboard: {
                        id: 'mobo-1',
                        sku: 'TEST-MOBO',
                        vendor: 'Test',
                        name: 'DDR5 Board',
                        formFactor: 'EATX',
                        constraints: {
                            socket: 'SP5',
                            memory: { ddrGen: 5, dimmTypes: ['RDIMM', 'LRDIMM'], channelsPerSocket: 12, dimmsPerChannel: 1, socketsCount: 1, maxPerDimmGB: 128, maxTotalGB: 1536 },
                            pcie: { gen: 5, lanes: 128, slots: [] },
                            storage: { headers: [], onboardSlots: [] },
                        },
                    },
                    cpus: [],
                    memory: [
                        {
                            id: 'mem-1',
                            sku: 'TEST-RDIMM',
                            vendor: 'Test',
                            name: 'DDR5 RDIMM',
                            constraints: {
                                ddrGen: 5,
                                type: 'RDIMM',
                                speedMT: 4800,
                                capacityGB: 64,
                                ranks: 2,
                                voltage: 1.1,
                            },
                        },
                        {
                            id: 'mem-2',
                            sku: 'TEST-LRDIMM',
                            vendor: 'Test',
                            name: 'DDR5 LRDIMM',
                            constraints: {
                                ddrGen: 5,
                                type: 'LRDIMM',
                                speedMT: 4800,
                                capacityGB: 128,
                                ranks: 4,
                                voltage: 1.1,
                            },
                        },
                    ],
                    storage: [],
                },
            ],
        });

        const issues = memoryTypeRule(build);
        const mixedIssue = issues.find((i) => i.code === 'MEMORY_TYPE_MIXED');
        expect(mixedIssue).toBeDefined();
    });
});

describe('Bay Limit Rule', () => {
    it('should fail when storage exceeds chassis bay limit', () => {
        const build = createTestBuild({
            chassis: {
                id: 'chassis-1',
                sku: 'TEST-CHASSIS',
                vendor: 'Test',
                name: 'Test Chassis',
                formFactor: '2U',
                constraints: {
                    nodes: [{ index: 0, moboFormFactors: ['EATX'], cpuCount: 2 }],
                    bays: [{ formFactor: '2.5"', count: 4, interface: 'NVMe', hotSwap: true }],
                    psu: { maxWatts: 2000, count: 2, redundancy: true },
                },
            },
            nodes: [
                {
                    index: 0,
                    motherboard: null,
                    cpus: [],
                    memory: [],
                    storage: Array(6).fill(null).map((_, i) => ({
                        id: `storage-${i}`,
                        sku: 'TEST-SSD',
                        vendor: 'Test',
                        name: 'Test SSD',
                        type: 'NVMe' as const,
                        constraints: {
                            formFactor: '2.5"' as const,
                            interface: 'NVMe' as const,
                            capacityTB: 1,
                            tdpW: 8,
                        },
                    })),
                },
            ],
        });

        const issues = bayLimitRule(build);
        expect(issues.length).toBeGreaterThan(0);
        expect(issues[0].code).toBe('BAY_LIMIT_EXCEEDED');
    });

    it('allows up to count drives per node when bay group is marked perNode', () => {
        const build = createTestBuild({
            chassis: {
                id: 'chassis-1',
                sku: 'TEST-CHASSIS',
                vendor: 'Test',
                name: 'Test Chassis',
                formFactor: '2U',
                constraints: {
                    nodes: [
                        { index: 0, moboFormFactors: ['EATX'], cpuCount: 2 },
                        { index: 1, moboFormFactors: ['EATX'], cpuCount: 2 },
                    ],
                    bays: [{ formFactor: '2.5"', count: 6, interface: 'NVMe', hotSwap: true, perNode: true }],
                    psu: { maxWatts: 2000, count: 2, redundancy: true },
                },
            },
            nodes: [
                {
                    index: 0,
                    motherboard: null,
                    cpus: [],
                    memory: [],
                    storage: Array(6).fill(null).map((_, i) => ({
                        id: `node0-storage-${i}`,
                        sku: 'TEST-SSD',
                        vendor: 'Test',
                        name: 'Test SSD',
                        type: 'NVMe' as const,
                        constraints: {
                            formFactor: '2.5"' as const,
                            interface: 'NVMe' as const,
                            capacityTB: 1,
                            tdpW: 8,
                        },
                    })),
                },
                {
                    index: 1,
                    motherboard: null,
                    cpus: [],
                    memory: [],
                    storage: [],
                },
            ],
        });

        const issues = bayLimitRule(build);
        expect(issues.find((i) => i.code === 'BAY_LIMIT_EXCEEDED')).toBeUndefined();
        expect(issues.find((i) => i.code === 'BAY_PER_NODE_EXCEEDED')).toBeUndefined();
    });

    it('fails when a node exceeds per-node bay count for perNode bay groups', () => {
        const build = createTestBuild({
            chassis: {
                id: 'chassis-1',
                sku: 'TEST-CHASSIS',
                vendor: 'Test',
                name: 'Test Chassis',
                formFactor: '2U',
                constraints: {
                    nodes: [
                        { index: 0, moboFormFactors: ['EATX'], cpuCount: 2 },
                        { index: 1, moboFormFactors: ['EATX'], cpuCount: 2 },
                    ],
                    bays: [{ formFactor: '2.5"', count: 6, interface: 'NVMe', hotSwap: true, perNode: true }],
                    psu: { maxWatts: 2000, count: 2, redundancy: true },
                },
            },
            nodes: [
                {
                    index: 0,
                    motherboard: null,
                    cpus: [],
                    memory: [],
                    storage: Array(7).fill(null).map((_, i) => ({
                        id: `node0-storage-${i}`,
                        sku: 'TEST-SSD',
                        vendor: 'Test',
                        name: 'Test SSD',
                        type: 'NVMe' as const,
                        constraints: {
                            formFactor: '2.5"' as const,
                            interface: 'NVMe' as const,
                            capacityTB: 1,
                            tdpW: 8,
                        },
                    })),
                },
                {
                    index: 1,
                    motherboard: null,
                    cpus: [],
                    memory: [],
                    storage: [],
                },
            ],
        });

        const issues = bayLimitRule(build);
        const perNodeIssue = issues.find((i) => i.code === 'BAY_PER_NODE_EXCEEDED');
        expect(perNodeIssue).toBeDefined();
        expect(perNodeIssue?.message).toContain('exceeds 6 per-node limit');
    });
});

describe('Power Rule', () => {
    it('should fail when power exceeds PSU capacity', () => {
        const build = createTestBuild({
            chassis: {
                id: 'chassis-1',
                sku: 'TEST-CHASSIS',
                vendor: 'Test',
                name: 'Test Chassis',
                formFactor: '2U',
                constraints: {
                    nodes: [{ index: 0, moboFormFactors: ['EATX'], cpuCount: 2 }],
                    bays: [],
                    psu: { maxWatts: 500, count: 1, redundancy: false },
                },
            },
            nodes: [
                {
                    index: 0,
                    motherboard: null,
                    cpus: [
                        {
                            id: 'cpu-1',
                            sku: 'TEST-CPU',
                            vendor: 'Test',
                            name: 'High TDP CPU',
                            family: 'Test',
                            platform: 'Intel',
                            cores: 128,
                            threads: 256,
                            baseClock: 2.0,
                            constraints: {
                                socket: 'LGA4677',
                                memGenSupported: [5],
                                tdpW: 600,
                                maxMemSpeedMT: 4800,
                                lanes: 80,
                            },
                        },
                    ],
                    memory: [],
                    storage: [],
                },
            ],
        });

        const issues = powerRule(build);
        expect(issues.length).toBeGreaterThan(0);
        const powerExceeded = issues.find((i) => i.code === 'POWER_EXCEEDED');
        expect(powerExceeded).toBeDefined();
    });

    it('should warn when power headroom is low', () => {
        const build = createTestBuild({
            chassis: {
                id: 'chassis-1',
                sku: 'TEST-CHASSIS',
                vendor: 'Test',
                name: 'Test Chassis',
                formFactor: '2U',
                constraints: {
                    nodes: [{ index: 0, moboFormFactors: ['EATX'], cpuCount: 1 }],
                    bays: [],
                    psu: { maxWatts: 500, count: 1, redundancy: false },
                },
            },
            nodes: [
                {
                    index: 0,
                    motherboard: null,
                    cpus: [
                        {
                            id: 'cpu-1',
                            sku: 'TEST-CPU',
                            vendor: 'Test',
                            name: 'Medium TDP CPU',
                            family: 'Test',
                            platform: 'Intel',
                            cores: 64,
                            threads: 128,
                            baseClock: 2.0,
                            constraints: {
                                socket: 'LGA4677',
                                memGenSupported: [5],
                                tdpW: 340,
                                maxMemSpeedMT: 4800,
                                lanes: 80,
                            },
                        },
                    ],
                    memory: [],
                    storage: [],
                },
            ],
        });

        const issues = powerRule(build);
        const headroomWarning = issues.find((i) => i.code === 'POWER_HEADROOM_LOW');
        expect(headroomWarning).toBeDefined();
        expect(headroomWarning?.severity).toBe('warn');
    });

    it('should scale PSU capacity by node count when PSU count is per node', () => {
        const build = createTestBuild({
            chassis: {
                id: 'chassis-1',
                sku: 'TEST-CHASSIS',
                vendor: 'Test',
                name: 'Dual Node Chassis',
                formFactor: '2U',
                constraints: {
                    nodes: [
                        { index: 0, moboFormFactors: ['EATX'], cpuCount: 1 },
                        { index: 1, moboFormFactors: ['EATX'], cpuCount: 1 },
                    ],
                    bays: [],
                    psu: { maxWatts: 800, count: 2, redundancy: false, perNode: true },
                },
            },
            nodes: [
                {
                    index: 0,
                    motherboard: null,
                    cpus: [
                        {
                            id: 'cpu-1',
                            sku: 'TEST-CPU-1',
                            vendor: 'Test',
                            name: 'Node CPU A',
                            family: 'Test',
                            platform: 'Intel',
                            cores: 32,
                            threads: 64,
                            baseClock: 2.0,
                            constraints: {
                                socket: 'LGA4677',
                                memGenSupported: [5],
                                tdpW: 700,
                                maxMemSpeedMT: 4800,
                                lanes: 80,
                            },
                        },
                    ],
                    memory: [],
                    storage: [],
                },
                {
                    index: 1,
                    motherboard: null,
                    cpus: [
                        {
                            id: 'cpu-2',
                            sku: 'TEST-CPU-2',
                            vendor: 'Test',
                            name: 'Node CPU B',
                            family: 'Test',
                            platform: 'Intel',
                            cores: 32,
                            threads: 64,
                            baseClock: 2.0,
                            constraints: {
                                socket: 'LGA4677',
                                memGenSupported: [5],
                                tdpW: 700,
                                maxMemSpeedMT: 4800,
                                lanes: 80,
                            },
                        },
                    ],
                    memory: [],
                    storage: [],
                },
            ],
        });

        const issues = powerRule(build);
        expect(issues.some((i) => i.code === 'POWER_EXCEEDED')).toBe(false);
    });

    it('should fail when an individual node exceeds per-node PSU capacity', () => {
        const build = createTestBuild({
            chassis: {
                id: 'chassis-1',
                sku: 'TEST-CHASSIS',
                vendor: 'Test',
                name: 'Dual Node Chassis',
                formFactor: '2U',
                constraints: {
                    nodes: [
                        { index: 0, moboFormFactors: ['EATX'], cpuCount: 1 },
                        { index: 1, moboFormFactors: ['EATX'], cpuCount: 1 },
                    ],
                    bays: [],
                    psu: { maxWatts: 800, count: 2, redundancy: false, perNode: true },
                },
            },
            nodes: [
                {
                    index: 0,
                    motherboard: null,
                    cpus: [
                        {
                            id: 'cpu-1',
                            sku: 'TEST-CPU-1',
                            vendor: 'Test',
                            name: 'Oversized CPU',
                            family: 'Test',
                            platform: 'Intel',
                            cores: 32,
                            threads: 64,
                            baseClock: 2.0,
                            constraints: {
                                socket: 'LGA4677',
                                memGenSupported: [5],
                                tdpW: 1700,
                                maxMemSpeedMT: 4800,
                                lanes: 80,
                            },
                        },
                    ],
                    memory: [],
                    storage: [],
                },
                {
                    index: 1,
                    motherboard: null,
                    cpus: [],
                    memory: [],
                    storage: [],
                },
            ],
        });

        const issues = powerRule(build);
        expect(issues.some((i) => i.code === 'POWER_NODE_EXCEEDED')).toBe(true);
    });

    it('should infer per-node PSU for legacy multi-node chassis with per-node bays', () => {
        const build = createTestBuild({
            chassis: {
                id: 'chassis-legacy',
                sku: 'TEST-LEGACY',
                vendor: 'Test',
                name: 'Legacy Multi-Node Chassis',
                formFactor: '2U',
                constraints: {
                    nodes: [
                        { index: 0, moboFormFactors: ['EATX'], cpuCount: 1 },
                        { index: 1, moboFormFactors: ['EATX'], cpuCount: 1 },
                    ],
                    bays: [{ formFactor: '2.5"', count: 6, interface: 'NVMe', hotSwap: true, perNode: true }],
                    psu: { maxWatts: 800, count: 2, redundancy: true },
                },
            },
            nodes: [
                {
                    index: 0,
                    motherboard: null,
                    cpus: [
                        {
                            id: 'cpu-a',
                            sku: 'CPU-A',
                            vendor: 'Test',
                            name: 'CPU A',
                            family: 'Test',
                            platform: 'Intel',
                            cores: 32,
                            threads: 64,
                            baseClock: 2.0,
                            constraints: {
                                socket: 'LGA4677',
                                memGenSupported: [5],
                                tdpW: 240,
                                maxMemSpeedMT: 4800,
                                lanes: 80,
                            },
                        },
                    ],
                    memory: [],
                    storage: [],
                },
                {
                    index: 1,
                    motherboard: null,
                    cpus: [
                        {
                            id: 'cpu-b',
                            sku: 'CPU-B',
                            vendor: 'Test',
                            name: 'CPU B',
                            family: 'Test',
                            platform: 'Intel',
                            cores: 32,
                            threads: 64,
                            baseClock: 2.0,
                            constraints: {
                                socket: 'LGA4677',
                                memGenSupported: [5],
                                tdpW: 240,
                                maxMemSpeedMT: 4800,
                                lanes: 80,
                            },
                        },
                    ],
                    memory: [],
                    storage: [],
                },
            ],
        });

        const issues = powerRule(build);
        expect(issues.some((i) => i.code === 'POWER_HEADROOM_LOW')).toBe(false);
    });
});

describe('Compatibility Graph Rule', () => {
    it('enforces registered ECC memory and E-ATX/SSI-EEB form factor for constrained CPUs', () => {
        const build = createTestBuild({
            chassis: {
                id: 'chassis-compat-1',
                sku: 'CHASSIS-COMPAT-1',
                vendor: 'Test',
                name: 'Test Chassis',
                formFactor: '2U',
                constraints: {
                    nodes: [{ index: 0, moboFormFactors: ['ATX', 'EATX', 'SSI-EEB'], cpuCount: 2 }],
                    bays: [],
                    psu: { maxWatts: 1600, count: 2, redundancy: true, redundancyMode: 'N+1' },
                },
            },
            nodes: [
                {
                    index: 0,
                    motherboard: {
                        id: 'mobo-compat-1',
                        sku: 'MOBO-COMPAT-1',
                        vendor: 'Test',
                        name: 'ATX board',
                        formFactor: 'ATX',
                        constraints: {
                            socket: 'SP5',
                            memory: {
                                ddrGen: 5,
                                dimmTypes: ['RDIMM', 'UDIMM'],
                                socketsCount: 2,
                                channelsPerSocket: 12,
                                dimmsPerChannel: 1,
                                maxPerDimmGB: 128,
                                maxTotalGB: 3072,
                            },
                            pcie: { gen: 5, lanes: 128, slots: [] },
                            storage: { headers: [], onboardSlots: [] },
                        },
                    },
                    cpus: [
                        {
                            id: 'cpu-compat-1',
                            sku: 'CPU-COMPAT-1',
                            vendor: 'Test',
                            name: 'CPU X',
                            family: 'ServerX',
                            platform: 'AMD',
                            cores: 64,
                            threads: 128,
                            baseClock: 2.4,
                            constraints: {
                                socket: 'SP5',
                                supportedSocketCounts: [2],
                                memGenSupported: [5],
                                tdpW: 360,
                                maxMemSpeedMT: 4800,
                                lanes: 128,
                                requiresRegisteredEcc: true,
                            },
                        },
                    ],
                    memory: [
                        {
                            id: 'mem-compat-1',
                            sku: 'MEM-COMPAT-1',
                            vendor: 'Test',
                            name: 'UDIMM 32GB',
                            constraints: {
                                ddrGen: 5,
                                type: 'UDIMM',
                                buffering: 'Unbuffered',
                                ecc: 'Non-ECC',
                                speedMT: 5600,
                                capacityGB: 32,
                                ranks: 2,
                                rankDensity: 'DR',
                                voltage: 1.1,
                            },
                        },
                    ],
                    storage: [],
                },
            ],
        });

        const issues = compatibilityGraphRule(build);
        expect(issues.some((issue) => issue.code === 'CPU_REQUIRES_REGISTERED_MEMORY')).toBe(true);
        expect(issues.some((issue) => issue.code === 'CPU_REQUIRES_ECC_MEMORY')).toBe(true);
        expect(issues.some((issue) => issue.code === 'CPU_FORM_FACTOR_RESTRICTED')).toBe(true);
    });

    it('validates backplane controller port pathing', () => {
        const build = createTestBuild({
            chassis: {
                id: 'chassis-compat-2',
                sku: 'CHASSIS-COMPAT-2',
                vendor: 'Test',
                name: 'Backplane Chassis',
                formFactor: '2U',
                constraints: {
                    nodes: [{ index: 0, moboFormFactors: ['EATX'], cpuCount: 2 }],
                    bays: [{ formFactor: '2.5"', count: 8, interface: 'SAS', hotSwap: true }],
                    psu: { maxWatts: 1200, count: 2, redundancy: true, redundancyMode: 'N+1' },
                    backplanes: [
                        {
                            id: 'bp-1',
                            name: '8x2.5 SAS',
                            bayFormFactor: '2.5"',
                            bayCount: 8,
                            caddyTypes: ['2.5-sas-caddy'],
                            supportedInterfaces: ['SAS'],
                            pathing: [
                                {
                                    interface: 'SAS',
                                    connector: 'SFF-8643',
                                    ports: 2,
                                    lanesPerPort: 4,
                                },
                            ],
                            compatibleControllerTypes: ['HBA', 'RAID'],
                        },
                    ],
                },
            },
            nodes: [
                {
                    index: 0,
                    motherboard: {
                        id: 'mobo-compat-2',
                        sku: 'MOBO-COMPAT-2',
                        vendor: 'Test',
                        name: 'EATX board',
                        formFactor: 'EATX',
                        constraints: {
                            socket: 'SP5',
                            memory: {
                                ddrGen: 5,
                                dimmTypes: ['RDIMM'],
                                socketsCount: 2,
                                channelsPerSocket: 12,
                                dimmsPerChannel: 1,
                                maxPerDimmGB: 128,
                                maxTotalGB: 3072,
                            },
                            pcie: { gen: 5, lanes: 128, slots: [] },
                            storage: { headers: [], onboardSlots: [] },
                        },
                    },
                    cpus: [],
                    memory: [],
                    storage: Array(8)
                        .fill(null)
                        .map((_, idx) => ({
                            id: `drive-${idx}`,
                            sku: `DRIVE-${idx}`,
                            vendor: 'Test',
                            name: `SAS Drive ${idx}`,
                            type: 'HDD' as const,
                            constraints: {
                                formFactor: '2.5"' as const,
                                interface: 'SAS' as const,
                                capacityTB: 2,
                                tdpW: 10,
                            },
                        })),
                    controllers: [
                        {
                            id: 'ctrl-1',
                            sku: 'CTRL-1',
                            vendor: 'Test',
                            name: 'Single-port HBA',
                            constraints: {
                                type: 'HBA',
                                pcieGen: 4,
                                pcieLanes: 8,
                                ports: [
                                    {
                                        connector: 'SFF-8643',
                                        count: 1,
                                        lanesPerPort: 4,
                                        interface: 'SAS',
                                    },
                                ],
                            },
                        },
                    ],
                },
            ],
        });

        const issues = compatibilityGraphRule(build);
        expect(issues.some((issue) => issue.code === 'BACKPLANE_CONTROLLER_PORT_SHORTAGE')).toBe(true);
    });

    it('enforces OCP 3.0 slot limits per node', () => {
        const build = createTestBuild({
            chassis: {
                id: 'chassis-compat-ocp',
                sku: 'CHASSIS-COMPAT-OCP',
                vendor: 'Test',
                name: 'OCP Chassis',
                formFactor: '2U',
                constraints: {
                    nodes: [{ index: 0, moboFormFactors: ['EATX'], cpuCount: 2, ocp3Slots: 1 }],
                    bays: [],
                    psu: { maxWatts: 1200, count: 2, redundancy: true, redundancyMode: 'N+1' },
                },
            },
            nodes: [
                {
                    index: 0,
                    motherboard: {
                        id: 'mobo-compat-ocp',
                        sku: 'MOBO-COMPAT-OCP',
                        vendor: 'Test',
                        name: 'EATX board',
                        formFactor: 'EATX',
                        constraints: {
                            socket: 'SP5',
                            memory: {
                                ddrGen: 5,
                                dimmTypes: ['RDIMM'],
                                socketsCount: 2,
                                channelsPerSocket: 12,
                                dimmsPerChannel: 1,
                                maxPerDimmGB: 128,
                                maxTotalGB: 3072,
                            },
                            pcie: { gen: 5, lanes: 128, slots: [] },
                            storage: { headers: [], onboardSlots: [] },
                        },
                    },
                    cpus: [],
                    memory: [],
                    storage: [],
                    networkAdapters: [
                        {
                            id: 'nic-ocp-1',
                            sku: 'NIC-OCP-1',
                            vendor: 'Test',
                            name: 'OCP NIC 1',
                            constraints: {
                                ports: [{ connector: 'SFP28', speedGbps: 25, count: 2 }],
                                ocp3Compatible: true,
                                requiresTransceiver: false,
                            },
                        },
                        {
                            id: 'nic-ocp-2',
                            sku: 'NIC-OCP-2',
                            vendor: 'Test',
                            name: 'OCP NIC 2',
                            constraints: {
                                ports: [{ connector: 'SFP28', speedGbps: 25, count: 2 }],
                                ocp3Compatible: true,
                                requiresTransceiver: false,
                            },
                        },
                    ],
                },
            ],
        });

        const issues = compatibilityGraphRule(build);
        expect(issues.some((issue) => issue.code === 'OCP3_SLOT_EXCEEDED')).toBe(true);
    });
});
