"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/src/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  FileText,
  Loader2,
  Edit,
  Save,
  X,
  Plus,
  Trash2,
  AlertTriangle,
  Download,
  FileSpreadsheet,
  Repeat,
  Check,
  ChevronDown
} from "lucide-react";
import { API_URL } from "@/src/lib/api";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface CostSheetRow {
  _id?: string;
  partName: string;
  partNumber: string;
  materialName: string;
  selectedLoop?: string[];
  values: Record<string, string>;
}

interface CustomIncludeOption {
  key: string;
  label: string;
  checked: boolean;
}

interface CustomColumn {
  key: string;
  name: string;
  hasMetadata?: boolean;
  hasCycleTime?: boolean;
  hasTooling?: boolean;
  defaultRate: number;
  customIncludes?: CustomIncludeOption[];
  linkedMachine?: string;
}

interface CostSheetData {
  _id?: string;
  month: string; // YYYY-MM
  rows: CostSheetRow[];
  customColumns?: CustomColumn[];
}

interface MaterialRateRow {
  designation: string;
  values: Record<string, string>;
}

interface MaterialRateData {
  month: string;
  rows: MaterialRateRow[];
}

interface MachineHourRateData {
  machine: string;
  values: Record<string, string>;
}

// Convert YYYY-MM to MMM-YY (e.g. 2026-06 -> Jun-26)
const formatMonthLabel = (monthStr: string) => {
  if (!monthStr || !monthStr.includes("-")) return monthStr;
  const [year, month] = monthStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  const formatted = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  return formatted.replace(" ", "-");
};

// Helper to split long process names into lines of at most maxLen characters
const formatProcessName = (name: string, maxLen: number = 12) => {
  const words = name.split(" ");
  const lines: string[] = [];
  let currentLine = "";
  
  words.forEach(word => {
    if ((currentLine + " " + word).trim().length > maxLen) {
      if (currentLine) {
        lines.push(currentLine.trim());
      }
      currentLine = word;
    } else {
      currentLine = (currentLine + " " + word).trim();
    }
  });
  if (currentLine) {
    lines.push(currentLine.trim());
  }
  return lines;
};

// Fixed list of process configurations matching columns in spreadsheet
const PROCESS_CONFIGS = [
  { key: "annealing", name: "Annealing", hasTooling: false, defaultRate: 0.046, dbMachine: "Annealing" },
  { key: "heat_treatment", name: "Heat Treatment", hasTooling: false, defaultRate: 0.105, dbMachine: "Heat Treatment" },
  { key: "cnc_turning_1st_setup", name: "CNC Turning 1st setup", hasTooling: true, defaultRate: 0.066, dbMachine: "CNC" },
  { key: "cnc_turning_2nd_setup", name: "CNC Turning 2nd setup", hasTooling: true, defaultRate: 0.066, dbMachine: "CNC" },
  { key: "cnc_turning_3rd_setup", name: "CNC Turning 3rd setup", hasTooling: true, defaultRate: 0.066, dbMachine: "CNC" },
  { key: "cnc_turning_muratec", name: "CNC Turning Muratec", hasTooling: true, defaultRate: 0.201, dbMachine: "Muratec" },
  { key: "gcl_60_centerless_grinding", name: "GCL 60 Centerless grinding", hasTooling: true, defaultRate: 0.112, dbMachine: "Grinding GCL 100" },
  { key: "paragan_centerless_grinding", name: "Paragan Centerless grinding", hasTooling: true, defaultRate: 0.179, dbMachine: "Paragan Grinding" },
  { key: "vibrofinishing", name: "Vibrofinishing", hasTooling: true, defaultRate: 0.030, dbMachine: "Vibrofinishing" },
  { key: "metrology", name: "Metrology", hasTooling: false, isSpecialMetrology: true, defaultRate: 0.084, dbMachine: "Metrology" },
  { key: "ultrasonic_cleaning", name: "Ultrasonic cleaning", hasTooling: true, defaultRate: 0.075, dbMachine: "Ultrasonic Cleaning" },
  { key: "100_dimension_inspection", name: "100% Dimension inspection", hasTooling: false, defaultRate: 0.035, dbMachine: "Laser Marking" },
  { key: "marking", name: "Marking", hasTooling: false, defaultRate: 0.065, dbMachine: "Laser Marking" },
  { key: "packing_cost", name: "Packing cost", hasTooling: false, isSpecialPacking: true, defaultRate: 0.035, dbMachine: "Vibrofinishing" }
];

interface EditableInputProps {
  value: string;
  onChange: (val: string) => void;
  onClose: () => void;
  className?: string;
  placeholder?: string;
  type?: string;
}

