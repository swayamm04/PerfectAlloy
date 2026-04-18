"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/src/context/AuthContext";
import { DashboardLayout } from "@/src/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus,
  Loader2,
  Save,
  Trash2,
  ArrowLeft,
  Settings,
  HardDrive,
  Edit2,
  CheckCircle2,
  XCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  Check,
  ChevronsUpDown,
  Search,
  X,
  Repeat,
  ArrowRightLeft
} from "lucide-react";
import { API_URL } from "@/src/lib/api";
import Link from "next/link";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Department {
  _id: string;
  name: string;
}

interface MasterTable {
  _id: string;
  name: string;
  departments: Department[];
}

interface Row {
  _id: string;
  partName: string;
  partNumber: string;
  material: string;
  heatNo: string;
  isBlueprint?: boolean;
  currentDepartmentIndex: number;
  selectedLoop: string[];
  stages: any[];
  createdAt?: string;
}

export default function TableViewPage() {
  const params = useParams();
  const { user: currentUser } = useAuth();
  const [table, setTable] = useState<MasterTable | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPartNo, setNewPartNo] = useState("");
  const [newPartName, setNewPartName] = useState("");
  const [newMaterial, setNewMaterial] = useState("");
  const [selectedLoop, setSelectedLoop] = useState<string[]>([]);
  const [savingRow, setSavingRow] = useState<string | null>(null);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [tempRowData, setTempRowData] = useState<Record<string, string>>({});
  const [tempRowFields, setTempRowFields] = useState({
    partName: "",
    partNumber: "",
    material: "",
    heatNo: "",
    selectedLoop: [] as string[]
  });
  const [isAddingPart, setIsAddingPart] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPartFilter, setSelectedPartFilter] = useState("all");
  const [filterOpen, setFilterOpen] = useState(false);

  const fetchTableData = async () => {
    try {
      const response = await fetch(`${API_URL}/api/master-tables/${params.id}`, {
        headers: {
          Authorization: `Bearer ${currentUser?.token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setTable(data.masterTable);
        setRows(data.rows);
      }
    } catch (error) {
      console.error("Error fetching table data:", error);
      toast.error("Failed to load table");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser && params.id) {
      fetchTableData();
    }
  }, [currentUser, params.id]);

  const handleAddRow = async () => {
    if (!newPartNo.trim()) {
      toast.error("Part Number is required");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/master-tables/${params.id}/rows`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentUser?.token}`,
        },
        body: JSON.stringify({
          partName: newPartName,
          partNumber: newPartNo,
          material: newMaterial,
          isBlueprint: true,
          selectedLoop
        }),
      });

      if (response.ok) {
        setNewPartNo("");
        setNewPartName("");
        setNewMaterial("");
        setSelectedLoop([]);
        setIsAddingPart(false);
        fetchTableData();
        toast.success("Row added successfully");
      } else {
        const data = await response.json();
        toast.error(data.message || "Error adding row");
      }
    } catch (error: any) {
      toast.error(error.message || "Error adding row");
    }
  };

  const toggleDeptInLoop = (deptId: string) => {
    setSelectedLoop(prev => [...prev, deptId]);
  };

  const formatDateCompact = (dateString?: string | Date) => {
    if (!dateString) return "--/--/--";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "--/--/--";
    const dd = date.getDate().toString().padStart(2, '0');
    const mm = (date.getMonth() + 1).toString().padStart(2, '0');
    const yy = date.getFullYear().toString().slice(-2);
    return `${dd}/${mm}/${yy}`;
  };

  const removeStepByIndex = (index: number) => {
    setSelectedLoop(prev => prev.filter((_, i) => i !== index));
  };

  const clearLoop = () => {
    setSelectedLoop([]);
  };

  const startEditing = (row: Row) => {
    setEditingRowId(row._id);
    setTempRowFields({
      partName: row.partName || "",
      partNumber: row.partNumber || "",
      material: row.material || "",
      heatNo: row.heatNo || "",
      selectedLoop: row.selectedLoop || []
    });
    // Map existing stage quantities to the temp edit data by INDEX
    const initialData: Record<string, string> = {};
    (row.stages || []).forEach((stage, index) => {
      initialData[index.toString()] = stage.outward?.qty?.toString() || "";
    });
    setTempRowData(initialData);
  };

  const cancelEditing = () => {
    setEditingRowId(null);
    setTempRowData({});
  };

  const saveRowChanges = async (rowId: string) => {
    setSavingRow(rowId);
    try {
      const response = await fetch(`${API_URL}/api/master-tables/rows/${rowId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentUser?.token}`,
        },
        body: JSON.stringify({
          ...tempRowFields,
          statusValues: tempRowData
        }),
      });

      if (response.ok) {
        fetchTableData(); // Refresh to get populated data
        setEditingRowId(null);
        toast.success("Row updated successfully");
      } else {
        toast.error("Failed to update row");
      }
    } catch (error) {
      toast.error("Network error");
    } finally {
      setSavingRow(null);
    }
  };

  const handleUpdateValue = (index: number, value: string) => {
    setTempRowData(prev => ({ ...prev, [index.toString()]: value }));
  };

  const handleDeleteRow = async (rowId: string) => {
    if (!window.confirm("Delete this row?")) return;

    try {
      const response = await fetch(`${API_URL}/api/master-tables/rows/${rowId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${currentUser?.token}`,
        },
      });

      if (response.ok) {
        setRows(prev => prev.filter(r => r._id !== rowId));
        toast.success("Row deleted");
      }
    } catch (error) {
      toast.error("Error deleting row");
    }
  };

  const filteredRows = rows.filter(row => {
    // Hide blueprints from the production table view
    if (row.isBlueprint) return false;

    const matchesSearch = row.partName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.partNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.heatNo?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPart = selectedPartFilter === "all" || row.partNumber === selectedPartFilter;

    return matchesSearch && matchesPart;
  });

  const uniqueParts = Array.from(
    new Map(rows.map(r => [r.partNumber, r.partName])).entries()
  ).map(([partNumber, partName]) => ({ partNumber, partName }))
    .sort((a, b) => a.partNumber.localeCompare(b.partNumber));

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!table) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/production-tables">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">{table.name}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative w-48 lg:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search heat no..."
                className="pl-9 h-9 bg-background border-primary/10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-48 lg:w-64">
              <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={filterOpen}
                    className="w-full h-9 justify-between bg-background border-primary/10 px-3 text-sm shadow-sm font-medium"
                  >
                    <span className="truncate">
                      {selectedPartFilter === "all"
                        ? "All Parts"
                        : uniqueParts.find((p) => p.partNumber === selectedPartFilter)?.partNumber || "Select Part..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-0 shadow-xl border-primary/10" align="start">
                  <Command>
                    <CommandInput placeholder="Search part..." className="h-8 text-xs" />
                    <CommandEmpty className="text-xs py-2 px-4 italic">No part found.</CommandEmpty>
                    <CommandGroup className="max-h-[220px] overflow-auto custom-scrollbar p-1">
                      <CommandItem
                        value="all"
                        onSelect={() => {
                          setSelectedPartFilter("all");
                          setFilterOpen(false);
                        }}
                        className="cursor-pointer py-1.5 px-2 rounded-sm"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-3.5 w-3.5 text-primary",
                            selectedPartFilter === "all" ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="font-bold text-xs">All Parts</span>
                      </CommandItem>
                      {uniqueParts.map((p) => (
                        <CommandItem
                          key={p.partNumber}
                          value={`${p.partNumber} ${p.partName}`}
                          onSelect={() => {
                            setSelectedPartFilter(p.partNumber);
                            setFilterOpen(false);
                          }}
                          className="cursor-pointer py-1.5 px-2 rounded-sm"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-3.5 w-3.5 text-primary",
                              selectedPartFilter === p.partNumber ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span className="font-bold text-xs">{p.partNumber}</span>
                            {p.partName && (
                              <span className="text-[9px] text-muted-foreground uppercase leading-none mt-0.5">{p.partName}</span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            {(currentUser?.role === "super-admin" || currentUser?.role === "admin") && (
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setIsAddingPart(!isAddingPart)}
                  variant={isAddingPart ? "ghost" : "default"}
                  size="sm"
                  className={cn(
                    "font-bold gap-2 shadow-sm transition-all",
                    isAddingPart ? "text-destructive hover:bg-destructive/10" : "bg-primary hover:bg-primary/90"
                  )}
                >
                  {isAddingPart ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {isAddingPart ? "Cancel" : "Add Part"}
                </Button>
              </div>
            )}
          </div>
        </div>

        <Card className="border-none shadow-xl overflow-hidden bg-card/50 backdrop-blur-sm">
          {(isAddingPart && (currentUser?.role === "super-admin" || currentUser?.role === "admin")) && (
            <CardHeader className="border-b bg-muted/20">
              <CardTitle className="text-sm font-bold flex items-center gap-2 mb-4">
                <Plus className="h-4 w-4 text-primary" />
                Add New Part
              </CardTitle>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Part Name</label>
                  <Input
                    placeholder="Part Name"
                    className="h-10 bg-background border-muted-foreground/20"
                    value={newPartName}
                    onChange={(e) => setNewPartName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Part No.</label>
                  <Input
                    placeholder="Part No."
                    className="h-10 bg-background border-muted-foreground/20"
                    value={newPartNo}
                    onChange={(e) => setNewPartNo(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Material</label>
                  <Input
                    placeholder="Material"
                    className="h-10 bg-background border-muted-foreground/20"
                    value={newMaterial}
                    onChange={(e) => setNewMaterial(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Loop Selection</label>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="h-10 w-full justify-between bg-background border-muted-foreground/20 overflow-hidden text-xs">
                          <span className="truncate">
                            {selectedLoop.length > 0
                              ? `${selectedLoop.length} Steps Sequence`
                              : "Add Steps..."}
                          </span>
                          <Plus className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search departments..." />
                          <CommandList>
                            <CommandEmpty>No department found.</CommandEmpty>
                            <CommandGroup heading="Available Departments">
                              {table.departments.map((dept) => {
                                const isDuplicate = selectedLoop.length > 0 && selectedLoop[selectedLoop.length - 1] === dept._id;
                                return (
                                  <CommandItem
                                    key={dept._id}
                                    value={dept.name}
                                    disabled={isDuplicate}
                                    onSelect={() => {
                                      if (isDuplicate) {
                                        toast.error(`Cannot select ${dept.name} twice consecutively`);
                                        return;
                                      }
                                      toggleDeptInLoop(dept._id);
                                    }}
                                    className={cn(isDuplicate && "opacity-50 cursor-not-allowed")}
                                  >
                                    <div className="flex flex-col">
                                      <span className={cn("font-medium", isDuplicate && "text-muted-foreground")}>{dept.name}</span>
                                    </div>
                                    <Plus className="ml-auto h-3 w-3 opacity-50" />
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <Button size="default" onClick={handleAddRow} className="h-10 font-bold px-6 ml-2">
                      Add Row
                    </Button>
                  </div>
                </div>
              </div>

              {selectedLoop.length > 0 && (
                <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/10 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between mb-3 text-[10px] font-bold uppercase text-primary/60 tracking-wider">
                    <div className="flex items-center gap-2">
                      <Settings className="h-3 w-3" />
                      Production Loop Preview
                    </div>
                    <button onClick={clearLoop} className="hover:text-red-500 transition-colors uppercase">Clear All</button>
                  </div>
                  <div className="flex flex-wrap items-center gap-y-4 gap-x-2">
                    {selectedLoop.map((deptId, index) => {
                      const dept = table.departments.find(d => d._id === deptId);
                      return (
                        <div key={`${deptId}-${index}`} className="flex items-center gap-2 group">
                          <div className="flex items-center h-8 bg-background border rounded-lg shadow-sm border-primary/20 hover:border-primary transition-all pr-0 overflow-hidden">
                            <div className="bg-primary text-primary-foreground px-2 h-full flex items-center justify-center text-[10px] font-bold border-r">
                              S-{new Date().getDate().toString().padStart(2, '0')}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-{selectedLoop.slice(0, index).filter(id => id === deptId).length + 1}
                            </div>
                            <div className="px-3 text-xs font-semibold whitespace-nowrap">
                              {dept?.name || "Unknown"}
                            </div>
                            <button
                              onClick={() => removeStepByIndex(index)}
                              className="h-full px-2 hover:bg-red-50 text-muted-foreground hover:text-red-500 border-l transition-colors"
                              title="Remove step"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                          {index < selectedLoop.length - 1 && (
                            <div className="text-muted-foreground/40 font-bold">
                              →
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardHeader>
          )}
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[150px] border-r py-4 font-bold text-xs uppercase tracking-wider">Part Name</TableHead>
                  <TableHead className="w-[150px] border-r py-4 font-bold text-xs uppercase tracking-wider">Part No.</TableHead>
                  <TableHead className="w-[150px] border-r py-4 font-bold text-xs uppercase tracking-wider">Material</TableHead>
                  <TableHead className="w-[150px] border-r py-4 font-bold text-xs uppercase tracking-wider">Heat No.</TableHead>
                  {table.departments.map(dept => (
                    <TableHead key={dept._id} className="text-center min-w-[150px] border-r py-4 font-bold text-xs uppercase tracking-wider">
                      {dept.name}
                    </TableHead>
                  ))}
                  <TableHead className="w-[120px] text-center py-4 font-bold text-xs uppercase tracking-wider">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={table.departments.length + 5} className="h-32 text-center text-muted-foreground italic">
                      {searchTerm ? "No matching parts found." : "No part numbers added yet."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map(row => {
                    const isEditing = editingRowId === row._id;
                    const loop = row.selectedLoop || [];

                    return (
                      <TableRow key={row._id} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="border-r font-medium">
                          {isEditing ? (
                            <Input
                              value={tempRowFields.partName}
                              onChange={(e) => setTempRowFields(prev => ({ ...prev, partName: e.target.value }))}
                              className="h-8 text-xs"
                            />
                          ) : (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="truncate max-w-[100px]" title={row.partName}>{row.partName || "-"}</span>
                              {row.isBlueprint && (
                                <Badge className="text-[8px] h-3.5 px-1 bg-primary/10 text-primary border-primary/20 leading-none whitespace-nowrap">BLUEPRINT</Badge>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-bold border-r bg-muted/5 px-4 py-3">
                          {isEditing ? (
                            <Input
                              value={tempRowFields.partNumber}
                              onChange={(e) => setTempRowFields(prev => ({ ...prev, partNumber: e.target.value }))}
                              className="h-8 text-xs font-bold"
                            />
                          ) : row.partNumber}
                        </TableCell>
                        <TableCell className="border-r">
                          {isEditing ? (
                            <Input
                              value={tempRowFields.material}
                              onChange={(e) => setTempRowFields(prev => ({ ...prev, material: e.target.value }))}
                              className="h-8 text-xs"
                            />
                          ) : row.material || "-"}
                        </TableCell>
                        <TableCell className="border-r">
                          {isEditing ? (
                            <Input
                              value={tempRowFields.heatNo}
                              onChange={(e) => setTempRowFields(prev => ({ ...prev, heatNo: e.target.value }))}
                              className="h-8 text-xs"
                            />
                          ) : row.heatNo || "-"}
                        </TableCell>

                        {table.departments.map(dept => {
                          const deptStages = (row.stages || [])
                            .map((s, idx) => ({ ...s, index: idx, deptId: row.selectedLoop[idx] }))
                            .filter(s => s.deptId === dept._id);

                          const isInLoop = deptStages.length > 0;

                          return (
                            <TableCell key={dept._id} className={cn(
                              "p-0 border-r text-center align-middle relative",
                              !isInLoop && "bg-muted/10 opacity-40"
                            )}>
                              {!isInLoop ? (
                                <div className="text-[10px] text-muted-foreground font-light italic">Skipped</div>
                              ) : (
                                <div className="px-1 py-1 text-[11px] font-medium min-h-[50px] flex flex-col items-center justify-center gap-2 group/cell">
                                  {deptStages.map((stage, sIdx) => {
                                    const hasInward = stage.inward && stage.inward.receivedAt;

                                    return (
                                      <div key={stage.index} className={cn(
                                        "w-full flex flex-col items-center gap-1 py-1",
                                        sIdx > 0 && "border-t border-muted/30 pt-2"
                                      )}>
                                        {isEditing ? (
                                          <div className="flex flex-col gap-1 items-center pb-1">
                                            <div className="text-[9px] font-bold text-primary/60 bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10">
                                              ({formatDateCompact(stage.inward?.receivedAt)}) - ({formatDateCompact(stage.outward?.sentAt)})
                                            </div>
                                            <input
                                              className={cn(
                                                "w-full h-8 px-2 bg-primary/5 focus:bg-primary/10 transition-colors text-center border-none outline-none font-bold text-xs rounded",
                                                !hasInward && "opacity-30 cursor-not-allowed"
                                              )}
                                              placeholder={!hasInward ? "No In" : "Qty..."}
                                              value={tempRowData[stage.index.toString()] || ""}
                                              onChange={(e) => handleUpdateValue(stage.index, e.target.value)}
                                              disabled={!hasInward}
                                            />
                                          </div>
                                        ) : (
                                          stage.inward?.receivedAt ? (
                                            <div className="flex flex-col gap-1 items-center">
                                              <div className="flex items-center justify-center w-full px-2">
                                                <TooltipProvider>
                                                  <Tooltip delayDuration={300}>
                                                    <TooltipTrigger asChild>
                                                      <span className="text-[9px] font-bold text-primary/60 cursor-help hover:text-primary transition-colors">
                                                        Step {stage.index + 1}
                                                      </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" className="text-[10px] font-bold bg-primary text-primary-foreground border-none">
                                                      <div className="flex flex-col items-center gap-1">
                                                        <p className="opacity-80 uppercase text-[8px]">Timeline</p>
                                                        <p>({formatDateCompact(stage.inward?.receivedAt)}) - ({formatDateCompact(stage.outward?.sentAt)})</p>
                                                      </div>
                                                    </TooltipContent>
                                                  </Tooltip>
                                                </TooltipProvider>
                                              </div>
                                              <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full text-[9px] border border-blue-100">
                                                <ArrowDownCircle className="h-2.5 w-2.5" />
                                                <span>In: {stage.inward.qty}</span>
                                              </div>
                                              {stage.outward?.isCompleted ? (
                                                <>
                                                  <div className="flex items-center gap-1 bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full text-[9px] border border-green-100">
                                                    <ArrowUpCircle className="h-2.5 w-2.5" />
                                                    <span>Out: {stage.outward.qty}</span>
                                                  </div>
                                                  {stage.outward.reason && (
                                                    <TooltipProvider>
                                                      <Tooltip>
                                                        <TooltipTrigger asChild>
                                                          <Badge variant="outline" className="text-[8px] py-0 h-3.5 border-orange-200 text-orange-600 bg-orange-50/50 cursor-help max-w-[60px] truncate">
                                                            {stage.outward.reason}
                                                          </Badge>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="bottom" className="max-w-[200px] text-[10px]">
                                                          <p className="font-bold mb-1">Visit {sIdx + 1} Deficit Reason:</p>
                                                          <p className="italic">{stage.outward.reason}</p>
                                                        </TooltipContent>
                                                      </Tooltip>
                                                    </TooltipProvider>
                                                  )}
                                                </>
                                              ) : (
                                                <Badge variant="secondary" className="bg-orange-50 text-orange-600 border-none px-1.5 py-0 text-[8px]">Processing</Badge>
                                              )}
                                            </div>
                                          ) : (
                                            <span className="text-muted-foreground/30">—</span>
                                          )
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center px-4 py-2">
                          {(currentUser?.role === "super-admin" || currentUser?.role === "admin") ? (
                            <div className="flex items-center justify-center gap-1">
                              {isEditing ? (
                                <>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-9 w-9 text-orange-600 hover:text-orange-700 hover:bg-orange-50" title="Edit Loop">
                                        <Repeat className="h-4 w-4" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] p-2" align="end">
                                      <div className="space-y-4">
                                        <div className="flex items-center justify-between border-b pb-2">
                                          <h4 className="text-sm font-bold uppercase tracking-tight">Production Loop</h4>
                                          <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                                              setTempRowFields(prev => ({ ...prev, selectedLoop: [] }));
                                            }}>
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        </div>

                                        <div className="max-h-[150px] overflow-y-auto space-y-2 py-1 pr-1">
                                          {tempRowFields.selectedLoop.length === 0 ? (
                                            <div className="text-[10px] text-muted-foreground italic text-center py-4 bg-muted/20 rounded border-2 border-dashed">No steps selected</div>
                                          ) : (
                                            tempRowFields.selectedLoop.map((deptId, idx) => {
                                              const dept = table.departments.find(d => d._id === deptId);
                                              return (
                                                <div key={idx} className="flex items-center gap-2 bg-muted/30 p-1 rounded-lg border border-muted-foreground/10 pr-0 overflow-hidden">
                                                  <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground">{idx + 1}</Badge>
                                                  <span className="text-[11px] font-bold truncate flex-1">{dept?.name || "Unknown"}</span>
                                                  <button
                                                    onClick={() => {
                                                      const newLoop = tempRowFields.selectedLoop.filter((_, i) => i !== idx);
                                                      setTempRowFields(prev => ({ ...prev, selectedLoop: newLoop }));
                                                    }}
                                                    className="h-7 px-2 hover:bg-red-50 text-muted-foreground hover:text-red-500 border-l transition-colors"
                                                  >
                                                    <X className="h-3 w-3" />
                                                  </button>
                                                </div>
                                              )
                                            })
                                          )}
                                        </div>

                                        <Command className="border rounded-md">
                                          <CommandInput placeholder="Add step..." className="h-8 text-xs" />
                                          <CommandList className="max-h-[120px]">
                                            <CommandEmpty>No results.</CommandEmpty>
                                            <CommandGroup>
                                              {table.departments.map(dept => {
                                                const isLast = tempRowFields.selectedLoop.length > 0 && tempRowFields.selectedLoop[tempRowFields.selectedLoop.length - 1] === dept._id;
                                                return (
                                                  <CommandItem
                                                    key={dept._id}
                                                    disabled={isLast}
                                                    onSelect={() => {
                                                      if (isLast) {
                                                        toast.error(`Cannot select ${dept.name} twice consecutively`);
                                                        return;
                                                      }
                                                      const newLoop = [...tempRowFields.selectedLoop, dept._id];
                                                      setTempRowFields(prev => ({ ...prev, selectedLoop: newLoop }));
                                                    }}
                                                    className={cn("text-[10px] font-medium py-1", isLast && "opacity-50 cursor-not-allowed")}
                                                  >
                                                    <span className={isLast ? "text-muted-foreground" : ""}>{dept.name}</span>
                                                    <Plus className="ml-auto h-3 w-3" />
                                                  </CommandItem>
                                                )
                                              })}
                                            </CommandGroup>
                                          </CommandList>
                                        </Command>
                                      </div>
                                    </PopoverContent>
                                  </Popover>

                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 text-green-600 hover:text-green-700 hover:bg-green-50"
                                    onClick={() => saveRowChanges(row._id)}
                                    disabled={savingRow === row._id}
                                  >
                                    {savingRow === row._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={cancelEditing}
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 text-primary hover:bg-primary/10"
                                    onClick={() => startEditing(row)}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => handleDeleteRow(row._id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] font-medium opacity-50 uppercase tracking-tight">View Only</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
