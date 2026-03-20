import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { Search, Filter, Download } from "lucide-react";

const orders = [
  { id: "ORD-001", customer: "John Smith", date: "2024-01-15", items: 3, total: "$289.97", status: "Completed" },
  { id: "ORD-002", customer: "Sarah Johnson", date: "2024-01-15", items: 1, total: "$79.99", status: "Processing" },
  { id: "ORD-003", customer: "Mike Williams", date: "2024-01-14", items: 5, total: "$449.95", status: "Shipped" },
  { id: "ORD-004", customer: "Emily Brown", date: "2024-01-14", items: 2, total: "$159.98", status: "Pending" },
  { id: "ORD-005", customer: "David Lee", date: "2024-01-13", items: 4, total: "$319.96", status: "Completed" },
  { id: "ORD-006", customer: "Lisa Chen", date: "2024-01-13", items: 1, total: "$89.99", status: "Cancelled" },
];

const getStatusVariant = (status: string) => {
  switch (status) {
    case "Completed":
      return "default";
    case "Processing":
      return "secondary";
    case "Shipped":
      return "outline";
    case "Pending":
      return "secondary";
    case "Cancelled":
      return "destructive";
    default:
      return "secondary";
  }
};

export default function OrdersPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Orders</h1>
            <p className="text-muted-foreground">View and manage customer orders</p>
          </div>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search orders..." className="pl-10" />
              </div>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.id}</TableCell>
                    <TableCell>{order.customer}</TableCell>
                    <TableCell>{order.date}</TableCell>
                    <TableCell>{order.items}</TableCell>
                    <TableCell>{order.total}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(order.status)}>
                        {order.status}
                      </Badge>
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
