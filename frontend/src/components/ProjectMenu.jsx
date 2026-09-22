import { Link, useNavigate } from "react-router-dom";
import { useProjects } from "@/lib/projectsContext";
import { iconFor } from "@/lib/icons";
import { FolderKanban, ChevronDown, Check, Settings } from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

// Selector de proyecto de la cabecera: al pulsar el nombre se cambia de proyecto
// y se navega al Panel.
export default function ProjectMenu({ className = "" }) {
  const { projects, projectMeta, activeProject, setActiveProject } = useProjects();
  const navigate = useNavigate();

  const choose = (name) => {
    if (name !== activeProject) setActiveProject(name);
    navigate("/");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-testid="btn-project-menu"
          title={activeProject ? `Proyecto: ${activeProject}` : "Selecciona un proyecto"}
          className={`items-center gap-2 text-xs px-3 py-1.5 rounded-full border border-[#E2DDD3] bg-white whitespace-nowrap hover:bg-[#F2EFE9] transition-colors ${className}`}
        >
          <FolderKanban className={`w-3.5 h-3.5 ${activeProject ? "text-[#D95D39]" : "text-[#5C626A]"}`} />
          <span className={`font-medium truncate max-w-[140px] ${activeProject ? "text-[#1A1D20]" : "text-[#5C626A]"}`}>
            {activeProject || "Sin proyecto"}
          </span>
          <ChevronDown className="w-3.5 h-3.5 opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>Cambiar de proyecto</DropdownMenuLabel>
        {projects.length === 0 && (
          <DropdownMenuItem disabled>No hay proyectos todavía</DropdownMenuItem>
        )}
        {projects.map((p) => {
          const Icon = iconFor(projectMeta[p]?.icon);
          const isActive = p === activeProject;
          return (
            <DropdownMenuItem key={p} onSelect={() => choose(p)} data-testid={`project-menu-${p}`}>
              <Icon className="w-4 h-4 text-[#5C626A]" />
              <span className="flex-1 truncate">{p}</span>
              {isActive && <Check className="w-4 h-4 text-[#D95D39]" />}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/ajustes?tab=proyecto">
            <Settings className="w-4 h-4 text-[#5C626A]" /> Gestionar proyectos
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
