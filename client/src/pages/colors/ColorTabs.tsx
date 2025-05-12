import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, RefreshCw } from "lucide-react";
import ColorList from "./ColorList";
import ColorForm from "./ColorForm";
import VersionColorForm from "./VersionColorForm";
import VersionColorList from "./VersionColorList";

export default function ColorTabs() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("list");
  const [editId, setEditId] = useState<number | null>(null);
  const [editVersionColorId, setEditVersionColorId] = useState<number | null>(null);

  const handleNewColor = () => {
    setEditId(null);
    setActiveTab("form");
  };

  const handleEditColor = (id: number) => {
    setEditId(id);
    setActiveTab("form");
  };

  const handleCancel = () => {
    setEditId(null);
    setActiveTab("list");
  };
  
  const handleEditVersionColor = (id: number) => {
    setEditVersionColorId(id);
    setActiveTab("associate"); // Redirecionar para a aba "associate" para permitir a edição completa
  };
  
  const handleCancelVersionColorEdit = () => {
    setEditVersionColorId(null);
    setActiveTab("associations");
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Gerenciamento de Cores/Pinturas</h1>
        <div className="flex gap-2">
          {activeTab === "list" && (
            <Button onClick={handleNewColor}>
              <Plus className="h-4 w-4 mr-1" />
              Nova Cor
            </Button>
          )}
          {activeTab === "form" && (
            <Button variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="list">Lista de Cores</TabsTrigger>
          <TabsTrigger value="associate">Associar Versão</TabsTrigger>
          <TabsTrigger value="associations">Cores Associadas</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
          <ColorList onEdit={handleEditColor} />
        </TabsContent>
        
        <TabsContent value="form" className="space-y-6">
          <ColorForm 
            id={editId} 
            onCancel={handleCancel} 
          />
        </TabsContent>

        <TabsContent value="associate" className="space-y-6">
          <VersionColorForm 
            id={editVersionColorId}
            onCancel={handleCancelVersionColorEdit}
          />
        </TabsContent>

        <TabsContent value="associations" className="space-y-6">
          <VersionColorList onEdit={handleEditVersionColor} />
        </TabsContent>
      </Tabs>
    </div>
  );
}