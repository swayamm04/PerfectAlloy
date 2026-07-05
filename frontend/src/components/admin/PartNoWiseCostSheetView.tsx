"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/src/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  FileText,
  Loader2,
  AlertTriangle,
  Download,
  FileSpreadsheet,
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

interface CustomColumn {
  key: string;
  name: string;
  hasMetadata?: boolean;
  hasCycleTime?: boolean;
  hasTooling?: boolean;
  defaultRate: number;
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

export default function PartNoWiseCostSheetView() {
  const { user: currentUser } = useAuth();

  // Data States
  const [costSheets, setCostSheets] = useState<CostSheetData[]>([]);
  const [activeMonth, setActiveMonth] = useState<string>("");
  const [materialRates, setMaterialRates] = useState<MaterialRateData[]>([]);
  const [machineRates, setMachineRates] = useState<MachineHourRateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [summarySearch, setSummarySearch] = useState("");
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);

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

      const settingsResponse = await fetch(`${API_URL}/api/system-settings`, {
        headers: { Authorization: `Bearer ${currentUser?.token}` }
      });
      let systemSettings = { power_universal_value: "8" };
      if (settingsResponse.ok) {
        systemSettings = await settingsResponse.json();
      }

      const calculatedMhr = calculateMachineRates(mhrList, eqList, opList, systemSettings);
      setMachineRates(calculatedMhr);

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

  // Active Cost Sheet document selection
  const activeDocument = useMemo(() => {
    if (!activeMonth || !Array.isArray(costSheets)) return null;
    return costSheets.find(r => r.month === activeMonth) || null;
  }, [activeMonth, costSheets]);

  const rows = useMemo(() => activeDocument?.rows || [], [activeDocument]);

