"use client"

import { useState, useTransition } from "react"
import { Plus, Loader2, Zap, AlertTriangle, CheckCircle2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createVm } from "@/app/actions"
import { VM_IMAGES, VM_SIZES, VM_LOCATIONS } from "@/lib/vm-catalog"

export function CreateVmDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const [form, setForm] = useState({
    name: "",
    resourceGroup: "",
    location: "brazilsouth",
    size: "Standard_B1s",
    imageId: "ubuntu-22",
    adminUsername: "azureuser",
    adminPassword: "",
    useSpot: true,
    secret: "",
  })

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await createVm(form)
      if (result.ok) {
        setOpen(false)
        setForm((f) => ({ ...f, name: "", adminPassword: "", secret: "" }))
        onCreated()
      } else {
        setError(result.error ?? "Erro ao criar a máquina virtual.")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="size-4" aria-hidden="true" />
            Criar máquina
          </Button>
        }
      />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar máquina virtual</DialogTitle>
          <DialogDescription>Configure a nova VM na Azure. Campos obrigatórios.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="vm-name">Nome da máquina</Label>
            <Input
              id="vm-name"
              placeholder="minha-vm"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="vm-rg">Grupo de recursos</Label>
            <Input
              id="vm-rg"
              placeholder="meu-grupo"
              value={form.resourceGroup}
              onChange={(e) => update("resourceGroup", e.target.value)}
              required
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="vm-location">Região</Label>
              <Select
                items={VM_LOCATIONS.map((l) => ({ value: l.id, label: l.label }))}
                value={form.location}
                onValueChange={(v) => update("location", (v as string) ?? "")}
              >
                <SelectTrigger id="vm-location">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VM_LOCATIONS.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="vm-size">Tamanho</Label>
              <Select
                items={VM_SIZES.map((s) => ({ value: s.id, label: s.label }))}
                value={form.size}
                onValueChange={(v) => update("size", (v as string) ?? "")}
              >
                <SelectTrigger id="vm-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VM_SIZES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="vm-image">Imagem (sistema operacional)</Label>
            <Select
              items={VM_IMAGES.map((img) => ({ value: img.id, label: img.label }))}
              value={form.imageId}
              onValueChange={(v) => update("imageId", (v as string) ?? "")}
            >
              <SelectTrigger id="vm-image">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VM_IMAGES.map((img) => (
                  <SelectItem key={img.id} value={img.id}>
                    {img.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="vm-user">Usuário administrador</Label>
              <Input
                id="vm-user"
                value={form.adminUsername}
                onChange={(e) => update("adminUsername", e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="vm-pass">Senha</Label>
              <Input
                id="vm-pass"
                type="password"
                placeholder="mín. 12 caracteres"
                value={form.adminPassword}
                onChange={(e) => update("adminPassword", e.target.value)}
                required
              />
            </div>
          </div>

          {/* Opção Spot */}
          <button
            type="button"
            onClick={() => update("useSpot", !form.useSpot)}
            aria-pressed={form.useSpot}
            className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
              form.useSpot ? "border-primary bg-primary/5" : "border-input hover:bg-muted/50"
            }`}
          >
            <span
              className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border ${
                form.useSpot ? "border-primary bg-primary text-primary-foreground" : "border-input"
              }`}
            >
              {form.useSpot && <CheckCircle2 className="size-4" aria-hidden="true" />}
            </span>
            <span className="flex-1">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <Zap className="size-4 text-amber-500" aria-hidden="true" />
                Instância Spot
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Muito mais barata, mas a Azure pode desligá-la (evict) quando precisar da capacidade.
              </span>
            </span>
          </button>

          {/* Palavra secreta */}
          <div className="grid gap-2">
            <Label htmlFor="vm-secret">Palavra secreta</Label>
            <Input
              id="vm-secret"
              type="password"
              placeholder="Necessária para autorizar a criação"
              value={form.secret}
              onChange={(e) => update("secret", e.target.value)}
              required
            />
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <p className="break-words">{error}</p>
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Criando...
                </>
              ) : (
                <>
                  <Plus className="size-4" aria-hidden="true" />
                  Criar máquina
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
