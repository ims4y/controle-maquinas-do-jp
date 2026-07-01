// Catálogo e tipos compartilhados, seguros para uso no cliente (sem SDKs da Azure).

export type ImageReference = {
  publisher: string
  offer: string
  sku: string
  version: string
}

export type VmImageOption = {
  id: string
  label: string
  osType: "Linux" | "Windows"
  image: ImageReference
}

export const VM_IMAGES: VmImageOption[] = [
  {
    id: "ubuntu-22",
    label: "Ubuntu Server 22.04 LTS",
    osType: "Linux",
    image: { publisher: "Canonical", offer: "0001-com-ubuntu-server-jammy", sku: "22_04-lts-gen2", version: "latest" },
  },
  {
    id: "ubuntu-20",
    label: "Ubuntu Server 20.04 LTS",
    osType: "Linux",
    image: { publisher: "Canonical", offer: "0001-com-ubuntu-server-focal", sku: "20_04-lts-gen2", version: "latest" },
  },
  {
    id: "debian-12",
    label: "Debian 12",
    osType: "Linux",
    image: { publisher: "Debian", offer: "debian-12", sku: "12-gen2", version: "latest" },
  },
  {
    id: "windows-2022",
    label: "Windows Server 2022 Datacenter",
    osType: "Windows",
    image: {
      publisher: "MicrosoftWindowsServer",
      offer: "WindowsServer",
      sku: "2022-datacenter-azure-edition",
      version: "latest",
    },
  },
]

export const VM_SIZES: { id: string; label: string }[] = [
  { id: "Standard_B1s", label: "B1s · 1 vCPU · 1 GiB (econômico)" },
  { id: "Standard_B1ms", label: "B1ms · 1 vCPU · 2 GiB" },
  { id: "Standard_B2s", label: "B2s · 2 vCPU · 4 GiB" },
  { id: "Standard_B2ms", label: "B2ms · 2 vCPU · 8 GiB" },
  { id: "Standard_D2s_v5", label: "D2s v5 · 2 vCPU · 8 GiB" },
  { id: "Standard_D4s_v5", label: "D4s v5 · 4 vCPU · 16 GiB" },
]

export const VM_LOCATIONS: { id: string; label: string }[] = [
  { id: "brazilsouth", label: "Brazil South (São Paulo)" },
  { id: "eastus", label: "East US" },
  { id: "eastus2", label: "East US 2" },
  { id: "westus2", label: "West US 2" },
  { id: "westeurope", label: "West Europe" },
]

export type CreateVmOptions = {
  name: string
  resourceGroup: string
  location: string
  size: string
  imageId: string
  adminUsername: string
  adminPassword: string
  useSpot: boolean
}
