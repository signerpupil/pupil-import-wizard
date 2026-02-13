import { describe, it, expect } from "vitest";
import { validateData } from "@/lib/fileParser";
import type { ParsedRow, ColumnDefinition, ValidationError } from "@/types/importTypes";

// Test column definitions with AHV validation
const testColumns: ColumnDefinition[] = [
  { name: "S_ID", required: true, category: "Schüler" },
  { name: "S_Name", required: true, category: "Schüler" },
  { name: "S_Vorname", required: true, category: "Schüler" },
  { name: "S_AHV", required: false, category: "Schüler", validationType: "ahv" },
  { name: "S_Email", required: false, category: "Schüler", validationType: "email" },
  { name: "P_ERZ1_ID", required: false, category: "Eltern" },
  { name: "P_ERZ1_Name", required: false, category: "Eltern" },
  { name: "P_ERZ1_Vorname", required: false, category: "Eltern" },
  { name: "P_ERZ1_AHV", required: false, category: "Eltern", validationType: "ahv" },
  { name: "P_ERZ1_Strasse", required: false, category: "Eltern" },
  { name: "P_ERZ1_TelefonPrivat", required: false, category: "Eltern" },
  { name: "P_ERZ1_TelefonGeschaeft", required: false, category: "Eltern" },
  { name: "P_ERZ1_Mobil", required: false, category: "Eltern" },
  { name: "P_ERZ2_ID", required: false, category: "Eltern" },
  { name: "P_ERZ2_Name", required: false, category: "Eltern" },
  { name: "P_ERZ2_Vorname", required: false, category: "Eltern" },
  { name: "P_ERZ2_AHV", required: false, category: "Eltern", validationType: "ahv" },
  { name: "P_ERZ2_Strasse", required: false, category: "Eltern" },
  { name: "P_ERZ2_TelefonPrivat", required: false, category: "Eltern" },
  { name: "P_ERZ2_TelefonGeschaeft", required: false, category: "Eltern" },
  { name: "P_ERZ2_Mobil", required: false, category: "Eltern" },
];

describe("Duplicate Detection", () => {
  it("should detect duplicate S_AHV values", () => {
    const rows: ParsedRow[] = [
      { S_ID: "1", S_Name: "Müller", S_Vorname: "Max", S_AHV: "756.1234.5678.90", S_Email: "max@test.ch" },
      { S_ID: "2", S_Name: "Müller", S_Vorname: "Anna", S_AHV: "756.1234.5678.90", S_Email: "anna@test.ch" },
      { S_ID: "3", S_Name: "Schmidt", S_Vorname: "Peter", S_AHV: "756.9876.5432.10", S_Email: "peter@test.ch" },
    ];

    const errors = validateData(rows, testColumns);
    
    // Should find duplicate AHV
    const ahvDuplicates = errors.filter(e => e.column === "S_AHV" && e.message.includes("Duplikat"));
    expect(ahvDuplicates.length).toBe(1);
    expect(ahvDuplicates[0].row).toBe(2); // Second occurrence is flagged
    expect(ahvDuplicates[0].value).toBe("756.1234.5678.90");
  });

  it("should detect duplicate S_ID values", () => {
    const rows: ParsedRow[] = [
      { S_ID: "STUDENT-001", S_Name: "Müller", S_Vorname: "Max", S_AHV: "756.1234.5678.90" },
      { S_ID: "STUDENT-001", S_Name: "Müller", S_Vorname: "Max", S_AHV: "756.1234.5678.91" },
      { S_ID: "STUDENT-002", S_Name: "Schmidt", S_Vorname: "Peter", S_AHV: "756.9876.5432.10" },
    ];

    const errors = validateData(rows, testColumns);
    
    const idDuplicates = errors.filter(e => e.column === "S_ID" && e.message.includes("Duplikat"));
    expect(idDuplicates.length).toBe(1);
    expect(idDuplicates[0].row).toBe(2);
  });

  it("should detect multiple duplicates of the same value", () => {
    const rows: ParsedRow[] = [
      { S_ID: "1", S_Name: "Müller", S_Vorname: "Max", S_AHV: "756.1234.5678.90" },
      { S_ID: "2", S_Name: "Müller", S_Vorname: "Anna", S_AHV: "756.1234.5678.90" },
      { S_ID: "3", S_Name: "Müller", S_Vorname: "Tom", S_AHV: "756.1234.5678.90" },
      { S_ID: "4", S_Name: "Schmidt", S_Vorname: "Peter", S_AHV: "756.9876.5432.10" },
    ];

    const errors = validateData(rows, testColumns);
    
    const ahvDuplicates = errors.filter(e => e.column === "S_AHV" && e.message.includes("Duplikat"));
    // Rows 2 and 3 are duplicates of row 1
    expect(ahvDuplicates.length).toBe(2);
    expect(ahvDuplicates.map(e => e.row).sort()).toEqual([2, 3]);
  });
});

