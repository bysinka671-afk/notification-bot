import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Send, Users, CheckCircle2, AlertCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Department } from "@shared/schema";

const DEPARTMENTS: Department[] = [
  "Департамент продаж",
  "Департамент продуктовой логистики",
  "Департамент транспортно-складской логистики",
  "Департамент маркетинга",
  "КАД",
  "Кадровый департамент (HR)",
  "Финансовый департамент",
  "Юридический департамент",
  "Департамент информационных технологий",
];

interface DepartmentStats {
  department: string;
  count: number;
}

export default function AdminPanel() {
  const [selectedDepartments, setSelectedDepartments] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [selectAll, setSelectAll] = useState(false);
  const { toast } = useToast();

  // Fetch department statistics
  const { data: departmentStats, isLoading: statsLoading } = useQuery<DepartmentStats[]>({
    queryKey: ["/api/departments/stats"],
  });

  // Create notification mutation
  const createNotification = useMutation({
    mutationFn: async (data: { message: string; departments: string[] }) => {
      return apiRequest("POST", "/api/notifications", data);
    },
    onSuccess: () => {
      toast({
        title: "Уведомление отправлено",
        description: `Сообщение успешно доставлено сотрудникам выбранных отделов.`,
      });
      setMessage("");
      setSelectedDepartments(new Set());
      setSelectAll(false);
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Ошибка отправки",
        description: error.message || "Не удалось отправить уведомление. Попробуйте снова.",
      });
    },
  });

  const handleDepartmentToggle = (department: string) => {
    const newSelected = new Set(selectedDepartments);
    if (newSelected.has(department)) {
      newSelected.delete(department);
    } else {
      newSelected.add(department);
    }
    setSelectedDepartments(newSelected);
    setSelectAll(newSelected.size === DEPARTMENTS.length);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedDepartments(new Set());
      setSelectAll(false);
    } else {
      setSelectedDepartments(new Set(DEPARTMENTS));
      setSelectAll(true);
    }
  };

  const handlePublish = () => {
    if (selectedDepartments.size === 0) {
      toast({
        variant: "destructive",
        title: "Выберите отделы",
        description: "Необходимо выбрать хотя бы один отдел для рассылки.",
      });
      return;
    }

    if (!message.trim()) {
      toast({
        variant: "destructive",
        title: "Введите сообщение",
        description: "Текст уведомления не может быть пустым.",
      });
      return;
    }

    createNotification.mutate({
      message: message.trim(),
      departments: Array.from(selectedDepartments),
    });
  };

  const getDepartmentCount = (department: string): number => {
    if (!departmentStats) return 0;
    const stat = departmentStats.find(s => s.department === department);
    return stat?.count || 0;
  };

  const totalRecipients = Array.from(selectedDepartments).reduce(
    (sum, dept) => sum + getDepartmentCount(dept),
    0
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-foreground" data-testid="text-page-title">
                Панель управления уведомлениями
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Создание и отправка важных оповещений
              </p>
            </div>
            <Badge variant="secondary" className="flex items-center gap-2" data-testid="badge-admin">
              <Users className="h-3.5 w-3.5" />
              Администратор
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="space-y-6">
          {/* Department Selection Card */}
          <Card data-testid="card-department-selection">
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg">Выбор получателей</CardTitle>
              <CardDescription>
                Выберите отделы, которым будет отправлено уведомление
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Select All */}
              <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/30">
                <Checkbox
                  id="select-all"
                  checked={selectAll}
                  onCheckedChange={handleSelectAll}
                  data-testid="checkbox-select-all"
                  className="h-5 w-5"
                />
                <Label
                  htmlFor="select-all"
                  className="text-base font-medium cursor-pointer flex-1"
                >
                  Выбрать все отделы
                </Label>
                {selectAll && (
                  <Badge variant="secondary" data-testid="badge-total-users">
                    {totalRecipients} сотрудников
                  </Badge>
                )}
              </div>

              {/* Department List */}
              <div className="space-y-3">
                {statsLoading ? (
                  <div className="space-y-3">
                    {DEPARTMENTS.map((dept) => (
                      <div
                        key={dept}
                        className="h-14 rounded-lg border bg-card animate-pulse"
                      />
                    ))}
                  </div>
                ) : (
                  DEPARTMENTS.map((department) => {
                    const count = getDepartmentCount(department);
                    const isSelected = selectedDepartments.has(department);
                    
                    return (
                      <div
                        key={department}
                        className={`
                          flex items-center gap-3 p-4 rounded-lg border transition-colors
                          ${isSelected ? 'bg-primary/5 border-primary/30' : 'bg-card hover-elevate'}
                          cursor-pointer
                        `}
                        onClick={() => handleDepartmentToggle(department)}
                        data-testid={`department-${department}`}
                      >
                        <Checkbox
                          id={department}
                          checked={isSelected}
                          onCheckedChange={() => handleDepartmentToggle(department)}
                          data-testid={`checkbox-${department}`}
                          className="h-5 w-5"
                        />
                        <Label
                          htmlFor={department}
                          className="flex-1 cursor-pointer text-sm font-medium"
                        >
                          {department}
                        </Label>
                        <Badge
                          variant={count > 0 ? "secondary" : "outline"}
                          data-testid={`badge-count-${department}`}
                        >
                          {count}
                        </Badge>
                      </div>
                    );
                  })
                )}
              </div>

              {selectedDepartments.size > 0 && !selectAll && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary">
                    Выбрано отделов: {selectedDepartments.size} • Получателей: {totalRecipients}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Message Composition Card */}
          <Card data-testid="card-message-composition">
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg">Текст уведомления</CardTitle>
              <CardDescription>
                Опишите ситуацию подробно и понятно для всех сотрудников
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Textarea
                  placeholder="Например:&#10;&#10;🔴 Критично: Технические работы&#10;&#10;С 15:00 до 16:00 сегодня будут проводиться плановые технические работы на сервере. Доступ к системе будет временно ограничен.&#10;&#10;Ожидаемое время восстановления: 16:00&#10;Вопросы: it@company.com"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-48 resize-none text-base"
                  data-testid="textarea-message"
                />
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    {message.length > 0 && `${message.length} символов`}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Начните с уровня важности (🔴 🟡 🟢)
                  </span>
                </div>
              </div>

              {/* Preview */}
              {message.trim() && (
                <div className="p-4 rounded-lg bg-muted/50 border-l-4 border-primary">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    ПРЕДПРОСМОТР СООБЩЕНИЯ
                  </p>
                  <p className="text-sm whitespace-pre-wrap text-foreground">
                    {message}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Publish Button */}
          <Button
            onClick={handlePublish}
            disabled={
              createNotification.isPending ||
              selectedDepartments.size === 0 ||
              !message.trim()
            }
            className="w-full h-12 text-base font-medium"
            data-testid="button-publish"
          >
            {createNotification.isPending ? (
              <>
                <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                Отправка...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Опубликовать уведомление
              </>
            )}
          </Button>

          {/* Help Text */}
          <Card className="bg-muted/30 border-muted">
            <CardContent className="pt-6">
              <h3 className="text-sm font-semibold mb-2 text-foreground">
                Рекомендации по созданию уведомлений:
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1.5">
                <li>• Начните с уровня важности: 🔴 Критично / 🟡 Внимание / 🟢 Информация</li>
                <li>• Кратко опишите ситуацию (1 предложение)</li>
                <li>• Укажите, кого это затрагивает</li>
                <li>• Сообщите ожидаемое время решения</li>
                <li>• Добавьте контакт для вопросов</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
