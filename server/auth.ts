import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { db } from "../db";
import { users, User as UserType, userRoles } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import { pool } from "../db/index";
import { loginLimiter, logSecurityEvent } from "./security";
import * as storage from "./storage";

const PostgresSessionStore = connectPg(session);

// Device information detection function
function getDeviceInfo(userAgent: string): string {
  if (!userAgent) return "Unknown Device";
  
  // Detect mobile devices
  if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
    if (/iPhone/.test(userAgent)) return "iPhone";
    if (/iPad/.test(userAgent)) return "iPad";
    if (/Android/.test(userAgent)) return "Android Device";
    return "Mobile Device";
  }
  
  // Detect desktop browsers
  if (/Chrome/.test(userAgent)) return "Chrome Browser";
  if (/Firefox/.test(userAgent)) return "Firefox Browser";
  if (/Safari/.test(userAgent) && !/Chrome/.test(userAgent)) return "Safari Browser";
  if (/Edge/.test(userAgent)) return "Edge Browser";
  
  return "Desktop Browser";
}

// Session creation and tracking functions
export async function createSessionForUser(req: Request, user: UserWithRole) {
  try {
    const sessionId = req.sessionID;
    const userAgent = req.get('User-Agent') || 'Unknown';
    const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown';
    const deviceInfo = getDeviceInfo(userAgent);
    
    // Session expires in 24 hours
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    await storage.createUserSession({
      userId: user.id,
      sessionId,
      deviceInfo,
      ipAddress,
      userAgent,
      expiresAt
    });
    
    logSecurityEvent("SESSION_CREATED", {
      userId: user.id,
      sessionId,
      deviceInfo,
      ipAddress
    }, req);
  } catch (error) {
    console.error("Error creating user session:", error);
    // Don't fail login if session creation fails
  }
}

export async function updateUserSessionActivity(req: Request) {
  try {
    const sessionId = req.sessionID;
    if (sessionId) {
      await storage.updateSessionActivity(sessionId);
    }
  } catch (error) {
    console.error("Error updating session activity:", error);
    // Don't fail request if session update fails
  }
}

// Definir a interface de usuário para autenticação
type UserWithRole = {
  id: number;
  name: string;
  email: string;
  password: string;
  roleId: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  role?: {
    id: number;
    name: string;
    description?: string | null;
  };
};

declare global {
  namespace Express {
    // Definição da interface User no namespace Express
    interface User {
      id: number;
      name: string;
      email: string;
      roleId: number;
      isActive: boolean;
      role?: {
        id: number;
        name: string;
        description?: string | null;
      };
    }
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Funções para gerenciar usuários no banco de dados
export async function getUserByEmail(email: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
    with: {
      role: true
    }
  });
  return user;
}

export async function updateUserLastLogin(id: number) {
  const now = new Date();
  await db.update(users)
    .set({ lastLogin: now })
    .where(eq(users.id, id));
  return now;
}

export async function getUser(id: number) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
    with: {
      role: true
    }
  });
  return user;
}

export async function createUser(userData: {
  name: string;
  email: string;
  password: string;
  roleId: number;
}) {
  const hashedPassword = await hashPassword(userData.password);
  const [user] = await db.insert(users).values({
    ...userData,
    password: hashedPassword,
  }).returning();
  
  return getUserByEmail(userData.email);
}

export async function getAllUsers() {
  return db.query.users.findMany({
    with: {
      role: true
    }
  });
}

export async function getUserWithPassword(id: number) {
  return db.query.users.findFirst({
    where: eq(users.id, id),
    columns: {
      id: true,
      password: true
    }
  });
}

export async function updateUser(id: number, data: { 
  name: string; 
  email: string; 
  cnpj?: string; 
  logoUrl?: string; 
  address?: string; 
  phone?: string; 
}) {
  const [updatedUser] = await db.update(users)
    .set({
      ...data,
      updatedAt: new Date()
    })
    .where(eq(users.id, id))
    .returning();

  if (!updatedUser) return null;

  return getUser(id);
}

export async function updateUserPassword(id: number, hashedPassword: string) {
  console.log(`Atualizando senha do usuário ID: ${id}`);
  try {
    const result = await db.update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    
    console.log(`Resultado da atualização: ${JSON.stringify(result)}`);
    return result[0];
  } catch (error) {
    console.error("Erro ao atualizar senha:", error);
    throw error;
  }
}

