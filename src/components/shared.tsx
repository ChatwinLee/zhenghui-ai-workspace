import type { ReactNode } from "react";
import { Search, Sparkles, ArrowUpRight } from "lucide-react";
import { Button } from "./ui/button";
import { Badge as UIBadge } from "./ui/badge";
import { Avatar as UIAvatar, AvatarFallback } from "./ui/avatar";
import {
  Card,
  CardHeader,
  CardDescription,
  CardTitle,
  CardContent,
  CardFooter,
  CardAction,
} from "./ui/card";
import { Alert, AlertTitle, AlertDescription } from "./ui/alert";
import {
  Empty as UIEmpty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "./ui/empty";
import { Tabs as UITabs, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "./ui/select";
import { InputGroup, InputGroupInput, InputGroupAddon } from "./ui/input-group";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return (
    <UIBadge
      variant={
        tone === "green"
          ? "default"
          : tone === "neutral"
            ? "outline"
            : "secondary"
      }
    >
      {children}
    </UIBadge>
  );
}
export function Avatar({
  name,
  size = "normal",
}: {
  name: string;
  color?: string;
  size?: string;
}) {
  return (
    <UIAvatar
      size={
        size === "large"
          ? "lg"
          : size === "tiny" || size === "small"
            ? "sm"
            : "default"
      }
    >
      <AvatarFallback>{name.slice(0, 1)}</AvatarFallback>
    </UIAvatar>
  );
}
export function IconButton({
  children,
  label,
  onClick,
  className,
}: {
  children: ReactNode;
  label: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={className}
          aria-label={label}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </header>
  );
}
export function StatCard({
  label,
  value,
  unit,
  change,
  icon,
  children,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  change?: string;
  icon?: ReactNode;
  color?: string;
  children?: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        {icon && <CardAction>{icon}</CardAction>}
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <strong className="text-3xl font-semibold tabular-nums">
            {value}
          </strong>
          <span className="text-sm text-muted-foreground">{unit}</span>
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        {change && (
          <Badge>
            <ArrowUpRight />
            {change}
          </Badge>
        )}
        <span className="text-xs text-muted-foreground">{children}</span>
      </CardFooter>
    </Card>
  );
}
export function SearchBox({
  value,
  onChange,
  placeholder = "搜索…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <InputGroup>
      <InputGroupInput
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
    </InputGroup>
  );
}
export function Empty({
  title = "暂无匹配结果",
  description = "试试调整搜索词或筛选条件",
  children,
}: {
  title?: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <UIEmpty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Search />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {children && <EmptyContent>{children}</EmptyContent>}
    </UIEmpty>
  );
}
export function Tabs({
  items,
  value,
  onChange,
}: {
  items: { id: string; label: string; count?: number }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <UITabs value={value} onValueChange={onChange}>
      <TabsList variant="line">
        {items.map((i) => (
          <TabsTrigger value={i.id} key={i.id}>
            {i.label}
            {i.count !== undefined && <Badge>{i.count}</Badge>}
          </TabsTrigger>
        ))}
      </TabsList>
    </UITabs>
  );
}
export function AINote({
  title = "AI 工作洞察",
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <Alert>
      <Sparkles />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex flex-col gap-3">
        {children}
      </AlertDescription>
    </Alert>
  );
}
export function Choice({
  label,
  options,
  value,
  onChange,
  defaultValue,
  name,
  required,
  disabled,
}: {
  label: string;
  options: (string | { value: string; label: string })[];
  value?: string;
  onChange?: (v: string) => void;
  defaultValue?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <Select
      name={name}
      value={value}
      defaultValue={defaultValue}
      onValueChange={onChange}
      required={required}
      disabled={disabled}
    >
      <SelectTrigger aria-label={label} className="w-full">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((o) => {
            const x = typeof o === "string" ? { value: o, label: o } : o;
            return (
              <SelectItem key={x.value} value={x.value}>
                {x.label}
              </SelectItem>
            );
          })}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
export function DocumentBody({ text }: { text: string }) {
  return (
    <article className="document-body mx-auto flex max-w-3xl flex-col gap-3 leading-7">
      {text.split("\n").map((line, i) =>
        line.startsWith("# ") ? (
          <h2 className="text-xl font-semibold" key={i}>
            {line.slice(2)}
          </h2>
        ) : line.startsWith("## ") ? (
          <h3 className="mt-3 font-semibold" key={i}>
            {line.slice(3)}
          </h3>
        ) : line ? (
          <p
            className="text-sm text-muted-foreground whitespace-pre-wrap"
            key={i}
          >
            {line}
          </p>
        ) : null,
      )}
    </article>
  );
}
