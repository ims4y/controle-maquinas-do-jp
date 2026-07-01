import { ClientSecretCredential } from "@azure/identity"
import { ComputeManagementClient } from "@azure/arm-compute"
import { NetworkManagementClient } from "@azure/arm-network"
import { ResourceManagementClient } from "@azure/arm-resources"
import { VM_IMAGES, type CreateVmOptions } from "@/lib/vm-catalog"

export type { CreateVmOptions } from "@/lib/vm-catalog"

export type VmPowerState = "running" | "stopped" | "unknown"

export type VirtualMachine = {
  id: string
  name: string
  resourceGroup: string
  location: string
  powerState: VmPowerState
}

let cachedCredential: ClientSecretCredential | null = null
let cachedClient: ComputeManagementClient | null = null
let cachedNetworkClient: NetworkManagementClient | null = null
let cachedResourceClient: ResourceManagementClient | null = null

function getMissingEnvVars() {
  const required = ["AZURE_TENANT_ID", "AZURE_CLIENT_ID", "AZURE_CLIENT_SECRET", "AZURE_SUBSCRIPTION_ID"] as const
  return required.filter((key) => !process.env[key])
}

function getCredential(): ClientSecretCredential {
  const missing = getMissingEnvVars()
  if (missing.length > 0) {
    throw new Error(`Variáveis de ambiente da Azure ausentes: ${missing.join(", ")}`)
  }
  if (cachedCredential) return cachedCredential
  cachedCredential = new ClientSecretCredential(
    process.env.AZURE_TENANT_ID as string,
    process.env.AZURE_CLIENT_ID as string,
    process.env.AZURE_CLIENT_SECRET as string,
  )
  return cachedCredential
}

const SUBSCRIPTION_ID = () => process.env.AZURE_SUBSCRIPTION_ID as string

export function getComputeClient(): ComputeManagementClient {
  if (cachedClient) return cachedClient
  cachedClient = new ComputeManagementClient(getCredential(), SUBSCRIPTION_ID())
  return cachedClient
}

function getNetworkClient(): NetworkManagementClient {
  if (cachedNetworkClient) return cachedNetworkClient
  cachedNetworkClient = new NetworkManagementClient(getCredential(), SUBSCRIPTION_ID())
  return cachedNetworkClient
}

function getResourceClient(): ResourceManagementClient {
  if (cachedResourceClient) return cachedResourceClient
  cachedResourceClient = new ResourceManagementClient(getCredential(), SUBSCRIPTION_ID())
  return cachedResourceClient
}

// Extrai o resource group a partir do id completo do recurso da Azure.
function parseResourceGroup(id?: string): string {
  if (!id) return ""
  const match = id.match(/resourceGroups\/([^/]+)/i)
  return match ? match[1] : ""
}

function mapPowerState(statuses?: { code?: string }[]): VmPowerState {
  const powerStatus = statuses?.find((s) => s.code?.startsWith("PowerState/"))
  if (!powerStatus?.code) return "unknown"
  if (powerStatus.code === "PowerState/running") return "running"
  if (powerStatus.code === "PowerState/deallocated" || powerStatus.code === "PowerState/stopped") {
    return "stopped"
  }
  return "unknown"
}

export async function listVirtualMachines(): Promise<VirtualMachine[]> {
  const client = getComputeClient()
  const vms: VirtualMachine[] = []

  for await (const vm of client.virtualMachines.listAll()) {
    const name = vm.name ?? "sem-nome"
    const resourceGroup = parseResourceGroup(vm.id)

    let powerState: VmPowerState = "unknown"
    if (resourceGroup && name) {
      try {
        const instanceView = await client.virtualMachines.instanceView(resourceGroup, name)
        powerState = mapPowerState(instanceView.statuses)
      } catch {
        powerState = "unknown"
      }
    }

    vms.push({
      id: vm.id ?? name,
      name,
      resourceGroup,
      location: vm.location ?? "",
      powerState,
    })
  }

  return vms.sort((a, b) => a.name.localeCompare(b.name))
}

export async function startVirtualMachine(resourceGroup: string, name: string): Promise<void> {
  const client = getComputeClient()
  await client.virtualMachines.beginStartAndWait(resourceGroup, name)
}

export async function stopVirtualMachine(resourceGroup: string, name: string): Promise<void> {
  const client = getComputeClient()
  // Deallocate libera os recursos de computação (e para a cobrança), equivalente a "desligar".
  await client.virtualMachines.beginDeallocateAndWait(resourceGroup, name)
}

// ---------------------------------------------------------------------------
// Criação de máquinas virtuais
// ---------------------------------------------------------------------------

export async function createVirtualMachine(options: CreateVmOptions): Promise<void> {
  const { name, resourceGroup, location, size, imageId, adminUsername, adminPassword, useSpot } = options

  const imageOption = VM_IMAGES.find((i) => i.id === imageId)
  if (!imageOption) {
    throw new Error("Imagem selecionada inválida.")
  }

  const compute = getComputeClient()
  const network = getNetworkClient()
  const resources = getResourceClient()

  // 1. Garante que o resource group existe.
  await resources.resourceGroups.createOrUpdate(resourceGroup, { location })

  // 2. Rede virtual + subnet.
  const vnetName = `${name}-vnet`
  const subnetName = `${name}-subnet`
  await network.virtualNetworks.beginCreateOrUpdateAndWait(resourceGroup, vnetName, {
    location,
    addressSpace: { addressPrefixes: ["10.0.0.0/16"] },
    subnets: [{ name: subnetName, addressPrefix: "10.0.0.0/24" }],
  })
  const subnet = await network.subnets.get(resourceGroup, vnetName, subnetName)

  // 3. IP público.
  const publicIpName = `${name}-ip`
  const publicIp = await network.publicIPAddresses.beginCreateOrUpdateAndWait(resourceGroup, publicIpName, {
    location,
    publicIPAllocationMethod: "Static",
    sku: { name: "Standard" },
  })

  // 4. Interface de rede.
  const nicName = `${name}-nic`
  const nic = await network.networkInterfaces.beginCreateOrUpdateAndWait(resourceGroup, nicName, {
    location,
    ipConfigurations: [
      {
        name: `${name}-ipconfig`,
        subnet: { id: subnet.id },
        publicIPAddress: { id: publicIp.id },
      },
    ],
  })

  // 5. Máquina virtual (com opção Spot).
  await compute.virtualMachines.beginCreateOrUpdateAndWait(resourceGroup, name, {
    location,
    hardwareProfile: { vmSize: size },
    storageProfile: {
      imageReference: imageOption.image,
      osDisk: { createOption: "FromImage", managedDisk: { storageAccountType: "Standard_LRS" } },
    },
    osProfile: {
      computerName: name,
      adminUsername,
      adminPassword,
    },
    networkProfile: {
      networkInterfaces: [{ id: nic.id, primary: true }],
    },
    // Configuração de instância Spot: mais barata, porém pode ser removida (evicted) pela Azure.
    ...(useSpot
      ? {
          priority: "Spot",
          evictionPolicy: "Deallocate",
          billingProfile: { maxPrice: -1 },
        }
      : {}),
  })
}
