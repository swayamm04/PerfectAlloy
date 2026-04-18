import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  Package,
  DollarSign,
  Users,
  Truck,
  BarChart3,
  PieChart,
} from "lucide-react";

const reportCategories = [
  {
    title: "Sales Reports",
    icon: DollarSign,
    description: "Revenue, transactions, and sales performance",
    reports: [
      { name: "Monthly Sales Summary", lastGenerated: "28/01/2024" },
      { name: "Sales by Product Category", lastGenerated: "27/01/2024" },
      { name: "Sales by Region", lastGenerated: "25/01/2024" },
    ],
  },
  {
    title: "Inventory Reports",
    icon: Package,
    description: "Stock levels, movements, and valuations",
    reports: [
      { name: "Current Stock Levels", lastGenerated: "2024-01-28" },
      { name: "Low Stock Alert", lastGenerated: "2024-01-28" },
      { name: "Inventory Valuation", lastGenerated: "20/01/2024" },
    ],
  },
  {
    title: "Order Reports",
    icon: FileText,
    description: "Order status, fulfillment, and trends",
    reports: [
      { name: "Order Fulfillment Rate", lastGenerated: "2024-01-28" },
      { name: "Pending Orders Summary", lastGenerated: "2024-01-28" },
      { name: "Order History", lastGenerated: "26/01/2024" },
    ],
  },
  {
    title: "Supplier Reports",
    icon: Truck,
    description: "Supplier performance and procurement",
    reports: [
      { name: "Supplier Performance", lastGenerated: "22/01/2024" },
      { name: "Purchase Order Summary", lastGenerated: "2024-01-28" },
      { name: "Supplier Payment History", lastGenerated: "15/01/2024" },
    ],
  },
  {
    title: "Customer Reports",
    icon: Users,
    description: "Customer insights and behavior",
    reports: [
      { name: "Customer Acquisition", lastGenerated: "2024-01-28" },
      { name: "Top Customers", lastGenerated: "2024-01-25" },
      { name: "Customer Retention", lastGenerated: "2024-01-20" },
    ],
  },
  {
    title: "Financial Reports",
    icon: TrendingUp,
    description: "Profit, loss, and financial metrics",
    reports: [
      { name: "Profit & Loss Statement", lastGenerated: "2024-01-28" },
      { name: "Cost Analysis", lastGenerated: "2024-01-25" },
      { name: "Revenue Forecast", lastGenerated: "2024-01-22" },
    ],
  },
];

const quickReports = [
  { name: "Daily Sales", type: "Auto-generated", status: "Ready" },
  { name: "Weekly Inventory", type: "Auto-generated", status: "Ready" },
  { name: "Monthly Summary", type: "Scheduled", status: "Generating" },
  { name: "Quarterly Review", type: "Manual", status: "Ready" },
];

export default function ReportsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Reports</h1>
            <p className="text-muted-foreground">
              Generate and download business reports
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Calendar className="h-4 w-4" />
              Schedule Report
            </Button>
            <Button className="gap-2">
              <FileText className="h-4 w-4" />
              Custom Report
            </Button>
          </div>
        </div>

        {/* Quick Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Quick Reports
            </CardTitle>
            <CardDescription>Frequently accessed reports ready to download</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              {quickReports.map((report) => (
                <div
                  key={report.name}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div>
                    <p className="font-medium">{report.name}</p>
                    <p className="text-sm text-muted-foreground">{report.type}</p>
                  </div>
                  {report.status === "Ready" ? (
                    <Button variant="ghost" size="icon">
                      <Download className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Badge variant="secondary">Generating...</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Report Categories */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {reportCategories.map((category) => (
            <Card key={category.title}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <category.icon className="h-5 w-5 text-primary" />
                  {category.title}
                </CardTitle>
                <CardDescription>{category.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {category.reports.map((report) => (
                    <div
                      key={report.name}
                      className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{report.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Last: {report.lastGenerated}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Report Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <PieChart className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold">156</div>
                  <p className="text-sm text-muted-foreground">Reports Generated</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-success/10 p-3">
                  <Download className="h-6 w-6 text-success" />
                </div>
                <div>
                  <div className="text-2xl font-bold">89</div>
                  <p className="text-sm text-muted-foreground">Downloads This Month</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-warning/10 p-3">
                  <Calendar className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <div className="text-2xl font-bold">12</div>
                  <p className="text-sm text-muted-foreground">Scheduled Reports</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-secondary p-3">
                  <FileText className="h-6 w-6 text-secondary-foreground" />
                </div>
                <div>
                  <div className="text-2xl font-bold">24</div>
                  <p className="text-sm text-muted-foreground">Custom Templates</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