describe("Parent ID Consistency Check", () => {
  it("should detect inconsistent parent IDs for same AHV", () => {
    const rows: ParsedRow[] = [
      { 
        S_ID: "1", S_Name: "Müller", S_Vorname: "Max", S_AHV: "756.1111.1111.11",
        P_ERZ1_ID: "PARENT-001", P_ERZ1_Name: "Müller", P_ERZ1_Vorname: "Hans", P_ERZ1_AHV: "756.9999.9999.99"
      },
      { 
        S_ID: "2", S_Name: "Müller", S_Vorname: "Anna", S_AHV: "756.2222.2222.22",
        P_ERZ1_ID: "PARENT-002", P_ERZ1_Name: "Müller", P_ERZ1_Vorname: "Hans", P_ERZ1_AHV: "756.9999.9999.99"
      },
    ];

    const errors = validateData(rows, testColumns);
    
    const inconsistentIds = errors.filter(e => e.message.includes("Inkonsistente ID"));
    expect(inconsistentIds.length).toBeGreaterThan(0);
    // The second row should have the inconsistency error
    expect(inconsistentIds.some(e => e.row === 2)).toBe(true);
  });

  it("should not flag consistent parent IDs", () => {
    const rows: ParsedRow[] = [
      { 
        S_ID: "1", S_Name: "Müller", S_Vorname: "Max", S_AHV: "756.1111.1111.11",
        P_ERZ1_ID: "PARENT-001", P_ERZ1_Name: "Müller", P_ERZ1_Vorname: "Hans", P_ERZ1_AHV: "756.9999.9999.99"
      },
      { 
        S_ID: "2", S_Name: "Müller", S_Vorname: "Anna", S_AHV: "756.2222.2222.22",
        P_ERZ1_ID: "PARENT-001", P_ERZ1_Name: "Müller", P_ERZ1_Vorname: "Hans", P_ERZ1_AHV: "756.9999.9999.99"
      },
    ];

    const errors = validateData(rows, testColumns);
    
    const inconsistentIds = errors.filter(e => e.message.includes("Inkonsistente ID"));
    expect(inconsistentIds.length).toBe(0);
  });

  it("should detect inconsistent parent IDs across ERZ1 and ERZ2 slots", () => {
    const rows: ParsedRow[] = [
      { 
        S_ID: "1", S_Name: "Bolt", S_Vorname: "Emilia", S_AHV: "756.1111.1111.11",
        P_ERZ2_ID: "399423", P_ERZ2_Name: "Bolt", P_ERZ2_Vorname: "Nina", P_ERZ2_Strasse: "Pupilstr. 79"
      },
      { 
        S_ID: "2", S_Name: "Castelberg", S_Vorname: "Gloria", S_AHV: "756.2222.2222.22",
        P_ERZ2_ID: "399423abc", P_ERZ2_Name: "Bolt", P_ERZ2_Vorname: "Nina", P_ERZ2_Strasse: "Pupilstr. 79"
      },
    ];

    const errors = validateData(rows, testColumns);
    
    const inconsistentIds = errors.filter(e => e.message.includes("Inkonsistente ID"));
    expect(inconsistentIds.length).toBeGreaterThan(0);
    expect(inconsistentIds.some(e => e.row === 2)).toBe(true);
  });

  it("should detect inconsistency when same parent is in ERZ1 in one row and ERZ2 in another", () => {
    const rows: ParsedRow[] = [
      { 
        S_ID: "1", S_Name: "Müller", S_Vorname: "Max", S_AHV: "756.1111.1111.11",
        P_ERZ1_ID: "PARENT-001", P_ERZ1_Name: "Bolt", P_ERZ1_Vorname: "Nina", P_ERZ1_Strasse: "Pupilstr. 79"
      },
      { 
        S_ID: "2", S_Name: "Schmidt", S_Vorname: "Anna", S_AHV: "756.2222.2222.22",
        P_ERZ2_ID: "PARENT-999", P_ERZ2_Name: "Bolt", P_ERZ2_Vorname: "Nina", P_ERZ2_Strasse: "Pupilstr. 79"
      },
    ];

    const errors = validateData(rows, testColumns);
    
    const inconsistentIds = errors.filter(e => e.message.includes("Inkonsistente ID"));
    expect(inconsistentIds.length).toBeGreaterThan(0);
    expect(inconsistentIds.some(e => e.row === 2)).toBe(true);
  });

  it("should detect inconsistent parent IDs when names differ only by diacritics", () => {
    const rows: ParsedRow[] = [
      { 
        S_ID: "1", S_Name: "Müller", S_Vorname: "Max", S_AHV: "756.1111.1111.11",
        P_ERZ1_ID: "PARENT-001", P_ERZ1_Name: "Juhász", P_ERZ1_Vorname: "Krisztián"
      },
      { 
        S_ID: "2", S_Name: "Müller", S_Vorname: "Anna", S_AHV: "756.2222.2222.22",
        P_ERZ1_ID: "PARENT-002", P_ERZ1_Name: "Juhasz", P_ERZ1_Vorname: "Krisztian"
      },
    ];

    const errors = validateData(rows, testColumns);
    
    // "Juhász Krisztián" and "Juhasz Krisztian" should be recognized as the same person
    const inconsistentIds = errors.filter(e => e.message.includes("Inkonsistente ID"));
    expect(inconsistentIds.length).toBeGreaterThan(0);
    expect(inconsistentIds.some(e => e.row === 2)).toBe(true);
  });

  it("should auto-correct names without diacritics to the accented version", () => {
    const rows: ParsedRow[] = [
      { 
        S_ID: "1", S_Name: "Müller", S_Vorname: "Max", S_AHV: "756.1111.1111.11",
        P_ERZ1_ID: "PARENT-001", P_ERZ1_Name: "Juhász", P_ERZ1_Vorname: "Krisztián"
      },
      { 
        S_ID: "2", S_Name: "Müller", S_Vorname: "Anna", S_AHV: "756.2222.2222.22",
        P_ERZ1_ID: "PARENT-001", P_ERZ1_Name: "Juhasz", P_ERZ1_Vorname: "Krisztian"
      },
    ];

    const errors = validateData(rows, testColumns);
    
    // The non-accented versions should be auto-corrected to the accented ones
    const diacriticCorrections = errors.filter(e => e.message.includes("Diakritische Korrektur"));
    expect(diacriticCorrections.length).toBe(2); // Name + Vorname
    
    const nameCorrection = diacriticCorrections.find(e => e.column === "P_ERZ1_Name");
    expect(nameCorrection).toBeDefined();
    expect(nameCorrection!.correctedValue).toBe("Juhász");
    expect(nameCorrection!.row).toBe(2);
    
    const vornameCorrection = diacriticCorrections.find(e => e.column === "P_ERZ1_Vorname");
    expect(vornameCorrection).toBeDefined();
    expect(vornameCorrection!.correctedValue).toBe("Krisztián");
  });

  it("should auto-correct 'Moos' to 'Môos' (circumflex) and detect ID inconsistency", () => {
    const rows: ParsedRow[] = [
      { 
        S_ID: "9000389", S_Name: "Meier", S_Vorname: "Tanishqa", S_AHV: "756.7279.8570.47",
        P_ERZ1_ID: "756631abc", P_ERZ1_Name: "Môos", P_ERZ1_Vorname: "Rolf", P_ERZ1_Strasse: "Pupilstr. 43"
      },
      { 
        S_ID: "9000390", S_Name: "Moos", S_Vorname: "Anuar", S_AHV: "756.9842.7430.67",
        P_ERZ1_ID: "756631", P_ERZ1_Name: "Moos", P_ERZ1_Vorname: "Rolf", P_ERZ1_Strasse: "Pupilstr. 43"
      },
    ];

    const errors = validateData(rows, testColumns);
    
    // Should detect inconsistent parent ID (756631abc vs 756631)
    const inconsistentIds = errors.filter(e => e.message.includes("Inkonsistente ID"));
    expect(inconsistentIds.length).toBeGreaterThan(0);
    
    // Should auto-correct "Moos" → "Môos" 
    const diacriticCorrections = errors.filter(e => e.message.includes("Diakritische Korrektur") && e.column === "P_ERZ1_Name");
    expect(diacriticCorrections.length).toBe(1);
    expect(diacriticCorrections[0].correctedValue).toBe("Môos");
    expect(diacriticCorrections[0].row).toBe(2);
});

describe("Name-only Address Disambiguation", () => {
  it("should warn when same name, different address, but same phone number", () => {
    const rows: ParsedRow[] = [
      {
        S_ID: "1", S_Name: "Kind", S_Vorname: "Lara", S_AHV: "756.1111.1111.11",
        P_ERZ1_ID: "PARENT-001", P_ERZ1_Name: "Meier", P_ERZ1_Vorname: "Sandra",
        P_ERZ1_Strasse: "Hauptstr. 10", P_ERZ1_TelefonPrivat: "044 123 45 67",
      },
      {
        S_ID: "2", S_Name: "Kind", S_Vorname: "Tim", S_AHV: "756.2222.2222.22",
        P_ERZ1_ID: "PARENT-999", P_ERZ1_Name: "Meier", P_ERZ1_Vorname: "Sandra",
        P_ERZ1_Strasse: "Bergweg 5", P_ERZ1_TelefonPrivat: "044 123 45 67",
      },
    ];

    const errors = validateData(rows, testColumns);
    const inconsistentIds = errors.filter(e => e.message.includes("Inkonsistente ID"));
    expect(inconsistentIds.length).toBeGreaterThan(0);
    expect(inconsistentIds.some(e => e.row === 2)).toBe(true);
  });

  it("should warn when same name, different address, no phone match, but same other EB", () => {
    const rows: ParsedRow[] = [
      {
        S_ID: "1", S_Name: "Kind", S_Vorname: "Lara", S_AHV: "756.1111.1111.11",
        P_ERZ1_ID: "PARENT-001", P_ERZ1_Name: "Meier", P_ERZ1_Vorname: "Sandra",
        P_ERZ1_Strasse: "Hauptstr. 10",
        P_ERZ2_ID: "PARENT-050", P_ERZ2_Name: "Meier", P_ERZ2_Vorname: "Thomas",
      },
      {
        S_ID: "2", S_Name: "Kind", S_Vorname: "Tim", S_AHV: "756.2222.2222.22",
        P_ERZ1_ID: "PARENT-999", P_ERZ1_Name: "Meier", P_ERZ1_Vorname: "Sandra",
        P_ERZ1_Strasse: "Bergweg 5",
        P_ERZ2_ID: "PARENT-050", P_ERZ2_Name: "Meier", P_ERZ2_Vorname: "Thomas",
      },
    ];

    const errors = validateData(rows, testColumns);
    const inconsistentIds = errors.filter(e => e.message.includes("Inkonsistente ID") && e.column === "P_ERZ1_ID");
    expect(inconsistentIds.length).toBeGreaterThan(0);
    expect(inconsistentIds.some(e => e.row === 2)).toBe(true);
  });

  it("should NOT warn when same name, different address, no phone match, different other EB", () => {
    const rows: ParsedRow[] = [
      {
        S_ID: "1", S_Name: "Kind", S_Vorname: "Lara", S_AHV: "756.1111.1111.11",
        P_ERZ1_ID: "PARENT-001", P_ERZ1_Name: "Meier", P_ERZ1_Vorname: "Sandra",
        P_ERZ1_Strasse: "Hauptstr. 10",
        P_ERZ2_ID: "PARENT-050", P_ERZ2_Name: "Meier", P_ERZ2_Vorname: "Thomas",
      },
      {
        S_ID: "2", S_Name: "Kind", S_Vorname: "Tim", S_AHV: "756.2222.2222.22",
        P_ERZ1_ID: "PARENT-999", P_ERZ1_Name: "Meier", P_ERZ1_Vorname: "Sandra",
        P_ERZ1_Strasse: "Bergweg 5",
        P_ERZ2_ID: "PARENT-060", P_ERZ2_Name: "Huber", P_ERZ2_Vorname: "Markus",
      },
    ];

    const errors = validateData(rows, testColumns);
    const inconsistentIds = errors.filter(e => e.message.includes("Inkonsistente ID") && e.column === "P_ERZ1_ID");
    expect(inconsistentIds.length).toBe(0);
  });
});
});

