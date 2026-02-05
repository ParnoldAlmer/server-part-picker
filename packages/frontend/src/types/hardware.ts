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

export type BayType = "SFF" | "LFF" | "U.2" | "U.3" | "E1.S" | "M.2";
export type StorageInterface = "SATA" | "SAS" | "NVMe";

// Constraints for Chassis
export interface ChassisConstraints {
    nodes: {
        index: number;
        moboFormFactors: MotherboardFormFactor[];
        cpuCount: 1 | 2;
    }[];
    bays: {
        type: BayType;
        count: number;
        interface: StorageInterface;
        perNode?: number; // If defined, bays split equally per node
        hotSwap: boolean;
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

// Constraints for Motherboard
export interface MotherboardConstraints {
    socket: SocketType;
    mem: {
        ddrGen: MemoryGen;
        types: MemoryType[];
        slots: number;
        maxPerDimmGB: number;
        maxTotalGB: number;
        channels: number;
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
    storageHeaders: {
        type: string; // "M.2", "U.2", "SATA"
        count: number;
    }[];
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
    formFactor: BayType;
    interface: StorageInterface;
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
    socketCount: 1 | 2;
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
