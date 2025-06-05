import rateLimit from "express-rate-limit";

// Rate limiting geral
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // máximo 1000 requests por IP por janela
  message: {
    error: "Muitas requisições deste IP, tente novamente em 15 minutos."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting específico para login
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 tentativas de login por IP por janela
  message: {
    error: "Muitas tentativas de login. Tente novamente em 15 minutos."
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // não conta requests bem-sucedidos
});

// Rate limiting para APIs sensíveis
export const sensitiveApiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 50, // máximo 50 requests por IP por janela
  message: {
    error: "Limite excedido para operações sensíveis. Tente novamente em 5 minutos."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Função para logar tentativas de acesso negado
export function logSecurityEvent(type: string, details: any, req?: any) {
  const timestamp = new Date().toISOString();
  const ip = req?.ip || req?.connection?.remoteAddress || 'unknown';
  const userAgent = req?.get('User-Agent') || 'unknown';
  
  console.log(`[SECURITY] ${timestamp} - ${type}`, {
    ip,
    userAgent,
    ...details
  });
}