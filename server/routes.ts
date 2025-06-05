import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { 
  setupAuth, 
  isAuthenticated, 
  isAdmin, 
  isCadastrador,
  getAllUsers,
  getUserByEmail,
  updateUser,
  getUserWithPassword,
  comparePasswords,
  hashPassword,
  updateUserPassword,
  updateUserRole,
  updateUserStatus,
  getAllRoles
} from "./auth";
import { sensitiveApiLimiter, logSecurityEvent } from "./security";
import { 
  brandInsertSchema, 
  modelInsertSchema, 
  versionInsertSchema, 
  colorInsertSchema,
  vehicleInsertSchema,
  versionColorInsertSchema,
  paintTypeInsertSchema,
  settingsInsertSchema,
  optionalInsertSchema,
  versionOptionalInsertSchema,
  directSalesInsertSchema,
  brands,
  models,
  directSales
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const apiPrefix = '/api';
  const httpServer = createServer(app);
  
  // Configurar autenticação
  setupAuth(app);
  
  // Middleware para logar todas as solicitações de API
  app.use(apiPrefix, (req, res, next) => {
    console.log(`API Request: ${req.method} ${req.originalUrl}`);
    next();
  });

  // Brands API
  app.get(`${apiPrefix}/brands`, async (req, res) => {
    try {
      const brands = await storage.getBrands();
      res.json(brands);
    } catch (error) {
      console.error("Error fetching brands:", error);
      res.status(500).json({ message: "Failed to fetch brands" });
    }
  });

  app.get(`${apiPrefix}/brands/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const brand = await storage.getBrandById(id);
      
      if (!brand) {
        return res.status(404).json({ message: "Brand not found" });
      }
      
      res.json(brand);
    } catch (error) {
      console.error("Error fetching brand:", error);
      res.status(500).json({ message: "Failed to fetch brand" });
    }
  });

  app.post(`${apiPrefix}/brands`, async (req, res) => {
    try {
      const validatedData = brandInsertSchema.parse(req.body);
      const newBrand = await storage.createBrand(validatedData);
      res.status(201).json(newBrand);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error creating brand:", error);
      res.status(500).json({ message: "Failed to create brand" });
    }
  });

  app.patch(`${apiPrefix}/brands/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = brandInsertSchema.parse(req.body);
      
      const updatedBrand = await storage.updateBrand(id, validatedData);
      
      if (!updatedBrand) {
        return res.status(404).json({ message: "Brand not found" });
      }
      
      res.json(updatedBrand);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error updating brand:", error);
      res.status(500).json({ message: "Failed to update brand" });
    }
  });

  app.delete(`${apiPrefix}/brands/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`[API DELETE /brands/:id] Requesting deletion of brand ID: ${id}`);
      
      // Verificar se existem modelos associados a esta marca diretamente na rota
      const associatedModels = await db.query.models.findMany({
        where: eq(models.brandId, id)
      });
      
      console.log(`[API DELETE /brands/:id] Found ${associatedModels.length} associated models`);
      
      if (associatedModels.length > 0) {
        console.log(`[API DELETE /brands/:id] Cannot delete: has associated models`);
        
        // Criar uma lista com os nomes dos modelos
        const modelNames = associatedModels.map(model => model.name).join(", ");
        
        return res.status(409).json({ 
          message: `Não é possível excluir esta marca porque ela possui ${associatedModels.length} modelos associados: ${modelNames}. Exclua os modelos primeiro.`,
          models: associatedModels.map(model => ({ id: model.id, name: model.name }))
        });
      }
      
      // Verificar se existem vendas diretas associadas
      const associatedDirectSales = await db.query.directSales.findMany({
        where: eq(directSales.brandId, id)
      });
      
      console.log(`[API DELETE /brands/:id] Found ${associatedDirectSales.length} associated direct sales`);
      
      if (associatedDirectSales.length > 0) {
        console.log(`[API DELETE /brands/:id] Cannot delete: has associated direct sales`);
        
        // Criar uma lista com os IDs das vendas diretas associadas
        return res.status(409).json({ 
          message: `Não é possível excluir esta marca porque ela possui ${associatedDirectSales.length} vendas diretas associadas. Exclua as vendas diretas primeiro.`,
          directSales: associatedDirectSales.map(sale => ({ id: sale.id }))
        });
      }
      
      // Se não houver dependências, excluir a marca
      console.log(`[API DELETE /brands/:id] No dependencies found, proceeding with deletion`);
      await db.delete(brands).where(eq(brands.id, id));
      console.log(`[API DELETE /brands/:id] Brand deleted successfully`);
      
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting brand:", error);
      
      // Verificar se o erro é por causa de dependências (redundante, mas mantendo por segurança)
      const errorMessage = error instanceof Error ? error.message : "Failed to delete brand";
      
      if (errorMessage.includes('associated models') || errorMessage.includes('associated direct sales')) {
        // Erro de restrição de relacionamento - código 409 Conflict
        return res.status(409).json({ message: errorMessage });
      }
      
      // Outros erros - código 500 Server Error
      res.status(500).json({ message: "Failed to delete brand" });
    }
  });

  // Models API
  app.get(`${apiPrefix}/models`, async (req, res) => {
    try {
      const models = await storage.getModels();
      res.json(models);
    } catch (error) {
      console.error("Error fetching models:", error);
      res.status(500).json({ message: "Failed to fetch models" });
    }
  });

  app.get(`${apiPrefix}/models/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const model = await storage.getModelById(id);
      
      if (!model) {
        return res.status(404).json({ message: "Model not found" });
      }
      
      res.json(model);
    } catch (error) {
      console.error("Error fetching model:", error);
      res.status(500).json({ message: "Failed to fetch model" });
    }
  });

  app.post(`${apiPrefix}/models`, async (req, res) => {
    try {
      const validatedData = modelInsertSchema.parse(req.body);
      const newModel = await storage.createModel(validatedData);
      res.status(201).json(newModel);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error creating model:", error);
      res.status(500).json({ message: "Failed to create model" });
    }
  });

  app.patch(`${apiPrefix}/models/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = modelInsertSchema.parse(req.body);
      
      const updatedModel = await storage.updateModel(id, validatedData);
      
      if (!updatedModel) {
        return res.status(404).json({ message: "Model not found" });
      }
      
      res.json(updatedModel);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error updating model:", error);
      res.status(500).json({ message: "Failed to update model" });
    }
  });

  app.delete(`${apiPrefix}/models/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteModel(id);
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting model:", error);
      res.status(500).json({ message: "Failed to delete model" });
    }
  });

  // Versions API
  app.get(`${apiPrefix}/versions`, async (req, res) => {
    try {
      const versions = await storage.getVersions();
      res.json(versions);
    } catch (error) {
      console.error("Error fetching versions:", error);
      res.status(500).json({ message: "Failed to fetch versions" });
    }
  });

  app.get(`${apiPrefix}/versions/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const version = await storage.getVersionById(id);
      
      if (!version) {
        return res.status(404).json({ message: "Version not found" });
      }
      
      res.json(version);
    } catch (error) {
      console.error("Error fetching version:", error);
      res.status(500).json({ message: "Failed to fetch version" });
    }
  });

  app.post(`${apiPrefix}/versions`, async (req, res) => {
    try {
      const validatedData = versionInsertSchema.parse(req.body);
      const newVersion = await storage.createVersion(validatedData);
      res.status(201).json(newVersion);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error creating version:", error);
      res.status(500).json({ message: "Failed to create version" });
    }
  });

  app.patch(`${apiPrefix}/versions/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = versionInsertSchema.parse(req.body);
      
      const updatedVersion = await storage.updateVersion(id, validatedData);
      
      if (!updatedVersion) {
        return res.status(404).json({ message: "Version not found" });
      }
      
      res.json(updatedVersion);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error updating version:", error);
      res.status(500).json({ message: "Failed to update version" });
    }
  });

  app.delete(`${apiPrefix}/versions/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteVersion(id);
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting version:", error);
      res.status(500).json({ message: "Failed to delete version" });
    }
  });

  // Colors API
  app.get(`${apiPrefix}/colors`, async (req, res) => {
    try {
      const colors = await storage.getColors();
      res.json(colors);
    } catch (error) {
      console.error("Error fetching colors:", error);
      res.status(500).json({ message: "Failed to fetch colors" });
    }
  });

  app.get(`${apiPrefix}/colors/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const color = await storage.getColorById(id);
      
      if (!color) {
        return res.status(404).json({ message: "Color not found" });
      }
      
      res.json(color);
    } catch (error) {
      console.error("Error fetching color:", error);
      res.status(500).json({ message: "Failed to fetch color" });
    }
  });

  app.post(`${apiPrefix}/colors`, async (req, res) => {
    try {
      const validatedData = colorInsertSchema.parse(req.body);
      const newColor = await storage.createColor(validatedData);
      res.status(201).json(newColor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error creating color:", error);
      res.status(500).json({ message: "Failed to create color" });
    }
  });

  app.patch(`${apiPrefix}/colors/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = colorInsertSchema.parse(req.body);
      
      const updatedColor = await storage.updateColor(id, validatedData);
      
      if (!updatedColor) {
        return res.status(404).json({ message: "Color not found" });
      }
      
      res.json(updatedColor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error updating color:", error);
      res.status(500).json({ message: "Failed to update color" });
    }
  });

  app.delete(`${apiPrefix}/colors/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteColor(id);
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting color:", error);
      res.status(500).json({ message: "Failed to delete color" });
    }
  });

  // Paint Types API
  app.get(`${apiPrefix}/paint-types`, async (req, res) => {
    try {
      const paintTypes = await storage.getPaintTypes();
      res.json(paintTypes);
    } catch (error) {
      console.error("Error fetching paint types:", error);
      res.status(500).json({ message: "Failed to fetch paint types" });
    }
  });

  app.get(`${apiPrefix}/paint-types/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const paintType = await storage.getPaintTypeById(id);
      
      if (!paintType) {
        return res.status(404).json({ message: "Paint type not found" });
      }
      
      res.json(paintType);
    } catch (error) {
      console.error("Error fetching paint type:", error);
      res.status(500).json({ message: "Failed to fetch paint type" });
    }
  });

  app.post(`${apiPrefix}/paint-types`, async (req, res) => {
    try {
      const validatedData = paintTypeInsertSchema.parse(req.body);
      const newPaintType = await storage.createPaintType(validatedData);
      res.status(201).json(newPaintType);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error creating paint type:", error);
      res.status(500).json({ message: "Failed to create paint type" });
    }
  });

  app.patch(`${apiPrefix}/paint-types/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = paintTypeInsertSchema.parse(req.body);
      
      const updatedPaintType = await storage.updatePaintType(id, validatedData);
      
      if (!updatedPaintType) {
        return res.status(404).json({ message: "Paint type not found" });
      }
      
      res.json(updatedPaintType);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error updating paint type:", error);
      res.status(500).json({ message: "Failed to update paint type" });
    }
  });

  app.delete(`${apiPrefix}/paint-types/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deletePaintType(id);
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting paint type:", error);
      res.status(500).json({ message: "Failed to delete paint type" });
    }
  });

  // Version Colors API
  app.get(`${apiPrefix}/version-colors`, isAuthenticated, async (req, res) => {
    try {
      const modelId = req.query.modelId ? parseInt(req.query.modelId as string) : undefined;
      const versionId = req.query.versionId ? parseInt(req.query.versionId as string) : undefined;
      
      const versionColors = await storage.getVersionColors({ modelId, versionId });
      res.json(versionColors);
    } catch (error) {
      console.error("Error fetching version colors:", error);
      res.status(500).json({ message: "Failed to fetch version colors" });
    }
  });

  app.get(`${apiPrefix}/version-colors/:id`, isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const versionColor = await storage.getVersionColorById(id);
      
      if (!versionColor) {
        return res.status(404).json({ message: "Version color not found" });
      }
      
      res.json(versionColor);
    } catch (error) {
      console.error("Error fetching version color:", error);
      res.status(500).json({ message: "Failed to fetch version color" });
    }
  });

  app.post(`${apiPrefix}/version-colors`, isAuthenticated, async (req, res) => {
    try {
      const validatedData = versionColorInsertSchema.parse(req.body);
      const newVersionColor = await storage.createVersionColor(validatedData);
      res.status(201).json(newVersionColor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error creating version color:", error);
      res.status(500).json({ message: "Failed to create version color" });
    }
  });

  app.patch(`${apiPrefix}/version-colors/:id`, isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = versionColorInsertSchema.parse(req.body);
      
      const updatedVersionColor = await storage.updateVersionColor(id, validatedData);
      
      if (!updatedVersionColor) {
        return res.status(404).json({ message: "Version color not found" });
      }
      
      res.json(updatedVersionColor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error updating version color:", error);
      res.status(500).json({ message: "Failed to update version color" });
    }
  });

  app.delete(`${apiPrefix}/version-colors/:id`, isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteVersionColor(id);
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting version color:", error);
      res.status(500).json({ message: "Failed to delete version color" });
    }
  });

  // Vehicles API
  app.get(`${apiPrefix}/vehicles`, async (req, res) => {
    try {
      const vehicles = await storage.getVehicles();
      res.json(vehicles);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      res.status(500).json({ message: "Failed to fetch vehicles" });
    }
  });

  app.get(`${apiPrefix}/vehicles/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const vehicle = await storage.getVehicleById(id);
      
      if (!vehicle) {
        return res.status(404).json({ message: "Vehicle not found" });
      }
      
      res.json(vehicle);
    } catch (error) {
      console.error("Error fetching vehicle:", error);
      res.status(500).json({ message: "Failed to fetch vehicle" });
    }
  });

  app.post(`${apiPrefix}/vehicles`, async (req, res) => {
    try {
      console.log("POST /vehicles - Dados recebidos:", JSON.stringify(req.body, null, 2));
      
      // Garantir que apenas o versionId, colorId e year são convertidos para números
      // mas mantemos os campos de preço como strings para o schema
      const processedData = {
        ...req.body,
        versionId: parseInt(req.body.versionId),
        colorId: req.body.colorId ? parseInt(req.body.colorId) : null,
        year: parseInt(req.body.year),
        // Não convertemos os campos de preço para número
      };
      
      console.log("Dados processados para validação:", JSON.stringify(processedData, null, 2));
      
      const validatedData = vehicleInsertSchema.parse(processedData);
      console.log("Dados validados:", JSON.stringify(validatedData, null, 2));
      
      const newVehicle = await storage.createVehicle(validatedData);
      res.status(201).json(newVehicle);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Erro de validação Zod:", JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error creating vehicle:", error);
      res.status(500).json({ message: "Failed to create vehicle" });
    }
  });

  app.patch(`${apiPrefix}/vehicles/:id`, async (req, res) => {
    console.log(`[PATCH /api/vehicles/:id] Received request to update vehicle ID: ${req.params.id}`);
    console.log('[PATCH /api/vehicles/:id] Request body:', JSON.stringify(req.body, null, 2));
    
    try {
      const id = parseInt(req.params.id);
      console.log(`[PATCH /api/vehicles/:id] Parsed ID: ${id}`);
      
      try {
        // Garantir que apenas o versionId, colorId e year são convertidos para números
        // mas mantemos os campos de preço como strings para o schema
        const processedData = {
          ...req.body,
          versionId: parseInt(req.body.versionId),
          colorId: req.body.colorId ? parseInt(req.body.colorId) : null,
          year: parseInt(req.body.year),
          // Não convertemos os campos de preço para número
        };
        
        console.log('Dados processados para validação:', JSON.stringify(processedData, null, 2));
        
        const validatedData = vehicleInsertSchema.parse(processedData);
        console.log('[PATCH /api/vehicles/:id] Data validated successfully with schema');
        
        console.log('[PATCH /api/vehicles/:id] Calling storage.updateVehicle...');
        const updatedVehicle = await storage.updateVehicle(id, validatedData);
        
        if (!updatedVehicle) {
          console.log(`[PATCH /api/vehicles/:id] Vehicle with ID ${id} not found`);
          return res.status(404).json({ message: "Vehicle not found" });
        }
        
        console.log('[PATCH /api/vehicles/:id] Vehicle updated successfully, sending response');
        return res.json(updatedVehicle);
      } catch (zodError) {
        if (zodError instanceof z.ZodError) {
          console.error('[PATCH /api/vehicles/:id] Validation error:', JSON.stringify(zodError.errors, null, 2));
          return res.status(400).json({ errors: zodError.errors });
        }
        throw zodError; // Re-throw if not a Zod error
      }
    } catch (error) {
      console.error('[PATCH /api/vehicles/:id] Server error:', error);
      return res.status(500).json({ 
        message: "Failed to update vehicle", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.delete(`${apiPrefix}/vehicles/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteVehicle(id);
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      res.status(500).json({ message: "Failed to delete vehicle" });
    }
  });

  // API para gerenciamento de permissões personalizadas
  app.get(`${apiPrefix}/permissions`, isAuthenticated, async (req, res) => {
    try {
      const customPermissions = await storage.getCustomPermissions();
      
      // Transformar o resultado em um objeto para facilitar o uso no cliente
      const permissionsMap: Record<string, Record<string, boolean>> = {};
      
      customPermissions.forEach(perm => {
        permissionsMap[perm.roleName] = perm.permissions as Record<string, boolean>;
      });
      
      res.json(permissionsMap);
    } catch (error) {
      console.error("Erro ao buscar permissões:", error);
      res.status(500).json({ message: "Erro ao buscar permissões" });
    }
  });
  
  app.get(`${apiPrefix}/permissions/:roleName`, isAuthenticated, async (req, res) => {
    try {
      const { roleName } = req.params;
      const permissions = await storage.getCustomPermissionsByRole(roleName);
      
      if (!permissions) {
        return res.status(404).json({ message: "Permissões não encontradas para este papel" });
      }
      
      res.json(permissions.permissions);
    } catch (error) {
      console.error("Erro ao buscar permissões por papel:", error);
      res.status(500).json({ message: "Erro ao buscar permissões por papel" });
    }
  });
  
  app.post(`${apiPrefix}/permissions`, isAdmin, async (req, res) => {
    try {
      const { role, permissions } = req.body;
      
      if (!role || !permissions) {
        return res.status(400).json({ message: "Papel e permissões são obrigatórios" });
      }
      
      const result = await storage.createOrUpdateCustomPermissions({
        roleName: role,
        permissions: permissions
      });
      
      res.json(result[0]);
    } catch (error) {
      console.error("Erro ao salvar permissões:", error);
      res.status(500).json({ message: "Erro ao salvar permissões" });
    }
  });
  
  app.delete(`${apiPrefix}/permissions/:roleName`, isAdmin, async (req, res) => {
    try {
      const { roleName } = req.params;
      const result = await storage.deleteCustomPermissions(roleName);
      
      if (!result) {
        return res.status(404).json({ message: "Permissões não encontradas para este papel" });
      }
      
      res.json({ message: "Permissões resetadas com sucesso" });
    } catch (error) {
      console.error("Erro ao resetar permissões:", error);
      res.status(500).json({ message: "Erro ao resetar permissões" });
    }
  });

  // Settings API
  app.get(`${apiPrefix}/settings`, async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.get(`${apiPrefix}/settings/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const setting = await storage.getSetting(id);
      
      if (!setting) {
        return res.status(404).json({ message: "Setting not found" });
      }
      
      res.json(setting);
    } catch (error) {
      console.error("Error fetching setting:", error);
      res.status(500).json({ message: "Failed to fetch setting" });
    }
  });

  app.get(`${apiPrefix}/settings/key/:key`, async (req, res) => {
    try {
      const key = req.params.key;
      const setting = await storage.getSettingByKey(key);
      
      if (!setting) {
        return res.status(404).json({ message: "Setting not found" });
      }
      
      res.json(setting);
    } catch (error) {
      console.error("Error fetching setting by key:", error);
      res.status(500).json({ message: "Failed to fetch setting" });
    }
  });

  app.post(`${apiPrefix}/settings`, async (req, res) => {
    try {
      const validatedData = settingsInsertSchema.parse(req.body);
      const newSetting = await storage.createSetting(validatedData);
      res.status(201).json(newSetting);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error creating setting:", error);
      res.status(500).json({ message: "Failed to create setting" });
    }
  });

  app.patch(`${apiPrefix}/settings/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = settingsInsertSchema.parse(req.body);
      
      const updatedSetting = await storage.updateSetting(id, validatedData);
      
      if (!updatedSetting) {
        return res.status(404).json({ message: "Setting not found" });
      }
      
      res.json(updatedSetting);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error updating setting:", error);
      res.status(500).json({ message: "Failed to update setting" });
    }
  });

  app.patch(`${apiPrefix}/settings/key/:key`, async (req, res) => {
    try {
      const key = req.params.key;
      const { value } = req.body;
      
      // Valor pode ser vazio (string vazia) mas não indefinido
      if (value === undefined) {
        return res.status(400).json({ message: "Value is required" });
      }
      
      // Garantimos que o valor seja sempre uma string válida
      const stringValue = value.toString();
      
      const updatedSetting = await storage.updateSettingByKey(key, stringValue);
      
      if (!updatedSetting) {
        return res.status(404).json({ message: "Setting not found" });
      }
      
      res.json(updatedSetting);
    } catch (error) {
      console.error("Error updating setting by key:", error);
      res.status(500).json({ message: "Failed to update setting" });
    }
  });

  app.delete(`${apiPrefix}/settings/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteSetting(id);
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting setting:", error);
      res.status(500).json({ message: "Failed to delete setting" });
    }
  });

  // Opcionais API
  app.get(`${apiPrefix}/optionals`, async (req, res) => {
    try {
      const optionals = await storage.getOptionals();
      res.json(optionals);
    } catch (error) {
      console.error("Error fetching optionals:", error);
      res.status(500).json({ message: "Failed to fetch optionals" });
    }
  });

  app.get(`${apiPrefix}/optionals/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const optional = await storage.getOptionalById(id);
      
      if (!optional) {
        return res.status(404).json({ message: "Optional not found" });
      }
      
      res.json(optional);
    } catch (error) {
      console.error("Error fetching optional:", error);
      res.status(500).json({ message: "Failed to fetch optional" });
    }
  });

  app.post(`${apiPrefix}/optionals`, async (req, res) => {
    try {
      const validatedData = optionalInsertSchema.parse(req.body);
      const newOptional = await storage.createOptional(validatedData);
      res.status(201).json(newOptional);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error creating optional:", error);
      res.status(500).json({ message: "Failed to create optional" });
    }
  });

  app.patch(`${apiPrefix}/optionals/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = optionalInsertSchema.parse(req.body);
      
      const updatedOptional = await storage.updateOptional(id, validatedData);
      
      if (!updatedOptional) {
        return res.status(404).json({ message: "Optional not found" });
      }
      
      res.json(updatedOptional);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error updating optional:", error);
      res.status(500).json({ message: "Failed to update optional" });
    }
  });

  app.delete(`${apiPrefix}/optionals/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteOptional(id);
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting optional:", error);
      res.status(500).json({ message: "Failed to delete optional" });
    }
  });

  // Versão-Opcionais API
  app.get(`${apiPrefix}/version-optionals`, isAuthenticated, async (req, res) => {
    try {
      const { modelId, versionId } = req.query;
      const options: any = {};
      
      if (modelId) options.modelId = parseInt(modelId as string);
      if (versionId) options.versionId = parseInt(versionId as string);
      
      const versionOptionals = await storage.getVersionOptionals(options);
      res.json(versionOptionals);
    } catch (error) {
      console.error("Error fetching version optionals:", error);
      res.status(500).json({ message: "Failed to fetch version optionals" });
    }
  });

  app.get(`${apiPrefix}/version-optionals/:id`, isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const versionOptional = await storage.getVersionOptionalById(id);
      
      if (!versionOptional) {
        return res.status(404).json({ message: "Version optional not found" });
      }
      
      res.json(versionOptional);
    } catch (error) {
      console.error("Error fetching version optional:", error);
      res.status(500).json({ message: "Failed to fetch version optional" });
    }
  });

  app.post(`${apiPrefix}/version-optionals`, async (req, res) => {
    try {
      const validatedData = versionOptionalInsertSchema.parse(req.body);
      const newVersionOptional = await storage.createVersionOptional(validatedData);
      res.status(201).json(newVersionOptional);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error creating version optional:", error);
      res.status(500).json({ message: "Failed to create version optional" });
    }
  });

  app.patch(`${apiPrefix}/version-optionals/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = versionOptionalInsertSchema.parse(req.body);
      
      const updatedVersionOptional = await storage.updateVersionOptional(id, validatedData);
      
      if (!updatedVersionOptional) {
        return res.status(404).json({ message: "Version optional not found" });
      }
      
      res.json(updatedVersionOptional);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error updating version optional:", error);
      res.status(500).json({ message: "Failed to update version optional" });
    }
  });

  app.delete(`${apiPrefix}/version-optionals/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteVersionOptional(id);
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting version optional:", error);
      res.status(500).json({ message: "Failed to delete version optional" });
    }
  });

  // Direct Sales API
  app.get(`${apiPrefix}/direct-sales`, isAuthenticated, async (req, res) => {
    try {
      const directSales = await storage.getDirectSales();
      res.json(directSales);
    } catch (error) {
      console.error("Error fetching direct sales:", error);
      res.status(500).json({ message: "Failed to fetch direct sales" });
    }
  });

  app.get(`${apiPrefix}/direct-sales/:id`, isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const directSale = await storage.getDirectSaleById(id);
      
      if (!directSale) {
        return res.status(404).json({ message: "Direct sale not found" });
      }
      
      res.json(directSale);
    } catch (error) {
      console.error("Error fetching direct sale:", error);
      res.status(500).json({ message: "Failed to fetch direct sale" });
    }
  });

  app.post(`${apiPrefix}/direct-sales`, async (req, res) => {
    try {
      const validatedData = directSalesInsertSchema.parse(req.body);
      const newDirectSale = await storage.createDirectSale(validatedData);
      res.status(201).json(newDirectSale);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error creating direct sale:", error);
      res.status(500).json({ message: "Failed to create direct sale" });
    }
  });

  app.patch(`${apiPrefix}/direct-sales/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = directSalesInsertSchema.parse(req.body);
      
      const updatedDirectSale = await storage.updateDirectSale(id, validatedData);
      
      if (!updatedDirectSale) {
        return res.status(404).json({ message: "Direct sale not found" });
      }
      
      res.json(updatedDirectSale);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error updating direct sale:", error);
      res.status(500).json({ message: "Failed to update direct sale" });
    }
  });

  app.delete(`${apiPrefix}/direct-sales/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteDirectSale(id);
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting direct sale:", error);
      res.status(500).json({ message: "Failed to delete direct sale" });
    }
  });

  // Rotas de gerenciamento de usuários
  app.get(`${apiPrefix}/users`, isAdmin, async (req, res) => {
    try {
      const users = await getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      res.status(500).json({ message: "Erro ao buscar usuários" });
    }
  });
  
  // Rota para obter todos os papéis de usuário
  app.get(`${apiPrefix}/roles`, isAuthenticated, async (req, res) => {
    try {
      const roles = await getAllRoles();
      res.json(roles);
    } catch (error) {
      console.error("Erro ao buscar papéis:", error);
      res.status(500).json({ message: "Erro ao buscar papéis de usuário" });
    }
  });

  app.put(`${apiPrefix}/users/:id`, isAuthenticated, sensitiveApiLimiter, async (req, res) => {
    const userId = parseInt(req.params.id);
    
    // Verificar se o usuário está tentando editar seu próprio perfil
    // @ts-ignore - Sabemos que req.user existe devido ao middleware isAuthenticated
    if (req.user.id !== userId && req.user.role.name !== "Administrador") {
      logSecurityEvent("USER_UPDATE_UNAUTHORIZED", {
        attemptedUserId: userId,
        currentUserId: req.user.id,
        currentUserRole: req.user.role.name
      }, req);
      return res.status(403).json({ message: "Você não tem permissão para editar este perfil" });
    }
    
    try {
      const { name, email } = req.body;
      
      // Verificar se o e-mail já existe (exceto para o próprio usuário)
      const existingUser = await getUserByEmail(email);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ message: "Este e-mail já está em uso" });
      }
      
      // Atualizar usuário
      const updatedUser = await updateUser(userId, { name, email });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      logSecurityEvent("USER_UPDATE_SUCCESS", {
        updatedUserId: userId,
        updatedBy: req.user!.id,
        changes: { name, email }
      }, req);
      
      res.json(updatedUser);
    } catch (error) {
      logSecurityEvent("USER_UPDATE_ERROR", {
        userId,
        error: error instanceof Error ? error.message : String(error)
      }, req);
      console.error("Erro ao atualizar usuário:", error);
      res.status(500).json({ message: "Erro ao atualizar usuário" });
    }
  });

  app.put(`${apiPrefix}/users/:id/password`, isAuthenticated, sensitiveApiLimiter, async (req, res) => {
    const userId = parseInt(req.params.id);
    const currentUser = req.user as any;
    
    logSecurityEvent("PASSWORD_CHANGE_ATTEMPT", {
      targetUserId: userId,
      requestedBy: currentUser.id
    }, req);
    
    // Verificar se o usuário está tentando alterar sua própria senha
    if (currentUser.id !== userId) {
      logSecurityEvent("PASSWORD_CHANGE_UNAUTHORIZED", {
        targetUserId: userId,
        attemptedBy: currentUser.id
      }, req);
      return res.status(403).json({ message: "Você não tem permissão para alterar esta senha" });
    }
    
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Senha atual e nova senha são obrigatórias" });
      }
      
      // Obter usuário com senha
      const user = await getUserWithPassword(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Verificar senha atual
      const isPasswordCorrect = await comparePasswords(currentPassword, user.password);
      if (!isPasswordCorrect) {
        logSecurityEvent("PASSWORD_CHANGE_WRONG_CURRENT", {
          userId,
          attemptedBy: currentUser.id
        }, req);
        return res.status(400).json({ message: "Senha atual incorreta" });
      }
      
      // Hash da nova senha e atualização
      const hashedPassword = await hashPassword(newPassword);
      const updateResult = await updateUserPassword(userId, hashedPassword);
      
      logSecurityEvent("PASSWORD_CHANGE_SUCCESS", {
        userId,
        changedBy: currentUser.id
      }, req);
      
      res.json({ message: "Senha atualizada com sucesso" });
    } catch (error) {
      logSecurityEvent("PASSWORD_CHANGE_ERROR", {
        userId,
        error: error instanceof Error ? error.message : String(error)
      }, req);
      console.error("Erro ao atualizar senha:", error);
      res.status(500).json({ message: "Erro ao atualizar senha" });
    }
  });

  // Rota para atualizar o papel de um usuário (apenas para administradores)
  app.put(`${apiPrefix}/users/:id/role`, isAuthenticated, isAdmin, sensitiveApiLimiter, async (req, res) => {
    const userId = parseInt(req.params.id);
    const { roleId } = req.body;
    const currentUser = req.user as any;
    
    logSecurityEvent("USER_ROLE_CHANGE_ATTEMPT", {
      targetUserId: userId,
      newRoleId: roleId,
      changedBy: currentUser.id
    }, req);
    
    // Validação básica
    if (!roleId || typeof roleId !== 'number') {
      return res.status(400).json({ message: "ID do papel inválido" });
    }
    
    try {
      const updatedUser = await updateUserRole(userId, roleId);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      logSecurityEvent("USER_ROLE_CHANGE_SUCCESS", {
        targetUserId: userId,
        newRoleId: roleId,
        changedBy: currentUser.id
      }, req);
      
      res.json(updatedUser);
    } catch (error) {
      logSecurityEvent("USER_ROLE_CHANGE_ERROR", {
        targetUserId: userId,
        error: error instanceof Error ? error.message : String(error)
      }, req);
      console.error("Erro ao atualizar papel do usuário:", error);
      res.status(500).json({ message: "Erro ao atualizar papel do usuário" });
    }
  });

  // Rota para atualizar o status de um usuário (apenas para administradores)
  app.put(`${apiPrefix}/users/:id/status`, isAuthenticated, isAdmin, sensitiveApiLimiter, async (req, res) => {
    const userId = parseInt(req.params.id);
    const { isActive } = req.body;
    const currentUser = req.user as any;
    
    logSecurityEvent("USER_STATUS_CHANGE_ATTEMPT", {
      targetUserId: userId,
      newStatus: isActive,
      changedBy: currentUser.id
    }, req);
    
    // Validação básica
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ message: "Status inválido" });
    }
    
    try {
      const updatedUser = await updateUserStatus(userId, isActive);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      logSecurityEvent("USER_STATUS_CHANGE_SUCCESS", {
        targetUserId: userId,
        newStatus: isActive,
        changedBy: currentUser.id
      }, req);
      
      res.json(updatedUser);
    } catch (error) {
      logSecurityEvent("USER_STATUS_CHANGE_ERROR", {
        targetUserId: userId,
        error: error instanceof Error ? error.message : String(error)
      }, req);
      console.error("Erro ao atualizar status do usuário:", error);
      res.status(500).json({ message: "Erro ao atualizar status do usuário" });
    }
  });

  // Rotas para gerenciar permissões personalizadas
  app.get(`${apiPrefix}/permissions`, isAuthenticated, isAdmin, async (req, res) => {
    try {
      // Buscar todas as permissões personalizadas
      const customPermissions = await storage.getCustomPermissions();
      
      // Transformar em um objeto organizado por papel
      const result: Record<string, Record<string, boolean>> = {};
      
      customPermissions.forEach(permission => {
        result[permission.roleName] = permission.permissions as Record<string, boolean>;
      });
      
      res.json(result);
    } catch (error) {
      console.error("Erro ao buscar permissões:", error);
      res.status(500).json({ message: "Erro ao buscar permissões" });
    }
  });

  // Buscar permissões de um papel específico
  app.get(`${apiPrefix}/permissions/:roleName`, isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { roleName } = req.params;
      const permissions = await storage.getCustomPermissionsByRole(roleName);
      
      if (!permissions) {
        // Se não existem permissões personalizadas, retornar objeto vazio
        return res.json({});
      }
      
      res.json(permissions.permissions);
    } catch (error) {
      console.error(`Erro ao buscar permissões para ${req.params.roleName}:`, error);
      res.status(500).json({ message: "Erro ao buscar permissões" });
    }
  });

  // Criar ou atualizar permissões
  app.post(`${apiPrefix}/permissions`, isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { role, permissions } = req.body;
      
      if (!role || typeof role !== 'string') {
        return res.status(400).json({ message: "Papel de usuário inválido" });
      }
      
      if (!permissions || typeof permissions !== 'object') {
        return res.status(400).json({ message: "Permissões inválidas" });
      }
      
      // Verificar se o papel existe
      const roles = await getAllRoles();
      const roleExists = roles.some(r => r.name === role);
      
      if (!roleExists) {
        return res.status(404).json({ message: "Papel de usuário não encontrado" });
      }
      
      // Não permitir modificar permissões de Administrador
      if (role === "Administrador") {
        return res.status(403).json({ 
          message: "Não é possível modificar permissões do Administrador, que sempre tem acesso total" 
        });
      }
      
      const result = await storage.createOrUpdateCustomPermissions({
        roleName: role,
        permissions: permissions
      });
      
      res.status(200).json(result);
    } catch (error) {
      console.error("Erro ao salvar permissões:", error);
      res.status(500).json({ message: "Erro ao salvar permissões" });
    }
  });

  // Excluir permissões personalizadas (voltar ao padrão)
  app.delete(`${apiPrefix}/permissions/:roleName`, isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { roleName } = req.params;
      
      // Não permitir modificar permissões de Administrador
      if (roleName === "Administrador") {
        return res.status(403).json({ 
          message: "Não é possível modificar permissões do Administrador, que sempre tem acesso total" 
        });
      }
      
      const result = await storage.deleteCustomPermissions(roleName);
      
      res.status(200).json({ 
        message: "Permissões resetadas para o padrão",
        result 
      });
    } catch (error) {
      console.error(`Erro ao excluir permissões para ${req.params.roleName}:`, error);
      res.status(500).json({ message: "Erro ao excluir permissões" });
    }
  });

  return httpServer;
}
