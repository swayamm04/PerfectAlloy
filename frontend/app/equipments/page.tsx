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
  X
} from "lucide-react";
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
  designation: string; // Keeping mapping name as 'designation' for 100% component compatibility
  values: Record<string, string>;
}

export default function EquipmentsPage() {
  const { user: currentUser } = useAuth();
  const [columns, setColumns] = useState<Column[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "waiting" | "saving" | "saved" | "error">("idle");
  const isInitialLoad = useRef(true);

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

  const isSuperAdmin = currentUser?.role === "super-admin";

  const fetchTableData = async () => {
    try {
      const response = await fetch(`${API_URL}/api/equipment-table`, {
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
          };
        });
        setRows(formattedRows);
      } else {
        toast.error(data.message || "Failed to fetch equipment configurations");
      }
    } catch (error) {
      console.error("Error fetching equipment data:", error);
      toast.error("An error occurred while loading the table");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchTableData();
    }
  }, [currentUser]);

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

          // Find variable references like [mc_cost]
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
    const initialVals: Record<string, string> = {};
    columns.forEach((col) => {
      if (col.type === "manual" && col.key !== "designation") {
        initialVals[col.key] = "0";
      }
    });
    setNewRowManualValues(initialVals);
    setRowModalOpen(true);
  };

  // Add new machine row
  const handleAddRow = () => {
    if (!newDesignation.trim()) {
      toast.error("Machine name is required");
      return;
    }

    if (rows.some((r) => r.designation.toLowerCase() === newDesignation.trim().toLowerCase())) {
      toast.error("A machine with this name already exists");
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
    };
    
    setRows([...rows, newRow]);
    setRowModalOpen(false);
    toast.success(`Added machine "${newDesignation.trim()}"`);
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

  // Save inline row edit changes (with confirmation warning)
  const handleSaveRowInline = (rowIndex: number) => {
    const row = rows[rowIndex];
    if (!row.designation.trim()) {
      toast.error("Machine name is required");
      return;
    }

    const exists = rows.some((r, i) => i !== rowIndex && r.designation.toLowerCase() === row.designation.trim().toLowerCase());
    if (exists) {
      toast.error("A machine with this name already exists");
      return;
    }

    requestConfirmation(
      "Save Machine Changes",
      `Are you sure you want to save the changes for "${row.designation.trim()}"?`,
      "Save",
      () => {
        const updatedRows = [...rows];
        updatedRows[rowIndex].designation = row.designation.trim();
        setRows(updatedRows);
        setEditingRowIndex(null);
        setBackupRow(null);
        toast.success(`Machine "${row.designation.trim()}" updated`);
      }
    );
  };

  // Delete machine row
  const handleDeleteRow = (index: number) => {
    requestConfirmation(
      "Delete Machine Row",
      `Are you sure you want to delete the machine "${rows[index].designation}"? This action is permanent and all calculations will be deleted.`,
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
        toast.info("Machine row removed.");
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
      toast.error("Cannot delete Machine column");
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

  // Debounced Auto-Save Effect
  useEffect(() => {
    if (loading || columns.length === 0) return;
    if (!isSuperAdmin) return;

    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }

    setSaveStatus("waiting");

    const timer = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        const response = await fetch(`${API_URL}/api/equipment-table`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentUser?.token}`,
          },
          body: JSON.stringify({ columns, rows }),
        });

        if (response.ok) {
          setSaveStatus("saved");
          setTimeout(() => {
            setSaveStatus((prev) => (prev === "saved" ? "idle" : prev));
          }, 3000);
        } else {
          setSaveStatus("error");
          toast.error("Auto-save failed");
        }
      } catch (error) {
        console.error("Auto-save error:", error);
        setSaveStatus("error");
      }
    }, 1500); // 1.5 seconds debounce

    return () => clearTimeout(timer);
  }, [columns, rows, loading, currentUser, isSuperAdmin]);

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in duration-500">
        
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <Calculator className="h-8 w-8 text-primary" />
              Investment on CNC VMC and Metrology Equipments
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure machine costs, depreciation rates, interest rates, and equipment models in an interactive grid.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {isSuperAdmin && (
              <>
                <Button
                  onClick={handleOpenRowModal}
                  variant="outline"
                  className="h-11 hover:bg-primary/5 font-semibold gap-2"
                >
                  <Plus className="h-4 w-4 text-primary" />
                  Add Machine
                </Button>

                <Button
                  onClick={() => handleOpenColumnModal()}
                  variant="outline"
                  className="h-11 hover:bg-primary/5 font-semibold gap-2"
                >
                  <Plus className="h-4 w-4 text-primary" />
                  Add Column
                </Button>
              </>
            )}
            {!isSuperAdmin && (
              <div className="flex items-center gap-2 bg-muted/60 border border-muted px-4 py-2.5 rounded-lg text-xs font-semibold text-muted-foreground">
                <Info className="h-4 w-4 text-primary" />
                Read-only: Contact Super Admin to save modifications.
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
                      <TableHead className="py-4 px-2 text-xs font-extrabold tracking-wider w-[64px] min-w-[64px] max-w-[64px] text-center border-r border-b sticky left-0 z-30 bg-background">
                        Sl No
                      </TableHead>
                      {columns.map((col, index) => {
                        const isDesignation = col.key === "designation";
                        const showActions = isSuperAdmin && !isDesignation;

                        const headerCell = (
                          <TableHead 
                            key={col.key} 
                            onDoubleClick={() => {
                              if (showActions) {
                                setActiveColumnActionsKey(col.key);
                              }
                            }}
                            className={cn(
                              "py-4 px-4 text-xs font-extrabold tracking-wider border-r border-b relative text-foreground select-none cursor-default",
                              isDesignation 
                                ? "w-[180px] min-w-[180px] max-w-[180px] sticky left-[64px] z-30 bg-background" 
                                : "min-w-[120px]",
                              showActions && "hover:bg-muted/10 cursor-pointer transition-colors"
                            )}
                            title={showActions ? "Double-click to configure column" : undefined}
                          >
                            <span className="truncate" title={col.name}>{col.name}</span>
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
                      {isSuperAdmin && (
                        <TableHead className="py-4 px-4 text-xs font-bold tracking-wider w-20 text-center border-b">
                          Actions
                        </TableHead>
                      )}
                    </TableRow>

                    {/* Secondary Meta Row */}
                    <TableRow className="hover:bg-transparent h-10">
                      <TableHead className="py-1 px-2 text-center border-r border-b font-mono text-xs text-muted-foreground bg-background sticky left-0 z-30 w-[64px] min-w-[64px] max-w-[64px]">
                        -
                      </TableHead>
                      {columns.map((col) => {
                        const isDesignation = col.key === "designation";
                        return (
                          <TableHead 
                            key={`meta-${col.key}`} 
                            className={cn(
                              "py-1 px-4 text-left border-r border-b font-mono text-[11px] font-bold text-primary/80 uppercase tracking-wider bg-muted/5",
                              isDesignation && "sticky left-[64px] z-30 bg-background w-[180px] min-w-[180px] max-w-[180px]"
                            )}
                          >
                            {col.meta || <span className="opacity-0">-</span>}
                          </TableHead>
                        );
                      })}
                      {isSuperAdmin && (
                        <TableHead className="py-1 px-4 text-center bg-muted/5 border-b">
                          -
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {evaluatedRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={columns.length + (isSuperAdmin ? 2 : 1)} className="h-32 text-center text-muted-foreground font-medium border-b">
                          No machines added yet. Add a machine below.
                        </TableCell>
                      </TableRow>
                    ) : (
                      evaluatedRows.map((row, rowIndex) => (
                        <TableRow 
                          key={row._id || rowIndex} 
                          className="hover:bg-muted/10 transition-colors group/row"
                        >
                          {/* SI No */}
                          <TableCell className="py-3 px-2 text-center font-bold text-muted-foreground border-r border-b bg-background sticky left-0 z-10 w-[64px] min-w-[64px] max-w-[64px] select-none text-xs">
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
                                  isFormula ? "bg-muted/20 text-muted-foreground font-mono text-sm" : "text-foreground",
                                  isDesignation && "sticky left-[64px] z-10 bg-background w-[180px] min-w-[180px] max-w-[180px]"
                                )}
                              >
                                {isFormula ? (
                                  <div className="h-10 px-3 flex items-center justify-start text-sm select-none" title={`Formula: ${col.formula}`}>
                                    {cellValue}
                                  </div>
                                ) : (
                                  <Input
                                    type={isDesignation ? "text" : "number"}
                                    value={cellValue}
                                    readOnly={editingRowIndex !== rowIndex}
                                    onChange={(e) => handleCellChange(rowIndex, col.key, e.target.value)}
                                    placeholder="0"
                                    className={cn(
                                      "h-10 w-full bg-transparent border-none shadow-none rounded-none text-sm px-3 font-semibold transition-all focus-visible:ring-0",
                                      isDesignation ? "font-bold text-foreground text-left" : "font-mono text-left",
                                      editingRowIndex === rowIndex 
                                        ? "bg-background border rounded border-input ring-1 ring-primary/20 pointer-events-auto" 
                                        : "cursor-default select-none pointer-events-none"
                                    )}
                                  />
                                )}
                              </TableCell>
                            );
                          })}

                          {/* Row Actions */}
                          {isSuperAdmin && (
                            <TableCell className="p-1 text-center border-b">
                              <div className="flex items-center justify-center gap-1.5">
                                {editingRowIndex === rowIndex ? (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleSaveRowInline(rowIndex)}
                                      className="h-9 w-9 text-success hover:text-success hover:bg-success/10 transition-colors"
                                      title="Save Machine Changes"
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleCancelEditRow(rowIndex)}
                                      className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
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
                                      className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                      title="Edit Machine"
                                      disabled={editingRowIndex !== null}
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDeleteRow(rowIndex)}
                                      className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                      title="Delete Machine"
                                      disabled={editingRowIndex !== null}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dynamic Column Settings Modal */}
        <Dialog open={columnModalOpen} onOpenChange={setColumnModalOpen}>
          <DialogContent className="sm:max-w-[450px] border-primary/10 p-5">
            <DialogHeader className="space-y-1">
              <DialogTitle className="flex items-center gap-2 text-base">
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
                  placeholder="e.g. Dep Rate, Cost"
                  className="h-9 text-sm bg-background"
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
                      <p className="text-muted-foreground">Examples: "at 15% PA", "Per Hr", "incl comp"</p>
                    </PopoverContent>
                  </Popover>
                </Label>
                <Input
                  id="col-meta"
                  value={colMeta}
                  onChange={(e) => setColMeta(e.target.value)}
                  placeholder="e.g. at 15% PA or Per Hr"
                  className="h-9 text-sm bg-background"
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
                            Example: <code className="font-mono bg-muted p-0.5 rounded block mt-0.5">round([mc_cost] * 0.15, 2)</code>
                          </p>
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    <Input
                      id="col-formula"
                      value={colFormula}
                      onChange={(e) => setColFormula(e.target.value)}
                      placeholder="e.g. [mc_cost] * 0.15"
                      className="font-mono h-9 text-xs bg-background"
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
                className="h-9 text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveColumnWithConfirm}
                className="h-9 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground px-4"
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
              <DialogTitle className="flex items-center gap-2 text-base">
                <Plus className="h-4 w-4 text-primary" />
                Add New Machine
              </DialogTitle>
              <DialogDescription className="text-xs">
                Enter the machine name and starting values for this model.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-1">
              {/* Designation Name */}
              <div className="space-y-1">
                <Label htmlFor="designation-name" className="text-xs font-semibold">Machine / Equipment Name</Label>
                <Input
                  id="designation-name"
                  value={newDesignation}
                  onChange={(e) => setNewDesignation(e.target.value)}
                  placeholder="e.g. Grinding CLG 5020, Drilling"
                  className="h-9 text-sm bg-background font-semibold"
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
                      className="h-9 text-sm bg-background font-mono"
                    />
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 mt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setRowModalOpen(false)}
                className="h-9 text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleAddRow}
                className="h-9 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground px-4"
              >
                Add Machine
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Global Confirmation Dialog Modal */}
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="sm:max-w-[400px] border-destructive/20 bg-card p-5">
            <DialogHeader className="space-y-2">
              <DialogTitle className="flex items-center gap-2 text-base text-destructive">
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
                className="h-9 text-xs font-semibold"
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
                className="h-9 text-xs font-semibold px-4 shadow-sm"
              >
                {confirmButtonText}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
      </div>
    </DashboardLayout>
  );
}