  const filteredSummaryRows = useMemo(() => {
    if (!summarySearch.trim()) return rows;
    const searchLower = summarySearch.toLowerCase();
    return rows.filter(
      row =>
        (row.partName || "").toLowerCase().includes(searchLower) ||
        (row.partNumber || "").toLowerCase().includes(searchLower) ||
        (row.materialName || "").toLowerCase().includes(searchLower)
    );
  }, [rows, summarySearch]);

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
      ...customCols.filter(c => c.hasCycleTime || c.hasTooling).map(c => ({
        key: c.key,
        name: c.name,
        defaultRate: 0,
        isStatic: false,
        hasMetadata: !!c.hasMetadata,
        hasTooling: !!c.hasTooling,
        hasCycleTime: !!c.hasCycleTime,
        isSpecialMetrology: false,
        isSpecialPacking: false,
        dbMachine: ""
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

  // Manual Rates overrides (populated from DB/defaults)
  const columnRates = useMemo(() => {
    const initialRates: Record<string, string> = {
      foundry_conversion_rate: "110"
    };

    allProcesses.forEach(proc => {
      if (proc.isStatic) {
        const dbRate = machineSecRates[proc.dbMachine.toLowerCase().trim()];
        initialRates[proc.key] = dbRate ? dbRate.toFixed(4) : proc.defaultRate.toFixed(4);
      } else {
        initialRates[proc.key] = "0.0000";
      }
    });

    if (activeDocument && activeDocument.rows && activeDocument.rows.length > 0) {
      const firstRow = activeDocument.rows[0];
      if (firstRow.values.foundry_conversion_rate) {
        initialRates.foundry_conversion_rate = firstRow.values.foundry_conversion_rate;
      }
      allProcesses.forEach(proc => {
        const rateKey = `${proc.key}_rate_sec`;
        if (firstRow.values[rateKey]) {
          initialRates[proc.key] = firstRow.values[rateKey];
        }
      });
    }

    return initialRates;
  }, [activeDocument, machineSecRates, allProcesses]);

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
            const customIncludes = (!(proc as any).isStatic && (proc as any).customIncludes) || [];
            customIncludes.forEach((ci: any) => {
              if (ci.checked) {
                visitVars[ci.key] = parseFloat(vals[`${proc.key}_custom_${ci.key}`]) || 0;
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
        const customIncludes2 = (!(proc as any).isStatic && (proc as any).customIncludes) || [];
        customIncludes2.forEach((ci: any) => {
          if (ci.checked) {
            visitVars[ci.key] = parseFloat(vals[`${proc.key}_custom_${ci.key}`]) || 0;
          }
        });
        cost = evaluateFormula(formulaStr, visitVars);
      }

      evaluatedProcesses[proc.key] = cost;
      processCostsSum += cost;
      vars[proc.key] = cost; // Add individual process cost as a variable

      const ciList = (!(proc as any).isStatic && (proc as any).customIncludes) || [];
      ciList.forEach((ci: any) => {
        if (ci.checked) {
          vars[`${proc.key}_custom_${ci.key}`] = parseFloat(vals[`${proc.key}_custom_${ci.key}`]) || 0;
          vars[ci.key] = parseFloat(vals[`${proc.key}_custom_${ci.key}`]) || 0;
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

    let rejectionFormula = vals.rejection_cost_scrap_formula || "[subtotal_cost_rm] * 0.05";
    if (rejectionFormula === "[subtotal_cost_scrap] * 0.05") {
      rejectionFormula = "[subtotal_cost_rm] * 0.05";
    }
    const rejectionScrap = evaluateFormula(rejectionFormula, vars);
    vars.rejection_cost_scrap = rejectionScrap;

    const overheads = evaluateFormula(
      vals.overheads_rm_formula || "[subtotal_cost_rm] * 0.18",
      vars
    );
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

  const exportToExcel = () => {
    if (!activeDocument || rows.length === 0) return;

    const headerRow = [
      "SL NO",
      "Part Name",
      "Part Number",
      "Material Name",
      "Manufacturing Cost per Component (Origin Raw Material)",
      "Manufacturing Cost per Component (Scrap)",
      "Selling cost per Component",
      "Profit in Rs",
      "Profit in %"
    ];

    const dataRows = rows.map((row, index) => {
      const calcs = calculateRowFields(row);
      const vals = row.values || {};
      const sellingPriceVal = parseFloat(vals.selling_price) || 0;
      const isSellingPriceSet = sellingPriceVal > 0;

      return [
        index + 1,
        row.partName,
        row.partNumber,
        row.materialName,
        calcs.grandTotalRaw,
        calcs.grandTotalScrap,
        isSellingPriceSet ? sellingPriceVal : "#N/A",
        isSellingPriceSet ? calcs.profitRs : "#N/A",
        isSellingPriceSet ? `${calcs.profitPercent.toFixed(2)}%` : "0.00%"
      ];
    });

    const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Part No Wise Cost Sheet");

    const todayStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `Part_No_Wise_Cost_Sheet_${activeMonth}_${todayStr}.xlsx`);
    toast.success("Excel exported successfully!");
  };

  const exportToPDF = () => {
    if (!activeDocument || rows.length === 0) return;

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4"
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("PERFECT ALLOY COMPONENTS (P) LTD., SHIMOGA", 15, 15);
    doc.setFontSize(12);
    doc.text(`PART NO. WISE COST SHEET - ${formatMonthLabel(activeMonth)}`, 15, 22);

    const tableHeaders = [
      "SL NO", "Part Name", "Part Number", "Material Name", "Mfg Cost (Origin RM)", "Mfg Cost (Scrap)", "Selling Cost", "Profit (Rs)", "Profit (%)"
    ];

    const tableRows = rows.map((row, index) => {
      const calcs = calculateRowFields(row);
      const vals = row.values || {};
      const sellingPriceVal = parseFloat(vals.selling_price) || 0;
      const isSellingPriceSet = sellingPriceVal > 0;

      return [
        (index + 1).toString(),
        row.partName,
        row.partNumber,
        row.materialName,
        calcs.grandTotalRaw.toFixed(2),
        calcs.grandTotalScrap.toFixed(2),
        isSellingPriceSet ? sellingPriceVal.toFixed(2) : "#N/A",
        isSellingPriceSet ? calcs.profitRs.toFixed(2) : "#N/A",
        isSellingPriceSet ? `${calcs.profitPercent.toFixed(2)}%` : "0.00%"
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
    doc.save(`Part_No_Wise_Cost_Sheet_${activeMonth}_${todayStr}.pdf`);
    toast.success("PDF exported successfully!");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
        <div className="max-w-xl">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Part no. wise cost sheet
          </h1>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Read-only summary of the cost sheet extracted from the final cost sheet.
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
                      disabled={loading}
                      className="h-8 px-2 rounded-lg bg-background border border-input text-foreground hover:text-foreground font-bold shadow-sm focus:ring-1 focus:ring-primary outline-none cursor-pointer transition-all hover:bg-muted/10 text-xs min-w-[120px] flex items-between justify-between gap-1.5"
                    >
                      <span>{formatMonthLabel(activeMonth)}</span>
                      <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-[180px] bg-background border shadow-xl rounded-xl p-1 max-h-60 overflow-y-auto">
                    <div className="flex flex-col gap-0.5">
                      {costSheets.map((r) => {
                        const isActive = r.month === activeMonth;
                        return (
                          <div
                            key={r.month}
                            className={cn(
                              "flex items-center justify-between text-[11px] py-1.5 px-2.5 rounded-lg cursor-pointer transition-all font-semibold select-none",
                              isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted/60 text-foreground"
                            )}
                            onClick={() => {
                              setActiveMonth(r.month);
                              setShowMonthDropdown(false);
                            }}
                          >
                            <span>{formatMonthLabel(r.month)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
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

      {/* Summary Card */}
      <Card className="border-none shadow-2xl bg-card/60 backdrop-blur-md overflow-hidden rounded-2xl">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-extrabold text-foreground flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-500" />
                Cost List Summary
              </h2>
              <p className="text-muted-foreground text-xs mt-0.5">
                A read-only view of the cost sheet columns.
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Input
                placeholder="Search summary parts..."
                value={summarySearch}
                onChange={(e) => setSummarySearch(e.target.value)}
                className="h-9 w-64 text-xs bg-background/50 border-input rounded-xl"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-xs">
              No cost sheet data loaded.
            </div>
          ) : (
            <div className="overflow-x-auto max-w-full custom-scrollbar rounded-xl border border-slate-200 dark:border-slate-800">
              <Table className="border-separate border-spacing-0 w-full min-w-full">
                <TableHeader>
                  <TableRow className="bg-[#9bc2e6]/25 dark:bg-[#9bc2e6]/10 text-slate-800 dark:text-slate-200 text-[10px] font-bold">
                    <TableHead className="text-center font-bold text-xs border-r border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 py-3 w-16 bg-[#9bc2e6]/20 dark:bg-[#9bc2e6]/5">
                      SL NO
                    </TableHead>
                    <TableHead className="text-left font-bold text-xs border-r border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 py-3 bg-[#9bc2e6]/20 dark:bg-[#9bc2e6]/5">
                      Part Name
                    </TableHead>
                    <TableHead className="text-left font-bold text-xs border-r border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 py-3 bg-[#9bc2e6]/20 dark:bg-[#9bc2e6]/5">
                      Part Number
                    </TableHead>
                    <TableHead className="text-left font-bold text-xs border-r border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 py-3 bg-[#9bc2e6]/20 dark:bg-[#9bc2e6]/5">
                      Material Name
                    </TableHead>
                    <TableHead className="text-right font-bold text-xs border-r border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 py-3 whitespace-normal leading-tight max-w-[200px] bg-[#9bc2e6]/20 dark:bg-[#9bc2e6]/5">
                      Manufacturing Cost per Component (Origin Raw Material)
                    </TableHead>
                    <TableHead className="text-right font-bold text-xs border-r border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 py-3 whitespace-normal leading-tight max-w-[200px] bg-[#9bc2e6]/20 dark:bg-[#9bc2e6]/5">
                      Manufacturing Cost per Component (Scrap)
                    </TableHead>
                    <TableHead className="text-right font-bold text-xs border-r border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 py-3 whitespace-normal leading-tight bg-[#9bc2e6]/20 dark:bg-[#9bc2e6]/5">
                      Selling cost per Component
                    </TableHead>
                    <TableHead className="text-right font-bold text-xs border-r border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 py-3 whitespace-normal leading-tight bg-[#9bc2e6]/20 dark:bg-[#9bc2e6]/5">
                      Profit in Rs
                    </TableHead>
                    <TableHead className="text-right font-bold text-xs border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 py-3 bg-[#9bc2e6]/20 dark:bg-[#9bc2e6]/5">
                      Profit in %
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSummaryRows.map((row, index) => {
                    const calcs = calculateRowFields(row);
                    const vals = row.values || {};
                    const sellingPriceVal = parseFloat(vals.selling_price) || 0;
                    
                    const isSellingPriceSet = sellingPriceVal > 0;
                    const originalIndex = rows.indexOf(row) + 1;

                    return (
                      <TableRow 
                        key={row._id || index} 
                        className="hover:bg-muted/10 border-b border-slate-200 dark:border-slate-800 transition-colors duration-150"
                      >
                        <TableCell className="p-3 border-r border-slate-200 dark:border-slate-800 text-center font-semibold text-xs font-mono text-muted-foreground">
                          {originalIndex}
                        </TableCell>
                        <TableCell className="p-3 border-r border-slate-200 dark:border-slate-800 font-bold text-xs text-foreground uppercase">
                          {row.partName}
                        </TableCell>
                        <TableCell className="p-3 border-r border-slate-200 dark:border-slate-800 font-mono text-xs text-foreground">
                          {row.partNumber}
                        </TableCell>
                        <TableCell className="p-3 border-r border-slate-200 dark:border-slate-800 text-xs font-semibold text-muted-foreground uppercase">
                          {row.materialName}
                        </TableCell>
                        <TableCell className="p-3 border-r border-slate-200 dark:border-slate-800 text-right font-mono font-bold text-foreground">
                          {calcs.grandTotalRaw.toFixed(2)}
                        </TableCell>
                        <TableCell className="p-3 border-r border-slate-200 dark:border-slate-800 text-right font-mono font-bold text-foreground">
                          {calcs.grandTotalScrap.toFixed(2)}
                        </TableCell>
                        <TableCell className="p-3 border-r border-slate-200 dark:border-slate-800 text-right font-mono font-bold text-foreground">
                          {isSellingPriceSet ? sellingPriceVal.toFixed(2) : "#N/A"}
                        </TableCell>
                        <TableCell 
                          className={cn(
                            "p-3 border-r border-slate-200 dark:border-slate-800 text-right font-mono font-bold",
                            isSellingPriceSet 
                              ? (calcs.profitRs >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500")
                              : "text-muted-foreground"
                          )}
                        >
                          {isSellingPriceSet ? calcs.profitRs.toFixed(2) : "#N/A"}
                        </TableCell>
                        <TableCell 
                          className={cn(
                            "p-3 text-right font-mono font-bold",
                            isSellingPriceSet 
                              ? (calcs.profitPercent >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500")
                              : "text-muted-foreground"
                          )}
                        >
                          {isSellingPriceSet ? `${calcs.profitPercent.toFixed(2)}%` : "0.00%"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
