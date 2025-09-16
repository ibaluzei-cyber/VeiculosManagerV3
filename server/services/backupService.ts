import { db } from "@db";
import { 
  brands, models, versions, colors, versionColors, paintTypes, 
  optionals, versionOptionals, vehicles, settings, directSales,
  users, userRoles, customPermissions, backups 
} from "@shared/schema.ts";
import { eq, sql, gt, asc } from "drizzle-orm";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import * as tar from "tar";
import * as zlib from "zlib";

// Definir ordem das tabelas respeitando foreign keys com metadata de primary key
const BACKUP_TABLES = [
  // Tabelas base (sem dependências)
  { name: 'user_roles', table: userRoles, keyColumn: 'id' },
  { name: 'users', table: users, keyColumn: 'id' },
  { name: 'brands', table: brands, keyColumn: 'id' },
  { name: 'paint_types', table: paintTypes, keyColumn: 'id' },
  { name: 'settings', table: settings, keyColumn: 'id' },
  
  // Tabelas com dependências de primeiro nível
  { name: 'models', table: models, keyColumn: 'id' },
  { name: 'colors', table: colors, keyColumn: 'id' },
  { name: 'optionals', table: optionals, keyColumn: 'id' },
  
  // Tabelas com dependências de segundo nível
  { name: 'versions', table: versions, keyColumn: 'id' },
  { name: 'direct_sales', table: directSales, keyColumn: 'id' },
  
  // Tabelas com dependências de terceiro nível
  { name: 'version_colors', table: versionColors, keyColumn: 'id' },
  { name: 'version_optionals', table: versionOptionals, keyColumn: 'id' },
  { name: 'vehicles', table: vehicles, keyColumn: 'id' },
  
  // Tabelas de sistema
  { name: 'custom_permissions', table: customPermissions, keyColumn: 'id' }
];

const BACKUP_DIR = path.join(process.cwd(), 'backups');
const SCHEMA_VERSION = '1.0.0';

interface BackupManifest {
  appName: string;
  schemaVersion: string;
  createdAt: string;
  createdBy: number;
  tableOrder: string[];
  tableCounts: Record<string, number>;
  checksums: Record<string, string>;
  dbVersion: string;
}

export class BackupService {
  
  // Garantir que o diretório de backup existe
  private async ensureBackupDir(): Promise<void> {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
  }
  
  // Criar backup completo
  async createBackup(name: string, createdBy: number): Promise<{ backupId: number; fileName: string }> {
    await this.ensureBackupDir();
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup-${timestamp}.tar.gz`;
    const filePath = path.join(BACKUP_DIR, fileName);
    const tempDir = path.join(BACKUP_DIR, `temp-${timestamp}`);
    
    try {
      // Criar diretório temporário
      fs.mkdirSync(tempDir, { recursive: true });
      
      // Criar backup na base de dados com status 'creating'
      const [backupRecord] = await db.insert(backups).values({
        name,
        fileName,
        filePath,
        fileSize: 0, // Será atualizado depois
        checksum: '',
        status: 'creating',
        storageType: 'local',
        schemaVersion: SCHEMA_VERSION,
        tablesCount: BACKUP_TABLES.length,
        recordsCount: 0, // Será calculado
        createdBy
      }).returning();
      
      const tableCounts: Record<string, number> = {};
      const checksums: Record<string, string> = {};
      let totalRecords = 0;
      
      // Exportar cada tabela em uma única transação para garantir snapshot consistente
      await db.transaction(async (tx) => {
        // Definir isolation level para REPEATABLE READ para snapshot consistente
        await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ`);
        
