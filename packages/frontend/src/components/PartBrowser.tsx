import { useMemo, useState } from 'react';
import type {
    BayFormFactor,
    BayInterface,
    ControllerCard,
    ControllerConnector,
    ControllerType,
    CPU,
    Memory,
    MemoryGen,
    MemoryType,
    NetworkAdapter,
    NetworkConnectorType,
    Platform,
    SocketType,
    Storage,
} from '../types/hardware';
import { useBuildStore } from '../store/buildStore';
import { cn } from '../lib/utils';
import cpuData from '../../../backend/src/data/cpus.json';
import memoryData from '../../../backend/src/data/memory.json';
import storageData from '../../../backend/src/data/storage.json';
import networkAdaptersData from '../../../backend/src/data/networkAdapters.json';
import controllersData from '../../../backend/src/data/controllers.json';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2 } from 'lucide-react';

export type ComponentType = 'cpus' | 'memory' | 'storage' | 'network' | 'controllers';

interface PartBrowserProps {
    nodeIndex: number;
    selectedType?: ComponentType;
    onSelectedTypeChange?: (type: ComponentType) => void;
}

interface CpuFormState {
    vendor: string;
    name: string;
    sku: string;
    platform: Platform;
    socket: SocketType;
    cores: string;
    threads: string;
    tdpW: string;
    memGenSupported: MemoryGen;
    maxMemSpeedMT: string;
    lanes: string;
    msrp: string;
}

interface MemoryFormState {
    vendor: string;
    name: string;
    sku: string;
    ddrGen: MemoryGen;
    type: MemoryType;
    speedMT: string;
    capacityGB: string;
    ranks: string;
    voltage: string;
    msrp: string;
}

interface StorageFormState {
    vendor: string;
    name: string;
    sku: string;
    type: Storage['type'];
    formFactor: BayFormFactor;
    interface: BayInterface;
    capacityTB: string;
    tdpW: string;
    msrp: string;
}

interface NetworkFormState {
    vendor: string;
    name: string;
    sku: string;
    connector: NetworkConnectorType;
    speedGbps: string;
    portCount: string;
    ocp3Compatible: boolean;
    requiresTransceiver: boolean;
    msrp: string;
}

interface ControllerFormState {
    vendor: string;
    name: string;
    sku: string;
    type: ControllerType;
    pcieGen: string;
    pcieLanes: string;
    connector: ControllerConnector;
    connectorCount: string;
    interface: BayInterface;
    maxDrives: string;
    msrp: string;
}

const SOCKET_OPTIONS: SocketType[] = ['LGA4677', 'SP5', 'LGA4094', 'LGA4926'];
const MEMORY_TYPE_OPTIONS: MemoryType[] = ['RDIMM', 'LRDIMM', 'ECC-UDIMM', 'UDIMM'];
const MEMORY_GEN_OPTIONS: MemoryGen[] = [4, 5];
const STORAGE_TYPE_OPTIONS: Storage['type'][] = ['SSD', 'HDD', 'NVMe'];
const BAY_FORM_FACTOR_OPTIONS: BayFormFactor[] = ['2.5"', '3.5"', 'E1.S', 'E1.L', 'E3.S', 'E3.L', 'M.2', 'U.2', 'U.3'];
const BAY_INTERFACE_OPTIONS: BayInterface[] = ['SATA', 'SAS', 'NVMe'];
const NETWORK_CONNECTOR_OPTIONS: NetworkConnectorType[] = ['RJ45', 'SFP+', 'SFP28', 'QSFP28', 'OCP3.0'];
const CONTROLLER_TYPE_OPTIONS: ControllerType[] = ['HBA', 'RAID', 'Tri-Mode'];
const CONTROLLER_CONNECTOR_OPTIONS: ControllerConnector[] = ['SFF-8643', 'SFF-8654', 'SlimSAS', 'OCuLink', 'U.2'];

const INITIAL_CPU_FORM: CpuFormState = {
    vendor: '',
    name: '',
    sku: '',
    platform: 'Intel',
    socket: 'LGA4677',
    cores: '64',
    threads: '128',
    tdpW: '350',
    memGenSupported: 5,
    maxMemSpeedMT: '5600',
    lanes: '80',
    msrp: '0',
};

const INITIAL_MEMORY_FORM: MemoryFormState = {
    vendor: '',
    name: '',
    sku: '',
    ddrGen: 5,
    type: 'RDIMM',
    speedMT: '5600',
    capacityGB: '64',
    ranks: '2',
    voltage: '1.1',
    msrp: '0',
};

const INITIAL_STORAGE_FORM: StorageFormState = {
    vendor: '',
    name: '',
    sku: '',
    type: 'NVMe',
    formFactor: 'U.2',
    interface: 'NVMe',
    capacityTB: '3.84',
    tdpW: '18',
    msrp: '0',
};

const INITIAL_NETWORK_FORM: NetworkFormState = {
    vendor: '',
    name: '',
    sku: '',
    connector: 'SFP28',
    speedGbps: '25',
    portCount: '2',
    ocp3Compatible: true,
    requiresTransceiver: true,
    msrp: '0',
};

const INITIAL_CONTROLLER_FORM: ControllerFormState = {
    vendor: '',
    name: '',
    sku: '',
    type: 'HBA',
    pcieGen: '4',
    pcieLanes: '8',
    connector: 'SFF-8643',
    connectorCount: '2',
    interface: 'SAS',
    maxDrives: '8',
    msrp: '0',
};

const parsePositiveInt = (value: string, fallback = 0) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const parsePositiveFloat = (value: string, fallback = 0) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

