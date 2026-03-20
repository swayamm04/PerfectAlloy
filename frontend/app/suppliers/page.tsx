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
import { Plus, Search, Mail, Phone, MapPin } from "lucide-react";

const suppliers = [
  {
    id: "SUP-001",
    name: "TechParts Inc.",
    contact: "John Smith",
    email: "john@techparts.com",
    phone: "+1 (555) 123-4567",
    location: "New York, USA",
    status: "Active",
    products: 45,
  },
  {
    id: "SUP-002",
    name: "Global Electronics",
    contact: "Sarah Johnson",
    email: "sarah@globalelec.com",
    phone: "+1 (555) 234-5678",
    location: "Los Angeles, USA",
    status: "Active",
    products: 78,
  },
  {
    id: "SUP-003",
    name: "Prime Materials",
    contact: "Mike Davis",
    email: "mike@primemats.com",
    phone: "+1 (555) 345-6789",
    location: "Chicago, USA",
    status: "Inactive",
    products: 23,
  },
  {
    id: "SUP-004",
    name: "Quality Components",
    contact: "Emily Brown",
    email: "emily@qualitycomp.com",
    phone: "+1 (555) 456-7890",
    location: "Houston, USA",
    status: "Active",
    products: 56,
  },
  {
    id: "SUP-005",
    name: "FastShip Logistics",
    contact: "David Wilson",
    email: "david@fastship.com",
    phone: "+1 (555) 567-8901",
    location: "Miami, USA",
    status: "Active",
    products: 34,
  },
];

export default function SuppliersPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Suppliers</h1>
            <p className="text-muted-foreground">
              Manage your supplier relationships and contacts
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Supplier
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">24</div>
              <p className="text-sm text-muted-foreground">Total Suppliers</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-success">21</div>
              <p className="text-sm text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-warning">3</div>
              <p className="text-sm text-muted-foreground">Inactive</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">236</div>
              <p className="text-sm text-muted-foreground">Products Supplied</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search suppliers..." className="pl-10" />
          </div>
        </div>

        {/* Suppliers Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Suppliers</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier ID</TableHead>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Contact Info</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">{supplier.id}</TableCell>
                    <TableCell className="font-semibold">
                      {supplier.name}
                    </TableCell>
                    <TableCell>{supplier.contact}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {supplier.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {supplier.phone}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {supplier.location}
                      </span>
                    </TableCell>
                    <TableCell>{supplier.products}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          supplier.status === "Active" ? "default" : "secondary"
                        }
                        className={
                          supplier.status === "Active"
                            ? "bg-success/10 text-success hover:bg-success/20"
                            : ""
                        }
                      >
                        {supplier.status}
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
