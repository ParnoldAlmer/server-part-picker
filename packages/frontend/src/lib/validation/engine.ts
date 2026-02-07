import type { ValidationRule, ValidationIssue } from './types';
import type { Build, Catalog } from '../../types/hardware';
import type { ValidationContext } from './types';

/**
 * Rule engine - runs all validation rules against a build
 */
export function runValidation(
    build: Build,
    rules: ValidationRule[],
    catalog?: Catalog,
    context?: ValidationContext
): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (const rule of rules) {
        const ruleIssues = rule(build, catalog, context);
        issues.push(...ruleIssues);
    }

    return issues;
}

/**
 * Categorize issues by severity
 */
export function categorizeIssues(issues: ValidationIssue[]) {
    return {
        errors: issues.filter(i => i.severity === 'error'),
        warnings: issues.filter(i => i.severity === 'warn'),
        hasErrors: issues.some(i => i.severity === 'error'),
        hasWarnings: issues.some(i => i.severity === 'warn'),
    };
}

/**
 * Group issues by node
 */
export function groupIssuesByNode(issues: ValidationIssue[]) {
    const byNode: Record<string, ValidationIssue[]> = {};
    const global: ValidationIssue[] = [];

    for (const issue of issues) {
        const nodeMatch = issue.path.match(/^nodes\[(\d+)\]/);
        if (nodeMatch) {
            const nodeIndex = nodeMatch[1];
            if (!byNode[nodeIndex]) {
                byNode[nodeIndex] = [];
            }
            byNode[nodeIndex].push(issue);
        } else {
            global.push(issue);
        }
    }

    return { byNode, global };
}