export function PartBrowser({ nodeIndex, selectedType: selectedTypeProp, onSelectedTypeChange }: PartBrowserProps) {
    const [internalSelectedType, setInternalSelectedType] = useState<ComponentType>('cpus');
    const selectedType = selectedTypeProp ?? internalSelectedType;
    const setSelectedType = (nextType: ComponentType) => {
        if (selectedTypeProp === undefined) {
            setInternalSelectedType(nextType);
        }
        onSelectedTypeChange?.(nextType);
    };
    const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');
    const [showCustomForm, setShowCustomForm] = useState(false);

    const [cpuForm, setCpuForm] = useState<CpuFormState>(INITIAL_CPU_FORM);
    const [memoryForm, setMemoryForm] = useState<MemoryFormState>(INITIAL_MEMORY_FORM);
    const [storageForm, setStorageForm] = useState<StorageFormState>(INITIAL_STORAGE_FORM);
    const [networkForm, setNetworkForm] = useState<NetworkFormState>(INITIAL_NETWORK_FORM);
    const [controllerForm, setControllerForm] = useState<ControllerFormState>(INITIAL_CONTROLLER_FORM);
    const [formError, setFormError] = useState<string | null>(null);

    const defaultCpus = useMemo(() => cpuData as CPU[], []);
    const defaultMemory = useMemo(() => memoryData as Memory[], []);
    const defaultStorage = useMemo(() => storageData as Storage[], []);
    const defaultNetworkAdapters = useMemo(() => networkAdaptersData as NetworkAdapter[], []);
    const defaultControllers = useMemo(() => controllersData as ControllerCard[], []);

    const [customCpus, setCustomCpus] = useLocalStorage<CPU[]>('parts_custom_cpu_v1', []);
    const [customMemory, setCustomMemory] = useLocalStorage<Memory[]>('parts_custom_memory_v1', []);
    const [customStorage, setCustomStorage] = useLocalStorage<Storage[]>('parts_custom_storage_v1', []);
    const [customNetworkAdapters, setCustomNetworkAdapters] = useLocalStorage<NetworkAdapter[]>('parts_custom_network_v1', []);
    const [customControllers, setCustomControllers] = useLocalStorage<ControllerCard[]>('parts_custom_controller_v1', []);

    const [hiddenCpuIds, setHiddenCpuIds] = useLocalStorage<string[]>('parts_hidden_cpu_v1', []);
    const [hiddenMemoryIds, setHiddenMemoryIds] = useLocalStorage<string[]>('parts_hidden_memory_v1', []);
    const [hiddenStorageIds, setHiddenStorageIds] = useLocalStorage<string[]>('parts_hidden_storage_v1', []);
    const [hiddenNetworkIds, setHiddenNetworkIds] = useLocalStorage<string[]>('parts_hidden_network_v1', []);
    const [hiddenControllerIds, setHiddenControllerIds] = useLocalStorage<string[]>('parts_hidden_controller_v1', []);

    const {
        build,
        addNodeCPU,
        addNodeMemory,
        addNodeStorage,
        addNodeController,
        addNodeNetworkAdapter,
        removeNodeCPU,
        removeNodeMemory,
        removeNodeStorage,
        removeNodeController,
        removeNodeNetworkAdapter,
    } = useBuildStore();

    const node = build.nodes[nodeIndex];
    const visibleCpus = useMemo(
        () => [...defaultCpus.filter((cpu) => !hiddenCpuIds.includes(cpu.id)), ...customCpus],
        [defaultCpus, hiddenCpuIds, customCpus]
    );
    const visibleMemory = useMemo(
        () => [...defaultMemory.filter((mem) => !hiddenMemoryIds.includes(mem.id)), ...customMemory],
        [defaultMemory, hiddenMemoryIds, customMemory]
    );
    const visibleStorage = useMemo(
        () => [...defaultStorage.filter((drive) => !hiddenStorageIds.includes(drive.id)), ...customStorage],
        [defaultStorage, hiddenStorageIds, customStorage]
    );
    const visibleNetworkAdapters = useMemo(
        () => [...defaultNetworkAdapters.filter((nic) => !hiddenNetworkIds.includes(nic.id)), ...customNetworkAdapters],
        [defaultNetworkAdapters, hiddenNetworkIds, customNetworkAdapters]
    );
    const visibleControllers = useMemo(
        () => [...defaultControllers.filter((controller) => !hiddenControllerIds.includes(controller.id)), ...customControllers],
        [defaultControllers, hiddenControllerIds, customControllers]
    );

    const cpus = useMemo(() => {
        if (platformFilter === 'all') return visibleCpus;
        return visibleCpus.filter((cpu) => cpu.platform === platformFilter);
    }, [visibleCpus, platformFilter]);

    const handleAddCPU = (cpu: CPU) => addNodeCPU(nodeIndex, cpu);
    const handleAddMemory = (mem: Memory) => addNodeMemory(nodeIndex, mem);
    const handleAddStorage = (stg: Storage) => addNodeStorage(nodeIndex, stg);
    const handleAddController = (controller: ControllerCard) => addNodeController(nodeIndex, controller);
    const handleAddNetworkAdapter = (nic: NetworkAdapter) => addNodeNetworkAdapter(nodeIndex, nic);

    const handleDeleteCpu = (cpu: CPU) => {
        if (cpu.id.startsWith('custom-cpu-')) {
            setCustomCpus((prev) => prev.filter((item) => item.id !== cpu.id));
            return;
        }
        if (!hiddenCpuIds.includes(cpu.id)) {
            setHiddenCpuIds((prev) => [...prev, cpu.id]);
        }
    };

    const handleDeleteMemory = (mem: Memory) => {
        if (mem.id.startsWith('custom-memory-')) {
            setCustomMemory((prev) => prev.filter((item) => item.id !== mem.id));
            return;
        }
        if (!hiddenMemoryIds.includes(mem.id)) {
            setHiddenMemoryIds((prev) => [...prev, mem.id]);
        }
    };

    const handleDeleteStorage = (drive: Storage) => {
        if (drive.id.startsWith('custom-storage-')) {
            setCustomStorage((prev) => prev.filter((item) => item.id !== drive.id));
            return;
        }
        if (!hiddenStorageIds.includes(drive.id)) {
            setHiddenStorageIds((prev) => [...prev, drive.id]);
        }
    };

    const handleDeleteNetworkAdapter = (nic: NetworkAdapter) => {
        if (nic.id.startsWith('custom-network-')) {
            setCustomNetworkAdapters((prev) => prev.filter((item) => item.id !== nic.id));
            return;
        }
        if (!hiddenNetworkIds.includes(nic.id)) {
            setHiddenNetworkIds((prev) => [...prev, nic.id]);
        }
    };

    const handleDeleteController = (controller: ControllerCard) => {
        if (controller.id.startsWith('custom-controller-')) {
            setCustomControllers((prev) => prev.filter((item) => item.id !== controller.id));
            return;
        }
        if (!hiddenControllerIds.includes(controller.id)) {
            setHiddenControllerIds((prev) => [...prev, controller.id]);
        }
    };

    const handleAddCustomPart = () => {
        setFormError(null);

        if (selectedType === 'cpus') {
            if (!cpuForm.vendor.trim() || !cpuForm.name.trim()) {
                setFormError('CPU vendor and name are required.');
                return;
            }

            const newCpu: CPU = {
                id: `custom-cpu-${uuidv4()}`,
                sku: cpuForm.sku.trim() || 'Custom CPU',
                vendor: cpuForm.vendor.trim(),
                name: cpuForm.name.trim(),
                family: 'Custom',
                platform: cpuForm.platform,
                cores: Math.max(1, parsePositiveInt(cpuForm.cores, 1)),
                threads: Math.max(1, parsePositiveInt(cpuForm.threads, 1)),
                baseClock: 0,
                constraints: {
                    socket: cpuForm.socket,
                    memGenSupported: [cpuForm.memGenSupported],
                    tdpW: parsePositiveInt(cpuForm.tdpW, 0),
                    maxMemSpeedMT: parsePositiveInt(cpuForm.maxMemSpeedMT, 0),
                    lanes: parsePositiveInt(cpuForm.lanes, 0),
                },
                msrp: parsePositiveFloat(cpuForm.msrp, 0),
                currency: 'USD',
                lastUpdated: new Date().toISOString().slice(0, 10),
            };
            setCustomCpus((prev) => [...prev, newCpu]);
            setCpuForm(INITIAL_CPU_FORM);
            setShowCustomForm(false);
            return;
        }

        if (selectedType === 'memory') {
            if (!memoryForm.vendor.trim() || !memoryForm.name.trim()) {
                setFormError('Memory vendor and name are required.');
                return;
            }

            const newMemory: Memory = {
                id: `custom-memory-${uuidv4()}`,
                sku: memoryForm.sku.trim() || 'Custom DIMM',
                vendor: memoryForm.vendor.trim(),
                name: memoryForm.name.trim(),
                constraints: {
                    ddrGen: memoryForm.ddrGen,
                    type: memoryForm.type,
                    speedMT: Math.max(1, parsePositiveInt(memoryForm.speedMT, 1)),
                    capacityGB: Math.max(1, parsePositiveInt(memoryForm.capacityGB, 1)),
                    ranks: Math.max(1, parsePositiveInt(memoryForm.ranks, 1)),
                    voltage: Math.max(0.5, parsePositiveFloat(memoryForm.voltage, 1.1)),
                },
                msrp: parsePositiveFloat(memoryForm.msrp, 0),
                currency: 'USD',
                lastUpdated: new Date().toISOString().slice(0, 10),
            };
            setCustomMemory((prev) => [...prev, newMemory]);
            setMemoryForm(INITIAL_MEMORY_FORM);
            setShowCustomForm(false);
            return;
        }

        if (selectedType === 'network') {
            if (!networkForm.vendor.trim() || !networkForm.name.trim()) {
                setFormError('Network adapter vendor and name are required.');
                return;
            }

            const newNetworkAdapter: NetworkAdapter = {
                id: `custom-network-${uuidv4()}`,
                sku: networkForm.sku.trim() || 'Custom NIC',
                vendor: networkForm.vendor.trim(),
                name: networkForm.name.trim(),
                constraints: {
                    ports: [
                        {
                            connector: networkForm.connector,
                            speedGbps: Math.max(1, parsePositiveInt(networkForm.speedGbps, 1)),
                            count: Math.max(1, parsePositiveInt(networkForm.portCount, 1)),
                        },
                    ],
                    ocp3Compatible: networkForm.ocp3Compatible,
                    requiresTransceiver: networkForm.requiresTransceiver,
                },
                msrp: parsePositiveFloat(networkForm.msrp, 0),
                currency: 'USD',
                lastUpdated: new Date().toISOString().slice(0, 10),
            };
            setCustomNetworkAdapters((prev) => [...prev, newNetworkAdapter]);
            setNetworkForm(INITIAL_NETWORK_FORM);
            setShowCustomForm(false);
            return;
        }

        if (selectedType === 'controllers') {
            if (!controllerForm.vendor.trim() || !controllerForm.name.trim()) {
                setFormError('Controller vendor and name are required.');
                return;
            }

            const newController: ControllerCard = {
                id: `custom-controller-${uuidv4()}`,
                sku: controllerForm.sku.trim() || 'Custom Controller',
                vendor: controllerForm.vendor.trim(),
                name: controllerForm.name.trim(),
                constraints: {
                    type: controllerForm.type,
                    pcieGen: Math.max(1, parsePositiveInt(controllerForm.pcieGen, 1)),
                    pcieLanes: Math.max(1, parsePositiveInt(controllerForm.pcieLanes, 1)),
                    ports: [
                        {
                            connector: controllerForm.connector,
                            count: Math.max(1, parsePositiveInt(controllerForm.connectorCount, 1)),
                            lanesPerPort: 4,
                            interface: controllerForm.interface,
                        },
                    ],
                    maxDrives: Math.max(1, parsePositiveInt(controllerForm.maxDrives, 1)),
                },
                msrp: parsePositiveFloat(controllerForm.msrp, 0),
                currency: 'USD',
                lastUpdated: new Date().toISOString().slice(0, 10),
            };
            setCustomControllers((prev) => [...prev, newController]);
            setControllerForm(INITIAL_CONTROLLER_FORM);
            setShowCustomForm(false);
            return;
        }

        if (!storageForm.vendor.trim() || !storageForm.name.trim()) {
            setFormError('Storage vendor and name are required.');
            return;
        }

        const newStorage: Storage = {
            id: `custom-storage-${uuidv4()}`,
            sku: storageForm.sku.trim() || 'Custom Drive',
            vendor: storageForm.vendor.trim(),
            name: storageForm.name.trim(),
            type: storageForm.type,
            constraints: {
                formFactor: storageForm.formFactor,
                interface: storageForm.interface,
                capacityTB: Math.max(0.01, parsePositiveFloat(storageForm.capacityTB, 0.01)),
                tdpW: parsePositiveInt(storageForm.tdpW, 0),
            },
            msrp: parsePositiveFloat(storageForm.msrp, 0),
            currency: 'USD',
            lastUpdated: new Date().toISOString().slice(0, 10),
        };
        setCustomStorage((prev) => [...prev, newStorage]);
        setStorageForm(INITIAL_STORAGE_FORM);
        setShowCustomForm(false);
    };

    const hiddenCount =
        selectedType === 'cpus'
            ? hiddenCpuIds.length
            : selectedType === 'memory'
                ? hiddenMemoryIds.length
                : selectedType === 'storage'
                    ? hiddenStorageIds.length
                    : selectedType === 'network'
                        ? hiddenNetworkIds.length
                        : hiddenControllerIds.length;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2 border-b border-slate-700">
                <button
                    onClick={() => {
                        setSelectedType('cpus');
                        setShowCustomForm(false);
                        setFormError(null);
                    }}
                    className={cn(
                        'px-4 py-2 font-medium transition-colors border-b-2',
                        selectedType === 'cpus'
                            ? 'border-blue-500 text-blue-400'
                            : 'border-transparent text-slate-400 hover:text-slate-200'
                    )}
                >
                    CPUs
                </button>
                <button
                    onClick={() => {
                        setSelectedType('memory');
                        setShowCustomForm(false);
                        setFormError(null);
                    }}
                    className={cn(
                        'px-4 py-2 font-medium transition-colors border-b-2',
                        selectedType === 'memory'
                            ? 'border-blue-500 text-blue-400'
                            : 'border-transparent text-slate-400 hover:text-slate-200'
                    )}
                >
                    Memory
                </button>
                <button
                    onClick={() => {
                        setSelectedType('storage');
                        setShowCustomForm(false);
                        setFormError(null);
                    }}
                    className={cn(
                        'px-4 py-2 font-medium transition-colors border-b-2',
                        selectedType === 'storage'
                            ? 'border-blue-500 text-blue-400'
                            : 'border-transparent text-slate-400 hover:text-slate-200'
                    )}
                >
                    Storage
                </button>
                <button
                    onClick={() => {
                        setSelectedType('network');
                        setShowCustomForm(false);
                        setFormError(null);
                    }}
                    className={cn(
                        'px-4 py-2 font-medium transition-colors border-b-2',
                        selectedType === 'network'
                            ? 'border-blue-500 text-blue-400'
                            : 'border-transparent text-slate-400 hover:text-slate-200'
                    )}
                >
                    Networking
                </button>
                <button
                    onClick={() => {
                        setSelectedType('controllers');
                        setShowCustomForm(false);
                        setFormError(null);
                    }}
                    className={cn(
                        'px-4 py-2 font-medium transition-colors border-b-2',
                        selectedType === 'controllers'
                            ? 'border-blue-500 text-blue-400'
                            : 'border-transparent text-slate-400 hover:text-slate-200'
                    )}
                >
                    Controllers
                </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <button
                    onClick={() => {
                        setShowCustomForm((prev) => !prev);
                        setFormError(null);
                    }}
                    className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                >
                    <Plus size={14} />
                    Add Custom {
                        selectedType === 'cpus'
                            ? 'CPU'
                            : selectedType === 'memory'
                                ? 'Memory'
                                : selectedType === 'storage'
                                    ? 'Storage'
                                    : selectedType === 'network'
                                        ? 'Network Adapter'
                                        : 'Controller/HBA'
                    }
                </button>
                {hiddenCount > 0 && (
                    <button
                        onClick={() => {
                            if (selectedType === 'cpus') setHiddenCpuIds([]);
                            if (selectedType === 'memory') setHiddenMemoryIds([]);
                            if (selectedType === 'storage') setHiddenStorageIds([]);
                            if (selectedType === 'network') setHiddenNetworkIds([]);
                            if (selectedType === 'controllers') setHiddenControllerIds([]);
                        }}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-sm"
                    >
                        Restore Hidden ({hiddenCount})
                    </button>
                )}
            </div>

            {selectedType === 'cpus' && (
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-slate-400 py-1">Platform:</span>
                    {(['all', 'Intel', 'AMD', 'Ampere'] as const).map((platform) => (
                        <button
                            key={platform}
                            onClick={() => setPlatformFilter(platform)}
                            className={cn(
                                'px-3 py-1 rounded text-sm transition-colors',
                                platformFilter === platform
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            )}
                            data-testid={`platform-${platform}`}
                        >
                            {platform === 'all' ? 'All' : platform}
                        </button>
                    ))}
                </div>
            )}

            {showCustomForm && (
                <div className="rounded border border-slate-700 bg-slate-800 p-4 space-y-3">
                    <h4 className="font-semibold">
                        New Custom {
                            selectedType === 'cpus'
                                ? 'CPU'
                                : selectedType === 'memory'
                                    ? 'Memory'
                                    : selectedType === 'storage'
                                        ? 'Storage'
                                        : selectedType === 'network'
                                            ? 'Network Adapter'
                                            : 'Controller/HBA'
                        }
                    </h4>
                    {formError && <p className="text-sm text-red-400">{formError}</p>}

                    {selectedType === 'cpus' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <input value={cpuForm.vendor} onChange={(e) => setCpuForm({ ...cpuForm, vendor: e.target.value })} placeholder="Vendor" className="bg-slate-950 border border-slate-700 rounded px-2 py-1" />
                            <input value={cpuForm.name} onChange={(e) => setCpuForm({ ...cpuForm, name: e.target.value })} placeholder="Name" className="bg-slate-950 border border-slate-700 rounded px-2 py-1" />
                            <input value={cpuForm.sku} onChange={(e) => setCpuForm({ ...cpuForm, sku: e.target.value })} placeholder="SKU" className="bg-slate-950 border border-slate-700 rounded px-2 py-1" />
                            <select value={cpuForm.platform} onChange={(e) => setCpuForm({ ...cpuForm, platform: e.target.value as Platform })} className="bg-slate-950 border border-slate-700 rounded px-2 py-1">
                                <option value="Intel">Intel</option>
                                <option value="AMD">AMD</option>
                                <option value="Ampere">Ampere</option>
                            </select>
                            <select value={cpuForm.socket} onChange={(e) => setCpuForm({ ...cpuForm, socket: e.target.value as SocketType })} className="bg-slate-950 border border-slate-700 rounded px-2 py-1">
                                {SOCKET_OPTIONS.map((socket) => <option key={socket} value={socket}>{socket}</option>)}
                            </select>
                            <select value={cpuForm.memGenSupported} onChange={(e) => setCpuForm({ ...cpuForm, memGenSupported: Number(e.target.value) as MemoryGen })} className="bg-slate-950 border border-slate-700 rounded px-2 py-1">
                                {MEMORY_GEN_OPTIONS.map((gen) => <option key={gen} value={gen}>DDR{gen}</option>)}
                            </select>
                            <input type="number" min={1} value={cpuForm.cores} onChange={(e) => setCpuForm({ ...cpuForm, cores: e.target.value })} placeholder="Cores" className="bg-slate-950 border border-slate-700 rounded px-2 py-1" />
                            <input type="number" min={1} value={cpuForm.threads} onChange={(e) => setCpuForm({ ...cpuForm, threads: e.target.value })} placeholder="Threads" className="bg-slate-950 border border-slate-700 rounded px-2 py-1" />
                            <input type="number" min={0} value={cpuForm.tdpW} onChange={(e) => setCpuForm({ ...cpuForm, tdpW: e.target.value })} placeholder="TDP (W)" className="bg-slate-950 border border-slate-700 rounded px-2 py-1" />
                            <input type="number" min={0} value={cpuForm.maxMemSpeedMT} onChange={(e) => setCpuForm({ ...cpuForm, maxMemSpeedMT: e.target.value })} placeholder="Max Mem MT/s" className="bg-slate-950 border border-slate-700 rounded px-2 py-1" />
                            <input type="number" min={0} value={cpuForm.lanes} onChange={(e) => setCpuForm({ ...cpuForm, lanes: e.target.value })} placeholder="PCIe Lanes" className="bg-slate-950 border border-slate-700 rounded px-2 py-1" />
                            <input type="number" min={0} step="0.01" value={cpuForm.msrp} onChange={(e) => setCpuForm({ ...cpuForm, msrp: e.target.value })} placeholder="MSRP" className="bg-slate-950 border border-slate-700 rounded px-2 py-1" />
                        </div>
                    )}

                    {selectedType === 'memory' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <input value={memoryForm.vendor} onChange={(e) => setMemoryForm({ ...memoryForm, vendor: e.target.value })} placeholder="Vendor" className="bg-slate-950 border border-slate-700 rounded px-2 py-1" />
                            <input value={memoryForm.name} onChange={(e) => setMemoryForm({ ...memoryForm, name: e.target.value })} placeholder="Name" className="bg-slate-950 border border-slate-700 rounded px-2 py-1" />
                            <input value={memoryForm.sku} onChange={(e) => setMemoryForm({ ...memoryForm, sku: e.target.value })} placeholder="SKU" className="bg-slate-950 border border-slate-700 rounded px-2 py-1" />
                            <select value={memoryForm.ddrGen} onChange={(e) => setMemoryForm({ ...memoryForm, ddrGen: Number(e.target.value) as MemoryGen })} className="bg-slate-950 border border-slate-700 rounded px-2 py-1">
                                {MEMORY_GEN_OPTIONS.map((gen) => <option key={gen} value={gen}>DDR{gen}</option>)}
                            </select>
                            <select value={memoryForm.type} onChange={(e) => setMemoryForm({ ...memoryForm, type: e.target.value as MemoryType })} className="bg-slate-950 border border-slate-700 rounded px-2 py-1">
                                {MEMORY_TYPE_OPTIONS.map((type) => <option key={type} value={type}>{type}</option>)}
                            </select>
                            <input type="number" min={1} value={memoryForm.capacityGB} onChange={(e) => setMemoryForm({ ...memoryForm, capacityGB: e.target.value })} placeholder="Capacity (GB)" className="bg-slate-950 border border-slate-700 rounded px-2 py-1" />
                            <input type="number" min={1} value={memoryForm.speedMT} onChange={(e) => setMemoryForm({ ...memoryForm, speedMT: e.target.value })} placeholder="Speed MT/s" className="bg-slate-950 border border-slate-700 rounded px-2 py-1" />
                            <input type="number" min={1} value={memoryForm.ranks} onChange={(e) => setMemoryForm({ ...memoryForm, ranks: e.target.value })} placeholder="Ranks" className="bg-slate-950 border border-slate-700 rounded px-2 py-1" />
                            <input type="number" min={0} step="0.01" value={memoryForm.voltage} onChange={(e) => setMemoryForm({ ...memoryForm, voltage: e.target.value })} placeholder="Voltage" className="bg-slate-950 border border-slate-700 rounded px-2 py-1" />
                            <input type="number" min={0} step="0.01" value={memoryForm.msrp} onChange={(e) => setMemoryForm({ ...memoryForm, msrp: e.target.value })} placeholder="MSRP" className="bg-slate-950 border border-slate-700 rounded px-2 py-1" />
                        </div>
                    )}

                    {selectedType === 'storage' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <input value={storageForm.vendor} onChange={(e) => setStorageForm({ ...storageForm, vendor: e.target.value })} placeholder="Vendor" className="bg-slate-950 border border-slate-700 rounded px-2 py-1" />
                            <input value={storageForm.name} onChange={(e) => setStorageForm({ ...storageForm, name: e.target.value })} placeholder="Name" className="bg-slate-950 border border-slate-700 rounded px-2 py-1" />
                            <input value={storageForm.sku} onChange={(e) => setStorageForm({ ...storageForm, sku: e.target.value })} placeholder="SKU" className="bg-slate-950 border border-slate-700 rounded px-2 py-1" />
                            <select value={storageForm.type} onChange={(e) => setStorageForm({ ...storageForm, type: e.target.value as Storage['type'] })} className="bg-slate-950 border border-slate-700 rounded px-2 py-1">
                                {STORAGE_TYPE_OPTIONS.map((type) => <option key={type} value={type}>{type}</option>)}
                            </select>
                            <select value={storageForm.formFactor} onChange={(e) => setStorageForm({ ...storageForm, formFactor: e.target.value as BayFormFactor })} className="bg-slate-950 border border-slate-700 rounded px-2 py-1">
                                {BAY_FORM_FACTOR_OPTIONS.map((ff) => <option key={ff} value={ff}>{ff}</option>)}
                            </select>
                            <select value={storageForm.interface} onChange={(e) => setStorageForm({ ...storageForm, interface: e.target.value as BayInterface })} className="bg-slate-950 border border-slate-700 rounded px-2 py-1">
                                {BAY_INTERFACE_OPTIONS.map((iface) => <option key={iface} value={iface}>{iface}</option>)}
                            </select>
                            <input type="number" min={0.01} step="0.01" value={storageForm.capacityTB} onChange={(e) => setStorageForm({ ...storageForm, capacityTB: e.target.value })} placeholder="Capacity (TB)" className="bg-slate-950 border border-slate-700 rounded px-2 py-1" />
                            <input type="number" min={0} value={storageForm.tdpW} onChange={(e) => setStorageForm({ ...storageForm, tdpW: e.target.value })} placeholder="TDP (W)" className="bg-slate-950 border border-slate-700 rounded px-2 py-1" />
                            <input type="number" min={0} step="0.01" value={storageForm.msrp} onChange={(e) => setStorageForm({ ...storageForm, msrp: e.target.value })} placeholder="MSRP" className="bg-slate-950 border border-slate-700 rounded px-2 py-1" />
                        </div>
                    )}

                    {selectedType === 'network' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <input value={networkForm.vendor} onChange={(e) => setNetworkForm({ ...networkForm, vendor: e.target.value })} placeholder="Vendor" className="bg-slate-950 border border-slate-700 rounded px-2 py-1" />
                            <input value={networkForm.name} onChange={(e) => setNetworkForm({ ...networkForm, name: e.target.value })} placeholder="Name" className="bg-slate-950 border border-slate-700 rounded px-2 py-1" />
                            <input value={networkForm.sku} onChange={(e) => setNetworkForm({ ...networkForm, sku: e.target.value })} placeholder="SKU" className="bg-slate-950 border border-slate-700 rounded px-2 py-1" />
                            <select value={networkForm.connector} onChange={(e) => setNetworkForm({ ...networkForm, connector: e.target.value as NetworkConnectorType })} className="bg-slate-950 border border-slate-700 rounded px-2 py-1">
                                {NETWORK_CONNECTOR_OPTIONS.map((connector) => <option key={connector} value={connector}>{connector}</option>)}
                            </select>
                            <input type="number" min={1} value={networkForm.speedGbps} onChange={(e) => setNetworkForm({ ...networkForm, speedGbps: e.target.value })} placeholder="Port Speed (Gbps)" className="bg-slate-950 border border-slate-700 rounded px-2 py-1" />
                            <input type="number" min={1} value={networkForm.portCount} onChange={(e) => setNetworkForm({ ...networkForm, portCount: e.target.value })} placeholder="Port Count" className="bg-slate-950 border border-slate-700 rounded px-2 py-1" />
                            <label className="flex items-center gap-2 text-sm text-slate-300 px-2 py-1">
                                <input
                                    type="checkbox"
                                    checked={networkForm.ocp3Compatible}
                                    onChange={(e) => setNetworkForm({ ...networkForm, ocp3Compatible: e.target.checked })}
                                    className="w-4 h-4"
                                />
                                OCP 3.0 Compatible
                            </label>
                            <label className="flex items-center gap-2 text-sm text-slate-300 px-2 py-1">
                                <input
                                    type="checkbox"
                                    checked={networkForm.requiresTransceiver}
                                    onChange={(e) => setNetworkForm({ ...networkForm, requiresTransceiver: e.target.checked })}
                                    className="w-4 h-4"
                                />
                                Requires Transceiver
                            </label>
                            <input type="number" min={0} step="0.01" value={networkForm.msrp} onChange={(e) => setNetworkForm({ ...networkForm, msrp: e.target.value })} placeholder="MSRP" className="bg-slate-950 border border-slate-700 rounded px-2 py-1" />
                        </div>
                    )}

                    {selectedType === 'controllers' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <input value={controllerForm.vendor} onChange={(e) => setControllerForm({ ...controllerForm, vendor: e.target.value })} placeholder="Vendor" className="bg-slate-950 border border-slate-700 rounded px-2 py-1" />
                            <input value={controllerForm.name} onChange={(e) => setControllerForm({ ...controllerForm, name: e.target.value })} placeholder="Name" className="bg-slate-950 border border-slate-700 rounded px-2 py-1" />
                            <input value={controllerForm.sku} onChange={(e) => setControllerForm({ ...controllerForm, sku: e.target.value })} placeholder="SKU" className="bg-slate-950 border border-slate-700 rounded px-2 py-1" />
                            <select value={controllerForm.type} onChange={(e) => setControllerForm({ ...controllerForm, type: e.target.value as ControllerType })} className="bg-slate-950 border border-slate-700 rounded px-2 py-1">
                                {CONTROLLER_TYPE_OPTIONS.map((type) => <option key={type} value={type}>{type}</option>)}
                            </select>
                            <input type="number" min={1} value={controllerForm.pcieGen} onChange={(e) => setControllerForm({ ...controllerForm, pcieGen: e.target.value })} placeholder="PCIe Gen" className="bg-slate-950 border border-slate-700 rounded px-2 py-1" />
                            <input type="number" min={1} value={controllerForm.pcieLanes} onChange={(e) => setControllerForm({ ...controllerForm, pcieLanes: e.target.value })} placeholder="PCIe Lanes" className="bg-slate-950 border border-slate-700 rounded px-2 py-1" />
                            <select value={controllerForm.connector} onChange={(e) => setControllerForm({ ...controllerForm, connector: e.target.value as ControllerConnector })} className="bg-slate-950 border border-slate-700 rounded px-2 py-1">
                                {CONTROLLER_CONNECTOR_OPTIONS.map((connector) => <option key={connector} value={connector}>{connector}</option>)}
                            </select>
                            <input type="number" min={1} value={controllerForm.connectorCount} onChange={(e) => setControllerForm({ ...controllerForm, connectorCount: e.target.value })} placeholder="Connector Count" className="bg-slate-950 border border-slate-700 rounded px-2 py-1" />
                            <select value={controllerForm.interface} onChange={(e) => setControllerForm({ ...controllerForm, interface: e.target.value as BayInterface })} className="bg-slate-950 border border-slate-700 rounded px-2 py-1">
                                {BAY_INTERFACE_OPTIONS.map((iface) => <option key={iface} value={iface}>{iface}</option>)}
                            </select>
                            <input type="number" min={1} value={controllerForm.maxDrives} onChange={(e) => setControllerForm({ ...controllerForm, maxDrives: e.target.value })} placeholder="Max Drives" className="bg-slate-950 border border-slate-700 rounded px-2 py-1" />
                            <input type="number" min={0} step="0.01" value={controllerForm.msrp} onChange={(e) => setControllerForm({ ...controllerForm, msrp: e.target.value })} placeholder="MSRP" className="bg-slate-950 border border-slate-700 rounded px-2 py-1" />
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button onClick={handleAddCustomPart} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm">Save</button>
                        <button onClick={() => { setShowCustomForm(false); setFormError(null); }} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm">Cancel</button>
                    </div>
                </div>
            )}

            <div className="space-y-2">
                {selectedType === 'cpus' && cpus.map((cpu) => {
                    const isCompatible = !node.motherboard ||
                        node.motherboard.constraints.socket === cpu.constraints.socket;
                    const selectedCount = node.cpus.filter(c => c.id === cpu.id).length;
                    const cpuLimit =
                        node.motherboard?.constraints.memory.socketsCount ??
                        build.chassis?.constraints.nodes[nodeIndex]?.cpuCount ??
                        2;
                    const slotsFull = node.cpus.length >= cpuLimit;

                    return (
                        <div
                            key={cpu.id}
                            className={cn(
                                'p-4 rounded-lg border transition-all',
                                !isCompatible ? 'border-slate-800 bg-slate-900 opacity-50' :
                                    selectedCount > 0 ? 'border-green-700 bg-green-950/30' :
                                        'border-slate-700 bg-slate-800 hover:border-blue-600'
                            )}
                        >
                            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start">
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold">{cpu.name}</h4>
                                    <p className="text-sm text-slate-400 break-words">{cpu.vendor} • {cpu.sku}</p>
                                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                                        <span className="text-slate-400">{cpu.cores}C/{cpu.threads}T</span>
                                        <span className="text-slate-400">{cpu.constraints.tdpW}W TDP</span>
                                        <span className="text-slate-400">{cpu.constraints.socket}</span>
                                    </div>
                                    {!isCompatible && (
                                        <p className="mt-2 text-xs text-red-400">
                                            ⚠️ Incompatible socket (motherboard: {node.motherboard?.constraints.socket})
                                        </p>
                                    )}
                                </div>
                                <div className="flex flex-col items-start sm:items-end gap-2 sm:shrink-0">
                                    <div className="flex items-center gap-2">
                                        {cpu.msrp !== undefined && (
                                            <span className="text-blue-400 font-semibold">
                                                ${cpu.msrp.toLocaleString()}
                                            </span>
                                        )}
                                        <button
                                            onClick={() => handleDeleteCpu(cpu)}
                                            className="p-1 text-red-400 hover:text-red-300"
                                            title="Delete from catalog"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                const idx = node.cpus.findIndex(c => c.id === cpu.id);
                                                if (idx !== -1) removeNodeCPU(nodeIndex, idx);
                                            }}
                                            disabled={selectedCount === 0}
                                            className={cn(
                                                'px-2 py-1 rounded text-sm',
                                                selectedCount === 0
                                                    ? 'bg-slate-700 cursor-not-allowed'
                                                    : 'bg-red-600 hover:bg-red-700'
                                            )}
                                        >
                                            -
                                        </button>
                                        <span className="w-6 text-center text-sm font-medium">{selectedCount}</span>
                                        <button
                                            onClick={() => handleAddCPU(cpu)}
                                            disabled={!isCompatible || slotsFull}
                                            className={cn(
                                                'px-2 py-1 rounded text-sm',
                                                isCompatible && !slotsFull
                                                    ? 'bg-blue-600 hover:bg-blue-700'
                                                    : 'bg-slate-700 cursor-not-allowed'
                                            )}
                                        >
                                            +
                                        </button>
                                    </div>
                                    {slotsFull && selectedCount === 0 && (
                                        <span className="text-xs text-amber-500">CPU slots full</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {selectedType === 'memory' && visibleMemory.map((mem) => {
                    const motherboardCompatible = !node.motherboard || (
                        node.motherboard.constraints.memory.ddrGen === mem.constraints.ddrGen &&
                        node.motherboard.constraints.memory.dimmTypes.includes(mem.constraints.type)
                    );

                    const cpuCompatible = node.cpus.length === 0 || node.cpus.some(cpu =>
                        cpu.constraints.memGenSupported.includes(mem.constraints.ddrGen)
                    );

                    const isCompatible = motherboardCompatible && cpuCompatible;
                    const selectedCount = node.memory.filter((dimm) => dimm.id === mem.id).length;
                    const currentDimmCount = node.memory.length;
                    const chassisMaxDimms = build.chassis?.constraints.maxDimmsPerNode;
                    const motherboardDimmSlots = node.motherboard
                        ? node.motherboard.constraints.memory.channelsPerSocket *
                        node.motherboard.constraints.memory.dimmsPerChannel *
                        node.motherboard.constraints.memory.socketsCount
                        : undefined;
                    const computedMaxDimms = [chassisMaxDimms, motherboardDimmSlots].filter((value): value is number => value !== undefined);
                    const maxDimms = computedMaxDimms.length > 0 ? Math.min(...computedMaxDimms) : undefined;
                    const slotsFull = maxDimms !== undefined && currentDimmCount >= maxDimms;

                    return (
                        <div
                            key={mem.id}
                            className={cn(
                                'p-4 rounded-lg border transition-all',
                                !isCompatible ? 'border-slate-800 bg-slate-900 opacity-50' :
                                    'border-slate-700 bg-slate-800 hover:border-blue-600'
                            )}
                        >
                            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start">
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold">{mem.name}</h4>
                                    <p className="text-sm text-slate-400 break-words">{mem.vendor} • {mem.sku}</p>
                                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                                        <span className="text-slate-400">{mem.constraints.capacityGB}GB</span>
                                        <span className="text-slate-400">DDR{mem.constraints.ddrGen}</span>
                                        <span className="text-slate-400">{mem.constraints.type}</span>
                                        <span className="text-slate-400">{mem.constraints.speedMT} MT/s</span>
                                    </div>
                                    {!isCompatible && (
                                        <div className="mt-2 text-xs text-red-400 space-y-1">
                                            {!motherboardCompatible && node.motherboard && (
                                                <p>⚠️ Incompatible with motherboard (needs DDR{node.motherboard.constraints.memory.ddrGen} {node.motherboard.constraints.memory.dimmTypes.join('/')})</p>
                                            )}
                                            {!cpuCompatible && node.cpus.length > 0 && (
                                                <p>⚠️ Incompatible with CPU (needs DDR{node.cpus[0].constraints.memGenSupported.join('/')})</p>
                                            )}
                                        </div>
                                    )}
                                    {isCompatible && slotsFull && (
                                        <p className="mt-2 text-xs text-amber-500">
                                            ⚠️ DIMM slots full ({currentDimmCount}/{maxDimms})
                                        </p>
                                    )}
                                </div>
                                <div className="flex flex-col items-start sm:items-end gap-2 sm:shrink-0">
                                    <div className="flex items-center gap-2">
                                        {mem.msrp !== undefined && (
                                            <span className="text-blue-400 font-semibold">
                                                ${mem.msrp.toLocaleString()}
                                            </span>
                                        )}
                                        <button
                                            onClick={() => handleDeleteMemory(mem)}
                                            className="p-1 text-red-400 hover:text-red-300"
                                            title="Delete from catalog"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                const idx = node.memory.findIndex((dimm) => dimm.id === mem.id);
                                                if (idx !== -1) removeNodeMemory(nodeIndex, idx);
                                            }}
                                            disabled={selectedCount === 0}
                                            className={cn(
                                                'px-2 py-1 rounded text-sm',
                                                selectedCount === 0
                                                    ? 'bg-slate-700 cursor-not-allowed'
                                                    : 'bg-red-600 hover:bg-red-700'
                                            )}
                                        >
                                            -
                                        </button>
                                        <span className="w-6 text-center text-sm font-medium">{selectedCount}</span>
                                        <button
                                            onClick={() => handleAddMemory(mem)}
                                            disabled={!isCompatible || slotsFull}
                                            className={cn(
                                                'px-2 py-1 rounded text-sm',
                                                !isCompatible || slotsFull
                                                    ? 'bg-slate-700 cursor-not-allowed'
                                                    : 'bg-blue-600 hover:bg-blue-700'
                                            )}
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {selectedType === 'storage' && visibleStorage.map((stg) => {
                    const selectedCount = node.storage.filter((drive) => drive.id === stg.id).length;
                    return (
                        <div
                            key={stg.id}
                            className={cn(
                                'p-4 rounded-lg border transition-all',
                                selectedCount > 0
                                    ? 'border-green-700 bg-green-950/30'
                                    : 'border-slate-700 bg-slate-800 hover:border-blue-600'
                            )}
                        >
                            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start">
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold">{stg.name}</h4>
                                    <p className="text-sm text-slate-400 break-words">{stg.vendor} • {stg.sku}</p>
                                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                                        <span className="text-slate-400">{stg.constraints.capacityTB}TB</span>
                                        <span className="text-slate-400">{stg.constraints.tdpW}W TDP</span>
                                        <span className="text-slate-400">{stg.type}</span>
                                        <span className="text-slate-400">{stg.constraints.formFactor}</span>
                                        <span className="text-slate-400">{stg.constraints.interface}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-start sm:items-end gap-2 sm:shrink-0">
                                    <div className="flex items-center gap-2">
                                        {stg.msrp !== undefined && (
                                            <span className="text-blue-400 font-semibold">
                                                ${stg.msrp.toLocaleString()}
                                            </span>
                                        )}
                                        <button
                                            onClick={() => handleDeleteStorage(stg)}
                                            className="p-1 text-red-400 hover:text-red-300"
                                            title="Delete from catalog"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                const idx = node.storage.findIndex((drive) => drive.id === stg.id);
                                                if (idx !== -1) removeNodeStorage(nodeIndex, idx);
                                            }}
                                            disabled={selectedCount === 0}
                                            className={cn(
                                                'px-2 py-1 rounded text-sm',
                                                selectedCount === 0
                                                    ? 'bg-slate-700 cursor-not-allowed'
                                                    : 'bg-red-600 hover:bg-red-700'
                                            )}
                                        >
                                            -
                                        </button>
                                        <span className="w-6 text-center text-sm font-medium">{selectedCount}</span>
                                        <button
                                            onClick={() => handleAddStorage(stg)}
                                            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {selectedType === 'controllers' && visibleControllers.map((controller) => {
                    const nodeControllers = node.controllers ?? [];
                    const selectedCount = nodeControllers.filter((selected) => selected.id === controller.id).length;
                    const maxPcieCards = node.motherboard?.constraints.pcie.slots.length;
                    const slotsFull = maxPcieCards !== undefined && nodeControllers.length >= maxPcieCards;
                    const connectorSummary = controller.constraints.ports
                        .map((port) => `${port.count}x ${port.connector} (${port.interface})`)
                        .join(', ');
                    const limitedBySlots = slotsFull && selectedCount === 0;

                    return (
                        <div
                            key={controller.id}
                            className={cn(
                                'p-4 rounded-lg border transition-all',
                                limitedBySlots
                                    ? 'border-slate-800 bg-slate-900 opacity-60'
                                    : selectedCount > 0
                                        ? 'border-green-700 bg-green-950/30'
                                        : 'border-slate-700 bg-slate-800 hover:border-blue-600'
                            )}
                        >
                            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start">
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold">{controller.name}</h4>
                                    <p className="text-sm text-slate-400 break-words">{controller.vendor} • {controller.sku}</p>
                                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                                        <span className="text-slate-300">{controller.constraints.type}</span>
                                        <span className="text-slate-400">PCIe Gen{controller.constraints.pcieGen} x{controller.constraints.pcieLanes}</span>
                                        <span className="text-slate-400">{connectorSummary}</span>
                                    </div>
                                    {limitedBySlots && (
                                        <p className="mt-2 text-xs text-amber-500">
                                            ⚠️ PCIe slots full ({nodeControllers.length}/{maxPcieCards}).
                                        </p>
                                    )}
                                </div>
                                <div className="flex flex-col items-start sm:items-end gap-2 sm:shrink-0">
                                    <div className="flex items-center gap-2">
                                        {controller.msrp !== undefined && (
                                            <span className="text-blue-400 font-semibold">
                                                ${controller.msrp.toLocaleString()}
                                            </span>
                                        )}
                                        <button
                                            onClick={() => handleDeleteController(controller)}
                                            className="p-1 text-red-400 hover:text-red-300"
                                            title="Delete from catalog"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                const idx = nodeControllers.findIndex((selected) => selected.id === controller.id);
                                                if (idx !== -1) removeNodeController(nodeIndex, idx);
                                            }}
                                            disabled={selectedCount === 0}
                                            className={cn(
                                                'px-2 py-1 rounded text-sm',
                                                selectedCount === 0
                                                    ? 'bg-slate-700 cursor-not-allowed'
                                                    : 'bg-red-600 hover:bg-red-700'
                                            )}
                                        >
                                            -
                                        </button>
                                        <span className="w-6 text-center text-sm font-medium">{selectedCount}</span>
                                        <button
                                            onClick={() => handleAddController(controller)}
                                            disabled={limitedBySlots}
                                            className={cn(
                                                'px-2 py-1 rounded text-sm',
                                                limitedBySlots
                                                    ? 'bg-slate-700 cursor-not-allowed'
                                                    : 'bg-blue-600 hover:bg-blue-700'
                                            )}
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {selectedType === 'network' && visibleNetworkAdapters.map((nic) => {
                    const nodeNetworkAdapters = node.networkAdapters ?? [];
                    const selectedCount = nodeNetworkAdapters.filter((adapter) => adapter.id === nic.id).length;
                    const selectedOcpCards = nodeNetworkAdapters.filter((adapter) => adapter.constraints.ocp3Compatible).length;
                    const ocpSlotsAvailable = build.chassis?.constraints.nodes[nodeIndex]?.ocp3Slots ?? 0;
                    const ocpSlotsFull = nic.constraints.ocp3Compatible && selectedOcpCards >= ocpSlotsAvailable;
                    const ocpUnsupported = nic.constraints.ocp3Compatible && ocpSlotsAvailable === 0;
                    const isCompatible = !nic.constraints.ocp3Compatible || !ocpSlotsFull;

                    return (
                        <div
                            key={nic.id}
                            className={cn(
                                'p-4 rounded-lg border transition-all',
                                !isCompatible
                                    ? 'border-slate-800 bg-slate-900 opacity-60'
                                    : selectedCount > 0
                                        ? 'border-green-700 bg-green-950/30'
                                        : 'border-slate-700 bg-slate-800 hover:border-blue-600'
                            )}
                        >
                            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start">
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold">{nic.name}</h4>
                                    <p className="text-sm text-slate-400 break-words">{nic.vendor} • {nic.sku}</p>
                                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                                        {nic.constraints.ports.map((port, idx) => (
                                            <span key={`${nic.id}-port-${idx}`} className="text-slate-400">
                                                {port.count}x {port.connector} {port.speedGbps}GbE
                                            </span>
                                        ))}
                                        {nic.constraints.ocp3Compatible && (
                                            <span className="text-cyan-400">OCP 3.0</span>
                                        )}
                                    </div>
                                    {ocpUnsupported && (
                                        <p className="mt-2 text-xs text-red-400">
                                            ⚠️ Chassis node has no OCP 3.0 slot configured.
                                        </p>
                                    )}
                                    {!ocpUnsupported && ocpSlotsFull && (
                                        <p className="mt-2 text-xs text-amber-500">
                                            ⚠️ OCP 3.0 slots full ({selectedOcpCards}/{ocpSlotsAvailable}).
                                        </p>
                                    )}
                                </div>
                                <div className="flex flex-col items-start sm:items-end gap-2 sm:shrink-0">
                                    <div className="flex items-center gap-2">
                                        {nic.msrp !== undefined && (
                                            <span className="text-blue-400 font-semibold">
                                                ${nic.msrp.toLocaleString()}
                                            </span>
                                        )}
                                        <button
                                            onClick={() => handleDeleteNetworkAdapter(nic)}
                                            className="p-1 text-red-400 hover:text-red-300"
                                            title="Delete from catalog"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                const idx = nodeNetworkAdapters.findIndex((adapter) => adapter.id === nic.id);
                                                if (idx !== -1) removeNodeNetworkAdapter(nodeIndex, idx);
                                            }}
                                            disabled={selectedCount === 0}
                                            className={cn(
                                                'px-2 py-1 rounded text-sm',
                                                selectedCount === 0
                                                    ? 'bg-slate-700 cursor-not-allowed'
                                                    : 'bg-red-600 hover:bg-red-700'
                                            )}
                                        >
                                            -
                                        </button>
                                        <span className="w-6 text-center text-sm font-medium">{selectedCount}</span>
                                        <button
                                            onClick={() => handleAddNetworkAdapter(nic)}
                                            disabled={!isCompatible}
                                            className={cn(
                                                'px-2 py-1 rounded text-sm',
                                                isCompatible
                                                    ? 'bg-blue-600 hover:bg-blue-700'
                                                    : 'bg-slate-700 cursor-not-allowed'
                                            )}
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
