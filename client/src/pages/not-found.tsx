import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-2xl">Страница не найдена</CardTitle>
          <CardDescription>
            Запрашиваемая страница не существует или была перемещена.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Link href="/">
            <Button data-testid="button-home">
              <Home className="h-4 w-4 mr-2" />
              На главную
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
