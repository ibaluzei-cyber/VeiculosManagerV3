import { db } from '../db';
import { settings } from '../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Adiciona as configurações relacionadas à personalização da aplicação
 */
async function addAppSettings() {
  try {
    console.log('Verificando e adicionando configurações da aplicação...');
    
    // Configurações a serem verificadas e adicionadas
    const configList = [
      {
        key: 'app_name',
        value: '',
        label: 'Nome da Aplicação',
        type: 'text'
      },
      {
        key: 'app_favicon',
        value: '',
        label: 'URL do Favicon',
        type: 'text'
      },
      // Novas configurações de cores do tema
      {
        key: 'theme_color_active_menu',
        value: '#0a9587',
        label: 'Cor do Menu Ativo (ex: #0a9587)',
        type: 'color'
      },
      {
        key: 'theme_color_logo_bar',
        value: '#01a896',
        label: 'Cor da Barra Abaixo do Logo (ex: #01a896)',
        type: 'color'
      },
      {
        key: 'theme_color_active_sidebar',
        value: '#e6f6f5',
        label: 'Cor de Fundo do Item Ativo na Sidebar (ex: #e6f6f5)',
        type: 'color'
      }
    ];
    
    // Verificar e adicionar cada configuração
    for (const config of configList) {
      const existingConfig = await db.query.settings.findFirst({
        where: eq(settings.key, config.key)
      });
      
      if (!existingConfig) {
        await db.insert(settings).values({
          key: config.key,
          value: config.value,
          label: config.label,
          type: config.type
        });
        console.log(`Configuração ${config.label} adicionada.`);
      } else {
        console.log(`Configuração ${config.label} já existe.`);
      }
    }
    
    console.log('Configurações da aplicação verificadas e atualizadas com sucesso!');
  } catch (error) {
    console.error('Erro ao adicionar configurações da aplicação:', error);
  } finally {
    process.exit(0);
  }
}

// Executar a função
addAppSettings();