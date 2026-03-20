import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package } from "lucide-react";

const products = [
  { name: "Wireless Mouse", sales: 1234, revenue: "$24,680" },
  { name: "Mechanical Keyboard", sales: 987, revenue: "$49,350" },
  { name: "USB-C Hub", sales: 856, revenue: "$17,120" },
  { name: "4K Monitor", sales: 654, revenue: "$196,200" },
  { name: "Webcam Pro", sales: 543, revenue: "$27,150" },
];

export const TopProducts = () => {
  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Top Products</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {products.map((product, index) => (
            <div
              key={product.name}
              className="flex items-center gap-4 rounded-lg border p-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{product.name}</p>
                <p className="text-sm text-muted-foreground">
                  {product.sales} units sold
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{product.revenue}</p>
                <p className="text-xs text-muted-foreground">Revenue</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
