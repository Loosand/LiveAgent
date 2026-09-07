import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { Folder, Moon, Plus, Settings, Sun } from "../components/IconSet";
import { ResourceActivationSwitch } from "../components/resources/ResourceActivationSwitch";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Empty } from "../components/ui/empty";
import { IconButton } from "../components/ui/icon-button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { SettingsGroup, SettingsRow } from "../components/ui/settings-group";
import { Switch } from "../components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";

const surfaces = [
  ["bg-sidebar", "Sidebar"],
  ["bg-background", "Workspace"],
  ["bg-card", "Card"],
  ["bg-popover", "Popover"],
  ["bg-accent", "Selected"],
] as const;
const statuses = ["success", "warning", "destructive", "info", "activity"] as const;
const corners = [
  ["rounded-item", "列表项", "4px"],
  ["rounded-control", "控件", "8px"],
  ["rounded-panel", "容器", "16px"],
  ["rounded-overlay", "浮层", "16px"],
  ["rounded-composer", "输入区", "16px"],
  ["rounded-full", "圆形 / 胶囊", "full"],
] as const;
const elevations = [
  ["shadow-none", "平面", "正文、列表和常规容器"],
  ["shadow-control", "控件", "输入框与轻微抬升"],
  ["shadow-overlay", "浮层", "菜单、弹窗与浮动操作"],
  ["shadow-inset", "内边界", "凹入区域与拖拽提示"],
] as const;