describe("Error Correction Simulation", () => {
  it("should allow marking errors as corrected", () => {
    const errors: ValidationError[] = [
      { row: 1, column: "S_AHV", value: "756.1234.5678.90", message: "Duplikat" },
      { row: 2, column: "S_AHV", value: "756.1234.5678.90", message: "Duplikat" },
    ];

    // Simulate applying corrections (as the UI would do)
    const correctedErrors = errors.map(e => ({
      ...e,
      correctedValue: e.value // Mark as corrected with same value (merged)
    }));

    // Check that all errors now have correctedValue
    expect(correctedErrors.every(e => e.correctedValue !== undefined)).toBe(true);
    
    // Simulate filtering for uncorrected errors (as UI does)
    const uncorrectedErrors = correctedErrors.filter(e => e.correctedValue === undefined);
    expect(uncorrectedErrors.length).toBe(0);
  });

  it("should track master record selection for duplicates", () => {
    const duplicateRows = [
      { row: 1, email: "max@test.ch", phone: "079 123 45 67" },
      { row: 2, email: "max.mueller@test.ch", phone: "079 123 45 67" },
      { row: 3, email: "max@test.ch", phone: "078 999 88 77" },
    ];

    // Simulate selecting row 1 as master
    const selectedMasterRow = 1;
    const masterData = duplicateRows.find(r => r.row === selectedMasterRow)!;

    // Simulate generating corrections
    const corrections: { row: number; column: string; value: string }[] = [];
    
    duplicateRows.forEach(rowInfo => {
      if (rowInfo.row !== selectedMasterRow) {
        // Apply master's email to other rows
        if (rowInfo.email !== masterData.email) {
          corrections.push({ row: rowInfo.row, column: "S_Email", value: masterData.email });
        }
        // Apply master's phone to other rows
        if (rowInfo.phone !== masterData.phone) {
          corrections.push({ row: rowInfo.row, column: "S_Phone", value: masterData.phone });
        }
      }
    });

    // Row 2 should get email correction (different email)
    expect(corrections.some(c => c.row === 2 && c.column === "S_Email")).toBe(true);
    // Row 3 should get phone correction (different phone)
    expect(corrections.some(c => c.row === 3 && c.column === "S_Phone")).toBe(true);
    // Row 2 should NOT get phone correction (same phone)
    expect(corrections.some(c => c.row === 2 && c.column === "S_Phone")).toBe(false);
  });
});

