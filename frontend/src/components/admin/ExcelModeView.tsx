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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Loader2, Table as TableIcon, LayoutDashboard, Search, Info, Package, ArrowRight, ArrowRightLeft, ClipboardList, Printer, Calendar, Download, FileSpreadsheet, FileText, Check, ChevronsUpDown } from "lucide-react";
import { useAuth } from "@/src/context/AuthContext";
import { API_URL } from "@/src/lib/api";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

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
  heatNo?: string;
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
  const [isCumulativeMode, setIsCumulativeMode] = useState(true);
  const [open, setOpen] = useState(false);

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
        <p className="text-muted-foreground font-medium animate-pulse text-xs uppercase tracking-widest">Generating WIP Report...</p>
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
    row.partName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (row.heatNo && row.heatNo.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || [];

  const getAggregatedRows = (data: Row[]) => {
    const map = new Map<string, any>();

    data.forEach(row => {
      const key = row.partNumber;
      if (!map.has(key)) {
        map.set(key, {
          ...JSON.parse(JSON.stringify(row)),
          batchCount: 1,
        });
      } else {
        const aggregate = map.get(key);
        aggregate.batchCount += 1;

        row.stages.forEach((stage, idx) => {
          if (aggregate.stages[idx]) {
            if (!aggregate.stages[idx].inward) aggregate.stages[idx].inward = { qty: 0 };
            if (!aggregate.stages[idx].outward) aggregate.stages[idx].outward = { qty: 0, rejectionQty: 0 };

            aggregate.stages[idx].inward.qty = (aggregate.stages[idx].inward?.qty || 0) + (stage.inward?.qty || 0);
            aggregate.stages[idx].outward.qty = (aggregate.stages[idx].outward?.qty || 0) + (stage.outward?.qty || 0);
            aggregate.stages[idx].outward.rejectionQty = (aggregate.stages[idx].outward?.rejectionQty || 0) + (stage.outward?.rejectionQty || 0);
          }
        });
      }
    });

    return Array.from(map.values());
  };

  const finalRows = isCumulativeMode ? getAggregatedRows(filteredRows) : filteredRows;

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).replace(/\//g, '.');

  const exportToExcel = () => {
    if (!tableData || finalRows.length === 0) return;

    // Prepare headers
    const headers = [
      "Part Name",
      "Part Number",
      "Material",
      ...tableData.masterTable.departments.map(d => d.name),
      "Grand Total"
    ];

    // Prepare rows
    const excelRows = finalRows.map(row => {
      let rowGrandTotal = 0;
      const stageWips = tableData.masterTable.departments.map((_, idx) => {
        const stage = row.stages[idx];
        const wip = stage ? (stage.inward?.qty || 0) - (stage.outward?.qty || 0) - (stage.outward?.rejectionQty || 0) : 0;
        rowGrandTotal += Math.max(0, wip);
        return wip > 0 ? wip : 0;
      });

      return [
        row.partName,
        isCumulativeMode ? row.partNumber : `${row.partNumber} (${row.heatNo || "-"})`,
        row.material || "PL 33 MV",
        ...stageWips,
        rowGrandTotal
      ];
    });

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...excelRows]);

    // Auto-size columns
    const colWidths = headers.map((_, i) => ({
      wch: Math.max(
        headers[i].length,
        ...excelRows.map(row => row[i]?.toString().length || 0)
      ) + 2
    }));
    worksheet["!cols"] = colWidths;

    // Freeze identification columns (A, B, C) and header row
    worksheet["!views"] = [{ state: "frozen", xSplit: 3, ySplit: 1 }];

    // Create workbook and append sheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "WIP Report");

    // Download file
    XLSX.writeFile(workbook, `WIP_Report_${tableData.masterTable.name}_${today}.xlsx`);
  };

  const exportToPDF = () => {
    if (!tableData || finalRows.length === 0) return;

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4"
    });

    const pageWidth = doc.internal.pageSize.getWidth();

    // Set Font
    doc.setFont("helvetica", "bold");

    // Formal Headers
    doc.setFontSize(14);
    doc.text("PERFECT ALLOY COMPONENTS (P) LTD., SHIMOGA", pageWidth / 2, 15, { align: "center" });

    doc.setFontSize(12);
    doc.text("DEPARTMENT OF SALES", pageWidth / 2, 22, { align: "center" });

    doc.setFontSize(10);
    doc.text(`DATE: ${today}`, 15, 30);

    const title = `WIP - ${tableData.masterTable.name.toUpperCase()} PARTS - STAGE WISE POSITION ON`;
    doc.text(title, pageWidth / 2, 30, { align: "center" });
    doc.line(pageWidth / 2 - 40, 31, pageWidth / 2 + 40, 31); // Underline

    // Table Data
    const tableHeaders = [
      "Part Name",
      "Part No.",
      "Material",
      ...tableData.masterTable.departments.map(d => d.name),
      "Grand Total"
    ];

    const tableRows = finalRows.map(row => {
      let rowGrandTotal = 0;
      const stageWips = tableData.masterTable.departments.map((_, idx) => {
        const stage = row.stages[idx];
        const wip = stage ? (stage.inward?.qty || 0) - (stage.outward?.qty || 0) - (stage.outward?.rejectionQty || 0) : 0;
        rowGrandTotal += Math.max(0, wip);
        return wip > 0 ? wip : "-";
      });

      return [
        row.partName,
        isCumulativeMode ? row.partNumber : `${row.partNumber} (${row.heatNo || "-"})`,
        row.material || "PL 33 MV",
        ...stageWips,
        rowGrandTotal
      ];
    });

    autoTable(doc, {
      head: [tableHeaders],
      body: tableRows,
      startY: 35,
      theme: "grid",
      styles: {
        fontSize: 8,
        cellPadding: 2,
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
        textColor: [0, 0, 0],
        halign: "center",
        valign: "middle"
      },
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: "bold",
        lineWidth: 0.5
      },
      columnStyles: {
        0: { halign: "left", fontStyle: "bold", cellWidth: 40 },
        1: { fontStyle: "bold", cellWidth: 30 },
        [tableHeaders.length - 1]: { fillColor: [245, 245, 245], fontStyle: "bold" }
      },
      margin: { top: 35, left: 10, right: 10, bottom: 15 },
      didDrawPage: (data) => {
        // Footer (Page number)
        const str = `Page ${(doc as any).internal.getNumberOfPages()}`;
        doc.setFontSize(8);
        doc.text(str, pageWidth - 20, doc.internal.pageSize.getHeight() - 10);
      }
    });

    doc.save(`WIP_Report_${tableData.masterTable.name}_${today}.pdf`);
  };

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-[1600px] animate-in fade-in duration-500">
      {/* Hidden Formal Header for Print ONLY */}
      <div className="hidden print:block w-full pb-4">
        <div className="flex justify-between items-center px-4">
          <div className="text-sm font-black uppercase text-black">DATE: {today}</div>
          <div className="w-32"></div> {/* Spacer for balance */}
        </div>
      </div>

      <Card className="border-none shadow-lg overflow-hidden bg-background print:shadow-none print:border-none">
        <CardHeader className="bg-primary/5 border-b pb-6 print:hidden">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-primary">
                <LayoutDashboard className="h-5 w-5" />
                <CardTitle className="text-xl font-bold tracking-tight">Balance data</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">
                {tableData?.masterTable.name} • {today}
              </p>
            </div>

            <div className="flex items-center gap-2 no-print">
              <div className="relative w-48 lg:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search.."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 border-muted-foreground/20 focus-visible:ring-primary bg-background"
                />
              </div>

              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="h-10 w-[200px] justify-between bg-background border-muted-foreground/20 font-medium"
                  >
                    {selectedTableId
                      ? masterTables.find((table) => table._id === selectedTableId)?.name
                      : "Select Table..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[180px] p-0 shadow-xl border-muted-foreground/20" align="start">
                  <Command className="bg-background">
                    <CommandInput placeholder="Search table.." className="h-8 text-xs" />
                    <CommandEmpty className="text-xs py-2 px-4 italic">No table found.</CommandEmpty>
                    <CommandGroup className="max-h-[220px] overflow-auto custom-scrollbar p-1">
                      {masterTables.map((table) => (
                        <CommandItem
                          key={table._id}
                          value={table.name}
                          onSelect={() => {
                            setSelectedTableId(table._id);
                            setOpen(false);
                          }}
                          className="cursor-pointer py-1.5 px-2 hover:bg-primary/5 rounded-sm"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-3.5 w-3.5 text-primary",
                              selectedTableId === table._id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span className="font-semibold text-xs">{table.name}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>

              <Button
                variant={isCumulativeMode ? "default" : "outline"}
                size="sm"
                className={cn("h-10 gap-2 font-bold px-4 transition-all")}
                onClick={() => setIsCumulativeMode(!isCumulativeMode)}
              >
                <ArrowRightLeft className="h-4 w-4" />
                {isCumulativeMode ? "Summary View" : "Batch View"}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-10 px-4 font-bold border-muted-foreground/20 hover:bg-primary/5 transition-colors gap-2">
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
        </CardHeader>
        <CardContent className="p-0 relative">
          {fetchingData && (
            <div className="absolute inset-0 z-50 bg-background/60 backdrop-blur-[1px] flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          <div className="overflow-x-auto custom-scrollbar">
            <Table className="border-collapse min-w-full print:border-collapse print:table-fixed">
              <TableHeader className="bg-muted/30 border-b-2 print:bg-white print:border-b-2 print:border-black">
                <TableRow className="hover:bg-transparent h-12">
                  <TableHead className="sticky left-0 z-50 bg-[#f8fafc] min-w-[220px] font-bold uppercase text-[11px] text-primary py-5 px-5 border-r-2 border-muted-foreground/20 text-center align-middle print:bg-white print:text-black print:border-r-2 print:border-black">
                    Part Name
                  </TableHead>
                  <TableHead className="sticky left-[220px] z-50 bg-[#f8fafc] min-w-[160px] font-bold uppercase text-[11px] text-primary px-5 border-r border-muted-foreground/20 text-center align-middle print:bg-white print:text-black print:border-r print:border-black">
                    Part No.
                  </TableHead>
                  <TableHead className="sticky left-[380px] z-50 bg-[#f8fafc] min-w-[120px] font-bold uppercase text-[11px] text-primary px-5 border-r-2 border-muted-foreground/20 text-center align-middle print:bg-white print:text-black print:border-r-2 print:border-black">
                    Material
                  </TableHead>
                  {tableData?.masterTable.departments.map((dept) => (
                    <TableHead key={dept._id} className="min-w-[120px] px-3 text-center border-r font-bold text-[11px] text-primary align-middle py-4 break-words leading-tight uppercase print:text-black print:border-r print:border-black">
                      {dept.name}
                    </TableHead>
                  ))}
                  <TableHead className="min-w-[140px] px-5 text-center font-bold text-[11px] text-primary uppercase align-middle bg-[#f8fafc] border-l-2 border-muted-foreground/20 sticky right-0 z-50 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)] print:bg-white print:text-black print:border-l-2 print:border-black">
                    Grand Total
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {finalRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={(tableData?.masterTable.departments.length || 0) + 4} className="h-40 text-center font-medium text-muted-foreground uppercase text-xs tracking-widest italic">
                      No active production data found for this line
                    </TableCell>
                  </TableRow>
                ) : (
                  finalRows.map((row) => {
                    let rowGrandTotal = 0;
                    const isAggregated = !!row.batchCount;

                    return (
                      <TableRow key={row._id} className={cn("hover:bg-muted/30 transition-colors border-b print:border-black print:border-b")}>
                        <TableCell className="sticky left-0 z-20 bg-background group-hover:bg-muted/50 font-bold text-[13px] text-foreground px-5 py-5 border-r-2 border-muted-foreground/20 transition-colors align-middle uppercase leading-tight truncate max-w-[220px] print:bg-white print:text-black print:border-r-2 print:border-black">
                          {row.partName}
                        </TableCell>
                        <TableCell className="sticky left-[220px] z-20 bg-background group-hover:bg-muted/50 font-bold text-[11px] text-muted-foreground px-5 py-5 border-r border-muted-foreground/20 transition-colors align-middle print:bg-white print:text-black print:border-r print:border-black">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-foreground whitespace-nowrap">
                              {row.partNumber} {!isCumulativeMode && `(${row.heatNo || "-"})`}
                            </span>
                            {isAggregated && (
                              <Badge variant="outline" className="text-[9px] font-bold bg-primary/10 text-primary border-primary/20 rounded-sm px-1.5 py-0.5 h-5 print:hidden">
                                {row.batchCount} B
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="sticky left-[380px] z-20 bg-background group-hover:bg-muted/50 font-medium text-[10px] text-muted-foreground px-5 py-5 border-r-2 border-muted-foreground/20 align-middle uppercase text-center italic transition-colors print:bg-white print:text-black print:border-r-2 print:border-black">
                          {row.material || "PL 33 MV"}
                        </TableCell>
                        {tableData?.masterTable.departments.map((dept, idx) => {
                          const stage = row.stages[idx];
                          const wip = stage ? (stage.inward?.qty || 0) - (stage.outward?.qty || 0) - (stage.outward?.rejectionQty || 0) : 0;
                          rowGrandTotal += Math.max(0, wip);

                          return (
                            <TableCell key={idx} className="p-0 text-center border-r align-middle font-bold text-[13px] print:border-black">
                              <div className={cn(
                                "flex items-center justify-center w-full h-full py-5",
                                wip > 0 ? "text-primary bg-primary/5 print:bg-transparent print:text-black" : "text-muted-foreground/30 print:text-transparent"
                              )}>
                                {wip > 0 ? wip : "-"}
                              </div>
                            </TableCell>
                          );
                        })}
                        <TableCell className={cn(
                          "p-0 text-center align-middle font-black text-[14px] bg-slate-50 text-primary border-l-2 border-muted-foreground/20 sticky right-0 z-40 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)] print:border-black print:bg-white print:text-black print:shadow-none print:static",
                          rowGrandTotal === 0 ? "opacity-30 print:opacity-100" : "opacity-100"
                        )}>
                          <div className="flex items-center justify-center w-full h-full py-5 font-bold">
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
        </CardContent>
      </Card>

      <div className="no-print mt-2 flex justify-between items-center text-muted-foreground bg-muted/10 p-4 rounded-lg border border-dashed print:hidden">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 bg-primary/20 rounded-sm shadow-inner" />
            <span className="text-[10px] font-bold uppercase">Active WIP</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 bg-transparent border border-muted-foreground/30 rounded-sm" />
            <span className="text-[10px] font-bold uppercase">No Stock</span>
          </div>
        </div>

      </div>

      {/* Formal Legend for PDF ONLY removed per request */}

      <style jsx global>{`
        @media print {
          /* Hide EVERYTHING by default */
          .no-print, .print\\:hidden, aside, header, .sidebar-header, button { 
            display: none !important; 
          }
          
          /* Neutralize Layout Spacing */
          body, html { 
            background: white !important; 
            margin: 0 !important; 
            padding: 0 !important; 
            width: 100% !important; 
            height: auto !important;
          }
          
          /* Force target content to start at the absolute top-left */
          div[class*="pl-64"], div[class*="pl-16"], main, .container {
            padding: 0 !important;
            margin: 0 !important;
            left: 0 !important;
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
          }

          /* Force Thick Black Borders for the Industrial Look */
          table { 
            width: 100% !important; 
            border-collapse: collapse !important; 
            border: 2px solid black !important; 
            table-layout: auto !important;
          }
          th, td { 
            border: 2px solid black !important; 
            color: black !important; 
            padding: 4px 2px !important; 
            font-size: 9pt !important;
          }
          th { 
            background: #f0f0f0 !important; 
            font-weight: 900 !important;
            -webkit-print-color-adjust: exact;
          }
          
          @page { 
            size: landscape; 
            margin: 1cm; 
          }
          
          /* Ensure header and legend are visible and centered */
          .print\\:block { 
            display: block !important; 
          }
          .print\\:flex { 
            display: flex !important; 
          }
        }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
}
