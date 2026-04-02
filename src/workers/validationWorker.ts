// Web Worker für Datenvalidierung
// Läuft im Hintergrund ohne UI-Blockierung
// NOTE: Pattern analysis and corrections are handled by localBulkCorrections.ts
// This worker only handles validation.

import type { ValidationError, ImportRow, ColumnDefinition, FormatRule, BusinessRule } from '../types/importTypes';

interface WorkerMessage {
  type: 'validate';
  payload: unknown;
}

interface ValidatePayload {
  data: ImportRow[];
  columns: ColumnDefinition[];
  formatRules: FormatRule[];
  businessRules: BusinessRule[];
}

// Validate a single field
function validateField(
  value: unknown,
  column: ColumnDefinition,
  formatRules: FormatRule[]
): string | null {
  const stringValue = value === null || value === undefined ? '' : String(value);
  
  // Check required
  if (column.required && stringValue.trim() === '') {
    return `${column.name} ist erforderlich`;
  }
  
  if (stringValue.trim() === '') return null;
  
  // Check format rules
  for (const rule of formatRules) {
    if (!rule.is_active) continue;
    if (rule.applies_to_columns && !rule.applies_to_columns.includes(column.name)) continue;
    
    try {
      const regex = new RegExp(rule.pattern);
      if (!regex.test(stringValue)) {
        return rule.error_message;
      }
    } catch {
      // Invalid regex, skip
    }
  }
  
  return null;
}

// Full validation pass
function validateData(
  data: ImportRow[],
  columns: ColumnDefinition[],
  formatRules: FormatRule[],
  businessRules: BusinessRule[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  const columnMap = new Map(columns.map(c => [c.name, c]));
  
  // Field validation
  for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
    const row = data[rowIndex];
    
    for (const [columnName, value] of Object.entries(row)) {
      const column = columnMap.get(columnName);
      if (!column) continue;
      
      const error = validateField(value, column, formatRules);
      if (error) {
        errors.push({
          row: rowIndex,
          column: columnName,
          value: value === null || value === undefined ? '' : String(value),
          message: error,
          type: 'format',
          severity: 'error',
        });
      }
    }
  }
  
  // Business rules
  for (const rule of businessRules) {
    if (!rule.is_active) continue;
    
    try {
      const config = rule.configuration as Record<string, unknown>;
      
      switch (rule.rule_type) {
        case 'required_together': {
          const fields = config.fields as string[];
          if (!fields) break;
          
          for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
            const row = data[rowIndex];
            const filled = fields.filter(f => {
              const v = row[f];
              return v !== undefined && v !== null && String(v).trim() !== '';
            });
            
            if (filled.length > 0 && filled.length < fields.length) {
              const missing = fields.filter(f => !filled.includes(f));
              errors.push({
                row: rowIndex,
                column: missing[0],
                value: '',
                message: rule.error_message,
                type: 'business',
                severity: 'warning',
              });
            }
          }
          break;
        }
        
        case 'unique': {
          const field = config.field as string;
          if (!field) break;
          
          const seen = new Map<string, number>();
          for (let i = 0; i < data.length; i++) {
            const value = data[i][field];
            if (value === undefined || value === null || String(value).trim() === '') continue;
            
            const key = String(value);
            if (seen.has(key)) {
              errors.push({
                row: i,
                column: field,
                value: key,
                message: rule.error_message,
                type: 'duplicate',
                severity: 'warning',
              });
            } else {
              seen.set(key, i);
            }
          }
          break;
        }
      }
    } catch {
      // Skip invalid rule
    }
  }
  
  // Duplicate check
  const seen = new Map<string, number>();
  const idColumn = columns.find(c => c.name.toLowerCase().includes('id') || c.name.toLowerCase() === 'id');
  
  if (idColumn) {
    for (let i = 0; i < data.length; i++) {
      const value = data[i][idColumn.name];
      if (value === undefined || value === null || String(value).trim() === '') continue;
      
      const key = String(value);
      if (seen.has(key)) {
        errors.push({
          row: i,
          column: idColumn.name,
          value: key,
          message: `Duplikat gefunden (erste Zeile: ${seen.get(key)! + 2})`,
          type: 'duplicate',
          severity: 'warning',
        });
      } else {
        seen.set(key, i);
      }
    }
  }
  
  return errors;
}

// Message handler
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, payload } = event.data;
  
  try {
    switch (type) {
      case 'validate': {
        const { data, columns, formatRules, businessRules } = payload as ValidatePayload;
        const errors = validateData(data, columns, formatRules, businessRules);
        self.postMessage({ type: 'validate-result', payload: { errors } });
        break;
      }
      
      default:
        self.postMessage({ type: 'error', payload: { message: `Unknown message type: ${type}` } });
    }
  } catch (error) {
    self.postMessage({ 
      type: 'error', 
      payload: { message: error instanceof Error ? error.message : 'Unknown error' } 
    });
  }
};
