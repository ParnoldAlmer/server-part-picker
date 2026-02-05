import { create } from 'zustand';
import type { Build, Chassis, Node, Motherboard, CPU, Memory, Storage } from '../types/hardware';
import { v4 as uuidv4 } from 'uuid';

interface BuildStore {
    build: Build;

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

export const useBuildStore = create<BuildStore>((set) => ({
    build: createEmptyBuild(),

    setChassis: (chassis) => set((state) => {
        // Initialize nodes based on chassis constraints
        const nodes: Node[] = chassis.constraints.nodes.map((nodeConfig) =>
            createEmptyNode(nodeConfig.index)
        );

        return {
            build: {
                ...state.build,
                chassis,
                nodes,
                updatedAt: new Date().toISOString(),
            },
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

    resetBuild: () => set({ build: createEmptyBuild() }),

    loadBuild: (build) => set({ build }),
}));
