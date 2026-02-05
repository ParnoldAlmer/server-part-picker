// Validation issue types
export type ValidationSeverity = "error" | "warn";

export interface ValidationIssue {
    code: string;
    severity: ValidationSeverity;
    path: string; // e.g., "nodes[0].cpu", "chassis"
    message: string;
}

// Rule type
export type ValidationRule = (
    build: any,
    catalog?: any
) => ValidationIssue[];
