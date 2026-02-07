import { z } from "zod";

export const SocketTypeSchema = z.enum(["LGA4677", "SP5", "LGA4094", "LGA4926"]);
export const PlatformSchema = z.enum(["Intel", "AMD", "Ampere"]);
export const MemoryTypeSchema = z.enum(["RDIMM", "LRDIMM", "ECC-UDIMM", "UDIMM"]);
export const MemoryGenSchema = z.union([z.literal(4), z.literal(5)]);
export const FormFactorSchema = z.enum(["1U", "2U", "4U", "Blade"]);
export const MotherboardFormFactorSchema = z.enum(["ATX", "EATX", "SSI-EEB", "Proprietary"]);
export const BayFormFactorSchema = z.enum(["2.5\"", "3.5\"", "E1.S", "E1.L", "E3.S", "E3.L", "M.2", "U.2", "U.3"]);
export const BayInterfaceSchema = z.enum(["SATA", "SAS", "NVMe"]);
export const MemoryBufferingSchema = z.enum(["Registered", "Unbuffered", "LoadReduced"]);
export const EccSupportSchema = z.enum(["ECC", "Non-ECC"]);
export const MemoryRankDensitySchema = z.enum(["SR", "DR", "QR"]);
export const ControllerTypeSchema = z.enum(["HBA", "RAID", "Tri-Mode"]);
export const ControllerConnectorSchema = z.enum(["SFF-8643", "SFF-8654", "SlimSAS", "OCuLink", "U.2"]);
export const PcieBifurcationModeSchema = z.enum(["x8x8", "x4x4x4x4", "x8x4x4", "x4x4"]);
export const NetworkConnectorTypeSchema = z.enum(["RJ45", "SFP+", "SFP28", "QSFP28", "OCP3.0"]);
export const TransceiverMediaSchema = z.enum(["SR", "LR", "DAC", "AOC"]);
export const PsuRedundancyModeSchema = z.enum(["N", "N+1", "2N"]);

export const NodeConstraintsSchema = z.object({
    index: z.number(),
    moboFormFactors: z.array(MotherboardFormFactorSchema),
    cpuCount: z.union([z.literal(1), z.literal(2), z.literal(4)])
});

export const ChassisConstraintsSchema = z.object({
    nodes: z.array(NodeConstraintsSchema),
    bays: z.array(z.object({
        formFactor: BayFormFactorSchema,
        interface: BayInterfaceSchema,
        count: z.number(),
        hotSwap: z.boolean(),
        perNode: z.boolean().optional()
    })),
    psu: z.object({
        maxWatts: z.number(),
        count: z.number(),
        redundancy: z.boolean(),
        redundancyMode: PsuRedundancyModeSchema.optional(),
    }),
    risers: z.array(z.object({
        slotIndex: z.number(),
        lanes: z.number(),
        gen: z.number()
    })).nullable().optional(),
    backplanes: z.array(z.object({
        id: z.string(),
        name: z.string(),
        bayFormFactor: BayFormFactorSchema,
        bayCount: z.number(),
        caddyTypes: z.array(z.string()),
        supportedInterfaces: z.array(BayInterfaceSchema),
        pathing: z.array(z.object({
            interface: BayInterfaceSchema,
            connector: ControllerConnectorSchema,
            ports: z.number(),
            lanesPerPort: z.number(),
        })),
        compatibleControllerTypes: z.array(ControllerTypeSchema),
    })).optional(),
    railKit: z.object({
        chassisDepthMm: z.number(),
        railKitMinDepthMm: z.number(),
        railKitMaxDepthMm: z.number(),
        railKitRequired: z.boolean().optional(),
    }).optional(),
    thermal: z.object({
        maxCpuTdpPerSocketW: z.object({
            "1U": z.number().optional(),
            "2U": z.number().optional(),
            "4U": z.number().optional(),
            Blade: z.number().optional(),
        }).optional(),
        supportsPassiveHeatsinkSockets: z.array(SocketTypeSchema).optional(),
        supportedPassiveHeatsinkSkus: z.array(z.string()).optional(),
    }).optional(),
    networkFabric: z.object({
        supportedPortTypes: z.array(NetworkConnectorTypeSchema),
        supportedTransceiverMedia: z.array(TransceiverMediaSchema),
    }).optional(),
    maxDimmsPerNode: z.number().optional(),
});

