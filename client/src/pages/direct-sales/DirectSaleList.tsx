import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PlusCircle, Edit, Trash, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest, getQueryFn } from "@/lib/queryClient";

export default function DirectSaleList() {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<number | null>(null);
  const [searchFilter, setSearchFilter] = React.useState("");

  // Fetch direct sales
  const { data: directSales = [], isLoading, error } = useQuery({
    queryKey: ["/api/direct-sales"],
  });

  // Filter direct sales based on search
  const filteredDirectSales = React.useMemo(() => {
    if (!Array.isArray(directSales) || !searchFilter.trim()) return directSales;
    
    const searchTerm = searchFilter.toLowerCase().trim();
    return directSales.filter((sale: any) => 
      sale.name?.toLowerCase().includes(searchTerm) ||
      sale.brand?.name?.toLowerCase().includes(searchTerm) ||
      sale.model?.name?.toLowerCase().includes(searchTerm) ||
      sale.version?.name?.toLowerCase().includes(searchTerm)
    );
  }, [directSales, searchFilter]);

  // Delete direct sale
  const handleDelete = async (id: number) => {
    setIsDeleting(true);
    setDeleteId(id);
    
    try {
      await apiRequest("DELETE", `/api/direct-sales/${id}`);
      
      toast({
        title: "Venda direta excluída",
        description: "A venda direta foi excluída com sucesso.",
      });
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/direct-sales"] });
      
      // Trigger refresh on configurator page
      localStorage.setItem('direct-sales-updated', Date.now().toString());
    } catch (error) {
      console.error("Erro ao excluir venda direta:", error);
      toast({
        title: "Erro ao excluir",
        description: "Ocorreu um erro ao excluir a venda direta. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vendas Diretas</CardTitle>
          <CardDescription>Gerenciamento de descontos para vendas diretas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            <span className="ml-2">Carregando...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vendas Diretas</CardTitle>
          <CardDescription>Gerenciamento de descontos para vendas diretas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700">
            <p className="font-medium">Erro ao carregar vendas diretas</p>
            <p className="text-sm mt-1">Por favor, tente novamente mais tarde.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Vendas Diretas</CardTitle>
          <CardDescription>Gerenciamento de descontos para vendas diretas</CardDescription>
        </div>
        <Link href="/direct-sales/new">
          <Button className="flex items-center">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nova Venda Direta
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {/* Search Filter */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Buscar por nome, marca, modelo ou versão..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredDirectSales.length === 0 ? (
          <div className="text-center p-8 text-gray-500">
            {searchFilter.trim() ? (
              <>
                <p>Nenhum desconto encontrado para "{searchFilter}"</p>
                <p className="text-sm mt-2">
                  Tente buscar com um termo diferente ou limpe o filtro.
                </p>
              </>
            ) : (
              <>
                <p>Nenhuma venda direta cadastrada</p>
                <p className="text-sm mt-2">
                  Clique em "Nova Venda Direta" para adicionar.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="border rounded-md">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left p-3 font-medium">Nome</th>
                  <th className="text-left p-3 font-medium">Marca</th>
                  <th className="text-left p-3 font-medium">Modelo</th>
                  <th className="text-left p-3 font-medium">Versão</th>
                  <th className="text-center p-3 font-medium">Desconto (%)</th>
                  <th className="text-right p-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredDirectSales.map((sale: any) => (
                  <tr key={sale.id} className="border-t">
                    <td className="p-3">{sale.name}</td>
                    <td className="p-3">{sale.brand?.name || "N/A"}</td>
                    <td className="p-3">
                      {sale.model ? (
                        <span className="font-medium">{sale.model.name}</span>
                      ) : sale.brand ? (
                        <span className="text-blue-600 text-sm bg-blue-50 px-2 py-1 rounded">
                          Todos os modelos
                        </span>
                      ) : "-"}
                    </td>
                    <td className="p-3">
                      {sale.version ? (
                        <span className="font-medium">{sale.version.name}</span>
                      ) : sale.model ? (
                        <span className="text-green-600 text-sm bg-green-50 px-2 py-1 rounded">
                          Todas as versões
                        </span>
                      ) : sale.brand ? (
                        <span className="text-purple-600 text-sm bg-purple-50 px-2 py-1 rounded">
                          Todas as versões
                        </span>
                      ) : "-"}
                    </td>
                    <td className="p-3 text-center">{sale.discountPercentage}%</td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/direct-sales/edit/${sale.id}`}>
                          <Button size="sm" variant="ghost">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => handleDelete(sale.id)}
                          disabled={isDeleting && deleteId === sale.id}
                        >
                          {isDeleting && deleteId === sale.id ? (
                            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                          ) : (
                            <Trash className="h-4 w-4 text-red-500" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}