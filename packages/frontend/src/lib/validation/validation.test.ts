import { describe, it, expect } from 'vitest';
import { socketRule } from './rules/socketRule';
import { memoryTypeRule } from './rules/memoryTypeRule';
import { bayLimitRule } from './rules/bayLimitRule';
import { powerRule } from './rules/powerRule';
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
                        socketCount: 1,
                        constraints: {
                            socket: 'SP5',
                            mem: { ddrGen: 5, types: ['RDIMM'], slots: 12, maxPerDimmGB: 128, maxTotalGB: 1536, channels: 12 },
                            pcie: { gen: 5, lanes: 128, slots: [] },
                            storageHeaders: [],
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
                        socketCount: 1,
                        constraints: {
                            socket: 'SP5',
                            mem: { ddrGen: 5, types: ['RDIMM'], slots: 12, maxPerDimmGB: 128, maxTotalGB: 1536, channels: 12 },
                            pcie: { gen: 5, lanes: 128, slots: [] },
                            storageHeaders: [],
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
                        socketCount: 1,
                        constraints: {
                            socket: 'SP5',
                            mem: { ddrGen: 5, types: ['RDIMM'], slots: 12, maxPerDimmGB: 128, maxTotalGB: 1536, channels: 12 },
                            pcie: { gen: 5, lanes: 128, slots: [] },
                            storageHeaders: [],
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
                        socketCount: 1,
                        constraints: {
                            socket: 'SP5',
                            mem: { ddrGen: 5, types: ['RDIMM', 'LRDIMM'], slots: 12, maxPerDimmGB: 128, maxTotalGB: 1536, channels: 12 },
                            pcie: { gen: 5, lanes: 128, slots: [] },
                            storageHeaders: [],
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
                    bays: [{ type: 'SFF', count: 4, interface: 'NVMe', hotSwap: true }],
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
                            formFactor: 'SFF' as const,
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
                                tdpW: 420,
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
});
