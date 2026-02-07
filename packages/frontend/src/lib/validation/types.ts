import type { Build, Catalog } from '../../types/hardware';

// Validation issue types
export type ValidationSeverity = "error" | "warn";

export interface ValidationIssue {
    code: string;
    severity: ValidationSeverity;
    path: string; // e.g., "nodes[0].cpu", "chassis"
    message: string;
}

export interface ValidationContext {
    now?: Date;
    strictMode?: boolean;
}

// Rule type
export type ValidationRule = (
    build: Build,
    catalog?: Catalog,
    context?: ValidationContext
) => ValidationIssue[];
