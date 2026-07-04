import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Queues } from "./pages/Queues";
import { Workers } from "./pages/Workers";
import { Jobs } from "./pages/Jobs";
import { DeadLetterQueue } from "./pages/DeadLetterQueue";
import { Schedules } from "./pages/Schedules";
import { Projects } from "./pages/Projects";
import { ProjectDetails } from "./pages/ProjectDetails";
import { Batches } from "./pages/Batches";
import { BatchDetails } from "./pages/BatchDetails";
import { Login } from "./pages/Login";
import { ProjectProvider } from "./context/ProjectContext";
import { Activity } from "./pages/Activity";

export default function App() {
  return (
    <BrowserRouter>
      <ProjectProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/:id" element={<ProjectDetails />} />
            <Route path="queues" element={<Queues />} />
            <Route path="workers" element={<Workers />} />
            <Route path="jobs" element={<Jobs />} />
            <Route path="activity" element={<Activity />} />
            <Route path="dlq" element={<DeadLetterQueue />} />
            <Route path="schedules" element={<Schedules />} />
            <Route path="batches" element={<Batches />} />
            <Route path="batches/:id" element={<BatchDetails />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </ProjectProvider>
    </BrowserRouter>
  );
}