"use client"

import { useEffect, useState, useTransition } from "react"
import { Power, PowerOff, RefreshCw, Server, AlertTriangle, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getVirtualMachines, powerOnVm, powerOffVm } from "@/app/actions"
import type { VirtualMachine } from "@/lib/azure"

type PendingMap = Record<string, "starting" | "stopping" | undefined>

export function VmDashboard() {
  const [vms, setVms] = useState<VirtualMachine[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState<PendingMap>({})
  const [, startTransition] = useTransition()

  async function refresh() {
    setLoading(true)
    const result = await getVirtualMachines()
    if (result.ok) {
      setVms(result.vms)
      setError(null)
    } else {
      setError(result.error ?? "Erro desconhecido.")
    }
    setLoading(false)
  }

  useEffect(() => {
    refresh()
  }, [])

  function handlePower(vm: VirtualMachine, action: "start" | "stop") {
    setPending((p) => ({ ...p, [vm.id]: action === "start" ? "starting" : "stopping" }))
    startTransition(async () => {
      const result = action === "start" ? await powerOnVm(vm.resourceGroup, vm.name) : await powerOffVm(vm.resourceGroup, vm.name)

      if (result.ok) {
        setVms((prev) =>
          prev.map((m) => (m.id === vm.id ? { ...m, powerState: action === "start" ? "running" : "stopped" } : m)),
        )
      } else {
        setError(result.error ?? "Erro ao alterar o estado da máquina.")
      }
      setPending((p) => ({ ...p, [vm.id]: undefined }))
    })
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Server className="size-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-balance text-xl font-semibold leading-tight sm:text-2xl">Máquinas Virtuais Azure</h1>
            <p className="text-sm text-muted-foreground">Controle suas VMs: ligar e desligar.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button variant="outline" onClick={refresh} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            Atualizar
          </Button>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
        >
          <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium">Não foi possível concluir a operação</p>
            <p className="mt-1 break-words text-destructive/90">{error}</p>
          </div>
        </div>
      )}

      {loading && vms.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-20 text-muted-foreground">
          <Loader2 className="size-7 animate-spin" aria-hidden="true" />
          <p className="text-sm">Carregando máquinas virtuais...</p>
        </div>
      ) : vms.length === 0 && !error ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-20 text-center text-muted-foreground">
          <Server className="size-7" aria-hidden="true" />
          <p className="text-sm">Nenhuma máquina virtual encontrada nesta assinatura.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {vms.map((vm) => {
            const isRunning = vm.powerState === "running"
            const busy = pending[vm.id]
            return (
              <Card key={vm.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                  <div className="min-w-0">
                    <CardTitle className="truncate text-base">{vm.name}</CardTitle>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {vm.resourceGroup} {vm.location && `· ${vm.location}`}
                    </p>
                  </div>
                  <StatusBadge state={vm.powerState} busy={busy} />
                </CardHeader>
                <CardContent className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => handlePower(vm, "start")}
                    disabled={isRunning || !!busy}
                  >
                    {busy === "starting" ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Power className="size-4" aria-hidden="true" />
                    )}
                    Ligar
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handlePower(vm, "stop")}
                    disabled={!isRunning || !!busy}
                  >
                    {busy === "stopping" ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <PowerOff className="size-4" aria-hidden="true" />
                    )}
                    Desligar
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ state, busy }: { state: VirtualMachine["powerState"]; busy?: "starting" | "stopping" }) {
  if (busy) {
    return (
      <Badge variant="secondary" className="shrink-0 gap-1.5">
        <Loader2 className="size-3 animate-spin" aria-hidden="true" />
        {busy === "starting" ? "Ligando" : "Desligando"}
      </Badge>
    )
  }
  if (state === "running") {
    return (
      <Badge className="shrink-0 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-600">
        <span className="size-2 rounded-full bg-white" aria-hidden="true" />
        Ligada
      </Badge>
    )
  }
  if (state === "stopped") {
    return (
      <Badge variant="secondary" className="shrink-0 gap-1.5">
        <span className="size-2 rounded-full bg-muted-foreground" aria-hidden="true" />
        Desligada
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="shrink-0">
      Desconhecido
    </Badge>
  )
}
