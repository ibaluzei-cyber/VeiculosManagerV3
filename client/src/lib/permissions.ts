// Tipos de papéis de usuário disponíveis no sistema
export type UserRole = "Administrador" | "Cadastrador" | "Usuário";

// Interface para mapear as permissões de cada rota
export interface RoutePermission {
  path: string;
  allowedRoles: UserRole[];
  description: string; // Descrição do que a rota permite fazer
}

// Matriz de permissões para todas as rotas do sistema
export const ROUTE_PERMISSIONS: RoutePermission[] = [
  // Rotas acessíveis a todos os usuários autenticados
  { path: "/", allowedRoles: ["Administrador", "Cadastrador", "Usuário"], description: "Dashboard" },
  { path: "/configurator", allowedRoles: ["Administrador", "Cadastrador", "Usuário"], description: "Configurador de veículos" },
  { path: "/configurator2", allowedRoles: ["Administrador", "Cadastrador", "Usuário"], description: "Configurador Novo" },
  { path: "/user/profile", allowedRoles: ["Administrador", "Cadastrador", "Usuário"], description: "Perfil de usuário" },
  
  // Rotas de visualização (somente leitura) - acessíveis a todos os usuários autenticados
  { path: "/brands", allowedRoles: ["Administrador", "Cadastrador", "Usuário"], description: "Visualizar marcas" },
  { path: "/models", allowedRoles: ["Administrador", "Cadastrador", "Usuário"], description: "Visualizar modelos" },
  { path: "/versions", allowedRoles: ["Administrador", "Cadastrador", "Usuário"], description: "Visualizar versões" },
  { path: "/colors", allowedRoles: ["Administrador", "Cadastrador", "Usuário"], description: "Visualizar cores/pinturas" },
  { path: "/paint-types", allowedRoles: ["Administrador", "Cadastrador", "Usuário"], description: "Visualizar tipos de pintura" },
  { path: "/optionals", allowedRoles: ["Administrador", "Cadastrador", "Usuário"], description: "Visualizar opcionais" },
  { path: "/vehicles", allowedRoles: ["Administrador", "Cadastrador", "Usuário"], description: "Visualizar veículos" },
  
  // Rotas de cadastro - acessíveis a Cadastradores e Administradores
  { path: "/brands/new", allowedRoles: ["Administrador", "Cadastrador"], description: "Cadastrar novas marcas" },
  { path: "/brands/:id/edit", allowedRoles: ["Administrador", "Cadastrador"], description: "Editar marcas existentes" },
  { path: "/models/new", allowedRoles: ["Administrador", "Cadastrador"], description: "Cadastrar novos modelos" },
  { path: "/models/:id/edit", allowedRoles: ["Administrador", "Cadastrador"], description: "Editar modelos existentes" },
  { path: "/versions/new", allowedRoles: ["Administrador", "Cadastrador"], description: "Cadastrar novas versões" },
  { path: "/versions/:id/edit", allowedRoles: ["Administrador", "Cadastrador"], description: "Editar versões existentes" },
  { path: "/paint-types/new", allowedRoles: ["Administrador", "Cadastrador"], description: "Cadastrar novos tipos de pintura" },
  { path: "/paint-types/:id/edit", allowedRoles: ["Administrador", "Cadastrador"], description: "Editar tipos de pintura existentes" },
  { path: "/optionals/new", allowedRoles: ["Administrador", "Cadastrador"], description: "Cadastrar novos opcionais" },
  { path: "/optionals/:id/edit", allowedRoles: ["Administrador", "Cadastrador"], description: "Editar opcionais existentes" },
  { path: "/vehicles/new", allowedRoles: ["Administrador", "Cadastrador"], description: "Cadastrar novos veículos" },
  { path: "/vehicles/:id/edit", allowedRoles: ["Administrador", "Cadastrador"], description: "Editar veículos existentes" },
  { path: "/direct-sales/new", allowedRoles: ["Administrador", "Cadastrador"], description: "Cadastrar novas vendas diretas" },
  { path: "/direct-sales/edit/:id", allowedRoles: ["Administrador", "Cadastrador"], description: "Editar vendas diretas existentes" },
  
  // Rotas exclusivas para Administradores
  { path: "/settings", allowedRoles: ["Administrador"], description: "Configurações do sistema" },
  { path: "/admin/users", allowedRoles: ["Administrador"], description: "Gerenciamento de usuários" },
  // Página de permissões - visível a todos os usuários para consulta
  { path: "/admin/permissions", allowedRoles: ["Administrador", "Cadastrador", "Usuário"], description: "Visualizar permissões do sistema" },
  // Página para configuração de permissões - acesso apenas para administradores
  { path: "/admin/permission-settings", allowedRoles: ["Administrador"], description: "Configurar permissões do sistema" }
];

