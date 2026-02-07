import type { Build } from '../../../types/hardware';
import { runCompatibilityCheck } from '../CompatibilityCheck';
import type { ValidationRule } from '../types';

export const compatibilityGraphRule: ValidationRule = (build: Build) => {
    return runCompatibilityCheck(build);
};

