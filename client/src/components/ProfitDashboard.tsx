import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, DollarSign, Percent, Target } from "lucide-react";

interface ProfitDashboardProps {
  partnerId?: string;
  className?: string;
}

interface ProfitMetric {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: React.ReactNode;
}

export default function ProfitDashboard({ partnerId, className }: ProfitDashboardProps) {
  // Mock data - in real app this would come from API
  const metrics: ProfitMetric[] = [
    {
      title: "Gross Profit",
      value: "$8,245",
      change: "+18.2%",
      isPositive: true,
      icon: <DollarSign className="h-4 w-4" />,
    },
    {
      title: "Profit Margin",
      value: "34.5%",
      change: "+2.1%",
      isPositive: true,
      icon: <Percent className="h-4 w-4" />,
    },
    {
      title: "Revenue Growth",
      value: "12.8%",
      change: "+4.3%",
      isPositive: true,
      icon: <TrendingUp className="h-4 w-4" />,
    },
    {
      title: "Target Achievement",
      value: "87%",
      change: "+5.2%",
      isPositive: true,
      icon: <Target className="h-4 w-4" />,
    },
  ];

  const topProducts = [
    { name: "Premium Backpack", profit: "$1,245", margin: "45%" },
    { name: "Wireless Headphones", profit: "$987", margin: "38%" },
    { name: "Smart Watch", profit: "$756", margin: "42%" },
  ];

  return (
    <div className={className}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Profit Dashboard</h2>
          <Button variant="outline">Export Report</Button>
        </div>

        {/* Profit Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
                {metric.icon}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant={metric.isPositive ? "default" : "destructive"}>
                    {metric.change}
                  </Badge>
                  <span className="text-muted-foreground">vs last month</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Profit Chart Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Profit Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-muted/20 rounded-lg">
              <p className="text-muted-foreground">Profit chart will be displayed here</p>
            </div>
          </CardContent>
        </Card>

        {/* Top Performing Products */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">Profit Margin: {product.margin}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">{product.profit}</p>
                    <p className="text-xs text-muted-foreground">This month</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}