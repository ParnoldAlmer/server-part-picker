// Core socket types for compatibility matching
export type SocketType =
    | "LGA4677"   // Intel Xeon 4th/5th Gen (Sapphire/Emerald Rapids)
    | "SP5"       // AMD EPYC 4th Gen (Genoa/Bergamo)
    | "LGA4094"   // AMD EPYC 3rd Gen (Milan)
    | "LGA4926";  // Ampere Altra/AmpereOne

export type Platform = "Intel" | "AMD" | "Ampere";
export type SocketCount = 1 | 2 | 4;

export type MemoryType = "RDIMM" | "LRDIMM" | "ECC-UDIMM" | "UDIMM";
export type MemoryGen = 4 | 5;
export type MemoryBuffering = "Registered" | "Unbuffered" | "LoadReduced";
export type EccSupport = "ECC" | "Non-ECC";
export type MemoryRankDensity = "SR" | "DR" | "QR";

export type FormFactor = "1U" | "2U" | "4U" | "Blade";
export type MotherboardFormFactor = "ATX" | "EATX" | "SSI-EEB" | "Proprietary";

export type BayFormFactor = "2.5\"" | "3.5\"" | "E1.S" | "E1.L" | "E3.S" | "E3.L" | "M.2" | "U.2" | "U.3";
export type BayInterface = "SATA" | "SAS" | "NVMe";
export type ControllerType = "HBA" | "RAID" | "Tri-Mode";
export type ControllerConnector = "SFF-8643" | "SFF-8654" | "SlimSAS" | "OCuLink" | "U.2";
export type PcieBifurcationMode = "x8x8" | "x4x4x4x4" | "x8x4x4" | "x4x4";
export type NetworkConnectorType = "RJ45" | "SFP+" | "SFP28" | "QSFP28" | "OCP3.0";
export type TransceiverMedia = "SR" | "LR" | "DAC" | "AOC";
export type PsuRedundancyMode = "N" | "N+1" | "2N";

export interface PcieLaneMapping {
    socketIndex: number;
    lanes: number;
    gen: number;
}

export interface PcieBifurcationProfile {
    slotLabel: string;
    sourceLanes: number;
    modes: PcieBifurcationMode[];
}

export interface NetworkPortSpec {
    connector: NetworkConnectorType;
    speedGbps: number;
    count: number;
}

export interface BackplanePortGroup {
    interface: BayInterface;
    connector: ControllerConnector;
    ports: number;
    lanesPerPort: number;
}

export interface BackplaneSpec {
    id: string;
    name: string;
    bayFormFactor: BayFormFactor;
    bayCount: number;
    caddyTypes: string[];
    supportedInterfaces: BayInterface[];
    pathing: BackplanePortGroup[];
    compatibleControllerTypes: ControllerType[];
}

export interface RackRailConstraints {
    chassisDepthMm: number;
    railKitMinDepthMm: number;
    railKitMaxDepthMm: number;
    railKitRequired?: boolean;
}

export interface ThermalConstraints {
    maxCpuTdpPerSocketW?: Partial<Record<FormFactor, number>>;
    supportsPassiveHeatsinkSockets?: SocketType[];
    supportedPassiveHeatsinkSkus?: string[];
}

export interface RedundantPsuConstraints {
    maxWatts: number;
    count: number;
    redundancy: boolean;
    redundancyMode?: PsuRedundancyMode;
}

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
    psu: RedundantPsuConstraints;
    risers?: {
        slotIndex: number;
        lanes: number;
        gen: number;
    }[];
    backplanes?: BackplaneSpec[];
    railKit?: RackRailConstraints;
    thermal?: ThermalConstraints;
    networkFabric?: {
        supportedPortTypes: NetworkConnectorType[];
        supportedTransceiverMedia: TransceiverMedia[];
    };
    /**
     * Max physical DIMM slots available per node.
     * If undefined, no limit is enforced.
     */
    maxDimmsPerNode?: number;
}

export interface NodeConstraints {
    index: number;
    moboFormFactors: MotherboardFormFactor[];
    cpuCount: SocketCount;
}

