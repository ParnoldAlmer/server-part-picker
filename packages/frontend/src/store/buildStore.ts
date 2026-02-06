import { create } from 'zustand';
import type { Build, Chassis, Node, Motherboard, CPU, Memory, Storage } from '../types/hardware';
import { v4 as uuidv4 } from 'uuid';

export interface NodePlanningTarget {
    cores: number;
    memoryGB: number;
    storageTB: number;
}

export type PlannerCostCategory = 'Network' | 'Accessories' | 'Service' | 'Other';

export interface CustomCostItem {
    id: string;
    label: string;
    category: PlannerCostCategory;
    quantity: number;
    unitPrice: number;
}

interface BuildStore {
    build: Build;
    priceOverrides: Record<string, number>;
    nodeTargets: Record<number, NodePlanningTarget>;
    customCosts: CustomCostItem[];

    // Chassis actions
    setChassis: (chassis: Chassis) => void;

    // Node actions
    setNodeMotherboard: (nodeIndex: number, motherboard: Motherboard) => void;
    addNodeCPU: (nodeIndex: number, cpu: CPU) => void;
    removeNodeCPU: (nodeIndex: number, cpuIndex: number) => void;
    addNodeMemory: (nodeIndex: number, memory: Memory) => void;
    removeNodeMemory: (nodeIndex: number, memoryIndex: number) => void;
    addNodeStorage: (nodeIndex: number, storage: Storage) => void;
    removeNodeStorage: (nodeIndex: number, storageIndex: number) => void;

    // Planner actions
    setPriceOverride: (itemKey: string, price?: number) => void;
    setNodeTarget: (nodeIndex: number, target: Partial<NodePlanningTarget>) => void;
    addCustomCostItem: () => void;
    updateCustomCostItem: (id: string, patch: Partial<Omit<CustomCostItem, 'id'>>) => void;
    removeCustomCostItem: (id: string) => void;

    // Build management
    resetBuild: () => void;
    loadBuild: (build: Build) => void;
}

const createEmptyBuild = (): Build => ({
    id: uuidv4(),
    schemaVersion: 1,
    catalogVersion: '2026-02-04',
    chassis: null,
    nodes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
});

const createEmptyNode = (index: number): Node => ({
    index,
    motherboard: null,
    cpus: [],
    memory: [],
    storage: [],
});

const createDefaultNodeTarget = (): NodePlanningTarget => ({
    cores: 0,
    memoryGB: 0,
    storageTB: 0,
});

const createTargetsForNodes = (nodes: Node[]): Record<number, NodePlanningTarget> =>
    Object.fromEntries(nodes.map((node) => [node.index, createDefaultNodeTarget()]));

