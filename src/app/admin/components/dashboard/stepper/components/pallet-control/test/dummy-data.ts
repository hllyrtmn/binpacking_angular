import { UiPackage } from '../../ui-models/ui-package.model';
import { UiPallet } from '../../ui-models/ui-pallet.model';

export let palletsData: UiPallet[] = [
  {
    name: 'Palet 1',
    dimension: {
      dimension_type: 'string',
      id: 'string',
      width: 300.0,
      height: 12.0,
      depth: 2000.0,
      unit: 'mm',
      volume: 7200000.0
    },
    id: 'string',
    weight: 123,
  },
  {
    name: 'Palet 2',
    dimension: {
      dimension_type: 'Wood',
      id: 'dim-001',
      width: 120.0,
      height: 14.5,
      depth: 1000.0,
      unit: 'mm',
      volume: 1740000.0
    },
    id: 'pallet-001',
    weight: 95,
  },
  {
    name: 'Palet 3',
    dimension: {
      dimension_type: 'Plastic',
      id: 'dim-002',
      width: 80.0,
      height: 16.0,
      depth: 1200.0,
      unit: 'mm',
      volume: 1536000.0
    },
    id: 'pallet-002',
    weight: 70,
  },
];

export const pallet: UiPallet = {
  name: 'Palet 4',
  dimension: {
    dimension_type: 'Metal',
    id: 'dim-003',
    width: 150.0,
    height: 20.0,
    depth: 2200.0,
    unit: 'mm',
    volume: 6600000.0,
  },
  id: 'pallet-003',
  weight: 130,
};

export let packages: UiPackage[] = [
  {
    id: 'Package 1',
    pallet: null,
    products: [],
    totalMeter: 0,
    totalVolume: 0,
    totalWeight: 0,
    order: {
      id: 'string',
      date: '2023-10-01',
      company: {
        id: 'string',
        company_name: 'string',
        country: 'string',
      },
    },
  },
  {
    id: 'Package 2',
    pallet: null,
    products: [],
    totalMeter: 0,
    totalVolume: 0,
    totalWeight: 0,
    order: {
      id: 'order-002',
      date: '2024-02-15',
      company: {
        id: 'comp-002',
        company_name: 'TechLogistics Ltd.',
        country: 'Germany',
      },
    },
  },
];

export const package1: UiPackage = {
  id: 'Package 3',
  pallet: null,
  products: [],
  totalMeter: 0,
  totalVolume: 0,
  totalWeight: 0,
  order: {
    id: 'order-003',
    date: '2024-07-22',
    company: {
      id: 'comp-003',
      company_name: 'Global Freight Co.',
      country: 'Netherlands'
    },
  },
};

export let emptyPackages: UiPackage[] = [
  {
    id: 'Package 1',
    pallet: null,
    products: [],
    totalMeter: 0,
    totalVolume: 0,
    totalWeight: 0,
    order: {
      id: 'string',
      date: '2023-10-01',
      company: {
        id: 'string',
        company_name: 'string',
        country: 'string'
      },
    },
  },]
