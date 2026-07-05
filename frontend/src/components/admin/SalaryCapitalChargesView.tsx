"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/src/context/AuthContext";
import { DashboardLayout } from "@/src/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { 
  Calculator, 
  Plus, 
  Trash2, 
  Loader2, 
  Settings2, 
  HelpCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Info,
  Edit2,
  Check,
  X,
  Zap,
  Download,
  FileSpreadsheet,
  FileText,
  ChevronDown
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { API_URL } from "@/src/lib/api";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Column {
  _id?: string;
  key: string;
  name: string;
  type: "manual" | "formula";
  formula: string;
  meta: string;
}

interface Row {
  _id?: string;
  designation: string; // Mapping name as 'designation' for 100% component compatibility
  values: Record<string, string>;
  assignedUsers?: any[];
}

export default function SalaryCapitalChargesView() {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<"operators" | "equipments">("operators");
  const [columns, setColumns] = useState<Column[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "waiting" | "saving" | "saved" | "error">("idle");
  const isInitialLoad = useRef(true);

  // Universal Power Value states (used in equipments tab)
  const [universalPowerValue, setUniversalPowerValue] = useState("8");
  const [isEditingPowerVal, setIsEditingPowerVal] = useState(false);
  const [powerValBackup, setPowerValBackup] = useState("8");
  const [savingPowerVal, setSavingPowerVal] = useState(false);

  // Row adding modal state
  const [rowModalOpen, setRowModalOpen] = useState(false);
  const [newDesignation, setNewDesignation] = useState("");
  const [newRowManualValues, setNewRowManualValues] = useState<Record<string, string>>({});

  // Row inline editing state
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [backupRow, setBackupRow] = useState<Row | null>(null);

  // Confirmation Modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmDescription, setConfirmDescription] = useState("");
  const [confirmButtonText, setConfirmButtonText] = useState("Confirm");
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});

  // Column editing modal state
  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<Column | null>(null);
  const [colName, setColName] = useState("");
  const [colType, setColType] = useState<"manual" | "formula">("manual");
  const [colFormula, setColFormula] = useState("");
  const [colMeta, setColMeta] = useState("");
  const [activeColumnActionsKey, setActiveColumnActionsKey] = useState<string | null>(null);

  interface User {
    _id: string;
    name: string;
    email: string;
  }
  const [users, setUsers] = useState<User[]>([]);
  const [newRowAssignedUsers, setNewRowAssignedUsers] = useState<string[]>([]);

  const isSuperAdmin = currentUser?.role === "super-admin";
  const isOperators = activeTab === "operators";

  const config = {
    title: isOperators ? "Operators Salary Configuration" : "CNC VMC & Metrology Equipment Investment",
    description: isOperators 
      ? "Configure salary formulas, allowances, deductions, and designations in an interactive grid."
      : "Configure machine costs, depreciation rates, interest rates, and equipment models in an interactive grid.",
    addButtonLabel: isOperators ? "Add Designation" : "Add Machine",
    rowLabel: isOperators ? "Designation / Role Name" : "Machine / Equipment Name",
    rowPlaceholder: isOperators ? "e.g. Lead Operator, Technician" : "e.g. Grinding CLG 5020, Drilling",
    addDialogTitle: isOperators ? "Add New Designation" : "Add New Machine",
    addDialogDesc: isOperators 
      ? "Enter the designation name and starting values for this role."
      : "Enter the machine name and starting values for this model.",
    deleteTitle: isOperators ? "Delete Designation Row" : "Delete Machine Row",
    deleteDesc: (name: string) => isOperators 
      ? `Are you sure you want to delete the designation "${name}"? This action is permanent and all calculations will be deleted.`
      : `Are you sure you want to delete the machine "${name}"? This action is permanent and all calculations will be deleted.`,
    editWarningTitle: isOperators ? "Save Designation Changes" : "Save Machine Changes",
    editWarningDesc: (name: string) => `Are you sure you want to save the changes for "${name}"?`,
    editRowTooltip: isOperators ? "Edit Designation" : "Edit Machine",
    deleteRowTooltip: isOperators ? "Delete Designation" : "Delete Machine",
  };

  const fetchTableData = async () => {
    setLoading(true);
    try {
      const endpoint = isOperators ? "/api/operator-table" : "/api/equipment-table";
      const response = await fetch(`${API_URL}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${currentUser?.token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        isInitialLoad.current = true;
        setColumns(data.columns || []);
        // Mongo returns map, convert row values to plain objects if they are Map
        const formattedRows = (data.rows || []).map((row: any) => {
          const vals: Record<string, string> = {};
          if (row.values) {
            Object.keys(row.values).forEach((k) => {
              vals[k] = String(row.values[k] ?? "0");
            });
          }
          return {
            _id: row._id,
            designation: row.designation,
            values: vals,
            assignedUsers: row.assignedUsers || []
          };
        });
        setRows(formattedRows);

        // Fetch users
        const usersResponse = await fetch(`${API_URL}/api/users`, {
          headers: {
            Authorization: `Bearer ${currentUser?.token}`,
          },
        });
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setUsers(usersData.filter((u: any) => u.role !== "super-admin"));
        }

        if (!isOperators) {
          // Fetch system settings
          const settingsResponse = await fetch(`${API_URL}/api/system-settings`, {
            headers: {
              Authorization: `Bearer ${currentUser?.token}`,
            },
          });
          if (settingsResponse.ok) {
            const settingsData = await settingsResponse.json();
            if (settingsData.power_universal_value) {
              setUniversalPowerValue(settingsData.power_universal_value);
            }
          }
        }
      } else {
        toast.error(data.message || `Failed to fetch ${activeTab} configurations`);
      }
    } catch (error) {
      console.error(`Error fetching ${activeTab} data:`, error);
      toast.error("An error occurred while loading the table");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePowerVal = async () => {
    setSavingPowerVal(true);
    try {
      const res = await fetch(`${API_URL}/api/system-settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentUser?.token}`,
        },
        body: JSON.stringify({
          key: "power_universal_value",
          value: universalPowerValue,
        }),
      });

      if (res.ok) {
        toast.success("Universal Power Value updated successfully");
        setIsEditingPowerVal(false);
      } else {
        const data = await res.json();
        toast.error(data.message || "Failed to update power value");
      }
    } catch (err) {
      console.error("Error saving power value:", err);
      toast.error("An error occurred. Please try again.");
    } finally {
      setSavingPowerVal(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchTableData();
    }
  }, [currentUser, activeTab]);

  // Evaluates formula columns in topological dependency order (iterative evaluation)
  const evaluatedRows = useMemo(() => {
    return rows.map((row) => {
      const resolved: Record<string, number> = {};

      // Initialize manual fields
      columns.forEach((col) => {
        if (col.type === "manual" && col.key !== "designation") {
          resolved[col.key] = parseFloat(row.values[col.key] || "0") || 0;
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

          // Find variable references like [basic] or [mc_cost]
          const matches = col.formula.match(/\[([^\]]+)\]/g) || [];
          const allResolved = matches.every((match) => {
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
          finalVals[col.key] = row.values[col.key] || "0";
        }
      });

      return {
        ...row,
        values: finalVals,
      };
    });
  }, [rows, columns]);

  // Handle cell value change
  const handleCellChange = (rowIndex: number, colKey: string, newValue: string) => {
    const updatedRows = [...rows];
    if (colKey === "designation") {
      updatedRows[rowIndex].designation = newValue;
    } else {
      updatedRows[rowIndex].values = {
        ...updatedRows[rowIndex].values,
        [colKey]: newValue,
      };
    }
    setRows(updatedRows);
  };

  // Open row creation modal
  const handleOpenRowModal = () => {
    setNewDesignation("");
    setNewRowAssignedUsers([]);
    const initialVals: Record<string, string> = {};
    columns.forEach((col) => {
      if (col.type === "manual" && col.key !== "designation") {
        initialVals[col.key] = "0";
      }
    });
    setNewRowManualValues(initialVals);
    setNewRowAssignedUsers([]);
    setRowModalOpen(true);
  };

  // Add new designation/machine row
  const handleAddRow = () => {
    if (!newDesignation.trim()) {
      toast.error(`${isOperators ? "Designation" : "Machine"} name is required`);
      return;
    }

    if (rows.some((r) => r.designation.toLowerCase() === newDesignation.trim().toLowerCase())) {
      toast.error(`A ${isOperators ? "designation" : "machine"} with this name already exists`);
      return;
    }

    const defaultVals: Record<string, string> = {};
    columns.forEach((col) => {
      if (col.key !== "designation") {
        defaultVals[col.key] = col.type === "manual" 
          ? (newRowManualValues[col.key] || "0")
          : "0";
      }
    });

    const newRow: Row = {
      designation: newDesignation.trim(),
      values: defaultVals,
      assignedUsers: !isOperators ? users.filter(u => newRowAssignedUsers.includes(u._id)) : []
    };
    
    setRows([...rows, newRow]);
    setRowModalOpen(false);
    toast.success(`Added ${isOperators ? "designation" : "machine"} "${newDesignation.trim()}"`);
  };

  // Confirmation request helper
  const requestConfirmation = (title: string, description: string, buttonText: string, action: () => void) => {
    setConfirmTitle(title);
    setConfirmDescription(description);
    setConfirmButtonText(buttonText);
    setConfirmAction(() => action);
    setConfirmOpen(true);
  };

  // Start inline row editing
  const handleStartEditRow = (rowIndex: number) => {
    setEditingRowIndex(rowIndex);
    setBackupRow(JSON.parse(JSON.stringify(rows[rowIndex]))); // deep copy backup
  };

  // Cancel inline row editing (revert to backup)
  const handleCancelEditRow = (rowIndex: number) => {
    if (backupRow) {
      const updatedRows = [...rows];
      updatedRows[rowIndex] = backupRow;
      setRows(updatedRows);
    }
    setEditingRowIndex(null);
    setBackupRow(null);
    toast.info("Editing cancelled. Changes reverted.");
  };

  const handleToggleRowUser = (rowIndex: number, userObj: any) => {
    const updatedRows = [...rows];
    const currentRow = updatedRows[rowIndex];
    
    let currentAssigned = currentRow.assignedUsers || [];
    const exists = currentAssigned.some((u: any) => String(u._id || u) === String(userObj._id));
    
    if (exists) {
      currentAssigned = currentAssigned.filter((u: any) => String(u._id || u) !== String(userObj._id));
    } else {
      currentAssigned = [...currentAssigned, userObj];
    }
    
    currentRow.assignedUsers = currentAssigned;
    setRows(updatedRows);
  };

  // Save inline row edit changes (with confirmation warning)
  const handleSaveRowInline = (rowIndex: number) => {
    const row = rows[rowIndex];
    if (!row.designation.trim()) {
      toast.error(`${isOperators ? "Designation" : "Machine"} name is required`);
      return;
    }

    const exists = rows.some((r, i) => i !== rowIndex && r.designation.toLowerCase() === row.designation.trim().toLowerCase());
    if (exists) {
      toast.error(`A ${isOperators ? "designation" : "machine"} with this name already exists`);
      return;
    }

    requestConfirmation(
      config.editWarningTitle,
      config.editWarningDesc(row.designation.trim()),
      "Save",
      () => {
        const updatedRows = [...rows];
        updatedRows[rowIndex].designation = row.designation.trim();
        setRows(updatedRows);
        setEditingRowIndex(null);
        setBackupRow(null);
        toast.success(`${isOperators ? "Designation" : "Machine"} "${row.designation.trim()}" updated`);
      }
    );
  };

  // Delete designation/machine row
  const handleDeleteRow = (index: number) => {
    requestConfirmation(
      config.deleteTitle,
      config.deleteDesc(rows[index].designation),
      "Delete Row",
      () => {
        if (editingRowIndex === index) {
          setEditingRowIndex(null);
          setBackupRow(null);
        } else if (editingRowIndex !== null && editingRowIndex > index) {
          setEditingRowIndex(editingRowIndex - 1);
        }
        const newRows = rows.filter((_, i) => i !== index);
        setRows(newRows);
        toast.info(`${isOperators ? "Designation" : "Machine"} row removed.`);
      }
    );
  };

  // Open add/edit column modal
  const handleOpenColumnModal = (col: Column | null = null) => {
    if (col) {
      setEditingColumn(col);
      setColName(col.name);
      setColType(col.type);
      setColFormula(col.formula);
      setColMeta(col.meta);
    } else {
      setEditingColumn(null);
      setColName("");
      setColType("manual");
      setColFormula("");
      setColMeta("");
    }
    setColumnModalOpen(true);
  };

  // Save Column Definition
  const handleSaveColumn = () => {
    if (!colName.trim()) {
      toast.error("Column Name is required");
      return;
    }

    if (editingColumn) {
      const updatedCols = columns.map((col) => {
        if (col.key === editingColumn.key) {
          return {
            ...col,
            name: colName,
            type: colType,
            formula: colType === "formula" ? colFormula : "",
            meta: colMeta,
          };
        }
        return col;
      });
      setColumns(updatedCols);
      toast.success(`Column "${colName}" updated`);
    } else {
      const newKey = colName.trim().toLowerCase().replace(/[^a-z0-9]/g, "_");
      
      if (columns.some((col) => col.key === newKey || newKey === "designation")) {
        toast.error("A column with a similar name already exists");
        return;
      }

      const newCol: Column = {
        key: newKey,
        name: colName,
        type: colType,
        formula: colType === "formula" ? colFormula : "",
        meta: colMeta,
      };

      setColumns([...columns, newCol]);

      const updatedRows = rows.map((row) => ({
        ...row,
        values: {
          ...row.values,
          [newKey]: "0",
        },
      }));
      setRows(updatedRows);
      toast.success(`Column "${colName}" created successfully`);
    }
    setColumnModalOpen(false);
  };

  // Save Column Definition WITH confirmation warning
  const handleSaveColumnWithConfirm = () => {
    if (editingColumn) {
      requestConfirmation(
        "Update Column Configuration",
        `Are you sure you want to update the column "${colName}"? This will modify the calculations or data formats of this column across all rows.`,
        "Update Column",
        () => handleSaveColumn()
      );
    } else {
      handleSaveColumn();
    }
  };

  // Delete Column
  const handleDeleteColumn = (colKey: string) => {
    if (colKey === "designation") {
      toast.error(`Cannot delete ${isOperators ? "Designation" : "Machine"} column`);
      return;
    }

    requestConfirmation(
      "Delete Column",
      `Are you sure you want to delete the column "${columns.find(c => c.key === colKey)?.name}"? Any calculated formulas referencing this column key "[${colKey}]" will fail.`,
      "Delete Column",
      () => {
        const updatedCols = columns.filter((col) => col.key !== colKey);
        setColumns(updatedCols);

        const updatedRows = rows.map((row) => {
          const newVals = { ...row.values };
          delete newVals[colKey];
          return {
            ...row,
            values: newVals,
          };
        });
        setRows(updatedRows);
        toast.info("Column deleted.");
      }
    );
  };

  // Move Column Left/Right
  const moveColumn = (index: number, direction: "left" | "right") => {
    if (index <= 0) return; // Ignore designation
    const newIndex = direction === "left" ? index - 1 : index + 1;
    if (newIndex <= 0 || newIndex >= columns.length) return;

    const updatedCols = [...columns];
    const temp = updatedCols[index];
    updatedCols[index] = updatedCols[newIndex];
    updatedCols[newIndex] = temp;
    setColumns(updatedCols);
  };

  // Handle Tab Switch (set isInitialLoad to true to prevent auto-saves on mounting)
  const handleTabChange = (val: "operators" | "equipments") => {
    if (val === activeTab) return;
    setEditingRowIndex(null);
    setBackupRow(null);
    setIsEditingPowerVal(false);
    isInitialLoad.current = true;
    setActiveTab(val);
  };

  const exportToExcel = () => {
    if (evaluatedRows.length === 0 || columns.length === 0) return;

    const rowNameHeader = isOperators ? "Designation" : "Machine";
    const headers = ["Sl No", rowNameHeader, ...columns.filter(c => c.key !== "designation").map(c => c.name)];
    
    const dataRows = evaluatedRows.map((row, index) => {
      const rowData: any[] = [index + 1, row.designation];
      columns.forEach(col => {
        if (col.key !== "designation") {
          const val = row.values[col.key] || "0";
          rowData.push(parseFloat(val) ? parseFloat(val) : val);
        }
      });
      return rowData;
    });

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, isOperators ? "Operators" : "Equipments");

    const todayStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `Salary_Capital_Charges_${activeTab}_${todayStr}.xlsx`);
    toast.success("Excel exported successfully!");
  };

  const exportToPDF = () => {
    if (evaluatedRows.length === 0 || columns.length === 0) return;

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4"
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("PERFECT ALLOY COMPONENTS (P) LTD., SHIMOGA", 15, 15);
    doc.setFontSize(12);
    doc.text(isOperators ? "OPERATORS SALARY CONFIGURATION" : "CNC VMC & METROLOGY EQUIPMENT INVESTMENT", 15, 22);

    const rowNameHeader = isOperators ? "Designation" : "Machine";
    const headers = ["Sl No", rowNameHeader, ...columns.filter(c => c.key !== "designation").map(c => c.name)];
    
    const tableRows = evaluatedRows.map((row, index) => {
      const rowData = [(index + 1).toString(), row.designation];
      columns.forEach(col => {
        if (col.key !== "designation") {
          const val = row.values[col.key] || "0";
          rowData.push(parseFloat(val) ? parseFloat(val).toFixed(2) : val);
        }
      });
      return rowData;
    });

    autoTable(doc, {
      head: [headers],
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
    doc.save(`Salary_Capital_Charges_${activeTab}_${todayStr}.pdf`);
    toast.success("PDF exported successfully!");
  };

  // Debounced Auto-Save Effect
  useEffect(() => {
    if (loading || columns.length === 0) return;

    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }

    setSaveStatus("waiting");

    const timer = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        const endpoint = isOperators ? "/api/operator-table" : "/api/equipment-table";
        const response = await fetch(`${API_URL}${endpoint}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentUser?.token}`,
          },
          body: JSON.stringify({ columns, rows }),
        });

        if (response.ok) {
          setSaveStatus("saved");
          const data = await response.json();
          // Update rows from populated response
          if (data && Array.isArray(data.rows)) {
            const formattedRows = data.rows.map((row: any) => {
              const vals: Record<string, string> = {};
              if (row.values) {
                Object.keys(row.values).forEach((k) => {
                  vals[k] = String(row.values[k] ?? "0");
                });
              }
              return {
                _id: row._id,
                designation: row.designation,
                values: vals,
                assignedUsers: row.assignedUsers || []
              };
            });
            setRows(formattedRows);
          }
          setTimeout(() => {
            setSaveStatus((prev) => (prev === "saved" ? "idle" : prev));
          }, 3000);
        } else {
          setSaveStatus("error");
          const errorData = await response.json();
          toast.error(errorData.message || "Auto-save failed");
        }
      } catch (error) {
        console.error("Auto-save error:", error);
        setSaveStatus("error");
        toast.error("Auto-save failed");
      }
    }, 1500); // 1.5 seconds debounce

    return () => clearTimeout(timer);
  }, [columns, rows, loading, currentUser, activeTab, isOperators]);

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Calculator className="h-5.5 w-5.5 text-primary" />
            Salary & Capital Charges
          </h1>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Configure payroll parameters and capital investment tables using an interactive spreadsheet layout.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Tab Selector Dropdown in premium inline button style */}
          <Select value={activeTab} onValueChange={handleTabChange}>
            <SelectTrigger className="h-8 w-fit gap-2 bg-card border border-muted hover:bg-muted/15 font-bold shadow-sm focus:ring-1 focus:ring-primary rounded-xl px-3 text-xs select-none">
              <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider select-none shrink-0">Select Sheet:</span>
              <span className="text-foreground font-extrabold text-xs select-none mr-1">
                <SelectValue placeholder="Select Sheet" />
              </span>
            </SelectTrigger>
            <SelectContent className="bg-popover border shadow-lg rounded-lg">
              <SelectItem value="operators" className="text-xs font-semibold">Operators</SelectItem>
              <SelectItem value="equipments" className="text-xs font-semibold">Equipments</SelectItem>
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-8 px-3 font-bold border-muted-foreground/20 hover:bg-primary/5 transition-colors gap-2 text-xs">
                <Download className="h-3.5 w-3.5" /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px]">
              <DropdownMenuItem onClick={exportToPDF} className="cursor-pointer gap-2 text-xs">
                <FileText className="h-4 w-4 text-primary" />
                <span>Download as PDF</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToExcel} className="cursor-pointer gap-2 text-xs">
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                <span>Download as Excel</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {isSuperAdmin && (
            <>
              <Button
                onClick={handleOpenRowModal}
                variant="outline"
                className="h-8 px-3 hover:bg-primary/5 text-xs font-semibold gap-1.5"
              >
                <Plus className="h-3.5 w-3.5 text-primary" />
                {config.addButtonLabel}
              </Button>

              <Button
                onClick={() => handleOpenColumnModal()}
                variant="outline"
                className="h-8 px-3 hover:bg-primary/5 text-xs font-semibold gap-1.5"
              >
                <Plus className="h-3.5 w-3.5 text-primary" />
                Add Column
              </Button>
            </>
          )}
          {!isSuperAdmin && (
            <div className="flex items-center gap-1.5 bg-muted/60 border border-muted px-3 py-1.5 rounded-md text-[10px] font-semibold text-muted-foreground">
              <Info className="h-3.5 w-3.5 text-primary" />
              <span>Assigned rows can be edited inline. Other rows are read-only.</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid Card */}
      <Card className="border-none shadow-2xl bg-card/60 backdrop-blur-md overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-72 items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : columns.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground space-y-4">
              <AlertTriangle className="h-12 w-12 text-warning" />
              <p className="text-lg font-semibold">No Table Config Found</p>
              <Button onClick={fetchTableData}>Load Default Config</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="border-separate border-spacing-0">
                <TableHeader className="bg-muted/30">
                  {/* Primary Header Row */}
                  <TableRow className="border-b hover:bg-transparent">
                    <TableHead className="py-2.5 px-2 text-xs font-extrabold tracking-wider w-[64px] min-w-[64px] max-w-[64px] text-center border-r border-b sticky left-0 z-30 bg-background">
                      Sl No
                    </TableHead>
                    {columns.map((col, index) => {
                      const isDesignation = col.key === "designation";
                      const showActions = isSuperAdmin && !isDesignation;
                      const isFormula = col.type === "formula";

                      const headerCell = (
                        <TableHead 
                          key={col.key} 
                          onDoubleClick={() => {
                            if (showActions) {
                              setActiveColumnActionsKey(col.key);
                            }
                          }}
                          className={cn(
                            "py-2.5 px-4 text-xs font-extrabold tracking-wider border-r border-b relative text-foreground select-none cursor-default",
                            isDesignation 
                              ? "w-[180px] min-w-[180px] max-w-[180px] sticky left-[64px] z-30 bg-background" 
                              : "min-w-[120px]",
                            showActions && "hover:bg-muted/10 cursor-pointer transition-colors",
                            isFormula && "cursor-help bg-primary/5"
                          )}
                          title={
                            isFormula 
                              ? `Formula: ${col.formula}${showActions ? " (Double-click to configure)" : ""}`
                              : (showActions ? "Double-click to configure column" : undefined)
                          }
                        >
                          <span className="truncate font-bold" title={col.name}>{isDesignation && !isOperators ? "Machine" : col.name}</span>
                        </TableHead>
                      );

                      if (showActions) {
                        return (
                          <Popover 
                            key={col.key}
                            open={activeColumnActionsKey === col.key} 
                            onOpenChange={(open) => {
                              if (!open) setActiveColumnActionsKey(null);
                            }}
                          >
                            <PopoverTrigger asChild>
                              {headerCell}
                            </PopoverTrigger>
                            <PopoverContent className="w-fit p-1 bg-popover border shadow-lg rounded-lg" side="top" align="center">
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    handleOpenColumnModal(col);
                                    setActiveColumnActionsKey(null);
                                  }}
                                  className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
                                  title="Edit Column & Formula"
                                >
                                  <Settings2 className="h-4 w-4" />
                                </Button>
                                {index > 1 && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      moveColumn(index, "left");
                                      setActiveColumnActionsKey(null);
                                    }}
                                    className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
                                    title="Move Left"
                                  >
                                    <ArrowLeft className="h-4 w-4" />
                                  </Button>
                                )}
                                {index < columns.length - 1 && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      moveColumn(index, "right");
                                      setActiveColumnActionsKey(null);
                                    }}
                                    className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
                                    title="Move Right"
                                  >
                                    <ArrowRight className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    handleDeleteColumn(col.key);
                                    setActiveColumnActionsKey(null);
                                  }}
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
                                  title="Delete Column"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        );
                      }

                      return headerCell;
                    })}
                    {(isSuperAdmin || rows.some(r => r.assignedUsers?.some((au: any) => String(au._id || au) === String(currentUser?._id)))) && (
                      <TableHead className="py-2.5 px-4 text-xs font-bold tracking-wider w-20 text-center border-b">
                        Actions
                      </TableHead>
                    )}
                  </TableRow>

                  {/* Secondary Meta Row */}
                  <TableRow className="hover:bg-transparent h-8">
                    <TableHead className="py-0.5 px-2 text-center border-r border-b font-mono text-xs text-muted-foreground bg-background sticky left-0 z-30 w-[64px] min-w-[64px] max-w-[64px]">
                      -
                    </TableHead>
                    {columns.map((col) => {
                      const isDesignation = col.key === "designation";
                      return (
                        <TableHead 
                          key={`meta-${col.key}`} 
                          className={cn(
                            "py-0.5 px-4 text-left border-r border-b font-mono text-[10px] font-bold text-primary/80 uppercase tracking-wider bg-muted/5",
                            isDesignation && "sticky left-[64px] z-30 bg-background w-[180px] min-w-[180px] max-w-[180px]"
                          )}
                        >
                          {col.meta || <span className="opacity-0">-</span>}
                        </TableHead>
                      );
                    })}
                    {(isSuperAdmin || rows.some(r => r.assignedUsers?.some((au: any) => String(au._id || au) === String(currentUser?._id)))) && (
                      <TableHead className="py-0.5 px-4 text-center bg-muted/5 border-b">
                        -
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {evaluatedRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={columns.length + (isSuperAdmin ? 2 : 1)} className="h-32 text-center text-muted-foreground font-medium border-b text-xs">
                        No {isOperators ? "designations" : "machines"} added yet. Add a row below.
                      </TableCell>
                    </TableRow>
                  ) : (
                    evaluatedRows.map((row, rowIndex) => (
                      <TableRow 
                        key={row._id || rowIndex} 
                        className="hover:bg-muted/10 transition-colors group/row"
                      >
                        {/* SI No */}
                        <TableCell className="py-2 px-2 text-center font-bold text-muted-foreground border-r border-b bg-background sticky left-0 z-10 w-[64px] min-w-[64px] max-w-[64px] select-none text-xs">
                          {rowIndex + 1}
                        </TableCell>

                        {/* Dynamic Row Columns */}
                        {columns.map((col) => {
                          const isFormula = col.type === "formula";
                          const isDesignation = col.key === "designation";
                          const cellValue = isDesignation ? row.designation : row.values[col.key] || "0";

                          return (
                            <TableCell 
                              key={col.key} 
                              className={cn(
                                "p-1 border-r border-b relative font-medium",
                                isFormula ? "bg-muted/20 text-muted-foreground font-mono text-xs cursor-help" : "text-foreground",
                                isDesignation && "sticky left-[64px] z-10 bg-background w-[180px] min-w-[180px] max-w-[180px]"
                              )}
                              title={isDesignation ? row.designation : undefined}
                            >
                              {isFormula ? (
                                <div className="h-8 px-3 flex items-center justify-start text-xs select-none cursor-help font-mono font-semibold" title={`Formula: ${col.formula}`}>
                                  {cellValue}
                                </div>
                              ) : (() => {
                                const isEditing = editingRowIndex === rowIndex;
                                const isReadOnly = !isEditing || (!isSuperAdmin && isDesignation);
                                return (
                                  <div className="flex items-center gap-1 pr-1">
                                    <Input
                                      type={isDesignation ? "text" : "number"}
                                      step={isDesignation ? undefined : "any"}
                                      value={cellValue}
                                      readOnly={isReadOnly}
                                      onChange={(e) => handleCellChange(rowIndex, col.key, e.target.value)}
                                      placeholder="0"
                                      title={isDesignation ? row.designation : undefined}
                                      className={cn(
                                        "h-8 flex-1 bg-transparent border-none shadow-none rounded-none text-xs px-3 font-semibold transition-all focus-visible:ring-0",
                                        isDesignation ? "font-bold text-foreground text-left" : "font-mono text-left",
                                        isEditing && !isReadOnly
                                          ? "bg-background border rounded border-input ring-1 ring-primary/20 pointer-events-auto cursor-text" 
                                          : "cursor-default select-none pointer-events-none"
                                      )}
                                    />
                                    {/* User-assign dropdown — Equipments tab, designation cell, Super Admin only, while editing */}
                                    {isDesignation && isSuperAdmin && !isOperators && isEditing && (
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <button
                                            type="button"
                                            className="h-6 w-6 flex-shrink-0 flex items-center justify-center rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                                            title="Assign users to this machine"
                                          >
                                            <ChevronDown className="h-3 w-3" />
                                          </button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-64 p-3 shadow-xl border border-muted z-50" side="right" align="start">
                                          <div className="space-y-2">
                                            <p className="text-xs font-bold text-foreground">Assign Users to &ldquo;{row.designation}&rdquo;</p>
                                            <p className="text-[10px] text-muted-foreground">Assigned users can edit this machine&apos;s values.</p>
                                            {row.assignedUsers && row.assignedUsers.length > 0 && (
                                              <div className="flex items-center gap-0.5 flex-wrap pb-1">
                                                {row.assignedUsers.map((au: any) => (
                                                  <span key={au._id || au} className="h-5 w-5 rounded-full bg-primary/15 text-primary text-[8px] font-bold flex items-center justify-center border border-primary/30" title={au.name || au.email}>
                                                    {(au.name || "?")[0].toUpperCase()}
                                                  </span>
                                                ))}
                                              </div>
                                            )}
                                            <div className="max-h-[180px] overflow-y-auto space-y-1 pr-1">
                                              {users.length === 0 ? (
                                                <p className="text-[10px] text-muted-foreground italic text-center py-3">No users available.</p>
                                              ) : (
                                                users.map((u) => {
                                                  const isChecked = row.assignedUsers?.some((au: any) => String(au._id || au) === u._id);
                                                  return (
                                                    <button
                                                      key={u._id}
                                                      type="button"
                                                      onClick={() => handleToggleRowUser(rowIndex, u)}
                                                      className={cn(
                                                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                                                        isChecked ? "bg-primary/10 text-primary" : "hover:bg-muted/60 text-foreground"
                                                      )}
                                                    >
                                                      <div className={cn("h-3.5 w-3.5 rounded-sm border flex items-center justify-center shrink-0", isChecked ? "bg-primary border-primary" : "border-muted-foreground/40")}>
                                                        {isChecked && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                                                      </div>
                                                      <div className="flex flex-col items-start">
                                                        <span>{u.name}</span>
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
                                    
                                    {/* Show assigned users badges when NOT editing */}
                                    {isDesignation && isSuperAdmin && !isOperators && !isEditing && row.assignedUsers && row.assignedUsers.length > 0 && (
                                      <div className="flex items-center gap-0.5 flex-shrink-0">
                                        {row.assignedUsers.slice(0, 2).map((au: any) => (
                                          <span key={au._id || au} className="h-5 w-5 rounded-full bg-primary/15 text-primary text-[8px] font-bold flex items-center justify-center border border-primary/30" title={au.name || au.email}>
                                            {(au.name || "?")[0].toUpperCase()}
                                          </span>
                                        ))}
                                        {row.assignedUsers.length > 2 && (
                                          <span className="h-5 w-5 rounded-full bg-muted text-muted-foreground text-[8px] font-bold flex items-center justify-center border border-muted">
                                            +{row.assignedUsers.length - 2}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </TableCell>
                          );
                        })}

                        {/* Row Actions */}
                        {(() => {
                          const isAssignedToRow = !isSuperAdmin && row.assignedUsers?.some((au: any) => String(au._id || au) === String(currentUser?._id));
                          const canActOnRow = isSuperAdmin || isAssignedToRow;
                          if (!canActOnRow) return null;
                          return (
                            <TableCell className="p-1 text-center border-b">
                              <div className="flex items-center justify-center gap-1">
                                {editingRowIndex === rowIndex ? (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleSaveRowInline(rowIndex)}
                                      className="h-8 w-8 text-success hover:text-success hover:bg-success/10 transition-colors"
                                      title="Save Row Changes"
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleCancelEditRow(rowIndex)}
                                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
                                      title="Cancel Editing"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleStartEditRow(rowIndex)}
                                      className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                      title={config.editRowTooltip}
                                      disabled={editingRowIndex !== null}
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </Button>
                                    {isSuperAdmin && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDeleteRow(rowIndex)}
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                        title={config.deleteRowTooltip}
                                        disabled={editingRowIndex !== null}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    )}
                                  </>
                                )}
                              </div>
                            </TableCell>
                          );
                        })()}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Universal Power Value Small Widget (Only rendered on Equipments tab) */}
      {!isOperators && !loading && columns.length > 0 && (
        <div className="flex justify-end mt-4">
          <div className="flex flex-wrap items-center gap-3 bg-card/60 backdrop-blur-md px-4 py-1.5 rounded-xl border border-muted w-fit text-xs">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <Zap className="h-4 w-4 text-primary animate-pulse" />
              <span>Universal Power Value:</span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="any"
                value={universalPowerValue}
                onChange={(e) => setUniversalPowerValue(e.target.value)}
                readOnly={!isEditingPowerVal}
                className={cn(
                  "h-7 w-16 bg-background border text-center font-bold px-1 rounded-lg focus-visible:ring-1 focus-visible:ring-primary text-xs",
                  !isEditingPowerVal ? "cursor-default select-none pointer-events-none bg-muted/40 border-none shadow-none text-muted-foreground" : "text-primary"
                )}
              />
              {isSuperAdmin && (
                <div className="flex items-center gap-1">
                  {!isEditingPowerVal ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setIsEditingPowerVal(true);
                        setPowerValBackup(universalPowerValue);
                      }}
                      className="h-7 w-7 text-primary hover:text-primary/80 hover:bg-primary/10 transition-colors"
                      title="Edit Universal Power Value"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <div className="flex items-center gap-1 animate-in fade-in zoom-in-95 duration-200">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleSavePowerVal}
                        disabled={savingPowerVal}
                        className="h-7 w-7 text-success hover:text-success/80 hover:bg-success/10 transition-colors"
                        title="Save"
                      >
                        {savingPowerVal ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setIsEditingPowerVal(false);
                          setUniversalPowerValue(powerValBackup);
                        }}
                        className="h-7 w-7 text-destructive hover:text-destructive/80 hover:bg-destructive/10 transition-colors"
                        title="Cancel"
                        disabled={savingPowerVal}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Column Settings Modal */}
      <Dialog open={columnModalOpen} onOpenChange={setColumnModalOpen}>
        <DialogContent className="sm:max-w-[450px] border-primary/10 p-5">
          <DialogHeader className="space-y-1">
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Settings2 className="h-4 w-4 text-primary" />
              {editingColumn ? `Edit Column: ${editingColumn.name}` : "Create New Column"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Define columns, math formulas, and metadata. Auto-calculations recalculate instantly.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            
            {/* Column Name */}
            <div className="space-y-1">
              <Label htmlFor="col-name" className="text-xs font-semibold">Column Display Name</Label>
              <Input
                id="col-name"
                value={colName}
                onChange={(e) => setColName(e.target.value)}
                placeholder={isOperators ? "e.g. Health Allowance, ESI" : "e.g. Dep Rate, Cost"}
                className="h-8 text-xs bg-background font-semibold"
              />
            </div>

            {/* Column Type */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Column Input Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setColType("manual")}
                  className={cn(
                    "p-2 rounded-md border text-xs font-semibold transition-all flex flex-col items-center gap-0.5",
                    colType === "manual" 
                      ? "border-primary bg-primary/5 text-primary" 
                      : "border-muted hover:bg-muted/50 text-muted-foreground"
                  )}
                >
                  <span>Manual Input</span>
                  <span className="text-[9px] text-muted-foreground text-center font-normal">
                    Manual numeric entries
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setColType("formula")}
                  className={cn(
                    "p-2 rounded-md border text-xs font-semibold transition-all flex flex-col items-center gap-0.5",
                    colType === "formula" 
                      ? "border-primary bg-primary/5 text-primary" 
                      : "border-muted hover:bg-muted/50 text-muted-foreground"
                  )}
                >
                  <span>Calculated Field</span>
                  <span className="text-[9px] text-muted-foreground text-center font-normal">
                    Using formulas/expressions
                  </span>
                </button>
              </div>
            </div>

            {/* Column Meta */}
            <div className="space-y-1">
              <Label htmlFor="col-meta" className="text-xs font-semibold flex items-center gap-1.5">
                Metadata Label (Optional)
                <Popover>
                  <PopoverTrigger className="text-muted-foreground hover:text-foreground">
                    <HelpCircle className="h-3.5 w-3.5" />
                  </PopoverTrigger>
                  <PopoverContent className="text-xs p-3 space-y-1.5 w-60">
                    <p className="font-semibold">Helper text displayed in secondary header.</p>
                    <p className="text-muted-foreground">
                      {isOperators ? 'Examples: "4.75%", "13.10%", "350/mth", "2000/Yr"' : 'Examples: "at 15% PA", "Per Hr", "incl comp"'}
                    </p>
                  </PopoverContent>
                </Popover>
              </Label>
              <Input
                id="col-meta"
                value={colMeta}
                onChange={(e) => setColMeta(e.target.value)}
                placeholder={isOperators ? "e.g. 4.75% or 350/mth" : "e.g. at 15% PA or Per Hr"}
                className="h-8 text-xs bg-background font-mono"
              />
            </div>

            {/* Formula Editor with Smooth Height Transition */}
            <div className={cn(
              "grid transition-all duration-300 ease-in-out",
              colType === "formula" ? "grid-rows-[1fr] opacity-100 mt-2" : "grid-rows-[0fr] opacity-0 pointer-events-none"
            )}>
              <div className="overflow-hidden">
                <div className="space-y-2 p-3 bg-muted/40 rounded-lg border border-muted">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="col-formula" className="text-[11px] font-bold text-primary flex items-center gap-1">
                      Formula Expression
                    </Label>
                    <Popover>
                      <PopoverTrigger className="text-muted-foreground hover:text-foreground text-[9px] flex items-center gap-0.5">
                        <HelpCircle className="h-3 w-3" />
                        Formula Tips
                      </PopoverTrigger>
                      <PopoverContent className="text-xs p-3 space-y-1.5 w-64 font-sans leading-relaxed">
                        <p className="font-bold text-primary">Formula Rules:</p>
                        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                          <li>Use arithmetic: <code className="bg-muted px-1 py-0.5 rounded font-mono">+ - * /</code></li>
                          <li>Reference columns using brackets: <code className="bg-muted px-1 py-0.5 rounded font-mono">[column_key]</code></li>
                          <li>Round results: <code className="bg-muted px-1 py-0.5 rounded font-mono">round(expr, decimals)</code></li>
                        </ul>
                        <p className="text-[10px] text-muted-foreground pt-1.5 italic">
                          Example: <code className="font-mono bg-muted p-0.5 rounded block mt-0.5">
                            {isOperators ? "round([sub_total] * 0.0475, 2)" : "round([mc_cost] * 0.15, 2)"}
                          </code>
                        </p>
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <Input
                    id="col-formula"
                    value={colFormula}
                    onChange={(e) => setColFormula(e.target.value)}
                    placeholder={isOperators ? "e.g. [basic] + [da] + 5" : "e.g. [mc_cost] * 0.15"}
                    className="font-mono h-8 text-xs bg-background"
                  />

                  {/* Insertable Column Tags */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">
                      Click to insert column key:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {columns.map((col) => {
                        if (col.key === "designation" || (editingColumn && col.key === editingColumn.key)) return null;
                        return (
                          <Button
                            key={col.key}
                            type="button"
                            variant="secondary"
                            className="h-6 px-2 py-0 text-[10px] font-mono font-semibold"
                            onClick={() => setColFormula(colFormula + `[${col.key}]`)}
                          >
                            [{col.name}{col.meta ? ` (${col.meta.replace(/[()]/g, "").trim()})` : ""}]
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setColumnModalOpen(false)}
              className="h-8 text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveColumnWithConfirm}
              className="h-8 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground px-4"
            >
              Save Column
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Row Modal */}
      <Dialog open={rowModalOpen} onOpenChange={setRowModalOpen}>
        <DialogContent className="sm:max-w-[420px] border-primary/10 p-5">
          <DialogHeader className="space-y-1">
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Plus className="h-4 w-4 text-primary" />
              {config.addDialogTitle}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {config.addDialogDesc}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            {/* Row Label */}
            <div className="space-y-1">
              <Label htmlFor="designation-name" className="text-xs font-semibold">{config.rowLabel}</Label>
              <Input
                id="designation-name"
                value={newDesignation}
                onChange={(e) => setNewDesignation(e.target.value)}
                placeholder={config.rowPlaceholder}
                className="h-8 text-xs bg-background font-semibold"
              />
            </div>

            {/* Manual Input Columns (Compact Grid Layout) */}
            <div className="grid grid-cols-2 gap-2 mt-2 max-h-[160px] overflow-y-auto pr-1">
              {columns.filter(col => col.type === "manual" && col.key !== "designation").map(col => (
                <div key={col.key} className="space-y-1">
                  <Label htmlFor={`new-row-${col.key}`} className="text-xs font-semibold block truncate">
                    {col.name} {col.meta ? `(${col.meta})` : ""}
                  </Label>
                  <Input
                    id={`new-row-${col.key}`}
                    type="number"
                    value={newRowManualValues[col.key] || ""}
                    onChange={(e) => setNewRowManualValues({
                      ...newRowManualValues,
                      [col.key]: e.target.value
                    })}
                    placeholder="0"
                    className="h-8 text-xs bg-background font-mono"
                  />
                </div>
              ))}
            </div>

            {/* User Assignment — Equipments tab only */}
            {!isOperators && users.length > 0 && (
              <div className="space-y-1.5 border-t pt-3">
                <Label className="text-xs font-semibold">Assign Users to this Machine</Label>
                <p className="text-[10px] text-muted-foreground">Selected users will be able to edit this machine row.</p>
                <div className="max-h-[120px] overflow-y-auto space-y-1 pr-1">
                  {users.map((u) => {
                    const isChecked = newRowAssignedUsers.includes(u._id);
                    return (
                      <button
                        key={u._id}
                        type="button"
                        onClick={() => {
                          setNewRowAssignedUsers(prev =>
                            isChecked ? prev.filter(id => id !== u._id) : [...prev, u._id]
                          );
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                          isChecked ? "bg-primary/10 text-primary" : "hover:bg-muted/60 text-foreground"
                        )}
                      >
                        <div className={cn("h-3.5 w-3.5 rounded-sm border flex items-center justify-center shrink-0", isChecked ? "bg-primary border-primary" : "border-muted-foreground/40")}>
                          {isChecked && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                        </div>
                        <div className="flex flex-col items-start">
                          <span>{u.name}</span>
                          <span className="text-[9px] text-muted-foreground">{u.email}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setRowModalOpen(false)}
              className="h-8 text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAddRow}
              className="h-8 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground px-4"
            >
              {config.addButtonLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Global Confirmation Dialog Modal */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-[400px] border-destructive/20 bg-card p-5">
          <DialogHeader className="space-y-2">
            <DialogTitle className="flex items-center gap-2 text-base text-destructive font-bold">
              <AlertTriangle className="h-4 w-4" />
              {confirmTitle}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              {confirmDescription}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 mt-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmOpen(false)}
              className="h-8 text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                confirmAction();
                setConfirmOpen(false);
              }}
              className="h-8 text-xs font-semibold px-4 shadow-sm"
            >
              {confirmButtonText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
    </div>
  );
}