export const useBuildStore = create<BuildStore>((set) => ({
    build: createEmptyBuild(),
    priceOverrides: {},
    nodeTargets: {},
    customCosts: [],

    setChassis: (chassis) => set((state) => {
        // Initialize nodes based on chassis constraints
        const nodes: Node[] = chassis.constraints.nodes.map((nodeConfig) =>
            createEmptyNode(nodeConfig.index)
        );
        const nodeTargets = Object.fromEntries(
            nodes.map((node) => [
                node.index,
                state.nodeTargets[node.index] ?? createDefaultNodeTarget(),
            ])
        );

        return {
            build: {
                ...state.build,
                chassis,
                nodes,
                updatedAt: new Date().toISOString(),
            },
            nodeTargets,
        };
    }),

    setNodeMotherboard: (nodeIndex, motherboard) => set((state) => ({
        build: {
            ...state.build,
            nodes: state.build.nodes.map((node, idx) =>
                idx === nodeIndex ? { ...node, motherboard } : node
            ),
            updatedAt: new Date().toISOString(),
        },
    })),

    addNodeCPU: (nodeIndex, cpu) => set((state) => ({
        build: {
            ...state.build,
            nodes: state.build.nodes.map((node, idx) =>
                idx === nodeIndex ? { ...node, cpus: [...node.cpus, cpu] } : node
            ),
            updatedAt: new Date().toISOString(),
        },
    })),

    removeNodeCPU: (nodeIndex, cpuIndex) => set((state) => ({
        build: {
            ...state.build,
            nodes: state.build.nodes.map((node, idx) =>
                idx === nodeIndex
                    ? { ...node, cpus: node.cpus.filter((_, i) => i !== cpuIndex) }
                    : node
            ),
            updatedAt: new Date().toISOString(),
        },
    })),

    addNodeMemory: (nodeIndex, memory) => set((state) => ({
        build: {
            ...state.build,
            nodes: state.build.nodes.map((node, idx) =>
                idx === nodeIndex ? { ...node, memory: [...node.memory, memory] } : node
            ),
            updatedAt: new Date().toISOString(),
        },
    })),

    removeNodeMemory: (nodeIndex, memoryIndex) => set((state) => ({
        build: {
            ...state.build,
            nodes: state.build.nodes.map((node, idx) =>
                idx === nodeIndex
                    ? { ...node, memory: node.memory.filter((_, i) => i !== memoryIndex) }
                    : node
            ),
            updatedAt: new Date().toISOString(),
        },
    })),

    addNodeStorage: (nodeIndex, storage) => set((state) => ({
        build: {
            ...state.build,
            nodes: state.build.nodes.map((node, idx) =>
                idx === nodeIndex ? { ...node, storage: [...node.storage, storage] } : node
            ),
            updatedAt: new Date().toISOString(),
        },
    })),

    removeNodeStorage: (nodeIndex, storageIndex) => set((state) => ({
        build: {
            ...state.build,
            nodes: state.build.nodes.map((node, idx) =>
                idx === nodeIndex
                    ? { ...node, storage: node.storage.filter((_, i) => i !== storageIndex) }
                    : node
            ),
            updatedAt: new Date().toISOString(),
        },
    })),

    setPriceOverride: (itemKey, price) => set((state) => {
        const nextOverrides = { ...state.priceOverrides };
        if (price === undefined || Number.isNaN(price) || price < 0) {
            delete nextOverrides[itemKey];
        } else {
            nextOverrides[itemKey] = price;
        }

        return {
            priceOverrides: nextOverrides,
            build: {
                ...state.build,
                updatedAt: new Date().toISOString(),
            },
        };
    }),

    setNodeTarget: (nodeIndex, target) => set((state) => ({
        nodeTargets: {
            ...state.nodeTargets,
            [nodeIndex]: {
                ...(state.nodeTargets[nodeIndex] ?? createDefaultNodeTarget()),
                ...target,
            },
        },
        build: {
            ...state.build,
            updatedAt: new Date().toISOString(),
        },
    })),

    addCustomCostItem: () => set((state) => ({
        customCosts: [
            ...state.customCosts,
            {
                id: `custom-cost-${uuidv4()}`,
                label: 'Custom line item',
                category: 'Other',
                quantity: 1,
                unitPrice: 0,
            },
        ],
        build: {
            ...state.build,
            updatedAt: new Date().toISOString(),
        },
    })),

    updateCustomCostItem: (id, patch) => set((state) => ({
        customCosts: state.customCosts.map((item) => (item.id === id ? { ...item, ...patch } : item)),
        build: {
            ...state.build,
            updatedAt: new Date().toISOString(),
        },
    })),

    removeCustomCostItem: (id) => set((state) => ({
        customCosts: state.customCosts.filter((item) => item.id !== id),
        build: {
            ...state.build,
            updatedAt: new Date().toISOString(),
        },
    })),

    resetBuild: () => set({ build: createEmptyBuild(), priceOverrides: {}, nodeTargets: {}, customCosts: [] }),

    loadBuild: (build) => set({ build, nodeTargets: createTargetsForNodes(build.nodes) }),
}));
