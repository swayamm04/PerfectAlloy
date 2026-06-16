"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/src/context/AuthContext";
import { DashboardLayout } from "@/src/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { 
  Calculator, 
  Loader2, 
  RotateCcw, 
  Cpu, 
  Info, 
  Check, 
  AlertTriangle,
  Trash2,
  Edit,
  Save,
  X
} from "lucide-react";
import { API_URL } from "@/src/lib/api";
import { cn } from "@/lib/utils";

interface MachineHourRateData {
  _id?: string;
  machine: string;
  values: Record<string, string>;
}

interface OperatorRow {
  designation: string;
  values: Record<string, string>;
}

interface EquipmentRow {
  designation: string;
  values: Record<string, string>;
}

// Helper function to evaluate formula columns for dynamically loaded spreadsheets
const evaluateTableRows = (columns: any[], rows: any[]) => {
  return rows.map((row) => {
    const resolved: Record<string, number> = {};
    const valuesObj: Record<string, string> = {};
    
    if (row.values) {
      Object.keys(row.values).forEach((k) => {
        valuesObj[k] = String(row.values[k] ?? "0");
      });
    }

    // Initialize manual fields
    columns.forEach((col) => {
      if (col.type === "manual" && col.key !== "designation") {
        resolved[col.key] = parseFloat(valuesObj[col.key] || "0") || 0;
      }
    });

    let progress = true;
    let iterations = 0;
    const maxIterations = columns.length;
    const formulaCols = columns.filter((col) => col.type === "formula");

    // Custom round helper
    const roundHelper = (val: number, dec: number = 2) => {
      return Number(Math.round(Number(val + "e" + dec)) + "e-" + dec);
    };

    while (progress && iterations < maxIterations) {
      progress = false;
      for (const col of formulaCols) {
        if (resolved[col.key] !== undefined) continue; // Already resolved

        // Find variable references like [mc_cost] or [basic]
        const matches = col.formula.match(/\[([^\]]+)\]/g) || [];
        const allResolved = matches.every((match: string) => {
          const varKey = match.slice(1, -1);
          return resolved[varKey] !== undefined;
        });

        if (allResolved) {
          let parsedFormula = col.formula;
          for (const match of matches) {
            const varKey = match.slice(1, -1);
            parsedFormula = parsedFormula.replaceAll(match, String(resolved[varKey]));
          }

          try {
            // Sanitize formula: only allow math characters, round keywords, numbers, operators
            const sanitized = parsedFormula.replace(/[^0-9a-zA-Z+\-*/().\s,]/g, "");
            const evalFunc = new Function("round", `return (${sanitized});`);
            const result = evalFunc(roundHelper);

            if (!isNaN(result) && isFinite(result)) {
              resolved[col.key] = result;
              progress = true;
            } else {
              resolved[col.key] = 0;
            }
          } catch (err) {
            resolved[col.key] = 0;
          }
        }
      }
      iterations++;
    }

    // Default remaining unresolved calculations to 0
    columns.forEach((col) => {
      if (resolved[col.key] === undefined && col.key !== "designation") {
        resolved[col.key] = 0;
      }
    });

    // Construct final formatted row values
    const finalVals: Record<string, string> = { designation: row.designation };
    columns.forEach((col) => {
      if (col.key === "designation") return;
      
      if (col.type === "formula") {
        let decimals = 2;
        const roundMatch = col.formula.match(/round\([^,]+,\s*(\d+)\)/);
        if (roundMatch) {
          decimals = parseInt(roundMatch[1], 10);
        }
        finalVals[col.key] = (resolved[col.key] || 0).toFixed(decimals);
      } else {
        finalVals[col.key] = valuesObj[col.key] || "0";
      }
    });

    return {
      ...row,
      values: finalVals,
    };
  });
};

