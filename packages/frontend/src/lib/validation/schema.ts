import { z } from "zod";

export const SocketTypeSchema = z.enum(["LGA4677", "SP5", "LGA4094", "LGA4926"]);
export const PlatformSchema = z.enum(["Intel", "AMD", "Ampere"]);
export const MemoryTypeSchema = z.enum(["RDIMM", "LRDIMM", "ECC-UDIMM"]);
export const MemoryGenSchema = z.union([z.literal(4), z.literal(5)]);
export const FormFactorSchema = z.enum(["1U", "2U", "4U", "Blade"]);
export const MotherboardFormFactorSchema = z.enum(["ATX", "EATX", "Proprietary"]);
export const BayFormFactorSchema = z.enum(["2.5\"", "3.5\"", "E1.S", "E1.L", "E3.S", "E3.L", "M.2", "U.2", "U.3"]);
export const BayInterfaceSchema = z.enum(["SATA", "SAS", "NVMe"]);

export const NodeConstraintsSchema = z.object({
    index: z.number(),
    moboFormFactors: z.array(MotherboardFormFactorSchema),
    cpuCount: z.union([z.literal(1), z.literal(2)])
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
        redundancy: z.boolean()
    }),
    risers: z.array(z.object({
        slotIndex: z.number(),
        lanes: z.number(),
        gen: z.number()
    })).nullable().optional()
});

export const MotherboardConstraintsSchema = z.object({
    socket: SocketTypeSchema,
    memory: z.object({
        ddrGen: MemoryGenSchema,
        dimmTypes: z.array(MemoryTypeSchema),
        socketsCount: z.union([z.literal(1), z.literal(2)]),
        channelsPerSocket: z.number(),
        dimmsPerChannel: z.number(),
        maxPerDimmGB: z.number(),
        maxTotalGB: z.number()
    }),
    pcie: z.object({
        gen: z.number(),
        lanes: z.number(),
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
        onboardSlots: z.array(z.object({
            type: BayFormFactorSchema,
            interface: BayInterfaceSchema,
            pcieGen: z.number(),
            lanes: z.number(),
            count: z.number()
        }))
    })
});

export const CPUConstraintsSchema = z.object({
    socket: SocketTypeSchema,
    memGenSupported: z.array(MemoryGenSchema),
    tdpW: z.number(),
    maxMemSpeedMT: z.number(),
    lanes: z.number()
});

export const MemoryConstraintsSchema = z.object({
    ddrGen: MemoryGenSchema,
    type: MemoryTypeSchema,
    speedMT: z.number(),
    capacityGB: z.number(),
    ranks: z.number(),
    voltage: z.number()
});

export const StorageConstraintsSchema = z.object({
    formFactor: BayFormFactorSchema,
    interface: BayInterfaceSchema,
    capacityTB: z.number(),
    tdpW: z.number()
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