export async function updateUserRole(id: number, roleId: number) {
  console.log(`updateUserRole chamada: id=${id}, roleId=${roleId}`);
  
  try {
    const [updatedUser] = await db.update(users)
      .set({
        roleId,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();

    console.log("Resultado da atualização:", updatedUser);

    if (!updatedUser) {
      console.log("Nenhum usuário foi atualizado");
      return null;
    }

    const userWithRole = await getUser(id);
    console.log("Usuário com papel atualizado:", userWithRole);
    return userWithRole;
  } catch (error) {
    console.error("Erro na função updateUserRole:", error);
    throw error;
  }
}

export async function updateUserStatus(id: number, isActive: boolean) {
  const [updatedUser] = await db.update(users)
    .set({
      isActive,
      updatedAt: new Date()
    })
    .where(eq(users.id, id))
    .returning();

  if (!updatedUser) return null;

  return getUser(id);
}

export async function getAllRoles() {
  return db.query.userRoles.findMany();
}

export function setupAuth(app: Express) {
  // Configurações da sessão adaptáveis para desenvolvimento e produção
  const isHTTPS = process.env.NODE_ENV === 'production' || 
                  (typeof window !== 'undefined' && window.location.protocol === 'https:') ||
                  process.env.REPL_ID;
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "auto-plus-secret-key-2025-replit",
    resave: false,
    saveUninitialized: false,
    rolling: true, // Renovar sessão a cada request
    store: new PostgresSessionStore({
      pool: pool,
      createTableIfMissing: true,
    }),
    cookie: {
      secure: false, // Sempre false para compatibilidade
      httpOnly: false, // Permite acesso via JavaScript
      sameSite: 'lax' as 'lax' | 'none' | 'strict', // Mais compatível
      maxAge: 1000 * 60 * 60 * 24, // 24 horas
      // Remove domain específico para funcionar em ambos ambientes
    },
    name: 'autoplus_session' // Nome único
  };

  app.set("trust proxy", 1);
  
  // Configurações CORS simplificadas
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    next();
  });
  
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());



  // Configurar estratégia local de autenticação
  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          const user = await getUserByEmail(email);

          // Verificar se o usuário existe e se está ativo
          if (!user || !user.isActive) {
            return done(null, false, { message: "Usuário não encontrado ou inativo" });
          }

          // Verificar se a senha está correta
          const isValid = await comparePasswords(password, user.password);
          if (!isValid) {
            return done(null, false, { message: "Senha incorreta" });
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // Serialização do usuário para a sessão
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialização do usuário da sessão
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Rotas de autenticação
  app.post("/api/login", loginLimiter, (req, res, next) => {
    // COMENTADO: Verificação se usuário já está autenticado - agora permitimos override
    // if (req.isAuthenticated()) {
    //   logSecurityEvent("LOGIN_ATTEMPT_WHILE_AUTHENTICATED", {
    //     currentUserId: req.user!.id,
    //     currentUserEmail: req.user!.email,
    //     attemptedEmail: req.body.email
    //   }, req);
    //   
    //   return res.status(409).json({ 
    //     message: "Você já está conectado ao sistema. Para fazer login com outra conta, primeiro faça logout da conta atual.",
    //     alreadyAuthenticated: true,
    //     currentUser: {
    //       name: req.user!.name,
    //       email: req.user!.email
    //     }
    //   });
    // }

    passport.authenticate("local", async (err: Error, user: Express.User, info: { message: string }) => {
      if (err) {
        logSecurityEvent("LOGIN_ERROR", { error: err.message }, req);
        return next(err);
      }
      if (!user) {
        logSecurityEvent("LOGIN_FAILED", { 
          email: req.body.email,
          reason: info.message 
        }, req);
        return res.status(401).json({ message: info.message });
      }
      
      // NOVA LÓGICA: Encerrar todas as sessões ativas do usuário antes de criar nova sessão
      try {
        // Importar funções para verificar e encerrar sessões
        const { getActiveSessionsCount, deactivateAllUserSessions } = await import("./storage");
        
        // SEMPRE encerrar todas as sessões ativas do usuário quando ele fizer login
        // Isso garante que apenas uma sessão permaneça ativa por vez
        const activeSessionsCount = await getActiveSessionsCount(user.id);
        
        if (activeSessionsCount > 0) {
          // Encerrar TODAS as sessões do usuário antes de criar a nova
          const kickedSessions = await deactivateAllUserSessions(user.id);
          
          logSecurityEvent("USER_SESSIONS_KICKED", {
            userId: user.id,
            email: user.email,
            kickedSessionsCount: activeSessionsCount,
            actualKickedSessions: kickedSessions.length,
            newLoginIp: req.ip,
            userAgent: req.get('User-Agent')
          }, req);
          
          console.log(`[LOGIN KICK] Usuário ${user.email} (ID: ${user.id}) teve ${kickedSessions.length} sessões encerradas`);
        }
        
        // Atualizar o último acesso do usuário
        const lastLogin = await updateUserLastLogin(user.id);
        
        req.logIn(user, async (err) => {
          if (err) {
            logSecurityEvent("LOGIN_SESSION_ERROR", { 
              userId: user.id,
              error: err.message 
            }, req);
            return next(err);
          }
          
          // Create session tracking for multi-device management AFTER Express session is created
          await createSessionForUser(req, user);
          
          logSecurityEvent("LOGIN_SUCCESS", { 
            userId: user.id,
            email: user.email,
            role: user.role?.name
          }, req);
          
          return res.status(200).json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            lastLogin: lastLogin
          });
        });
      } catch (error: any) {
        console.error("Erro ao atualizar último acesso:", error);
        logSecurityEvent("LOGIN_UPDATE_ERROR", { 
          userId: user.id,
          error: error instanceof Error ? error.message : String(error)
        }, req);
        
        req.logIn(user, (err) => {
          if (err) {
            return next(err);
          }
          
          logSecurityEvent("LOGIN_SUCCESS", { 
            userId: user.id,
            email: user.email,
            role: user.role?.name 
          }, req);
          
          return res.status(200).json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
          });
        });
      }
    })(req, res, next);
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      // Verificar se o email já está em uso
      const existingUser = await getUserByEmail(req.body.email);
      if (existingUser) {
        return res.status(400).json({ message: "Este email já está em uso" });
      }

      // Criar novo usuário
      const user = await createUser(req.body);
      
      if (!user) {
        return res.status(500).json({ message: "Erro ao criar usuário" });
      }

      // Autenticar o usuário recém-criado
      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }
        return res.status(201).json({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        });
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/logout", async (req, res) => {
    // Registramos o usuário atual para log
    const userId = req.user?.id;
    const userEmail = req.user?.email;
    const sessionId = req.sessionID;
    
    logSecurityEvent("LOGOUT_ATTEMPT", { 
      userId: userId || 'unknown',
      email: userEmail || 'unknown'
    }, req);
    
    // Deactivate ALL sessions for this user to ensure clean logout
    if (userId) {
      try {
        await storage.deactivateAllUserSessions(userId);
        logSecurityEvent("ALL_SESSIONS_DEACTIVATED", {
          userId: userId
        }, req);
      } catch (error) {
        console.error("Error deactivating all user sessions:", error);
        // Continue with logout even if session deactivation fails
      }
    }
    
    // Primeiro, fazemos logout pela função do Passport
    req.logout((err) => {
      if (err) {
        logSecurityEvent("LOGOUT_ERROR", { 
          userId: userId || 'unknown',
          error: err.message 
        }, req);
        return res.status(500).json({ message: "Erro ao fazer logout" });
      }
      
      // Depois, explicitamente destruímos a sessão para garantir que todos os dados sejam removidos
      req.session.destroy((sessionErr) => {
        if (sessionErr) {
          logSecurityEvent("LOGOUT_SESSION_ERROR", { 
            userId: userId || 'unknown',
            error: sessionErr.message 
          }, req);
          return res.status(500).json({ message: "Erro ao destruir sessão" });
        }
        
        logSecurityEvent("LOGOUT_SUCCESS", { 
          userId: userId || 'unknown',
          email: userEmail || 'unknown'
        }, req);
        
        // Limpa o cookie da sessão no cliente com o nome personalizado
        res.clearCookie('autoplus_session', { 
          path: '/',
          httpOnly: false,
          secure: false,
          sameSite: 'lax'
        });
        
        res.status(200).json({ message: "Logout realizado com sucesso" });
      });
    });
  });

  app.get("/api/user", async (req, res) => {
    if (req.isAuthenticated()) {
      const user = req.user;
      // Busca informações atualizadas do usuário, incluindo todos os campos
      const userDetails = await getUser(user.id);
      return res.status(200).json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        lastLogin: userDetails?.lastLogin,
        cnpj: userDetails?.cnpj,
        logoUrl: userDetails?.logoUrl,
        address: userDetails?.address,
        phone: userDetails?.phone
      });
    }
    return res.status(401).json({ message: "Não autenticado" });
  });

  // Rota para obter todos os usuários (apenas para administradores)
  app.get("/api/users", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const allUsers = await getAllUsers();
      res.status(200).json(allUsers);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar usuários" });
    }
  });

  // Rota para obter todos os papéis (roles)
  app.get("/api/roles", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const roles = await getAllRoles();
      res.status(200).json(roles);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar papéis" });
    }
  });
}

// Middleware para verificar se o usuário está autenticado
export function isAuthenticated(req: Request, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Não autenticado" });
}

// Middleware para verificar se o usuário é administrador
export function isAdmin(req: Request, res: any, next: any) {
  if (req.user && req.user.role && req.user.role.name === "Administrador") {
    return next();
  }
  res.status(403).json({ message: "Acesso negado: Requer permissão de administrador" });
}

// Middleware para verificar se o usuário é cadastrador ou administrador
export function isCadastrador(req: Request, res: any, next: any) {
  if (
    req.user && 
    req.user.role && 
    (req.user.role.name === "Administrador" || req.user.role.name === "Cadastrador")
  ) {
    return next();
  }
  res.status(403).json({ message: "Acesso negado: Requer permissão de cadastrador ou administrador" });
}