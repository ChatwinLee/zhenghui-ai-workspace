import Workflows from "./pages/Workflows";
import ConversationsHub from "./pages/ConversationsHub";
import Approvals from "./pages/Approvals";
import SkillMarket from "./pages/SkillMarket";
import { useState, type CSSProperties } from "react";
import {
  Bell,
  Workflow,
  Blocks,
  Bot,
  FolderKanban,
  ListTodo,
  MessageCircle,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useStore } from "./lib/store";
import { type Role, type Page } from "./lib/types";
import { Avatar, AvatarFallback } from "./components/ui/avatar";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  SidebarTrigger,
  SidebarInset,
} from "./components/ui/sidebar";
import CreateDialog, { type CreateKind } from "./components/CreateDialog";
import Customers from "./pages/Customers";
import Projects from "./pages/Projects";
import { AgentAccount } from "./components/AgentAccount";
import Conversations from "./pages/Conversations";
import Management from "./pages/Management";
export type OpenProject = (id: string) => void;
export default function App() {
  const { state, role, setRole, update } = useStore();
  const [page, setPage] = useState<Page>("chat");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [create, setCreate] = useState<CreateKind | null>(null);
  function navigate(p: Page) {
    setPage(p);
    setProjectId(null);
    setCustomerId(null);
  }
  function switchRole(r: Role) {
    setRole(r);
    navigate(
      r === "sales" ? "customers" : r === "admin" ? "approvals" : "projects",
    );
  }
  function openProject(id: string) {
    setProjectId(id);
    setPage("projects");
  }
  function openSession(id: string) {
    setSessionId(id);
    setPage("chat");
    update((s) => {
      const x = s.sessions.find((x) => x.id === id);
      if (x) x.unread = 0;
    });
  }
  const nav =
    role === "admin"
      ? [
          { id: "approvals", label: "审批", icon: ShieldCheck },
          { id: "projects", label: "全部项目", icon: FolderKanban },
          { id: "customers", label: "客户管理", icon: Users },
          { id: "workflows", label: "自定义流程", icon: Workflow },
          { id: "audit", label: "审计日志", icon: ListTodo },
          { id: "security", label: "权限与安全", icon: ShieldCheck },
        ]
      : role === "sales"
        ? [
            { id: "customers", label: "客户管理", icon: Users },
            { id: "projects", label: "需求管理", icon: FolderKanban },
          ]
        : [{ id: "projects", label: "项目管理", icon: FolderKanban }];
  const pageLabel: Record<Page, string> = {
    customers: "客户管理",
    projects: role === "sales" ? "需求管理" : "项目管理",
    chat: "会话",
    groups: "会话",
    notifications: "系统通知",
    approvals: "审批",
    audit: "审计日志",
    security: "权限与安全",
    runtimes: "Agent管理",
    skills: "Skill 广场",
    workflows: "自定义流程",
  };
  return (
    <div className="flex h-svh min-h-0 flex-col overflow-hidden">
      <SidebarProvider
        className="min-h-0 flex-1"
        style={
          {
            "--sidebar-width": "11.5rem",
            "--sidebar-width-icon": "3.5rem",
          } as CSSProperties
        }
      >
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  size="lg"
                  onClick={() =>
                    navigate(role === "admin" ? "approvals" : "customers")
                  }
                  tooltip="正惠科技"
                >
                  <Avatar>
                    <AvatarFallback>正</AvatarFallback>
                  </Avatar>
                  <span className="flex flex-col gap-1">
                    <strong>正惠科技</strong>
                    <span className="text-xs text-muted-foreground">
                      AI 工作空间
                    </span>
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>工作空间</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={page === "chat" || page === "groups"}
                      tooltip="会话"
                      onClick={() => navigate("chat")}
                    >
                      <MessageCircle />
                      <span>会话</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={page === "notifications"}
                      tooltip="系统通知"
                      onClick={() => navigate("notifications")}
                    >
                      <Bell />
                      <span>系统通知</span>
                      {state.notices.some(
                        (n) =>
                          !n.read &&
                          (role === "admin" || n.roles.includes(role)),
                      ) && (
                        <span className="ml-auto size-2 rounded-full bg-primary" />
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {nav.map((n) => (
                    <SidebarMenuItem key={n.id}>
                      <SidebarMenuButton
                        isActive={page === n.id}
                        tooltip={n.label}
                        onClick={() => navigate(n.id as Page)}
                      >
                        <n.icon />
                        <span>{n.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>智能工作</SidebarGroupLabel>
              <SidebarMenu>
                {[
                  { id: "runtimes", label: "Agent管理", icon: Bot },
                  { id: "skills", label: "Skill 广场", icon: Blocks },
                ].map((n) => (
                  <SidebarMenuItem key={n.id}>
                    <SidebarMenuButton
                      isActive={page === n.id}
                      tooltip={n.label}
                      onClick={() => navigate(n.id as Page)}
                    >
                      <n.icon />
                      <span>{n.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <AgentAccount onRole={switchRole} />
          </SidebarFooter>
        </Sidebar>
        <SidebarInset className="min-h-0 min-w-0 overflow-hidden">
          <div className="flex h-full min-h-0">
            <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              {page !== "chat" && page !== "groups" && (
                <div className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
                  <SidebarTrigger />
                  <span className="text-sm text-muted-foreground">
                    {pageLabel[page]}
                  </span>
                </div>
              )}
              {(page === "chat" || page === "groups") && (
                <ConversationsHub
                  key={role}
                  sessionId={sessionId}
                  onSession={openSession}
                  onProject={openProject}
                />
              )}
              {page === "skills" && <SkillMarket />}
              {page === "workflows" && role === "admin" && <Workflows />}
              {page === "customers" && (
                <Customers
                  customerId={customerId}
                  onSelect={setCustomerId}
                  onProject={openProject}
                  onNew={() => setCreate("customer")}
                  onNewProject={() => setCreate("project")}
                />
              )}
              {page === "projects" && (
                <Projects
                  selectedId={projectId}
                  onSelect={setProjectId}
                  onNew={() => setCreate("project")}
                  onSession={openSession}
                />
              )}
              {page === "approvals" && role === "admin" && (
                <Approvals onProject={openProject} />
              )}
              {page === "notifications" && (
                <Conversations
                  page={page}
                  sessionId={sessionId}
                  onProject={openProject}
                  onNew={() => openSession("")}
                />
              )}
              {["audit", "security", "runtimes"].includes(page) && (
                <Management
                  page={page}
                  onProject={openProject}
                  onCustomer={(id) => {
                    setCustomerId(id);
                    setPage("customers");
                  }}
                  onSession={openSession}
                  onNew={() => openSession("")}
                />
              )}
            </main>
          </div>
        </SidebarInset>
      </SidebarProvider>
      <CreateDialog
        kind={create}
        onClose={() => setCreate(null)}
        onProject={openProject}
        onSession={openSession}
        customerId={customerId}
      />
    </div>
  );
}
