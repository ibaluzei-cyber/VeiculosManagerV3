import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Pencil, Trash } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Color } from "@/lib/types";
import { formatCurrency } from "@/lib/formatters";

interface ColorListProps {
  onEdit?: (id: number) => void;
}

export default function ColorList({ onEdit }: ColorListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: colors = [], isLoading } = useQuery<Color[]>({
    queryKey: ["/api/colors"],
  });
  
  const handleDelete = async (id: number) => {
    try {
      await apiRequest("DELETE", `/api/colors/${id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/colors"] });
    } catch (error) {
      console.error("Failed to delete color:", error);
    }
  };
  
  const filteredColors = colors.filter(color => 
    color.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Cores/Pinturas</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Lista de Cores</CardTitle>
          <CardDescription>
            Gerencie as cores e pinturas disponíveis para os veículos
          </CardDescription>
          <div className="flex mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                type="search"
                placeholder="Buscar cores..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <p>Carregando...</p>
            </div>
          ) : filteredColors.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Nenhuma cor encontrada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo de Pintura</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredColors.map((color) => (
                  <TableRow key={color.id}>
                    <TableCell>{color.id}</TableCell>
                    <TableCell>{color.name}</TableCell>
                    <TableCell>{color.paintType?.name || "Não definido"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {onEdit ? (
                          <Button variant="outline" size="sm" onClick={() => onEdit(color.id)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Link href={`/colors/${color.id}/edit`}>
                            <Button variant="outline" size="sm">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir a cor "{color.name}"? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(color.id)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
