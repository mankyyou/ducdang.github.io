import { Router } from 'express';
import AuthController from '../controllers/authController';

const router = Router();
const authController = new AuthController();

export function setAuthRoutes(app) {
  app.use('/api/auth', router);
  
  router.post('/login', authController.login.bind(authController));
  router.post('/logout', authController.logout.bind(authController));
}