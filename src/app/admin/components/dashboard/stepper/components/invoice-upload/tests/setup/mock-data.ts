import { RelationType, CompanyRelation } from "../../../../../../../../models/company-relation.interface";
import { Company } from "../../../../../../../../models/company.interface";
import { Dimension } from "../../../../../../../../models/dimension.interface";
import { OrderDetail } from "../../../../../../../../models/order-detail.interface";
import { Order } from "../../../../../../../../models/order.interface";
import { ProductType } from "../../../../../../../../models/product-type.interface";
import { Product } from "../../../../../../../../models/product.interface";
import { Truck } from "../../../../../../../../models/truck.interface";
import { WeightType } from "../../../../../../../../models/weight-type.interface";


export const MOCK_DATA = {
  // Valid test files
  VALID_EXCEL_FILE: new File(['test content'], 'test.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    lastModified: Date.now()
  }),

  VALID_PDF_FILE: new File(['test content'], 'test.pdf', {
    type: 'application/pdf',
    lastModified: Date.now()
  }),

  // Invalid test files
  INVALID_FILE_TYPE: new File(['test content'], 'test.txt', {
    type: 'text/plain',
    lastModified: Date.now()
  }),

  LARGE_FILE: new File([new ArrayBuffer(11 * 1024 * 1024)], 'large.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    lastModified: Date.now()
  }),

  // Base models
  MOCK_COMPANY: {
    id: 'company-uuid-123',
    company_name: 'Test Company Ltd.',
    country: 'Turkey'
  } as Company,

  MOCK_TARGET_COMPANY: {
    id: 'target-company-uuid-456',
    company_name: 'Target Company Inc.',
    country: 'Germany'
  } as Company,

  // Weight Type
  MOCK_WEIGHT_TYPE: {
    id: 'weight-type-uuid-123',
    company: {
      id: 'company-uuid-123',
      company_name: 'Test Company Ltd.',
      country: 'Turkey'
    },
    std: 15.5,
    eco: 12.0,
    pre: 18.0
  } as WeightType,

  // Dimension
  MOCK_DIMENSION: {
    id: 'dimension-uuid-123',
    company: {
      id: 'company-uuid-123',
      company_name: 'Test Company Ltd.',
      country: 'Turkey'
    },
    width: 120,
    height: 40,
    depth: 80,
    unit: 'cm',
    dimension_type: 'package',
    volume: 384000 // width * height * depth
  } as Dimension,

  // Product Type
  MOCK_PRODUCT_TYPE: {
    id: 'product-type-uuid-123',
    company: {
      id: 'company-uuid-123',
      company_name: 'Test Company Ltd.',
      country: 'Turkey'
    },
    code: 'STD-001',
    type: 'Standard'
  } as ProductType,

  // Product
  MOCK_PRODUCT: {
    id: 'product-uuid-123',
    company: {
      id: 'company-uuid-123',
      company_name: 'Test Company Ltd.',
      country: 'Turkey'
    },
    name: 'Test Product 1',
    product_type: {
      id: 'product-type-uuid-123',
      company: {
        id: 'company-uuid-123',
        company_name: 'Test Company Ltd.',
        country: 'Turkey'
      },
      code: 'STD-001',
      type: 'Standard'
    },
    dimension: {
      id: 'dimension-uuid-123',
      company: {
        id: 'company-uuid-123',
        company_name: 'Test Company Ltd.',
        country: 'Turkey'
      },
      width: 120,
      height: 40,
      depth: 80,
      unit: 'cm',
      dimension_type: 'package',
      volume: 384000
    },
    weight_type: {
      id: 'weight-type-uuid-123',
      company: {
        id: 'company-uuid-123',
        company_name: 'Test Company Ltd.',
        country: 'Turkey'
      },
      std: 15.5,
      eco: 12.0,
      pre: 18.0
    }
  } as Product,

  // Company Relation
  MOCK_COMPANY_RELATION: {
    id: 1,
    source_company: {
      id: 'company-uuid-123',
      company_name: 'Test Company Ltd.',
      country: 'Turkey'
    },
    target_company: {
      id: 'target-company-uuid-456',
      company_name: 'Target Company Inc.',
      country: 'Germany'
    },
    source_company_name: 'Test Company Ltd.',
    target_company_name: 'Target Company Inc.',
    relation_type: RelationType.CUSTOMER,
    is_active: true,
    start_date: new Date('2024-01-01'),
    end_date: null,
    payment_term: 30,
    credit_limit: 100000,
    is_default: false,
    notes: 'Test customer relation',
    extra_data: null,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    created_by: null,
    updated_by: null
  } as CompanyRelation,

  // Truck
  MOCK_TRUCK: {
    id: 'truck-uuid-123',
    company: {
      id: 'company-uuid-123',
      company_name: 'Test Company Ltd.',
      country: 'Turkey'
    },
    name: 'Test Truck Alpha',
    dimension: {
      id: 'truck-dimension-uuid-123',
      company: {
        id: 'company-uuid-123',
        company_name: 'Test Company Ltd.',
        country: 'Turkey'
      },
      width: 240,
      height: 250,
      depth: 1350,
      unit: 'cm',
      dimension_type: 'cargo',
      volume: 81000000 // 81 m³
    },
    weight_limit: 3500 // kg
  } as Truck,

  // Order
  ORDER: {
    id: 'order-uuid-123',
    created_at: new Date('2024-01-15T10:00:00Z'),
    updated_at: new Date('2024-01-15T10:00:00Z'),
    created_by: null,
    updated_by: null,
    deleted_time: null,
    is_deleted: false,
    name: 'Test Order Name',
    date: '2024-01-15T14:30:00', // ISO 8601 string
    company_relation: {
      id: 1,
      source_company: {
        id: 'company-uuid-123',
        company_name: 'Test Company Ltd.',
        country: 'Turkey'
      },
      target_company: {
        id: 'target-company-uuid-456',
        company_name: 'Target Company Inc.',
        country: 'Germany'
      },
      source_company_name: 'Test Company Ltd.',
      target_company_name: 'Target Company Inc.',
      relation_type: RelationType.CUSTOMER,
      is_active: true,
      start_date: new Date('2024-01-01'),
      end_date: null,
      payment_term: 30,
      credit_limit: 100000,
      is_default: false,
      notes: 'Test customer relation',
      extra_data: null,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01'),
      created_by: null,
      updated_by: null
    },
    truck: {
      id: 'truck-uuid-123',
      company: {
        id: 'company-uuid-123',
        company_name: 'Test Company Ltd.',
        country: 'Turkey'
      },
      name: 'Test Truck Alpha',
      dimension: {
        id: 'truck-dimension-uuid-123',
        company: {
          id: 'company-uuid-123',
          company_name: 'Test Company Ltd.',
          country: 'Turkey'
        },
        width: 240,
        height: 250,
        depth: 1350,
        unit: 'cm',
        dimension_type: 'cargo',
        volume: 81000000
      },
      weight_limit: 3500
    },
    weight_type: 'std'
  } as Order,

  // Order details
  ORDER_DETAILS: [
    {
      id: 'order-detail-uuid-1',
      created_at: new Date('2024-01-15T10:00:00Z'),
      updated_at: new Date('2024-01-15T10:00:00Z'),
      created_by: null,
      updated_by: null,
      deleted_time: null,
      is_deleted: false,
      order: null as any, // Will be filled in createMockOrderDetail
      product: {
        id: 'product-uuid-123',
        company: {
          id: 'company-uuid-123',
          company_name: 'Test Company Ltd.',
          country: 'Turkey'
        },
        name: 'Test Product 1',
        product_type: {
          id: 'product-type-uuid-123',
          company: {
            id: 'company-uuid-123',
            company_name: 'Test Company Ltd.',
            country: 'Turkey'
          },
          code: 'STD-001',
          type: 'Standard'
        },
        dimension: {
          id: 'dimension-uuid-123',
          company: {
            id: 'company-uuid-123',
            company_name: 'Test Company Ltd.',
            country: 'Turkey'
          },
          width: 120,
          height: 40,
          depth: 80,
          unit: 'cm',
          dimension_type: 'package',
          volume: 384000
        },
        weight_type: {
          id: 'weight-type-uuid-123',
          company: {
            id: 'company-uuid-123',
            company_name: 'Test Company Ltd.',
            country: 'Turkey'
          },
          std: 15.5,
          eco: 12.0,
          pre: 18.0
        }
      },
      count: 10,
      unit_price: 100.00,
      total_price: 1000.00
    },
    {
      id: 'order-detail-uuid-2',
      created_at: new Date('2024-01-15T10:00:00Z'),
      updated_at: new Date('2024-01-15T10:00:00Z'),
      created_by: null,
      updated_by: null,
      deleted_time: null,
      is_deleted: false,
      order: null as any, // Will be filled in createMockOrderDetail
      product: {
        id: 'product-uuid-456',
        company: {
          id: 'company-uuid-123',
          company_name: 'Test Company Ltd.',
          country: 'Turkey'
        },
        name: 'Test Product 2',
        product_type: {
          id: 'product-type-uuid-456',
          company: {
            id: 'company-uuid-123',
            company_name: 'Test Company Ltd.',
            country: 'Turkey'
          },
          code: 'PRM-002',
          type: 'Premium'
        },
        dimension: {
          id: 'dimension-uuid-456',
          company: {
            id: 'company-uuid-123',
            company_name: 'Test Company Ltd.',
            country: 'Turkey'
          },
          width: 150,
          height: 60,
          depth: 100,
          unit: 'cm',
          dimension_type: 'package',
          volume: 900000
        },
        weight_type: {
          id: 'weight-type-uuid-456',
          company: {
            id: 'company-uuid-123',
            company_name: 'Test Company Ltd.',
            country: 'Turkey'
          },
          std: 25.0,
          eco: 22.0,
          pre: 28.5
        }
      },
      count: 5,
      unit_price: 200.00,
      total_price: 1000.00
    }
  ] as OrderDetail[],

  // Reference data
  TARGET_COMPANIES: [
    {
      id: 1,
      source_company: {
        id: 'company-uuid-123',
        company_name: 'Test Company Ltd.',
        country: 'Turkey'
      },
      target_company: {
        id: 'target-company-uuid-789',
        company_name: 'ABC Corporation',
        country: 'USA'
      },
      source_company_name: 'Test Company Ltd.',
      target_company_name: 'ABC Corporation',
      relation_type: RelationType.CUSTOMER,
      is_active: true,
      start_date: new Date('2024-01-01'),
      payment_term: 30,
      is_default: false
    },
    {
      id: 2,
      source_company: {
        id: 'company-uuid-123',
        company_name: 'Test Company Ltd.',
        country: 'Turkey'
      },
      target_company: {
        id: 'target-company-uuid-012',
        company_name: 'XYZ Industries',
        country: 'France'
      },
      source_company_name: 'Test Company Ltd.',
      target_company_name: 'XYZ Industries',
      relation_type: RelationType.SUPPLIER,
      is_active: true,
      start_date: new Date('2024-01-01'),
      payment_term: 45,
      is_default: true
    }
  ] as CompanyRelation[],

  TRUCKS: [
    {
      id: 'truck-uuid-alpha',
      company: {
        id: 'company-uuid-123',
        company_name: 'Test Company Ltd.',
        country: 'Turkey'
      },
      name: 'Truck Alpha',
      dimension: {
        id: 'truck-dimension-alpha',
        company: {
          id: 'company-uuid-123',
          company_name: 'Test Company Ltd.',
          country: 'Turkey'
        },
        width: 240,
        height: 250,
        depth: 1350,
        unit: 'cm',
        dimension_type: 'cargo',
        volume: 81000000
      },
      weight_limit: 3500
    },
    {
      id: 'truck-uuid-beta',
      company: {
        id: 'company-uuid-123',
        company_name: 'Test Company Ltd.',
        country: 'Turkey'
      },
      name: 'Truck Beta',
      dimension: {
        id: 'truck-dimension-beta',
        company: {
          id: 'company-uuid-123',
          company_name: 'Test Company Ltd.',
          country: 'Turkey'
        },
        width: 250,
        height: 270,
        depth: 1400,
        unit: 'cm',
        dimension_type: 'cargo',
        volume: 94500000
      },
      weight_limit: 5000
    }
  ] as Truck[],

  // API responses
  API_RESPONSES: {
    FILE_PROCESS_SUCCESS: {
      order: {
        id: 'order-uuid-processed',
        created_at: new Date('2024-01-20T10:00:00Z'),
        updated_at: new Date('2024-01-20T10:00:00Z'),
        created_by: null,
        updated_by: null,
        deleted_time: null,
        is_deleted: false,
        name: 'Processed Order',
        date: '2024-01-20T15:00:00',
        company_relation: null as any,
        truck: null as any,
        weight_type: 'std'
      },
      orderDetail: [
        {
          id: 'order-detail-processed-1',
          created_at: new Date('2024-01-20T10:00:00Z'),
          updated_at: new Date('2024-01-20T10:00:00Z'),
          created_by: null,
          updated_by: null,
          deleted_time: null,
          is_deleted: false,
          count: 8,
          unit_price: 150.00,
          total_price: 1200.00,
          product: {
            name: 'Processed Product',
            weight_type: {
              std: 20.0,
              pre: 22.0,
              eco: 18.0
            }
          }
        }
      ]
    },

    BULK_UPDATE_SUCCESS: {
      success: true,
      order_details: [
        {
          id: 'order-detail-updated-1',
          count: 12,
          unit_price: 200.00,
          total_price: 2400.00,
          product: {
            name: 'Updated Product',
            weight_type: {
              std: 30.0,
              pre: 32.0,
              eco: 28.0
            }
          }
        }
      ]
    },

    ORDER_CREATE_SUCCESS: {
      id: 'order-uuid-new-789',
      name: 'Created Order',
      date: new Date().toISOString(),
      status: 'created'
    }
  },

  // Form data
  FORM_VALUES: {
    VALID: {
      fileInput: '',
      orderName: 'Test Order Form',
      orderDate: '2024-01-15T14:30:00',
      companyRelation: 'company-relation-1',
      truck: 'truck-uuid-123',
      weightType: 'std'
    },

    INVALID: {
      fileInput: '',
      orderName: '', // Required field empty
      orderDate: '',
      companyRelation: '',
      truck: '',
      weightType: ''
    }
  },

  // UI States
  UI_STATES: {
    INITIAL: {
      isLoading: false,
      excelUpload: false,
      dataRefreshInProgress: false
    },

    LOADING: {
      isLoading: true,
      excelUpload: false,
      dataRefreshInProgress: false
    },

    EXCEL_UPLOAD: {
      isLoading: true,
      excelUpload: true,
      dataRefreshInProgress: false
    },

    DATA_REFRESH: {
      isLoading: false,
      excelUpload: false,
      dataRefreshInProgress: true
    }
  },

  // Weight calculations
  WEIGHT_CALCULATIONS: {
    SINGLE_DETAIL_STD: 155, // 10 * 15.5
    SINGLE_DETAIL_PRE: 180, // 10 * 18.0
    SINGLE_DETAIL_ECO: 120, // 10 * 12.0

    TOTAL_STD: 280, // (10 * 15.5) + (5 * 25.0)
    TOTAL_PRE: 322.5, // (10 * 18.0) + (5 * 28.5)
    TOTAL_ECO: 230 // (10 * 12.0) + (5 * 22.0)
  }
};