// Armazenar permissões personalizadas em cache
let customPermissionsCache: Record<string, Record<string, boolean>> = {};
let permissionsLoaded = false;

/**
 * Define as permissões personalizadas para uso no sistema
 * @param permissions Objeto com permissões personalizadas por papel
 */
export function setCustomPermissions(permissions: Record<string, Record<string, boolean>>) {
  customPermissionsCache = permissions;
  permissionsLoaded = true;
}

/**
 * Obtém as permissões personalizadas do cache
 * @returns Objeto com permissões personalizadas
 */
export function getCustomPermissions(): Record<string, Record<string, boolean>> {
  return customPermissionsCache;
}

/**
 * Carrega as permissões do servidor e as armazena em cache
 * @returns Promise que resolve quando as permissões forem carregadas
 */
export async function getPermissions(): Promise<Record<string, Record<string, boolean>>> {
  if (permissionsLoaded) {
    return customPermissionsCache;
  }
  
  try {
    const response = await fetch('/api/permissions');
    if (!response.ok) {
      throw new Error('Falha ao carregar permissões');
    }
    
    const permissions = await response.json();
    setCustomPermissions(permissions);
    return permissions;
  } catch (error) {
    console.error('Erro ao carregar permissões:', error);
    permissionsLoaded = true; // Marcar como carregado mesmo em caso de erro para evitar múltiplas tentativas
    return {};
  }
}

/**
 * Verifica se um usuário tem permissão para acessar uma determinada rota
 * @param path Caminho da rota a ser verificada
 * @param userRole Papel do usuário atual
 * @returns true se o usuário tem permissão, false caso contrário
 */
