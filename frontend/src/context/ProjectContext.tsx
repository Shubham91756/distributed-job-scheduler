import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";

export interface Project {
  id: string;
  slug: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    queues: number;
    jobs?: number;
  };
}

interface ProjectContextType {
  projects: Project[];
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
  isLoading: boolean;
  refetchProjects: () => void;
  organizationId: string | null;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => {
    return localStorage.getItem("activeProjectId");
  });
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  // Fetch the default organization
  const { data: orgData, isLoading: isOrgLoading } = useQuery({
    queryKey: ["organization"],
    queryFn: async () => {
      const orgsRes = await api.get("/organizations");
      if (orgsRes.data.data.organizations.length > 0) {
         return orgsRes.data.data.organizations[0].id;
      }
      return null;
    }
  });

  useEffect(() => {
    if (orgData) {
      setOrganizationId(orgData);
    }
  }, [orgData]);

  // Fetch projects for the organization
  const { data: projectsData, isLoading: isProjectsLoading, refetch: refetchProjects } = useQuery({
    queryKey: ["projects", organizationId],
    queryFn: async () => {
      const projRes = await api.get(`/projects/organization/${organizationId}`);
      return projRes.data.data.projects as Project[];
    },
    enabled: !!organizationId
  });

  const projects = projectsData || [];

  // Update active project ID fallback
  useEffect(() => {
    if (projects.length > 0) {
      // If we don't have an active project, or the active project is not in the list anymore
      if (!activeProjectId || !projects.find(p => p.id === activeProjectId)) {
        setActiveProjectId(projects[0].id);
        localStorage.setItem("activeProjectId", projects[0].id);
      }
    } else if (projects.length === 0 && !isProjectsLoading && !isOrgLoading) {
      setActiveProjectId(null);
      localStorage.removeItem("activeProjectId");
    }
  }, [projects, activeProjectId, isProjectsLoading, isOrgLoading]);

  // Sync to local storage
  useEffect(() => {
    if (activeProjectId) {
      localStorage.setItem("activeProjectId", activeProjectId);
    } else {
      localStorage.removeItem("activeProjectId");
    }
  }, [activeProjectId]);

  return (
    <ProjectContext.Provider 
      value={{ 
        projects, 
        activeProjectId, 
        setActiveProjectId, 
        isLoading: isOrgLoading || isProjectsLoading,
        refetchProjects,
        organizationId
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjectContext() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProjectContext must be used within a ProjectProvider");
  }
  return context;
}