// Helper functions for test data generation
export const createMockOrderDetail = (overrides: Partial<OrderDetail> = {}): OrderDetail => ({
  ...MOCK_DATA.ORDER_DETAILS[0],
  ...overrides
});

export const createMockOrder = (overrides: Partial<Order> = {}): Order => ({
  ...MOCK_DATA.ORDER,
  ...overrides
});

export const createMockTruck = (overrides: Partial<Truck> = {}): Truck => ({
  ...MOCK_DATA.TRUCKS[0],
  ...overrides
});

export const createMockCompanyRelation = (overrides: Partial<CompanyRelation> = {}): CompanyRelation => ({
  ...MOCK_DATA.TARGET_COMPANIES[0],
  ...overrides
});

export const createMockProduct = (overrides: Partial<Product> = {}): Product => ({
  ...MOCK_DATA.MOCK_PRODUCT,
  ...overrides
});

// Edge case data
export const EDGE_CASES = {
  NULL_ORDER: null,
  EMPTY_ORDER_DETAILS: [],
  UNDEFINED_WEIGHT_TYPE: undefined,
  NULL_PRODUCT: {
    id: 'detail-null',
    created_at: new Date(),
    updated_at: new Date(),
    created_by: null,
    updated_by: null,
    deleted_time: null,
    is_deleted: false,
    count: 5,
    unit_price: 0,
    total_price: 0,
    product: null as any,
    order: null as any
  } as OrderDetail,
  ZERO_COUNT: {
    id: 'detail-zero',
    created_at: new Date(),
    updated_at: new Date(),
    created_by: null,
    updated_by: null,
    deleted_time: null,
    is_deleted: false,
    count: 0,
    unit_price: 100,
    total_price: 0,
    product: MOCK_DATA.MOCK_PRODUCT,
    order: MOCK_DATA.ORDER
  } as OrderDetail,
  NEGATIVE_COUNT: {
    id: 'detail-negative',
    created_at: new Date(),
    updated_at: new Date(),
    created_by: null,
    updated_by: null,
    deleted_time: null,
    is_deleted: false,
    count: -5,
    unit_price: 100,
    total_price: -500,
    product: MOCK_DATA.MOCK_PRODUCT,
    order: MOCK_DATA.ORDER
  } as OrderDetail
};

export const createMockEvent = (file: File): Event => {
  const input = document.createElement('input');
  input.type = 'file';

  // Mock files property
  Object.defineProperty(input, 'files', {
    value: [file],
    writable: false,
  });

  const event = new Event('change');
  Object.defineProperty(event, 'target', {
    value: input,
    writable: false,
  });

  return event;
};

// Error scenarios
export const ERROR_SCENARIOS = {
  NETWORK_ERROR: new Error('Network connection failed'),
  VALIDATION_ERROR: { status: 400, message: 'Validation failed' },
  UNAUTHORIZED_ERROR: { status: 401, message: 'Unauthorized' },
  NOT_FOUND_ERROR: { status: 404, message: 'Resource not found' },
  SERVER_ERROR: { status: 500, message: 'Internal server error' }
};