export function hasPermission(path: string, userRole?: string): boolean {
  if (!userRole) return false;
  
  // ACESSO DIRETO PARA ROTA PRINCIPAL - SEM COMPLICAÇÕES
  if (path === "/") return true;
  
  // Converter para o tipo UserRole (com verificação de tipo)
  const role = userRole as UserRole;
  
  // Administrador sempre tem permissão total
  if (role === "Administrador") return true;
  
  // Se as permissões personalizadas ainda não foram carregadas, usar permissões padrão
  if (!permissionsLoaded) {
    // Encontrar a definição de permissão para o caminho
    const matchingPermission = ROUTE_PERMISSIONS.find(p => {
      if (p.path === path) return true;
      if (p.path.includes(':')) {
        const regex = new RegExp('^' + p.path.replace(/:[^\/]+/g, '[^/]+') + '$');
        return regex.test(path);
      }
      return false;
    });
    
    if (matchingPermission) {
      return matchingPermission.allowedRoles.includes(role);
    }
    
    // Se não encontrou regra específica, permitir acesso para rotas básicas
    const basicRoutes = ["/", "/configurator", "/configurator2", "/user/profile"];
    if (basicRoutes.includes(path)) {
      return true;
    }
    
    return false;
  }
  
  // Caso especial para o configurador - garantir acesso irrestrito para todos os usuários
  // Isto inclui acesso a cores, opcionais e outras funcionalidades do configurador
  if (path === "/configurator" || path === "/configurator2" || path.startsWith("/api/version-colors") || path.startsWith("/api/version-optionals")) {
    return true;
  }
  
  // Caso especial para a página de configuração de permissões
  // Esta página deve ser estritamente controlada
  if (path === "/admin/permission-settings") {
    // Verificar por papel específico
    if (role === "Administrador") {
      // Administradores sempre têm acesso
      return true;
    } else if (role === "Cadastrador" || role === "Usuário") {
      // Para demais papéis, verificar permissões personalizadas explicitamente
      const rolePermissions = customPermissionsCache[role];
      if (rolePermissions) {
        // A chave de permissão específica para esta funcionalidade
        const permissionKey = "Configurar permissões do sistema";
        if (permissionKey in rolePermissions) {
          // Só retorna true se a permissão estiver explicitamente ativada (true)
          return rolePermissions[permissionKey] === true;
        }
      }
      // Por padrão, esconder o menu
      return false;
    }
    // Para qualquer outro papel não reconhecido, negar acesso
    return false;
  }
  
  // Tentar encontrar a definição de permissão para o caminho exato
  let matchingPermission: RoutePermission | undefined;
  let permissionKey: string = "";
  
  // Encontrar a definição de permissão para o caminho exato
  const exactPathPermission = ROUTE_PERMISSIONS.find(p => p.path === path);
  if (exactPathPermission) {
    matchingPermission = exactPathPermission;
    permissionKey = exactPathPermission.description;
  }
  
  // Se não achou um caminho exato, verificar caminhos com parâmetros (ex: /brands/:id/edit)
  if (!matchingPermission) {
    for (const permission of ROUTE_PERMISSIONS) {
      if (permission.path.includes(':')) {
        const regex = new RegExp(
          '^' + permission.path.replace(/:[^\/]+/g, '[^/]+') + '$'
        );
        if (regex.test(path)) {
          matchingPermission = permission;
          permissionKey = permission.description;
          break;
        }
      }
    }
  }
  
  // Se ainda não achou, verificar o prefixo mais próximo
  if (!matchingPermission) {
    const basePathPermission = ROUTE_PERMISSIONS
      .filter(p => !p.path.includes(':') && path.startsWith(p.path))
      .sort((a, b) => b.path.length - a.path.length)[0]; // Pegar o prefixo mais longo
    
    if (basePathPermission) {
      matchingPermission = basePathPermission;
      permissionKey = basePathPermission.description;
    }
  }
  
  // Se não encontrou nenhuma regra, negar o acesso
  if (!matchingPermission) return false;
  
  // Se encontrou a regra, verificar se existem permissões personalizadas
  const rolePermissions = customPermissionsCache[role];
  
  // Se temos permissões personalizadas para este papel, usar estas
  if (rolePermissions && permissionKey in rolePermissions) {
    return rolePermissions[permissionKey];
  }
  
  // Caso contrário, usar as permissões padrão
  return matchingPermission.allowedRoles.includes(role);
}

/**
 * Obtém uma lista de todas as rotas que um usuário pode acessar
 * @param userRole Papel do usuário atual
 * @returns Array de rotas permitidas com suas descrições
 */
export function getAccessibleRoutes(userRole?: string): { path: string, description: string }[] {
  if (!userRole) return [];
  
  const role = userRole as UserRole;
  
  // Administrador tem acesso a tudo
  if (role === "Administrador") {
    return ROUTE_PERMISSIONS.map(({ path, description }) => ({ path, description }));
  }
  
  // Obtém as permissões personalizadas para este papel
  const customPermissions = customPermissionsCache[role] || {};
  
  // Filtra as rotas com base nas permissões personalizadas ou padrão
  return ROUTE_PERMISSIONS
    .filter(permission => {
      // Caso especial para o configurador - garantir acesso irrestrito para todos os usuários
      if (permission.path === "/configurator") {
        return true;
      }
      
      // Caso especial para a página de configuração de permissões
      if (permission.path === "/admin/permission-settings") {
        // Verificar por papel específico
        if (role === "Administrador") {
          // Administradores sempre têm acesso
          return true;
        } else if (role === "Cadastrador" || role === "Usuário") {
          // Para demais papéis, verificar explicitamente
          const permissionKey = "Configurar permissões do sistema";
          if (permissionKey in customPermissions) {
            // Só incluir se a permissão estiver explicitamente ativada
            return customPermissions[permissionKey] === true;
          }
          // Por padrão, não incluir esta rota
          return false;
        }
        // Para qualquer outro papel não reconhecido, negar acesso
        return false;
      }
      
      // Para as demais rotas, verificação padrão
      // Se temos uma configuração personalizada para esta permissão, usar ela
      if (permission.description in customPermissions) {
        return customPermissions[permission.description];
      }
      // Caso contrário, usar as permissões padrão
      return permission.allowedRoles.includes(role);
    })
    .map(({ path, description }) => ({ path, description }));
}