function EditableInput({ value, onChange, onClose, className, placeholder, type = "text" }: EditableInputProps) {
  const [tempVal, setTempVal] = useState(value);
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onChange(tempVal);
      onClose();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  const handleBlur = () => {
    onChange(tempVal);
    onClose();
  };

  return (
    <Input
      type={type}
      value={tempVal}
      onChange={(e) => setTempVal(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className={className}
      placeholder={placeholder}
      autoFocus
    />
  );
}

interface EditableSelectProps {
  value: string;
  options: string[];
  onChange: (val: string) => void;
  onClose: () => void;
  className?: string;
}

function EditableSelect({ value, options, onChange, onClose, className }: EditableSelectProps) {
  return (
    <Select
      value={value}
      onValueChange={(val) => {
        onChange(val);
        onClose();
      }}
      open={true}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder="Select Material" />
      </SelectTrigger>
      <SelectContent>
        {options.map(des => (
          <SelectItem key={des} value={des} className="text-xs uppercase font-semibold">
            {des}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function FinalCostSheetView() {
  const { user: currentUser } = useAuth();

  // Data States
  const [costSheets, setCostSheets] = useState<CostSheetData[]>([]);
  const [activeMonth, setActiveMonth] = useState<string>("");
  const [materialRates, setMaterialRates] = useState<MaterialRateData[]>([]);
  const [machineRates, setMachineRates] = useState<MachineHourRateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editBackup, setEditBackup] = useState<CostSheetData | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Inline editing active cell tracking states
  const [activeEditCell, setActiveEditCell] = useState<{ rowIndex: number; fieldKey: string } | null>(null);
  const [activeEditRateKey, setActiveEditRateKey] = useState<string | null>(null);

  const isCellEditing = (rIdx: number, fKey: string) => 
    isEditing && activeEditCell?.rowIndex === rIdx && activeEditCell?.fieldKey === fKey;

  // Formula Modal states
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [formulaValue, setFormulaValue] = useState("");
  const [formulaConfig, setFormulaConfig] = useState<{
    title: string;
    description: string;
    targetFormulaKey: string;
    defaultFormula: string;
    variables: Array<{ key: string; label: string; value: string; type?: "field" | "column" }>;
  } | null>(null);
  const formulaInputRef = useRef<HTMLInputElement>(null);

  const insertVariable = (varKey: string) => {
    const input = formulaInputRef.current;
    if (!input) {
      setFormulaValue(prev => prev + `[${varKey}]`);
      return;
    }
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    const text = input.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const newFormula = before + `[${varKey}]` + after;
    setFormulaValue(newFormula);
    
    setTimeout(() => {
      input.focus();
      const newCursorPos = start + varKey.length + 2;
      input.setSelectionRange(newCursorPos, newCursorPos);
    }, 50);
  };

  const handleApplyFormula = () => {
    if (!formulaConfig) return;
    const trimmed = formulaValue.trim();
    if (!trimmed) {
      toast.error("Formula expression cannot be empty");
      return;
    }

    if (costSheets.length > 0) {
      let parsed = trimmed;
      formulaConfig.variables.forEach(v => {
        parsed = parsed.replaceAll(`[${v.key}]`, "1.0");
      });
      try {
        const sanitized = parsed.replace(/[^0-9a-zA-Z_+\-*/().\s?<>:=!|&,]/g, "");
        const evalFunc = new Function("Math", `return (${sanitized});`);
        const result = evalFunc(Math);
        if (isNaN(result) || !isFinite(result)) {
          toast.error("Formula evaluates to an invalid number");
          return;
        }
      } catch (err) {
        toast.error(`Invalid formula syntax: ${err instanceof Error ? err.message : "Error"}`);
        return;
      }
    }

    const targetKey = formulaConfig.targetFormulaKey;
    setCostSheets(prev => {
      const updated = [...prev];
      const index = updated.findIndex(r => r.month === activeMonth);
      if (index > -1) {
        const sheet = { ...updated[index] };
        sheet.rows = sheet.rows.map(row => ({
          ...row,
          values: {
            ...row.values,
            [targetKey]: trimmed
          }
        }));
        updated[index] = sheet;
      }
      return updated;
    });

    toast.success(`${formulaConfig.title.replace("Edit ", "").replace(" Formula", "")} formula updated!`);
    setShowFormulaModal(false);
    setFormulaConfig(null);
  };

  const evaluateFormula = (formulaStr: string, variables: Record<string, number>) => {
    let parsed = formulaStr;
    Object.keys(variables).forEach((key) => {
      parsed = parsed.replaceAll(`[${key}]`, String(variables[key]));
    });

    try {
      const sanitized = parsed.replace(/[^0-9a-zA-Z_+\-*/().\s?<>:=!|&,]/g, "");
      const evalFunc = new Function("Math", `return (${sanitized});`);
      const result = evalFunc(Math);
      return isNaN(result) || !isFinite(result) ? 0 : result;
    } catch (e) {
      console.error("Error evaluating formula", formulaStr, e);
      return 0;
    }
  };

  // Manual Rates overrides (Row 3 in spreadsheet, default populated from DB/defaults)
  const [columnRates, setColumnRates] = useState<Record<string, string>>({});

  // Delete Month States & Ref
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [deleteMonthTarget, setDeleteMonthTarget] = useState<string | null>(null);
  const [deletingMonthStatus, setDeletingMonthStatus] = useState(false);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);



  // Add Custom Part Modal state
  const [showAddPartModal, setShowAddPartModal] = useState(false);
  const [newPartName, setNewPartName] = useState("");
  const [newPartNumber, setNewPartNumber] = useState("");
  const [newPartMaterial, setNewPartMaterial] = useState("");
  const [newPartLoop, setNewPartLoop] = useState<string[]>([]);
  const [showAddStepDropdown, setShowAddStepDropdown] = useState(false);

  // Add Dynamic Column Modal state
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColHasCycleTime, setNewColHasCycleTime] = useState(false);
  const [newColHasTooling, setNewColHasTooling] = useState(false);
  const [newColLinkedMachine, setNewColLinkedMachine] = useState("");
  const [newColCustomIncludes, setNewColCustomIncludes] = useState<CustomIncludeOption[]>([]);
  const [newCustomIncludeName, setNewCustomIncludeName] = useState("");
  const [showAddCustomIncludeInput, setShowAddCustomIncludeInput] = useState(false);
  
  // Edit Dynamic Column Modal state
  const [showEditColumnModal, setShowEditColumnModal] = useState(false);
  const [editingColumnKey, setEditingColumnKey] = useState("");
  const [editingColumnName, setEditingColumnName] = useState("");
  const [editingColumnHasCycleTime, setEditingColumnHasCycleTime] = useState(false);
  const [editingColumnHasTooling, setEditingColumnHasTooling] = useState(false);
  const [editingColLinkedMachine, setEditingColLinkedMachine] = useState("");
  const [editingColCustomIncludes, setEditingColCustomIncludes] = useState<CustomIncludeOption[]>([]);
  const [editCustomIncludeName, setEditCustomIncludeName] = useState("");
  const [showEditAddCustomIncludeInput, setShowEditAddCustomIncludeInput] = useState(false);

  const [availableEquipments, setAvailableEquipments] = useState<string[]>([]);

  const isSuperAdmin = currentUser?.role === "super-admin";

  interface FCSUser {
    _id: string;
    name: string;
    email: string;
  }
  const [fcsUsers, setFcsUsers] = useState<FCSUser[]>([]);
  // key = proc.key or col.key, value = array of user IDs assigned
  const [columnUserAssignments, setColumnUserAssignments] = useState<Record<string, string[]>>({});

  // Helper to evaluate dynamic costPerSecond for machines
  const calculateMachineRates = (rawRates: any[], equipments: any[], operators: any[], settings: any) => {
    return rawRates.map((r) => {
      const vals = r.values || {};
      const machineName = r.machine;

      // Labour Subtotal
      let labourSubtotal = 0;
      const selectedLabour = vals.selected_labour ? vals.selected_labour.split(",").filter(Boolean) : operators.map((o: any) => o.designation);

      selectedLabour.forEach((dest: string) => {
        const destLower = dest.toLowerCase();
        const allocKey = `${destLower.replace(/[^a-z0-9]/g, "_")}_alloc`;
        const allocVal = parseFloat(vals[allocKey] || "0") || 0;

        let rate = 127.25; // default fallback
        const foundOp = operators.find((o: any) => o.designation.toLowerCase() === destLower);
        if (foundOp) {
          rate = (parseFloat(foundOp.values.grand_total) || 0) / 8;
        }

        const formulaStr = vals[`${destLower.replace(/[^a-z0-9]/g, "_")}_formula`] || "[alloc] * [rate]";
        let cost = 0;
        let parsed = formulaStr.replaceAll("[alloc]", String(allocVal)).replaceAll("[rate]", String(rate));
        try {
          const evalFunc = new Function(`return (${parsed.replace(/[^0-9+\-*/().\s]/g, "")});`);
          cost = evalFunc() || 0;
        } catch {
          cost = destLower.includes("operator") ? allocVal * rate : (allocVal > 0 ? rate / allocVal : 0);
        }
        labourSubtotal += cost;
      });

      // Depreciation & Interest
      const eqRow = equipments.find((eq: any) => eq.designation.toLowerCase() === machineName.toLowerCase());
      const depInterestTotal = eqRow ? (parseFloat(eqRow.values.total) || 0) : 0;

      // Power Cost
      const power = eqRow ? parseFloat(eqRow.values.power || "0") : 0;
      const powerFactor = eqRow ? parseFloat(eqRow.values.power_factor || "0") : 0;
      const rangeValue = eqRow ? parseFloat(eqRow.values.range_value || "0") : 0;
      const universalPowerVal = parseFloat(settings.power_universal_value || "8") || 8;
      const powerCost = ((power * powerFactor) * rangeValue) / universalPowerVal;

      const consumables = parseFloat(vals.consumables_cost) || 0;
      const maintenance = parseFloat(vals.maintenance_cost) || 0;
      const rent = parseFloat(vals.rent_cost) || 0;
      const wiring = parseFloat(vals.wiring_cost) || 0;

      const totalMhr = depInterestTotal + labourSubtotal + powerCost + consumables + maintenance + rent + wiring;
      const utFactor = parseFloat(vals.utilisation_factor) || 100;
      const utilisationCost = totalMhr / (utFactor / 100);
      const costPerSecond = utilisationCost / 3600;

      return {
        machine: machineName,
        values: {
          ...vals,
          cost_per_second: costPerSecond.toFixed(4)
        }
      };
    });
  };

  const handleMonthClick = (month: string, canDelete: boolean) => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      if (canDelete) {
        setShowMonthDropdown(false);
        setDeleteMonthTarget(month);
      }
    } else {
      clickTimerRef.current = setTimeout(() => {
        setActiveMonth(month);
        setShowMonthDropdown(false);
        clickTimerRef.current = null;
      }, 250);
    }
  };

  const handleDeleteMonthConfirm = async () => {
    if (!deleteMonthTarget) return;
    setDeletingMonthStatus(true);
    try {
      const response = await fetch(`${API_URL}/api/final-cost-sheet/${deleteMonthTarget}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${currentUser?.token}` }
      });

      if (response.ok) {
        toast.success(`Deleted sheet for ${formatMonthLabel(deleteMonthTarget)} successfully`);
        setDeleteMonthTarget(null);
        await fetchData(); // reload data
      } else {
        const errData = await response.json();
        toast.error(errData.message || "Failed to delete month sheet");
      }
    } catch (error) {
      console.error("Error deleting month sheet:", error);
      toast.error("An error occurred during deletion");
    } finally {
      setDeletingMonthStatus(false);
    }
  };

  const handleRowLoopChange = (rowIndex: number, newLoop: string[]) => {
    if (!activeMonth) return;

    setCostSheets(prev => {
      const updated = [...prev];
      const index = updated.findIndex(r => r.month === activeMonth);
      if (index > -1) {
        const sheet = { ...updated[index] };
        const updatedRows = [...sheet.rows];
        updatedRows[rowIndex] = {
          ...updatedRows[rowIndex],
          selectedLoop: newLoop
        };
        sheet.rows = updatedRows;
        updated[index] = sheet;
      }
      return updated;
    });
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch Final Cost Sheets
      const sheetResponse = await fetch(`${API_URL}/api/final-cost-sheet`, {
        headers: { Authorization: `Bearer ${currentUser?.token}` }
      });
      let sheetsData: CostSheetData[] = [];
      if (sheetResponse.ok) {
        sheetsData = await sheetResponse.json();
        setCostSheets(sheetsData);
      }

      // Fetch Material Rates
      const matResponse = await fetch(`${API_URL}/api/material-rate`, {
        headers: { Authorization: `Bearer ${currentUser?.token}` }
      });
      if (matResponse.ok) {
        const matData = await matResponse.json();
        setMaterialRates(matData);
      }

      // Fetch Machine rates and compute cost per second
      const eqResponse = await fetch(`${API_URL}/api/equipment-table`, {
        headers: { Authorization: `Bearer ${currentUser?.token}` }
      });
      let eqList = [];
      if (eqResponse.ok) {
        const eqData = await eqResponse.json();
        eqList = eqData.rows || [];
      }

      const opResponse = await fetch(`${API_URL}/api/operator-table`, {
        headers: { Authorization: `Bearer ${currentUser?.token}` }
      });
      let opList = [];
      if (opResponse.ok) {
        const opData = await opResponse.json();
        opList = opData.rows || [];
      }

      const mhrResponse = await fetch(`${API_URL}/api/machine-hour-rate`, {
        headers: { Authorization: `Bearer ${currentUser?.token}` }
      });
      let mhrList = [];
      if (mhrResponse.ok) {
        mhrList = await mhrResponse.json();
      }

      const designations = new Set<string>();
      eqList.forEach((eq: any) => {
        if (eq.designation) designations.add(eq.designation);
      });
      mhrList.forEach((mhr: any) => {
        if (mhr.machine) designations.add(mhr.machine);
      });
      setAvailableEquipments(Array.from(designations).sort());

      const settingsResponse = await fetch(`${API_URL}/api/system-settings`, {
        headers: { Authorization: `Bearer ${currentUser?.token}` }
      });
      let systemSettings = { power_universal_value: "8" };
      if (settingsResponse.ok) {
        systemSettings = await settingsResponse.json();
      }

      const calculatedMhr = calculateMachineRates(mhrList, eqList, opList, systemSettings);
      setMachineRates(calculatedMhr);

      // Fetch Users list
      const usersResponse = await fetch(`${API_URL}/api/users`, {
        headers: { Authorization: `Bearer ${currentUser?.token}` }
      });
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setFcsUsers(usersData.filter((u: any) => u.role !== "super-admin"));
      }

      // Load column user assignments from system settings
      if (systemSettings && (systemSettings as any).final_cost_sheet_user_assignments) {
        try {
          const parsed = JSON.parse((systemSettings as any).final_cost_sheet_user_assignments);
          setColumnUserAssignments(parsed || {});
        } catch {
          setColumnUserAssignments({});
        }
      }

      if (sheetsData.length > 0) {
        setActiveMonth(sheetsData[0].month);
      }
    } catch (error) {
      console.error("Error loading final cost sheet data:", error);
      toast.error("Failed to load required cost sheets and rates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  // Save column user assignments to system settings
  const saveColumnAssignments = async (assignments: Record<string, string[]>) => {
    try {
      await fetch(`${API_URL}/api/system-settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentUser?.token}`
        },
        body: JSON.stringify({ key: "final_cost_sheet_user_assignments", value: JSON.stringify(assignments) })
      });
    } catch (err) {
      console.error("Error saving column user assignments:", err);
    }
  };

  // Toggle user assignment for a process/column key
  const handleToggleColumnUser = (procKey: string, userId: string) => {
    const current = columnUserAssignments[procKey] || [];
    const updated = current.includes(userId)
      ? current.filter(id => id !== userId)
      : [...current, userId];
    const newAssignments = { ...columnUserAssignments, [procKey]: updated };
    setColumnUserAssignments(newAssignments);
    saveColumnAssignments(newAssignments);
  };

  // Check if current user can edit cells in a given column/process
  const canEditProcess = (procKey: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === "super-admin") return true;
    const assigned = columnUserAssignments[procKey] || [];
    return assigned.includes(String(currentUser._id));
  };

  // Active Cost Sheet document selection
  const activeDocument = useMemo(() => {
    if (!activeMonth || !Array.isArray(costSheets)) return null;
    return costSheets.find(r => r.month === activeMonth) || null;
  }, [activeMonth, costSheets]);

  const rows = useMemo(() => activeDocument?.rows || [], [activeDocument]);


  const customColumns = useMemo(() => {
    return activeDocument?.customColumns || [];
  }, [activeDocument]);

  const allProcesses = useMemo(() => {
    const customCols = activeDocument?.customColumns || [];
    return [
      ...PROCESS_CONFIGS.map(p => ({
        ...p,
        isStatic: true,
        hasMetadata: false,
        hasCycleTime: !p.isSpecialMetrology,
        hasTooling: !!p.hasTooling
      })),
      ...customCols.map(c => ({
        key: c.key,
        name: c.name,
        defaultRate: c.defaultRate || 0,
        isStatic: false,
        hasMetadata: !!c.hasMetadata,
        hasTooling: !!c.hasTooling,
        hasCycleTime: !!c.hasCycleTime,
        isSpecialMetrology: false,
        isSpecialPacking: false,
        dbMachine: "",
        customIncludes: c.customIncludes || [],
        linkedMachine: c.linkedMachine
      }))
    ];
  }, [activeDocument]);

  // Active Month Material Rates Map
  const materialRatesMap = useMemo(() => {
    const activeMatRate = materialRates.find(r => r.month === activeMonth);
    const map = new Map<string, { rate: number; scrap: number; originalName: string }>();
    if (activeMatRate && activeMatRate.rows) {
      activeMatRate.rows.forEach(r => {
        const rate = parseFloat(r.values.rate_per_kg) || 0;
        const scrap = parseFloat(r.values.scrap_rate_per_kg) || 0;
        map.set(r.designation.toLowerCase().trim(), { rate, scrap, originalName: r.designation });
      });
    }
    return map;
  }, [activeMonth, materialRates]);

  // Fetch machine hour rate per second dynamically
  const machineSecRates = useMemo(() => {
    const rates: Record<string, number> = {};
    machineRates.forEach(r => {
      rates[r.machine.toLowerCase().trim()] = parseFloat(r.values.cost_per_second) || 0;
    });
    return rates;
  }, [machineRates]);

  // Initialize and maintain columns rates (manual overrides / row 3 in spreadsheet)
  useEffect(() => {
    if (!activeDocument) return;

    const initialRates: Record<string, string> = {
      foundry_conversion_rate: "110",
      rejection_percent: "5",
      overheads_percent: "18"
    };

    allProcesses.forEach(proc => {
      if (proc.isStatic) {
        const dbRate = machineSecRates[proc.dbMachine.toLowerCase().trim()];
        initialRates[proc.key] = dbRate ? dbRate.toFixed(4) : proc.defaultRate.toFixed(4);
      } else {
        initialRates[proc.key] = "0.0000";
      }
    });

    if (activeDocument.rows && activeDocument.rows.length > 0) {
      const firstRow = activeDocument.rows[0];
      if (firstRow.values.foundry_conversion_rate) {
        initialRates.foundry_conversion_rate = firstRow.values.foundry_conversion_rate;
      }
      if (firstRow.values.rejection_percent) {
        initialRates.rejection_percent = firstRow.values.rejection_percent;
      }
      if (firstRow.values.overheads_percent) {
        initialRates.overheads_percent = firstRow.values.overheads_percent;
      }
      allProcesses.forEach(proc => {
        const rateKey = `${proc.key}_rate_sec`;
        if (firstRow.values[rateKey]) {
          initialRates[proc.key] = firstRow.values[rateKey];
        }
      });
    }

    setColumnRates(initialRates);
  }, [activeDocument, machineSecRates, allProcesses]);

  // Helper to handle cell changes locally
  const handleCellChange = (rowIndex: number, key: string, value: string) => {
    if (!activeMonth) return;

    setCostSheets(prev => {
      const updated = [...prev];
      const index = updated.findIndex(r => r.month === activeMonth);
      if (index > -1) {
        const sheet = { ...updated[index] };
        const updatedRows = [...sheet.rows];
        updatedRows[rowIndex] = {
          ...updatedRows[rowIndex],
          values: {
            ...updatedRows[rowIndex].values,
            [key]: value
          }
        };
        sheet.rows = updatedRows;
        updated[index] = sheet;
      }
      return updated;
    });
  };

  // Helper to handle top level fields (partName, partNumber, materialName)
  const handleRowFieldChange = (rowIndex: number, field: "partName" | "partNumber" | "materialName", value: string) => {
    if (!activeMonth) return;

    setCostSheets(prev => {
      const updated = [...prev];
      const index = updated.findIndex(r => r.month === activeMonth);
      if (index > -1) {
        const sheet = { ...updated[index] };
        const updatedRows = [...sheet.rows];
        updatedRows[rowIndex] = {
          ...updatedRows[rowIndex],
          [field]: value
        };
        sheet.rows = updatedRows;
        updated[index] = sheet;
      }
      return updated;
    });
  };



  // Evaluate all calculated fields for a row
  // Evaluate all calculated fields for a row
  const calculateRowFields = (row: CostSheetRow) => {
    const vals = row.values || {};
    const matName = (row.materialName || "").toLowerCase().trim();

    const matData = materialRatesMap.get(matName) || { rate: 0, scrap: 0 };
    const ratePerKg = matData.rate;
    const scrapRatePerKg = matData.scrap;

    const roughWeight = parseFloat(vals.rough_casting_weight) || 0;
    const finishWeight = parseFloat(vals.finish_weight) || 0;
    const foundryRate = parseFloat(columnRates.foundry_conversion_rate) || 110;
    const semiMachiningCost = parseFloat(vals.semi_machining_cost) || 0;
    const sellingPrice = parseFloat(vals.selling_price) || 0;

    // Initialize all input variables
    const vars: Record<string, number> = {
      rough_casting_weight: roughWeight,
      finish_weight: finishWeight,
      rate_per_kg: ratePerKg,
      scrap_rate_per_kg: scrapRatePerKg,
      foundry_rate: foundryRate,
      semi_machining_cost: semiMachiningCost,
      selling_price: sellingPrice
    };

    let processCostsSum = 0;
    const evaluatedProcesses: Record<string, number> = {};

    allProcesses.forEach(proc => {
      const rateSec = parseFloat(columnRates[proc.key]) || proc.defaultRate;
      const defaultFormula = proc.isSpecialMetrology
        ? "[metrology_cost] / [production_quantity]"
        : (proc.isSpecialPacking
          ? "[cycle_time] * [rate_sec] + [packing_material_cost]"
          : (proc.hasTooling
            ? "[cycle_time] * [rate_sec] + [tooling_cost]"
            : "[cycle_time] * [rate_sec]"));
      const formulaStr = vals[`${proc.key}_total_cost_formula`] || defaultFormula;
      let cost = 0;

      if (row.selectedLoop && row.selectedLoop.length > 0) {
        row.selectedLoop.forEach((loopProcKey, idx) => {
          if (loopProcKey === proc.key) {
            const cycleTime = parseFloat(vals[`${proc.key}_${idx}_cycle_time`]) || 0;
            const prodQty = parseFloat(vals[`${proc.key}_${idx}_production_quantity`]) || 1000;
            const metrologyCost = parseFloat(vals[`${proc.key}_${idx}_cost`]) || 0;
            const packMatCost = parseFloat(vals[`${proc.key}_${idx}_packing_material_cost`]) || 0;
            const tooling = parseFloat(vals[`${proc.key}_${idx}_tooling_cost`]) || 0;

            const visitVars: Record<string, number> = {
              ...vars,
              cycle_time: cycleTime,
              rate_sec: rateSec,
              tooling_cost: tooling,
              packing_material_cost: packMatCost,
              metrology_cost: metrologyCost,
              production_quantity: prodQty
            };

            const customIncludes = (!proc.isStatic && (proc as any).customIncludes) || [];
            customIncludes.forEach((ci: any) => {
              if (ci.checked) {
                visitVars[ci.key] = parseFloat(vals[`${proc.key}_${idx}_custom_${ci.key}`]) || 0;
              }
            });

            cost += evaluateFormula(formulaStr, visitVars);
          }
        });
      } else {
        const cycleTime = parseFloat(vals[`${proc.key}_cycle_time`]) || 0;
        const prodQty = parseFloat(vals.metrology_production_quantity) || 1000;
        const metrologyCost = parseFloat(vals.metrology_cost) || 0;
        const packMatCost = parseFloat(vals.packing_cost_packing_material_cost) || 0;
        const tooling = parseFloat(vals[`${proc.key}_tooling_cost`]) || 0;

        const visitVars: Record<string, number> = {
          ...vars,
          cycle_time: cycleTime,
          rate_sec: rateSec,
          tooling_cost: tooling,
          packing_material_cost: packMatCost,
          metrology_cost: metrologyCost,
          production_quantity: prodQty
        };

        const customIncludes = (!proc.isStatic && (proc as any).customIncludes) || [];
        customIncludes.forEach((ci: any) => {
          if (ci.checked) {
            visitVars[ci.key] = parseFloat(vals[`${proc.key}_custom_${ci.key}`]) || 0;
          }
        });

        cost = evaluateFormula(formulaStr, visitVars);
      }

      evaluatedProcesses[proc.key] = cost;
      processCostsSum += cost;
      vars[proc.key] = cost; // Add individual process cost as a variable

      const customIncludes = (!proc.isStatic && (proc as any).customIncludes) || [];
      customIncludes.forEach((ci: any) => {
        if (ci.checked) {
          vars[`${proc.key}_custom_${ci.key}`] = parseFloat(vals[`${proc.key}_custom_${ci.key}`]) || 0;
        }
      });
    });

    vars.process_costs_sum = processCostsSum;

    const originRawComponentCost = evaluateFormula(
      vals.origin_raw_material_cost_component_formula || "[finish_weight] * [rate_per_kg]",
      vars
    );
    vars.origin_raw_material_cost_component = originRawComponentCost;

    const scrapRawComponentCost = evaluateFormula(
      vals.scrap_raw_material_cost_component_formula || "[finish_weight] * [scrap_rate_per_kg]",
      vars
    );
    vars.scrap_raw_material_cost_component = scrapRawComponentCost;

    const foundryConversionCost = evaluateFormula(
      vals.foundry_conversion_cost_component_formula || "Math.max(0, ([rough_casting_weight] - 1.0) * [foundry_rate])",
      vars
    );
    vars.foundry_conversion_cost_component = foundryConversionCost;

    const subTotalRaw = evaluateFormula(
      vals.subtotal_cost_rm_formula || "[origin_raw_material_cost_component] + [foundry_conversion_cost_component] + [semi_machining_cost] + [process_costs_sum]",
      vars
    );
    vars.subtotal_cost_rm = subTotalRaw;

    const subTotalScrap = evaluateFormula(
      vals.subtotal_cost_scrap_formula || "[scrap_raw_material_cost_component] + [foundry_conversion_cost_component] + [semi_machining_cost] + [process_costs_sum]",
      vars
    );
    vars.subtotal_cost_scrap = subTotalScrap;

    const rejPct = (parseFloat(columnRates.rejection_percent) || 5) / 100;
    const ovhPct = (parseFloat(columnRates.overheads_percent) || 18) / 100;

    let rejectionFormula = vals.rejection_cost_scrap_formula || `[subtotal_cost_rm] * ${rejPct}`;
    if (rejectionFormula === "[subtotal_cost_scrap] * 0.05" || rejectionFormula === `[subtotal_cost_scrap] * ${rejPct}`) {
      rejectionFormula = `[subtotal_cost_rm] * ${rejPct}`;
    }
    // If the formula is still the old hardcoded default, update it to use current %
    if (rejectionFormula === "[subtotal_cost_rm] * 0.05") {
      rejectionFormula = `[subtotal_cost_rm] * ${rejPct}`;
    }
    const rejectionScrap = evaluateFormula(rejectionFormula, vars);
    vars.rejection_cost_scrap = rejectionScrap;

    let overheadsFormula = vals.overheads_rm_formula || `[subtotal_cost_rm] * ${ovhPct}`;
    // If the formula is still the old hardcoded default, update it to use current %
    if (overheadsFormula === "[subtotal_cost_rm] * 0.18") {
      overheadsFormula = `[subtotal_cost_rm] * ${ovhPct}`;
    }
    const overheads = evaluateFormula(overheadsFormula, vars);
    vars.overheads_rm = overheads;

    const grandTotalRaw = evaluateFormula(
      vals.grand_total_cost_rm_formula || "[subtotal_cost_rm] + [overheads_rm]",
      vars
    );
    vars.grand_total_cost_rm = grandTotalRaw;

    const grandTotalScrap = evaluateFormula(
      vals.grand_total_cost_scrap_formula || "([subtotal_cost_scrap] + [rejection_cost_scrap]) * 1.10",
      vars
    );
    vars.grand_total_cost_scrap = grandTotalScrap;

    const profitRs = evaluateFormula(
      vals.profit_rs_formula || "[selling_price] > 0 ? ([selling_price] - [grand_total_cost_rm]) : 0",
      vars
    );
    vars.profit_rs = profitRs;

    const profitPercent = evaluateFormula(
      vals.profit_percent_formula || "[selling_price] > 0 ? (([selling_price] - [grand_total_cost_rm]) / [selling_price]) * 100 : 0",
      vars
    );
    vars.profit_percent = profitPercent;

    const rawMaterialPercent = evaluateFormula(
      vals.raw_material_percent_formula || "[selling_price] > 0 ? ([origin_raw_material_cost_component] / [selling_price]) * 100 : 0",
      vars
    );
    vars.raw_material_percent = rawMaterialPercent;

    const foundryConversionPercent = evaluateFormula(
      vals.foundry_conversion_percent_formula || "[selling_price] > 0 ? ([foundry_conversion_cost_component] / [selling_price]) * 100 : 0",
      vars
    );
    vars.foundry_conversion_percent = foundryConversionPercent;

    return {
      ratePerKg,
      scrapRatePerKg,
      originRawComponentCost,
      scrapRawComponentCost,
      foundryConversionCost,
      evaluatedProcesses,
      processCostsSum,
      subTotalRaw,
      subTotalScrap,
      rejectionScrap,
      overheads,
      grandTotalRaw,
      grandTotalScrap,
      profitRs,
      profitPercent,
      rawMaterialPercent,
      foundryConversionPercent
    };
  };

  const triggerFormulaEdit = (targetKey: string) => {
    if (!isEditing || rows.length === 0) return;

    const firstRow = rows[0];
    const firstVals = firstRow.values || {};
    const firstMatName = (firstRow.materialName || "").toLowerCase().trim();
    const firstMatData = materialRatesMap.get(firstMatName) || { rate: 0, scrap: 0 };
    const firstRatePerKg = firstMatData.rate;
    const firstScrapRatePerKg = firstMatData.scrap;
    const firstRoughWeight = parseFloat(firstVals.rough_casting_weight) || 0;
    const firstFinishWeight = parseFloat(firstVals.finish_weight) || 0;
    const firstSemiMachiningCost = parseFloat(firstVals.semi_machining_cost) || 0;
    const firstSellingPrice = parseFloat(firstVals.selling_price) || 0;
    const firstFoundryRate = parseFloat(columnRates.foundry_conversion_rate) || 110;

    const calcs = calculateRowFields(firstRow);

    if (targetKey.endsWith("_total_cost_formula")) {
      const procKey = targetKey.replace("_total_cost_formula", "");
      const proc = allProcesses.find(p => p.key === procKey);
      if (proc) {
        const rateSec = parseFloat(columnRates[proc.key]) || proc.defaultRate;
        const defaultFormula = proc.isSpecialMetrology
          ? "[metrology_cost] / [production_quantity]"
          : (proc.isSpecialPacking
            ? "[cycle_time] * [rate_sec] + [packing_material_cost]"
            : (proc.hasTooling
              ? "[cycle_time] * [rate_sec] + [tooling_cost]"
              : "[cycle_time] * [rate_sec]"));

        const currentFormula = firstVals[targetKey] || defaultFormula;

        const cycleTime = parseFloat(firstVals[`${proc.key}_cycle_time`]) || 0;
        const tooling = parseFloat(firstVals[`${proc.key}_tooling_cost`]) || 0;
        const packMatCost = parseFloat(firstVals.packing_cost_packing_material_cost) || 0;
        const metrologyCost = parseFloat(firstVals.metrology_cost) || 0;
        const prodQty = parseFloat(firstVals.metrology_production_quantity) || 1000;

        const variables: Array<{ key: string; label: string; value: string; type?: "field" | "column" }> = [
          { key: "cycle_time", label: "Cycle Time", value: cycleTime.toString(), type: "field" },
          { key: "rate_sec", label: "Machine Rate / Sec", value: rateSec.toFixed(4), type: "field" },
          { key: "tooling_cost", label: "Tooling Cost", value: tooling.toString(), type: "field" },
          { key: "packing_material_cost", label: "Packing Material Cost", value: packMatCost.toString(), type: "field" },
          { key: "metrology_cost", label: "Metrology Cost", value: metrologyCost.toString(), type: "field" },
          { key: "production_quantity", label: "Production Quantity", value: prodQty.toString(), type: "field" },
          { key: "rough_casting_weight", label: "Rough Casting Weight", value: firstRoughWeight.toString(), type: "field" },
          { key: "finish_weight", label: "Finish Weight", value: firstFinishWeight.toString(), type: "field" }
        ];

        const customIncludes = (!proc.isStatic && (proc as any).customIncludes) || [];
        const checkedCustomIncludes = customIncludes.filter((ci: any) => ci.checked);
        checkedCustomIncludes.forEach((ci: any) => {
          const val = firstVals[`${proc.key}_custom_${ci.key}`] || "0";
          variables.push({
            key: ci.key,
            label: ci.label,
            value: val,
            type: "field" as const
          });
        });

        allProcesses.forEach(otherProc => {
          if (otherProc.key !== proc.key) {
            variables.push({
              key: otherProc.key,
              label: otherProc.name,
              value: (calcs.evaluatedProcesses[otherProc.key] || 0).toFixed(4),
              type: "column" as const
            });
          }
        });

        setFormulaConfig({
          title: `Edit ${proc.name} Total Cost Formula`,
          description: `Configure formula for calculating the total cost of ${proc.name}.`,
          targetFormulaKey: targetKey,
          defaultFormula,
          variables
        });
        setFormulaValue(currentFormula);
        setShowFormulaModal(true);
        return;
      }
    }

    // Build list of all columns in sheet
    const allVars = [
      { key: "rough_casting_weight", label: "Rough Casting Weight", value: firstRoughWeight.toString(), type: "field" as const },
      { key: "finish_weight", label: "Finish Weight", value: firstFinishWeight.toString(), type: "field" as const },
      { key: "rate_per_kg", label: "Material Rate Per Kg", value: firstRatePerKg.toFixed(2), type: "field" as const },
      { key: "scrap_rate_per_kg", label: "Scrap Rate Per Kg", value: firstScrapRatePerKg.toFixed(2), type: "field" as const },
      { key: "origin_raw_material_cost_component", label: "Origin RM Cost / Component", value: calcs.originRawComponentCost.toFixed(2), type: "column" as const },
      { key: "scrap_raw_material_cost_component", label: "Scrap RM Cost / Component", value: calcs.scrapRawComponentCost.toFixed(2), type: "column" as const },
      { key: "foundry_rate", label: "Foundry Conversion Rate", value: firstFoundryRate.toString(), type: "field" as const },
      { key: "foundry_conversion_cost_component", label: "Foundry Conversion Cost", value: calcs.foundryConversionCost.toFixed(2), type: "column" as const },
      { key: "semi_machining_cost", label: "Semi Machining Cost", value: firstSemiMachiningCost.toString(), type: "field" as const },
      { key: "process_costs_sum", label: "Process Costs Sum", value: calcs.processCostsSum.toFixed(2), type: "column" as const }
    ];

    // Add individual processes
    allProcesses.forEach(proc => {
      allVars.push({
        key: proc.key,
        label: proc.name,
        value: (calcs.evaluatedProcesses[proc.key] || 0).toFixed(2),
        type: "column" as const
      });

      const customIncludes = (!proc.isStatic && (proc as any).customIncludes) || [];
      const checkedCustomIncludes = customIncludes.filter((ci: any) => ci.checked);
      checkedCustomIncludes.forEach((ci: any) => {
        const val = firstVals[`${proc.key}_custom_${ci.key}`] || "0";
        allVars.push({
          key: `${proc.key}_custom_${ci.key}`,
          label: `${proc.name} ${ci.label}`,
          value: parseFloat(val).toFixed(2),
          type: "field" as const
        });
      });
    });

    // Add subtotals, overheads, grand totals, profit, etc.
    allVars.push(
      { key: "subtotal_cost_rm", label: "Subtotal Cost (RM)", value: calcs.subTotalRaw.toFixed(2), type: "column" as const },
      { key: "subtotal_cost_scrap", label: "Subtotal Cost (Scrap)", value: calcs.subTotalScrap.toFixed(2), type: "column" as const },
      { key: "rejection_cost_scrap", label: "Rejection Cost (RM)", value: calcs.rejectionScrap.toFixed(2), type: "column" as const },
      { key: "overheads_rm", label: "Overheads @ 18%", value: calcs.overheads.toFixed(2), type: "column" as const },
      { key: "grand_total_cost_rm", label: "Grand Total Cost (RM)", value: calcs.grandTotalRaw.toFixed(2), type: "column" as const },
      { key: "grand_total_cost_scrap", label: "Grand Total Cost (Scrap)", value: calcs.grandTotalScrap.toFixed(2), type: "column" as const },
      { key: "selling_price", label: "Selling Price", value: firstSellingPrice.toString(), type: "field" as const },
      { key: "profit_rs", label: "Profit (Rs)", value: calcs.profitRs.toFixed(2), type: "column" as const },
      { key: "profit_percent", label: "Profit %", value: calcs.profitPercent.toFixed(2), type: "column" as const },
      { key: "raw_material_percent", label: "Raw Material %", value: calcs.rawMaterialPercent.toFixed(2), type: "column" as const },
      { key: "foundry_conversion_percent", label: "Foundry Conversion %", value: calcs.foundryConversionPercent.toFixed(2), type: "column" as const }
    );

    // Map targetKey to variable key to filter self-reference out
    const variableKeyMap: Record<string, string> = {
      origin_raw_material_cost_component_formula: "origin_raw_material_cost_component",
      scrap_raw_material_cost_component_formula: "scrap_raw_material_cost_component",
      foundry_conversion_cost_component_formula: "foundry_conversion_cost_component",
      subtotal_cost_rm_formula: "subtotal_cost_rm",
      subtotal_cost_scrap_formula: "subtotal_cost_scrap",
      rejection_cost_scrap_formula: "rejection_cost_scrap",
      overheads_rm_formula: "overheads_rm",
      grand_total_cost_rm_formula: "grand_total_cost_rm",
      grand_total_cost_scrap_formula: "grand_total_cost_scrap",
      profit_rs_formula: "profit_rs",
      profit_percent_formula: "profit_percent",
      raw_material_percent_formula: "raw_material_percent",
      foundry_conversion_percent_formula: "foundry_conversion_percent",
    };

    const selfVarKey = variableKeyMap[targetKey];
    const variables = allVars.filter(v => v.key !== selfVarKey);

    let title = "";
    let description = "";
    let defaultFormula = "";
    let currentFormula = "";

    switch (targetKey) {
      case "origin_raw_material_cost_component_formula":
        title = "Edit Origin Raw Component Cost Formula";
        description = "Formula for origin raw material component cost calculation.";
        defaultFormula = "[finish_weight] * [rate_per_kg]";
        currentFormula = firstVals.origin_raw_material_cost_component_formula || defaultFormula;
        break;
      case "scrap_raw_material_cost_component_formula":
        title = "Edit Scrap Raw Component Cost Formula";
        description = "Formula for scrap raw material component cost calculation.";
        defaultFormula = "[finish_weight] * [scrap_rate_per_kg]";
        currentFormula = firstVals.scrap_raw_material_cost_component_formula || defaultFormula;
        break;
      case "foundry_conversion_cost_component_formula":
        title = "Edit Foundry Conversion Cost Formula";
        description = "Formula for foundry conversion cost calculation.";
        defaultFormula = "Math.max(0, ([rough_casting_weight] - 1.0) * [foundry_rate])";
        currentFormula = firstVals.foundry_conversion_cost_component_formula || defaultFormula;
        break;
      case "subtotal_cost_rm_formula":
        title = "Edit Subtotal Cost (RM) Formula";
        description = "Formula for Subtotal Cost (RM) calculation.";
        defaultFormula = "[origin_raw_material_cost_component] + [foundry_conversion_cost_component] + [semi_machining_cost] + [process_costs_sum]";
        currentFormula = firstVals.subtotal_cost_rm_formula || defaultFormula;
        break;
      case "subtotal_cost_scrap_formula":
        title = "Edit Subtotal Cost (Scrap) Formula";
        description = "Formula for Subtotal Cost (Scrap) calculation.";
        defaultFormula = "[scrap_raw_material_cost_component] + [foundry_conversion_cost_component] + [semi_machining_cost] + [process_costs_sum]";
        currentFormula = firstVals.subtotal_cost_scrap_formula || defaultFormula;
        break;
      case "rejection_cost_scrap_formula":
        title = "Edit Rejection Cost (RM) @ 5% Formula";
        description = "Formula for Rejection Cost (RM) @ 5% calculation.";
        defaultFormula = "[subtotal_cost_rm] * 0.05";
        currentFormula = firstVals.rejection_cost_scrap_formula || defaultFormula;
        break;
      case "overheads_rm_formula":
        title = "Edit Overheads @ 18% Formula";
        description = "Formula for Overheads @ 18% calculation.";
        defaultFormula = "[subtotal_cost_rm] * 0.18";
        currentFormula = firstVals.overheads_rm_formula || defaultFormula;
        break;
      case "grand_total_cost_rm_formula":
        title = "Edit Grand Total Cost (RM) Formula";
        description = "Formula for Grand Total Cost (RM) calculation.";
        defaultFormula = "[subtotal_cost_rm] + [overheads_rm]";
        currentFormula = firstVals.grand_total_cost_rm_formula || defaultFormula;
        break;
      case "grand_total_cost_scrap_formula":
        title = "Edit Grand Total Cost (Scrap) Formula";
        description = "Formula for Grand Total Cost (Scrap) calculation.";
        defaultFormula = "([subtotal_cost_scrap] + [rejection_cost_scrap]) * 1.10";
        currentFormula = firstVals.grand_total_cost_scrap_formula || defaultFormula;
        break;
      case "profit_rs_formula":
        title = "Edit Profit (Rs) Formula";
        description = "Formula for Profit (Rs) calculation.";
        defaultFormula = "[selling_price] > 0 ? ([selling_price] - [grand_total_cost_rm]) : 0";
        currentFormula = firstVals.profit_rs_formula || defaultFormula;
        break;
      case "profit_percent_formula":
        title = "Edit Profit % Formula";
        description = "Formula for Profit % calculation.";
        defaultFormula = "[selling_price] > 0 ? (([selling_price] - [grand_total_cost_rm]) / [selling_price]) * 100 : 0";
        currentFormula = firstVals.profit_percent_formula || defaultFormula;
        break;
      case "raw_material_percent_formula":
        title = "Edit Raw Material % Formula";
        description = "Formula for Raw Material % calculation.";
        defaultFormula = "[selling_price] > 0 ? ([origin_raw_material_cost_component] / [selling_price]) * 100 : 0";
        currentFormula = firstVals.raw_material_percent_formula || defaultFormula;
        break;
      case "foundry_conversion_percent_formula":
        title = "Edit Foundry Conversion % Formula";
        description = "Formula for Foundry Conversion % calculation.";
        defaultFormula = "[selling_price] > 0 ? ([foundry_conversion_cost_component] / [selling_price]) * 100 : 0";
        currentFormula = firstVals.foundry_conversion_percent_formula || defaultFormula;
        break;
      default:
        return;
    }

    setFormulaConfig({
      title,
      description,
      targetFormulaKey: targetKey,
      defaultFormula,
      variables
    });
    setFormulaValue(currentFormula);
    setShowFormulaModal(true);
  };

  // Perform Save to Backend
  const handleSave = async () => {
    if (!activeMonth || !activeDocument) return;
    setSaveStatus("saving");

    const savedRows = activeDocument.rows.map(row => {
      const updatedVals = { ...row.values };
      updatedVals.foundry_conversion_rate = columnRates.foundry_conversion_rate;
      updatedVals.rejection_percent = columnRates.rejection_percent || "5";
      updatedVals.overheads_percent = columnRates.overheads_percent || "18";
      allProcesses.forEach(proc => {
        updatedVals[`${proc.key}_rate_sec`] = columnRates[proc.key];
      });
      return {
        ...row,
        values: updatedVals
      };
    });

    try {
      const response = await fetch(`${API_URL}/api/final-cost-sheet/${activeMonth}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentUser?.token}`
        },
        body: JSON.stringify({
          rows: savedRows,
          customColumns
        })
      });

      if (response.ok) {
        setSaveStatus("saved");
        setIsEditing(false);
        setEditBackup(null);
        setActiveEditCell(null);
        setActiveEditRateKey(null);
        setShowFormulaModal(false);
        setFormulaConfig(null);
        toast.success(`Saved final cost sheet for ${formatMonthLabel(activeMonth)} successfully!`);
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        setSaveStatus("error");
        toast.error("Failed to save final cost sheet");
      }
    } catch (error) {
      console.error("Error saving cost sheet:", error);
      setSaveStatus("error");
      toast.error("An error occurred during save");
    }
  };

  // Handle Cancel Edit
  const handleCancelEdit = () => {
    if (editBackup && activeMonth) {
      setCostSheets(prev => {
        const updated = [...prev];
        const index = updated.findIndex(r => r.month === activeMonth);
        if (index > -1) {
          updated[index] = editBackup;
        }
        return updated;
      });
    }
    setIsEditing(false);
    setEditBackup(null);
    setActiveEditCell(null);
    setActiveEditRateKey(null);
    setShowFormulaModal(false);
    setFormulaConfig(null);
    toast.info("Changes cancelled and reverted.");
  };



  // Add Custom Column Handlers
  const handleAddCustomColumn = (
    name: string,
    options: { hasMetadata: boolean; hasCycleTime: boolean; hasTooling: boolean; customIncludes?: CustomIncludeOption[]; linkedMachine?: string }
  ) => {
    if (!activeMonth) return;

    const key = name.toLowerCase().trim().replace(/[^a-z0-9_]/g, "_");

    // Check if column already exists
    const existsInStatic = PROCESS_CONFIGS.some(p => p.key === key || p.name.toLowerCase() === name.toLowerCase());
    const existsInCustom = customColumns.some(c => c.key === key || c.name.toLowerCase() === name.toLowerCase());
    if (
      existsInStatic ||
      existsInCustom ||
      key === "rough_casting_weight" ||
      key === "finish_weight" ||
      key === "semi_machining_cost" ||
      key === "selling_price"
    ) {
      toast.error("A column with this name already exists");
      return;
    }

    const searchName = (options.linkedMachine || "").toLowerCase().trim();
    const dbRate = machineSecRates[searchName];
    const rateVal = dbRate ? dbRate.toFixed(4) : "0.0000";

    const newCol: CustomColumn = {
      key,
      name,
      hasMetadata: options.hasMetadata,
      hasCycleTime: options.hasCycleTime,
      hasTooling: options.hasTooling,
      defaultRate: dbRate || 0,
      customIncludes: options.customIncludes || [],
      linkedMachine: options.linkedMachine
    };

    setCostSheets(prev => {
      const updated = [...prev];
      const index = updated.findIndex(r => r.month === activeMonth);
      if (index > -1) {
        const sheet = { ...updated[index] };
        sheet.customColumns = [...(sheet.customColumns || []), newCol];

        // Also initialize value map for each row
        sheet.rows = sheet.rows.map(row => {
          const updatedVals = { ...row.values };
          updatedVals[`${key}_rate_sec`] = rateVal;

          if (options.hasMetadata) {
            updatedVals[`${key}_metadata`] = "";
          }
          if (options.hasCycleTime) {
            updatedVals[`${key}_cycle_time`] = "0";
          }
          if (options.hasTooling) {
            updatedVals[`${key}_tooling_cost`] = "0";
          }
          if (options.customIncludes) {
            options.customIncludes.forEach((ci) => {
              updatedVals[`${key}_custom_${ci.key}`] = "";
            });
          }
          return { ...row, values: updatedVals };
        });

        updated[index] = sheet;
      }
      return updated;
    });

    setColumnRates(prev => ({
      ...prev,
      [key]: rateVal
    }));

    toast.success(`Column "${name}" added successfully!`);
  };

  const handleAddColumnConfirm = () => {
    if (!newColName.trim()) {
      toast.error("Column Name is required");
      return;
    }

    const activeCustomIncludes = newColCustomIncludes.filter(ci => ci.checked);
    if (!newColHasCycleTime && !newColHasTooling && activeCustomIncludes.length === 0) {
      toast.error("Please select at least one field option (Cycle Time, Tooling Cost or Custom Include)");
      return;
    }

    handleAddCustomColumn(
      newColName.trim(),
      {
        hasMetadata: false,
        hasCycleTime: newColHasCycleTime,
        hasTooling: newColHasTooling,
        customIncludes: newColCustomIncludes,
        linkedMachine: newColLinkedMachine
      }
    );

    // Reset and close modal
    setNewColName("");
    setNewColHasCycleTime(false);
    setNewColHasTooling(false);
    setNewColLinkedMachine("");
    setNewColCustomIncludes([]);
    setNewCustomIncludeName("");
    setShowAddCustomIncludeInput(false);
    setShowAddColumnModal(false);
  };

  const handleDeleteCustomColumn = (colKey: string, colName: string) => {
    if (!window.confirm(`Are you sure you want to delete column "${colName}"? All data for this column will be cleared.`)) {
      return;
    }

    setCostSheets(prev => {
      const updated = [...prev];
      const index = updated.findIndex(r => r.month === activeMonth);
      if (index > -1) {
        const sheet = { ...updated[index] };
        sheet.customColumns = (sheet.customColumns || []).filter(col => col.key !== colKey);
        sheet.rows = sheet.rows.map(row => {
          const nextVals = { ...row.values };
          delete nextVals[`${colKey}_metadata`];
          delete nextVals[`${colKey}_cycle_time`];
          delete nextVals[`${colKey}_tooling_cost`];
          delete nextVals[`${colKey}_total_cost_formula`];
          
          if (row.selectedLoop) {
            row.selectedLoop.forEach((p, idx) => {
              if (p === colKey) {
                delete nextVals[`${colKey}_${idx}_metadata`];
                delete nextVals[`${colKey}_${idx}_cycle_time`];
                delete nextVals[`${colKey}_${idx}_tooling_cost`];
                delete nextVals[`${colKey}_${idx}_production_quantity`];
                delete nextVals[`${colKey}_${idx}_cost`];
              }
            });
          }
          
          return {
            ...row,
            values: nextVals
          };
        });
        updated[index] = sheet;
      }
      return updated;
    });

    setColumnUserAssignments(prev => {
      const next = { ...prev };
      delete next[colKey];
      saveColumnAssignments(next);
      return next;
    });

    toast.info(`Column "${colName}" deleted successfully!`);
  };

  const handleEditCustomColumnConfirm = () => {
    if (!editingColumnName.trim()) {
      toast.error("Column Name is required");
      return;
    }

    const activeCustomIncludes = editingColCustomIncludes.filter(ci => ci.checked);
    if (!editingColumnHasCycleTime && !editingColumnHasTooling && activeCustomIncludes.length === 0) {
      toast.error("Please select at least one field option (Cycle Time, Tooling Cost or Custom Include)");
      return;
    }

    const searchName = (editingColLinkedMachine || "").toLowerCase().trim();
    const dbRate = machineSecRates[searchName];
    const rateVal = dbRate ? dbRate.toFixed(4) : "0.0000";

    setCostSheets(prev => {
      const updated = [...prev];
      const index = updated.findIndex(r => r.month === activeMonth);
      if (index > -1) {
        const sheet = { ...updated[index] };
        
        sheet.customColumns = (sheet.customColumns || []).map(col => {
          if (col.key === editingColumnKey) {
            return {
              ...col,
              name: editingColumnName.trim(),
              hasCycleTime: editingColumnHasCycleTime,
              hasTooling: editingColumnHasTooling,
              defaultRate: dbRate || 0,
              customIncludes: editingColCustomIncludes,
              linkedMachine: editingColLinkedMachine
            };
          }
          return col;
        });

        // Initialize missing value fields on rows and cleanup deselected ones
        sheet.rows = sheet.rows.map(row => {
          const nextVals = { ...row.values };
          nextVals[`${editingColumnKey}_rate_sec`] = rateVal;
          
          if (editingColumnHasCycleTime) {
            if (nextVals[`${editingColumnKey}_cycle_time`] === undefined) {
              nextVals[`${editingColumnKey}_cycle_time`] = "0";
            }
          } else {
            delete nextVals[`${editingColumnKey}_cycle_time`];
          }

          if (editingColumnHasTooling) {
            if (nextVals[`${editingColumnKey}_tooling_cost`] === undefined) {
              nextVals[`${editingColumnKey}_tooling_cost`] = "0";
            }
          } else {
            delete nextVals[`${editingColumnKey}_tooling_cost`];
          }

          // Handle custom includes
          editingColCustomIncludes.forEach(ci => {
            if (ci.checked) {
              if (nextVals[`${editingColumnKey}_custom_${ci.key}`] === undefined) {
                nextVals[`${editingColumnKey}_custom_${ci.key}`] = "";
              }
            } else {
              delete nextVals[`${editingColumnKey}_custom_${ci.key}`];
            }
          });

          if (row.selectedLoop) {
            row.selectedLoop.forEach((p, idx) => {
              if (p === editingColumnKey) {
                if (editingColumnHasCycleTime) {
                  if (nextVals[`${editingColumnKey}_${idx}_cycle_time`] === undefined) {
                    nextVals[`${editingColumnKey}_${idx}_cycle_time`] = "0";
                  }
                } else {
                  delete nextVals[`${editingColumnKey}_${idx}_cycle_time`];
                }

                if (editingColumnHasTooling) {
                  if (nextVals[`${editingColumnKey}_${idx}_tooling_cost`] === undefined) {
                    nextVals[`${editingColumnKey}_${idx}_tooling_cost`] = "0";
                  }
                } else {
                  delete nextVals[`${editingColumnKey}_${idx}_tooling_cost`];
                }

                editingColCustomIncludes.forEach(ci => {
                  if (ci.checked) {
                    if (nextVals[`${editingColumnKey}_${idx}_custom_${ci.key}`] === undefined) {
                      nextVals[`${editingColumnKey}_${idx}_custom_${ci.key}`] = "";
                    }
                  } else {
                    delete nextVals[`${editingColumnKey}_${idx}_custom_${ci.key}`];
                  }
                });
              }
            });
          }

          return { ...row, values: nextVals };
        });

        updated[index] = sheet;
      }
      return updated;
    });

    setColumnRates(prev => ({
      ...prev,
      [editingColumnKey]: rateVal
    }));

    toast.success("Column configuration updated successfully!");
    setShowEditColumnModal(false);
    setEditingColumnKey("");
    setEditingColumnName("");
    setEditingColumnHasCycleTime(false);
    setEditingColumnHasTooling(false);
    setEditingColLinkedMachine("");
    setEditingColCustomIncludes([]);
    setEditCustomIncludeName("");
    setShowEditAddCustomIncludeInput(false);
  };



  // Add Custom Part Row
  const handleAddPartRow = async () => {
    if (!newPartName.trim() || !newPartNumber.trim()) {
      toast.error("Part Name and Part Number are required");
      return;
    }

    const exists = rows.some(r => r.partNumber.toLowerCase().trim() === newPartNumber.trim().toLowerCase());
    if (exists) {
      toast.error("A part with this part number already exists in this table");
      return;
    }

    const defaultValues: Record<string, string> = {
      rough_casting_weight: "0",
      finish_weight: "0",
      semi_machining_cost: "0",
      selling_price: "0"
    };

    PROCESS_CONFIGS.forEach(proc => {
      defaultValues[`${proc.key}_cycle_time`] = "0";
      if (proc.hasTooling) {
        defaultValues[`${proc.key}_tooling_cost`] = "0";
      }
      if (proc.isSpecialMetrology) {
        defaultValues.metrology_production_quantity = "1000";
        defaultValues.metrology_cost = "0";
      }
      if (proc.isSpecialPacking) {
        defaultValues.packing_cost_packing_material_cost = "0";
      }
    });

    // Initialize defaults for custom columns
    customColumns.forEach(c => {
      if (c.hasMetadata) defaultValues[`${c.key}_metadata`] = "";
      if (c.hasCycleTime) defaultValues[`${c.key}_cycle_time`] = "0";
      if (c.hasTooling) defaultValues[`${c.key}_tooling_cost`] = "0";
    });

    // Populate loop sequence initial values
    newPartLoop.forEach((procKey, idx) => {
      const proc = allProcesses.find(p => p.key === procKey);
      const hasCycleTime = proc?.isStatic ? !proc.isSpecialMetrology : !!proc?.hasCycleTime;
      const hasTooling = proc?.isStatic ? !!proc.hasTooling : !!proc?.hasTooling;
      const hasMetadata = !!proc?.hasMetadata;

      if (hasMetadata) {
        defaultValues[`${procKey}_${idx}_metadata`] = "";
      }
      if (hasCycleTime) {
        defaultValues[`${procKey}_${idx}_cycle_time`] = "0";
      }
      if (hasTooling) {
        defaultValues[`${procKey}_${idx}_tooling_cost`] = "0";
      }
    });

    // Populate initial rates on the new row
    defaultValues.foundry_conversion_rate = columnRates.foundry_conversion_rate || "110";
    allProcesses.forEach(proc => {
      defaultValues[`${proc.key}_rate_sec`] = columnRates[proc.key] || proc.defaultRate.toFixed(4);
    });

    const newPart: CostSheetRow = {
      partName: newPartName.trim(),
      partNumber: newPartNumber.trim(),
      materialName: newPartMaterial || (activeMaterialDesignations[0] || ""),
      selectedLoop: newPartLoop,
      values: defaultValues
    };

    const savedRows = rows.map(row => {
      const updatedVals = { ...row.values };
      updatedVals.foundry_conversion_rate = columnRates.foundry_conversion_rate;
      allProcesses.forEach(proc => {
        updatedVals[`${proc.key}_rate_sec`] = columnRates[proc.key];
      });
      return {
        ...row,
        values: updatedVals
      };
    });

    const finalRows = [...savedRows, newPart];

    try {
      setSaveStatus("saving");
      const response = await fetch(`${API_URL}/api/final-cost-sheet/${activeMonth}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentUser?.token}`
        },
        body: JSON.stringify({
          rows: finalRows,
          customColumns
        })
      });

      if (response.ok) {
        toast.success(`Part "${newPartName.trim()}" added and saved successfully!`);
        setIsEditing(false);
        setEditBackup(null);
        await fetchData();
      } else {
        toast.error("Failed to auto-save the added part row");
      }
    } catch (error) {
      console.error("Error auto-saving part row:", error);
      toast.error("An error occurred during save");
    } finally {
      setSaveStatus("idle");
      setNewPartName("");
      setNewPartNumber("");
      setNewPartMaterial("");
      setNewPartLoop([]);
      setShowAddPartModal(false);
    }
  };

  // Delete Part Row
  const handleDeletePartRow = (rowIndex: number) => {
    const partNum = rows[rowIndex].partNumber;
    if (!window.confirm(`Are you sure you want to delete Part "${partNum}"?`)) {
      return;
    }

    setCostSheets(prev => {
      const updated = [...prev];
      const index = updated.findIndex(r => r.month === activeMonth);
      if (index > -1) {
        const sheet = { ...updated[index] };
        sheet.rows = sheet.rows.filter((_, i) => i !== rowIndex);
        updated[index] = sheet;
      }
      return updated;
    });

    toast.info(`Part "${partNum}" deleted`);
  };

  const exportToExcel = () => {
    if (!activeDocument || rows.length === 0) return;

    const headerRow1 = [
      "Part Name", "Part Number", "Material Name", "Rough Casting Weight", "Finish Weight (finish weight )",
      "Origin Raw material cost / kg", "Scrap Raw material cost / kg", "Origin Raw material cost / component in Rs", "Scrap Raw material cost / component in Rs",
      "Foundry conversion cost / component (Rs)", "Semi machining cost in (Rs)"
    ];

    customColumns.filter(c => c.hasMetadata && !c.hasCycleTime && !c.hasTooling).forEach(col => {
      headerRow1.push(col.name);
    });

    allProcesses.forEach(proc => {
      const hasMetadata = !!proc.hasMetadata;
      const hasCycleTime = proc.isStatic ? !proc.isSpecialMetrology : !!proc.hasCycleTime;
      const hasTooling = proc.isStatic ? !!proc.hasTooling : !!proc.hasTooling;
      const customIncludes = (!proc.isStatic && (proc as any).customIncludes) || [];
      const checkedCustomIncludes = customIncludes.filter((ci: any) => ci.checked);

      if (hasMetadata) headerRow1.push(`${proc.name} (Metadata)`);
      if (hasCycleTime) headerRow1.push(`${proc.name} (Cycle Time)`);
      
      checkedCustomIncludes.forEach((ci: any) => {
        headerRow1.push(`${proc.name} (${ci.label})`);
      });

      if (proc.isSpecialMetrology) {
        headerRow1.push(`${proc.name} (Prod Qty)`, `${proc.name} (Cost)`);
      } else if (proc.isSpecialPacking) {
        headerRow1.push(`${proc.name} (Mat Cost)`);
      } else if (hasTooling) {
        headerRow1.push(`${proc.name} (Tooling Cost)`);
      }
      headerRow1.push(`${proc.name} (Total Cost)`);
    });

    headerRow1.push(
      "Sub Total Cost (RM)", "Sub Total Cost (Scrap)", "Rejection Cost (RM) @ 5%", "Overheads @18%",
      "Grand Total Cost (RM)", "Grand Total Cost (Scrap)", "Selling Price", "Profit %", "Profit (Rs)",
      "Raw Material Cost %", "Foundry Conversion Cost %"
    );

    const dataRows = rows.map(row => {
      const calcs = calculateRowFields(row);
      const vals = row.values || {};
      const fields: any[] = [
        row.partName,
        row.partNumber,
        row.materialName,
        parseFloat(vals.rough_casting_weight) || 0,
        parseFloat(vals.finish_weight) || 0,
        calcs.ratePerKg,
        calcs.scrapRatePerKg,
        calcs.originRawComponentCost,
        calcs.scrapRawComponentCost,
        calcs.foundryConversionCost,
        parseFloat(vals.semi_machining_cost) || 0
      ];

      customColumns.filter(c => c.hasMetadata && !c.hasCycleTime && !c.hasTooling).forEach(col => {
        fields.push(vals[`${col.key}_metadata`] || "");
      });

      allProcesses.forEach(proc => {
        let cycleSum = 0;
        let toolingSum = 0;
        let metrologyQtySum = 0;
        let metrologyCostSum = 0;
        let packingMatCostSum = 0;
        let metadataConcat: string[] = [];

        const hasMetadata = !!proc.hasMetadata;
        const hasCycleTime = proc.isStatic ? !proc.isSpecialMetrology : !!proc.hasCycleTime;
        const hasTooling = proc.isStatic ? !!proc.hasTooling : !!proc.hasTooling;
        const customIncludes = (!proc.isStatic && (proc as any).customIncludes) || [];
        const checkedCustomIncludes = customIncludes.filter((ci: any) => ci.checked);
        const customIncludesConcat: Record<string, string[]> = {};
        checkedCustomIncludes.forEach(ci => {
          customIncludesConcat[ci.key] = [];
        });

        if (row.selectedLoop && row.selectedLoop.length > 0) {
          row.selectedLoop.forEach((p, idx) => {
            if (p === proc.key) {
              if (hasMetadata) {
                metadataConcat.push(vals[`${proc.key}_${idx}_metadata`] || "");
              }
              if (hasCycleTime) {
                cycleSum += parseFloat(vals[`${proc.key}_${idx}_cycle_time`]) || 0;
              }
              if (hasTooling) {
                toolingSum += parseFloat(vals[`${proc.key}_${idx}_tooling_cost`]) || 0;
              }
              if (proc.isSpecialMetrology) {
                metrologyQtySum += parseFloat(vals[`${proc.key}_${idx}_production_quantity`]) || 1000;
                metrologyCostSum += parseFloat(vals[`${proc.key}_${idx}_cost`]) || 0;
              }
              if (proc.isSpecialPacking) {
                packingMatCostSum += parseFloat(vals[`${proc.key}_${idx}_packing_material_cost`]) || 0;
              }
              checkedCustomIncludes.forEach(ci => {
                customIncludesConcat[ci.key].push(vals[`${proc.key}_${idx}_custom_${ci.key}`] || "");
              });
            }
          });
        } else {
          if (hasMetadata) {
            metadataConcat.push(vals[`${proc.key}_metadata`] || "");
          }
          if (hasCycleTime) {
            cycleSum = parseFloat(vals[`${proc.key}_cycle_time`]) || 0;
          }
          if (hasTooling) {
            toolingSum = parseFloat(vals[`${proc.key}_tooling_cost`]) || 0;
          }
          if (proc.isSpecialMetrology) {
            metrologyQtySum = parseFloat(vals.metrology_production_quantity) || 1000;
            metrologyCostSum = parseFloat(vals.metrology_cost) || 0;
          }
          if (proc.isSpecialPacking) {
            packingMatCostSum = parseFloat(vals.packing_cost_packing_material_cost) || 0;
          }
          checkedCustomIncludes.forEach(ci => {
            customIncludesConcat[ci.key].push(vals[`${proc.key}_custom_${ci.key}`] || "");
          });
        }

        if (hasMetadata) {
          fields.push(metadataConcat.filter(Boolean).join(", "));
        }
        if (hasCycleTime) {
          fields.push(cycleSum);
        }
        checkedCustomIncludes.forEach(ci => {
          fields.push(customIncludesConcat[ci.key].filter(Boolean).join(", "));
        });
        if (proc.isSpecialMetrology) {
          fields.push(metrologyQtySum);
          fields.push(metrologyCostSum);
        } else if (proc.isSpecialPacking) {
          fields.push(packingMatCostSum);
        } else if (hasTooling) {
          fields.push(toolingSum);
        }
        fields.push(calcs.evaluatedProcesses[proc.key] || 0);
      });

      fields.push(
        calcs.subTotalRaw,
        calcs.subTotalScrap,
        calcs.rejectionScrap,
        calcs.overheads,
        calcs.grandTotalRaw,
        calcs.grandTotalScrap,
        parseFloat(vals.selling_price) || 0,
        calcs.profitPercent,
        calcs.profitRs,
        calcs.rawMaterialPercent,
        calcs.foundryConversionPercent
      );

      return fields;
    });

    const worksheet = XLSX.utils.aoa_to_sheet([headerRow1, ...dataRows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Final Cost Sheet");

    const todayStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `Final_Cost_Sheet_${activeMonth}_${todayStr}.xlsx`);
    toast.success("Excel exported successfully!");
  };

  const exportToPDF = () => {
    if (!activeDocument || rows.length === 0) return;

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a3"
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("PERFECT ALLOY COMPONENTS (P) LTD., SHIMOGA", 15, 15);
    doc.setFontSize(12);
    doc.text(`FINAL COST SHEET - ${formatMonthLabel(activeMonth)}`, 15, 22);

    const tableHeaders = [
      "Part Name", "Part Number", "Material", "Rough Wt", "Finish Wt", "Origin RM/kg", "Scrap RM/kg", "Subtotal Cost", "Grand Total Cost", "Selling Price", "Profit %", "Profit (Rs)"
    ];

    const tableRows = rows.map(row => {
      const calcs = calculateRowFields(row);
      const vals = row.values || {};
      return [
        row.partName,
        row.partNumber,
        row.materialName,
        vals.rough_casting_weight || "0",
        vals.finish_weight || "0",
        calcs.ratePerKg.toFixed(2),
        calcs.scrapRatePerKg.toFixed(2),
        calcs.subTotalRaw.toFixed(2),
        calcs.grandTotalRaw.toFixed(2),
        vals.selling_price || "0.00",
        calcs.profitPercent.toFixed(2) + "%",
        calcs.profitRs.toFixed(2)
      ];
    });

    autoTable(doc, {
      head: [tableHeaders],
      body: tableRows,
      startY: 30,
      theme: "grid",
      styles: {
        fontSize: 9,
        cellPadding: 3,
        halign: "center"
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255]
      }
    });

    const todayStr = new Date().toISOString().slice(0, 10);
    doc.save(`Final_Cost_Sheet_${activeMonth}_${todayStr}.pdf`);
    toast.success("PDF exported successfully!");
  };

  const activeMaterialDesignations = useMemo(() => {
    return Array.from(materialRatesMap.values()).map(v => v.originalName);
  }, [materialRatesMap]);

  const firstRowForFormulas = rows[0] || ({} as CostSheetRow);
  const firstRowVals = (firstRowForFormulas.values || {}) as Record<string, string>;
  const formulas = {
    origin_raw_material_cost_component: firstRowVals.origin_raw_material_cost_component_formula || "[finish_weight] * [rate_per_kg]",
    scrap_raw_material_cost_component: firstRowVals.scrap_raw_material_cost_component_formula || "[finish_weight] * [scrap_rate_per_kg]",
    foundry_conversion_cost_component: firstRowVals.foundry_conversion_cost_component_formula || "Math.max(0, ([rough_casting_weight] - 1.0) * [foundry_rate])",
    subtotal_cost_rm: firstRowVals.subtotal_cost_rm_formula || "[origin_raw_material_cost_component] + [foundry_conversion_cost_component] + [semi_machining_cost] + [process_costs_sum]",
    subtotal_cost_scrap: firstRowVals.subtotal_cost_scrap_formula || "[scrap_raw_material_cost_component] + [foundry_conversion_cost_component] + [semi_machining_cost] + [process_costs_sum]",
    rejection_cost_scrap: (() => {
      const f = firstRowVals.rejection_cost_scrap_formula || "[subtotal_cost_rm] * 0.05";
      return f === "[subtotal_cost_scrap] * 0.05" ? "[subtotal_cost_rm] * 0.05" : f;
    })(),
    overheads_rm: firstRowVals.overheads_rm_formula || "[subtotal_cost_rm] * 0.18",
    grand_total_cost_rm: firstRowVals.grand_total_cost_rm_formula || "[subtotal_cost_rm] + [overheads_rm]",
    grand_total_cost_scrap: firstRowVals.grand_total_cost_scrap_formula || "([subtotal_cost_scrap] + [rejection_cost_scrap]) * 1.10",
    profit_percent: firstRowVals.profit_percent_formula || "[selling_price] > 0 ? (([selling_price] - [grand_total_cost_rm]) / [selling_price]) * 100 : 0",
    profit_rs: firstRowVals.profit_rs_formula || "[selling_price] > 0 ? ([selling_price] - [grand_total_cost_rm]) : 0",
    raw_material_percent: firstRowVals.raw_material_percent_formula || "[selling_price] > 0 ? ([origin_raw_material_cost_component] / [selling_price]) * 100 : 0",
    foundry_conversion_percent: firstRowVals.foundry_conversion_percent_formula || "[selling_price] > 0 ? ([foundry_conversion_cost_component] / [selling_price]) * 100 : 0",
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
        <div className="max-w-xl">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Final Cost Sheet
          </h1>
          <p className="text-muted-foreground mt-0.5 text-xs">
            View and configure parts final cost sheets. Rates are computed dynamically from material rates and machine hour values.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-center">
          {/* Month Selection */}
          <Card className="border-none shadow-md bg-card/60 backdrop-blur-md py-2 px-3.5 w-fit">
            <div className="flex items-center gap-4">
              <div className="flex flex-col gap-1">
                <Label htmlFor="month-select" className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                  Select Active Month
                </Label>
                <Popover open={showMonthDropdown} onOpenChange={setShowMonthDropdown}>
                  <PopoverTrigger asChild>
                    <Button
                      id="month-select"
                      variant="outline"
                      disabled={isEditing || loading}
                      className="h-8 px-2 rounded-lg bg-background border border-input text-foreground hover:text-foreground font-bold shadow-sm focus:ring-1 focus:ring-primary outline-none cursor-pointer transition-all hover:bg-muted/10 text-xs min-w-[120px] flex items-center justify-between gap-1.5"
                    >
                      <span>{formatMonthLabel(activeMonth)}</span>
                      <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-[180px] bg-background border shadow-xl rounded-xl p-1 max-h-60 overflow-y-auto">
                    <div className="flex flex-col gap-0.5">
                      {costSheets.map((r) => {
                        const isCurrentCalendarMonth = r.month === new Date().toISOString().slice(0, 7);
                        const isActive = r.month === activeMonth;
                        const canDelete = !isActive && !isCurrentCalendarMonth;
                        return (
                          <div
                            key={r.month}
                            className={cn(
                              "flex items-center justify-between text-[11px] py-1.5 px-2.5 rounded-lg cursor-pointer transition-all font-semibold select-none",
                              isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted/60 text-foreground"
                            )}
                            onClick={() => handleMonthClick(r.month, canDelete)}
                          >
                            <span>{formatMonthLabel(r.month)}</span>
                            {canDelete && (
                              <span className="text-[8px] font-normal text-muted-foreground opacity-50">
                                (double-click to delete)
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {isSuperAdmin && (
                <div className="flex items-center gap-2 self-end mb-0.5">
                  <Button
                    variant="outline"
                    disabled={loading || !activeMonth}
                    onClick={() => setShowAddPartModal(true)}
                    className="h-8 px-3 text-xs font-bold border-primary/20 hover:bg-primary/5 text-primary shadow-sm flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Row
                  </Button>

                  {!isEditing ? (
                    <>
                      <Button
                        onClick={() => {
                          if (activeDocument) {
                            setEditBackup(JSON.parse(JSON.stringify(activeDocument)));
                            setIsEditing(true);
                          }
                        }}
                        disabled={loading || !activeMonth}
                        className="h-8 px-3 text-xs font-bold shadow-sm flex items-center gap-1"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        Edit Cost Sheet
                      </Button>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-200">
                      <Button
                        onClick={() => setShowAddColumnModal(true)}
                        className="h-8 px-3 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-sm flex items-center gap-1"
                        disabled={saveStatus === "saving"}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Column
                      </Button>
                      <Button
                        onClick={handleSave}
                        className="h-8 px-3 text-xs font-bold bg-green-600 hover:bg-green-700 text-white shadow-sm flex items-center gap-1"
                        disabled={saveStatus === "saving"}
                      >
                        {saveStatus === "saving" ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-3.5 w-3.5" />
                            Save
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={handleCancelEdit}
                        variant="ghost"
                        className="h-8 px-3 text-xs font-semibold hover:bg-muted/80 text-muted-foreground flex items-center gap-1"
                        disabled={saveStatus === "saving"}
                      >
                        <X className="h-3.5 w-3.5" />
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 px-4 font-bold border-muted-foreground/20 hover:bg-primary/5 transition-colors gap-2">
                <Download className="h-4 w-4" /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px]">
              <DropdownMenuItem onClick={exportToPDF} className="cursor-pointer gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span>Download as PDF</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToExcel} className="cursor-pointer gap-2">
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                <span>Download as Excel</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>



      {/* Spreadsheet Component */}
      <Card className="border-none shadow-2xl bg-card/60 backdrop-blur-md overflow-hidden rounded-2xl">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-72 items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground space-y-4">
              <AlertTriangle className="h-12 w-12 text-yellow-500" />
              <p className="text-sm font-semibold">No cost sheet configuration loaded for this month</p>
              <Button onClick={fetchData}>Reload Data</Button>
            </div>
          ) : (
            <div className="overflow-x-auto max-w-full custom-scrollbar">
              <Table className="border-separate border-spacing-0 w-max min-w-full border border-slate-200">
                <TableHeader className="bg-muted/50 border-b">
                  <TableRow className="hover:bg-transparent text-center font-bold text-[10px] text-muted-foreground bg-muted/30">
                    <TableHead rowSpan={2} className="text-center font-bold text-[10px] text-muted-foreground border-r border-slate-200 min-w-[90px] bg-muted/30 whitespace-normal leading-tight py-2">Part<br />Name</TableHead>
                    <TableHead rowSpan={2} className="text-center font-bold text-[10px] text-muted-foreground border-r border-slate-200 min-w-[95px] bg-muted/30 whitespace-normal leading-tight py-2">Part<br />Number</TableHead>
                    <TableHead rowSpan={2} className="text-center font-bold text-[10px] text-muted-foreground border-r border-slate-200 min-w-[90px] bg-muted/30 whitespace-normal leading-tight py-2">Material<br />Name</TableHead>
                    <TableHead rowSpan={2} className="text-center font-bold text-[10px] text-muted-foreground border-r border-slate-200 min-w-[95px] bg-muted/30 whitespace-normal leading-tight py-2">Rough<br />Casting<br />Weight</TableHead>
                    <TableHead rowSpan={2} className="text-center font-bold text-[10px] text-muted-foreground border-r border-slate-200 min-w-[110px] bg-muted/30 whitespace-normal leading-tight py-2">Finish Weight<br />(finish weight )</TableHead>
                    <TableHead rowSpan={2} className="text-center font-bold text-[10px] text-muted-foreground border-r border-slate-200 min-w-[110px] bg-muted/30 whitespace-normal leading-tight py-2">Origin Raw<br />material<br />cost / kg</TableHead>
                    <TableHead rowSpan={2} className="text-center font-bold text-[10px] text-muted-foreground border-r border-slate-200 min-w-[110px] bg-muted/30 whitespace-normal leading-tight py-2">Scrap Raw<br />material<br />cost / kg</TableHead>
                    <TableHead 
                      rowSpan={2} 
                      className={cn(
                        "text-center font-bold text-[10px] text-muted-foreground border-r border-slate-200 min-w-[125px] bg-muted/30 whitespace-normal leading-tight py-2 select-none transition-colors",
                        isEditing && "hover:bg-slate-200/80 cursor-pointer hover:outline-dashed hover:outline-1 hover:outline-primary/45 rounded"
                      )}
                      onDoubleClick={() => triggerFormulaEdit("origin_raw_material_cost_component_formula")}
                      title={`Formula: ${formulas.origin_raw_material_cost_component}`}
                    >
                      Origin Raw<br />material cost /<br />component in Rs
                    </TableHead>
                    <TableHead 
                      rowSpan={2} 
                      className={cn(
                        "text-center font-bold text-[10px] text-muted-foreground border-r border-slate-200 min-w-[125px] bg-muted/30 whitespace-normal leading-tight py-2 select-none transition-colors",
                        isEditing && "hover:bg-slate-200/80 cursor-pointer hover:outline-dashed hover:outline-1 hover:outline-primary/45 rounded"
                      )}
                      onDoubleClick={() => triggerFormulaEdit("scrap_raw_material_cost_component_formula")}
                      title={`Formula: ${formulas.scrap_raw_material_cost_component}`}
                    >
                      Scrap Raw<br />material cost /<br />component in Rs
                    </TableHead>
                    <TableHead 
                      rowSpan={2} 
                      className={cn(
                        "text-center font-bold text-[10px] text-muted-foreground border-r border-slate-200 min-w-[130px] bg-muted/30 whitespace-normal leading-tight py-2 select-none transition-colors",
                        isEditing && "hover:bg-slate-200/80 cursor-pointer hover:outline-dashed hover:outline-1 hover:outline-primary/45 rounded"
                      )}
                      onDoubleClick={() => triggerFormulaEdit("foundry_conversion_cost_component_formula")}
                      title={`Formula: ${formulas.foundry_conversion_cost_component}`}
                    >
                      Foundry conversion<br />cost / component<br />(Rs)
                    </TableHead>
                    <TableHead rowSpan={2} className="text-center font-bold text-[10px] text-muted-foreground border-r border-slate-200 min-w-[110px] bg-muted/30 whitespace-normal leading-tight py-2">Semi machining<br />cost in (Rs)</TableHead>
                    {customColumns.filter(c => c.hasMetadata && !c.hasCycleTime && !c.hasTooling).map(col => (
                      <TableHead key={col.key} rowSpan={2} className="text-center font-bold text-[10px] text-muted-foreground border-r border-slate-200 min-w-[100px] bg-muted/30 whitespace-normal leading-tight py-2 align-middle">
                        {col.name}
                      </TableHead>
                    ))}
                    {allProcesses.map(proc => {
                      const hasMetadata = !!proc.hasMetadata;
                      const hasCycleTime = proc.isStatic ? !proc.isSpecialMetrology : !!proc.hasCycleTime;
                      const hasTooling = proc.isStatic ? !!proc.hasTooling : !!proc.hasTooling;
                      const customIncludes = (!proc.isStatic && (proc as any).customIncludes) || [];
                      const checkedCustomIncludes = customIncludes.filter((ci: any) => ci.checked);
                      const colSpan = proc.isSpecialMetrology ? 3 : (proc.isSpecialPacking ? 3 : (hasMetadata ? 1 : 0) + (hasCycleTime ? 1 : 0) + (hasTooling ? 1 : 0) + checkedCustomIncludes.length + 1);
                      const dispName = (proc.key === "annealing" || proc.key === "heat_treatment") ? `${proc.name} cost in (Rs)` : proc.name;
                      const assignedUserIds = columnUserAssignments[proc.key] || [];
                      const assignedUserObjs = fcsUsers.filter(u => assignedUserIds.includes(u._id));
                      return (
                        <TableHead
                          key={`dept_${proc.key}`}
                          colSpan={colSpan}
                          className="text-center font-bold text-[10px] text-muted-foreground border-r border-slate-200 bg-muted/30 whitespace-normal leading-tight py-2 align-middle relative"
                        >
                          <div className="flex flex-col items-center justify-center gap-1 relative w-full py-1">
                            <span className="whitespace-normal leading-tight text-center max-w-full px-1 block">
                              {formatProcessName(dispName, 12).map((line, i) => (
                                <span key={i} className="block">{line}</span>
                              ))}
                            </span>
                            {(assignedUserObjs.length > 0 || (isSuperAdmin && isEditing)) && (
                              <div className="flex items-center gap-1 justify-center mt-0.5">
                                {/* Assigned-user avatars — visible to everyone always */}
                                {assignedUserObjs.length > 0 && (
                                  <div className="flex items-center gap-0.5">
                                    {assignedUserObjs.slice(0, 2).map(u => (
                                      <span key={u._id} className="h-4 w-4 rounded-full bg-primary/15 text-primary text-[7px] font-bold flex items-center justify-center border border-primary/30" title={u.name}>
                                        {u.name[0].toUpperCase()}
                                      </span>
                                    ))}
                                    {assignedUserObjs.length > 2 && (
                                      <span className="h-4 w-4 rounded-full bg-muted text-muted-foreground text-[7px] font-bold flex items-center justify-center border border-muted">
                                        +{assignedUserObjs.length - 2}
                                      </span>
                                    )}
                                  </div>
                                )}
                                {/* Assign-user dropdown — Super Admin, only while editing */}
                                {isSuperAdmin && isEditing && (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <button
                                        type="button"
                                        className="h-4 w-4 rounded flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors flex-shrink-0"
                                        title="Assign Users to this Column"
                                      >
                                        <ChevronDown className="h-2.5 w-2.5" />
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-56 p-2.5 shadow-xl border border-muted z-50" side="bottom" align="center">
                                      <div className="space-y-1.5">
                                        <p className="text-[10px] font-bold text-foreground">Assign Users to &ldquo;{proc.name}&rdquo;</p>
                                        <div className="max-h-[160px] overflow-y-auto space-y-0.5 pr-0.5">
                                          {fcsUsers.length === 0 ? (
                                            <p className="text-[10px] text-muted-foreground italic text-center py-2">No users available.</p>
                                          ) : (
                                            fcsUsers.map(u => {
                                              const isChecked = assignedUserIds.includes(u._id);
                                              return (
                                                <button
                                                  key={u._id}
                                                  type="button"
                                                  onClick={() => handleToggleColumnUser(proc.key, u._id)}
                                                  className={cn(
                                                    "flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs font-medium transition-colors",
                                                    isChecked ? "bg-primary/10 text-primary" : "hover:bg-muted/60 text-foreground"
                                                  )}
                                                >
                                                  <div className={cn("h-3.5 w-3.5 rounded-sm border flex items-center justify-center shrink-0", isChecked ? "bg-primary border-primary" : "border-muted-foreground/40")}>
                                                    {isChecked && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                                                  </div>
                                                  <div className="flex flex-col items-start">
                                                    <span className="text-[10px]">{u.name}</span>
                                                    <span className="text-[9px] text-muted-foreground">{u.email}</span>
                                                  </div>
                                                </button>
                                              );
                                            })
                                          )}
                                        </div>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                )}
                              </div>
                            )}
                          </div>
                          
                          {/* Edit/Delete custom column buttons — Super Admin, only while editing, only for custom columns, placed in top right corner */}
                          {isSuperAdmin && isEditing && !proc.isStatic && (
                            <div className="absolute top-1 right-1 flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setEditingColumnKey(proc.key);
                                  setEditingColumnName(proc.name);
                                  setEditingColumnHasCycleTime(!!proc.hasCycleTime);
                                  setEditingColumnHasTooling(!!proc.hasTooling);
                                  setEditingColLinkedMachine((proc as any).linkedMachine || "");
                                  setEditingColCustomIncludes((proc as any).customIncludes || []);
                                  setShowEditColumnModal(true);
                                }}
                                className="h-4 w-4 rounded flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                title="Edit Column Configuration"
                              >
                                <Edit className="h-2.5 w-2.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDeleteCustomColumn(proc.key, proc.name);
                                }}
                                className="h-4 w-4 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                title="Delete Custom Column"
                              >
                                <Trash2 className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          )}
                        </TableHead>
                      );
                    })}
                    <TableHead 
                      rowSpan={2} 
                      className={cn(
                        "text-center font-bold text-[10px] text-muted-foreground border-r border-slate-200 min-w-[100px] bg-muted/30 whitespace-normal leading-tight py-2 select-none transition-colors",
                        isEditing && "hover:bg-slate-200/80 cursor-pointer hover:outline-dashed hover:outline-1 hover:outline-primary/45 rounded"
                      )}
                      onDoubleClick={() => triggerFormulaEdit("subtotal_cost_rm_formula")}
                      title={`Formula: ${formulas.subtotal_cost_rm}`}
                    >
                      Subtotal<br />Cost (RM)
                    </TableHead>
                    <TableHead 
                      rowSpan={2} 
                      className={cn(
                        "text-center font-bold text-[10px] text-muted-foreground border-r border-slate-200 min-w-[100px] bg-muted/30 whitespace-normal leading-tight py-2 select-none transition-colors",
                        isEditing && "hover:bg-slate-200/80 cursor-pointer hover:outline-dashed hover:outline-1 hover:outline-primary/45 rounded"
                      )}
                      onDoubleClick={() => triggerFormulaEdit("subtotal_cost_scrap_formula")}
                      title={`Formula: ${formulas.subtotal_cost_scrap}`}
                    >
                      Subtotal<br />Cost (Scrap)
                    </TableHead>
                    <TableHead 
                      rowSpan={2} 
                      className={cn(
                        "text-center font-bold text-[10px] text-muted-foreground border-r border-slate-200 min-w-[100px] bg-muted/30 whitespace-normal leading-tight py-2 select-none transition-colors",
                        isEditing && "hover:bg-slate-200/80 cursor-pointer hover:outline-dashed hover:outline-1 hover:outline-primary/45 rounded"
                      )}
                      onDoubleClick={() => triggerFormulaEdit("rejection_cost_scrap_formula")}
                      title={`Formula: ${formulas.rejection_cost_scrap}`}
                    >
                      {isEditing ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span>Rejection Cost<br />(RM) @</span>
                          <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                            <Input
                              value={columnRates.rejection_percent ?? "5"}
                              onChange={e => setColumnRates(prev => ({ ...prev, rejection_percent: e.target.value }))}
                              className="h-6 w-12 text-center text-[10px] font-bold bg-background border-slate-300 text-primary focus-visible:ring-primary/40 px-1"
                              onDoubleClick={e => e.stopPropagation()}
                            />
                            <span className="text-[10px]">%</span>
                          </div>
                        </div>
                      ) : (
                        <>Rejection Cost<br />(RM) @ {columnRates.rejection_percent ?? "5"}%</>
                      )}
                    </TableHead>
                    <TableHead 
                      rowSpan={2} 
                      className={cn(
                        "text-center font-bold text-[10px] text-muted-foreground border-r border-slate-200 min-w-[90px] bg-muted/30 whitespace-normal leading-tight py-2 select-none transition-colors",
                        isEditing && "hover:bg-slate-200/80 cursor-pointer hover:outline-dashed hover:outline-1 hover:outline-primary/45 rounded"
                      )}
                      onDoubleClick={() => triggerFormulaEdit("overheads_rm_formula")}
                      title={`Formula: ${formulas.overheads_rm}`}
                    >
                      {isEditing ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span>Overheads<br />@</span>
                          <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                            <Input
                              value={columnRates.overheads_percent ?? "18"}
                              onChange={e => setColumnRates(prev => ({ ...prev, overheads_percent: e.target.value }))}
                              className="h-6 w-12 text-center text-[10px] font-bold bg-background border-slate-300 text-primary focus-visible:ring-primary/40 px-1"
                              onDoubleClick={e => e.stopPropagation()}
                            />
                            <span className="text-[10px]">%</span>
                          </div>
                        </div>
                      ) : (
                        <>Overheads<br />@ {columnRates.overheads_percent ?? "18"}%</>
                      )}
                    </TableHead>
                    <TableHead 
                      rowSpan={2} 
                      className={cn(
                        "text-center font-bold text-[10px] text-muted-foreground border-r border-slate-200 min-w-[100px] bg-muted/30 whitespace-normal leading-tight py-2 select-none transition-colors",
                        isEditing && "hover:bg-slate-200/80 cursor-pointer hover:outline-dashed hover:outline-1 hover:outline-primary/45 rounded"
                      )}
                      onDoubleClick={() => triggerFormulaEdit("grand_total_cost_rm_formula")}
                      title={`Formula: ${formulas.grand_total_cost_rm}`}
                    >
                      Grand Total<br />Cost (RM)
                    </TableHead>
                    <TableHead 
                      rowSpan={2} 
                      className={cn(
                        "text-center font-bold text-[10px] text-muted-foreground border-r border-slate-200 min-w-[100px] bg-muted/30 whitespace-normal leading-tight py-2 select-none transition-colors",
                        isEditing && "hover:bg-slate-200/80 cursor-pointer hover:outline-dashed hover:outline-1 hover:outline-primary/45 rounded"
                      )}
                      onDoubleClick={() => triggerFormulaEdit("grand_total_cost_scrap_formula")}
                      title={`Formula: ${formulas.grand_total_cost_scrap}`}
                    >
                      Grand Total<br />Cost (Scrap)
                    </TableHead>
                    <TableHead rowSpan={2} className="text-center font-bold text-[10px] text-muted-foreground border-r border-slate-200 min-w-[95px] bg-muted/30 whitespace-normal leading-tight py-2">Selling<br />Price</TableHead>
                    <TableHead 
                      rowSpan={2} 
                      className={cn(
                        "text-center font-bold text-[10px] text-muted-foreground border-r border-slate-200 min-w-[85px] bg-muted/30 whitespace-normal leading-tight py-2 select-none transition-colors",
                        isEditing && "hover:bg-slate-200/80 cursor-pointer hover:outline-dashed hover:outline-1 hover:outline-primary/45 rounded"
                      )}
                      onDoubleClick={() => triggerFormulaEdit("profit_percent_formula")}
                      title={`Formula: ${formulas.profit_percent}`}
                    >
                      Profit %
                    </TableHead>
                    <TableHead 
                      rowSpan={2} 
                      className={cn(
                        "text-center font-bold text-[10px] text-muted-foreground border-r border-slate-200 min-w-[90px] bg-muted/30 whitespace-normal leading-tight py-2 select-none transition-colors",
                        isEditing && "hover:bg-slate-200/80 cursor-pointer hover:outline-dashed hover:outline-1 hover:outline-primary/45 rounded"
                      )}
                      onDoubleClick={() => triggerFormulaEdit("profit_rs_formula")}
                      title={`Formula: ${formulas.profit_rs}`}
                    >
                      Profit<br />(Rs)
                    </TableHead>
                    <TableHead 
                      rowSpan={2} 
                      className={cn(
                        "text-center font-bold text-[10px] text-muted-foreground border-r border-slate-200 min-w-[100px] bg-muted/30 whitespace-normal leading-tight py-2 select-none transition-colors",
                        isEditing && "hover:bg-slate-200/80 cursor-pointer hover:outline-dashed hover:outline-1 hover:outline-primary/45 rounded"
                      )}
                      onDoubleClick={() => triggerFormulaEdit("raw_material_percent_formula")}
                      title={`Formula: ${formulas.raw_material_percent}`}
                    >
                      Raw<br />Material %
                    </TableHead>
                    <TableHead 
                      rowSpan={2} 
                      className={cn(
                        "text-center font-bold text-[10px] text-muted-foreground min-w-[100px] bg-muted/30 whitespace-normal leading-tight py-2 select-none transition-colors",
                        isEditing && "hover:bg-slate-200/80 cursor-pointer hover:outline-dashed hover:outline-1 hover:outline-primary/45 rounded"
                      )}
                      onDoubleClick={() => triggerFormulaEdit("foundry_conversion_percent_formula")}
                      title={`Formula: ${formulas.foundry_conversion_percent}`}
                    >
                      Foundry<br />Conversion %
                    </TableHead>
                    {isEditing && <TableHead rowSpan={2} className="border-l border-slate-200 w-16 bg-muted/30" />}
                  </TableRow>
                  <TableRow className="hover:bg-transparent text-center font-bold text-[9px] text-muted-foreground bg-muted/20">
                    {allProcesses.map(proc => {
                      const subCols = [];
                      const hasMetadata = !!proc.hasMetadata;
                      const hasCycleTime = proc.isStatic ? !proc.isSpecialMetrology : !!proc.hasCycleTime;
                      const hasTooling = proc.isStatic ? !!proc.hasTooling : !!proc.hasTooling;

                      if (hasMetadata) {
                        subCols.push(
                          <TableHead key={`${proc.key}_sub_meta`} className="text-center font-bold text-[9px] text-muted-foreground border-r border-slate-200 min-w-[85px] bg-muted/20 whitespace-normal leading-tight py-2">
                            Metadata
                          </TableHead>
                        );
                      }
                      if (hasCycleTime) {
                        subCols.push(
                          <TableHead key={`${proc.key}_sub_ct`} className="text-center font-bold text-[9px] text-muted-foreground border-r border-slate-200 min-w-[95px] bg-muted/20 whitespace-normal leading-tight py-2">
                            Cycle time in<br />seconds /<br />component
                          </TableHead>
                        );
                      }
                      if (proc.isSpecialMetrology) {
                        subCols.push(
                          <TableHead key={`${proc.key}_sub_pq`} className="text-center font-bold text-[9px] text-muted-foreground border-r border-slate-200 min-w-[85px] bg-muted/20 whitespace-normal leading-tight py-2">
                            Prod Qty
                          </TableHead>
                        );
                        subCols.push(
                          <TableHead key={`${proc.key}_sub_cost`} className="text-center font-bold text-[9px] text-muted-foreground border-r border-slate-200 min-w-[85px] bg-muted/20 whitespace-normal leading-tight py-2">
                            Cost
                          </TableHead>
                        );
                      } else if (proc.isSpecialPacking) {
                        subCols.push(
                          <TableHead key={`${proc.key}_sub_mc`} className="text-center font-bold text-[9px] text-muted-foreground border-r border-slate-200 min-w-[85px] bg-muted/20 whitespace-normal leading-tight py-2">
                            Mat Cost
                          </TableHead>
                        );
                      } else if (hasTooling) {
                        subCols.push(
                          <TableHead key={`${proc.key}_sub_tc`} className="text-center font-bold text-[9px] text-muted-foreground border-r border-slate-200 min-w-[95px] bg-muted/20 whitespace-normal leading-tight py-2">
                            Tooling cost /<br />component
                          </TableHead>
                        );
                      }

                      // Render custom include subheaders
                      const customIncludes = (!proc.isStatic && (proc as any).customIncludes) || [];
                      const checkedCustomIncludes = customIncludes.filter((ci: any) => ci.checked);
                      checkedCustomIncludes.forEach((ci: any) => {
                        subCols.push(
                          <TableHead key={`${proc.key}_sub_custom_${ci.key}`} className="text-center font-bold text-[9px] text-muted-foreground border-r border-slate-200 min-w-[100px] bg-muted/20 whitespace-normal leading-tight py-2">
                            {ci.label}
                          </TableHead>
                        );
                      });
                      const procDefaultFormula = proc.isSpecialMetrology
                        ? "[metrology_cost] / [production_quantity]"
                        : (proc.isSpecialPacking
                          ? "[cycle_time] * [rate_sec] + [packing_material_cost]"
                          : (proc.hasTooling
                            ? "[cycle_time] * [rate_sec] + [tooling_cost]"
                            : "[cycle_time] * [rate_sec]"));
                      const procFormula = firstRowVals[`${proc.key}_total_cost_formula`] || procDefaultFormula;

                      subCols.push(
                        <TableHead 
                          key={`${proc.key}_sub_tot`} 
                          className={cn(
                            "text-center font-bold text-[9px] text-muted-foreground border-r border-slate-200 min-w-[90px] bg-muted/20 whitespace-normal leading-tight py-2 select-none transition-colors",
                            isEditing && "hover:bg-slate-200/85 cursor-pointer hover:outline-dashed hover:outline-1 hover:outline-primary/45 rounded"
                          )}
                          onDoubleClick={() => triggerFormulaEdit(`${proc.key}_total_cost_formula`)}
                          title={`Formula: ${procFormula}`}
                        >
                          Total cost
                        </TableHead>
                      );
                      return subCols;
                    })}
                  </TableRow>

                  {/* Machine Hour Rate Row 3 */}
                  <TableRow className="bg-emerald-500/5 hover:bg-emerald-500/10 h-10 border-b border-slate-200 text-[11px]">
                    <TableCell colSpan={3} className="font-extrabold text-[10px] uppercase text-muted-foreground border-r border-slate-200 text-left pl-4">
                      Machine hour rate (Cost / second)
                    </TableCell>
                    <TableCell colSpan={6} className="border-r border-slate-200" />
                    <TableCell className="text-center border-r border-slate-200 font-bold font-mono text-emerald-600">
                      {isEditing ? (
                        <Input
                          value={columnRates.foundry_conversion_rate || "110"}
                          onChange={(e) => setColumnRates(prev => ({ ...prev, foundry_conversion_rate: e.target.value }))}
                          className="h-7 w-16 text-center text-xs font-mono bg-background border-slate-200 text-emerald-600 focus-visible:ring-emerald-400"
                        />
                      ) : (
                        columnRates.foundry_conversion_rate || "110"
                      )}
                    </TableCell>
                    <TableCell className="border-r border-slate-200" />
                    {customColumns.filter(c => c.hasMetadata && !c.hasCycleTime && !c.hasTooling).map(col => (
                      <TableCell key={`rate_meta_${col.key}`} className="border-r border-slate-200" />
                    ))}
                    {allProcesses.map(proc => {
                      const hasMetadata = !!proc.hasMetadata;
                      const hasCycleTime = proc.isStatic ? !proc.isSpecialMetrology : !!proc.hasCycleTime;
                      const hasTooling = proc.isStatic ? !!proc.hasTooling : !!proc.hasTooling;
                      const cellSpan = (hasMetadata ? 1 : 0) + (hasCycleTime ? 1 : 0) + (hasTooling ? 1 : 0) + (proc.isSpecialMetrology ? 2 : 0) + (proc.isSpecialPacking ? 1 : 0);
                      return (
                        <TableCell
                          key={`rate_${proc.key}`}
                          colSpan={cellSpan + 1}
                          className="text-center border-r border-slate-200 font-bold font-mono text-emerald-600"
                        >
                          {isEditing && !(proc.isStatic || !!(proc as any).linkedMachine) ? (
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-[9px] text-muted-foreground">Rate:</span>
                              <Input
                                value={columnRates[proc.key] || "0.00"}
                                onChange={(e) => setColumnRates(prev => ({ ...prev, [proc.key]: e.target.value }))}
                                className="h-7 w-20 text-center text-xs font-mono bg-background border-slate-200 text-emerald-600 focus-visible:ring-emerald-400 mx-auto"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              {isEditing && <span className="text-[9px] text-slate-400 font-semibold" title="Auto-filled from database, configure machine to change rate">Auto-Rate:</span>}
                              <span>{parseFloat(columnRates[proc.key] || "0").toFixed(4)}</span>
                            </div>
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell colSpan={11} />
                    {isEditing && <TableCell />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, rowIndex) => {
                    const calcs = calculateRowFields(row);
                    const vals = row.values || {};

                    const roughWeight = parseFloat(vals.rough_casting_weight) || 0;
                    const finishWeight = parseFloat(vals.finish_weight) || 0;
                    const ratePerKg = calcs.ratePerKg;
                    const scrapRatePerKg = calcs.scrapRatePerKg;
                    const foundryRate = parseFloat(columnRates.foundry_conversion_rate) || 110;
                    const semiMachiningCost = parseFloat(vals.semi_machining_cost) || 0;
                    const sellingPrice = parseFloat(vals.selling_price) || 0;

                    return (
                      <TableRow key={row._id || rowIndex} className="hover:bg-muted/10 border-b border-slate-200 transition-colors duration-150">
                        <TableCell className="p-3 border-r border-b border-slate-200 font-bold text-xs text-foreground uppercase">
                          {isCellEditing(rowIndex, "partName") ? (
                            <EditableInput
                              value={row.partName}
                              onChange={(val) => handleRowFieldChange(rowIndex, "partName", val)}
                              onClose={() => setActiveEditCell(null)}
                              className="h-8 text-xs font-bold bg-background border-input rounded-lg w-full"
                            />
                          ) : (
                            <span
                              onDoubleClick={() => isEditing && setActiveEditCell({ rowIndex, fieldKey: "partName" })}
                              className={cn(
                                "block w-full py-1 px-1.5",
                                isEditing && "hover:outline-dashed hover:outline-1 hover:outline-primary/50 cursor-pointer rounded"
                              )}
                            >
                              {row.partName}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="p-3 border-r border-b border-slate-200 font-mono text-xs">
                          {isCellEditing(rowIndex, "partNumber") ? (
                            <EditableInput
                              value={row.partNumber}
                              onChange={(val) => handleRowFieldChange(rowIndex, "partNumber", val)}
                              onClose={() => setActiveEditCell(null)}
                              className="h-8 text-xs font-mono bg-background border-input rounded-lg w-full"
                            />
                          ) : (
                            <span
                              onDoubleClick={() => isEditing && setActiveEditCell({ rowIndex, fieldKey: "partNumber" })}
                              className={cn(
                                "block w-full py-1 px-1.5 font-mono",
                                isEditing && "hover:outline-dashed hover:outline-1 hover:outline-primary/50 cursor-pointer rounded"
                              )}
                            >
                              {row.partNumber}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="p-3 border-r border-b border-slate-200 text-xs">
                          {isCellEditing(rowIndex, "materialName") ? (
                            <EditableSelect
                              value={row.materialName}
                              options={activeMaterialDesignations}
                              onChange={(val) => handleRowFieldChange(rowIndex, "materialName", val)}
                              onClose={() => setActiveEditCell(null)}
                              className="h-8 text-xs"
                            />
                          ) : (
                            <span
                              onDoubleClick={() => isEditing && setActiveEditCell({ rowIndex, fieldKey: "materialName" })}
                              className={cn(
                                "block w-full py-1 px-1.5 font-semibold text-muted-foreground uppercase",
                                isEditing && "hover:outline-dashed hover:outline-1 hover:outline-primary/50 cursor-pointer rounded"
                              )}
                            >
                              {row.materialName}
                            </span>
                          )}
                        </TableCell>
 
                        <TableCell className="p-3 border-r border-b border-slate-200 text-right">
                          {isCellEditing(rowIndex, "rough_casting_weight") ? (
                            <EditableInput
                              value={vals.rough_casting_weight || "0"}
                              onChange={(val) => handleCellChange(rowIndex, "rough_casting_weight", val)}
                              onClose={() => setActiveEditCell(null)}
                              className="h-8 text-xs bg-background border-input rounded-lg text-right w-full font-mono"
                              placeholder="0.00"
                            />
                          ) : (
                            <span
                              onDoubleClick={() => isEditing && setActiveEditCell({ rowIndex, fieldKey: "rough_casting_weight" })}
                              className={cn(
                                "block w-full py-1 px-1.5 font-mono font-medium",
                                isEditing && "hover:outline-dashed hover:outline-1 hover:outline-primary/50 cursor-pointer rounded"
                              )}
                            >
                              {roughWeight.toFixed(3)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="p-3 border-r border-b border-slate-200 text-right">
                          {isCellEditing(rowIndex, "finish_weight") ? (
                            <EditableInput
                              value={vals.finish_weight || "0"}
                              onChange={(val) => handleCellChange(rowIndex, "finish_weight", val)}
                              onClose={() => setActiveEditCell(null)}
                              className="h-8 text-xs bg-background border-input rounded-lg text-right w-full font-mono"
                              placeholder="0.00"
                            />
                          ) : (
                            <span
                              onDoubleClick={() => isEditing && setActiveEditCell({ rowIndex, fieldKey: "finish_weight" })}
                              className={cn(
                                "block w-full py-1 px-1.5 font-mono font-medium",
                                isEditing && "hover:outline-dashed hover:outline-1 hover:outline-primary/50 cursor-pointer rounded"
                              )}
                            >
                              {finishWeight.toFixed(3)}
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="p-3 border-r border-b border-slate-200 text-right font-mono font-semibold text-muted-foreground">
                          {calcs.ratePerKg.toFixed(2)}
                        </TableCell>
                        <TableCell className="p-3 border-r border-b border-slate-200 text-right font-mono font-semibold text-muted-foreground">
                          {calcs.scrapRatePerKg.toFixed(2)}
                        </TableCell>

                        <TableCell 
                          className="p-3 border-r border-b border-slate-200 text-right font-mono font-bold text-foreground"
                          title={`Formula: ${formulas.origin_raw_material_cost_component}`}
                        >
                          {calcs.originRawComponentCost.toFixed(2)}
                        </TableCell>
                        <TableCell 
                          className="p-3 border-r border-b border-slate-200 text-right font-mono font-bold text-foreground"
                          title={`Formula: ${formulas.scrap_raw_material_cost_component}`}
                        >
                          {calcs.scrapRawComponentCost.toFixed(2)}
                        </TableCell>
                        <TableCell 
                          className="p-3 border-r border-b border-slate-200 text-right font-mono font-bold text-sky-600 dark:text-sky-400"
                          title={`Formula: ${formulas.foundry_conversion_cost_component}`}
                        >
                          {calcs.foundryConversionCost.toFixed(2)}
                        </TableCell>

                        <TableCell className="p-3 border-r border-b border-slate-200 text-right">
                          {isCellEditing(rowIndex, "semi_machining_cost") ? (
                            <EditableInput
                              value={vals.semi_machining_cost || "0"}
                              onChange={(val) => handleCellChange(rowIndex, "semi_machining_cost", val)}
                              onClose={() => setActiveEditCell(null)}
                              className="h-8 text-xs bg-background border-input rounded-lg text-right w-full font-mono"
                              placeholder="0.00"
                            />
                          ) : (
                            <span
                              onDoubleClick={() => isEditing && setActiveEditCell({ rowIndex, fieldKey: "semi_machining_cost" })}
                              className={cn(
                                "block w-full py-1 px-1.5 font-mono font-bold",
                                isEditing && "hover:outline-dashed hover:outline-1 hover:outline-primary/50 cursor-pointer rounded"
                              )}
                            >
                              {parseFloat(vals.semi_machining_cost || "0").toFixed(2)}
                            </span>
                          )}
                        </TableCell>
 
                        {customColumns.filter(c => c.hasMetadata && !c.hasCycleTime && !c.hasTooling).map(col => {
                          const fieldKey = `custom_${col.key}_metadata`;
                          return (
                            <TableCell key={col.key} className="p-2 border-r border-b border-slate-200 text-center">
                              {isCellEditing(rowIndex, fieldKey) ? (
                                <EditableInput
                                  value={vals[`${col.key}_metadata`] || ""}
                                  onChange={(val) => handleCellChange(rowIndex, `${col.key}_metadata`, val)}
                                  onClose={() => setActiveEditCell(null)}
                                  className="h-8 w-20 text-center text-xs font-mono bg-background border-input rounded-lg mx-auto"
                                />
                              ) : (
                                <span
                                  onDoubleClick={() => isEditing && setActiveEditCell({ rowIndex, fieldKey })}
                                  className={cn(
                                    "block w-full py-1 px-1 font-mono text-muted-foreground",
                                    isEditing && "hover:outline-dashed hover:outline-1 hover:outline-primary/50 cursor-pointer rounded"
                                  )}
                                >
                                  {vals[`${col.key}_metadata`] || ""}
                                </span>
                              )}
                            </TableCell>
                          );
                        })}

                        {allProcesses.map(proc => {
                          const cells = [];
                          const loopIndices = (row.selectedLoop && row.selectedLoop.length > 0)
                            ? row.selectedLoop.map((p, i) => (p === proc.key ? i : -1)).filter(i => i !== -1)
                            : [];

                          const hasLoop = row.selectedLoop && row.selectedLoop.length > 0;
                          const inLoop = loopIndices.length > 0;

                          const hasMetadata = !!proc.hasMetadata;
                          const hasCycleTime = proc.isStatic ? !proc.isSpecialMetrology : !!proc.hasCycleTime;
                          const hasTooling = proc.isStatic ? !!proc.hasTooling : !!proc.hasTooling;
                          const canEditProc = isEditing && canEditProcess(proc.key);

                          if (hasMetadata) {
                            cells.push(
                              <TableCell key={`${proc.key}_meta_val`} className={cn("p-2 border-r border-b border-slate-200 text-center align-middle", hasLoop && !inLoop && "bg-muted/10 opacity-40")}>
                                {!hasLoop ? (
                                  isCellEditing(rowIndex, `${proc.key}_metadata`) ? (
                                    <EditableInput
                                      value={vals[`${proc.key}_metadata`] || ""}
                                      onChange={(val) => handleCellChange(rowIndex, `${proc.key}_metadata`, val)}
                                      onClose={() => setActiveEditCell(null)}
                                      className="h-8 w-16 text-center text-xs font-mono bg-background border-input rounded-lg mx-auto"
                                    />
                                  ) : (
                                    <span
                                      onDoubleClick={() => canEditProc && setActiveEditCell({ rowIndex, fieldKey: `${proc.key}_metadata` })}
                                      className={cn(
                                        "block w-full py-1 px-1 font-mono text-muted-foreground",
                                        canEditProc && "hover:outline-dashed hover:outline-1 hover:outline-primary/50 cursor-pointer rounded"
                                      )}
                                    >
                                      {vals[`${proc.key}_metadata`] || ""}
                                    </span>
                                  )
                                ) : !inLoop ? (
                                  <span className="text-[10px] text-muted-foreground font-light italic">Skipped</span>
                                ) : (
                                  <div className="flex flex-col gap-1.5 justify-center py-1">
                                    {loopIndices.map((idx, sIdx) => {
                                      const fieldKey = `${proc.key}_${idx}_metadata`;
                                      return (
                                        <div key={idx} className={cn("w-full flex items-center justify-center gap-1.5", sIdx > 0 && "border-t border-slate-200/50 pt-1.5")}>
                                          {isCellEditing(rowIndex, fieldKey) ? (
                                            <div className="flex flex-col items-center">
                                              <span className="text-[8px] text-primary/60 font-semibold mb-0.5">Visit {sIdx + 1}</span>
                                              <EditableInput
                                                value={vals[`${proc.key}_${idx}_metadata`] || ""}
                                                onChange={(val) => handleCellChange(rowIndex, `${proc.key}_${idx}_metadata`, val)}
                                                onClose={() => setActiveEditCell(null)}
                                                className="h-8 w-16 text-center text-xs font-mono bg-background border-input rounded-lg"
                                              />
                                            </div>
                                          ) : (
                                            <div 
                                              onDoubleClick={() => canEditProc && setActiveEditCell({ rowIndex, fieldKey })}
                                              className={cn(
                                                "flex flex-col items-center w-full py-0.5",
                                                canEditProc && "hover:outline-dashed hover:outline-1 hover:outline-primary/50 cursor-pointer rounded"
                                              )}
                                            >
                                              <span className="text-[8px] text-muted-foreground/60 font-semibold">V{sIdx + 1}</span>
                                              <span className="font-mono text-muted-foreground">{vals[`${proc.key}_${idx}_metadata`] || ""}</span>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </TableCell>
                            );
                          }

                           if (hasCycleTime) {
                            cells.push(
                              <TableCell key={`${proc.key}_ct_val`} className={cn("p-2 border-r border-b border-slate-200 text-center align-middle", hasLoop && !inLoop && "bg-muted/10 opacity-40")}>
                                {!hasLoop ? (
                                  isCellEditing(rowIndex, `${proc.key}_cycle_time`) ? (
                                    <EditableInput
                                      value={vals[`${proc.key}_cycle_time`] || "0"}
                                      onChange={(val) => handleCellChange(rowIndex, `${proc.key}_cycle_time`, val)}
                                      onClose={() => setActiveEditCell(null)}
                                      className="h-8 w-16 text-center text-xs font-mono bg-background border-input rounded-lg mx-auto"
                                      placeholder="0"
                                    />
                                  ) : (
                                    <span
                                      onDoubleClick={() => canEditProc && setActiveEditCell({ rowIndex, fieldKey: `${proc.key}_cycle_time` })}
                                      className={cn(
                                        "block w-full py-1 px-1 font-mono text-muted-foreground",
                                        canEditProc && "hover:outline-dashed hover:outline-1 hover:outline-primary/50 cursor-pointer rounded"
                                      )}
                                    >
                                      {parseFloat(vals[`${proc.key}_cycle_time`] || "0")}
                                    </span>
                                  )
                                ) : !inLoop ? (
                                  <span className="text-[10px] text-muted-foreground font-light italic">Skipped</span>
                                ) : (
                                  <div className="flex flex-col gap-1.5 justify-center py-1">
                                    {loopIndices.map((idx, sIdx) => {
                                      const fieldKey = `${proc.key}_${idx}_cycle_time`;
                                      return (
                                        <div key={idx} className={cn("w-full flex items-center justify-center gap-1.5", sIdx > 0 && "border-t border-slate-200/50 pt-1.5")}>
                                          {isCellEditing(rowIndex, fieldKey) ? (
                                            <div className="flex flex-col items-center">
                                              <span className="text-[8px] text-primary/60 font-semibold mb-0.5">Visit {sIdx + 1}</span>
                                              <EditableInput
                                                value={vals[`${proc.key}_${idx}_cycle_time`] || "0"}
                                                onChange={(val) => handleCellChange(rowIndex, `${proc.key}_${idx}_cycle_time`, val)}
                                                onClose={() => setActiveEditCell(null)}
                                                className="h-8 w-16 text-center text-xs font-mono bg-background border-input rounded-lg"
                                                placeholder="0"
                                              />
                                            </div>
                                          ) : (
                                            <div 
                                              onDoubleClick={() => canEditProc && setActiveEditCell({ rowIndex, fieldKey })}
                                              className={cn(
                                                "flex flex-col items-center w-full py-0.5",
                                                canEditProc && "hover:outline-dashed hover:outline-1 hover:outline-primary/50 cursor-pointer rounded"
                                              )}
                                            >
                                              <span className="text-[8px] text-muted-foreground/60 font-semibold">V{sIdx + 1}</span>
                                              <span className="font-mono text-muted-foreground">{parseFloat(vals[`${proc.key}_${idx}_cycle_time`] || "0")}</span>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </TableCell>
                            );
                          }

                          // Render custom includes cells
                          const customIncludes = (!proc.isStatic && (proc as any).customIncludes) || [];
                          const checkedCustomIncludes = customIncludes.filter((ci: any) => ci.checked);
                          checkedCustomIncludes.forEach((ci: any) => {
                            const fieldKey = `${proc.key}_custom_${ci.key}`;
                            cells.push(
                              <TableCell key={`${proc.key}_custom_${ci.key}_val`} className={cn("p-2 border-r border-b border-slate-200 text-center align-middle", hasLoop && !inLoop && "bg-muted/10 opacity-40")}>
                                {!hasLoop ? (
                                  isCellEditing(rowIndex, fieldKey) ? (
                                    <EditableInput
                                      value={vals[fieldKey] || ""}
                                      onChange={(val) => handleCellChange(rowIndex, fieldKey, val)}
                                      onClose={() => setActiveEditCell(null)}
                                      className="h-8 w-16 text-center text-xs font-mono bg-background border-input rounded-lg text-left mx-auto"
                                      placeholder="Text/No."
                                    />
                                  ) : (
                                    <span
                                      onDoubleClick={() => canEditProc && setActiveEditCell({ rowIndex, fieldKey })}
                                      className={cn(
                                        "block w-full py-1 px-1 font-mono text-muted-foreground min-h-[20px] select-none",
                                        canEditProc && "hover:outline-dashed hover:outline-1 hover:outline-primary/50 cursor-pointer rounded"
                                      )}
                                    >
                                      {vals[fieldKey] || "-"}
                                    </span>
                                  )
                                ) : !inLoop ? (
                                  <span className="text-[10px] text-muted-foreground font-light italic">Skipped</span>
                                ) : (
                                  <div className="flex flex-col gap-1.5 justify-center py-1">
                                    {loopIndices.map((idx, sIdx) => {
                                      const loopFieldKey = `${proc.key}_${idx}_custom_${ci.key}`;
                                      return (
                                        <div key={idx} className={cn("w-full flex items-center justify-center gap-1.5", sIdx > 0 && "border-t border-slate-200/50 pt-1.5")}>
                                          {isCellEditing(rowIndex, loopFieldKey) ? (
                                            <div className="flex flex-col items-center">
                                              <span className="text-[8px] text-primary/60 font-semibold mb-0.5">Visit {sIdx + 1}</span>
                                              <EditableInput
                                                value={vals[loopFieldKey] || ""}
                                                onChange={(val) => handleCellChange(rowIndex, loopFieldKey, val)}
                                                onClose={() => setActiveEditCell(null)}
                                                className="h-8 w-16 text-center text-xs font-mono bg-background border-input rounded-lg text-right"
                                                placeholder="Text/No."
                                              />
                                            </div>
                                          ) : (
                                            <div 
                                              onDoubleClick={() => canEditProc && setActiveEditCell({ rowIndex, fieldKey: loopFieldKey })}
                                              className={cn(
                                                "flex flex-col items-center w-full py-0.5",
                                                canEditProc && "hover:outline-dashed hover:outline-1 hover:outline-primary/50 cursor-pointer rounded"
                                              )}
                                            >
                                              <span className="text-[8px] text-muted-foreground/60 font-semibold">V{sIdx + 1}</span>
                                              <span className="font-mono text-muted-foreground">{vals[loopFieldKey] || "-"}</span>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </TableCell>
                            );
                          });

                          if (proc.isSpecialMetrology) {
                            cells.push(
                              <TableCell key={`${proc.key}_pq_val`} className={cn("p-2 border-r border-b border-slate-200 text-center align-middle", hasLoop && !inLoop && "bg-muted/10 opacity-40")}>
                                {!hasLoop ? (
                                  isCellEditing(rowIndex, "metrology_production_quantity") ? (
                                    <EditableInput
                                      value={vals.metrology_production_quantity || "1000"}
                                      onChange={(val) => handleCellChange(rowIndex, "metrology_production_quantity", val)}
                                      onClose={() => setActiveEditCell(null)}
                                      className="h-8 w-16 text-center text-xs font-mono bg-background border-input rounded-lg mx-auto"
                                    />
                                  ) : (
                                    <span
                                      onDoubleClick={() => canEditProc && setActiveEditCell({ rowIndex, fieldKey: "metrology_production_quantity" })}
                                      className={cn(
                                        "block w-full py-1 px-1 font-mono text-muted-foreground",
                                        canEditProc && "hover:outline-dashed hover:outline-1 hover:outline-primary/50 cursor-pointer rounded"
                                      )}
                                    >
                                      {vals.metrology_production_quantity || "1000"}
                                    </span>
                                  )
                                ) : !inLoop ? (
                                  <span className="text-[10px] text-muted-foreground font-light italic">Skipped</span>
                                ) : (
                                  <div className="flex flex-col gap-1.5 justify-center py-1">
                                    {loopIndices.map((idx, sIdx) => {
                                      const fieldKey = `${proc.key}_${idx}_production_quantity`;
                                      return (
                                        <div key={idx} className={cn("w-full flex items-center justify-center gap-1.5", sIdx > 0 && "border-t border-slate-200/50 pt-1.5")}>
                                          {isCellEditing(rowIndex, fieldKey) ? (
                                            <div className="flex flex-col items-center">
                                              <span className="text-[8px] text-primary/60 font-semibold mb-0.5">Visit {sIdx + 1}</span>
                                              <EditableInput
                                                value={vals[`${proc.key}_${idx}_production_quantity`] || "1000"}
                                                onChange={(val) => handleCellChange(rowIndex, `${proc.key}_${idx}_production_quantity`, val)}
                                                onClose={() => setActiveEditCell(null)}
                                                className="h-8 w-16 text-center text-xs font-mono bg-background border-input rounded-lg"
                                              />
                                            </div>
                                          ) : (
                                            <div 
                                              onDoubleClick={() => canEditProc && setActiveEditCell({ rowIndex, fieldKey })}
                                              className={cn(
                                                "flex flex-col items-center w-full py-0.5",
                                                canEditProc && "hover:outline-dashed hover:outline-1 hover:outline-primary/50 cursor-pointer rounded"
                                              )}
                                            >
                                              <span className="text-[8px] text-muted-foreground/60 font-semibold">V{sIdx + 1}</span>
                                              <span className="font-mono text-muted-foreground">{vals[`${proc.key}_${idx}_production_quantity`] || "1000"}</span>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </TableCell>
                            );
                            cells.push(
                              <TableCell key={`${proc.key}_cost_val`} className={cn("p-2 border-r border-b border-slate-200 text-center align-middle", hasLoop && !inLoop && "bg-muted/10 opacity-40")}>
                                {!hasLoop ? (
                                  isCellEditing(rowIndex, "metrology_cost") ? (
                                    <EditableInput
                                      value={vals.metrology_cost || "0"}
                                      onChange={(val) => handleCellChange(rowIndex, "metrology_cost", val)}
                                      onClose={() => setActiveEditCell(null)}
                                      className="h-8 w-16 text-center text-xs font-mono bg-background border-input rounded-lg text-right mx-auto"
                                    />
                                  ) : (
                                    <span
                                      onDoubleClick={() => canEditProc && setActiveEditCell({ rowIndex, fieldKey: "metrology_cost" })}
                                      className={cn(
                                        "block w-full py-1 px-1 font-mono text-muted-foreground",
                                        canEditProc && "hover:outline-dashed hover:outline-1 hover:outline-primary/50 cursor-pointer rounded"
                                      )}
                                    >
                                      {parseFloat(vals.metrology_cost || "0").toFixed(2)}
                                    </span>
                                  )
                                ) : !inLoop ? (
                                  <span className="text-[10px] text-muted-foreground font-light italic">Skipped</span>
                                ) : (
                                  <div className="flex flex-col gap-1.5 justify-center py-1">
                                    {loopIndices.map((idx, sIdx) => {
                                      const fieldKey = `${proc.key}_${idx}_cost`;
                                      return (
                                        <div key={idx} className={cn("w-full flex items-center justify-center gap-1.5", sIdx > 0 && "border-t border-slate-200/50 pt-1.5")}>
                                          {isCellEditing(rowIndex, fieldKey) ? (
                                            <div className="flex flex-col items-center">
                                              <span className="text-[8px] text-primary/60 font-semibold mb-0.5">Visit {sIdx + 1}</span>
                                              <EditableInput
                                                value={vals[`${proc.key}_${idx}_cost`] || "0"}
                                                onChange={(val) => handleCellChange(rowIndex, `${proc.key}_${idx}_cost`, val)}
                                                onClose={() => setActiveEditCell(null)}
                                                className="h-8 w-16 text-center text-xs font-mono bg-background border-input rounded-lg text-right"
                                              />
                                            </div>
                                          ) : (
                                            <div 
                                              onDoubleClick={() => canEditProc && setActiveEditCell({ rowIndex, fieldKey })}
                                              className={cn(
                                                "flex flex-col items-center w-full py-0.5",
                                                canEditProc && "hover:outline-dashed hover:outline-1 hover:outline-primary/50 cursor-pointer rounded"
                                              )}
                                            >
                                              <span className="text-[8px] text-muted-foreground/60 font-semibold">V{sIdx + 1}</span>
                                              <span className="font-mono text-muted-foreground">{parseFloat(vals[`${proc.key}_${idx}_cost`] || "0").toFixed(2)}</span>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </TableCell>
                            );
                          } else if (proc.isSpecialPacking) {
                            cells.push(
                              <TableCell key={`${proc.key}_mat_val`} className={cn("p-2 border-r border-b border-slate-200 text-center align-middle", hasLoop && !inLoop && "bg-muted/10 opacity-40")}>
                                {!hasLoop ? (
                                  isCellEditing(rowIndex, "packing_cost_packing_material_cost") ? (
                                    <EditableInput
                                      value={vals.packing_cost_packing_material_cost || "0"}
                                      onChange={(val) => handleCellChange(rowIndex, "packing_cost_packing_material_cost", val)}
                                      onClose={() => setActiveEditCell(null)}
                                      className="h-8 w-16 text-center text-xs font-mono bg-background border-input rounded-lg text-right mx-auto"
                                    />
                                  ) : (
                                    <span
                                      onDoubleClick={() => canEditProc && setActiveEditCell({ rowIndex, fieldKey: "packing_cost_packing_material_cost" })}
                                      className={cn(
                                        "block w-full py-1 px-1 font-mono text-muted-foreground",
                                        canEditProc && "hover:outline-dashed hover:outline-1 hover:outline-primary/50 cursor-pointer rounded"
                                      )}
                                    >
                                      {parseFloat(vals.packing_cost_packing_material_cost || "0").toFixed(2)}
                                    </span>
                                  )
                                ) : !inLoop ? (
                                  <span className="text-[10px] text-muted-foreground font-light italic">Skipped</span>
                                ) : (
                                  <div className="flex flex-col gap-1.5 justify-center py-1">
                                    {loopIndices.map((idx, sIdx) => {
                                      const fieldKey = `${proc.key}_${idx}_packing_material_cost`;
                                      return (
                                        <div key={idx} className={cn("w-full flex items-center justify-center gap-1.5", sIdx > 0 && "border-t border-slate-200/50 pt-1.5")}>
                                          {isCellEditing(rowIndex, fieldKey) ? (
                                            <div className="flex flex-col items-center">
                                              <span className="text-[8px] text-primary/60 font-semibold mb-0.5">Visit {sIdx + 1}</span>
                                              <EditableInput
                                                value={vals[`${proc.key}_${idx}_packing_material_cost`] || "0"}
                                                onChange={(val) => handleCellChange(rowIndex, `${proc.key}_${idx}_packing_material_cost`, val)}
                                                onClose={() => setActiveEditCell(null)}
                                                className="h-8 w-16 text-center text-xs font-mono bg-background border-input rounded-lg text-right"
                                              />
                                            </div>
                                          ) : (
                                            <div 
                                              onDoubleClick={() => canEditProc && setActiveEditCell({ rowIndex, fieldKey })}
                                              className={cn(
                                                "flex flex-col items-center w-full py-0.5",
                                                canEditProc && "hover:outline-dashed hover:outline-1 hover:outline-primary/50 cursor-pointer rounded"
                                              )}
                                            >
                                              <span className="text-[8px] text-muted-foreground/60 font-semibold">V{sIdx + 1}</span>
                                              <span className="font-mono text-muted-foreground">{parseFloat(vals[`${proc.key}_${idx}_packing_material_cost`] || "0").toFixed(2)}</span>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </TableCell>
                            );
                          } else if (hasTooling) {
                            cells.push(
                              <TableCell key={`${proc.key}_tc_val`} className={cn("p-2 border-r border-b border-slate-200 text-center align-middle", hasLoop && !inLoop && "bg-muted/10 opacity-40")}>
                                {!hasLoop ? (
                                  isCellEditing(rowIndex, `${proc.key}_tooling_cost`) ? (
                                    <EditableInput
                                      value={vals[`${proc.key}_tooling_cost`] || "0"}
                                      onChange={(val) => handleCellChange(rowIndex, `${proc.key}_tooling_cost`, val)}
                                      onClose={() => setActiveEditCell(null)}
                                      className="h-8 w-16 text-center text-xs font-mono bg-background border-input rounded-lg text-right mx-auto"
                                      placeholder="0.00"
                                    />
                                  ) : (
                                    <span
                                      onDoubleClick={() => canEditProc && setActiveEditCell({ rowIndex, fieldKey: `${proc.key}_tooling_cost` })}
                                      className={cn(
                                        "block w-full py-1 px-1 font-mono text-muted-foreground",
                                        canEditProc && "hover:outline-dashed hover:outline-1 hover:outline-primary/50 cursor-pointer rounded"
                                      )}
                                    >
                                      {parseFloat(vals[`${proc.key}_tooling_cost`] || "0").toFixed(2)}
                                    </span>
                                  )
                                ) : !inLoop ? (
                                  <span className="text-[10px] text-muted-foreground font-light italic">Skipped</span>
                                ) : (
                                  <div className="flex flex-col gap-1.5 justify-center py-1">
                                    {loopIndices.map((idx, sIdx) => {
                                      const fieldKey = `${proc.key}_${idx}_tooling_cost`;
                                      return (
                                        <div key={idx} className={cn("w-full flex items-center justify-center gap-1.5", sIdx > 0 && "border-t border-slate-200/50 pt-1.5")}>
                                          {isCellEditing(rowIndex, fieldKey) ? (
                                            <div className="flex flex-col items-center">
                                              <span className="text-[8px] text-primary/60 font-semibold mb-0.5">Visit {sIdx + 1}</span>
                                              <EditableInput
                                                value={vals[`${proc.key}_${idx}_tooling_cost`] || "0"}
                                                onChange={(val) => handleCellChange(rowIndex, `${proc.key}_${idx}_tooling_cost`, val)}
                                                onClose={() => setActiveEditCell(null)}
                                                className="h-8 w-16 text-center text-xs font-mono bg-background border-input rounded-lg text-right"
                                                placeholder="0.00"
                                              />
                                            </div>
                                          ) : (
                                            <div 
                                              onDoubleClick={() => canEditProc && setActiveEditCell({ rowIndex, fieldKey })}
                                              className={cn(
                                                "flex flex-col items-center w-full py-0.5",
                                                canEditProc && "hover:outline-dashed hover:outline-1 hover:outline-primary/50 cursor-pointer rounded"
                                              )}
                                            >
                                              <span className="text-[8px] text-muted-foreground/60 font-semibold">V{sIdx + 1}</span>
                                              <span className="font-mono text-muted-foreground">{parseFloat(vals[`${proc.key}_${idx}_tooling_cost`] || "0").toFixed(2)}</span>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </TableCell>
                            );
                          }

                          cells.push(
                            <TableCell key={`${proc.key}_tot_val`} className="p-2 border-r border-b border-slate-200 text-right font-mono font-bold text-foreground">
                              {calcs.evaluatedProcesses[proc.key].toFixed(2)}
                            </TableCell>
                          );

                          return cells;
                        })}

                        <TableCell 
                          className="p-3 border-r border-b border-slate-200 text-right font-mono font-extrabold text-foreground bg-slate-50/5"
                          title={`Formula: ${formulas.subtotal_cost_rm}`}
                        >
                          {calcs.subTotalRaw.toFixed(2)}
                        </TableCell>
                        <TableCell 
                          className="p-3 border-r border-b border-slate-200 text-right font-mono font-extrabold text-foreground bg-slate-50/5"
                          title={`Formula: ${formulas.subtotal_cost_scrap}`}
                        >
                          {calcs.subTotalScrap.toFixed(2)}
                        </TableCell>
                        <TableCell 
                          className="p-3 border-r border-b border-slate-200 text-right font-mono font-bold text-muted-foreground bg-slate-50/5"
                          title={`Formula: ${formulas.rejection_cost_scrap}`}
                        >
                          {calcs.rejectionScrap.toFixed(2)}
                        </TableCell>
 
                        <TableCell 
                          className="p-3 border-r border-b border-slate-200 text-right font-mono font-bold text-muted-foreground"
                          title={`Formula: ${formulas.overheads_rm}`}
                        >
                          {calcs.overheads.toFixed(2)}
                        </TableCell>
 
                        <TableCell 
                          className="p-3 border-r border-b border-slate-200 text-right font-mono font-black text-primary bg-primary/5"
                          title={`Formula: ${formulas.grand_total_cost_rm}`}
                        >
                          {calcs.grandTotalRaw.toFixed(2)}
                        </TableCell>
                        <TableCell 
                          className="p-3 border-r border-b border-slate-200 text-right font-mono font-black text-primary bg-primary/5"
                          title={`Formula: ${formulas.grand_total_cost_scrap}`}
                        >
                          {calcs.grandTotalScrap.toFixed(2)}
                        </TableCell>
 
                        <TableCell className="p-3 border-r border-b border-slate-200 text-right">
                          {isCellEditing(rowIndex, "selling_price") ? (
                            <EditableInput
                              value={vals.selling_price || "0"}
                              onChange={(val) => handleCellChange(rowIndex, "selling_price", val)}
                              onClose={() => setActiveEditCell(null)}
                              className="h-8 text-xs bg-background border-input rounded-lg text-right w-full font-mono font-bold"
                              placeholder="0.00"
                            />
                          ) : (
                            <span
                              onDoubleClick={() => isEditing && setActiveEditCell({ rowIndex, fieldKey: "selling_price" })}
                              className={cn(
                                "block w-full py-1 px-1.5 font-mono font-black text-foreground",
                                isEditing && "hover:outline-dashed hover:outline-1 hover:outline-primary/50 cursor-pointer rounded"
                              )}
                            >
                              {sellingPrice.toFixed(2)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell 
                          className={cn(
                            "p-3 border-r border-b border-slate-200 text-right font-mono font-extrabold",
                            calcs.profitPercent >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"
                          )}
                          title={`Formula: ${formulas.profit_percent}`}
                        >
                          {calcs.profitPercent.toFixed(2)}%
                        </TableCell>
                        <TableCell 
                          className={cn(
                            "p-3 border-r border-b border-slate-200 text-right font-mono font-extrabold",
                            calcs.profitRs >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"
                          )}
                          title={`Formula: ${formulas.profit_rs}`}
                        >
                          {calcs.profitRs.toFixed(2)}
                        </TableCell>
 
                        <TableCell 
                          className="p-3 border-r border-b border-slate-200 text-right font-mono font-semibold text-slate-500"
                          title={`Formula: ${formulas.raw_material_percent}`}
                        >
                          {calcs.rawMaterialPercent.toFixed(2)}%
                        </TableCell>
                        <TableCell 
                          className="p-3 border-r border-b border-slate-200 text-right font-mono font-semibold text-slate-500"
                          title={`Formula: ${formulas.foundry_conversion_percent}`}
                        >
                          {calcs.foundryConversionPercent.toFixed(2)}%
                        </TableCell>

                        {isEditing && (
                          <TableCell className="p-2 border-l border-b border-slate-200 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg"
                                    title="Edit Process Loop"
                                  >
                                    <Repeat className="h-4 w-4" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-2 bg-background border shadow-xl rounded-xl" align="end">
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between border-b pb-1.5">
                                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Process Sequence Loop</h4>
                                      {row.selectedLoop && row.selectedLoop.length > 0 && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 text-[10px] text-red-500 hover:bg-red-55 px-2"
                                          onClick={() => handleRowLoopChange(rowIndex, [])}
                                        >
                                          Clear All
                                        </Button>
                                      )}
                                    </div>

                                    <div className="max-h-[140px] overflow-y-auto p-1 custom-scrollbar">
                                      {(!row.selectedLoop || row.selectedLoop.length === 0) ? (
                                        <div className="text-[10px] text-muted-foreground italic text-center py-4 bg-muted/20 rounded-lg border border-dashed w-full">
                                          No custom loop steps
                                        </div>
                                      ) : (
                                        <div className="flex flex-wrap items-center gap-2">
                                          {row.selectedLoop.map((procKey, idx) => {
                                            const proc = PROCESS_CONFIGS.find(p => p.key === procKey);
                                            return (
                                              <div key={idx} className="flex items-center gap-1.5 group text-[10px]">
                                                <div className="flex items-center h-7 bg-background border rounded-lg shadow-sm border-primary/20 hover:border-primary transition-all pr-0 overflow-hidden">
                                                  <div className="bg-primary text-primary-foreground px-2 h-full flex items-center justify-center font-bold border-r">
                                                    S{idx + 1}
                                                  </div>
                                                  <div className="px-2 font-semibold whitespace-nowrap">
                                                    {proc?.name}
                                                  </div>
                                                  <button
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.preventDefault();
                                                      e.stopPropagation();
                                                      const newLoop = (row.selectedLoop || []).filter((_, i) => i !== idx);
                                                      handleRowLoopChange(rowIndex, newLoop);
                                                    }}
                                                    className="h-full px-1.5 hover:bg-red-50 text-muted-foreground hover:text-red-500 border-l transition-colors"
                                                    title="Remove step"
                                                  >
                                                    <X className="h-2.5 w-2.5" />
                                                  </button>
                                                </div>
                                                {idx < (row.selectedLoop || []).length - 1 && (
                                                  <div className="text-muted-foreground/40 font-bold text-xs">
                                                    â†’
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>

                                    <div className="border-t pt-2 flex flex-col gap-1">
                                      <span className="text-[9px] font-bold uppercase text-muted-foreground px-1 mb-1">Add Step to Loop</span>
                                      <Command className="border rounded-md">
                                        <CommandInput placeholder="Search processes..." className="h-8 text-xs" />
                                        <CommandList className="max-h-[120px]">
                                          <CommandEmpty className="text-xs py-1 px-3 italic">No results.</CommandEmpty>
                                          <CommandGroup className="p-1">
                                            {allProcesses.map(proc => {
                                              const loop = row.selectedLoop || [];
                                              const isLast = loop.length > 0 && loop[loop.length - 1] === proc.key;
                                              const hasTooling = proc.isStatic ? !!proc.hasTooling : !!proc.hasTooling;
                                              return (
                                                <CommandItem
                                                  key={proc.key}
                                                  value={proc.name}
                                                  disabled={isLast}
                                                  onSelect={() => {
                                                    if (isLast) {
                                                      toast.error(`Cannot select ${proc.name} twice consecutively`);
                                                      return;
                                                    }
                                                    const newIndex = loop.length;
                                                    handleCellChange(rowIndex, `${proc.key}_${newIndex}_cycle_time`, "0");
                                                    if (hasTooling) {
                                                      handleCellChange(rowIndex, `${proc.key}_${newIndex}_tooling_cost`, "0");
                                                    }
                                                    handleRowLoopChange(rowIndex, [...loop, proc.key]);
                                                  }}
                                                  className={cn(
                                                    "cursor-pointer text-[10px] py-1 px-2 rounded-md font-semibold flex items-center justify-between",
                                                    isLast && "opacity-50 cursor-not-allowed"
                                                  )}
                                                >
                                                  <span>{proc.name}</span>
                                                  <Plus className="ml-auto h-3 w-3 opacity-50" />
                                                </CommandItem>
                                              );
                                            })}
                                          </CommandGroup>
                                        </CommandList>
                                      </Command>
                                    </div>
                                  </div>
                                </PopoverContent>
                              </Popover>

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeletePartRow(rowIndex)}
                                className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                                title="Delete Part"
                              >
                                <Trash2 className="h-4.5 w-4.5" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>




      {/* Add Part Dialog */}
      <Dialog open={showAddPartModal} onOpenChange={setShowAddPartModal}>
        <DialogContent className="sm:max-w-[420px] bg-background border shadow-2xl rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-md font-bold">Add Part Row</DialogTitle>
            <DialogDescription className="text-xs">
              Enter the identification details for the new part row.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="part-name-input" className="text-xs text-muted-foreground">Part Name</Label>
              <Input
                id="part-name-input"
                value={newPartName}
                onChange={(e) => setNewPartName(e.target.value)}
                placeholder="e.g. BUSH"
                className="h-9 text-xs"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="part-number-input" className="text-xs text-muted-foreground">Part Number</Label>
              <Input
                id="part-number-input"
                value={newPartNumber}
                onChange={(e) => setNewPartNumber(e.target.value)}
                placeholder="e.g. 5900 130 054"
                className="h-9 text-xs"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="part-material-select" className="text-xs text-muted-foreground">Material Name</Label>
              <Select
                value={newPartMaterial}
                onValueChange={setNewPartMaterial}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Material Name" />
                </SelectTrigger>
                <SelectContent>
                  {activeMaterialDesignations.map(des => (
                    <SelectItem key={des} value={des} className="text-xs uppercase font-semibold">
                      {des}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5 mt-1">
              <Label className="text-xs text-muted-foreground font-bold">Select Process Sequence Loop</Label>
              <div className="flex gap-2 w-full relative">
                <div className="relative flex-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowAddStepDropdown(!showAddStepDropdown);
                    }}
                    className="h-9 w-full justify-between bg-background border border-input px-3 rounded-lg overflow-hidden text-xs text-muted-foreground flex items-center shadow-sm"
                  >
                    <span>Add Step...</span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                  </button>

                  {showAddStepDropdown && (
                    <div className="absolute left-0 right-0 z-50 mt-1 max-h-[180px] overflow-y-auto bg-background border border-slate-200 shadow-xl rounded-xl p-1 custom-scrollbar">
                      {allProcesses.map((proc) => {
                        const isDuplicate = newPartLoop.length > 0 && newPartLoop[newPartLoop.length - 1] === proc.key;
                        return (
                          <button
                            key={proc.key}
                            type="button"
                            disabled={isDuplicate}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (isDuplicate) {
                                toast.error(`Cannot select ${proc.name} twice consecutively`);
                                return;
                              }
                              setNewPartLoop(prev => [...prev, proc.key]);
                            }}
                            className={cn(
                              "w-full text-left text-xs py-1.5 px-2.5 rounded-lg font-semibold flex items-center justify-between transition-colors",
                              isDuplicate
                                ? "opacity-50 cursor-not-allowed text-muted-foreground bg-transparent"
                                : "hover:bg-muted/60 text-foreground"
                            )}
                          >
                            <span>{proc.name}</span>
                            <Plus className="h-3 w-3 text-muted-foreground" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                {newPartLoop.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={(e) => {
                      e.preventDefault();
                      setNewPartLoop([]);
                    }}
                    className="h-9 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 px-2.5"
                  >
                    Clear
                  </Button>
                )}
              </div>

              {/* Loop Preview Flow */}
              {newPartLoop.length > 0 && (
                <div className="mt-3 p-3 rounded-xl bg-primary/5 border border-primary/10 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase text-primary/60 tracking-wider">
                    <span>Selected Sequence Flow</span>
                    <button type="button" onClick={() => setNewPartLoop([])} className="hover:text-red-500 transition-colors">Clear All</button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {newPartLoop.map((procKey, index) => {
                      const proc = PROCESS_CONFIGS.find(p => p.key === procKey);
                      return (
                        <div key={`${procKey}-${index}`} className="flex items-center gap-1.5 group">
                          <div className="flex items-center h-7 bg-background border rounded-lg shadow-sm border-primary/20 hover:border-primary transition-all pr-0 overflow-hidden text-[10px]">
                            <div className="bg-primary text-primary-foreground px-2 h-full flex items-center justify-center font-bold border-r">
                              S{index + 1}
                            </div>
                            <div className="px-2 font-semibold whitespace-nowrap">
                              {proc?.name}
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setNewPartLoop(prev => prev.filter((_, i) => i !== index));
                              }}
                              className="h-full px-1.5 hover:bg-red-50 text-muted-foreground hover:text-red-500 border-l transition-colors"
                              title="Remove step"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </div>
                          {index < newPartLoop.length - 1 && (
                            <div className="text-muted-foreground/40 font-bold text-xs">
                              â†’
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => {
              setNewPartLoop([]);
              setShowAddPartModal(false);
            }} className="h-9 text-xs rounded-xl">Cancel</Button>
            <Button onClick={handleAddPartRow} className="h-9 text-xs font-bold rounded-xl">Add Row</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Month Warning Dialog */}
      <Dialog open={!!deleteMonthTarget} onOpenChange={(open) => !open && setDeleteMonthTarget(null)}>
        <DialogContent className="sm:max-w-[400px] bg-background border shadow-2xl rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-md font-bold flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Month Data
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-2">
              Are you sure you want to delete the data for <strong>{deleteMonthTarget && formatMonthLabel(deleteMonthTarget)}</strong>? This will permanently remove all sheet rows and configurations for this month and cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 mt-4">
            <Button
              variant="ghost"
              onClick={() => setDeleteMonthTarget(null)}
              className="text-xs font-semibold hover:bg-muted rounded-xl"
              disabled={deletingMonthStatus}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteMonthConfirm}
              className="text-xs font-bold rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              disabled={deletingMonthStatus}
            >
              {deletingMonthStatus ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                  Deleting...
                </>
              ) : (
                "Delete Permanent"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Column Dialog */}
      <Dialog open={showAddColumnModal} onOpenChange={(open) => {
        setShowAddColumnModal(open);
        if (!open) {
          setNewColName("");
          setNewColLinkedMachine("");
        }
      }}>
        <DialogContent className="sm:max-w-[400px] bg-background border shadow-2xl rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-md font-bold">Add Custom Column</DialogTitle>
            <DialogDescription className="text-xs">
              Define the attributes for the new cost sheet column.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="col-name-input" className="text-xs text-muted-foreground">Column Name</Label>
              <Input
                id="col-name-input"
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                placeholder="Enter custom column name"
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="col-linked-machine" className="text-xs text-muted-foreground">Select Machine (for rate auto-fill)</Label>
              <Select value={newColLinkedMachine} onValueChange={setNewColLinkedMachine}>
                <SelectTrigger id="col-linked-machine" className="h-9 text-xs rounded-xl">
                  <SelectValue placeholder="Select machine to auto-fill rate" />
                </SelectTrigger>
                <SelectContent>
                  {availableEquipments.map((name) => (
                    <SelectItem key={name} value={name} className="text-xs">
                      <div className="flex items-center justify-between w-full gap-2">
                        <span>{name}</span>
                        {machineSecRates[name.toLowerCase().trim()] !== undefined && (
                          <span className="text-[10px] text-emerald-600 font-mono pl-2">
                            ({machineSecRates[name.toLowerCase().trim()].toFixed(4)}/s)
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-3.5 rounded-xl border bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Select Column Fields</span>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowAddCustomIncludeInput(!showAddCustomIncludeInput)}
                  className="h-6 w-6 p-0 hover:bg-muted text-muted-foreground rounded-full flex items-center justify-center shrink-0"
                  title="Add Custom Include Field"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>

              {showAddCustomIncludeInput && (
                <div className="flex gap-2 items-center bg-background p-2 rounded-lg border border-slate-200/60 shadow-sm animate-in fade-in duration-200">
                  <Input
                    placeholder="Enter custom field name"
                    value={newCustomIncludeName}
                    onChange={(e) => setNewCustomIncludeName(e.target.value)}
                    className="h-8 text-xs flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const val = newCustomIncludeName.trim();
                        if (val) {
                          const k = val.toLowerCase().replace(/[^a-z0-9_]/g, "_");
                          if (newColCustomIncludes.some(c => c.key === k)) {
                            toast.error("Custom field already exists");
                            return;
                          }
                          setNewColCustomIncludes([...newColCustomIncludes, { key: k, label: val, checked: true }]);
                          setNewCustomIncludeName("");
                          setShowAddCustomIncludeInput(false);
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      const val = newCustomIncludeName.trim();
                      if (val) {
                        const k = val.toLowerCase().replace(/[^a-z0-9_]/g, "_");
                        if (newColCustomIncludes.some(c => c.key === k)) {
                          toast.error("Custom field already exists");
                          return;
                        }
                        setNewColCustomIncludes([...newColCustomIncludes, { key: k, label: val, checked: true }]);
                        setNewCustomIncludeName("");
                        setShowAddCustomIncludeInput(false);
                      }
                    }}
                    className="h-8 text-[10px] px-2.5 font-bold rounded-lg"
                  >
                    Add
                  </Button>
                </div>
              )}

              <div className="flex flex-col gap-2.5">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground">
                  <input
                    type="checkbox"
                    checked={newColHasCycleTime}
                    onChange={(e) => setNewColHasCycleTime(e.target.checked)}
                    className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                  />
                  <span>Include Cycle Time (Calculated with Rate)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground">
                  <input
                    type="checkbox"
                    checked={newColHasTooling}
                    onChange={(e) => setNewColHasTooling(e.target.checked)}
                    className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                  />
                  <span>Include Tooling Cost / Component</span>
                </label>

                {/* Render added custom includes */}
                {newColCustomIncludes.map((ci, idx) => (
                  <div key={ci.key} className="flex items-center justify-between w-full">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground">
                      <input
                        type="checkbox"
                        checked={ci.checked}
                        onChange={(e) => {
                          const updated = [...newColCustomIncludes];
                          updated[idx].checked = e.target.checked;
                          setNewColCustomIncludes(updated);
                        }}
                        className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                      />
                      <span>Include {ci.label}</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setNewColCustomIncludes(newColCustomIncludes.filter(x => x.key !== ci.key));
                      }}
                      className="text-muted-foreground hover:text-destructive p-0.5 rounded transition-colors"
                      title="Remove Field Option"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowAddColumnModal(false)} className="h-9 text-xs rounded-xl">Cancel</Button>
            <Button onClick={handleAddColumnConfirm} className="h-9 text-xs font-bold rounded-xl">Add Column</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dynamic Column Dialog */}
      <Dialog open={showEditColumnModal} onOpenChange={(open) => {
        setShowEditColumnModal(open);
        if (!open) {
          setEditingColumnName("");
          setEditingColLinkedMachine("");
        }
      }}>
        <DialogContent className="sm:max-w-[400px] bg-background border shadow-2xl rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-md font-bold flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" />
              Edit Column Configuration
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define the attributes for the custom cost sheet column.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-col-name-input" className="text-xs text-muted-foreground">Column Name</Label>
              <Input
                id="edit-col-name-input"
                value={editingColumnName}
                onChange={(e) => setEditingColumnName(e.target.value)}
                placeholder="Enter custom column name"
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-col-linked-machine" className="text-xs text-muted-foreground">Select Machine (for rate auto-fill)</Label>
              <Select value={editingColLinkedMachine} onValueChange={setEditingColLinkedMachine}>
                <SelectTrigger id="edit-col-linked-machine" className="h-9 text-xs rounded-xl">
                  <SelectValue placeholder="Select machine to auto-fill rate" />
                </SelectTrigger>
                <SelectContent>
                  {availableEquipments.map((name) => (
                    <SelectItem key={name} value={name} className="text-xs">
                      <div className="flex items-center justify-between w-full gap-2">
                        <span>{name}</span>
                        {machineSecRates[name.toLowerCase().trim()] !== undefined && (
                          <span className="text-[10px] text-emerald-600 font-mono pl-2">
                            ({machineSecRates[name.toLowerCase().trim()].toFixed(4)}/s)
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-3.5 rounded-xl border bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Select Column Fields</span>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowEditAddCustomIncludeInput(!showEditAddCustomIncludeInput)}
                  className="h-6 w-6 p-0 hover:bg-muted text-muted-foreground rounded-full flex items-center justify-center shrink-0"
                  title="Add Custom Include Field"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>

              {showEditAddCustomIncludeInput && (
                <div className="flex gap-2 items-center bg-background p-2 rounded-lg border border-slate-200/60 shadow-sm animate-in fade-in duration-200">
                  <Input
                    placeholder="Enter custom field name"
                    value={editCustomIncludeName}
                    onChange={(e) => setEditCustomIncludeName(e.target.value)}
                    className="h-8 text-xs flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const val = editCustomIncludeName.trim();
                        if (val) {
                          const k = val.toLowerCase().replace(/[^a-z0-9_]/g, "_");
                          if (editingColCustomIncludes.some(c => c.key === k)) {
                            toast.error("Custom field already exists");
                            return;
                          }
                          setEditingColCustomIncludes([...editingColCustomIncludes, { key: k, label: val, checked: true }]);
                          setEditCustomIncludeName("");
                          setShowEditAddCustomIncludeInput(false);
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      const val = editCustomIncludeName.trim();
                      if (val) {
                        const k = val.toLowerCase().replace(/[^a-z0-9_]/g, "_");
                        if (editingColCustomIncludes.some(c => c.key === k)) {
                          toast.error("Custom field already exists");
                          return;
                        }
                        setEditingColCustomIncludes([...editingColCustomIncludes, { key: k, label: val, checked: true }]);
                        setEditCustomIncludeName("");
                        setShowEditAddCustomIncludeInput(false);
                      }
                    }}
                    className="h-8 text-[10px] px-2.5 font-bold rounded-lg"
                  >
                    Add
                  </Button>
                </div>
              )}

              <div className="flex flex-col gap-2.5">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground">
                  <input
                    type="checkbox"
                    checked={editingColumnHasCycleTime}
                    onChange={(e) => setEditingColumnHasCycleTime(e.target.checked)}
                    className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                  />
                  <span>Include Cycle Time (Calculated with Rate)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground">
                  <input
                    type="checkbox"
                    checked={editingColumnHasTooling}
                    onChange={(e) => setEditingColumnHasTooling(e.target.checked)}
                    className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                  />
                  <span>Include Tooling Cost / Component</span>
                </label>

                {/* Render added custom includes */}
                {editingColCustomIncludes.map((ci, idx) => (
                  <div key={ci.key} className="flex items-center justify-between w-full">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground">
                      <input
                        type="checkbox"
                        checked={ci.checked}
                        onChange={(e) => {
                          const updated = [...editingColCustomIncludes];
                          updated[idx].checked = e.target.checked;
                          setEditingColCustomIncludes(updated);
                        }}
                        className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                      />
                      <span>Include {ci.label}</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingColCustomIncludes(editingColCustomIncludes.filter(x => x.key !== ci.key));
                      }}
                      className="text-muted-foreground hover:text-destructive p-0.5 rounded transition-colors"
                      title="Remove Field Option"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowEditColumnModal(false)} className="h-9 text-xs rounded-xl">Cancel</Button>
            <Button onClick={handleEditCustomColumnConfirm} className="h-9 text-xs font-bold rounded-xl">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
 
      {/* Custom Edit Formula Modal Dialog */}
      <Dialog open={showFormulaModal} onOpenChange={(open) => {
        if (!open) {
          setShowFormulaModal(false);
          setFormulaConfig(null);
        }
      }}>
        <DialogContent className="w-full max-w-lg bg-background border border-border p-6 rounded-2xl shadow-2xl space-y-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">
              {formulaConfig?.title}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {formulaConfig?.description}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2">
            <Label htmlFor="formula-input" className="text-sm font-semibold text-muted-foreground">Formula Expression</Label>
            <Input
              ref={formulaInputRef}
              id="formula-input"
              type="text"
              placeholder={formulaConfig ? `e.g., ${formulaConfig.defaultFormula}` : ""}
              value={formulaValue}
              autoFocus
              onChange={(e) => setFormulaValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleApplyFormula();
                } else if (e.key === "Escape") {
                  setShowFormulaModal(false);
                  setFormulaConfig(null);
                }
              }}
              className="h-11 rounded-xl bg-background border border-input px-4 font-mono font-semibold"
            />
          </div>
 
          {/* List of Available Variables - grouped by type */}
          <div className="space-y-3">
            <span className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider block">
              Available Variables (Click to insert)
            </span>

            {/* Column Fields */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Column Fields</span>
                <div className="flex-1 h-px bg-emerald-100" />
              </div>
              <div className="flex flex-wrap gap-1.5 p-2 bg-emerald-50/60 border border-emerald-100 rounded-xl min-h-[36px]">
                {(formulaConfig?.variables || []).filter(v => v.type === "field" || !v.type).length === 0 ? (
                  <span className="text-[10px] text-muted-foreground italic px-1 py-0.5">No fields available.</span>
                ) : (
                  (formulaConfig?.variables || []).filter(v => v.type === "field" || !v.type).map((variable) => (
                    <button
                      key={variable.key}
                      type="button"
                      onClick={() => insertVariable(variable.key)}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-50 border border-emerald-200 hover:border-emerald-400 text-xs font-mono font-semibold transition-all flex items-center gap-1.5 shadow-sm"
                      title={`Insert [${variable.key}] (Current value: ${variable.value})`}
                    >
                      <span className="text-emerald-600 font-bold">[{variable.key}]</span>
                      <span className="text-muted-foreground text-[10px]">({variable.value})</span>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Column Costs */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-violet-600 uppercase tracking-widest">Column Costs</span>
                <div className="flex-1 h-px bg-violet-100" />
              </div>
              <div className="flex flex-wrap gap-1.5 p-2 bg-violet-50/60 border border-violet-100 rounded-xl min-h-[36px] max-h-36 overflow-y-auto">
                {(formulaConfig?.variables || []).filter(v => v.type === "column").length === 0 ? (
                  <span className="text-[10px] text-muted-foreground italic px-1 py-0.5">No column costs available.</span>
                ) : (
                  (formulaConfig?.variables || []).filter(v => v.type === "column").map((variable) => (
                    <button
                      key={variable.key}
                      type="button"
                      onClick={() => insertVariable(variable.key)}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-violet-50 border border-violet-200 hover:border-violet-400 text-xs font-mono font-semibold transition-all flex items-center gap-1.5 shadow-sm"
                      title={`Insert [${variable.key}] (Current value: ${variable.value})`}
                    >
                      <span className="text-violet-600 font-bold">[{variable.key}]</span>
                      <span className="text-muted-foreground text-[10px]">({variable.value})</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
 
          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowFormulaModal(false);
                setFormulaConfig(null);
              }}
              className="h-11 px-5 font-bold rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleApplyFormula}
              className="h-11 px-5 font-bold rounded-xl"
            >
              Apply Formula
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