export const MotherboardConstraintsSchema = z.object({
    socket: SocketTypeSchema,
    supportedSocketCounts: z.array(z.union([z.literal(1), z.literal(2), z.literal(4)])).optional(),
    memory: z.object({
        ddrGen: MemoryGenSchema,
        dimmTypes: z.array(MemoryTypeSchema),
        socketsCount: z.union([z.literal(1), z.literal(2), z.literal(4)]),
        channelsPerSocket: z.number(),
        dimmsPerChannel: z.number(),
        maxPerDimmGB: z.number(),
        maxTotalGB: z.number(),
        bufferingSupported: z.array(MemoryBufferingSchema).optional(),
        eccSupport: z.array(EccSupportSchema).optional(),
        rankDensitySupported: z.array(MemoryRankDensitySchema).optional(),
        voltageRange: z.object({
            min: z.number(),
            max: z.number(),
        }).optional(),
    }),
    pcie: z.object({
        gen: z.number(),
        lanes: z.number(),
        lanesBySocket: z.array(z.object({
            socketIndex: z.number(),
            lanes: z.number(),
            gen: z.number(),
        })).optional(),
        bifurcation: z.array(z.object({
            slotLabel: z.string(),
            sourceLanes: z.number(),
            modes: z.array(PcieBifurcationModeSchema),
        })).optional(),
        slots: z.array(z.object({
            gen: z.number(),
            lanes: z.number(),
            formFactor: z.string()
        }))
    }),
    storage: z.object({
        headers: z.array(z.object({
            type: z.enum(["SATA", "SAS"]),
            count: z.number()
        })),
        controllerHeaders: z.array(z.object({
            connector: ControllerConnectorSchema,
            count: z.number(),
        })).optional(),
        onboardSlots: z.array(z.object({
            type: BayFormFactorSchema,
            interface: BayInterfaceSchema,
            pcieGen: z.number(),
            lanes: z.number(),
            count: z.number()
        }))
    }),
    network: z.object({
        onboardPorts: z.array(z.object({
            connector: NetworkConnectorTypeSchema,
            speedGbps: z.number(),
            count: z.number(),
        })),
        ocp3Slots: z.number().optional(),
    }).optional(),
    mechanical: z.object({
        rackDepthRangeMm: z.object({
            min: z.number(),
            max: z.number(),
        }).optional(),
    }).optional(),
});

export const CPUConstraintsSchema = z.object({
    socket: SocketTypeSchema,
    supportedSocketCounts: z.array(z.union([z.literal(1), z.literal(2), z.literal(4)])).optional(),
    memGenSupported: z.array(MemoryGenSchema),
    supportedBuffering: z.array(MemoryBufferingSchema).optional(),
    supportedEccModes: z.array(EccSupportSchema).optional(),
    supportedRankDensity: z.array(MemoryRankDensitySchema).optional(),
    tdpW: z.number(),
    maxMemSpeedMT: z.number(),
    lanes: z.number(),
    pcieLaneMap: z.array(z.object({
        socketIndex: z.number(),
        lanes: z.number(),
        gen: z.number(),
    })).optional(),
    specIntRate: z.number().optional(),
    recommendedMemoryPerCoreGB: z.number().optional(),
    requiresRegisteredEcc: z.boolean().optional(),
    preferredBoardFormFactors: z.array(MotherboardFormFactorSchema).optional(),
    requiresPassiveHeatsink: z.boolean().optional(),
    supportedRackUnits: z.array(FormFactorSchema).optional(),
});

export const MemoryConstraintsSchema = z.object({
    ddrGen: MemoryGenSchema,
    type: MemoryTypeSchema,
    buffering: MemoryBufferingSchema.optional(),
    ecc: EccSupportSchema.optional(),
    speedMT: z.number(),
    capacityGB: z.number(),
    ranks: z.number(),
    rankDensity: MemoryRankDensitySchema.optional(),
    voltage: z.number(),
});

export const StorageConstraintsSchema = z.object({
    formFactor: BayFormFactorSchema,
    interface: BayInterfaceSchema,
    capacityTB: z.number(),
    tdpW: z.number(),
    requiredControllerTypes: z.array(ControllerTypeSchema).optional(),
    requiredControllerConnector: ControllerConnectorSchema.optional(),
    requiredBackplaneInterface: BayInterfaceSchema.optional(),
    requiredCaddyTypes: z.array(z.string()).optional(),
    requiredBifurcationMode: PcieBifurcationModeSchema.optional(),
});

export const ChassisSchema = z.object({
    id: z.string(),
    sku: z.string(),
    vendor: z.string(),
    name: z.string(),
    formFactor: FormFactorSchema,
    constraints: ChassisConstraintsSchema,
    msrp: z.number().optional(),
    currency: z.string().optional(),
    lastUpdated: z.string().optional()
});

export const MotherboardSchema = z.object({
    id: z.string(),
    sku: z.string(),
    vendor: z.string(),
    name: z.string(),
    formFactor: MotherboardFormFactorSchema,
    constraints: MotherboardConstraintsSchema,
    msrp: z.number().optional(),
    currency: z.string().optional(),
    lastUpdated: z.string().optional()
});

export const CPUSchema = z.object({
    id: z.string(),
    sku: z.string(),
    vendor: z.string(),
    name: z.string(),
    family: z.string(),
    platform: PlatformSchema,
    cores: z.number(),
    threads: z.number(),
    baseClock: z.number(),
    boostClock: z.number().optional(),
    constraints: CPUConstraintsSchema,
    msrp: z.number().optional(),
    currency: z.string().optional(),
    lastUpdated: z.string().optional()
});

export const MemorySchema = z.object({
    id: z.string(),
    sku: z.string(),
    vendor: z.string(),
    name: z.string(),
    constraints: MemoryConstraintsSchema,
    msrp: z.number().optional(),
    currency: z.string().optional(),
    lastUpdated: z.string().optional()
});

export const StorageSchema = z.object({
    id: z.string(),
    sku: z.string(),
    vendor: z.string(),
    name: z.string(),
    type: z.enum(["SSD", "HDD", "NVMe"]),
    constraints: StorageConstraintsSchema,
    readSpeedMBps: z.number().optional(),
    writeSpeedMBps: z.number().optional(),
    msrp: z.number().optional(),
    currency: z.string().optional(),
    lastUpdated: z.string().optional()
});
