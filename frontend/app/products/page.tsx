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
import { Plus, Search, Filter } from "lucide-react";

const products = [
  { id: "PRD-001", name: "Wireless Mouse", category: "Electronics", stock: 150, price: "$29.99", status: "In Stock" },
  { id: "PRD-002", name: "Mechanical Keyboard", category: "Electronics", stock: 85, price: "$89.99", status: "In Stock" },
  { id: "PRD-003", name: "USB-C Hub", category: "Electronics", stock: 12, price: "$49.99", status: "Low Stock" },
  { id: "PRD-004", name: "Monitor Stand", category: "Furniture", stock: 0, price: "$79.99", status: "Out of Stock" },
  { id: "PRD-005", name: "Desk Lamp", category: "Furniture", stock: 45, price: "$34.99", status: "In Stock" },
  { id: "PRD-006", name: "Webcam HD", category: "Electronics", stock: 67, price: "$59.99", status: "In Stock" },
];

const getStatusVariant = (status: string) => {
  switch (status) {
    case "In Stock":
      return "default";
    case "Low Stock":
      return "secondary";
    case "Out of Stock":
      return "destructive";
    default:
      return "secondary";
  }
};

export default function ProductsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Products</h1>
            <p className="text-muted-foreground">Manage your product inventory</p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search products..." className="pl-10" />
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
                  <TableHead>Product ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.id}</TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell>{product.stock}</TableCell>
                    <TableCell>{product.price}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(product.status)}>
                        {product.status}
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
