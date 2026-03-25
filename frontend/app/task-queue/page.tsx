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
  Play, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  ArrowRightLeft,
  Search,
  Check
} from "lucide-react";
import { API_URL } from "@/src/lib/api";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface Row {
  _id: string;
  partNumber: string;
  currentDepartmentIndex: number;
  stages: Record<string, any>;
  tableId: {
    _id: string;
    name: string;
    departments: string[];
  };
}

export default function TaskQueuePage() {
  const { user: currentUser } = useAuth();
  const [tasks, setTasks] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [actionData, setActionData] = useState({ qty: "", notes: "" });

  const fetchTasks = async () => {
    try {
      const response = await fetch(`${API_URL}/api/workflow/queue`, {
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
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchTasks();
    }
  }, [currentUser]);

  const handleWorkflowAction = async (taskId: string, action: 'accept' | 'process' | 'outward') => {
    setLoading(true);
    try {
      const endpoint = `${API_URL}/api/workflow/${action}/${taskId}`;
      const method = action === 'process' ? 'PUT' : 'POST';
      const body = action === 'process' 
        ? { status: 'Processing', notes: actionData.notes }
        : { qty: Number(actionData.qty) };

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentUser?.token}`,
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(`Task ${action}ed successfully`);
        setActionData({ qty: "", notes: "" });
        setActiveAction(null);
        fetchTasks();
      } else {
        const error = await response.json();
        toast.error(error.message || `Failed to ${action} task`);
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const getDeptStage = (task: Row) => {
    if (!currentUser?.department) return null;
    const deptId = typeof currentUser.department === 'object' ? (currentUser.department as any)._id : currentUser.department;
    return task.stages?.[deptId];
  };

  const filteredTasks = tasks.filter(t => 
    t.partNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.tableId?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const incoming = filteredTasks.filter(t => !getDeptStage(t)?.inward?.receivedAt);
  const inProgress = filteredTasks.filter(t => getDeptStage(t)?.inward?.receivedAt && !getDeptStage(t)?.outward?.isCompleted);
  const outwarded = filteredTasks.filter(t => getDeptStage(t)?.outward?.isCompleted);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Task Queue</h1>
            <p className="text-muted-foreground mt-1">Manage production workflow for your department</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search part no or table..." 
              className="pl-10 h-10 bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <Tabs defaultValue="incoming" className="w-full space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-[600px] h-12 bg-muted/50 p-1">
            <TabsTrigger value="incoming" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Incoming <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">{incoming.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="inprogress" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
              In Progress <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-700 hover:bg-orange-100 border-none">{inProgress.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="completed" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Completed <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700 hover:bg-green-100 border-none">{outwarded.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="incoming" className="animate-in slide-in-from-left-4 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {incoming.length === 0 ? (
                <div className="col-span-full h-40 flex items-center justify-center border-2 border-dashed rounded-xl bg-muted/20 text-muted-foreground">
                  No incoming tasks at the moment.
                </div>
              ) : (
                incoming.map(task => (
                  <Card key={task._id} className="border-none shadow-lg hover:shadow-xl transition-all group">
                    <CardHeader className="pb-3 border-b bg-primary/5">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-xl font-bold text-primary">{task.partNumber}</CardTitle>
                        <Badge variant="outline" className="border-primary/20 text-[10px] uppercase font-bold tracking-wider">
                          {task.tableId?.name}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-5 space-y-4">
                      {activeAction === task._id ? (
                        <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
                          <label className="text-xs font-bold uppercase text-muted-foreground">Inward Quantity</label>
                          <Input 
                            type="number" 
                            placeholder="Received Qty"
                            value={actionData.qty}
                            onChange={(e) => setActionData({ ...actionData, qty: e.target.value })}
                            className="h-11 border-primary/20"
                            autoFocus
                          />
                          <div className="flex gap-2 pt-2">
                            <Button className="flex-1 font-bold h-11" onClick={() => handleWorkflowAction(task._id, 'accept')}>
                              Accept Task
                            </Button>
                            <Button variant="ghost" className="h-11" onClick={() => setActiveAction(null)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 text-sm">
                            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Source:</span>
                            <span className="font-bold">Next Stage Waiting</span>
                          </div>
                          <Button className="w-full font-bold h-12 shadow-lg group-hover:scale-[1.02] transition-transform" onClick={() => setActiveAction(task._id)}>
                            Initialize Inward
                          </Button>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="inprogress" className="animate-in slide-in-from-left-4 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {inProgress.length === 0 ? (
                <div className="col-span-full h-40 flex items-center justify-center border-2 border-dashed rounded-xl bg-muted/20 text-muted-foreground">
                  No tasks currently in progress.
                </div>
              ) : (
                inProgress.map(task => {
                  const stage = getDeptStage(task);
                  return (
                    <Card key={task._id} className="border-none shadow-lg hover:shadow-xl transition-all">
                      <CardHeader className="pb-3 border-b bg-orange-50/50">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-xl font-bold">{task.partNumber}</CardTitle>
                          <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-none font-bold">
                            Processing
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-5 space-y-4">
                        <div className="space-y-2 text-sm border-l-2 border-orange-200 pl-3">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Inward Qty:</span>
                            <span className="font-bold">{stage?.inward?.qty} Units</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Accepted:</span>
                            <span className="font-medium">{stage?.inward?.receivedAt && new Date(stage.inward.receivedAt).toLocaleTimeString()}</span>
                          </div>
                        </div>

                        {activeAction === task._id ? (
                          <div className="space-y-3 pt-2">
                             <label className="text-xs font-bold uppercase text-muted-foreground">Outward Quantity</label>
                            <Input 
                              type="number" 
                              placeholder="Final Qty"
                              value={actionData.qty}
                              onChange={(e) => setActionData({ ...actionData, qty: e.target.value })}
                              className="h-11 border-primary/20"
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <Button className="flex-1 font-bold h-11 bg-green-600 hover:bg-green-700" onClick={() => handleWorkflowAction(task._id, 'outward')}>
                                Complete & Send
                              </Button>
                              <Button variant="ghost" className="h-11" onClick={() => setActiveAction(null)}>Back</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2 pt-2">
                            <Button variant="outline" className="flex-1 h-11 border-orange-200 hover:bg-orange-50 font-medium" onClick={() => toast.info("Status update logic can be added here")}>
                              Update Status
                            </Button>
                            <Button className="flex-1 h-11 bg-green-600 hover:bg-green-700 font-bold" onClick={() => setActiveAction(task._id)}>
                              Send Outward
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="completed" className="animate-in slide-in-from-left-4 duration-300">
             <Card className="border-none shadow-xl">
               <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="pl-6 font-bold">Part Number</TableHead>
                        <TableHead className="font-bold">Inward Qty</TableHead>
                        <TableHead className="font-bold">Outward Qty</TableHead>
                        <TableHead className="font-bold">Sent Date</TableHead>
                        <TableHead className="pr-6 text-right font-bold">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {outwarded.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                            No tasks completed yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        outwarded.map(task => {
                          const stage = getDeptStage(task);
                          return (
                            <TableRow key={task._id}>
                              <TableCell className="pl-6 font-bold">{task.partNumber}</TableCell>
                              <TableCell className="font-medium text-muted-foreground">{stage?.inward?.qty} Units</TableCell>
                              <TableCell className="font-bold text-green-600">{stage?.outward?.qty} Units</TableCell>
                              <TableCell className="text-muted-foreground">{stage?.outward?.sentAt && new Date(stage.outward.sentAt).toLocaleDateString()}</TableCell>
                              <TableCell className="pr-6 text-right text-green-600 font-bold">
                                <span className="flex items-center justify-end gap-1">
                                  <CheckCircle2 className="h-4 w-4" />
                                  Forwarded
                                </span>
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
      </div>
    </DashboardLayout>
  );
}
