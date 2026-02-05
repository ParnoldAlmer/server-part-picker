// Core socket types for compatibility matching
export type SocketType =
    | "LGA4677"   // Intel Xeon 4th/5th Gen (Sapphire/Emerald Rapids)
    | "SP5"       // AMD EPYC 4th Gen (Genoa/Bergamo)
    | "LGA4094"   // AMD EPYC 3rd Gen (Milan)
    | "LGA4926";  // Ampere Altra/AmpereOne

export type Platform = "Intel" | "AMD" | "Ampere";

export type MemoryType = "RDIMM" | "LRDIMM" | "ECC-UDIMM";
export type MemoryGen = 4 | 5;

export type FormFactor = "1U" | "2U" | "4U" | "Blade";
export type MotherboardFormFactor = "ATX" | "EATX" | "Proprietary";

export type BayFormFactor = "2.5\"" | "3.5\"" | "E1.S" | "E1.L" | "E3.S" | "E3.L" | "M.2" | "U.2" | "U.3";
export type BayInterface = "SATA" | "SAS" | "NVMe";


// Constraints for Chassis
export interface ChassisConstraints {
    nodes: NodeConstraints[];
    bays: {
        formFactor: BayFormFactor;
        interface: BayInterface;
        count: number;
        hotSwap: boolean;
        perNode?: boolean; // If true, bays are per node; if false, they are shared/global
    }[];
    psu: {
        maxWatts: number;
        count: number;
        redundancy: boolean;
    };
    risers?: {
        slotIndex: number;
        lanes: number;
        gen: number;
    }[];
}

export interface NodeConstraints {
    index: number;
    moboFormFactors: MotherboardFormFactor[];
    cpuCount: 1 | 2;
}

// Constraints for Motherboard
export interface MotherboardConstraints {
    socket: SocketType;
    memory: {
        ddrGen: MemoryGen;
        dimmTypes: MemoryType[];
        socketsCount: 1 | 2;
        channelsPerSocket: number;
        dimmsPerChannel: number;
        maxPerDimmGB: number;
        maxTotalGB: number;
    };
    pcie: {
        gen: number;
        lanes: number;
        slots: {
            gen: number;
            lanes: number;
            formFactor: string; // "x16", "x8", "x4"
        }[];
    };
    storage: {
        headers: {
            type: "SATA" | "SAS";
            count: number;
        }[];
        onboardSlots: {
            type: BayFormFactor; // Usually "M.2" or "U.2"
            interface: BayInterface;
            pcieGen: number;
            lanes: number;
            count: number;
        }[];
    };
}

// Constraints for CPU
export interface CPUConstraints {
    socket: SocketType;
    memGenSupported: MemoryGen[];
    tdpW: number;
    maxMemSpeedMT: number;
    lanes: number;
}

// Constraints for Memory
export interface MemoryConstraints {
    ddrGen: MemoryGen;
    type: MemoryType;
    speedMT: number;
    capacityGB: number;
    ranks: number;
    voltage: number;
}

// Constraints for Storage
export interface StorageConstraints {
    formFactor: BayFormFactor;
    interface: BayInterface;
    capacityTB: number;
    tdpW: number;
}

// Entity definitions with constraints
export interface Chassis {
    id: string;
    sku: string;
    vendor: string;
    name: string;
    formFactor: FormFactor;
    constraints: ChassisConstraints;
    msrp?: number;
    currency?: string;
    lastUpdated?: string;
}

export interface Motherboard {
    id: string;
    sku: string;
    vendor: string;
    name: string;
    formFactor: MotherboardFormFactor;
    constraints: MotherboardConstraints;
    msrp?: number;
    currency?: string;
    lastUpdated?: string;
}

export interface CPU {
    id: string;
    sku: string;
    vendor: string;
    name: string;
    family: string; // "Sapphire Rapids", "Genoa", "Altra Max"
    platform: Platform;
    cores: number;
    threads: number;
    baseClock: number; // GHz
    boostClock?: number; // GHz
    constraints: CPUConstraints;
    msrp?: number;
    currency?: string;
    lastUpdated?: string;
}

export interface Memory {
    id: string;
    sku: string;
    vendor: string;
    name: string;
    constraints: MemoryConstraints;
    msrp?: number;
    currency?: string;
    lastUpdated?: string;
}

export interface Storage {
    id: string;
    sku: string;
    vendor: string;
    name: string;
    type: "SSD" | "HDD" | "NVMe";
    constraints: StorageConstraints;
    readSpeedMBps?: number;
    writeSpeedMBps?: number;
    msrp?: number;
    currency?: string;
    lastUpdated?: string;
}

// Build state
export interface Node {
    index: number;
    motherboard: Motherboard | null;
    cpus: CPU[];
    memory: Memory[];
    storage: Storage[];
}

export interface Build {
    id: string;
    schemaVersion: number;
    catalogVersion: string;
    chassis: Chassis | null;
    nodes: Node[];
    createdAt: string;
    updatedAt: string;
}

// Catalog (all available parts)
export interface Catalog {
    version: string;
    lastUpdated: string;
    chassis: Chassis[];
    motherboards: Motherboard[];
    cpus: CPU[];
    memory: Memory[];
    storage: Storage[];
}
