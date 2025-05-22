import React from "react";
import Header from "./Header";
import Configurator2 from "@/pages/configurator2";

export default function SimpleUserLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header simplificado */}
      <Header />
      
      {/* Conteúdo principal - Configurador em tela cheia */}
      <main className="w-full">
        <Configurator2 />
      </main>
    </div>
  );
}