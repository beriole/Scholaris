import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import SetupSuperAdmin from './pages/SetupSuperAdmin';
import SchoolDashboard from './pages/dashboard/SchoolDashboard';
import SchoolYearManager from './pages/dashboard/academic/SchoolYearManager';
import ClassManager from './pages/dashboard/academic/ClassManager';
import SubjectManager from './pages/dashboard/academic/SubjectManager';
import StudentsPage from './pages/dashboard/students/StudentsPage';
import TeachersPage from './pages/dashboard/teachers/TeachersPage';
import GradesPage from './pages/dashboard/grades/GradesPage';
import GradeEntryPage from './pages/dashboard/grades/GradeEntryPage';
import BulletinsPage from './pages/dashboard/grades/BulletinsPage';
import FinancePage from './pages/dashboard/finance/FinancePage';
import AttendancePage  from './pages/dashboard/attendance/AttendancePage';
import TimetablePage   from './pages/dashboard/timetable/TimetablePage';
import SettingsPage    from './pages/dashboard/settings/SettingsPage';
import MessagesPage       from './pages/dashboard/messages/MessagesPage';
import AffectationsPage  from './pages/dashboard/affectations/AffectationsPage';
import CalendarPage      from './pages/dashboard/calendar/CalendarPage';
import ReportsPage       from './pages/dashboard/reports/ReportsPage';
import TeacherLayout     from './pages/teacher/TeacherLayout';
import TeacherHome       from './pages/teacher/TeacherHome';
import TeacherClasses    from './pages/teacher/TeacherClasses';
import TeacherGrades     from './pages/teacher/TeacherGrades';
import TeacherAttendance from './pages/teacher/TeacherAttendance';
import TeacherTimetable  from './pages/teacher/TeacherTimetable';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { I18nProvider } from './i18n/i18n';

function App() {
  return (
    <I18nProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/setup-superadmin" element={<SetupSuperAdmin />} />

          {/* Admin École (mono-école) */}
          <Route element={<ProtectedRoute allowedRoles={['super_admin', 'admin_ecole']} />}>
            <Route path="/ecole-dashboard" element={<SchoolDashboard />}>
              <Route path="years"    element={<SchoolYearManager />} />
              <Route path="classes"  element={<ClassManager />} />
              <Route path="academic" element={<SubjectManager />} />
              <Route path="students" element={<StudentsPage />} />
              <Route path="teachers" element={<TeachersPage />} />
              <Route path="grades" element={<GradesPage />} />
              <Route path="grades/entry" element={<GradeEntryPage />} />
              <Route path="grades/bulletins" element={<BulletinsPage />} />
              <Route path="finances"    element={<FinancePage />} />
              <Route path="attendance"  element={<AttendancePage />} />
              <Route path="timetable"  element={<TimetablePage />} />
              <Route path="settings"   element={<SettingsPage />} />
              <Route path="messages"      element={<MessagesPage />} />
              <Route path="affectations" element={<AffectationsPage />} />
              <Route path="calendar"     element={<CalendarPage />} />
              <Route path="reports"      element={<ReportsPage />} />
            </Route>
          </Route>

          {/* Portail Enseignant */}
          <Route element={<ProtectedRoute allowedRoles={['enseignant']} />}>
            <Route path="/prof" element={<TeacherLayout />}>
              <Route index element={<TeacherHome />} />
              <Route path="classes"     element={<TeacherClasses />} />
              <Route path="grades"      element={<TeacherGrades />} />
              <Route path="grades/entry" element={<GradeEntryPage />} />
              <Route path="attendance"  element={<TeacherAttendance />} />
              <Route path="timetable"   element={<TeacherTimetable />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </I18nProvider>
  );
}

export default App;
