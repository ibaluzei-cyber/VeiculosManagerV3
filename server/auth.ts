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

export async function updateUser(id: number, data: { name: string; email: string }) {
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
  const [updatedUser] = await db.update(users)
    .set({
      roleId,
      updatedAt: new Date()
    })
    .where(eq(users.id, id))
    .returning();

  if (!updatedUser) return null;

  return getUser(id);
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
  // Configurações da sessão
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "auto-plus-secret-key-2025-replit",
    resave: false,
    saveUninitialized: false,
    rolling: true, // Renovar sessão a cada request
    cookie: {
      secure: false, // Sempre false no Replit
      httpOnly: false, // Permitir acesso via JavaScript para debug
      sameSite: 'none', // Mais permissivo para Replit
      maxAge: 1000 * 60 * 60 * 24, // 24 horas
    },
    name: 'sessionId' // Nome mais simples
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Middleware de debug para sessões
  app.use((req, res, next) => {
    console.log(`[AUTH DEBUG] ${req.method} ${req.path}`);
    console.log(`[AUTH DEBUG] Session ID: ${req.sessionID}`);
    console.log(`[AUTH DEBUG] User authenticated: ${req.isAuthenticated()}`);
    console.log(`[AUTH DEBUG] User ID: ${req.user?.id || 'não logado'}`);
    next();
  });

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
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", async (err: Error, user: Express.User, info: { message: string }) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info.message });
      }
      
      // Atualizar o último acesso do usuário
      try {
        const lastLogin = await updateUserLastLogin(user.id);
        
        req.logIn(user, (err) => {
          if (err) {
            return next(err);
          }
          
          return res.status(200).json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            lastLogin: lastLogin
          });
        });
      } catch (error) {
        console.error("Erro ao atualizar último acesso:", error);
        req.logIn(user, (err) => {
          if (err) {
            return next(err);
          }
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

  app.post("/api/logout", (req, res) => {
    // Registramos o usuário atual para log
    const userId = req.user?.id;
    console.log(`Tentativa de logout para usuário ID: ${userId || 'desconhecido'}`);
    
    // Primeiro, fazemos logout pela função do Passport
    req.logout((err) => {
      if (err) {
        console.error(`Erro no processo de logout:`, err);
        return res.status(500).json({ message: "Erro ao fazer logout" });
      }
      
      console.log(`Logout do Passport realizado para usuário ID: ${userId || 'desconhecido'}`);
      
      // Depois, explicitamente destruímos a sessão para garantir que todos os dados sejam removidos
      req.session.destroy((sessionErr) => {
        if (sessionErr) {
          console.error(`Erro ao destruir sessão:`, sessionErr);
          return res.status(500).json({ message: "Erro ao destruir sessão" });
        }
        
        console.log(`Sessão destruída com sucesso para usuário ID: ${userId || 'desconhecido'}`);
        
        // Limpa o cookie da sessão no cliente com o nome personalizado
        res.clearCookie('auto-plus.sid', { 
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: 'lax'
        });
        
        res.status(200).json({ message: "Logout realizado com sucesso" });
      });
    });
  });

  app.get("/api/user", async (req, res) => {
    if (req.isAuthenticated()) {
      const user = req.user;
      // Busca informações atualizadas do usuário, incluindo o último login
      const userDetails = await getUser(user.id);
      return res.status(200).json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        lastLogin: userDetails?.lastLogin
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