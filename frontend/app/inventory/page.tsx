import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Progress } from "@/components/ui/progress";
import { Package, AlertTriangle, CheckCircle, TrendingDown } from "lucide-react";

const warehouseData = [
  { name: "Warehouse A", capacity: 85, items: 1250 },
  { name: "Warehouse B", capacity: 62, items: 890 },
  { name: "Warehouse C", capacity: 45, items: 450 },
];

const lowStockItems = [
  { name: "USB-C Hub", stock: 12, threshold: 50 },
  { name: "Monitor Stand", stock: 0, threshold: 20 },
  { name: "Wireless Charger", stock: 8, threshold: 30 },
  { name: "Cable Organizer", stock: 15, threshold: 40 },
];

export default function InventoryPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-muted-foreground">Monitor and manage your stock levels</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Items"
            value="2,590"
            icon={Package}
            iconColor="bg-primary/10 text-primary"
          />
          <StatsCard
            title="Low Stock Items"
            value="23"
            icon={AlertTriangle}
            iconColor="bg-warning/10 text-warning"
          />
          <StatsCard
            title="In Stock"
            value="2,456"
            icon={CheckCircle}
            iconColor="bg-success/10 text-success"
          />
          <StatsCard
            title="Out of Stock"
            value="111"
            icon={TrendingDown}
            iconColor="bg-destructive/10 text-destructive"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Warehouse Capacity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {warehouseData.map((warehouse) => (
                <div key={warehouse.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{warehouse.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {warehouse.items} items ({warehouse.capacity}%)
                    </span>
                  </div>
                  <Progress value={warehouse.capacity} className="h-3" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Low Stock Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lowStockItems.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Threshold: {item.threshold} units
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${item.stock === 0 ? 'text-destructive' : 'text-warning'}`}>
                        {item.stock} units
                      </p>
                      <p className="text-xs text-muted-foreground">remaining</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
