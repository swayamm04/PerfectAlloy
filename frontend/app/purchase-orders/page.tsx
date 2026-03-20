import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, FileText, Calendar } from "lucide-react";

const purchaseOrders = [
  {
    id: "PO-2024-001",
    supplier: "TechParts Inc.",
    date: "2024-01-15",
    deliveryDate: "2024-01-25",
    items: 12,
    total: 15420.0,
    status: "Delivered",
  },
  {
    id: "PO-2024-002",
    supplier: "Global Electronics",
    date: "2024-01-18",
    deliveryDate: "2024-01-30",
    items: 8,
    total: 8750.0,
    status: "In Transit",
  },
  {
    id: "PO-2024-003",
    supplier: "Prime Materials",
    date: "2024-01-20",
    deliveryDate: "2024-02-01",
    items: 25,
    total: 32100.0,
    status: "Processing",
  },
  {
    id: "PO-2024-004",
    supplier: "Quality Components",
    date: "2024-01-22",
    deliveryDate: "2024-02-05",
    items: 15,
    total: 18900.0,
    status: "Pending",
  },
  {
    id: "PO-2024-005",
    supplier: "FastShip Logistics",
    date: "2024-01-25",
    deliveryDate: "2024-02-10",
    items: 6,
    total: 5200.0,
    status: "Approved",
  },
  {
    id: "PO-2024-006",
    supplier: "TechParts Inc.",
    date: "2024-01-28",
    deliveryDate: "2024-02-15",
    items: 20,
    total: 24500.0,
    status: "Draft",
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "Delivered":
      return "bg-success/10 text-success hover:bg-success/20";
    case "In Transit":
      return "bg-primary/10 text-primary hover:bg-primary/20";
    case "Processing":
      return "bg-warning/10 text-warning hover:bg-warning/20";
    case "Pending":
      return "bg-muted text-muted-foreground";
    case "Approved":
      return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20";
    case "Draft":
      return "bg-secondary text-secondary-foreground";
    default:
      return "";
  }
};

export default function PurchaseOrdersPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Purchase Orders
            </h1>
            <p className="text-muted-foreground">
              Create and manage purchase orders for suppliers
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create PO
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">156</div>
              <p className="text-sm text-muted-foreground">Total POs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-warning">12</div>
              <p className="text-sm text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-primary">8</div>
              <p className="text-sm text-muted-foreground">In Transit</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-success">134</div>
              <p className="text-sm text-muted-foreground">Delivered</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">$284.5K</div>
              <p className="text-sm text-muted-foreground">This Month</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search purchase orders..." className="pl-10" />
          </div>
        </div>

        {/* Purchase Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Purchase Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Delivery Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseOrders.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-medium">{po.id}</TableCell>
                    <TableCell>{po.supplier}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {po.date}
                      </span>
                    </TableCell>
                    <TableCell>{po.deliveryDate}</TableCell>
                    <TableCell>{po.items}</TableCell>
                    <TableCell className="font-semibold">
                       ${po.total.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(po.status)}>
                        {po.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
