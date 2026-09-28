import { Moon, Sun, Users } from "lucide-react";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import { useStore } from "../lib/store";
import { roleLabels, rolePeople, type Role } from "../lib/types";
// Account footer composition adapted from Agents Anywhere's sidebar-account-footer.
export function AgentAccount({ onRole }: { onRole: (role: Role) => void }) {
  const { role } = useStore();
  const { theme, setTheme } = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto w-full justify-start gap-3 rounded-lg px-2 py-3"
        >
          <Avatar className="size-9 rounded-full">
            <AvatarFallback>{rolePeople[role].slice(0, 1)}</AvatarFallback>
          </Avatar>
          <span className="flex min-w-0 flex-1 flex-col gap-1 text-left">
            <span className="truncate">{rolePeople[role]}</span>
            <span className="text-xs text-muted-foreground">
              {roleLabels[role].replace("视角", "")}
            </span>
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-56">
        <DropdownMenuGroup>
          {(Object.keys(roleLabels) as Role[]).map((r) => (
            <DropdownMenuItem key={r} onSelect={() => onRole(r)}>
              <Users />
              {roleLabels[r]}
              {role === r ? " · 当前" : ""}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            onSelect={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun /> : <Moon />}切换明暗主题
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
