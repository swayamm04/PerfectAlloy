import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const orders = [
  {
    id: "ORD-001",
    customer: "John Smith",
    product: "Wireless Keyboard",
    amount: "$129.99",
    status: "Completed",
  },
  {
    id: "ORD-002",
    customer: "Sarah Johnson",
    product: "USB-C Hub",
    amount: "$79.99",
    status: "Processing",
  },
  {
    id: "ORD-003",
    customer: "Mike Williams",
    product: "Monitor Stand",
    amount: "$199.99",
    status: "Pending",
  },
  {
    id: "ORD-004",
    customer: "Emily Brown",
    product: "Webcam HD",
    amount: "$89.99",
    status: "Completed",
  },
  {
    id: "ORD-005",
    customer: "David Lee",
    product: "Desk Lamp",
    amount: "$49.99",
    status: "Shipped",
  },
];

const getStatusVariant = (status: string) => {
  switch (status) {
    case "Completed":
      return "default";
    case "Processing":
      return "secondary";
    case "Pending":
      return "outline";
    case "Shipped":
      return "default";
    default:
      return "secondary";
  }
};

export const RecentOrders = () => {
  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Recent Orders</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.id}</TableCell>
                <TableCell>{order.customer}</TableCell>
                <TableCell>{order.product}</TableCell>
                <TableCell>{order.amount}</TableCell>
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
  );
};
