import type { ImportType } from './importTypes';

/**
 * A single correction rule that can be applied to future imports
 */
export interface CorrectionRule {
  id: string;
  column: string;
  originalValue: string;
  correctedValue: string;
  matchType: 'exact' | 'identifier';
  identifierColumn?: string;
  identifierValue?: string;
  importType: ImportType;
  createdAt: string;
  appliedCount: number;
}

/**
 * File format for exporting/importing correction rules
 */
export interface CorrectionRulesFile {
  version: string;
  exportedAt: string;
  exportedFrom: string;
  importType: ImportType;
  rules: CorrectionRule[];
}

/**
 * Processing mode for the import wizard
 */
export type ProcessingMode = 'initial' | 'continued';

/**
 * Source of correction rules for continued processing
 */
export type CorrectionSource = 'localStorage' | 'file';

/**
 * Result of applying correction rules to data
 */
export interface AppliedCorrection {
  row: number;
  column: string;
  originalValue: string;
  correctedValue: string;
  ruleId: string;
}

/**
 * Statistics about applied corrections
 */
export interface CorrectionStats {
  totalApplied: number;
  byColumn: Record<string, number>;
  rulesUsed: string[];
}
