import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Build, Chassis, Node, Motherboard, CPU, Memory, Storage, NetworkAdapter, ControllerCard } from '../types/hardware';
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

export interface SharedBuildBundle {
    build: Build;
    priceOverrides: Record<string, number>;
    nodeTargets: Record<number, NodePlanningTarget>;
    customCosts: CustomCostItem[];
    shareCode?: string;
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
    addNodeController: (nodeIndex: number, controller: ControllerCard) => void;
    removeNodeController: (nodeIndex: number, controllerIndex: number) => void;
    addNodeNetworkAdapter: (nodeIndex: number, networkAdapter: NetworkAdapter) => void;
    removeNodeNetworkAdapter: (nodeIndex: number, networkAdapterIndex: number) => void;

    // Planner actions
    setPriceOverride: (itemKey: string, price?: number) => void;
    setNodeTarget: (nodeIndex: number, target: Partial<NodePlanningTarget>) => void;
    addCustomCostItem: () => void;
    updateCustomCostItem: (id: string, patch: Partial<Omit<CustomCostItem, 'id'>>) => void;
    removeCustomCostItem: (id: string) => void;

    // Build management
    resetBuild: () => void;
    loadBuild: (build: Build) => void;
    loadSharedBundle: (bundle: SharedBuildBundle) => void;
    setBuildShareCode: (shareCode?: string) => void;
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
    networkAdapters: [],
    controllers: [],
    transceivers: [],
});

const createDefaultNodeTarget = (): NodePlanningTarget => ({
    cores: 0,
    memoryGB: 0,
    storageTB: 0,
});

const createTargetsForNodes = (nodes: Node[]): Record<number, NodePlanningTarget> =>
    Object.fromEntries(nodes.map((node) => [node.index, createDefaultNodeTarget()]));

const normalizeNodeTargets = (
    nodes: Node[],
    rawTargets: unknown
): Record<number, NodePlanningTarget> => {
    const candidate = (rawTargets ?? {}) as Record<string, Partial<NodePlanningTarget> | undefined>;

    return Object.fromEntries(
        nodes.map((node) => {
            const key = String(node.index);
            const raw = candidate[key] ?? {};
            return [
                node.index,
                {
                    cores: Math.max(0, Number(raw?.cores) || 0),
                    memoryGB: Math.max(0, Number(raw?.memoryGB) || 0),
                    storageTB: Math.max(0, Number(raw?.storageTB) || 0),
                },
            ];
        })
    );
};

export const useBuildStore = create<BuildStore>()(persist((set) => ({
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

    addNodeController: (nodeIndex, controller) => set((state) => ({
        build: {
            ...state.build,
            nodes: state.build.nodes.map((node, idx) =>
                idx === nodeIndex
                    ? { ...node, controllers: [...(node.controllers ?? []), controller] }
                    : node
            ),
            updatedAt: new Date().toISOString(),
        },
    })),

    removeNodeController: (nodeIndex, controllerIndex) => set((state) => ({
        build: {
            ...state.build,
            nodes: state.build.nodes.map((node, idx) =>
                idx === nodeIndex
                    ? {
                        ...node,
                        controllers: (node.controllers ?? []).filter((_, i) => i !== controllerIndex),
                    }
                    : node
            ),
            updatedAt: new Date().toISOString(),
        },
    })),

    addNodeNetworkAdapter: (nodeIndex, networkAdapter) => set((state) => ({
        build: {
            ...state.build,
            nodes: state.build.nodes.map((node, idx) =>
                idx === nodeIndex
                    ? { ...node, networkAdapters: [...(node.networkAdapters ?? []), networkAdapter] }
                    : node
            ),
            updatedAt: new Date().toISOString(),
        },
    })),

    removeNodeNetworkAdapter: (nodeIndex, networkAdapterIndex) => set((state) => ({
        build: {
            ...state.build,
            nodes: state.build.nodes.map((node, idx) =>
                idx === nodeIndex
                    ? {
                        ...node,
                        networkAdapters: (node.networkAdapters ?? []).filter((_, i) => i !== networkAdapterIndex),
                    }
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

    loadBuild: (build) => set({
        build,
        nodeTargets: createTargetsForNodes(build.nodes),
        priceOverrides: {},
        customCosts: [],
    }),

    loadSharedBundle: (bundle) => set(() => {
        const build = {
            ...bundle.build,
            shareCode: bundle.shareCode ?? bundle.build.shareCode,
        };
        const nodes = build.nodes ?? [];
        return {
            build,
            priceOverrides: bundle.priceOverrides ?? {},
            customCosts: bundle.customCosts ?? [],
            nodeTargets: normalizeNodeTargets(nodes, bundle.nodeTargets),
        };
    }),

    setBuildShareCode: (shareCode) => set((state) => ({
        build: {
            ...state.build,
            shareCode,
            updatedAt: new Date().toISOString(),
        },
    })),
}), {
    name: 'server-part-picker-build-v1',
    version: 2,
    storage: createJSONStorage(() => localStorage),
    migrate: (persistedState) => {
        const state = persistedState as Partial<BuildStore> | undefined;
        if (!state) return persistedState as BuildStore;

        const build = state.build ?? createEmptyBuild();
        const nodes = build.nodes ?? [];

        return {
            ...state,
            build,
            priceOverrides: state.priceOverrides ?? {},
            customCosts: state.customCosts ?? [],
            nodeTargets: normalizeNodeTargets(nodes, state.nodeTargets),
        } as BuildStore;
    },
    merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<BuildStore> | undefined;
        if (!persisted) return currentState;

        const build = persisted.build ?? currentState.build;
        const nodes = build.nodes ?? [];

        return {
            ...currentState,
            ...persisted,
            build,
            priceOverrides: persisted.priceOverrides ?? currentState.priceOverrides,
            customCosts: persisted.customCosts ?? currentState.customCosts,
            nodeTargets: normalizeNodeTargets(nodes, persisted.nodeTargets),
        };
    },
    partialize: (state) => ({
        build: state.build,
        priceOverrides: state.priceOverrides,
        nodeTargets: state.nodeTargets,
        customCosts: state.customCosts,
    }),
}));
