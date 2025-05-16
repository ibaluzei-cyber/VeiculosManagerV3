import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Pencil, Trash } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { Optional } from "@/lib/types";
import { formatBRCurrency } from "@/lib/formatters";

interface OptionalListProps {
  onEdit?: (id: number) => void;
}

export default function OptionalList({ onEdit }: OptionalListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: optionals = [], isLoading } = useQuery<Optional[]>({
    queryKey: ["/api/optionals"],
    queryFn: getQueryFn(),
  });
  
  const handleDelete = async (id: number) => {
    try {
      await apiRequest("DELETE", `/api/optionals/${id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/optionals"] });
    } catch (error) {
      console.error("Failed to delete optional:", error);
    }
  };
  
  const filteredOptionals = optionals.filter(optional => 
    optional.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Opcionais</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Lista de Opcionais</CardTitle>
          <CardDescription>
            Gerencie os opcionais disponíveis para os veículos
          </CardDescription>
          <div className="flex mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                type="search"
                placeholder="Buscar opcionais..."
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
          ) : filteredOptionals.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Nenhum opcional encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOptionals.map((optional) => (
                  <TableRow key={optional.id}>
                    <TableCell>{optional.id}</TableCell>
                    <TableCell>{optional.name}</TableCell>
                    <TableCell>{optional.description}</TableCell>
                    <TableCell>{formatBRCurrency(Number(optional.price))}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {onEdit ? (
                          <Button variant="outline" size="sm" onClick={() => onEdit(optional.id)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Link href={`/optionals/${optional.id}/edit`}>
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
                                Tem certeza que deseja excluir o opcional "{optional.name}"? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(optional.id)}>
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