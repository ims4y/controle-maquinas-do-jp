"use server"

import { listVirtualMachines, startVirtualMachine, stopVirtualMachine, type VirtualMachine } from "@/lib/azure"

// Máquinas ocultas do painel (não aparecem na lista, mas continuam na Azure).
const HIDDEN_VM_NAMES = ["nexalloyfernando"]

export type ActionResult = {
  ok: boolean
  error?: string
}

export type ListResult = {
  ok: boolean
  vms: VirtualMachine[]
  error?: string
}

export async function getVirtualMachines(): Promise<ListResult> {
  try {
    const vms = await listVirtualMachines()
    const filteredVms = vms.filter(vm => !HIDDEN_VM_NAMES.includes(vm.name.toLowerCase()))
    return { ok: true, vms: filteredVms }
  } catch (error) {
    return {
      ok: false,
      vms: [],
      error: error instanceof Error ? error.message : "Erro ao listar máquinas virtuais.",
    }
  }
}

export async function powerOnVm(resourceGroup: string, name: string): Promise<ActionResult> {
  try {
    await startVirtualMachine(resourceGroup, name)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erro ao ligar a máquina." }
  }
}

export async function powerOffVm(resourceGroup: string, name: string): Promise<ActionResult> {
  try {
    await stopVirtualMachine(resourceGroup, name)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erro ao desligar a máquina." }
  }
}

export async function createVm(options: CreateVmOptions & { secret: string }): Promise<ActionResult> {
  const { secret, ...vmOptions } = options

  if (secret !== CREATE_SECRET) {
    return { ok: false, error: "Palavra secreta incorreta. A criação não foi autorizada." }
  }

  // Validações básicas de entrada.
  const name = vmOptions.name.trim()
  const resourceGroup = vmOptions.resourceGroup.trim()
  if (!/^[a-zA-Z][a-zA-Z0-9-]{1,62}$/.test(name)) {
    return {
      ok: false,
      error: "Nome inválido. Use de 2 a 63 caracteres: letras, números e hífens, começando por letra.",
    }
  }
  if (!resourceGroup) {
    return { ok: false, error: "Informe o grupo de recursos." }
  }
  if (!vmOptions.adminUsername.trim()) {
    return { ok: false, error: "Informe o usuário administrador." }
  }
  if (vmOptions.adminPassword.length < 12) {
    return { ok: false, error: "A senha deve ter no mínimo 12 caracteres (exigência da Azure)." }
  }

  try {
    await createVirtualMachine({ ...vmOptions, name, resourceGroup })
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erro ao criar a máquina virtual." }
  }
}