export default function MachineHourRatePage() {
  const { user: currentUser } = useAuth();
  
  // Backend datasets
  const [machineRates, setMachineRates] = useState<MachineHourRateData[]>([]);
  const [equipmentRows, setEquipmentRows] = useState<EquipmentRow[]>([]);
  const [operatorRows, setOperatorRows] = useState<OperatorRow[]>([]);
  const [systemSettings, setSystemSettings] = useState<Record<string, string>>({
    power_universal_value: "8"
  });
  
  // Page States
  const [selectedMachine, setSelectedMachine] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "waiting" | "saving" | "saved" | "error">("idle");
  const isInitialLoad = useRef(true);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editBackup, setEditBackup] = useState<MachineHourRateData | null>(null);

  // Floating Labour dropdown state & ref
  const [showLabourDropdown, setShowLabourDropdown] = useState(false);
  const dropdownRef = useRef<HTMLTableCellElement>(null);

  // Add Custom Row Modal state
  const [showAddRowModal, setShowAddRowModal] = useState(false);
  const [newRowName, setNewRowName] = useState("");

  // Edit Formula Modal state & ref
  interface FormulaVar {
    key: string;
    value: string;
    label: string;
  }
  interface FormulaModalConfig {
    sectionKey: string;
    title: string;
    description: string;
    targetValueKey: string;
    defaultFormula: string;
    variables: FormulaVar[];
  }
  const [formulaConfig, setFormulaConfig] = useState<FormulaModalConfig | null>(null);
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [formulaValue, setFormulaValue] = useState("");
  const formulaInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowLabourDropdown(false);
      }
    };

    if (showLabourDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showLabourDropdown]);

  const isSuperAdmin = currentUser?.role === "super-admin";

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch Equipments
      const eqResponse = await fetch(`${API_URL}/api/equipment-table`, {
        headers: { Authorization: `Bearer ${currentUser?.token}` }
      });
      const eqData = await eqResponse.json();
      const eqList = eqData.rows || [];
      const eqCols = eqData.columns || [];
      const evaluatedEqRows = evaluateTableRows(eqCols, eqList);
      setEquipmentRows(evaluatedEqRows);

      // Fetch Operators
      const opResponse = await fetch(`${API_URL}/api/operator-table`, {
        headers: { Authorization: `Bearer ${currentUser?.token}` }
      });
      const opData = await opResponse.json();
      const opList = opData.rows || [];
      const opCols = opData.columns || [];
      const evaluatedOpRows = evaluateTableRows(opCols, opList);
      setOperatorRows(evaluatedOpRows);

      // Fetch Machine Hour Rates
      const mhrResponse = await fetch(`${API_URL}/api/machine-hour-rate`, {
        headers: { Authorization: `Bearer ${currentUser?.token}` }
      });
      const mhrData = await mhrResponse.json();
      setMachineRates(mhrData || []);

      // Fetch System Settings
      const settingsResponse = await fetch(`${API_URL}/api/system-settings`, {
        headers: { Authorization: `Bearer ${currentUser?.token}` }
      });
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();
        setSystemSettings(settingsData || { power_universal_value: "8" });
      }

      // Set default selected machine
      if (eqList.length > 0) {
        setSelectedMachine(eqList[0].designation);
      }
    } catch (error) {
      console.error("Error fetching machine hour rates data:", error);
      toast.error("Failed to load required data tables");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  // Extract list of all machines from equipment table
  const machineOptions = useMemo(() => {
    return equipmentRows.map(row => row.designation);
  }, [equipmentRows]);

  // Find currently active machine rate document or construct a default one
  const activeMachineData = useMemo(() => {
    if (!selectedMachine) return null;
    const found = machineRates.find(r => r.machine.toLowerCase() === selectedMachine.toLowerCase());
    
    // Default initial seed values if not present
    const defaultValues: Record<string, string> = {
      operator_alloc: "0",
      online_inspect_alloc: "0",
      supervisor_alloc: "0",
      plant_manager_alloc: "0",
      power_alloc: "0 KW",
      power_cost: "0",
      consumables_cost: "0",
      maintenance_cost: "0",
      rent_cost: "0",
      wiring_cost: "0",
      utilisation_factor: "100"
    };

    return found || { machine: selectedMachine, values: defaultValues };
  }, [selectedMachine, machineRates]);

  // Helper to extract numeric value from strings like "18 KW", "10 M/cs", "1/2 labour"
  const parseNumericValue = (val: string | undefined | null): number => {
    if (!val) return 0;
    const trimmed = val.trim().toLowerCase();
    if (trimmed.includes("1/2")) return 0.5;
    if (trimmed.includes("1/3")) return 0.33;
    if (trimmed.includes("1/4")) return 0.25;
    const match = trimmed.match(/^([0-9.]+)/);
    if (match) {
      return parseFloat(match[1]) || 0;
    }
    return 0;
  };

  // Derive dynamic list of selected labour designations
  const selectedLabourList = useMemo(() => {
    if (!activeMachineData || !activeMachineData.values) return [];
    if (activeMachineData.values.selected_labour) {
      return activeMachineData.values.selected_labour.split(",").filter(Boolean);
    }
    // Default fallback: return designations currently defined in operator table
    return operatorRows.map(r => r.designation);
  }, [activeMachineData, operatorRows]);

  // Get active equipment row total (Depreciation & Interest hourly cost) evaluated from custom formula
  const depreciationAndInterestCost = useMemo(() => {
    if (!selectedMachine || !activeMachineData) return 0;
    const eqRow = equipmentRows.find(r => r.designation.toLowerCase() === selectedMachine.toLowerCase());
    if (!eqRow) return 0;

    const formulaStr = activeMachineData.values?.depreciation_formula || "[total]";
    const matches = formulaStr.match(/\[([^\]]+)\]/g) || [];
    let parsedFormula = formulaStr;
    
    matches.forEach((match) => {
      const varKey = match.slice(1, -1);
      const varVal = parseFloat(eqRow.values[varKey] || "0") || 0;
      parsedFormula = parsedFormula.replaceAll(match, String(varVal));
    });

    try {
      const sanitized = parsedFormula.replace(/[^0-9a-zA-Z+\-*/().\s,]/g, "");
      const evalFunc = new Function("round", `return (${sanitized});`);
      const roundHelper = (val: number, dec: number = 2) => {
        return Number(Math.round(Number(val + "e" + dec)) + "e-" + dec);
      };
      const result = evalFunc(roundHelper);
      if (!isNaN(result) && isFinite(result)) {
        return result;
      }
    } catch (err) {
      console.error("Error evaluating depreciation formula:", err);
    }
    
    return parseFloat(eqRow.values.total || "0") || 0;
  }, [selectedMachine, equipmentRows, activeMachineData]);

  const hasWiringCost = useMemo(() => {
    if (!selectedMachine) return false;
    const mLower = selectedMachine.toLowerCase();
    return mLower.includes("annealing") || 
           mLower.includes("gcl 100") || 
           mLower.includes("metrology") || 
           mLower.includes("marking") || 
           mLower.includes("tempering");
  }, [selectedMachine]);

  // Perform sheet calculations
  const calculations = useMemo(() => {
    if (!activeMachineData) return null;

    const vals = activeMachineData.values;

    // Helper to resolve hourly rate for a designation with proper fallbacks
    const getHourlyRateForDesignation = (dest: string) => {
      const destLower = dest.toLowerCase();
      
      // 1. Find in operatorRows
      let foundRow = operatorRows.find(r => r.designation.toLowerCase() === destLower);
      if (!foundRow) {
        foundRow = operatorRows.find(r => r.designation.toLowerCase().includes(destLower) || destLower.includes(r.designation.toLowerCase()));
      }
      
      if (foundRow) {
        return (parseFloat(foundRow.values.grand_total) || 0) / 8;
      }

      // 2. Fallbacks
      const opRow = operatorRows.find(r => r.designation.toLowerCase().includes("operator"));
      const supRow = operatorRows.find(r => r.designation.toLowerCase().includes("supervisor") || r.designation.toLowerCase().includes("inspector"));
      const pmRow = operatorRows.find(r => r.designation.toLowerCase().includes("plant manager") || r.designation.toLowerCase().includes("manager"));

      const opRate = opRow ? (parseFloat(opRow.values.grand_total) || 1018) / 8 : 127.25;
      const supRate = supRow ? (parseFloat(supRow.values.grand_total) || 1218) / 8 : 152.25;
      const pmRate = pmRow ? (parseFloat(pmRow.values.grand_total) || 2305) / 8 : 288.125;

      if (destLower.includes("inspector") || destLower.includes("supervisor")) {
        return supRate;
      }
      if (destLower.includes("manager")) {
        return pmRate;
      }
      return opRate;
    };

    // Calculate Labour Costs dynamically
    let labourSubtotal = 0;
    const labourCosts = selectedLabourList.map((dest) => {
      const destLower = dest.toLowerCase();
      const allocKey = `${destLower.replace(/[^a-z0-9]/g, "_")}_alloc`;
      const allocVal = vals[allocKey] || "0";
      const alloc = parseNumericValue(allocVal);
      const rate = getHourlyRateForDesignation(dest);

      const targetKey = `${destLower.replace(/[^a-z0-9]/g, "_")}_formula`;
      const defaultFormula = destLower.includes("operator") ? "[alloc] * [rate]" : "[rate] / [alloc]";
      const formulaStr = vals[targetKey] || defaultFormula;

      let cost = 0;
      const matches = formulaStr.match(/\[([^\]]+)\]/g) || [];
      let parsedFormula = formulaStr;
      
      matches.forEach((match) => {
        const varKey = match.slice(1, -1);
        if (varKey === "alloc" || varKey === "allocation") {
          parsedFormula = parsedFormula.replaceAll(match, String(alloc));
        } else if (varKey === "rate") {
          parsedFormula = parsedFormula.replaceAll(match, String(rate));
        }
      });

      try {
        const sanitized = parsedFormula.replace(/[^0-9a-zA-Z+\-*/().\s,]/g, "");
        const evalFunc = new Function("round", `return (${sanitized});`);
        const roundHelper = (val: number, dec: number = 2) => {
          return Number(Math.round(Number(val + "e" + dec)) + "e-" + dec);
        };
        const result = evalFunc(roundHelper);
        if (!isNaN(result) && isFinite(result)) {
          cost = result;
        } else {
          cost = 0;
        }
      } catch (err) {
        console.error(`Error evaluating formula for ${dest}:`, err);
        if (destLower.includes("operator")) {
          cost = alloc * rate;
        } else {
          cost = alloc > 0 ? rate / alloc : 0;
        }
      }

      labourSubtotal += cost;

      return {
        designation: dest,
        allocKey,
        allocVal,
        cost,
        rate
      };
    });

    // Fetch values from the equipment table for calculations
    const eqRow = equipmentRows.find(r => r.designation.toLowerCase() === selectedMachine.toLowerCase());
    const power = eqRow ? parseFloat(eqRow.values.power || "0") : 0;
    const powerFactor = eqRow ? parseFloat(eqRow.values.power_factor || "0") : 0;
    const rangeValue = eqRow ? parseFloat(eqRow.values.range_value || "0") : 0;
    const universalPowerVal = parseFloat(systemSettings.power_universal_value || "8") || 8;
    const powerCost = ((power * powerFactor) * rangeValue) / universalPowerVal;
    const consumablesCost = parseFloat(vals.consumables_cost) || 0;
    const maintenanceCost = parseFloat(vals.maintenance_cost) || 0;
    const rentCost = parseFloat(vals.rent_cost) || 0;
    const wiringCost = hasWiringCost ? (parseFloat(vals.wiring_cost) || 0) : 0;

    // Parse custom rows
    let customRows: Array<{ id: string; name: string; alloc: string; cost: string }> = [];
    if (vals.custom_rows) {
      try {
        customRows = JSON.parse(vals.custom_rows);
      } catch (e) {
        console.error("Error parsing custom_rows", e);
      }
    }

    let customRowsSubtotal = 0;
    customRows.forEach(row => {
      customRowsSubtotal += parseFloat(row.cost) || 0;
    });

    // Total machine hour rate evaluated from custom formula
    let totalMachineHrRate = depreciationAndInterestCost + labourSubtotal + powerCost + consumablesCost + maintenanceCost + rentCost + wiringCost + customRowsSubtotal;
    const totalMhrFormula = vals.total_mhr_formula;
    if (totalMhrFormula) {
      const matches = totalMhrFormula.match(/\[([^\]]+)\]/g) || [];
      let parsedFormula = totalMhrFormula;
      
      matches.forEach((match) => {
        const varKey = match.slice(1, -1);
        let val = 0;
        if (varKey === "total" || varKey === "depreciation_interest") {
          val = depreciationAndInterestCost;
        } else if (varKey === "labour") {
          val = labourSubtotal;
        } else if (varKey === "power") {
          val = powerCost;
        } else if (varKey === "consumables") {
          val = consumablesCost;
        } else if (varKey === "maintenance") {
          val = maintenanceCost;
        } else if (varKey === "rent") {
          val = rentCost;
        } else if (varKey === "wiring") {
          val = wiringCost;
        } else if (varKey === "custom_rows") {
          val = customRowsSubtotal;
        }
        parsedFormula = parsedFormula.replaceAll(match, String(val));
      });

      try {
        const sanitized = parsedFormula.replace(/[^0-9a-zA-Z+\-*/().\s,]/g, "");
        const evalFunc = new Function("round", `return (${sanitized});`);
        const roundHelper = (val: number, dec: number = 2) => {
          return Number(Math.round(Number(val + "e" + dec)) + "e-" + dec);
        };
        const result = evalFunc(roundHelper);
        if (!isNaN(result) && isFinite(result)) {
          totalMachineHrRate = result;
        }
      } catch (err) {
        console.error("Error evaluating TOTAL Machine Hr Rate formula:", err);
      }
    }

    // Utilisation Cost evaluated from custom formula
    const utFactor = parseFloat(vals.utilisation_factor) || 100;
    let utilisationCost = totalMachineHrRate / (utFactor / 100);
    const utilisationCostFormula = vals.utilisation_cost_formula;
    if (utilisationCostFormula) {
      const matches = utilisationCostFormula.match(/\[([^\]]+)\]/g) || [];
      let parsedFormula = utilisationCostFormula;
      
      matches.forEach((match) => {
        const varKey = match.slice(1, -1);
        let val = 0;
        if (varKey === "total_mhr") {
          val = totalMachineHrRate;
        } else if (varKey === "utilisation_factor") {
          val = utFactor;
        }
        parsedFormula = parsedFormula.replaceAll(match, String(val));
      });

      try {
        const sanitized = parsedFormula.replace(/[^0-9a-zA-Z+\-*/().\s,]/g, "");
        const evalFunc = new Function("round", `return (${sanitized});`);
        const roundHelper = (val: number, dec: number = 2) => {
          return Number(Math.round(Number(val + "e" + dec)) + "e-" + dec);
        };
        const result = evalFunc(roundHelper);
        if (!isNaN(result) && isFinite(result)) {
          utilisationCost = result;
        }
      } catch (err) {
        console.error("Error evaluating Utilisation Cost formula:", err);
      }
    }

    // Cost per second evaluated from custom formula
    let costPerSecond = utilisationCost / 3600;
    const costPerSecondFormula = vals.cost_per_second_formula;
    if (costPerSecondFormula) {
      const matches = costPerSecondFormula.match(/\[([^\]]+)\]/g) || [];
      let parsedFormula = costPerSecondFormula;
      
      matches.forEach((match) => {
        const varKey = match.slice(1, -1);
        let val = 0;
        if (varKey === "utilisation_cost") {
          val = utilisationCost;
        }
        parsedFormula = parsedFormula.replaceAll(match, String(val));
      });

      try {
        const sanitized = parsedFormula.replace(/[^0-9a-zA-Z+\-*/().\s,]/g, "");
        const evalFunc = new Function("round", `return (${sanitized});`);
        const roundHelper = (val: number, dec: number = 2) => {
          return Number(Math.round(Number(val + "e" + dec)) + "e-" + dec);
        };
        const result = evalFunc(roundHelper);
        if (!isNaN(result) && isFinite(result)) {
          costPerSecond = result;
        }
      } catch (err) {
        console.error("Error evaluating Cost per second formula:", err);
      }
    }

    return {
      labourCosts,
      labourSubtotal,
      depreciationAndInterestCost,
      powerCost,
      consumablesCost,
      maintenanceCost,
      rentCost,
      wiringCost,
      customRows,
      customRowsSubtotal,
      totalMachineHrRate,
      utilisationCost,
      costPerSecond,
      utFactor
    };
  }, [activeMachineData, operatorRows, selectedLabourList, depreciationAndInterestCost, equipmentRows, selectedMachine, systemSettings]);

  // Handler for manual edits
  const handleValueChange = (key: string, value: string) => {
    if (!selectedMachine) return;

    setMachineRates(prev => {
      const updated = [...prev];
      const index = updated.findIndex(r => r.machine.toLowerCase() === selectedMachine.toLowerCase());

      if (index > -1) {
        updated[index] = {
          ...updated[index],
          values: {
            ...updated[index].values,
            [key]: value
          }
        };
      } else {
        // Construct new document structure
        updated.push({
          machine: selectedMachine,
          values: {
            operator_alloc: "0",
            online_inspect_alloc: "0",
            supervisor_alloc: "0",
            plant_manager_alloc: "0",
            power_alloc: "0 KW",
            power_cost: "0",
            consumables_cost: "0",
            maintenance_cost: "0",
            rent_cost: "0",
            wiring_cost: "0",
            utilisation_factor: "100",
            [key]: value
          }
        });
      }
      return updated;
    });
  };

  // Toggle labour designations
  const handleLabourToggle = (designationName: string) => {
    if (!selectedMachine || !activeMachineData) return;

    let updatedList = [...selectedLabourList];
    const exists = updatedList.some((l) => l.toLowerCase() === designationName.toLowerCase());

    if (exists) {
      updatedList = updatedList.filter((l) => l.toLowerCase() !== designationName.toLowerCase());
    } else {
      updatedList.push(designationName);
    }

    const newSelectedLabour = updatedList.join(",");
    handleValueChange("selected_labour", newSelectedLabour);
  };

  // Trigger custom modal instead of window.prompt
  const handleAddCustomRow = () => {
    if (!selectedMachine || !activeMachineData) return;
    setNewRowName("");
    setShowAddRowModal(true);
  };

  // Confirm adding custom row from modal
  const confirmAddCustomRow = () => {
    if (!selectedMachine || !activeMachineData) return;

    const trimmedName = newRowName.trim();
    if (!trimmedName) {
      toast.error("Row name cannot be empty");
      return;
    }
    
    let customRows: Array<{ id: string; name: string; alloc: string; cost: string }> = [];
    if (activeMachineData.values.custom_rows) {
      try {
        customRows = JSON.parse(activeMachineData.values.custom_rows);
      } catch (e) {
        console.error("Error parsing custom_rows", e);
      }
    }

    const newId = `custom_${Date.now()}`;
    customRows.push({
      id: newId,
      name: trimmedName,
      alloc: "",
      cost: "0"
    });

    handleValueChange("custom_rows", JSON.stringify(customRows));
    toast.success(`Row "${trimmedName}" added successfully!`);
    
    // Close modal & reset input
    setShowAddRowModal(false);
    setNewRowName("");
  };

  // Delete a custom row
  const handleDeleteCustomRow = (id: string) => {
    if (!selectedMachine || !activeMachineData) return;
    
    let customRows: Array<{ id: string; name: string; alloc: string; cost: string }> = [];
    if (activeMachineData.values.custom_rows) {
      try {
        customRows = JSON.parse(activeMachineData.values.custom_rows);
      } catch (e) {
        console.error("Error parsing custom_rows", e);
      }
    }

    const rowToDelete = customRows.find(row => row.id === id);
    const rowName = rowToDelete ? rowToDelete.name : "Row";

    customRows = customRows.filter(row => row.id !== id);
    handleValueChange("custom_rows", JSON.stringify(customRows));
    toast.success(`Row "${rowName}" deleted successfully!`);
  };

  // Update fields in custom rows
  const handleCustomRowChange = (id: string, field: "name" | "alloc" | "cost", value: string) => {
    if (!selectedMachine || !activeMachineData) return;
    
    let customRows: Array<{ id: string; name: string; alloc: string; cost: string }> = [];
    if (activeMachineData.values.custom_rows) {
      try {
        customRows = JSON.parse(activeMachineData.values.custom_rows);
      } catch (e) {
        console.error("Error parsing custom_rows", e);
      }
    }

    customRows = customRows.map(row => {
      if (row.id === id) {
        return { ...row, [field]: value };
      }
      return row;
    });

    handleValueChange("custom_rows", JSON.stringify(customRows));
  };

  // Manual save handler for edit mode
  const handleSaveEdit = async () => {
    if (!selectedMachine || !activeMachineData) return;
    setSaveStatus("saving");

    // Auto-update power_alloc and power_cost in values before saving
    const eqRow = equipmentRows.find(r => r.designation.toLowerCase() === selectedMachine.toLowerCase());
    const power = eqRow ? parseFloat(eqRow.values.power || "0") : 0;
    const powerFactor = eqRow ? parseFloat(eqRow.values.power_factor || "0") : 0;
    const rangeValue = eqRow ? parseFloat(eqRow.values.range_value || "0") : 0;
    const universalPowerVal = parseFloat(systemSettings.power_universal_value || "8") || 8;
    const calculatedPowerCost = ((power * powerFactor) * rangeValue) / universalPowerVal;

    const updatedValues = {
      ...activeMachineData.values,
      power_alloc: `${power} kW`,
      power_cost: calculatedPowerCost.toFixed(3),
      wiring_cost: hasWiringCost ? (activeMachineData.values.wiring_cost || "0") : "0"
    };

    try {
      const response = await fetch(`${API_URL}/api/machine-hour-rate`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentUser?.token}`
        },
        body: JSON.stringify({
          machine: selectedMachine,
          values: updatedValues
        })
      });

      if (response.ok) {
        setSaveStatus("saved");
        setIsEditing(false);
        setEditBackup(null);
        setShowLabourDropdown(false);
        toast.success("Machine hour rate saved successfully!");
        setTimeout(() => {
          setSaveStatus("idle");
        }, 3000);
      } else {
        setSaveStatus("error");
        toast.error("Failed to save machine hour rate");
      }
    } catch (error) {
      console.error("Error saving machine hour rate:", error);
      setSaveStatus("error");
      toast.error("An error occurred while saving");
    }
  };

  // Manual cancel handler for edit mode
  const handleCancelEdit = () => {
    if (editBackup) {
      setMachineRates((prev) => {
        const updated = [...prev];
        const index = updated.findIndex(
          (r) => r.machine.toLowerCase() === selectedMachine.toLowerCase()
        );
        if (index > -1) {
          updated[index] = editBackup;
        }
        return updated;
      });
    }
    setIsEditing(false);
    setEditBackup(null);
    setShowLabourDropdown(false);
    toast.info("Changes cancelled and reverted.");
  };

  // Insert a variable at cursor position inside formula input
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
    
    // Focus back on input and place cursor after inserted variable
    setTimeout(() => {
      input.focus();
      const newCursorPos = start + varKey.length + 2; // +2 for square brackets
      input.setSelectionRange(newCursorPos, newCursorPos);
    }, 50);
  };

  // Validate and apply modified formula
  const applyFormula = () => {
    if (!formulaConfig) return;

    const trimmed = formulaValue.trim();
    if (!trimmed) {
      toast.error("Formula expression cannot be empty");
      return;
    }

    // Validation: Check variables and syntax
    const matches = trimmed.match(/\[([^\]]+)\]/g) || [];
    const invalidVars = matches.filter(match => {
      const key = match.slice(1, -1);
      return !formulaConfig.variables.some(v => v.key === key);
    });

    if (invalidVars.length > 0) {
      toast.error(`Invalid variables referenced: ${invalidVars.join(", ")}`);
      return;
    }

    // Dry-run evaluation
    let parsedFormula = trimmed;
    matches.forEach((match) => {
      const varKey = match.slice(1, -1);
      const matchedVar = formulaConfig.variables.find(v => v.key === varKey);
      const varVal = matchedVar ? parseFloat(matchedVar.value || "0") || 0 : 0;
      parsedFormula = parsedFormula.replaceAll(match, String(varVal));
    });

    try {
      const sanitized = parsedFormula.replace(/[^0-9a-zA-Z+\-*/().\s,]/g, "");
      const evalFunc = new Function("round", `return (${sanitized});`);
      const roundHelper = (val: number, dec: number = 2) => {
        return Number(Math.round(Number(val + "e" + dec)) + "e-" + dec);
      };
      const result = evalFunc(roundHelper);
      if (isNaN(result) || !isFinite(result)) {
        toast.error("Formula evaluates to an invalid number (NaN or Infinity)");
        return;
      }
    } catch (err) {
      toast.error(`Invalid formula syntax: ${err instanceof Error ? err.message : "Parsing error"}`);
      return;
    }

    handleValueChange(formulaConfig.targetValueKey, trimmed);
    toast.success(`${formulaConfig.title.replace("Edit ", "").replace(" Formula", "")} formula updated!`);
    setShowFormulaModal(false);
    setFormulaConfig(null);
  };

  // Reset function
  const handleReset = async () => {
    if (!window.confirm("Are you sure you want to reset all machine hour rates to default templates?")) {
      return;
    }

    setResetting(true);
    try {
      const response = await fetch(`${API_URL}/api/machine-hour-rate/reset`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${currentUser?.token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setMachineRates(data);
        toast.success("Reset machine hour rates to system defaults!");
      } else {
        toast.error(data.message || "Failed to reset configurations");
      }
    } catch (error) {
      console.error("Error resetting machine hour rates:", error);
      toast.error("An error occurred during reset");
    } finally {
      setResetting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-5 animate-in fade-in duration-500">
        
        {/* Page Header & Selector Card */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
          <div className="max-w-xl">
            <h1 className="text-xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <Calculator className="h-5.5 w-5.5 text-primary" />
              Machine Hour Rate Sheet
            </h1>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Select an equipment or machine to view its breakdown hourly operating cost.
            </p>
          </div>
          
          <div className="flex items-center gap-3 self-start md:self-center">
            {/* Dropdown & Controls Selector */}
            <Card className="border-none shadow-md bg-card/60 backdrop-blur-md py-2 px-3.5 w-fit">
              <div className="flex items-center gap-4">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="machine-select" className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                    Select Equipment / Machine
                  </Label>
                  <select
                    id="machine-select"
                    value={selectedMachine}
                    disabled={isEditing}
                    onChange={(e) => {
                      isInitialLoad.current = true;
                      setSelectedMachine(e.target.value);
                    }}
                    className="h-8 px-2 rounded-lg bg-background border border-input text-foreground font-bold shadow-sm focus:ring-1 focus:ring-primary outline-none cursor-pointer transition-all hover:bg-muted/10 text-xs disabled:opacity-50 disabled:cursor-not-allowed min-w-[180px]"
                  >
                    {machineOptions.map((m) => (
                      <option key={m} value={m} className="bg-background text-foreground font-medium py-1">
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {isSuperAdmin && (
                  <div className="flex items-center self-end mb-0.5">
                    {!isEditing ? (
                      <Button
                        onClick={() => {
                          setEditBackup(JSON.parse(JSON.stringify(activeMachineData)));
                          setIsEditing(true);
                        }}
                        className="h-8 px-3 text-xs font-bold shadow-sm flex items-center gap-1"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        Edit Sheet
                      </Button>
                    ) : (
                      <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-200">
                        <Button
                          onClick={handleSaveEdit}
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
                              <Save className="h-3 w-3" />
                              Save
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={handleCancelEdit}
                          variant="outline"
                          className="h-8 px-3 text-xs font-bold shadow-sm flex items-center gap-1"
                        >
                          <X className="h-3 w-3" />
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </Card>

            {!isSuperAdmin && (
              <div className="flex items-center gap-2 bg-muted/60 border border-muted px-3 py-1.5 rounded-lg text-[10px] font-semibold text-muted-foreground whitespace-nowrap">
                <Info className="h-3.5 w-3.5 text-primary" />
                Read-only
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Calculator Spreadsheets */}
        <Card className="border-none shadow-2xl bg-card/60 backdrop-blur-md overflow-visible">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex h-72 items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
            ) : !selectedMachine || !activeMachineData || !calculations ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground space-y-4">
                <AlertTriangle className="h-12 w-12 text-warning animate-bounce" />
                <p className="text-lg font-bold">No machine cost configuration loaded.</p>
                <Button onClick={fetchData} className="font-semibold h-11 px-6">Reload Data Tables</Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="border-separate border-spacing-0 w-full">
                  <TableHeader>
                    {/* Excel Sheet Title Header */}
                    <TableRow className="hover:bg-transparent">
                      <TableHead 
                        colSpan={5} 
                        className="bg-[#bdd7ee] text-black font-extrabold text-sm py-2.5 text-center border-b select-none uppercase tracking-widest"
                      >
                        {selectedMachine} Machine Hour Cost - 2025
                      </TableHead>
                    </TableRow>
                    {/* Columns headers */}
                    <TableRow className="bg-muted/30 border-b hover:bg-transparent">
                      <TableHead className="py-2.5 px-4 text-xs font-extrabold tracking-wider w-[80px] text-center border-r border-b bg-background text-foreground">
                        SI No
                      </TableHead>
                      <TableHead className="py-2.5 px-4 text-xs font-extrabold tracking-wider text-left border-r border-b text-foreground min-w-[280px]">
                        Particulars
                      </TableHead>
                      <TableHead className="py-2.5 px-4 text-xs font-extrabold tracking-wider text-left border-r border-b text-foreground w-[180px]">
                        Allocation / Detail
                      </TableHead>
                      <TableHead className="py-2.5 px-4 text-xs font-extrabold tracking-wider text-left border-r border-b text-foreground w-[180px]">
                        Item Cost
                      </TableHead>
                      <TableHead className="py-2.5 px-4 text-xs font-extrabold tracking-wider text-left border-b text-foreground w-[200px]">
                        Cost / Hr (INR)
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    
                     {/* 1. Depreciation & Interest */}
                     <TableRow className="hover:bg-muted/5 transition-colors">
                       <TableCell className="py-2 px-4 text-center font-bold text-muted-foreground border-r border-b sticky left-0 z-10 bg-background text-xs">
                         1
                       </TableCell>
                       <TableCell 
                         className="py-2 px-4 font-bold border-r border-b text-foreground text-xs cursor-help"
                         title="Calculated depreciation & interest cost based on formula (Formula fetched from Salary Capital Charges Page (Equipments))"
                       >
                         Depreciation & Interest
                       </TableCell>
                       <TableCell className="py-2 px-4 font-mono text-muted-foreground border-r border-b bg-muted/5 font-semibold text-xs text-center">
                         -
                       </TableCell>
                       <TableCell className="py-2 px-4 border-r border-b text-xs" />
                       <TableCell 
                         className={cn(
                           "py-2 px-4 font-mono font-bold text-foreground border-b text-xs text-right bg-muted/5 relative select-none group transition-all cursor-help",
                           isEditing && "cursor-pointer hover:bg-primary/10"
                         )}
                         onDoubleClick={() => {
                           if (isEditing && activeMachineData) {
                             const eqRow = equipmentRows.find(r => r.designation.toLowerCase() === selectedMachine.toLowerCase());
                             const defaultFormula = "[total]";
                             setFormulaConfig({
                               sectionKey: "depreciation",
                               title: "Edit Depreciation & Interest Formula",
                               description: "Define a custom formula to calculate the hourly Depreciation & Interest cost from the equipment parameters.",
                               targetValueKey: "depreciation_formula",
                               defaultFormula: defaultFormula,
                               variables: eqRow ? Object.keys(eqRow.values).filter(k => k !== "designation").map(k => ({
                                 key: k,
                                 value: eqRow.values[k],
                                 label: `[${k}] (${k.replace("_pa", " PA").replace("_hr", " Per Hour")})`
                               })) : []
                             });
                             setFormulaValue(activeMachineData.values.depreciation_formula || defaultFormula);
                             setShowFormulaModal(true);
                           }
                         }}
                         title={`Formula: ${activeMachineData?.values?.depreciation_formula || "[total]"} (Fetched from Salary Capital Charges Page (Equipments))`}
                       >
                         <div className="flex items-center justify-between gap-2">
                           {isEditing && (
                             <span className="opacity-0 group-hover:opacity-100 text-primary transition-all shrink-0">
                               <Edit className="h-3.5 w-3.5" />
                             </span>
                           )}
                           <span className="flex-1 text-right">
                             {calculations.depreciationAndInterestCost.toFixed(2)}
                           </span>
                         </div>
                       </TableCell>
                     </TableRow>

                    {/* 2. Labour */}
                    <TableRow className="hover:bg-muted/5 transition-colors">
                      <TableCell className="py-2 px-4 text-center font-bold text-muted-foreground border-r border-b sticky left-0 z-10 bg-background text-xs">
                        2
                      </TableCell>
                      <TableCell 
                        ref={dropdownRef}
                        className="py-2 px-4 font-bold border-r border-b text-foreground text-xs cursor-help select-none relative"
                        title="Fetched from Salary Capital Charges Page (Operators)"
                        onDoubleClick={() => {
                          if (isEditing) {
                            setShowLabourDropdown(prev => !prev);
                          }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span>Labour</span>
                          {isEditing && (
                            <span className="text-[10px] text-primary font-semibold flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-md border border-primary/20 hover:bg-primary/20 transition-colors">
                              Select roles ▼
                            </span>
                          )}
                        </div>

                        {/* Floating checkable dropdown container */}
                        {isEditing && showLabourDropdown && (
                          <div 
                            className="absolute left-6 top-full mt-2 w-72 bg-popover border border-border rounded-xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200 text-left font-normal"
                            onClick={(e) => e.stopPropagation()} // Prevent click-throughs from closing it
                          >
                            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-muted">
                              <span className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider">
                                Select Labour Designations
                              </span>
                              <button
                                type="button"
                                onClick={() => setShowLabourDropdown(false)}
                                className="text-xs text-muted-foreground hover:text-foreground font-semibold px-2.5 py-1 rounded bg-muted hover:bg-muted/80 transition-colors"
                              >
                                Done
                              </button>
                            </div>
                            <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                              {operatorRows.map((op) => {
                                const isChecked = selectedLabourList.some(
                                  (l) => l.toLowerCase() === op.designation.toLowerCase()
                                );
                                return (
                                  <label
                                    key={op.designation}
                                    className="flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors select-none text-sm text-foreground font-semibold"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => handleLabourToggle(op.designation)}
                                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                    />
                                    <span>{op.designation}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-2 px-4 border-r border-b text-xs" />
                      <TableCell className="py-2 px-4 border-r border-b text-xs" />
                      <TableCell className="py-2 px-4 border-b text-xs" />
                    </TableRow>

                    {calculations.labourCosts.map((labour, index) => {
                      const letter = String.fromCharCode(97 + index); // a, b, c, d...
                      return (
                        <TableRow key={labour.designation} className="hover:bg-muted/5 transition-colors animate-in fade-in duration-200">
                          <TableCell className="py-1.5 px-4 border-r border-b bg-background sticky left-0 z-10 text-xs" />
                          <TableCell 
                            className="py-1.5 px-8 font-semibold text-muted-foreground border-r border-b text-xs cursor-help"
                            title="Fetched from Salary Capital Charges Page (Operators)"
                          >
                            {letter}) {labour.designation}
                          </TableCell>
                          <TableCell className="p-0.5 border-r border-b">
                            <Input
                              type="text"
                              value={activeMachineData.values[labour.allocKey] || "0"}
                              readOnly={!isEditing}
                              onChange={(e) => handleValueChange(labour.allocKey, e.target.value)}
                              className={cn(
                                "h-8 w-full bg-transparent border-none shadow-none rounded-none text-xs px-3 font-mono font-semibold transition-all focus-visible:ring-0 text-center",
                                isEditing ? "hover:bg-muted/20 focus:bg-background focus:ring-1 focus:ring-primary rounded" : "cursor-default pointer-events-none text-muted-foreground"
                              )}
                            />
                          </TableCell>
                          <TableCell 
                            className={cn(
                              "py-1.5 px-4 font-mono font-semibold text-muted-foreground border-r border-b text-xs text-right relative select-none group transition-all cursor-help",
                              isEditing && "cursor-pointer hover:bg-primary/10"
                            )}
                            onDoubleClick={() => {
                              if (isEditing && activeMachineData) {
                                const targetKey = `${labour.designation.toLowerCase().replace(/[^a-z0-9]/g, "_")}_formula`;
                                const defaultFormula = labour.designation.toLowerCase().includes("operator") ? "[alloc] * [rate]" : "[rate] / [alloc]";
                                
                                setFormulaConfig({
                                  sectionKey: `labour_${labour.designation}`,
                                  title: `Edit ${labour.designation} Formula`,
                                  description: `Define a custom formula to calculate the hourly cost for "${labour.designation}".`,
                                  targetValueKey: targetKey,
                                  defaultFormula: defaultFormula,
                                  variables: [
                                    { key: "alloc", value: activeMachineData.values[labour.allocKey] || "0", label: "[alloc] (Allocation)" },
                                    { key: "rate", value: labour.rate.toFixed(2), label: "[rate] (Hourly payroll rate)" }
                                  ]
                                });
                                setFormulaValue(activeMachineData.values[targetKey] || defaultFormula);
                                setShowFormulaModal(true);
                              }
                            }}
                            title={`Formula: ${activeMachineData?.values?.[`${labour.designation.toLowerCase().replace(/[^a-z0-9]/g, "_")}_formula`] || (labour.designation.toLowerCase().includes("operator") ? "[alloc] * [rate]" : "[rate] / [alloc]")}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              {isEditing && (
                                <span className="opacity-0 group-hover:opacity-100 text-primary transition-all shrink-0">
                                  <Edit className="h-3.5 w-3.5" />
                                </span>
                              )}
                              <span className="flex-1 text-right">
                                {labour.cost.toFixed(2)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-1.5 px-4 border-b text-xs" />
                        </TableRow>
                      );
                    })}

                    {/* Labour Subtotal Row */}
                    <TableRow className="hover:bg-transparent">
                      <TableCell className="py-1.5 px-4 border-r border-b bg-background sticky left-0 z-10 text-xs" />
                      <TableCell className="py-1.5 px-4 border-r border-b text-xs" />
                      <TableCell className="py-1.5 px-4 border-r border-b text-xs bg-muted/5" />
                      <TableCell className="py-1.5 px-4 border-r border-b text-xs" />
                      <TableCell 
                        className="py-1.5 px-4 font-mono font-extrabold text-foreground border-b text-xs text-right bg-muted/20 cursor-help"
                        title="Formula: [Sum of all labor costs]"
                      >
                        {calculations.labourSubtotal.toFixed(2)}
                      </TableCell>
                    </TableRow>

                    {/* 3. Power */}
                    <TableRow className="hover:bg-muted/5 transition-colors">
                      <TableCell className="py-2 px-4 text-center font-bold text-muted-foreground border-r border-b sticky left-0 z-10 bg-background text-xs">
                        3
                      </TableCell>
                      <TableCell 
                        className="py-2 px-4 font-bold border-r border-b text-foreground text-xs cursor-help"
                        title="Fetched from Salary Capital Charges Page (Equipments)"
                      >
                        Power
                      </TableCell>
                      <TableCell 
                        className="p-0.5 border-r border-b cursor-help"
                        title="Fetched from Salary Capital Charges Page (Equipments)"
                      >
                        <Input
                          type="text"
                          value={(() => {
                            const eqRow = equipmentRows.find(r => r.designation.toLowerCase() === selectedMachine.toLowerCase());
                            const p = eqRow ? eqRow.values.power : "";
                            return p ? `${p} kW` : "0 kW";
                          })()}
                          readOnly={true}
                          className="h-8 w-full bg-transparent border-none shadow-none rounded-none text-xs px-3 font-mono font-bold transition-all focus-visible:ring-0 text-center cursor-default pointer-events-none text-muted-foreground"
                        />
                      </TableCell>
                      <TableCell className="py-2 px-4 border-r border-b text-xs" />
                      <TableCell 
                        className="p-0.5 border-b cursor-help"
                        title="Formula: ((Power * Power Factor) * Range Value) / Universal Power Value"
                      >
                        <Input
                          type="text"
                          value={calculations ? calculations.powerCost.toFixed(3) : "0.000"}
                          readOnly={true}
                          className="h-8 w-full bg-transparent border-none shadow-none rounded-none text-xs px-3 font-mono font-bold transition-all focus-visible:ring-0 text-right cursor-default pointer-events-none text-muted-foreground"
                        />
                      </TableCell>
                    </TableRow>

                    {/* 4. Consumables */}
                    <TableRow className="hover:bg-muted/5 transition-colors">
                      <TableCell className="py-2 px-4 text-center font-bold text-muted-foreground border-r border-b sticky left-0 z-10 bg-background text-xs">
                        4
                      </TableCell>
                      <TableCell className="py-2 px-4 font-bold border-r border-b text-foreground text-xs">
                        Consumables
                      </TableCell>
                      <TableCell className="py-2 px-4 border-r border-b text-xs" />
                      <TableCell className="py-2 px-4 border-r border-b text-xs" />
                      <TableCell className="p-0.5 border-b">
                        <Input
                          type="number"
                          step="0.01"
                          value={activeMachineData.values.consumables_cost || "0"}
                          readOnly={!isEditing}
                          onChange={(e) => handleValueChange("consumables_cost", e.target.value)}
                          className={cn(
                            "h-8 w-full bg-transparent border-none shadow-none rounded-none text-xs px-3 font-mono font-bold transition-all focus-visible:ring-0 text-right",
                            isEditing ? "hover:bg-muted/20 focus:bg-background focus:ring-1 focus:ring-primary rounded" : "cursor-default pointer-events-none text-muted-foreground"
                          )}
                        />
                      </TableCell>
                    </TableRow>

                    {/* 5. Maintenance */}
                    <TableRow className="hover:bg-muted/5 transition-colors">
                      <TableCell className="py-2 px-4 text-center font-bold text-muted-foreground border-r border-b sticky left-0 z-10 bg-background text-xs">
                        5
                      </TableCell>
                      <TableCell className="py-2 px-4 font-bold border-r border-b text-foreground text-xs">
                        Maintainance
                      </TableCell>
                      <TableCell className="py-2 px-4 border-r border-b text-xs" />
                      <TableCell className="py-2 px-4 border-r border-b text-xs" />
                      <TableCell className="p-0.5 border-b">
                        <Input
                          type="number"
                          step="0.01"
                          value={activeMachineData.values.maintenance_cost || "0"}
                          readOnly={!isEditing}
                          onChange={(e) => handleValueChange("maintenance_cost", e.target.value)}
                          className={cn(
                            "h-8 w-full bg-transparent border-none shadow-none rounded-none text-xs px-3 font-mono font-bold transition-all focus-visible:ring-0 text-right",
                            isEditing ? "hover:bg-muted/20 focus:bg-background focus:ring-1 focus:ring-primary rounded" : "cursor-default pointer-events-none text-muted-foreground"
                          )}
                        />
                      </TableCell>
                    </TableRow>

                    {/* 6. Rent */}
                    <TableRow className="hover:bg-muted/5 transition-colors">
                      <TableCell className="py-2 px-4 text-center font-bold text-muted-foreground border-r border-b sticky left-0 z-10 bg-background text-xs">
                        6
                      </TableCell>
                      <TableCell className="py-2 px-4 font-bold border-r border-b text-foreground text-xs">
                        Rent
                      </TableCell>
                      <TableCell className="py-2 px-4 border-r border-b text-xs" />
                      <TableCell className="py-2 px-4 border-r border-b text-xs" />
                      <TableCell className="p-0.5 border-b">
                        <Input
                          type="number"
                          step="0.01"
                          value={activeMachineData.values.rent_cost || "0"}
                          readOnly={!isEditing}
                          onChange={(e) => handleValueChange("rent_cost", e.target.value)}
                          className={cn(
                            "h-8 w-full bg-transparent border-none shadow-none rounded-none text-xs px-3 font-mono font-bold transition-all focus-visible:ring-0 text-right",
                            isEditing ? "hover:bg-muted/20 focus:bg-background focus:ring-1 focus:ring-primary rounded" : "cursor-default pointer-events-none text-muted-foreground"
                          )}
                        />
                      </TableCell>
                    </TableRow>

                    {/* 6A. Power wiring cost (Conditional) */}
                    {hasWiringCost && (
                      <TableRow className="hover:bg-muted/5 transition-colors">
                        <TableCell className="py-2 px-4 text-center font-bold text-muted-foreground border-r border-b sticky left-0 z-10 bg-background text-xs">
                          6A
                        </TableCell>
                        <TableCell className="py-2 px-4 font-bold border-r border-b text-foreground text-xs">
                          Power wiring cost
                        </TableCell>
                        <TableCell className="py-2 px-4 border-r border-b text-xs" />
                        <TableCell className="py-2 px-4 border-r border-b text-xs" />
                        <TableCell className="p-0.5 border-b">
                          <Input
                            type="number"
                            step="0.01"
                            value={activeMachineData.values.wiring_cost || "0"}
                            readOnly={!isEditing}
                            onChange={(e) => handleValueChange("wiring_cost", e.target.value)}
                            className={cn(
                              "h-8 w-full bg-transparent border-none shadow-none rounded-none text-xs px-3 font-mono font-bold transition-all focus-visible:ring-0 text-right",
                              isEditing ? "hover:bg-muted/20 focus:bg-background focus:ring-1 focus:ring-primary rounded" : "cursor-default pointer-events-none"
                            )}
                          />
                        </TableCell>
                      </TableRow>
                    )}

                    {/* Custom Cost Rows */}
                    {calculations.customRows.map((row, index) => {
                      const siNo = 7 + index;
                      return (
                        <TableRow key={row.id} className="hover:bg-muted/5 transition-colors group animate-in fade-in duration-200">
                          {/* SI No */}
                          <TableCell className="py-1.5 px-4 text-center font-bold text-muted-foreground border-r border-b sticky left-0 z-10 bg-background text-xs">
                            {siNo}
                          </TableCell>
                          {/* Particulars (Name) */}
                          <TableCell className="p-0.5 border-r border-b">
                            <div className="flex items-center gap-2">
                              {isEditing && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCustomRow(row.id)}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 p-1 rounded transition-all shrink-0"
                                  title="Delete Row"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                              <Input
                                type="text"
                                value={row.name}
                                readOnly={!isEditing}
                                onChange={(e) => handleCustomRowChange(row.id, "name", e.target.value)}
                                className={cn(
                                  "h-8 w-full bg-transparent border-none shadow-none rounded-none text-xs px-2 font-semibold transition-all focus-visible:ring-0 text-left",
                                  isEditing ? "hover:bg-muted/20 focus:bg-background focus:ring-1 focus:ring-primary rounded" : "cursor-default pointer-events-none"
                                )}
                              />
                            </div>
                          </TableCell>
                          {/* Allocation / Detail */}
                          <TableCell className="p-0.5 border-r border-b">
                            <Input
                              type="text"
                              value={row.alloc || ""}
                              placeholder={isEditing ? "-" : ""}
                              readOnly={!isEditing}
                              onChange={(e) => handleCustomRowChange(row.id, "alloc", e.target.value)}
                              className={cn(
                                "h-8 w-full bg-transparent border-none shadow-none rounded-none text-xs px-3 font-mono font-bold transition-all focus-visible:ring-0 text-center",
                                isEditing ? "hover:bg-muted/20 focus:bg-background focus:ring-1 focus:ring-primary rounded" : "cursor-default pointer-events-none text-muted-foreground"
                              )}
                            />
                          </TableCell>
                          {/* Item Cost (Column 4 - empty) */}
                          <TableCell className="py-1.5 px-4 border-r border-b text-xs" />
                          {/* Cost / Hr (Column 5) */}
                          <TableCell className="p-0.5 border-b">
                            <Input
                              type="number"
                              step="0.01"
                              value={row.cost}
                              readOnly={!isEditing}
                              onChange={(e) => handleCustomRowChange(row.id, "cost", e.target.value)}
                              className={cn(
                                "h-8 w-full bg-transparent border-none shadow-none rounded-none text-xs px-3 font-mono font-bold transition-all focus-visible:ring-0 text-right",
                                isEditing ? "hover:bg-muted/20 focus:bg-background focus:ring-1 focus:ring-primary rounded" : "cursor-default pointer-events-none text-muted-foreground"
                              )}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {/* Add Row Tab (Editable Mode Only) */}
                    {isEditing && (
                      <TableRow 
                        onClick={handleAddCustomRow}
                        className="hover:bg-primary/5 transition-colors cursor-pointer border-dashed border-2 border-primary/30"
                      >
                        <TableCell className="py-1.5 px-4 text-center font-extrabold text-primary sticky left-0 z-10 bg-background text-xs">
                          +
                        </TableCell>
                        <TableCell className="py-1.5 px-4 font-bold text-primary text-xs" colSpan={4}>
                          <span className="flex items-center justify-center gap-1.5 py-0.5">
                            + Add custom cost row
                          </span>
                        </TableCell>
                      </TableRow>
                    )}

                    {/* TOTAL Machine Hr Rate */}
                    <TableRow className="hover:bg-muted/5 transition-colors bg-accent/20">
                      <TableCell className="py-2.5 px-4 text-center font-bold text-muted-foreground border-r border-b sticky left-0 z-10 bg-background text-xs">
                        {7 + calculations.customRows.length}
                      </TableCell>
                      <TableCell className="py-2.5 px-4 font-extrabold border-r border-b text-foreground uppercase tracking-wider text-xs">
                        TOTAL Machine Hr Rate
                      </TableCell>
                      <TableCell className="py-2.5 px-4 border-r border-b text-xs" />
                      <TableCell className="py-2.5 px-4 border-r border-b text-xs" />
                      <TableCell 
                        className={cn(
                          "py-2.5 px-4 font-mono font-black border-b text-foreground bg-accent/30 text-sm text-right relative select-none group transition-all cursor-help",
                          isEditing && "cursor-pointer hover:bg-primary/10"
                        )}
                        onDoubleClick={() => {
                          if (isEditing && activeMachineData) {
                            const defaultFormula = `[total] + [labour] + [power] + [consumables] + [maintenance] + [rent]${hasWiringCost ? " + [wiring]" : ""}${calculations.customRows.length > 0 ? " + [custom_rows]" : ""}`;
                            setFormulaConfig({
                              sectionKey: "total_mhr",
                              title: "Edit TOTAL Machine Hr Rate Formula",
                              description: "Define a custom formula to calculate the final machine hour rate from the individual overhead costs.",
                              targetValueKey: "total_mhr_formula",
                              defaultFormula: defaultFormula,
                              variables: [
                                { key: "total", value: calculations.depreciationAndInterestCost.toFixed(2), label: "[total] (Depreciation & Interest)" },
                                { key: "labour", value: calculations.labourSubtotal.toFixed(2), label: "[labour] (Labour Subtotal)" },
                                { key: "power", value: (parseFloat(activeMachineData.values.power_cost) || 0).toFixed(2), label: "[power] (Power Cost)" },
                                { key: "consumables", value: (parseFloat(activeMachineData.values.consumables_cost) || 0).toFixed(2), label: "[consumables] (Consumables)" },
                                { key: "maintenance", value: (parseFloat(activeMachineData.values.maintenance_cost) || 0).toFixed(2), label: "[maintenance] (Maintenance)" },
                                { key: "rent", value: (parseFloat(activeMachineData.values.rent_cost) || 0).toFixed(2), label: "[rent] (Rent Cost)" },
                                { key: "wiring", value: (parseFloat(activeMachineData.values.wiring_cost) || 0).toFixed(2), label: "[wiring] (Wiring Cost)" },
                                { key: "custom_rows", value: calculations.customRowsSubtotal.toFixed(2), label: "[custom_rows] (Custom Rows Subtotal)" }
                              ]
                            });
                            setFormulaValue(activeMachineData.values.total_mhr_formula || defaultFormula);
                            setShowFormulaModal(true);
                          }
                        }}
                        title={`Formula: ${activeMachineData?.values?.total_mhr_formula || `[total] + [labour] + [power] + [consumables] + [maintenance] + [rent]${hasWiringCost ? " + [wiring]" : ""}${calculations.customRows.length > 0 ? " + [custom_rows]" : ""}`}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          {isEditing && (
                            <span className="opacity-0 group-hover:opacity-100 text-primary transition-all shrink-0">
                              <Edit className="h-3.5 w-3.5" />
                            </span>
                          )}
                          <span className="flex-1 text-right">
                            {calculations.totalMachineHrRate.toFixed(2)}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Add Utilisation Factor */}
                    <TableRow className="hover:bg-muted/5 transition-colors">
                      <TableCell className="py-2 px-4 text-center font-extrabold text-foreground border-r border-b sticky left-0 z-10 bg-background text-xs">
                        {8 + calculations.customRows.length}
                      </TableCell>
                      <TableCell className="py-2 px-4 font-extrabold border-r border-b text-foreground text-xs">
                        Add Utilisation Factor {calculations.utFactor}%
                      </TableCell>
                      <TableCell className="p-0.5 border-r border-b">
                        <Input
                          type="number"
                          value={activeMachineData.values.utilisation_factor || "100"}
                          readOnly={!isEditing}
                          onChange={(e) => handleValueChange("utilisation_factor", e.target.value)}
                          className={cn(
                            "h-8 w-full bg-transparent border-none shadow-none rounded-none text-xs px-3 font-mono font-bold transition-all focus-visible:ring-0 text-center",
                            isEditing ? "hover:bg-muted/20 focus:bg-background focus:ring-1 focus:ring-primary rounded" : "cursor-default pointer-events-none"
                          )}
                        />
                      </TableCell>
                      <TableCell className="py-2 px-4 border-r border-b text-xs" />
                      <TableCell 
                        className={cn(
                          "py-2 px-4 font-mono font-black border-b text-foreground bg-[#fce4d6] text-sm text-right relative select-none group transition-all cursor-help",
                          isEditing && "cursor-pointer hover:bg-primary/10"
                        )}
                        onDoubleClick={() => {
                          if (isEditing && activeMachineData) {
                            const defaultFormula = "[total_mhr] / ([utilisation_factor] / 100)";
                            setFormulaConfig({
                              sectionKey: "utilisation_cost",
                              title: "Edit Utilisation Cost Formula",
                              description: "Define a custom formula to calculate the utilisation cost adjusted by the factor percentage.",
                              targetValueKey: "utilisation_cost_formula",
                              defaultFormula: defaultFormula,
                              variables: [
                                { key: "total_mhr", value: calculations.totalMachineHrRate.toFixed(2), label: "[total_mhr] (TOTAL Machine Hr Rate)" },
                                { key: "utilisation_factor", value: (parseFloat(activeMachineData.values.utilisation_factor) || 100).toFixed(2), label: "[utilisation_factor] (Utilisation %)" }
                              ]
                            });
                            setFormulaValue(activeMachineData.values.utilisation_cost_formula || defaultFormula);
                            setShowFormulaModal(true);
                          }
                        }}
                        title={`Formula: ${activeMachineData?.values?.utilisation_cost_formula || "[total_mhr] / ([utilisation_factor] / 100)"}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          {isEditing && (
                            <span className="opacity-0 group-hover:opacity-100 text-primary transition-all shrink-0">
                              <Edit className="h-3.5 w-3.5" />
                            </span>
                          )}
                          <span className="flex-1 text-right">
                            {calculations.utilisationCost.toFixed(2)}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Machine Cost / seconds */}
                    <TableRow className="hover:bg-muted/5 transition-colors bg-primary/10">
                      <TableCell className="py-2 px-4 text-center font-extrabold text-foreground border-r border-b sticky left-0 z-10 bg-background text-xs">
                        {9 + calculations.customRows.length}
                      </TableCell>
                      <TableCell className="py-2 px-4 font-extrabold border-r border-b text-foreground uppercase tracking-wider text-xs">
                        Machine Cost / seconds
                      </TableCell>
                      <TableCell className="py-2 px-4 border-r border-b text-xs" />
                      <TableCell className="py-2 px-4 border-r border-b text-xs" />
                      <TableCell 
                        className={cn(
                          "py-2 px-4 font-mono font-black border-b text-foreground text-sm text-right relative select-none group transition-all cursor-help",
                          isEditing && "cursor-pointer hover:bg-primary/10"
                        )}
                        onDoubleClick={() => {
                          if (isEditing && activeMachineData) {
                            const defaultFormula = "[utilisation_cost] / 3600";
                            setFormulaConfig({
                              sectionKey: "cost_per_second",
                              title: "Edit Cost / Seconds Formula",
                              description: "Define a custom formula to calculate the operating cost per second.",
                              targetValueKey: "cost_per_second_formula",
                              defaultFormula: defaultFormula,
                              variables: [
                                { key: "utilisation_cost", value: calculations.utilisationCost.toFixed(2), label: "[utilisation_cost] (Utilisation Cost)" }
                              ]
                            });
                            setFormulaValue(activeMachineData.values.cost_per_second_formula || defaultFormula);
                            setShowFormulaModal(true);
                          }
                        }}
                        title={`Formula: ${activeMachineData?.values?.cost_per_second_formula || "[utilisation_cost] / 3600"}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          {isEditing && (
                            <span className="opacity-0 group-hover:opacity-100 text-primary transition-all shrink-0">
                              <Edit className="h-3.5 w-3.5" />
                            </span>
                          )}
                          <span className="flex-1 text-right">
                            {calculations.costPerSecond.toFixed(4)}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>

                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        {/* Custom Add Row Modal Dialog */}
        {showAddRowModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
              className="bg-card border border-border w-full max-w-md p-6 rounded-2xl shadow-2xl space-y-4 animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-1.5">
                <h3 className="text-xl font-bold text-foreground">Add Custom Row</h3>
                <p className="text-sm text-muted-foreground">
                  Enter a Particulars name for the new custom overhead operating cost.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="custom-row-name-input" className="text-sm font-semibold text-muted-foreground">Particulars Name</Label>
                <Input
                  id="custom-row-name-input"
                  type="text"
                  placeholder="e.g., Tooling cost, Admin Overhead"
                  value={newRowName}
                  autoFocus
                  onChange={(e) => setNewRowName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      confirmAddCustomRow();
                    } else if (e.key === "Escape") {
                      setShowAddRowModal(false);
                      setNewRowName("");
                    }
                  }}
                  className="h-11 rounded-xl bg-background border border-input px-4"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddRowModal(false);
                    setNewRowName("");
                  }}
                  className="h-11 px-5 font-bold"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmAddCustomRow}
                  className="h-11 px-5 font-bold"
                >
                  Add Row
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Edit Formula Modal Dialog */}
        {showFormulaModal && formulaConfig && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
              className="bg-card border border-border w-full max-w-lg p-6 rounded-2xl shadow-2xl space-y-4 animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-1.5">
                <h3 className="text-xl font-bold text-foreground">{formulaConfig.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {formulaConfig.description}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="formula-input" className="text-sm font-semibold text-muted-foreground">Formula Expression</Label>
                <Input
                  ref={formulaInputRef}
                  id="formula-input"
                  type="text"
                  placeholder={`e.g., ${formulaConfig.defaultFormula}`}
                  value={formulaValue}
                  autoFocus
                  onChange={(e) => setFormulaValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      applyFormula();
                    } else if (e.key === "Escape") {
                      setShowFormulaModal(false);
                      setFormulaConfig(null);
                    }
                  }}
                  className="h-11 rounded-xl bg-background border border-input px-4 font-mono font-semibold"
                />
              </div>

              {/* List of Available Variables */}
              <div className="space-y-2.5">
                <span className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider block">
                  Available Variables (Click to insert)
                </span>
                <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1 bg-muted/30 rounded-xl border border-muted/50">
                  {formulaConfig.variables.map((variable) => (
                    <button
                      key={variable.key}
                      type="button"
                      onClick={() => insertVariable(variable.key)}
                      className="px-3 py-1.5 rounded-lg bg-background hover:bg-primary/10 border border-border hover:border-primary/30 text-xs font-mono font-semibold text-foreground transition-all flex items-center gap-1.5 shadow-sm"
                      title={`Insert [${variable.key}] (Current value: ${variable.value})`}
                    >
                      <span className="text-primary font-bold">[{variable.key}]</span>
                      <span className="text-muted-foreground text-[10px]">({variable.value})</span>
                    </button>
                  ))}
                  {formulaConfig.variables.length === 0 && (
                    <span className="text-xs text-muted-foreground p-2">No variables available for this section.</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowFormulaModal(false);
                    setFormulaConfig(null);
                  }}
                  className="h-11 px-5 font-bold"
                >
                  Cancel
                </Button>
                <Button
                  onClick={applyFormula}
                  className="h-11 px-5 font-bold"
                >
                  Apply Formula
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