// Constraints for Motherboard
export interface MotherboardConstraints {
    socket: SocketType;
    supportedSocketCounts?: SocketCount[];
    memory: {
        ddrGen: MemoryGen;
        dimmTypes: MemoryType[];
        socketsCount: SocketCount;
        channelsPerSocket: number;
        dimmsPerChannel: number;
        maxPerDimmGB: number;
        maxTotalGB: number;
        bufferingSupported?: MemoryBuffering[];
        eccSupport?: EccSupport[];
        rankDensitySupported?: MemoryRankDensity[];
        voltageRange?: {
            min: number;
            max: number;
        };
    };
    pcie: {
        gen: number;
        lanes: number;
        lanesBySocket?: PcieLaneMapping[];
        bifurcation?: PcieBifurcationProfile[];
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
        controllerHeaders?: {
            connector: ControllerConnector;
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
    network?: {
        onboardPorts: NetworkPortSpec[];
        ocp3Slots?: number;
    };
    mechanical?: {
        rackDepthRangeMm?: {
            min: number;
            max: number;
        };
    };
}

// Constraints for CPU
export interface CPUConstraints {
    socket: SocketType;
    supportedSocketCounts?: SocketCount[];
    memGenSupported: MemoryGen[];
    supportedBuffering?: MemoryBuffering[];
    supportedEccModes?: EccSupport[];
    supportedRankDensity?: MemoryRankDensity[];
    tdpW: number;
    maxMemSpeedMT: number;
    lanes: number;
    pcieLaneMap?: PcieLaneMapping[];
    specIntRate?: number;
    recommendedMemoryPerCoreGB?: number;
    requiresRegisteredEcc?: boolean;
    preferredBoardFormFactors?: MotherboardFormFactor[];
    requiresPassiveHeatsink?: boolean;
    supportedRackUnits?: FormFactor[];
}

// Constraints for Memory
export interface MemoryConstraints {
    ddrGen: MemoryGen;
    type: MemoryType;
    buffering?: MemoryBuffering;
    ecc?: EccSupport;
    speedMT: number;
    capacityGB: number;
    ranks: number;
    rankDensity?: MemoryRankDensity;
    voltage: number;
}

// Constraints for Storage
export interface StorageConstraints {
    formFactor: BayFormFactor;
    interface: BayInterface;
    capacityTB: number;
    tdpW: number;
    requiredControllerTypes?: ControllerType[];
    requiredControllerConnector?: ControllerConnector;
    requiredBackplaneInterface?: BayInterface;
    requiredCaddyTypes?: string[];
    requiredBifurcationMode?: PcieBifurcationMode;
}

export interface ControllerConstraints {
    type: ControllerType;
    pcieGen: number;
    pcieLanes: number;
    ports: {
        connector: ControllerConnector;
        count: number;
        lanesPerPort: number;
        interface: BayInterface;
    }[];
    maxDrives?: number;
}

export interface NetworkAdapterConstraints {
    ports: NetworkPortSpec[];
    ocp3Compatible?: boolean;
    requiresTransceiver?: boolean;
}

export interface TransceiverConstraints {
    connector: "SFP+" | "SFP28" | "QSFP28";
    media: TransceiverMedia;
    speedGbps: number;
    compatibleSwitchFamilies?: string[];
}

export interface SwitchPortProfile {
    id: string;
    vendor: string;
    family: string;
    ports: NetworkPortSpec[];
    supportedTransceiverMedia: TransceiverMedia[];
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

export interface ControllerCard {
    id: string;
    sku: string;
    vendor: string;
    name: string;
    constraints: ControllerConstraints;
    msrp?: number;
    currency?: string;
    lastUpdated?: string;
}

export interface NetworkAdapter {
    id: string;
    sku: string;
    vendor: string;
    name: string;
    constraints: NetworkAdapterConstraints;
    msrp?: number;
    currency?: string;
    lastUpdated?: string;
}

export interface Transceiver {
    id: string;
    sku: string;
    vendor: string;
    name: string;
    constraints: TransceiverConstraints;
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
    controllers?: ControllerCard[];
    networkAdapters?: NetworkAdapter[];
    transceivers?: Transceiver[];
}

export interface Build {
    id: string;
    schemaVersion: number;
    catalogVersion: string;
    chassis: Chassis | null;
    nodes: Node[];
    fabricSwitches?: SwitchPortProfile[];
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
    controllers?: ControllerCard[];
    networkAdapters?: NetworkAdapter[];
    transceivers?: Transceiver[];
    switchProfiles?: SwitchPortProfile[];
}