        for (const tableInfo of BACKUP_TABLES) {
          console.log(`Exportando tabela: ${tableInfo.name}`);
          const { count, checksum } = await this.exportTable(tableInfo, tempDir, tx);
          tableCounts[tableInfo.name] = count;
          checksums[tableInfo.name] = checksum;
          totalRecords += count;
        }
      });
      
      // Criar manifest
      const manifest: BackupManifest = {
        appName: 'Vehicle Management System',
        schemaVersion: SCHEMA_VERSION,
        createdAt: new Date().toISOString(),
        createdBy,
        tableOrder: BACKUP_TABLES.map(t => t.name),
        tableCounts,
        checksums,
        dbVersion: '1.0.0'
      };
      
      const manifestPath = path.join(tempDir, 'manifest.json');
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      
      // Criar arquivo tar.gz
      await tar.create({
        gzip: true,
        file: filePath,
        cwd: tempDir
      }, ['.']);
      
      // Calcular checksum do arquivo final
      const fileBuffer = fs.readFileSync(filePath);
      const fileChecksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      const fileSize = fileBuffer.length;
      
      // Atualizar registro do backup
      await db.update(backups).set({
        fileSize,
        checksum: fileChecksum,
        status: 'completed',
        recordsCount: totalRecords,
        completedAt: new Date(),
        metadata: manifest
      }).where(eq(backups.id, backupRecord.id));
      
      // Limpar diretório temporário
      fs.rmSync(tempDir, { recursive: true, force: true });
      
      console.log(`Backup criado com sucesso: ${fileName} (${totalRecords} registros)`);
      
      return { backupId: backupRecord.id, fileName };
      
    } catch (error) {
      console.error('Erro ao criar backup:', error);
      
      // Marcar backup como falhou
      try {
        await db.update(backups).set({
          status: 'failed'
        }).where(eq(backups.id, (await db.select().from(backups).where(eq(backups.fileName, fileName)))[0]?.id));
      } catch (updateError) {
        console.error('Erro ao atualizar status do backup:', updateError);
      }
      
      // Limpar arquivos temporários
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      throw error;
    }
  }
  
  // Exportar dados de uma tabela específica com streaming real
  private async exportTable(tableInfo: { name: string, table: any, keyColumn: string }, tempDir: string, tx: any): Promise<{ count: number; checksum: string }> {
    const filePath = path.join(tempDir, `${tableInfo.name}.jsonl`);
    const writeStream = fs.createWriteStream(filePath);
    const hash = crypto.createHash('sha256');
    
    let count = 0;
    const batchSize = 1000;
    let lastId = 0; // Para paginação determinística
    
    try {
      // Verificar se a tabela tem a coluna de primary key esperada
      if (!tableInfo.keyColumn || tableInfo.keyColumn !== 'id') {
        throw new Error(`Tabela ${tableInfo.name} deve ter primary key 'id' numérica para backup streaming`);
      }
      
      while (true) {
        // Paginação determinística usando typed column refs
        // WHERE tableInfo.table.id > lastId ORDER BY tableInfo.table.id ASC
        const idColumn = tableInfo.table.id;
        
        const batch = await tx
          .select()
          .from(tableInfo.table)
          .where(gt(idColumn, lastId))
          .orderBy(asc(idColumn))
          .limit(batchSize);
        
        if (batch.length === 0) break;
        
        for (const record of batch) {
          // Manter senhas hasheadas como estão - não sanitizar
          const jsonLine = JSON.stringify(record) + '\n';
          writeStream.write(jsonLine);
          hash.update(jsonLine);
          count++;
          lastId = record.id; // Atualizar lastId para próxima iteração
        }
        
        // Se retornou menos que o batch size, chegamos ao fim
        if (batch.length < batchSize) break;
      }
      
      await new Promise((resolve, reject) => {
        writeStream.end((error) => {
          if (error) reject(error);
          else resolve(void 0);
        });
      });
      
      const checksum = hash.digest('hex');
      return { count, checksum };
      
    } catch (error) {
      writeStream.destroy();
      throw error;
    }
  }
  
  // Listar backups existentes
  async listBackups(limit: number = 50, offset: number = 0) {
    return await db.select({
      id: backups.id,
      name: backups.name,
      fileName: backups.fileName,
      fileSize: backups.fileSize,
      status: backups.status,
      storageType: backups.storageType,
      tablesCount: backups.tablesCount,
      recordsCount: backups.recordsCount,
      createdAt: backups.createdAt,
      completedAt: backups.completedAt,
      createdBy: backups.createdBy
    })
    .from(backups)
    .orderBy(backups.createdAt)
    .limit(limit)
    .offset(offset);
  }
  
  // Obter caminho do arquivo de backup
  async getBackupFilePath(backupId: number): Promise<string | null> {
    const backup = await db.select().from(backups).where(eq(backups.id, backupId));
    if (backup.length === 0 || backup[0].status !== 'completed') {
      return null;
    }
    
    const filePath = backup[0].filePath;
    if (!fs.existsSync(filePath)) {
      return null;
    }
    
    return filePath;
  }
  
  // Deletar backup
  async deleteBackup(backupId: number): Promise<boolean> {
    const backup = await db.select().from(backups).where(eq(backups.id, backupId));
    if (backup.length === 0) {
      return false;
    }
    
    const filePath = backup[0].filePath;
    
    // Remover arquivo físico se existir
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Marcar como deletado no banco
    await db.update(backups).set({
      status: 'deleted'
    }).where(eq(backups.id, backupId));
    
    return true;
  }
  
  // Validar backup sem aplicar (dry run)
  async validateBackup(filePath: string): Promise<{ valid: boolean; manifest?: BackupManifest; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      if (!fs.existsSync(filePath)) {
        errors.push('Arquivo de backup não encontrado');
        return { valid: false, errors };
      }
      
      const tempDir = path.join(BACKUP_DIR, `validate-${Date.now()}`);
      fs.mkdirSync(tempDir, { recursive: true });
      
      try {
        // Extrair arquivo
        await tar.extract({
          file: filePath,
          cwd: tempDir
        });
        
        // Ler manifest
        const manifestPath = path.join(tempDir, 'manifest.json');
        if (!fs.existsSync(manifestPath)) {
          errors.push('Manifest não encontrado no backup');
          return { valid: false, errors };
        }
        
        const manifest: BackupManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        
        // Validar versão do schema
        if (manifest.schemaVersion !== SCHEMA_VERSION) {
          errors.push(`Versão do schema incompatível. Backup: ${manifest.schemaVersion}, Sistema: ${SCHEMA_VERSION}`);
        }
        
        // Verificar se todas as tabelas estão presentes e validar checksums
        for (const tableName of manifest.tableOrder) {
          const tableFile = path.join(tempDir, `${tableName}.jsonl`);
          if (!fs.existsSync(tableFile)) {
            errors.push(`Arquivo da tabela ${tableName} não encontrado`);
          } else {
            // Recomputar checksum e comparar com o manifest
            const fileContent = fs.readFileSync(tableFile, 'utf8');
            const computedChecksum = crypto.createHash('sha256').update(fileContent).digest('hex');
            const expectedChecksum = manifest.checksums[tableName];
            
            if (computedChecksum !== expectedChecksum) {
              errors.push(`Checksum inválido para tabela ${tableName}. Esperado: ${expectedChecksum}, Computado: ${computedChecksum}`);
            }
          }
        }
        
        // Limpar diretório temporário
        fs.rmSync(tempDir, { recursive: true, force: true });
        
        return { 
          valid: errors.length === 0, 
          manifest: errors.length === 0 ? manifest : undefined, 
          errors 
        };
        
      } catch (extractError) {
        errors.push(`Erro ao extrair backup: ${extractError instanceof Error ? extractError.message : String(extractError)}`);
        // Limpar diretório temporário se criado
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
        return { valid: false, errors };
      }
      
    } catch (error) {
      errors.push(`Erro ao validar backup: ${error instanceof Error ? error.message : String(error)}`);
      return { valid: false, errors };
    }
  }
  
  // Restaurar backup
  async restoreBackup(
    filePath: string, 
    mode: 'merge' | 'replace' = 'merge',
    dryRun: boolean = false
  ): Promise<{ success: boolean; message: string; restoredCounts?: Record<string, number> }> {
    try {
      // Primeiro validar o backup
      const validation = await this.validateBackup(filePath);
      if (!validation.valid) {
        return { 
          success: false, 
          message: `Backup inválido: ${validation.errors.join(', ')}` 
        };
      }
      
      const manifest = validation.manifest!;
      const tempDir = path.join(BACKUP_DIR, `restore-${Date.now()}`);
      fs.mkdirSync(tempDir, { recursive: true });
      
      try {
        // Extrair arquivo
        await tar.extract({
          file: filePath,
          cwd: tempDir
        });
        
        if (dryRun) {
          // Modo dry run - apenas contar registros
          const counts: Record<string, number> = {};
          for (const tableName of manifest.tableOrder) {
            const tableFile = path.join(tempDir, `${tableName}.jsonl`);
            if (fs.existsSync(tableFile)) {
              const lines = fs.readFileSync(tableFile, 'utf8').split('\n').filter(line => line.trim());
              counts[tableName] = lines.length;
            }
          }
          
          // Limpar diretório temporário
          fs.rmSync(tempDir, { recursive: true, force: true });
          
          return {
            success: true,
            message: `Dry run completado. ${Object.values(counts).reduce((a, b) => a + b, 0)} registros serão restaurados.`,
            restoredCounts: counts
          };
        }
        
        // Modo real - executar restauração em transação
        const restoredCounts: Record<string, number> = {};
        
        await db.transaction(async (tx) => {
          if (mode === 'replace') {
            // Limpar tabelas na ordem inversa (respeitando foreign keys)
            for (let i = BACKUP_TABLES.length - 1; i >= 0; i--) {
              const tableInfo = BACKUP_TABLES[i];
              if (tableInfo.name !== 'user_roles' && tableInfo.name !== 'users') {
                // Não limpar usuários e roles por segurança
                console.log(`Limpando tabela: ${tableInfo.name}`);
                await tx.delete(tableInfo.table);
              }
            }
          }
          
          // Restaurar dados na ordem correta
          for (const tableName of manifest.tableOrder) {
            const tableFile = path.join(tempDir, `${tableName}.jsonl`);
            if (!fs.existsSync(tableFile)) continue;
            
            console.log(`Restaurando tabela: ${tableName}`);
            
            const lines = fs.readFileSync(tableFile, 'utf8').split('\n').filter(line => line.trim());
            const records = lines.map(line => JSON.parse(line));
            
            if (records.length === 0) {
              restoredCounts[tableName] = 0;
              continue;
            }
            
            // Encontrar definição da tabela
            const tableInfo = BACKUP_TABLES.find(t => t.name === tableName);
            if (!tableInfo) {
              console.warn(`Tabela ${tableName} não encontrada na definição`);
              continue;
            }
            
            // Filtrar campos válidos e tratar dados especiais
            const validRecords = records.map(record => {
              // Converter campos de timestamp de string para Date primeiro
              const convertedRecord = { ...record };
              
              // Lista de campos que são timestamps e precisam de conversão
              const timestampFields = ['createdAt', 'updatedAt', 'created_at', 'updated_at', 'lastLogin', 'last_login', 'completedAt', 'completed_at'];
              
              for (const field of timestampFields) {
                if (convertedRecord[field] && typeof convertedRecord[field] === 'string') {
                  try {
                    convertedRecord[field] = new Date(convertedRecord[field]);
                  } catch (error) {
                    console.warn(`Erro ao converter campo ${field} para Date:`, error);
                    // Se não conseguir converter, manter como está
                  }
                }
              }
              
              return convertedRecord;
            }).filter(record => record !== null);
            
            if (validRecords.length > 0) {
              if (mode === 'merge') {
                // Modo merge - usar UPSERT para preservar relacionamentos
                // Manter IDs para preservar foreign keys entre tabelas
                for (const record of validRecords) {
                  try {
                    // Usar onConflictDoUpdate para UPSERT adequado
                    await tx.insert(tableInfo.table)
                      .values(record)
                      .onConflictDoUpdate({
                        target: tableInfo.table.id,
                        set: record // Atualizar todos os campos se já existir
                      });
                  } catch (error) {
                    console.error(`Erro ao fazer UPSERT em ${tableName}:`, error);
                    throw error;
                  }
                }
              } else {
                // Modo replace - inserir direto (tabelas já foram limpas)
                await tx.insert(tableInfo.table).values(validRecords);
              }
            }
            
            restoredCounts[tableName] = validRecords.length;
          }
        });
        
        // Limpar diretório temporário
        fs.rmSync(tempDir, { recursive: true, force: true });
        
        const totalRestored = Object.values(restoredCounts).reduce((a, b) => a + b, 0);
        
        return {
          success: true,
          message: `Backup restaurado com sucesso. ${totalRestored} registros restaurados.`,
          restoredCounts
        };
        
      } catch (restoreError) {
        // Limpar diretório temporário em caso de erro
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
        
        const errorMsg = restoreError instanceof Error ? restoreError.message : String(restoreError);
        return {
          success: false,
          message: `Erro durante restauração: ${errorMsg}`
        };
      }
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Erro ao restaurar backup: ${errorMsg}`
      };
    }
  }
}

export const backupService = new BackupService();