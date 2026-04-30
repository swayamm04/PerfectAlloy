"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/src/context/AuthContext";
import { DashboardLayout } from "@/src/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  ClipboardList,
  Loader2,
  ArrowDownCircle,
  ArrowUpCircle,
  Search,
  Plus,
  Trash2,
  MoreHorizontal,
  Eye,
  ArrowRight,
  Clock
} from "lucide-react";
import { API_URL } from "@/src/lib/api";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuPortal
} from "@/src/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/src/components/ui/dialog";

interface Row {
  _id: string;
  partName: string;
  partNumber: string;
  material: string;
  heatNo: string;
  customerName?: string;
  isBlueprint?: boolean;
  currentDepartmentIndex: number;
  selectedLoop: any[];
  stages: any[];
  tableId: {
    _id: string;
    name: string;
    departments: string[];
  };
  createdAt?: string;
}

export default function TaskQueuePage() {
  const { user: currentUser } = useAuth();
  const [tasks, setTasks] = useState<Row[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [showRejections, setShowRejections] = useState(false);
  const [actionData, setActionData] = useState({
    qty: "",
    rejectionQty: "",
    operatorName: "",
    notes: "",
    reason: "",
    reasons: [""]
  });
  const [operatorSuggestions, setOperatorSuggestions] = useState<string[]>([]);
  const [showOperatorDropdown, setShowOperatorDropdown] = useState(false);

  const [isInwardDialogOpen, setIsInwardDialogOpen] = useState(false);
  const [isOutwardDialogOpen, setIsOutwardDialogOpen] = useState(false);
  const [isReasonsDialogOpen, setIsReasonsDialogOpen] = useState(false);
  const [isNewTaskDialogOpen, setIsNewTaskDialogOpen] = useState(false);

  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [candidateBlueprints, setCandidateBlueprints] = useState<any[]>([]);
  const [selectedBlueprintId, setSelectedBlueprintId] = useState("");
  const [newInwardQty, setNewInwardQty] = useState("");
  const [newHeatNo, setNewHeatNo] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [isInitializing, setIsInitializing] = useState(false);
  const [canInitialize, setCanInitialize] = useState(false);

  const fetchTasks = async () => {
    if (!currentUser) return;
    setFetching(true);
    try {
      const params = new URLSearchParams();
      if (selectedDeptId) params.append("departmentId", selectedDeptId);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await fetch(`${API_URL}/api/workflow/queue?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${currentUser?.token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setTasks(data);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setFetching(false);
      setLoading(false);
    }
  };

  const fetchOperatorSuggestions = async () => {
    if (!currentUser) return;
    const deptId = selectedDeptId || (typeof currentUser.department === 'object' ? (currentUser.department as any)._id : currentUser.department);
    if (!deptId) return;

    try {
      const response = await fetch(`${API_URL}/api/workflow/operators?departmentId=${deptId}`, {
        headers: {
          Authorization: `Bearer ${currentUser?.token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setOperatorSuggestions(data);
      }
    } catch (error) {
      console.error("Error fetching operators:", error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch(`${API_URL}/api/departments`, {
        headers: {
          Authorization: `Bearer ${currentUser?.token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setDepartments(data);
        if (currentUser?.role !== 'super-admin' && currentUser?.department) {
          const deptId = typeof currentUser.department === 'object' ? (currentUser.department as any)._id : currentUser.department;
          setSelectedDeptId(deptId);
        }
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  // No longer need manual fetchBlueprints as blueprints are included in fetchTasks response
  useEffect(() => {
    if (tasks.length > 0) {
      const myDeptId = selectedDeptId || (typeof currentUser?.department === 'string'
        ? currentUser.department
        : (currentUser?.department as any)?._id);

      if (!myDeptId) return;

      const blueprints = tasks.filter(t => {
        if (!t.isBlueprint) return false;
        const loop = t.selectedLoop || [];
        const firstDeptId = loop[0]?._id || loop[0];
        return firstDeptId?.toString() === myDeptId.toString();
      }).map(t => ({
        ...t,
        tableId: t.tableId?._id || t.tableId,
        tableName: t.tableId?.name || "Unknown Table"
      }));

      setCandidateBlueprints(blueprints);
      setCanInitialize(blueprints.length > 0);
    } else {
      setCandidateBlueprints([]);
      setCanInitialize(false);
    }
  }, [tasks, selectedDeptId, currentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchDepartments();
    }
  }, [currentUser]);

  // Blueprints are now synchronized with tasks
  // useEffect(() => {
  //   if (currentUser) {
  //     fetchBlueprints();
  //   }
  // }, [currentUser, selectedDeptId]);

  useEffect(() => {
    if (currentUser && (selectedDeptId || currentUser.role !== 'super-admin')) {
      fetchTasks();
      fetchOperatorSuggestions();
    }
  }, [selectedDeptId, startDate, endDate, currentUser]);

  const addReasonPoint = () => {
    setActionData(prev => ({
      ...prev,
      reasons: [...prev.reasons, ""]
    }));
  };

  const updateReasonPoint = (index: number, value: string) => {
    const newReasons = [...actionData.reasons];
    newReasons[index] = value;
    setActionData(prev => ({ ...prev, reasons: newReasons }));
  };

  const removeReasonPoint = (index: number) => {
    if (actionData.reasons.length <= 1) {
      setActionData(prev => ({ ...prev, reasons: [""] }));
      return;
    }
    const newReasons = actionData.reasons.filter((_, i) => i !== index);
    setActionData(prev => ({ ...prev, reasons: newReasons }));
  };

  const handleWorkflowAction = async (taskId: string, action: string) => {
    if (!taskId) return;
    setLoading(true);
    try {
      const endpoint = `${API_URL}/api/workflow/${action}/${taskId}`;
      const method = action === 'process' ? 'PUT' : 'POST';

      let payload: any = {};

      if (action === 'accept') {
        payload = { qty: Number(actionData.qty), source: 'External' };
      } else if (action === 'process') {
        payload = { status: actionData.qty || 'Processing', notes: actionData.notes };
      } else if (action === 'outward') {
        const finalReason = actionData.reasons
          .filter(r => r.trim() !== "")
          .map(r => `• ${r}`)
          .join('\n');

        payload = {
          qty: Number(actionData.qty),
          rejectionQty: Number(actionData.rejectionQty) || 0,
          operatorName: actionData.operatorName,
          reason: finalReason
        };
      }

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentUser?.token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success(`Task ${action} successfully completed`);
        setActionData({ qty: "", rejectionQty: "", operatorName: "", notes: "", reason: "", reasons: [""] });
        setActiveAction(null);
        setIsOutwardDialogOpen(false);
        setIsInwardDialogOpen(false);
        setShowOperatorDropdown(false);
        fetchTasks();
      } else {
        const error = await response.json();
        toast.error(error.message || `Failed to ${action} task`);
      }
    } catch (error) {
      console.error("Workflow error:", error);
      toast.error("Network error occurring");
    } finally {
      setLoading(false);
    }
  };

  const getDeptId = () => selectedDeptId || (typeof currentUser?.department === 'object' ? (currentUser.department as any)._id : currentUser?.department);

  const allStageTasks = tasks.flatMap(task => {
    const deptId = getDeptId();
    if (!deptId || !task.selectedLoop) return [];

    return task.stages.map((stage, index) => {
      const loopStage = task.selectedLoop[index];
      const loopDeptId = typeof loopStage === 'object' ? loopStage._id : loopStage;

      const visitNumber = task.selectedLoop.slice(0, index).filter(id => {
        const idStr = typeof id === 'object' ? id._id : id;
        return idStr?.toString() === loopDeptId?.toString();
      }).length + 1;

      const date = new Date(task.createdAt || new Date());
      const ddmm = `${date.getDate().toString().padStart(2, '0')}${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      const heatLabel = task.heatNo || `H-${ddmm}-${visitNumber}`;

      return {
        ...task,
        stage,
        stageIndex: index,
        visitNumber,
        slotLabel: heatLabel,
        isCurrentStage: task.currentDepartmentIndex === index,
        loopDeptId
      };
    }).filter(item => {
      return item.loopDeptId?.toString() === deptId.toString();
    });
  });

  const filteredTasks = allStageTasks.filter(t =>
    t.partNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.tableId?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const incoming = filteredTasks.filter(t => t.isCurrentStage && !t.stage.inward?.receivedAt && !t.isBlueprint);
  const inProgress = filteredTasks.filter(t => t.isCurrentStage && t.stage.inward?.receivedAt && !t.stage.outward?.isCompleted && !t.isBlueprint);
  const outwarded = filteredTasks.filter(t => t.stage.outward?.isCompleted && !t.isBlueprint);

  const inProcessRows = filteredTasks.filter(t => {
    if (!t.stage.inward?.receivedAt) return false;
    const inward = t.stage.inward.qty || 0;
    const outward = t.stage.outward?.qty || 0;
    const rejections = t.stage.outward?.rejectionQty || 0;
    const balance = inward - (outward + rejections);
    return balance > 0;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-card p-6 rounded-2xl shadow-sm border border-muted/20">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
              <ClipboardList className="h-8 w-8" />
              Task Queue
            </h1>
            <p className="text-muted-foreground text-sm">
              {currentUser?.role === 'super-admin'
                ? "Oversee production workflow across all departments"
                : "Manage production workflow tasks for your department"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {currentUser?.role === 'super-admin' && (
              <div className="flex items-center gap-2 min-w-[200px]">
                <Select value={selectedDeptId} onValueChange={setSelectedDeptId}>
                  <SelectTrigger className="h-11 bg-background border-primary/10">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept._id} value={dept._id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-background rounded-lg border border-primary/10 px-3 h-11">
                <Clock className="h-4 w-4 text-muted-foreground mr-2" />
                <input
                  type="date"
                  className="bg-transparent border-none text-sm outline-none"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <span className="mx-2 text-muted-foreground">to</span>
                <input
                  type="date"
                  className="bg-transparent border-none text-sm outline-none"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search part or table..."
                className="pl-10 h-11 bg-background border-primary/10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {fetching && (
          <div className="fixed top-20 right-8 z-50">
            <div className="bg-primary/90 text-primary-foreground px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-bounce">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs font-bold">Updating...</span>
            </div>
          </div>
        )}

        <Tabs defaultValue="incoming" className="w-full space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-[800px] h-12 bg-muted/50 p-1">
            <TabsTrigger value="incoming" className="rounded-md data-[state=active]:bg-background">
              Incoming <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700">{incoming.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="inprogress" className="rounded-md data-[state=active]:bg-background">
              In Progress <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-700">{inProgress.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="completed" className="rounded-md data-[state=active]:bg-background">
              Completed <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700">{outwarded.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="inprocess-table" className="rounded-md data-[state=active]:bg-background">
              Balance <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-700">{inProcessRows.length}</Badge>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="incoming" className="animate-in slide-in-from-left-4 duration-300">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-muted-foreground uppercase flex items-center gap-2">
                <ArrowDownCircle className="h-4 w-4 text-blue-500" />
                Available for Inward
              </h3>
              {canInitialize && (
                <Button
                  size="sm"
                  className="gap-2 bg-blue-600 hover:bg-blue-700 font-bold h-9 shadow-md transition-all active:scale-95"
                  onClick={() => setIsNewTaskDialogOpen(true)}
                  disabled={currentUser?.role === 'super-admin'}
                >
                  <Plus className="h-4 w-4" />
                  New Manual Inward
                </Button>
              )}
            </div>

            <Card className="border-none shadow-xl">
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="pl-6 font-bold py-4">Part</TableHead>
                      <TableHead className="font-bold uppercase text-[10px] tracking-wider">Heat No.</TableHead>
                      <TableHead className="font-bold uppercase text-[10px] tracking-wider">Journey</TableHead>
                      {currentUser?.role === 'super-admin' && <TableHead className="font-bold">Step</TableHead>}
                      <TableHead className="font-bold">Available Qty</TableHead>
                      <TableHead className="pr-6 text-right font-bold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incoming.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={currentUser?.role === 'super-admin' ? 6 : 5} className="h-40 text-center text-muted-foreground italic">No incoming tasks.</TableCell>
                      </TableRow>
                    ) : (
                      incoming.map(task => {
                        const prevQty = task.stageIndex > 0 ? task.stages[task.stageIndex - 1]?.outward?.qty : "-";

                        return (
                          <TableRow key={`${task._id}-${task.stageIndex}`} className="hover:bg-muted/30 group font-medium">
                            <TableCell className="pl-6 py-4">
                              <div className="flex flex-col">
                                <span className="font-bold font-mono text-primary text-sm">{task.partNumber}</span>
                                <span className="text-[10px] text-muted-foreground font-semibold">{task.partName || "-"}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-bold border-primary/20 bg-primary/5 text-primary text-[10px]">
                                {task.slotLabel}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-0.5 max-w-[150px]">
                                <span className="text-[9px] font-bold text-muted-foreground/60 uppercase leading-none truncate">From: {task.selectedLoop[task.stageIndex - 1]?.name || "Initial Entry"}</span>
                                <span className="text-[11px] font-bold text-destructive leading-tight truncate">To: {task.selectedLoop[task.stageIndex + 1]?.name || "Final Delivery"}</span>
                              </div>
                            </TableCell>
                            {currentUser?.role === 'super-admin' && (
                              <TableCell>
                                <Badge variant="secondary" className="text-[10px] bg-primary/5 text-primary border-primary/10 font-bold">
                                  Step {task.stageIndex + 1}
                                </Badge>
                              </TableCell>
                            )}
                            <TableCell className="text-sm font-semibold">
                              {prevQty !== "-" ? (
                                <Badge className="bg-blue-100 text-blue-700 border-none font-bold shadow-sm h-6">
                                  {prevQty}
                                </Badge>
                              ) : "-"}
                            </TableCell>
                            <TableCell className="pr-6 text-right">
                              <Button
                                size="sm"
                                className="font-bold h-9 bg-primary hover:bg-primary/90 shadow-sm hover:scale-105 transition-transform"
                                disabled={currentUser?.role === 'super-admin'}
                                onClick={() => {
                                  setSelectedTask(task);
                                  setActionData({ qty: prevQty !== "-" ? prevQty.toString() : "", rejectionQty: "", operatorName: "", notes: "", reason: "", reasons: [""] });
                                  setIsInwardDialogOpen(true);
                                }}
                              >
                                Accept Inward
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inprogress" className="animate-in slide-in-from-left-4 duration-300">
            <Card className="border-none shadow-xl">
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="pl-6 font-bold py-4">Part</TableHead>
                      <TableHead className="font-bold uppercase text-[10px] tracking-wider">Heat No.</TableHead>
                      <TableHead className="font-bold uppercase text-[10px] tracking-wider">Journey</TableHead>
                      {currentUser?.role === 'super-admin' && <TableHead className="font-bold">Step</TableHead>}
                      <TableHead className="font-bold">Inward Qty</TableHead>
                      <TableHead className="pr-6 text-right font-bold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inProgress.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={currentUser?.role === 'super-admin' ? 6 : 5} className="h-40 text-center text-muted-foreground italic">No tasks in progress.</TableCell>
                      </TableRow>
                    ) : (
                      inProgress.map(task => {
                        const prevQty = task.stageIndex > 0 ? task.stages[task.stageIndex - 1]?.outward?.qty : null;

                        return (
                          <TableRow key={`${task._id}-${task.stageIndex}`} className="hover:bg-muted/30 group font-medium">
                            <TableCell className="pl-6 py-4">
                              <div className="flex flex-col">
                                <span className="font-bold font-mono text-primary text-sm">{task.partNumber}</span>
                                <span className="text-[10px] text-muted-foreground font-semibold">{task.partName || "-"}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-bold border-primary/20 bg-primary/5 text-primary text-[10px]">
                                {task.slotLabel}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-0.5 max-w-[150px]">
                                <span className="text-[9px] font-bold text-muted-foreground/60 uppercase leading-none truncate">From: {task.selectedLoop[task.stageIndex - 1]?.name || "Initial"}</span>
                                <span className="text-[11px] font-bold text-primary leading-tight truncate">To: {task.selectedLoop[task.stageIndex + 1]?.name || "Delivery"}</span>
                              </div>
                            </TableCell>
                            {currentUser?.role === 'super-admin' && (
                              <TableCell>
                                <Badge variant="secondary" className="text-[10px] bg-primary/5 text-primary border-primary/10 font-bold">
                                  Step {task.stageIndex + 1}
                                </Badge>
                              </TableCell>
                            )}
                            <TableCell className="text-sm font-semibold">
                              {task.stage?.inward?.qty}
                            </TableCell>
                            <TableCell className="pr-6 text-right">
                              <Button
                                size="sm"
                                className="font-bold h-9 bg-green-600 hover:bg-green-700 shadow-sm hover:scale-105 transition-transform"
                                disabled={currentUser?.role === 'super-admin'}
                                onClick={() => {
                                  setSelectedTask(task);
                                  setActionData({ qty: "", rejectionQty: "", operatorName: "", notes: "", reason: "", reasons: [""] });
                                  setShowRejections(false);
                                  setIsOutwardDialogOpen(true);
                                }}
                              >
                                Record Outward
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="completed" className="animate-in slide-in-from-left-4 duration-300">
            <Card className="border-none shadow-xl">
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="pl-6 font-bold py-4">Part</TableHead>
                      <TableHead className="font-bold uppercase text-[10px] tracking-wider">Heat No.</TableHead>
                      <TableHead className="font-bold uppercase text-[10px] tracking-wider">Journey</TableHead>
                      <TableHead className="font-bold">Prev. Sent</TableHead>
                      <TableHead className="font-bold">Open Stock</TableHead>
                      <TableHead className="font-bold">Inward</TableHead>
                      <TableHead className="font-bold">Cum. Inward</TableHead>
                      <TableHead className="font-bold">Outward</TableHead>
                      <TableHead className="font-bold">Cum. Outward</TableHead>
                      <TableHead className="font-bold">Balance</TableHead>
                      <TableHead className="font-bold">Date</TableHead>
                      <TableHead className="font-bold">Status</TableHead>
                      <TableHead className="pr-6 text-right font-bold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {outwarded.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={13} className="h-40 text-center text-muted-foreground italic">No historical records found for this department.</TableCell>
                      </TableRow>
                    ) : (
                      outwarded.map(task => {
                        const inward = task.stage?.inward?.qty || 0;
                        const outward = task.stage?.outward?.qty || 0;
                        const rejections = task.stage?.outward?.rejectionQty || 0;
                        const balance = inward - (outward + rejections);

                        const openStock = task.stageIndex === 0 ? inward : 0;
                        const currentStages = task.stages.slice(0, task.stageIndex + 1);
                        const cumInward = currentStages.reduce((sum, s) => sum + (s.inward?.qty || 0), 0);
                        const cumOutward = currentStages.reduce((sum, s) => sum + (s.outward?.qty || 0), 0);
                        const prevSent = task.stageIndex > 0 ? task.stages[task.stageIndex - 1]?.outward?.qty : "-";

                        return (
                          <TableRow key={`${task._id}-${task.stageIndex}`} className="hover:bg-muted/30">
                            <TableCell className="pl-6 py-4">
                              <div className="flex flex-col">
                                <span className="font-bold font-mono text-primary text-sm">{task.partNumber}</span>
                                <span className="text-[10px] text-muted-foreground font-semibold">{task.partName || "-"}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-bold border-primary/20 bg-primary/5 text-primary text-[10px]">
                                {task.slotLabel}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-0.5 max-w-[150px]">
                                {currentUser?.role === 'super-admin' && (
                                  <span className="text-[9px] font-bold text-muted-foreground/60 uppercase leading-none truncate">Step {task.stageIndex + 1}</span>
                                )}
                                <span className="text-[11px] font-bold text-primary leading-tight truncate">To: {task.selectedLoop[task.stageIndex + 1]?.name || "Delivery"}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium text-muted-foreground text-sm">{prevSent}</TableCell>
                            <TableCell className="font-medium text-muted-foreground text-sm">{openStock}</TableCell>
                            <TableCell className="text-sm font-semibold">{task.stage?.inward?.qty}</TableCell>
                            <TableCell className="font-bold text-blue-600/80 text-sm">{cumInward}</TableCell>
                            <TableCell className="text-sm font-semibold">{task.stage?.outward?.qty}</TableCell>
                            <TableCell className="font-bold text-green-600/80 text-sm">{cumOutward}</TableCell>
                            <TableCell className={cn(
                              "font-black text-sm",
                              balance > 0 ? "text-orange-600" : "text-primary"
                            )}>
                              {balance}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-[10px]">
                              {task.stage?.outward?.sentAt && new Date(task.stage.outward.sentAt).toLocaleDateString('en-GB')}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge className="bg-green-100 text-green-700 border-none text-[10px] font-bold">FORWARDED</Badge>
                            </TableCell>
                            <TableCell className="pr-6 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" type="button" className="h-8 w-8 opacity-50 hover:opacity-100 transition-opacity">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuPortal>
                                  <DropdownMenuContent align="end" className="w-40 border-primary/10 shadow-lg">
                                    <DropdownMenuLabel className="text-[10px] font-bold uppercase text-muted-foreground/50">Actions</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-xs font-bold gap-2 cursor-pointer"
                                      onSelect={(e) => {
                                        e.preventDefault();
                                        setSelectedTask(task);
                                        setIsReasonsDialogOpen(true);
                                      }}
                                    >
                                      <Eye className="h-3.5 w-3.5 text-primary/70" />
                                      View Reasons
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenuPortal>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inprocess-table" className="animate-in slide-in-from-left-4 duration-300">
            <Card className="border-none shadow-xl">
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="pl-6 font-bold py-4">Part</TableHead>
                      <TableHead className="font-bold uppercase text-[10px] tracking-wider">Heat No.</TableHead>
                      {currentUser?.role === 'super-admin' && (
                        <TableHead className="font-bold uppercase text-[10px] tracking-wider">Journey</TableHead>
                      )}
                      <TableHead className="font-bold">Inward</TableHead>
                      <TableHead className="font-bold">Outward</TableHead>
                      <TableHead className="font-bold">Rejections</TableHead>
                      <TableHead className="font-bold">Date</TableHead>
                      <TableHead className="text-right font-bold">Balance</TableHead>
                      <TableHead className="pr-6 text-right font-bold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inProcessRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={currentUser?.role === 'super-admin' ? 9 : 8} className="h-40 text-center text-muted-foreground italic">No tasks in process.</TableCell>
                      </TableRow>
                    ) : (
                      inProcessRows.map(task => {
                        const inward = task.stage?.inward?.qty || 0;
                        const outward = task.stage?.outward?.qty || 0;
                        const rejections = task.stage?.outward?.rejectionQty || 0;
                        const balance = inward - (outward + rejections);

                        return (
                          <TableRow key={`${task._id}-${task.stageIndex}`} className="hover:bg-muted/30 group">
                            <TableCell className="pl-6 py-4">
                              <div className="flex flex-col">
                                <span className="font-bold font-mono text-primary text-sm">{task.partNumber}</span>
                                <span className="text-[10px] text-muted-foreground font-semibold">{task.partName || "-"}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-bold border-primary/20 bg-primary/5 text-primary text-[10px]">
                                {task.slotLabel}
                              </Badge>
                            </TableCell>
                            {currentUser?.role === 'super-admin' && (
                              <TableCell>
                                <div className="flex flex-col gap-0.5 max-w-[150px]">
                                  <span className="text-[9px] font-bold text-muted-foreground/60 uppercase leading-none truncate">Step {task.stageIndex + 1}</span>
                                  <span className="text-[11px] font-bold text-primary leading-tight truncate">At: {task.selectedLoop[task.stageIndex]?.name || "Process"}</span>
                                </div>
                              </TableCell>
                            )}
                            <TableCell className="text-sm font-semibold">{inward}</TableCell>
                            <TableCell className="text-sm font-semibold text-muted-foreground">{outward}</TableCell>
                            <TableCell className="text-sm font-semibold text-red-500/70">{rejections}</TableCell>
                            <TableCell className="text-muted-foreground text-[10px]">
                              {task.stage?.inward?.receivedAt && new Date(task.stage.inward.receivedAt).toLocaleDateString('en-GB')}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge className="bg-orange-100 text-orange-700 border-none font-black text-xs px-3 shadow-inner">
                                {balance}
                              </Badge>
                            </TableCell>
                            <TableCell className="pr-6 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" type="button" className="h-8 w-8 opacity-50 group-hover:opacity-100 transition-opacity">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuPortal>
                                  <DropdownMenuContent align="end" className="w-40 border-primary/10 shadow-lg">
                                    <DropdownMenuLabel className="text-[10px] font-bold uppercase text-muted-foreground/50">Actions</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-xs font-bold gap-2 cursor-pointer"
                                      onSelect={(e) => {
                                        e.preventDefault();
                                        setSelectedTask(task);
                                        setIsReasonsDialogOpen(true);
                                      }}
                                    >
                                      <Eye className="h-3.5 w-3.5 text-primary/70" />
                                      View Reasons
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-xs font-bold gap-2 cursor-pointer text-green-600 hover:text-green-700 hover:bg-green-50"
                                      onSelect={(e) => {
                                        e.preventDefault();
                                        setSelectedTask(task);
                                        setActionData({ qty: "", rejectionQty: "", operatorName: "", notes: "", reason: "", reasons: [""] });
                                        setShowRejections(false);
                                        setIsOutwardDialogOpen(true);
                                      }}
                                    >
                                      <ArrowRight className="h-3.5 w-3.5" />
                                      Record Outward
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenuPortal>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Initialize Inward Dialog */}
        <Dialog open={isInwardDialogOpen} onOpenChange={setIsInwardDialogOpen}>
          <DialogContent
            className="max-w-md border-primary/20 shadow-2xl overflow-hidden p-0"
            onCloseAutoFocus={(e) => {
              document.body.style.pointerEvents = "";
            }}
          >
            <div className="bg-primary/5 p-6 border-b border-primary/10 flex items-center justify-between">
              <div>
                <DialogTitle className="text-primary flex items-center gap-2">
                  <ArrowDownCircle className="h-5 w-5 text-blue-600" />
                  Initialize Inward
                </DialogTitle>
                <DialogDescription className="mt-1 text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                  Part: {selectedTask?.partNumber}
                </DialogDescription>
              </div>
              <Badge className="bg-blue-100 text-blue-700 font-bold border-none h-fit">
                Expected: {selectedTask?.stageIndex > 0 ? selectedTask?.stages[selectedTask.stageIndex - 1]?.outward?.qty : "-"}
              </Badge>
            </div>

            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Inward Quantity</label>
                <Input
                  type="number"
                  placeholder="Enter Qty"
                  value={actionData.qty}
                  onChange={(e) => setActionData({ ...actionData, qty: e.target.value })}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  className="h-12 text-lg font-bold bg-background/50 focus:border-primary/30"
                  autoFocus
                />
              </div>
            </div>

            <DialogFooter className="p-6 bg-muted/20 border-t border-primary/5 sm:justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsInwardDialogOpen(false)} className="font-bold">Cancel</Button>
              <Button
                className="bg-primary hover:bg-primary/90 font-bold px-8"
                disabled={loading || !actionData.qty || Number(actionData.qty) <= 0}
                onClick={() => handleWorkflowAction(selectedTask?._id, 'accept')}
              >
                Accept Task
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reasons Dialog */}
        <Dialog open={isReasonsDialogOpen} onOpenChange={setIsReasonsDialogOpen}>
          <DialogContent
            className="max-w-md border-primary/20 shadow-2xl"
            onCloseAutoFocus={(e) => {
              document.body.style.pointerEvents = "";
            }}
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-primary">
                <Eye className="h-5 w-5" />
                Production Reasons
              </DialogTitle>
              <DialogDescription className="text-xs font-medium font-mono uppercase tracking-wider text-muted-foreground">
                {selectedTask?.partNumber} • Step {selectedTask?.stageIndex + 1}
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <div className="bg-muted/30 rounded-xl p-6 border border-primary/5 min-h-[100px] flex flex-col gap-3">
                {selectedTask?.stage?.outward?.reason ? (
                  selectedTask.stage.outward.reason.split("\n").map((line: string, i: number) => (
                    <div key={i} className="flex gap-3 text-sm font-medium text-primary/80 animate-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${i * 100}ms` }}>
                      <div className="h-1.5 w-1.5 rounded-full bg-primary/40 mt-1.5 shrink-0" />
                      <p className="leading-tight">{line.replace("•", "").trim()}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground italic text-sm py-4">No reason points recorded for this production stage.</p>
                )}
              </div>
            </div>

            <DialogFooter className="sm:justify-end">
              <Button variant="ghost" onClick={() => setIsReasonsDialogOpen(false)} className="font-bold border-primary/10">Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Outward Dialog (Table version) */}
        <Dialog open={isOutwardDialogOpen} onOpenChange={setIsOutwardDialogOpen}>
          <DialogContent
            className="max-w-md border-orange-200 shadow-2xl overflow-hidden p-0"
            onCloseAutoFocus={(e) => {
              document.body.style.pointerEvents = "";
            }}
          >
            <div className="bg-orange-50/50 p-6 border-b border-orange-100 flex items-center justify-between">
              <div>
                <DialogTitle className="text-primary flex items-center gap-2">
                  <ArrowUpCircle className="h-5 w-5 text-green-600" />
                  Record Outward
                </DialogTitle>
                <DialogDescription className="mt-1 text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                  Part: {selectedTask?.partNumber}
                </DialogDescription>
              </div>
              <Badge className="bg-orange-100 text-orange-700 font-bold border-none h-fit">
                Balance: {(selectedTask?.stage?.inward?.qty || 0) - (selectedTask?.stage?.outward?.qty || 0) - (selectedTask?.stage?.outward?.rejectionQty || 0)}
              </Badge>
            </div>

            <div className="p-6 space-y-5">
              <div className="space-y-2 relative">
                <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Operator Name</label>
                <Input
                  placeholder="Operator Name"
                  value={actionData.operatorName}
                  onChange={(e) => {
                    setActionData({ ...actionData, operatorName: e.target.value });
                    setShowOperatorDropdown(true);
                  }}
                  onFocus={() => setShowOperatorDropdown(true)}
                  onBlur={() => setTimeout(() => setShowOperatorDropdown(false), 200)}
                  className="h-12 font-medium bg-background/50 focus:border-primary/30"
                />
                {showOperatorDropdown && actionData.operatorName.trim().length > 0 && operatorSuggestions.filter(name => name.toLowerCase().includes(actionData.operatorName.toLowerCase())).length > 0 && (
                  <div className="absolute top-[68px] left-0 w-full z-50 bg-background border border-primary/10 rounded-md shadow-lg max-h-[150px] overflow-y-auto">
                    {operatorSuggestions.filter(name => name.toLowerCase().includes(actionData.operatorName.toLowerCase())).map((name) => (
                      <div
                        key={name}
                        className="px-4 py-3 text-sm cursor-pointer hover:bg-muted font-medium transition-colors border-b last:border-0 border-primary/5"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setActionData({ ...actionData, operatorName: name });
                          setShowOperatorDropdown(false);
                        }}
                      >
                        {name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Outward Quantity</label>
                <Input
                  type="number"
                  placeholder="Enter Qty"
                  value={actionData.qty}
                  onChange={(e) => setActionData({ ...actionData, qty: e.target.value })}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  className={cn(
                    "h-12 text-lg font-bold bg-background/50",
                    Number(actionData.qty) > ((selectedTask?.stage?.inward?.qty || 0) - (selectedTask?.stage?.outward?.qty || 0) - (selectedTask?.stage?.outward?.rejectionQty || 0)) ? "border-destructive ring-destructive/20 focus-visible:ring-destructive" : "focus:border-primary/30"
                  )}
                />
              </div>

              <div className="flex items-center justify-between bg-muted/30 p-3 rounded-lg border border-primary/5">
                <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                  Include Rejections?
                  <Badge variant="outline" className="text-[8px] h-4 px-1 leading-none bg-background">Loss Protection</Badge>
                </Label>
                <Switch
                  checked={showRejections}
                  onCheckedChange={(val) => {
                    setShowRejections(val);
                    if (!val) setActionData(prev => ({ ...prev, rejectionQty: "", reasons: [""] }));
                  }}
                />
              </div>

              {showRejections && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Rejection Quantity</label>
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={actionData.rejectionQty}
                      onChange={(e) => setActionData({ ...actionData, rejectionQty: e.target.value })}
                      onWheel={(e) => (e.target as HTMLInputElement).blur()}
                      className="h-10 border-orange-200 bg-background/50"
                    />
                  </div>

                  <div className="space-y-3 pt-1 border-t border-dashed border-muted-foreground/10">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase text-muted-foreground/70 tracking-widest">Reason Points</label>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px] font-bold text-primary hover:bg-primary/5 gap-1"
                        onClick={addReasonPoint}
                      >
                        <Plus className="h-3 w-3" /> Add Point
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-1">
                      {actionData.reasons.map((point, idx) => (
                        <div key={idx} className="flex gap-2">
                          <Input
                            placeholder={`Point ${idx + 1}...`}
                            value={point}
                            onChange={(e) => updateReasonPoint(idx, e.target.value)}
                            className="h-9 text-xs"
                          />
                          {actionData.reasons.length > 1 && (
                            <Button size="icon" variant="ghost" onClick={() => removeReasonPoint(idx)} className="h-9 w-9 text-pink-500">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="p-6 bg-muted/20 border-t border-primary/5 sm:justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsOutwardDialogOpen(false)} className="font-bold">Cancel</Button>
              <Button
                className="bg-green-600 hover:bg-green-700 font-bold px-8"
                disabled={
                  loading ||
                  !actionData.qty ||
                  Number(actionData.qty) <= 0 ||
                  (Number(actionData.qty) + (Number(actionData.rejectionQty) || 0)) >
                  ((selectedTask?.stage?.inward?.qty || 0) - (selectedTask?.stage?.outward?.qty || 0) - (selectedTask?.stage?.outward?.rejectionQty || 0))
                }
                onClick={() => handleWorkflowAction(selectedTask?._id, 'outward')}
              >
                Confirm Forward
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Manual Inward Dialog */}
        <Dialog open={isNewTaskDialogOpen} onOpenChange={setIsNewTaskDialogOpen}>
          <DialogContent
            className="max-w-md border-blue-200 shadow-2xl p-0 overflow-hidden"
            onCloseAutoFocus={() => { document.body.style.pointerEvents = ""; }}
          >
            <div className="bg-blue-50/50 p-6 border-b border-blue-100 flex items-center justify-between">
              <div>
                <DialogTitle className="text-primary flex items-center gap-2">
                  <Plus className="h-5 w-5 text-blue-600" />
                  Initialize New Production
                </DialogTitle>
                <DialogDescription className="mt-1 text-[10px] font-black uppercase text-muted-foreground tracking-widest leading-none">
                  Available for your department
                </DialogDescription>
              </div>
              <Badge className="bg-blue-100/50 text-blue-700 font-bold border-none h-fit">
                {candidateBlueprints.length} Options
              </Badge>
            </div>

            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Select Product</label>
                <Select value={selectedBlueprintId} onValueChange={setSelectedBlueprintId}>
                  <SelectTrigger className="h-12 bg-background/50 border-blue-100 focus:ring-blue-200 font-medium">
                    <SelectValue placeholder={candidateBlueprints.length > 0 ? "Pick a product..." : "No products available"} />
                  </SelectTrigger>
                  <SelectContent>
                    {candidateBlueprints.length === 0 ? (
                      <div className="p-4 text-xs text-center text-muted-foreground italic">
                        No part definitions (blueprints) found.<br />
                        Add parts in <span className="font-bold">Production Tables</span> first.
                      </div>
                    ) : (
                      candidateBlueprints.map(bp => (
                        <SelectItem key={bp._id} value={bp._id} className="text-xs font-bold py-3">
                          <div className="flex flex-col">
                            <span className="font-mono text-primary">{bp.partNumber}</span>
                            <span className="text-[10px] text-muted-foreground">{bp.partName} • {bp.tableName}</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Heat No.</label>
                <Input
                  placeholder="Heat No."
                  value={newHeatNo}
                  onChange={(e) => setNewHeatNo(e.target.value)}
                  className="h-12 bg-background/50 border-blue-100 font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Customer Name (Optional)</label>
                <Input
                  placeholder="Customer Name"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="h-12 bg-background/50 border-blue-100 font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Initial Quantity</label>
                <Input
                  type="number"
                  placeholder="Enter Qty"
                  value={newInwardQty}
                  onChange={(e) => setNewInwardQty(e.target.value)}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  className="h-12 text-lg font-bold bg-background/50 border-blue-100"
                />
              </div>
            </div>

            <DialogFooter className="bg-muted/30 p-4 border-t gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => setIsNewTaskDialogOpen(false)} disabled={isInitializing} className="font-bold">Cancel</Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 font-bold px-8 shadow-lg shadow-blue-200"
                onClick={async () => {
                  if (!selectedBlueprintId || !newInwardQty) {
                    toast.error("Please select product and quantity");
                    return;
                  }
                  setIsInitializing(true);
                  try {
                    const blueprint = candidateBlueprints.find(b => b._id === selectedBlueprintId);
                    if (!blueprint) return;

                    // 1. Create a NEW ROW for this batch (Cloning)
                    const createRes = await fetch(`${API_URL}/api/master-tables/${typeof blueprint.tableId === 'object' ? blueprint.tableId._id : blueprint.tableId}/rows`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${currentUser?.token}`,
                      },
                      body: JSON.stringify({
                        partName: blueprint.partName,
                        partNumber: blueprint.partNumber,
                        material: blueprint.material,
                        heatNo: newHeatNo,
                        customerName: newCustomerName,
                        isBlueprint: false,
                        selectedLoop: blueprint.selectedLoop.map((d: any) => d._id || d)
                      })
                    });

                    const newRow = await createRes.json();
                    if (!createRes.ok) throw new Error(newRow.message || "Failed to create batch");

                    // 2. Immediately call ACCEPT for the new row
                    const acceptRes = await fetch(`${API_URL}/api/workflow/accept/${newRow._id}`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${currentUser?.token}`,
                      },
                      body: JSON.stringify({
                        qty: Number(newInwardQty),
                        source: 'Manual Initialization'
                      })
                    });

                    if (acceptRes.ok) {
                      toast.success(`Production started for ${blueprint.partNumber}`);
                      setIsNewTaskDialogOpen(false);
                      setNewInwardQty("");
                      setNewHeatNo("");
                      setNewCustomerName("");
                      setSelectedBlueprintId("");
                      fetchTasks();
                    } else {
                      const err = await acceptRes.json();
                      toast.error(err.message || "Failed to accept inward");
                    }
                  } catch (error: any) {
                    toast.error(error.message || "Initialization failed");
                  } finally {
                    setIsInitializing(false);
                  }
                }}
                disabled={isInitializing || currentUser?.role === 'super-admin'}
              >
                {isInitializing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Initialize Batch"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
