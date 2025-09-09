import express, { type Request, Response } from 'express';
import { Server } from 'http';
import { db } from './db';
import session from 'express-session';
import MemoryStore from 'memorystore';

export async function registerRoutes(app: express.Application): Promise<Server> {
  const MemoryStoreSession = MemoryStore(session);

  // Session configuration
  app.use(session({
    store: new MemoryStoreSession({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    secret: process.env.SESSION_SECRET || 'your-secret-key-here',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Health check endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Basic auth endpoints
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // TODO: Implement actual authentication
      // For now, just return a mock response
      res.json({ 
        user: { 
          id: 1, 
          email, 
          name: 'Test User', 
          role: 'partner' 
        },
        message: 'Login successful' 
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/auth/logout', (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Could not log out' });
      }
      res.json({ message: 'Logout successful' });
    });
  });

  app.get('/api/auth/me', (req: Request, res: Response) => {
    if (req.session.user) {
      res.json({ user: req.session.user });
    } else {
      res.status(401).json({ error: 'Not authenticated' });
    }
  });

  // API routes placeholder
  app.get('/api/partners', async (req: Request, res: Response) => {
    try {
      // TODO: Implement actual partner fetching
      res.json([]);
    } catch (error) {
      console.error('Partners error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/products', async (req: Request, res: Response) => {
    try {
      // TODO: Implement actual product fetching
      res.json([]);
    } catch (error) {
      console.error('Products error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Create HTTP server
  const server = new Server(app);
  return server;
}