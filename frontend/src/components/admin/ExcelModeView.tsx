"use client";

import { useState, useEffect } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Table as TableIcon, LayoutDashboard, Search, Info, Package, ArrowRight, ClipboardList, Printer, Calendar } from "lucide-react";
import { useAuth } from "@/src/context/AuthContext";
import { API_URL } from "@/src/lib/api";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Department {
  _id: string;
  name: string;
}

interface MasterTable {
  _id: string;
  name: string;
  departments: Department[];
}

interface Stage {
  inward?: { qty: number; receivedAt?: string };
  outward?: { qty: number; sentAt?: string; isCompleted?: boolean; rejectionQty?: number };
}

interface Row {
  _id: string;
  partNumber: string;
  partName: string;
  material?: string;
  stages: Stage[];
}

export default function ExcelModeView() {
  const { user: currentUser } = useAuth();
  const [masterTables, setMasterTables] = useState<MasterTable[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string>("");
  const [tableData, setTableData] = useState<{ masterTable: MasterTable; rows: Row[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchingData, setFetchingData] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchMasterTables = async () => {
    try {
      const response = await fetch(`${API_URL}/api/master-tables`, {
        headers: { Authorization: `Bearer ${currentUser?.token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setMasterTables(data);
        if (data.length > 0) {
          setSelectedTableId(data[0]._id);
        } else {
          setLoading(false);
        }
      }
    } catch (error) {
      console.error("Failed to fetch master tables", error);
      setLoading(false);
    }
  };

  const fetchTableDetails = async (id: string) => {
    setFetchingData(true);
    try {
      const response = await fetch(`${API_URL}/api/master-tables/${id}`, {
        headers: { Authorization: `Bearer ${currentUser?.token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setTableData(data);
      }
    } catch (error) {
      console.error("Failed to fetch table details", error);
    } finally {
      setFetchingData(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) fetchMasterTables();
  }, [currentUser]);

  useEffect(() => {
    if (selectedTableId) fetchTableDetails(selectedTableId);
  }, [selectedTableId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium animate-pulse text-sm uppercase tracking-widest text-[10px]">Generating WIP Report...</p>
      </div>
    );
  }

  if (masterTables.length === 0) {
    return (
      <Card className="border-none shadow-xl bg-muted/20">
        <CardContent className="flex flex-col items-center justify-center h-80 text-center space-y-4">
          <TableIcon className="h-12 w-12 text-muted-foreground/30" />
          <div className="space-y-1">
            <h3 className="font-bold text-lg">No Production Data Available</h3>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">Please initialize a production table to view the stage-wise WIP report.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const filteredRows = tableData?.rows.filter(row => 
    row.partNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    row.partName.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).replace(/\//g, '.');

  return (
    <div className="space-y-6 animate-in fade-in duration-700 bg-white p-4 md:p-8 rounded-lg shadow-sm border">
      {/* Formal Top Header Area (Excel Style) */}
      <div className="w-full text-center border-b-2 border-black pb-4 mb-6">
        <h2 className="text-xl font-black tracking-tight text-black uppercase mb-1">PERFECT ALLOY COMPONENTS (P) LTD., SHIMOGA</h2>
        <h3 className="text-lg font-bold text-black uppercase mb-2">DEPARTMENT OF SALES</h3>
        
        <div className="flex justify-between items-center px-4 mt-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black uppercase text-black">DATE: {today}</span>
          </div>
          <div className="flex flex-col items-center">
             <h4 className="text-md font-black text-black uppercase tracking-widest underline decoration-2 underline-offset-4">
               WIP - {tableData?.masterTable.name.toUpperCase()} PARTS - STAGE WISE POSITION ON
             </h4>
          </div>
          <div className="flex items-center gap-4 no-print transition-all">
             <Select value={selectedTableId} onValueChange={setSelectedTableId}>
                <SelectTrigger className="h-9 w-[200px] border-black border-2 font-black uppercase text-[10px] rounded-none focus:ring-0">
                  <SelectValue placeholder="Change Table" />
                </SelectTrigger>
                <SelectContent className="rounded-none border-2 border-black">
                  {masterTables.map((table) => (
                    <SelectItem key={table._id} value={table._id} className="font-bold text-[10px] uppercase">
                      {table.name}
                    </SelectItem>
                  ))}
                </SelectContent>
             </Select>
             <Button variant="outline" size="sm" className="h-9 border-black border-2 rounded-none px-4 font-black text-[10px] uppercase hover:bg-black hover:text-white transition-colors" onClick={() => window.print()}>
               <Printer className="h-4 w-4 mr-2" /> Print Report
             </Button>
          </div>
        </div>
      </div>

      {/* High-Density Matrix Table */}
      <div className="relative border-2 border-black overflow-hidden shadow-md">
        {fetchingData && (
          <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-black" />
          </div>
        )}
        
        <div className="overflow-x-auto max-h-[75vh] custom-scrollbar">
          <Table className="border-collapse">
            <TableHeader className="bg-white border-b-2 border-black sticky top-0 z-40 shadow-sm">
              <TableRow className="hover:bg-transparent">
                <TableHead className="sticky left-0 z-50 bg-white min-w-[200px] font-black uppercase text-[10px] text-black py-4 px-4 border-r border-black border-b-2 text-center align-middle">
                  Part Name
                </TableHead>
                <TableHead className="sticky left-[200px] z-50 bg-white min-w-[150px] font-black uppercase text-[10px] text-black px-4 border-r border-black border-b-2 text-center align-middle">
                  Part No.
                </TableHead>
                <TableHead className="sticky left-[350px] z-50 bg-white min-w-[80px] font-black uppercase text-[10px] text-black px-4 border-r border-black border-b-2 text-center align-middle">
                  Material
                </TableHead>
                {tableData?.masterTable.departments.map((dept) => (
                  <TableHead key={dept._id} className="min-w-[100px] px-2 text-center border-r border-black border-b-2 font-black text-[10px] text-black align-middle py-4 break-words leading-tight">
                    {dept.name.toUpperCase()}
                  </TableHead>
                ))}
                <TableHead className="min-w-[120px] px-4 text-center border-black border-b-2 font-black text-[10px] text-blue-700 uppercase align-middle bg-blue-50/50">
                  GRAND TOTAL
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={(tableData?.masterTable.departments.length || 0) + 4} className="h-40 text-center font-bold text-muted-foreground uppercase text-[10px] tracking-widest italic">
                    --- NO DATA FOUND FOR THIS PRODUCTION LINE ---
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((row) => {
                  let rowGrandTotal = 0;
                  
                  return (
                    <TableRow key={row._id} className="hover:bg-gray-50/80 transition-colors border-b border-black">
                      <TableCell className="sticky left-0 z-20 bg-white group-hover:bg-gray-50 font-black text-[11px] text-black px-4 py-3 border-r border-black transition-colors align-middle uppercase leading-tight truncate max-w-[200px]">
                        {row.partName}
                      </TableCell>
                      <TableCell className="sticky left-[200px] z-20 bg-white group-hover:bg-gray-50 font-bold text-[10px] text-black/80 px-4 py-3 border-r border-black transition-colors align-middle font-mono">
                        {row.partNumber}
                      </TableCell>
                      <TableCell className="sticky left-[350px] z-20 bg-white group-hover:bg-gray-50 font-bold text-[9px] text-blue-700/80 px-4 py-3 border-r border-black transition-colors align-middle uppercase text-center italic">
                        {row.material || "PL 33 MV"}
                      </TableCell>
                      {tableData?.masterTable.departments.map((dept, idx) => {
                        const stage = row.stages[idx];
                        const wip = stage ? (stage.inward?.qty || 0) - (stage.outward?.qty || 0) - (stage.outward?.rejectionQty || 0) : 0;
                        rowGrandTotal += Math.max(0, wip);

                        return (
                          <TableCell key={idx} className="p-0 text-center border-r border-black align-middle font-black text-[12px] h-full min-h-[50px]">
                             <div className={cn(
                               "flex items-center justify-center w-full h-full py-4 min-h-[50px]",
                               wip > 0 ? "text-black" : "text-transparent"
                             )}>
                               {wip > 0 ? wip : "-"}
                             </div>
                          </TableCell>
                        );
                      })}
                      <TableCell className={cn(
                        "p-0 text-center align-middle font-black text-[12px] bg-blue-50/30 text-blue-700 border-l border-black",
                        rowGrandTotal === 0 ? "text-blue-300" : "text-blue-700"
                      )}>
                        <div className="flex items-center justify-center w-full h-full py-4">
                          {rowGrandTotal}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="no-print mt-6 flex justify-between items-center">
         <div className="flex items-center gap-6 px-4 py-3 border-2 border-black bg-gray-50">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 bg-blue-700 border border-black" />
              <span className="text-[10px] font-black uppercase text-black">Active WIP</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 bg-white border border-black" />
              <span className="text-[10px] font-black uppercase text-black">No Stock</span>
            </div>
         </div>
         
         <div className="relative w-64">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black group-focus-within:scale-110 transition-transform" />
           <Input 
             placeholder="FILTER RESULTS..."
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             className="pl-9 h-10 border-2 border-black rounded-none uppercase font-black text-[10px] placeholder:text-gray-400 focus-visible:ring-0"
           />
         </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .shadow-sm, .shadow-md, .shadow-xl, .shadow-2xl { box-shadow: none !important; }
          .border { border-color: black !important; }
          @page { size: landscape; margin: 1cm; }
        }
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #000; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #333; }
      `}</style>
    </div>
  );
}
