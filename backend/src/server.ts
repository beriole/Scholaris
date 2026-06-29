import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { prisma } from './lib/prisma';
import authRoutes from './routes/authRoutes';
import tenantRoutes from './routes/tenantRoutes';
import academicRoutes from './routes/academicRoutes';
import studentRoutes from './routes/studentRoutes';
import teacherRoutes from './routes/teacherRoutes';
import evaluationRoutes from './routes/evaluationRoutes';
import gradeRoutes from './routes/gradeRoutes';
import bulletinRoutes from './routes/bulletinRoutes';
import financeRoutes from './routes/financeRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import dashboardRoutes  from './routes/dashboardRoutes';
import timetableRoutes  from './routes/timetableRoutes';
import settingsRoutes      from './routes/settingsRoutes';
import messageRoutes       from './routes/messageRoutes';
import notificationRoutes  from './routes/notificationRoutes';
import affectationRoutes   from './routes/affectationRoutes';
import calendarRoutes      from './routes/calendarRoutes';
import reportRoutes        from './routes/reportRoutes';
import uploadRoutes        from './routes/uploadRoutes';
import { UPLOAD_DIR } from './lib/upload';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3001; // Correction port match frontend

app.use(cors());
app.use(express.json({ limit: '6mb' })); // limite élevée pour les images en base64

// Fichiers uploadés (logos, photos) servis statiquement
app.use('/uploads', express.static(UPLOAD_DIR));

// Auth & Security Core
app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/academic', academicRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/bulletins', bulletinRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/dashboard',  dashboardRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/settings',      settingsRoutes);
app.use('/api/messages',      messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/affectations',  affectationRoutes);
app.use('/api/calendar',      calendarRoutes);
app.use('/api/reports',       reportRoutes);
app.use('/api/uploads',       uploadRoutes);

// Base Route pour le Health Check
app.get('/api/health', async (req: Request, res: Response) => {
    try {
        // Vérifier la connexion DB
        await prisma.$queryRaw`SELECT 1`;
        res.status(200).json({ status: 'success', message: 'API et DB opérationnelles' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Erreur de connexion DB' });
    }
});

app.listen(port, () => {
    console.log(`[server]: Serveur API démarré sur http://localhost:${port}`);
});
