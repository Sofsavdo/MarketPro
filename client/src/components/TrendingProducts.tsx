import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Eye, ShoppingCart, Star } from "lucide-react";

interface TrendingProductsProps {
  className?: string;
}

interface Product {
  id: string;
  name: string;
  category: string;
  price: string;
  trend: string;
  isPositive: boolean;
  views: number;
  sales: number;
  rating: number;
  marketplace: string;
}

export default function TrendingProducts({ className }: TrendingProductsProps) {
  // Mock data - in real app this would come from API
  const trendingProducts: Product[] = [
    {
      id: "1",
      name: "Wireless Bluetooth Headphones",
      category: "Electronics",
      price: "$89.99",
      trend: "+24%",
      isPositive: true,
      views: 1234,
      sales: 87,
      rating: 4.8,
      marketplace: "Uzum",
    },
    {
      id: "2",
      name: "Smart Fitness Tracker",
      category: "Health & Fitness",
      price: "$129.99",
      trend: "+18%",
      isPositive: true,
      views: 987,
      sales: 64,
      rating: 4.6,
      marketplace: "Wildberries",
    },
    {
      id: "3",
      name: "Premium Coffee Maker",
      category: "Home & Kitchen",
      price: "$199.99",
      trend: "+15%",
      isPositive: true,
      views: 756,
      sales: 43,
      rating: 4.7,
      marketplace: "Yandex",
    },
    {
      id: "4",
      name: "Gaming Mouse Pad",
      category: "Gaming",
      price: "$24.99",
      trend: "+12%",
      isPositive: true,
      views: 2145,
      sales: 156,
      rating: 4.9,
      marketplace: "Uzum",
    },
    {
      id: "5",
      name: "Organic Skincare Set",
      category: "Beauty",
      price: "$79.99",
      trend: "-3%",
      isPositive: false,
      views: 543,
      sales: 28,
      rating: 4.5,
      marketplace: "Wildberries",
    },
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Trending Products
          </CardTitle>
          <Button variant="outline" size="sm">
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {trendingProducts.map((product) => (
            <div key={product.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium text-sm">{product.name}</h3>
                    <Badge variant="outline" className="text-xs">
                      {product.marketplace}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{product.category}</p>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {product.views.toLocaleString()} views
                    </div>
                    <div className="flex items-center gap-1">
                      <ShoppingCart className="h-3 w-3" />
                      {product.sales} sales
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-current text-yellow-500" />
                      {product.rating}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="font-semibold text-sm">{product.price}</p>
                  <Badge 
                    variant={product.isPositive ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {product.trend}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}