describe("Bulk Correction Application", () => {
  it("should correctly apply bulk corrections to rows", () => {
    const rows: ParsedRow[] = [
      { S_ID: "1", S_Name: "MÜLLER", S_Vorname: "MAX", S_Email: "max@test.ch" },
      { S_ID: "2", S_Name: "SCHMIDT", S_Vorname: "ANNA", S_Email: "anna@test.ch" },
    ];

    const corrections = [
      { row: 1, column: "S_Name", value: "Müller" },
      { row: 1, column: "S_Vorname", value: "Max" },
      { row: 2, column: "S_Name", value: "Schmidt" },
      { row: 2, column: "S_Vorname", value: "Anna" },
    ];

    // Simulate applying corrections
    const updatedRows = rows.map((row, index) => {
      const rowNum = index + 1;
      const rowCorrections = corrections.filter(c => c.row === rowNum);
      
      if (rowCorrections.length === 0) return row;
      
      const updatedRow = { ...row };
      rowCorrections.forEach(c => {
        updatedRow[c.column] = c.value;
      });
      return updatedRow;
    });

    expect(updatedRows[0].S_Name).toBe("Müller");
    expect(updatedRows[0].S_Vorname).toBe("Max");
    expect(updatedRows[1].S_Name).toBe("Schmidt");
    expect(updatedRows[1].S_Vorname).toBe("Anna");
  });
});
