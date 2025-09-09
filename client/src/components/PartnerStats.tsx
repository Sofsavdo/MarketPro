import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Package, DollarSign, Users } from "lucide-react";

interface PartnerStatsProps {
  partnerId?: string;
  className?: string;
}

interface StatItem {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  description?: string;
}

export default function PartnerStats({ partnerId, className }: PartnerStatsProps) {
  // Mock data - in real app this would come from API
  const stats: StatItem[] = [
    {
      title: "Total Revenue",
      value: "$12,345",
      icon: <DollarSign className="h-4 w-4" />,
      trend: { value: "+12.3%", isPositive: true },
      description: "vs last month",
    },
    {
      title: "Active Products",
      value: "24",
      icon: <Package className="h-4 w-4" />,
      trend: { value: "+3", isPositive: true },
      description: "vs last month",
    },
    {
      title: "Fulfillment Requests",
      value: "87",
      icon: <TrendingUp className="h-4 w-4" />,
      trend: { value: "+15.2%", isPositive: true },
      description: "vs last month",
    },
    {
      title: "Partner Tier",
      value: "Premium",
      icon: <Users className="h-4 w-4" />,
      description: "Current tier status",
    },
  ];

  return (
    <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-4 ${className}`}>
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            {stat.icon}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {stat.trend && (
                <Badge variant={stat.trend.isPositive ? "default" : "destructive"} className="text-xs">
                  {stat.trend.value}
                </Badge>
              )}
              {stat.description && <span>{stat.description}</span>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}