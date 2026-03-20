"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const inventoryItems = [
  { name: "Electronics", stock: 85, color: "bg-primary" },
  { name: "Furniture", stock: 62, color: "bg-success" },
  { name: "Clothing", stock: 45, color: "bg-warning" },
  { name: "Food & Beverages", stock: 28, color: "bg-destructive" },
  { name: "Office Supplies", stock: 91, color: "bg-info" },
];

export const InventoryStatus = () => {
  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Inventory Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {inventoryItems.map((item) => (
          <div key={item.name} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{item.name}</span>
              <span className="text-muted-foreground">{item.stock}%</span>
            </div>
            <Progress value={item.stock} className="h-2" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
