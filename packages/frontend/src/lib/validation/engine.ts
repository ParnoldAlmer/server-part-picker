import type { ValidationRule, ValidationIssue } from './types';

/**
 * Rule engine - runs all validation rules against a build
 */
export function runValidation(
    build: any,
    rules: ValidationRule[],
    catalog?: any
): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (const rule of rules) {
        const ruleIssues = rule(build, catalog);
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