/** Development-only component reference. No app storage, credentials or service calls. */
export function DesignSystemPreview() {
  const [dark, setDark] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [scale, setScale] = useState("1");
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden w-settings-nav shrink-0 flex-col gap-6 bg-sidebar p-4 md:flex">
        <div className="flex h-9 items-center gap-2 px-2 text-base font-semibold">
          <Folder className="size-4" />
          LiveAgent
        </div>
        <div className="space-y-1">
          <Button variant="ghost" className="w-full justify-start bg-accent" aria-current="page">
            <Settings className="size-4" />
            设计系统
          </Button>
          <p className="px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            中性工作台 · 紧凑控件
            <br />
            GUI / WebUI 共用组件
          </p>
        </div>
        <div className="mt-auto px-2 text-xs text-muted-foreground">组件样板 · 开发环境</div>
      </aside>
      <main className="mx-auto flex min-w-0 max-w-settings flex-1 flex-col gap-8 p-4 sm:p-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">LIVEAGENT / INTERFACE</p>
            <h1 className="mt-2 text-base font-semibold tracking-tight">安静、清晰、一致。</h1>
            <p className="mt-2 text-base text-muted-foreground">
              可操作的组件规范。所有样式来自共享 tokens 和标准组件。
            </p>
          </div>
          <IconButton
            aria-label={dark ? "切换浅色" : "切换深色"}
            onClick={() => setDark((value) => !value)}
          >
            {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </IconButton>
        </header>
        <section aria-label="Surface tokens" className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {surfaces.map(([className, label]) => (
            <div key={label} className="space-y-2">
              <div className={`${className} h-16 rounded-lg border border-border`} />
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </section>
        <Tabs defaultValue="components">
          <TabsList>
            <TabsTrigger value="components">基础组件</TabsTrigger>
            <TabsTrigger value="patterns">页面模式</TabsTrigger>
            <TabsTrigger value="decoration">圆角、阴影与边框</TabsTrigger>
          </TabsList>
          <TabsContent value="components" className="mt-6 space-y-6">
            <SettingsGroup title="操作与状态">
              <SettingsRow
                title="按钮层级"
                description="主要操作使用反色；常规操作使用中性底色。"
                control={
                  <div className="flex flex-wrap gap-2">
                    <Button>保存</Button>
                    <Button variant="secondary">次要</Button>
                    <Button variant="outline">描边</Button>
                    <Button variant="ghost">取消</Button>
                    <Button variant="info">查看更新</Button>
                  </div>
                }
              />
              <SettingsRow
                title="禁用与危险操作"
                control={
                  <div className="flex gap-2">
                    <Button disabled>不可用</Button>
                    <Button variant="destructive">删除</Button>
                    <IconButton aria-label="添加">
                      <Plus className="size-4" />
                    </IconButton>
                  </div>
                }
              />
              <SettingsRow
                title="状态色"
                description="必须同时提供文字，不能只靠颜色区分。"
                control={
                  <div className="flex flex-wrap gap-2">
                    {statuses.map((status) => (
                      <Badge key={status} variant={status}>
                        {status}
                      </Badge>
                    ))}
                  </div>
                }
              />
            </SettingsGroup>
            <SettingsGroup title="输入与选择">
              <SettingsRow
                title="工作区名称"
                control={
                  <div className="w-64 max-w-full">
                    <Label htmlFor="sample-name" className="sr-only">
                      工作区名称
                    </Label>
                    <Input id="sample-name" placeholder="例如：LiveAgent" />
                  </div>
                }
              />
              <SettingsRow
                title="输入错误"
                control={
                  <Input
                    aria-label="示例错误输入"
                    aria-invalid
                    defaultValue="缺少路径"
                    className="max-w-64"
                  />
                }
              />
              <SettingsRow
                title="默认模型"
                control={
                  <Select defaultValue="auto" items={{ auto: "自动选择", manual: "手动选择" }}>
                    <SelectTrigger aria-label="默认模型" className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">自动选择</SelectItem>
                      <SelectItem value="manual">手动选择</SelectItem>
                    </SelectContent>
                  </Select>
                }
              />
              <SettingsRow
                title="标准开关"
                control={
                  <Switch aria-label="标准开关" checked={enabled} onCheckedChange={setEnabled} />
                }
              />
              <SettingsRow
                title="资源开关（同一基础组件）"
                control={
                  <ResourceActivationSwitch
                    label="资源开关"
                    checked={enabled}
                    onCheckedChange={setEnabled}
                  />
                }
              />
              <SettingsRow
                title="禁用开关"
                control={<Switch aria-label="禁用开关" checked disabled />}
              />
              <SettingsRow
                title="复选项"
                control={
                  <div className="flex items-center gap-2">
                    <Checkbox id="sample-check" />
                    <Label htmlFor="sample-check">记住选择</Label>
                  </div>
                }
              />
            </SettingsGroup>
            <section className="space-y-3">
              <Label htmlFor="sample-description">说明</Label>
              <Textarea id="sample-description" placeholder="输入工作区说明…" />
            </section>
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">区域字号与浮层</h2>
                <Select
                  items={{ "0.9": "90%", "1": "100%", "1.2": "120%" }}
                  value={scale}
                  onValueChange={(value) => value && setScale(value)}
                >
                  <SelectTrigger aria-label="字号缩放" className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.9">90%</SelectItem>
                    <SelectItem value="1">100%</SelectItem>
                    <SelectItem value="1.2">120%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div
                className="zone-font-scale space-y-2 rounded-2xl bg-card p-4"
                style={{ "--zone-font-scale": Number(scale) } as CSSProperties}
              >
                <p data-preview-caption className="text-2xs text-muted-foreground">
                  10px / 辅助标记
                </p>
                <p data-preview-control className="text-xs">
                  12px / 控件与列表
                </p>
                <p data-preview-body className="text-base">
                  16px / 正文与标题
                </p>
              </div>
              <Dialog>
                <DialogTrigger render={<Button variant="outline" />}>打开示例弹窗</DialogTrigger>
                <DialogContent showCloseButton closeLabel="关闭弹窗">
                  <DialogHeader>
                    <DialogTitle>新建工作区</DialogTitle>
                    <DialogDescription>验证焦点、Esc 关闭，以及弹层中的控件。</DialogDescription>
                  </DialogHeader>
                  <DialogBody>
                    <Label htmlFor="dialog-name">名称</Label>
                    <Input id="dialog-name" className="mt-2" placeholder="工作区名称" />
                    <Select defaultValue="local" items={{ local: "本地", remote: "远程" }}>
                      <SelectTrigger aria-label="示例位置" className="mt-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="local">本地</SelectItem>
                        <SelectItem value="remote">远程</SelectItem>
                      </SelectContent>
                    </Select>
                  </DialogBody>
                  <DialogFooter>
                    <DialogActions>
                      <DialogClose render={<Button variant="ghost" />}>取消</DialogClose>
                      <DialogClose render={<Button />}>完成</DialogClose>
                    </DialogActions>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </section>
          </TabsContent>
          <TabsContent value="decoration" className="mt-6 space-y-8">
            <section aria-label="圆角规范" className="space-y-4">
              <h2 className="text-base font-semibold">按用途选择圆角</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {corners.map(([className, label, value]) => (
                  <div key={className} className="space-y-2">
                    <div
                      data-preview-radius={className}
                      className={`${className} h-16 border border-border bg-card`}
                    />
                    <p className="text-xs">
                      {label} · {value}
                    </p>
                    <p className="text-xs text-muted-foreground">{className}</p>
                  </div>
                ))}
              </div>
            </section>
            <section aria-label="阴影规范" className="space-y-4">
              <h2 className="text-base font-semibold">内容保持平面，浮层才需要明显阴影</h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {elevations.map(([className, label, description]) => (
                  <div
                    key={className}
                    data-preview-shadow={className}
                    className={`${className} rounded-panel bg-popover p-4 ${className === "shadow-inset" ? "" : "border border-border"}`}
                  >
                    <p className="text-xs font-medium">
                      {label} · {className}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">{description}</p>
                  </div>
                ))}
              </div>
            </section>
            <section aria-label="边框规范" className="space-y-4">
              <h2 className="text-base font-semibold">分隔、输入边界与焦点各有用途</h2>
              <div className="rounded-panel border border-border bg-card p-4 text-xs">
                普通边界 · 1px / border-border
              </div>
              <Input aria-label="边框示例输入" placeholder="点击或按 Tab 查看标准焦点环" />
              <Input
                aria-label="边框示例错误"
                aria-invalid
                defaultValue="错误边框同时配合文字说明"
              />
              <p className="text-xs text-muted-foreground">
                常规描边 1px；强调与焦点 2px。避免重复描边，不用阴影模拟错误状态。
              </p>
            </section>
          </TabsContent>
          <TabsContent value="patterns" className="mt-6">
            <Empty
              icon={<Folder className="size-6" />}
              title="还没有工作区"
              description="创建工作区后，在这里继续对话与管理任务。"
            >
              <Button size="sm">
                <Plus className="size-4" />
                新建工作区
              </Button>
            </Empty>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
