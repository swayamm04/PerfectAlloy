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
import { toast } from "sonner";
import { 
  Package, 
  Loader2, 
  Edit, 
  Save, 
  X, 
  Plus, 
  Trash2, 
  Calendar,
  AlertTriangle,
  Info,
  ChevronLeft,
  ChevronRight,
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
  designation: string; // Material Name
  values: Record<string, string>;
}

interface MaterialRateData {
  _id?: string;
  month: string; // YYYY-MM
  columns: Column[];
  rows: Row[];
}

// Convert YYYY-MM to MMM-YY (e.g. 2026-03 -> Mar-26)
const formatMonthLabel = (monthStr: string) => {
  if (!monthStr || !monthStr.includes("-")) return monthStr;
  const [year, month] = monthStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  const formatted = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  return formatted.replace(" ", "-");
};

export default function MaterialRateView() {
  const { user: currentUser } = useAuth();
  
  // Data States
  const [materialRates, setMaterialRates] = useState<MaterialRateData[]>([]);
  const [activeMonth, setActiveMonth] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editBackup, setEditBackup] = useState<MaterialRateData | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // New Month Modal state
  const [showMonthModal, setShowMonthModal] = useState(false);
  const [newMonthVal, setNewMonthVal] = useState("");
  const [creatingMonth, setCreatingMonth] = useState(false);

  // Add Custom Row Modal state
  const [showAddRowModal, setShowAddRowModal] = useState(false);
  const [newRowName, setNewRowName] = useState("");

  // Add Custom Column Modal state
  const [showAddColModal, setShowAddColModal] = useState(false);
  const [newColName, setNewColName] = useState("");

  // Delete Month States & Ref
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [deleteMonthTarget, setDeleteMonthTarget] = useState<string | null>(null);
  const [deletingMonthStatus, setDeletingMonthStatus] = useState(false);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

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
      const response = await fetch(`${API_URL}/api/material-rate/${deleteMonthTarget}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${currentUser?.token}` }
      });

      if (response.ok) {
        toast.success(`Deleted sheet for ${formatMonthLabel(deleteMonthTarget)} successfully`);
        setDeleteMonthTarget(null);
        await fetchRates(); // reload data
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

  const isSuperAdmin = currentUser?.role === "super-admin";

  const fetchRates = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/material-rate`, {
        headers: { Authorization: `Bearer ${currentUser?.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const formattedData = (data || []).map((sheet: any) => {
          const formattedRows = (sheet.rows || []).map((row: any) => {
            const vals: Record<string, string> = {};
            if (row.values) {
              Object.keys(row.values).forEach((k) => {
                vals[k] = String(row.values[k] ?? "0");
              });
            }
            return {
              _id: row._id,
              designation: row.designation,
              values: vals
            };
          });
          return {
            _id: sheet._id,
            month: sheet.month,
            columns: sheet.columns || [],
            rows: formattedRows
          };
        });

        setMaterialRates(formattedData);
        
        if (formattedData.length > 0) {
          setActiveMonth(formattedData[0].month);
        }
      } else {
        toast.error("Failed to load material rates");
      }
    } catch (error) {
      console.error("Error fetching material rates:", error);
      toast.error("An error occurred while loading material rates data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchRates();
    }
  }, [currentUser]);

  const activeDocument = useMemo(() => {
    if (!activeMonth || !Array.isArray(materialRates)) return null;
    return materialRates.find(r => r.month === activeMonth) || null;
  }, [activeMonth, materialRates]);

  const columns = useMemo(() => activeDocument?.columns || [], [activeDocument]);
  const rows = useMemo(() => activeDocument?.rows || [], [activeDocument]);

  const handleCellChange = (rowIndex: number, colKey: string, value: string) => {
    if (!activeMonth) return;

    setMaterialRates(prev => {
      const updated = [...prev];
      const index = updated.findIndex(r => r.month === activeMonth);
      if (index > -1) {
        const sheet = { ...updated[index] };
        const updatedRows = [...sheet.rows];
        updatedRows[rowIndex] = {
          ...updatedRows[rowIndex],
          values: {
            ...updatedRows[rowIndex].values,
            [colKey]: value
          }
        };
        sheet.rows = updatedRows;
        updated[index] = sheet;
      }
      return updated;
    });
  };

  const handleCellDoubleClick = (rowIndex: number, colKey: string) => {
    if (!isEditing || !activeMonth) return;

    const sortedRates = [...materialRates].sort((a, b) => b.month.localeCompare(a.month));
    const previousMonthData = sortedRates.find(r => r.month < activeMonth);

    if (!previousMonthData) {
      toast.info("No previous month data found to copy from");
      return;
    }

    const activeRow = rows[rowIndex];
    const prevRow = previousMonthData.rows.find(
      (r) => r.designation.toLowerCase() === activeRow.designation.toLowerCase()
    );

    if (!prevRow || !prevRow.values || prevRow.values[colKey] === undefined) {
      toast.info(`No previous value found for "${activeRow.designation}" in ${formatMonthLabel(previousMonthData.month)}`);
      return;
    }

    const oldValue = prevRow.values[colKey];
    handleCellChange(rowIndex, colKey, oldValue);
    
    toast.success(`Autofilled with ${formatMonthLabel(previousMonthData.month)} value: ${oldValue}`);
  };

  const handleSave = async () => {
    if (!activeMonth || !activeDocument) return;
    setSaveStatus("saving");

    try {
      const response = await fetch(`${API_URL}/api/material-rate/${activeMonth}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentUser?.token}`
        },
        body: JSON.stringify({
          columns: activeDocument.columns,
          rows: activeDocument.rows
        })
      });

      if (response.ok) {
        setSaveStatus("saved");
        setIsEditing(false);
        setEditBackup(null);
        toast.success(`Saved material rates for ${formatMonthLabel(activeMonth)} successfully!`);
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        setSaveStatus("error");
        toast.error("Failed to save material rates");
      }
    } catch (error) {
      console.error("Error saving rates:", error);
      setSaveStatus("error");
      toast.error("An error occurred during save");
    }
  };

  const handleCancelEdit = () => {
    if (editBackup && activeMonth) {
      setMaterialRates(prev => {
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
    toast.info("Changes cancelled and reverted.");
  };

  const handleOpenMonthUpdate = () => {
    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth = String(today.getMonth() + 1).padStart(2, "0");
    setNewMonthVal(`${curYear}-${curMonth}`);
    setShowMonthModal(true);
  };

  const confirmCreateMonth = async () => {
    if (!newMonthVal) {
      toast.error("Please pick a valid month");
      return;
    }

    setCreatingMonth(true);
    try {
      const response = await fetch(`${API_URL}/api/material-rate/new-month`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentUser?.token}`
        },
        body: JSON.stringify({ month: newMonthVal })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Initialized material rate sheet for ${formatMonthLabel(newMonthVal)}`);
        setShowMonthModal(false);
        await fetchRates();
        setActiveMonth(newMonthVal);
        setIsEditing(true);
        setTimeout(() => {
          setEditBackup(JSON.parse(JSON.stringify(data)));
        }, 300);
      } else {
        toast.error(data.message || "Failed to create new month sheet");
      }
    } catch (error) {
      console.error("Error creating new month:", error);
      toast.error("An error occurred during month initialization");
    } finally {
      setCreatingMonth(false);
    }
  };

  const handleAddMaterial = () => {
    if (!newRowName.trim()) {
      toast.error("Material Name cannot be empty");
      return;
    }

    const exists = rows.some(r => r.designation.toLowerCase() === newRowName.trim().toLowerCase());
    if (exists) {
      toast.error("A material with this name already exists in this table");
      return;
    }

    const defaultValues: Record<string, string> = {};
    columns.forEach(col => {
      if (col.key !== "designation") {
        defaultValues[col.key] = "0";
      }
    });

    setMaterialRates(prev => {
      const updated = [...prev];
      const index = updated.findIndex(r => r.month === activeMonth);
      if (index > -1) {
        const sheet = { ...updated[index] };
        sheet.rows = [...sheet.rows, { designation: newRowName.trim(), values: defaultValues }];
        updated[index] = sheet;
      }
      return updated;
    });

    toast.success(`Material "${newRowName.trim()}" added to list`);
    setNewRowName("");
    setShowAddRowModal(false);
  };

  const handleDeleteMaterial = (rowIndex: number) => {
    const matName = rows[rowIndex].designation;
    if (!window.confirm(`Are you sure you want to delete material "${matName}" from this month's sheet?`)) {
      return;
    }

    setMaterialRates(prev => {
      const updated = [...prev];
      const index = updated.findIndex(r => r.month === activeMonth);
      if (index > -1) {
        const sheet = { ...updated[index] };
        sheet.rows = sheet.rows.filter((_, i) => i !== rowIndex);
        updated[index] = sheet;
      }
      return updated;
    });

    toast.info(`Material "${matName}" deleted`);
  };

  const exportToExcel = () => {
    if (!activeDocument || rows.length === 0) return;

    const headers = ["Sl No", "Material Name", ...columns.filter(c => c.key !== "designation").map(c => c.name)];
    
    const dataRows = rows.map((row, index) => {
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
    XLSX.utils.book_append_sheet(workbook, worksheet, "Material Rates");

    const todayStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `Material_Rates_${activeMonth}_${todayStr}.xlsx`);
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
    doc.text(`MATERIAL RATE CONFIGURATION - ${formatMonthLabel(activeMonth)}`, 15, 22);

    const headers = ["Sl No", "Material Name", ...columns.filter(c => c.key !== "designation").map(c => c.name)];
    
    const tableRows = rows.map((row, index) => {
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
    doc.save(`Material_Rates_${activeMonth}_${todayStr}.pdf`);
    toast.success("PDF exported successfully!");
  };

  const handleAddColumn = () => {
    if (!newColName.trim()) {
      toast.error("Column Name cannot be empty");
      return;
    }

    const colKey = newColName.trim().toLowerCase().replace(/[^a-z0-9]/g, "_");
    if (columns.some(col => col.key === colKey || colKey === "designation")) {
      toast.error("A column with a similar name already exists");
      return;
    }

    setMaterialRates(prev => {
      const updated = [...prev];
      const index = updated.findIndex(r => r.month === activeMonth);
      if (index > -1) {
        const sheet = { ...updated[index] };
        sheet.columns = [...sheet.columns, { key: colKey, name: newColName.trim(), type: "manual", formula: "", meta: "" }];
        sheet.rows = sheet.rows.map(row => ({
          ...row,
          values: {
            ...row.values,
            [colKey]: "0"
          }
        }));
        updated[index] = sheet;
      }
      return updated;
    });

    toast.success(`Column "${newColName.trim()}" added`);
    setNewColName("");
    setShowAddColModal(false);
  };

  const handleDeleteColumn = (colKey: string, colName: string) => {
    if (colKey === "designation") return;
    if (!window.confirm(`Are you sure you want to delete column "${colName}"? All data for this column will be cleared.`)) {
      return;
    }

    setMaterialRates(prev => {
      const updated = [...prev];
      const index = updated.findIndex(r => r.month === activeMonth);
      if (index > -1) {
        const sheet = { ...updated[index] };
        sheet.columns = sheet.columns.filter(col => col.key !== colKey);
        sheet.rows = sheet.rows.map(row => {
          const nextVals = { ...row.values };
          delete nextVals[colKey];
          return {
            ...row,
            values: nextVals
          };
        });
        updated[index] = sheet;
      }
      return updated;
    });

    toast.info(`Column "${colName}" deleted`);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
        <div className="max-w-xl">
          <h1 className="text-xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Package className="h-5.5 w-5.5 text-primary" />
            Material Rate Configuration
          </h1>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Configure material and scrap rates per KG. Update monthly and double-tap inputs to restore previous values.
          </p>
        </div>
        
        <div className="flex items-center gap-3 self-start md:self-center">
          {/* History Selector Dropdown */}
          <Card className="border-none shadow-md bg-card/60 backdrop-blur-md py-2 px-3.5 w-fit">
            <div className="flex items-center gap-4">
              <div className="flex flex-col gap-1">
                <Label htmlFor="month-select" className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                  Select active month
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
                      {materialRates.map((r) => {
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
                        Edit Rates
                      </Button>
                      <Button
                        onClick={handleOpenMonthUpdate}
                        disabled={loading}
                        variant="outline"
                        className="h-8 px-3 text-xs font-bold border-primary/20 hover:bg-primary/5 text-primary shadow-sm flex items-center gap-1.5"
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        Update for this month
                      </Button>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-200">
                      <Button
                        onClick={handleSave}
                        className="h-8 px-3 text-xs font-bold bg-green-600 hover:bg-green-700 text-white shadow-sm flex items-center gap-1"
                        disabled={saveStatus === "saving"}
                      >
                        {saveStatus === "saving" ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
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
              <Button variant="outline" className="h-10 px-4 font-bold border-muted-foreground/20 hover:bg-primary/5 transition-colors gap-2 text-xs">
                <Download className="h-4 w-4" /> Export
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
        </div>
      </div>

      {/* Info Callout */}
      {isEditing && (
        <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 flex items-start gap-2.5 animate-in slide-in-from-top duration-300">
          <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-primary">Tip:</span> Double-click (or double-tap) on any input cell to auto-fill it with the value from the chronologically preceding month. Editing values in this table will not affect previous months.
          </div>
        </div>
      )}

      {/* Spreadsheet Card */}
      <Card className="border-none shadow-2xl bg-card/60 backdrop-blur-md overflow-hidden rounded-2xl">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-72 items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground space-y-4">
              <AlertTriangle className="h-12 w-12 text-yellow-500" />
              <p className="text-sm font-semibold">No data configuration loaded for this month</p>
              <Button onClick={fetchRates}>Load Default Settings</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="border-separate border-spacing-0">
                <TableHeader className="bg-muted/40 backdrop-blur-sm">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="py-3 px-3 text-xs font-extrabold tracking-wider w-[64px] min-w-[64px] max-w-[64px] text-center border-r border-b sticky left-0 z-30 bg-background/90 select-none">
                      Sl No
                    </TableHead>
                    {columns.map((col, index) => {
                      const isDesignation = col.key === "designation";
                      const showDelete = isEditing && !isDesignation && col.key !== "rate_per_kg" && col.key !== "scrap_rate_per_kg";
                      return (
                        <TableHead 
                          key={col.key}
                          className={cn(
                            "py-3 px-4 text-xs font-extrabold tracking-wider border-r border-b text-foreground select-none relative",
                            isDesignation 
                              ? "w-[240px] min-w-[240px] max-w-[240px] sticky left-[64px] z-30 bg-background/90" 
                              : "min-w-[160px]"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="truncate uppercase tracking-wider font-extrabold text-[10px] text-muted-foreground">{col.name}</span>
                            {showDelete && (
                              <button
                                onClick={() => handleDeleteColumn(col.key, col.name)}
                                className="text-red-500 hover:text-red-700 p-0.5 rounded transition-colors"
                                title="Delete Column"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </TableHead>
                      );
                    })}
                    {isEditing && (
                      <TableHead className="py-3 px-3 text-xs border-b text-center min-w-[100px] select-none">
                        Actions
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, rowIndex) => (
                    <TableRow key={row._id || rowIndex} className="hover:bg-muted/5 transition-colors duration-150">
                      <TableCell className="py-2.5 px-3 text-center border-r border-b font-bold text-muted-foreground text-xs sticky left-0 z-20 bg-background/80 select-none">
                        {rowIndex + 1}
                      </TableCell>
                      
                      {columns.map((col) => {
                        const isDesignation = col.key === "designation";
                        if (isDesignation) {
                          return (
                            <TableCell 
                              key={col.key} 
                              className="py-2.5 px-4 font-semibold text-xs border-r border-b sticky left-[64px] z-20 bg-background/80"
                            >
                              {isEditing ? (
                                <Input
                                  value={row.designation}
                                  onChange={(e) => handleCellChange(rowIndex, "designation", e.target.value)}
                                  className="h-8 px-2 font-semibold text-xs bg-background border-input rounded-lg w-full focus:ring-1 focus:ring-primary"
                                />
                              ) : (
                                <span className="font-bold text-foreground">{row.designation}</span>
                              )}
                            </TableCell>
                          );
                        }

                        const rawVal = row.values[col.key] || "";
                        return (
                          <TableCell key={col.key} className="py-2.5 px-4 text-xs border-r border-b">
                            {isEditing ? (
                              <Input
                                value={rawVal}
                                onChange={(e) => handleCellChange(rowIndex, col.key, e.target.value)}
                                onDoubleClick={() => handleCellDoubleClick(rowIndex, col.key)}
                                className="h-8 px-2 font-medium text-xs bg-background border-input rounded-lg w-full focus:ring-1 focus:ring-primary text-right"
                                placeholder="0.00"
                                title="Double-click to pull preceding month value"
                              />
                            ) : (
                              <div className="text-right font-bold font-mono text-foreground/90">
                                {parseFloat(rawVal) ? parseFloat(rawVal).toFixed(2) : rawVal || "0.00"}
                              </div>
                            )}
                          </TableCell>
                        );
                      })}

                      {isEditing && (
                        <TableCell className="py-2 px-3 text-center border-b">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteMaterial(rowIndex)}
                            className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                            title="Delete Material"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        {isEditing && (
          <div className="p-3 bg-muted/20 border-t border-muted/30 flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddRowModal(true)}
              className="h-8 text-xs font-semibold flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Material Name
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddColModal(true)}
              className="h-8 text-xs font-semibold flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Column
            </Button>
          </div>
        )}
      </Card>

      {/* Month Selection Dialog for initialization */}
      <Dialog open={showMonthModal} onOpenChange={setShowMonthModal}>
        <DialogContent className="sm:max-w-[420px] bg-background/95 border border-muted/50 shadow-2xl backdrop-blur-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Update for This Month
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select the calendar month and year you wish to configure.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-month-picker" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Select Month & Year
              </Label>
              <Input
                id="new-month-picker"
                type="month"
                value={newMonthVal}
                onChange={(e) => setNewMonthVal(e.target.value)}
                className="h-10 rounded-xl focus:ring-2 focus:ring-primary font-bold text-xs"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/10 flex gap-2.5">
              <AlertTriangle className="h-4.5 w-4.5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Confirming this action will create a new sheet for the selected month, copying all column headers and material designations from the preceding month, but resetting all rate values to zero.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setShowMonthModal(false)}
              className="text-xs font-semibold hover:bg-muted rounded-xl"
              disabled={creatingMonth}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmCreateMonth}
              className="text-xs font-bold rounded-xl"
              disabled={creatingMonth}
            >
              {creatingMonth ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                  Creating...
                </>
              ) : (
                "Confirm"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Row Modal */}
      <Dialog open={showAddRowModal} onOpenChange={setShowAddRowModal}>
        <DialogContent className="sm:max-w-[400px] bg-background border rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-md font-bold">Add Material Name</DialogTitle>
            <DialogDescription className="text-xs">
              Enter the designation or identifier for the new material row.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3">
            <Label htmlFor="row-name-input" className="text-xs text-muted-foreground">Material Designation</Label>
            <Input
              id="row-name-input"
              value={newRowName}
              onChange={(e) => setNewRowName(e.target.value)}
              placeholder="e.g. BM 33 10-2"
              className="mt-1 h-9 text-xs"
              autoFocus
            />
          </div>

          <DialogFooter className="gap-1.5">
            <Button variant="ghost" onClick={() => setShowAddRowModal(false)} className="h-9 text-xs">Cancel</Button>
            <Button onClick={handleAddMaterial} className="h-9 text-xs font-bold">Add Row</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Column Modal */}
      <Dialog open={showAddColModal} onOpenChange={setShowAddColModal}>
        <DialogContent className="sm:max-w-[400px] bg-background border rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-md font-bold">Add Column</DialogTitle>
            <DialogDescription className="text-xs">
              Create a new manual column. You will be able to enter values for all materials.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3">
            <Label htmlFor="col-name-input" className="text-xs text-muted-foreground">Column Title / Header</Label>
            <Input
              id="col-name-input"
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              placeholder="e.g. Custom Material Rate"
              className="mt-1 h-9 text-xs"
              autoFocus
            />
          </div>

          <DialogFooter className="gap-1.5">
            <Button variant="ghost" onClick={() => setShowAddColModal(false)} className="h-9 text-xs">Cancel</Button>
            <Button onClick={handleAddColumn} className="h-9 text-xs font-bold">Add Column</Button>
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

    </div>
  );
}
