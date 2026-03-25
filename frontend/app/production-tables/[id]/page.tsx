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
  ArrowUpCircle
} from "lucide-react";
import { API_URL } from "@/src/lib/api";
import Link from "next/link";

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
  partNumber: string;
  stages: Record<string, any>;
}

export default function TableViewPage() {
  const params = useParams();
  const { user: currentUser } = useAuth();
  const [table, setTable] = useState<MasterTable | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPartNo, setNewPartNo] = useState("");
  const [savingRow, setSavingRow] = useState<string | null>(null);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [tempRowData, setTempRowData] = useState<Record<string, string>>({});

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
    if (!newPartNo.trim()) return;

    try {
      const response = await fetch(`${API_URL}/api/master-tables/${params.id}/rows`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentUser?.token}`,
        },
        body: JSON.stringify({ partNumber: newPartNo }),
      });

      if (response.ok) {
        setNewPartNo("");
        fetchTableData();
        toast.success("Row added");
      }
    } catch (error) {
      toast.error("Error adding row");
    }
  };

  const startEditing = (row: Row) => {
    setEditingRowId(row._id);
    // Map existing stage quantities to the temp edit data if needed
    const initialData: Record<string, string> = {};
    Object.keys(row.stages || {}).forEach(deptId => {
      initialData[deptId] = row.stages[deptId]?.outward?.qty?.toString() || "";
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
        body: JSON.stringify({ statusValues: tempRowData }),
      });

      if (response.ok) {
        setRows(prev => prev.map(r => r._id === rowId ? { ...r, statusValues: tempRowData } : r));
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

  const handleUpdateValue = (deptId: string, value: string) => {
    setTempRowData(prev => ({ ...prev, [deptId]: value }));
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
          {currentUser?.role === "super-admin" && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5 px-3 py-1">
                Super Admin Access
              </Badge>
            </div>
          )}
        </div>

        <Card className="border-none shadow-xl overflow-hidden bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              Add Part Number
            </CardTitle>
            <div className="flex items-center gap-2">
              <Input 
                placeholder="Enter Part No." 
                className="w-48 h-10 bg-background border-muted-foreground/20" 
                value={newPartNo}
                onChange={(e) => setNewPartNo(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddRow()}
              />
              <Button size="default" onClick={handleAddRow} className="h-10 font-bold px-6">
                Add Row
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[200px] border-r py-4 font-bold text-xs uppercase tracking-wider">Part Number</TableHead>
                  {table.departments.map(dept => (
                    <TableHead key={dept._id} className="text-center min-w-[150px] border-r py-4 font-bold text-xs uppercase tracking-wider">
                      {dept.name}
                    </TableHead>
                  ))}
                  <TableHead className="w-[120px] text-center py-4 font-bold text-xs uppercase tracking-wider">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={table.departments.length + 2} className="h-32 text-center text-muted-foreground">
                      No part numbers added yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map(row => {
                    const isEditing = editingRowId === row._id;
                    return (
                      <TableRow key={row._id} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="font-bold border-r bg-muted/10 px-4 py-3">
                          {row.partNumber}
                        </TableCell>
                        {table.departments.map(dept => {
                          const stage = row.stages?.[dept._id];
                          return (
                            <TableCell key={dept._id} className="p-0 border-r text-center align-middle">
                              {isEditing ? (
                                <input 
                                  className="w-full h-full min-h-[50px] px-3 py-2 bg-primary/5 focus:bg-primary/10 transition-colors text-center border-none outline-none font-medium"
                                  placeholder="..."
                                  value={tempRowData[dept._id] || ""}
                                  onChange={(e) => handleUpdateValue(dept._id, e.target.value)}
                                  autoFocus={dept._id === table.departments[0]._id}
                                />
                              ) : (
                                <div className="px-3 py-2 text-[11px] font-medium min-h-[50px] flex flex-col items-center justify-center gap-1 group/cell">
                                  {stage?.inward?.qty ? (
                                    <div className="flex flex-col gap-1 items-center">
                                      <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">
                                        <ArrowDownCircle className="h-3 w-3" />
                                        <span>In: {stage.inward.qty}</span>
                                      </div>
                                      {stage.outward?.isCompleted ? (
                                        <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-100">
                                          <ArrowUpCircle className="h-3 w-3" />
                                          <span>Out: {stage.outward.qty}</span>
                                        </div>
                                      ) : (
                                        <Badge variant="secondary" className="bg-orange-50 text-orange-600 border-none px-2 py-0">Processing</Badge>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground/30">—</span>
                                  )}
                                </div>
                              )}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center px-4 py-2">
                          {currentUser?.role === "super-admin" ? (
                            <div className="flex items-center justify-center gap-1">
                              {isEditing ? (
                                <>
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
