import { describe, it, expect } from "vitest";
import { ChassisSchema, MotherboardSchema, StorageSchema, CPUSchema, MemorySchema } from "./schema";
import chassisData from "../../../../backend/src/data/chassis.json";
import motherboardData from "../../../../backend/src/data/motherboards.json";
import storageData from "../../../../backend/src/data/storage.json";
import cpuData from "../../../../backend/src/data/cpus.json";
import memoryData from "../../../../backend/src/data/memory.json";

describe("Catalog Data Validation", () => {
    it("should validate all chassis data", () => {
        chassisData.forEach((chassis) => {
            const result = ChassisSchema.safeParse(chassis);
            if (!result.success) {
                console.error(`Validation failed for chassis: ${chassis.sku}`, result.error.format());
            }
            expect(result.success).toBe(true);
        });
    });

    it("should validate all motherboard data", () => {
        motherboardData.forEach((mobo) => {
            const result = MotherboardSchema.safeParse(mobo);
            if (!result.success) {
                console.error(`Validation failed for motherboard: ${mobo.sku}`, result.error.format());
            }
            expect(result.success).toBe(true);
        });
    });

    it("should validate all storage data", () => {
        storageData.forEach((storage) => {
            const result = StorageSchema.safeParse(storage);
            if (!result.success) {
                console.error(`Validation failed for storage: ${storage.sku}`, result.error.format());
            }
            expect(result.success).toBe(true);
        });
    });

    it("should validate all CPU data", () => {
        cpuData.forEach((cpu) => {
            const result = CPUSchema.safeParse(cpu);
            if (!result.success) {
                console.error(`Validation failed for CPU: ${cpu.sku}`, result.error.format());
            }
            expect(result.success).toBe(true);
        });
    });

    it("should validate all memory data", () => {
        memoryData.forEach((mem) => {
            const result = MemorySchema.safeParse(mem);
            if (!result.success) {
                console.error(`Validation failed for memory: ${mem.sku}`, result.error.format());
            }
            expect(result.success).toBe(true);
        });
    });
});
