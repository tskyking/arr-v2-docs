import type {
  ArrMovementsResult,
  ArrTimeseries,
  CustomerCubeResult,
  CustomerDetail,
  CustomerListResult,
  ImportListItem,
  ImportSummary,
  ReviewQueue,
  ReviewStats,
} from './api';

export const DEMO_IMPORT_ID = 'demo-q1-2026';
export const DEMO_TENANT_ID = 'aurora-capital';
export const DEMO_USER_EMAIL = 'analyst@auroracap.com';

export const demoImports: ImportListItem[] = [
  {
    "importId": "demo-q4-2025",
    "importedAt": "2026-02-14T16:42:00.000Z",
    "totalRows": 1042
  },
  {
    "importId": DEMO_IMPORT_ID,
    "importedAt": "2026-04-27T22:30:00.000Z",
    "totalRows": 19
  }
];

export const demoSummary: Record<string, ImportSummary> = {
  [DEMO_IMPORT_ID]: {
  "importId": DEMO_IMPORT_ID,
  "importedAt": "2026-04-27T22:30:00.000Z",
  "totalRows": 19,
  "mappedRows": 19,
  "reviewItems": 0,
  "categoryBreakdown": [
    {
      "category": "Dashboard Subscription",
      "rowCount": 16,
      "totalAmount": 3354399.96
    },
    {
      "category": "Website Hosting / Support Subscription",
      "rowCount": 1,
      "totalAmount": 60000
    },
    {
      "category": "Professional Services",
      "rowCount": 1,
      "totalAmount": 18000
    },
    {
      "category": "Usage Revenue",
      "rowCount": 1,
      "totalAmount": 14700
    }
  ],
  "skippedRows": 0
},
  'demo-q4-2025': {
    importId: 'demo-q4-2025',
    importedAt: '2026-02-14T16:42:00.000Z',
    totalRows: 1042,
    mappedRows: 1009,
    reviewItems: 9,
    skippedRows: 24,
    categoryBreakdown: [
  {
    "category": "Dashboard Subscription",
    "rowCount": 16,
    "totalAmount": 3354399.96
  },
  {
    "category": "Website Hosting / Support Subscription",
    "rowCount": 1,
    "totalAmount": 60000
  },
  {
    "category": "Professional Services",
    "rowCount": 1,
    "totalAmount": 18000
  },
  {
    "category": "Usage Revenue",
    "rowCount": 1,
    "totalAmount": 14700
  }
],
  },
};

export const demoTimeseries: Record<string, ArrTimeseries> = {
  [DEMO_IMPORT_ID]: {
  "periods": [
    {
      "period": "2025-04",
      "asOf": "2025-04-30",
      "totalArr": 709945.0549450549,
      "activeCustomers": 2,
      "byCategory": [
        {
          "category": "Dashboard Subscription",
          "arr": 649780.2197802197
        },
        {
          "category": "Website Hosting / Support Subscription",
          "arr": 60164.83516483517
        }
      ],
      "byCustomer": [
        {
          "customer": "Northstar Health",
          "arr": 397087.9120879121
        },
        {
          "customer": "Apex Retail Group",
          "arr": 312857.14285714284
        }
      ]
    },
    {
      "period": "2025-05",
      "asOf": "2025-05-31",
      "totalArr": 998736.2637362637,
      "activeCustomers": 3,
      "byCategory": [
        {
          "category": "Dashboard Subscription",
          "arr": 938571.4285714285
        },
        {
          "category": "Website Hosting / Support Subscription",
          "arr": 60164.83516483517
        }
      ],
      "byCustomer": [
        {
          "customer": "Northstar Health",
          "arr": 397087.9120879121
        },
        {
          "customer": "Apex Retail Group",
          "arr": 312857.14285714284
        },
        {
          "customer": "Harbor Logistics",
          "arr": 288791.2087912088
        }
      ]
    },
    {
      "period": "2025-06",
      "asOf": "2025-06-30",
      "totalArr": 998736.2637362637,
      "activeCustomers": 3,
      "byCategory": [
        {
          "category": "Dashboard Subscription",
          "arr": 938571.4285714285
        },
        {
          "category": "Website Hosting / Support Subscription",
          "arr": 60164.83516483517
        }
      ],
      "byCustomer": [
        {
          "customer": "Northstar Health",
          "arr": 397087.9120879121
        },
        {
          "customer": "Apex Retail Group",
          "arr": 312857.14285714284
        },
        {
          "customer": "Harbor Logistics",
          "arr": 288791.2087912088
        }
      ]
    },
    {
      "period": "2025-07",
      "asOf": "2025-07-31",
      "totalArr": 998736.2637362637,
      "activeCustomers": 3,
      "byCategory": [
        {
          "category": "Dashboard Subscription",
          "arr": 938571.4285714285
        },
        {
          "category": "Website Hosting / Support Subscription",
          "arr": 60164.83516483517
        }
      ],
      "byCustomer": [
        {
          "customer": "Northstar Health",
          "arr": 397087.9120879121
        },
        {
          "customer": "Apex Retail Group",
          "arr": 312857.14285714284
        },
        {
          "customer": "Harbor Logistics",
          "arr": 288791.2087912088
        }
      ]
    },
    {
      "period": "2025-08",
      "asOf": "2025-08-31",
      "totalArr": 998736.2637362637,
      "activeCustomers": 3,
      "byCategory": [
        {
          "category": "Dashboard Subscription",
          "arr": 938571.4285714285
        },
        {
          "category": "Website Hosting / Support Subscription",
          "arr": 60164.83516483517
        }
      ],
      "byCustomer": [
        {
          "customer": "Northstar Health",
          "arr": 397087.9120879121
        },
        {
          "customer": "Apex Retail Group",
          "arr": 312857.14285714284
        },
        {
          "customer": "Harbor Logistics",
          "arr": 288791.2087912088
        }
      ]
    },
    {
      "period": "2025-09",
      "asOf": "2025-09-30",
      "totalArr": 1275494.5054945056,
      "activeCustomers": 4,
      "byCategory": [
        {
          "category": "Dashboard Subscription",
          "arr": 1215329.6703296704
        },
        {
          "category": "Website Hosting / Support Subscription",
          "arr": 60164.83516483517
        }
      ],
      "byCustomer": [
        {
          "customer": "Northstar Health",
          "arr": 397087.9120879121
        },
        {
          "customer": "Apex Retail Group",
          "arr": 312857.14285714284
        },
        {
          "customer": "Harbor Logistics",
          "arr": 288791.2087912088
        },
        {
          "customer": "Beacon Education",
          "arr": 276758.2417582418
        }
      ]
    },
    {
      "period": "2025-10",
      "asOf": "2025-10-31",
      "totalArr": 1444886.7706878758,
      "activeCustomers": 4,
      "byCategory": [
        {
          "category": "Dashboard Subscription",
          "arr": 1384721.9355230406
        },
        {
          "category": "Website Hosting / Support Subscription",
          "arr": 60164.83516483517
        }
      ],
      "byCustomer": [
        {
          "customer": "Apex Retail Group",
          "arr": 482249.408050513
        },
        {
          "customer": "Northstar Health",
          "arr": 397087.9120879121
        },
        {
          "customer": "Harbor Logistics",
          "arr": 288791.2087912088
        },
        {
          "customer": "Beacon Education",
          "arr": 276758.2417582418
        }
      ]
    },
    {
      "period": "2025-11",
      "asOf": "2025-11-30",
      "totalArr": 1444886.7706878758,
      "activeCustomers": 4,
      "byCategory": [
        {
          "category": "Dashboard Subscription",
          "arr": 1384721.9355230406
        },
        {
          "category": "Website Hosting / Support Subscription",
          "arr": 60164.83516483517
        }
      ],
      "byCustomer": [
        {
          "customer": "Apex Retail Group",
          "arr": 482249.408050513
        },
        {
          "customer": "Northstar Health",
          "arr": 397087.9120879121
        },
        {
          "customer": "Harbor Logistics",
          "arr": 288791.2087912088
        },
        {
          "customer": "Beacon Education",
          "arr": 276758.2417582418
        }
      ]
    },
    {
      "period": "2025-12",
      "asOf": "2025-12-31",
      "totalArr": 1719238.4190395242,
      "activeCustomers": 5,
      "byCategory": [
        {
          "category": "Dashboard Subscription",
          "arr": 1659073.583874689
        },
        {
          "category": "Website Hosting / Support Subscription",
          "arr": 60164.83516483517
        }
      ],
      "byCustomer": [
        {
          "customer": "Apex Retail Group",
          "arr": 482249.408050513
        },
        {
          "customer": "Northstar Health",
          "arr": 397087.9120879121
        },
        {
          "customer": "Harbor Logistics",
          "arr": 288791.2087912088
        },
        {
          "customer": "Beacon Education",
          "arr": 276758.2417582418
        },
        {
          "customer": "Summit Workforce",
          "arr": 274351.64835164836
        }
      ]
    },
    {
      "period": "2026-01",
      "asOf": "2026-01-31",
      "totalArr": 2230639.5179406228,
      "activeCustomers": 7,
      "byCategory": [
        {
          "category": "Dashboard Subscription",
          "arr": 2170474.6827757875
        },
        {
          "category": "Website Hosting / Support Subscription",
          "arr": 60164.83516483517
        }
      ],
      "byCustomer": [
        {
          "customer": "Apex Retail Group",
          "arr": 482249.408050513
        },
        {
          "customer": "Northstar Health",
          "arr": 397087.9120879121
        },
        {
          "customer": "Harbor Logistics",
          "arr": 288791.2087912088
        },
        {
          "customer": "Beacon Education",
          "arr": 276758.2417582418
        },
        {
          "customer": "Summit Workforce",
          "arr": 274351.64835164836
        },
        {
          "customer": "Riverbank Clinics",
          "arr": 258708.7912087912
        },
        {
          "customer": "Blue Harbor Media",
          "arr": 252692.3076923077
        }
      ]
    },
    {
      "period": "2026-02",
      "asOf": "2026-02-28",
      "totalArr": 2680672.48497359,
      "activeCustomers": 9,
      "byCategory": [
        {
          "category": "Dashboard Subscription",
          "arr": 2620507.6498087547
        },
        {
          "category": "Website Hosting / Support Subscription",
          "arr": 60164.83516483517
        }
      ],
      "byCustomer": [
        {
          "customer": "Apex Retail Group",
          "arr": 482249.408050513
        },
        {
          "customer": "Northstar Health",
          "arr": 397087.9120879121
        },
        {
          "customer": "Harbor Logistics",
          "arr": 288791.2087912088
        },
        {
          "customer": "Beacon Education",
          "arr": 276758.2417582418
        },
        {
          "customer": "Summit Workforce",
          "arr": 274351.64835164836
        },
        {
          "customer": "Riverbank Clinics",
          "arr": 258708.7912087912
        },
        {
          "customer": "Blue Harbor Media",
          "arr": 252692.3076923077
        },
        {
          "customer": "Granite Foods",
          "arr": 238252.74725274727
        },
        {
          "customer": "Pioneer Transit",
          "arr": 211780.21978021978
        }
      ]
    },
    {
      "period": "2026-03",
      "asOf": "2026-03-31",
      "totalArr": 3001150.4668417224,
      "activeCustomers": 10,
      "byCategory": [
        {
          "category": "Dashboard Subscription",
          "arr": 2940985.631676887
        },
        {
          "category": "Website Hosting / Support Subscription",
          "arr": 60164.83516483517
        }
      ],
      "byCustomer": [
        {
          "customer": "Apex Retail Group",
          "arr": 560463.6937647987
        },
        {
          "customer": "Northstar Health",
          "arr": 397087.9120879121
        },
        {
          "customer": "Beacon Education",
          "arr": 328901.05879120884
        },
        {
          "customer": "Harbor Logistics",
          "arr": 288791.2087912088
        },
        {
          "customer": "Summit Workforce",
          "arr": 274351.64835164836
        },
        {
          "customer": "Riverbank Clinics",
          "arr": 258708.7912087912
        },
        {
          "customer": "Blue Harbor Media",
          "arr": 252692.3076923077
        },
        {
          "customer": "Granite Foods",
          "arr": 238252.74725274727
        },
        {
          "customer": "Pioneer Transit",
          "arr": 211780.21978021978
        },
        {
          "customer": "Lattice Security",
          "arr": 190120.87912087914
        }
      ]
    },
    {
      "period": "2026-04",
      "asOf": "2026-04-30",
      "totalArr": 2942461.498351649,
      "activeCustomers": 11,
      "byCategory": [
        {
          "category": "Dashboard Subscription",
          "arr": 2942461.498351649
        }
      ],
      "byCustomer": [
        {
          "customer": "Harbor Logistics",
          "arr": 391071.4285714286
        },
        {
          "customer": "Apex Retail Group",
          "arr": 391071.4285714285
        },
        {
          "customer": "Beacon Education",
          "arr": 328901.05879120884
        },
        {
          "customer": "Cascade BioLabs",
          "arr": 294807.6923076923
        },
        {
          "customer": "Summit Workforce",
          "arr": 274351.64835164836
        },
        {
          "customer": "Riverbank Clinics",
          "arr": 258708.7912087912
        },
        {
          "customer": "Blue Harbor Media",
          "arr": 252692.3076923077
        },
        {
          "customer": "Granite Foods",
          "arr": 238252.74725274727
        },
        {
          "customer": "Pioneer Transit",
          "arr": 211780.21978021978
        },
        {
          "customer": "Lattice Security",
          "arr": 190120.87912087914
        },
        {
          "customer": "Northstar Health",
          "arr": 110703.2967032967
        }
      ]
    }
  ],
  "fromDate": "2025-04-01",
  "toDate": "2026-04-30"
},
  'demo-q4-2025': { fromDate: '2025-01-01', toDate: '2025-12-31', periods: [] },
};

export const demoMovements: Record<string, ArrMovementsResult> = {
  [DEMO_IMPORT_ID]: {
  "movements": [
    {
      "period": "2025-04",
      "openingArr": 0,
      "newArr": 709945.0549450549,
      "expansionArr": 0,
      "contractionArr": 0,
      "churnArr": 0,
      "closingArr": 709945.0549450549,
      "netMovement": 709945.0549450549,
      "newCustomers": 2,
      "churnedCustomers": 0,
      "expandedCustomers": 0,
      "contractedCustomers": 0
    },
    {
      "period": "2025-05",
      "openingArr": 709945.0549450549,
      "newArr": 288791.2087912088,
      "expansionArr": 0,
      "contractionArr": 0,
      "churnArr": 0,
      "closingArr": 998736.2637362637,
      "netMovement": 288791.2087912088,
      "newCustomers": 1,
      "churnedCustomers": 0,
      "expandedCustomers": 0,
      "contractedCustomers": 0
    },
    {
      "period": "2025-06",
      "openingArr": 998736.2637362637,
      "newArr": 0,
      "expansionArr": 0,
      "contractionArr": 0,
      "churnArr": 0,
      "closingArr": 998736.2637362637,
      "netMovement": 0,
      "newCustomers": 0,
      "churnedCustomers": 0,
      "expandedCustomers": 0,
      "contractedCustomers": 0
    },
    {
      "period": "2025-07",
      "openingArr": 998736.2637362637,
      "newArr": 0,
      "expansionArr": 0,
      "contractionArr": 0,
      "churnArr": 0,
      "closingArr": 998736.2637362637,
      "netMovement": 0,
      "newCustomers": 0,
      "churnedCustomers": 0,
      "expandedCustomers": 0,
      "contractedCustomers": 0
    },
    {
      "period": "2025-08",
      "openingArr": 998736.2637362637,
      "newArr": 0,
      "expansionArr": 0,
      "contractionArr": 0,
      "churnArr": 0,
      "closingArr": 998736.2637362637,
      "netMovement": 0,
      "newCustomers": 0,
      "churnedCustomers": 0,
      "expandedCustomers": 0,
      "contractedCustomers": 0
    },
    {
      "period": "2025-09",
      "openingArr": 998736.2637362637,
      "newArr": 276758.2417582418,
      "expansionArr": 0,
      "contractionArr": 0,
      "churnArr": 0,
      "closingArr": 1275494.5054945056,
      "netMovement": 276758.2417582418,
      "newCustomers": 1,
      "churnedCustomers": 0,
      "expandedCustomers": 0,
      "contractedCustomers": 0
    },
    {
      "period": "2025-10",
      "openingArr": 1275494.5054945056,
      "newArr": 0,
      "expansionArr": 169392.26519337017,
      "contractionArr": 0,
      "churnArr": 0,
      "closingArr": 1444886.7706878758,
      "netMovement": 169392.26519337017,
      "newCustomers": 0,
      "churnedCustomers": 0,
      "expandedCustomers": 1,
      "contractedCustomers": 0
    },
    {
      "period": "2025-11",
      "openingArr": 1444886.7706878758,
      "newArr": 0,
      "expansionArr": 0,
      "contractionArr": 0,
      "churnArr": 0,
      "closingArr": 1444886.7706878758,
      "netMovement": 0,
      "newCustomers": 0,
      "churnedCustomers": 0,
      "expandedCustomers": 0,
      "contractedCustomers": 0
    },
    {
      "period": "2025-12",
      "openingArr": 1444886.7706878758,
      "newArr": 274351.64835164836,
      "expansionArr": 0,
      "contractionArr": 0,
      "churnArr": 0,
      "closingArr": 1719238.4190395242,
      "netMovement": 274351.64835164836,
      "newCustomers": 1,
      "churnedCustomers": 0,
      "expandedCustomers": 0,
      "contractedCustomers": 0
    },
    {
      "period": "2026-01",
      "openingArr": 1719238.4190395242,
      "newArr": 511401.0989010989,
      "expansionArr": 0,
      "contractionArr": 0,
      "churnArr": 0,
      "closingArr": 2230639.5179406228,
      "netMovement": 511401.0989010989,
      "newCustomers": 2,
      "churnedCustomers": 0,
      "expandedCustomers": 0,
      "contractedCustomers": 0
    },
    {
      "period": "2026-02",
      "openingArr": 2230639.5179406228,
      "newArr": 450032.967032967,
      "expansionArr": 0,
      "contractionArr": 0,
      "churnArr": 0,
      "closingArr": 2680672.48497359,
      "netMovement": 450032.967032967,
      "newCustomers": 2,
      "churnedCustomers": 0,
      "expandedCustomers": 0,
      "contractedCustomers": 0
    },
    {
      "period": "2026-03",
      "openingArr": 2680672.48497359,
      "newArr": 190120.87912087914,
      "expansionArr": 130357.10274725273,
      "contractionArr": 0,
      "churnArr": 0,
      "closingArr": 3001150.4668417224,
      "netMovement": 320477.9818681319,
      "newCustomers": 1,
      "churnedCustomers": 0,
      "expandedCustomers": 2,
      "contractedCustomers": 0
    },
    {
      "period": "2026-04",
      "openingArr": 3001150.4668417224,
      "newArr": 294807.6923076923,
      "expansionArr": 102280.21978021978,
      "contractionArr": 455776.88057798555,
      "churnArr": 0,
      "closingArr": 2942461.498351649,
      "netMovement": -58688.96849007346,
      "newCustomers": 1,
      "churnedCustomers": 0,
      "expandedCustomers": 1,
      "contractedCustomers": 2
    }
  ],
  "fromDate": "2025-04-01",
  "toDate": "2026-04-30",
  "totalNewArr": 2996208.7912087915,
  "totalExpansionArr": 402029.5877208427,
  "totalContractionArr": 455776.88057798555,
  "totalChurnArr": 0,
  "totalNetMovement": 2942461.4983516484
},
  'demo-q4-2025': {
    fromDate: '2025-01-01',
    toDate: '2025-12-31',
    totalNewArr: 0,
    totalExpansionArr: 0,
    totalContractionArr: 0,
    totalChurnArr: 0,
    totalNetMovement: 0,
    movements: [],
  },
};

export const demoReviewQueue: Record<string, ReviewQueue> = {
  [DEMO_IMPORT_ID]: {
  "items": [],
  "total": 0,
  "openCount": 0,
  "resolvedCount": 0
},
  'demo-q4-2025': { items: [], total: 0, openCount: 0, resolvedCount: 0 },
};

export const demoReviewItems = demoReviewQueue[DEMO_IMPORT_ID].items;

export const demoReviewStats: Record<string, ReviewStats> = {
  [DEMO_IMPORT_ID]: {
  "importId": DEMO_IMPORT_ID,
  "total": 0,
  "openCount": 0,
  "resolvedCount": 0,
  "overriddenCount": 0,
  "errorCount": 0,
  "warningCount": 0,
  "openByReasonCode": [],
  "openBySeverity": [],
  "topCustomersWithIssues": [],
  "allResolved": true
},
  'demo-q4-2025': {
    importId: 'demo-q4-2025',
    total: 0,
    openCount: 0,
    resolvedCount: 0,
    overriddenCount: 0,
    errorCount: 0,
    warningCount: 0,
    openByReasonCode: [],
    openBySeverity: [],
    topCustomersWithIssues: [],
    allResolved: true,
  },
};

export const demoCustomers: Record<string, CustomerListResult> = {
  [DEMO_IMPORT_ID]: {
  "customers": [
    {
      "name": "Apex Retail Group",
      "currentArr": 391071.43,
      "activeContracts": 3,
      "lastInvoiceDate": "2026-03-20",
      "requiresReview": false
    },
    {
      "name": "Harbor Logistics",
      "currentArr": 391071.43,
      "activeContracts": 2,
      "lastInvoiceDate": "2026-04-15",
      "requiresReview": false
    },
    {
      "name": "Beacon Education",
      "currentArr": 328901.06,
      "activeContracts": 2,
      "lastInvoiceDate": "2026-03-12",
      "requiresReview": false
    },
    {
      "name": "Cascade BioLabs",
      "currentArr": 294807.69,
      "activeContracts": 1,
      "lastInvoiceDate": "2026-04-01",
      "requiresReview": false
    },
    {
      "name": "Summit Workforce",
      "currentArr": 274351.65,
      "activeContracts": 1,
      "lastInvoiceDate": "2025-12-01",
      "requiresReview": false
    },
    {
      "name": "Riverbank Clinics",
      "currentArr": 258708.79,
      "activeContracts": 1,
      "lastInvoiceDate": "2026-01-01",
      "requiresReview": false
    },
    {
      "name": "Blue Harbor Media",
      "currentArr": 252692.31,
      "activeContracts": 1,
      "lastInvoiceDate": "2026-01-15",
      "requiresReview": false
    },
    {
      "name": "Granite Foods",
      "currentArr": 238252.75,
      "activeContracts": 1,
      "lastInvoiceDate": "2026-02-01",
      "requiresReview": false
    },
    {
      "name": "Pioneer Transit",
      "currentArr": 211780.22,
      "activeContracts": 1,
      "lastInvoiceDate": "2026-02-15",
      "requiresReview": false
    },
    {
      "name": "Lattice Security",
      "currentArr": 190120.88,
      "activeContracts": 1,
      "lastInvoiceDate": "2026-03-01",
      "requiresReview": false
    },
    {
      "name": "Northstar Health",
      "currentArr": 110703.3,
      "activeContracts": 3,
      "lastInvoiceDate": "2026-04-20",
      "requiresReview": false
    }
  ],
  "total": 11
},
  'demo-q4-2025': { total: 0, customers: [] },
};

export const demoCustomerDetails: Record<string, Record<string, CustomerDetail>> = {
  [DEMO_IMPORT_ID]: {
  "Apex Retail Group": {
    "name": "Apex Retail Group",
    "currentArr": 391071.43,
    "peakArr": 560463.69,
    "firstSeenPeriod": "2025-04",
    "lastActivePeriod": "2026-04",
    "arrHistory": [
      {
        "period": "2025-04",
        "arr": 312857.14
      },
      {
        "period": "2025-05",
        "arr": 312857.14
      },
      {
        "period": "2025-06",
        "arr": 312857.14
      },
      {
        "period": "2025-07",
        "arr": 312857.14
      },
      {
        "period": "2025-08",
        "arr": 312857.14
      },
      {
        "period": "2025-09",
        "arr": 312857.14
      },
      {
        "period": "2025-10",
        "arr": 482249.41
      },
      {
        "period": "2025-11",
        "arr": 482249.41
      },
      {
        "period": "2025-12",
        "arr": 482249.41
      },
      {
        "period": "2026-01",
        "arr": 482249.41
      },
      {
        "period": "2026-02",
        "arr": 482249.41
      },
      {
        "period": "2026-03",
        "arr": 560463.69
      },
      {
        "period": "2026-04",
        "arr": 391071.43
      }
    ],
    "requiresReview": false,
    "openReviewCount": 0
  },
  "Harbor Logistics": {
    "name": "Harbor Logistics",
    "currentArr": 391071.43,
    "peakArr": 391071.43,
    "firstSeenPeriod": "2025-05",
    "lastActivePeriod": "2026-04",
    "arrHistory": [
      {
        "period": "2025-05",
        "arr": 288791.21
      },
      {
        "period": "2025-06",
        "arr": 288791.21
      },
      {
        "period": "2025-07",
        "arr": 288791.21
      },
      {
        "period": "2025-08",
        "arr": 288791.21
      },
      {
        "period": "2025-09",
        "arr": 288791.21
      },
      {
        "period": "2025-10",
        "arr": 288791.21
      },
      {
        "period": "2025-11",
        "arr": 288791.21
      },
      {
        "period": "2025-12",
        "arr": 288791.21
      },
      {
        "period": "2026-01",
        "arr": 288791.21
      },
      {
        "period": "2026-02",
        "arr": 288791.21
      },
      {
        "period": "2026-03",
        "arr": 288791.21
      },
      {
        "period": "2026-04",
        "arr": 391071.43
      }
    ],
    "requiresReview": false,
    "openReviewCount": 0
  },
  "Beacon Education": {
    "name": "Beacon Education",
    "currentArr": 328901.06,
    "peakArr": 328901.06,
    "firstSeenPeriod": "2025-09",
    "lastActivePeriod": "2026-04",
    "arrHistory": [
      {
        "period": "2025-09",
        "arr": 276758.24
      },
      {
        "period": "2025-10",
        "arr": 276758.24
      },
      {
        "period": "2025-11",
        "arr": 276758.24
      },
      {
        "period": "2025-12",
        "arr": 276758.24
      },
      {
        "period": "2026-01",
        "arr": 276758.24
      },
      {
        "period": "2026-02",
        "arr": 276758.24
      },
      {
        "period": "2026-03",
        "arr": 328901.06
      },
      {
        "period": "2026-04",
        "arr": 328901.06
      }
    ],
    "requiresReview": false,
    "openReviewCount": 0
  },
  "Cascade BioLabs": {
    "name": "Cascade BioLabs",
    "currentArr": 294807.69,
    "peakArr": 294807.69,
    "firstSeenPeriod": "2026-04",
    "lastActivePeriod": "2026-04",
    "arrHistory": [
      {
        "period": "2026-04",
        "arr": 294807.69
      }
    ],
    "requiresReview": false,
    "openReviewCount": 0
  },
  "Summit Workforce": {
    "name": "Summit Workforce",
    "currentArr": 274351.65,
    "peakArr": 274351.65,
    "firstSeenPeriod": "2025-12",
    "lastActivePeriod": "2026-04",
    "arrHistory": [
      {
        "period": "2025-12",
        "arr": 274351.65
      },
      {
        "period": "2026-01",
        "arr": 274351.65
      },
      {
        "period": "2026-02",
        "arr": 274351.65
      },
      {
        "period": "2026-03",
        "arr": 274351.65
      },
      {
        "period": "2026-04",
        "arr": 274351.65
      }
    ],
    "requiresReview": false,
    "openReviewCount": 0
  },
  "Riverbank Clinics": {
    "name": "Riverbank Clinics",
    "currentArr": 258708.79,
    "peakArr": 258708.79,
    "firstSeenPeriod": "2026-01",
    "lastActivePeriod": "2026-04",
    "arrHistory": [
      {
        "period": "2026-01",
        "arr": 258708.79
      },
      {
        "period": "2026-02",
        "arr": 258708.79
      },
      {
        "period": "2026-03",
        "arr": 258708.79
      },
      {
        "period": "2026-04",
        "arr": 258708.79
      }
    ],
    "requiresReview": false,
    "openReviewCount": 0
  },
  "Blue Harbor Media": {
    "name": "Blue Harbor Media",
    "currentArr": 252692.31,
    "peakArr": 252692.31,
    "firstSeenPeriod": "2026-01",
    "lastActivePeriod": "2026-04",
    "arrHistory": [
      {
        "period": "2026-01",
        "arr": 252692.31
      },
      {
        "period": "2026-02",
        "arr": 252692.31
      },
      {
        "period": "2026-03",
        "arr": 252692.31
      },
      {
        "period": "2026-04",
        "arr": 252692.31
      }
    ],
    "requiresReview": false,
    "openReviewCount": 0
  },
  "Granite Foods": {
    "name": "Granite Foods",
    "currentArr": 238252.75,
    "peakArr": 238252.75,
    "firstSeenPeriod": "2026-02",
    "lastActivePeriod": "2026-04",
    "arrHistory": [
      {
        "period": "2026-02",
        "arr": 238252.75
      },
      {
        "period": "2026-03",
        "arr": 238252.75
      },
      {
        "period": "2026-04",
        "arr": 238252.75
      }
    ],
    "requiresReview": false,
    "openReviewCount": 0
  },
  "Pioneer Transit": {
    "name": "Pioneer Transit",
    "currentArr": 211780.22,
    "peakArr": 211780.22,
    "firstSeenPeriod": "2026-02",
    "lastActivePeriod": "2026-04",
    "arrHistory": [
      {
        "period": "2026-02",
        "arr": 211780.22
      },
      {
        "period": "2026-03",
        "arr": 211780.22
      },
      {
        "period": "2026-04",
        "arr": 211780.22
      }
    ],
    "requiresReview": false,
    "openReviewCount": 0
  },
  "Lattice Security": {
    "name": "Lattice Security",
    "currentArr": 190120.88,
    "peakArr": 190120.88,
    "firstSeenPeriod": "2026-03",
    "lastActivePeriod": "2026-04",
    "arrHistory": [
      {
        "period": "2026-03",
        "arr": 190120.88
      },
      {
        "period": "2026-04",
        "arr": 190120.88
      }
    ],
    "requiresReview": false,
    "openReviewCount": 0
  },
  "Northstar Health": {
    "name": "Northstar Health",
    "currentArr": 110703.3,
    "peakArr": 397087.91,
    "firstSeenPeriod": "2025-04",
    "lastActivePeriod": "2026-04",
    "arrHistory": [
      {
        "period": "2025-04",
        "arr": 397087.91
      },
      {
        "period": "2025-05",
        "arr": 397087.91
      },
      {
        "period": "2025-06",
        "arr": 397087.91
      },
      {
        "period": "2025-07",
        "arr": 397087.91
      },
      {
        "period": "2025-08",
        "arr": 397087.91
      },
      {
        "period": "2025-09",
        "arr": 397087.91
      },
      {
        "period": "2025-10",
        "arr": 397087.91
      },
      {
        "period": "2025-11",
        "arr": 397087.91
      },
      {
        "period": "2025-12",
        "arr": 397087.91
      },
      {
        "period": "2026-01",
        "arr": 397087.91
      },
      {
        "period": "2026-02",
        "arr": 397087.91
      },
      {
        "period": "2026-03",
        "arr": 397087.91
      },
      {
        "period": "2026-04",
        "arr": 110703.3
      }
    ],
    "requiresReview": false,
    "openReviewCount": 0
  }
},
};

export const demoCustomerCube: CustomerCubeResult = {
  "importId": DEMO_IMPORT_ID,
  "fromDate": "2026-01-01",
  "toDate": "2026-04-30",
  "periods": [
    "2026-01",
    "2026-02",
    "2026-03",
    "2026-04"
  ],
  "summary": {
    "trackedCustomers": 11,
    "trackedRows": 17,
    "trackedProductServices": 17,
    "openingArr": 2230639.53,
    "closingArr": 2942461.51,
    "netChange": 711821.98
  },
  "rows": [
    {
      "customerName": "Apex Retail Group",
      "productService": "Retail Insights Platform",
      "category": "Dashboard Subscription",
      "sourceInvoiceNumbers": [
        "INV-1002"
      ],
      "sourceRowNumbers": [
        4
      ],
      "periods": [
        {
          "period": "2026-01",
          "arr": 312857.14
        },
        {
          "period": "2026-02",
          "arr": 312857.14
        },
        {
          "period": "2026-03",
          "arr": 312857.14
        },
        {
          "period": "2026-04",
          "arr": 312857.14
        }
      ],
      "openingArr": 312857.14,
      "closingArr": 312857.14,
      "netChange": 0,
      "movement": "Flat",
      "requiresReview": false
    },
    {
      "customerName": "Cascade BioLabs",
      "productService": "Life Sciences Analytics Cloud",
      "category": "Dashboard Subscription",
      "sourceInvoiceNumbers": [
        "INV-1320"
      ],
      "sourceRowNumbers": [
        18
      ],
      "periods": [
        {
          "period": "2026-01",
          "arr": 0
        },
        {
          "period": "2026-02",
          "arr": 0
        },
        {
          "period": "2026-03",
          "arr": 0
        },
        {
          "period": "2026-04",
          "arr": 294807.69
        }
      ],
      "openingArr": 0,
      "closingArr": 294807.69,
      "netChange": 294807.69,
      "movement": "New",
      "requiresReview": false
    },
    {
      "customerName": "Harbor Logistics",
      "productService": "Logistics Control Tower",
      "category": "Dashboard Subscription",
      "sourceInvoiceNumbers": [
        "INV-1017"
      ],
      "sourceRowNumbers": [
        6
      ],
      "periods": [
        {
          "period": "2026-01",
          "arr": 288791.21
        },
        {
          "period": "2026-02",
          "arr": 288791.21
        },
        {
          "period": "2026-03",
          "arr": 288791.21
        },
        {
          "period": "2026-04",
          "arr": 288791.21
        }
      ],
      "openingArr": 288791.21,
      "closingArr": 288791.21,
      "netChange": 0,
      "movement": "Flat",
      "requiresReview": false
    },
    {
      "customerName": "Beacon Education",
      "productService": "Campus Insights Suite",
      "category": "Dashboard Subscription",
      "sourceInvoiceNumbers": [
        "INV-1124"
      ],
      "sourceRowNumbers": [
        7
      ],
      "periods": [
        {
          "period": "2026-01",
          "arr": 276758.24
        },
        {
          "period": "2026-02",
          "arr": 276758.24
        },
        {
          "period": "2026-03",
          "arr": 276758.24
        },
        {
          "period": "2026-04",
          "arr": 276758.24
        }
      ],
      "openingArr": 276758.24,
      "closingArr": 276758.24,
      "netChange": 0,
      "movement": "Flat",
      "requiresReview": false
    },
    {
      "customerName": "Summit Workforce",
      "productService": "Workforce Planning Cloud",
      "category": "Dashboard Subscription",
      "sourceInvoiceNumbers": [
        "INV-1198"
      ],
      "sourceRowNumbers": [
        9
      ],
      "periods": [
        {
          "period": "2026-01",
          "arr": 274351.65
        },
        {
          "period": "2026-02",
          "arr": 274351.65
        },
        {
          "period": "2026-03",
          "arr": 274351.65
        },
        {
          "period": "2026-04",
          "arr": 274351.65
        }
      ],
      "openingArr": 274351.65,
      "closingArr": 274351.65,
      "netChange": 0,
      "movement": "Flat",
      "requiresReview": false
    },
    {
      "customerName": "Riverbank Clinics",
      "productService": "Clinic Performance Suite",
      "category": "Dashboard Subscription",
      "sourceInvoiceNumbers": [
        "INV-1211"
      ],
      "sourceRowNumbers": [
        10
      ],
      "periods": [
        {
          "period": "2026-01",
          "arr": 258708.79
        },
        {
          "period": "2026-02",
          "arr": 258708.79
        },
        {
          "period": "2026-03",
          "arr": 258708.79
        },
        {
          "period": "2026-04",
          "arr": 258708.79
        }
      ],
      "openingArr": 258708.79,
      "closingArr": 258708.79,
      "netChange": 0,
      "movement": "Flat",
      "requiresReview": false
    },
    {
      "customerName": "Blue Harbor Media",
      "productService": "Audience Intelligence Suite",
      "category": "Dashboard Subscription",
      "sourceInvoiceNumbers": [
        "INV-1220"
      ],
      "sourceRowNumbers": [
        11
      ],
      "periods": [
        {
          "period": "2026-01",
          "arr": 252692.31
        },
        {
          "period": "2026-02",
          "arr": 252692.31
        },
        {
          "period": "2026-03",
          "arr": 252692.31
        },
        {
          "period": "2026-04",
          "arr": 252692.31
        }
      ],
      "openingArr": 252692.31,
      "closingArr": 252692.31,
      "netChange": 0,
      "movement": "Flat",
      "requiresReview": false
    },
    {
      "customerName": "Granite Foods",
      "productService": "Supply Chain Visibility",
      "category": "Dashboard Subscription",
      "sourceInvoiceNumbers": [
        "INV-1249"
      ],
      "sourceRowNumbers": [
        12
      ],
      "periods": [
        {
          "period": "2026-01",
          "arr": 0
        },
        {
          "period": "2026-02",
          "arr": 238252.75
        },
        {
          "period": "2026-03",
          "arr": 238252.75
        },
        {
          "period": "2026-04",
          "arr": 238252.75
        }
      ],
      "openingArr": 0,
      "closingArr": 238252.75,
      "netChange": 238252.75,
      "movement": "New",
      "requiresReview": false
    },
    {
      "customerName": "Pioneer Transit",
      "productService": "Transit Operations Cloud",
      "category": "Dashboard Subscription",
      "sourceInvoiceNumbers": [
        "INV-1268"
      ],
      "sourceRowNumbers": [
        13
      ],
      "periods": [
        {
          "period": "2026-01",
          "arr": 0
        },
        {
          "period": "2026-02",
          "arr": 211780.22
        },
        {
          "period": "2026-03",
          "arr": 211780.22
        },
        {
          "period": "2026-04",
          "arr": 211780.22
        }
      ],
      "openingArr": 0,
      "closingArr": 211780.22,
      "netChange": 211780.22,
      "movement": "New",
      "requiresReview": false
    },
    {
      "customerName": "Lattice Security",
      "productService": "Threat Response Analytics",
      "category": "Dashboard Subscription",
      "sourceInvoiceNumbers": [
        "INV-1288"
      ],
      "sourceRowNumbers": [
        14
      ],
      "periods": [
        {
          "period": "2026-01",
          "arr": 0
        },
        {
          "period": "2026-02",
          "arr": 0
        },
        {
          "period": "2026-03",
          "arr": 190120.88
        },
        {
          "period": "2026-04",
          "arr": 190120.88
        }
      ],
      "openingArr": 0,
      "closingArr": 190120.88,
      "netChange": 190120.88,
      "movement": "New",
      "requiresReview": false
    },
    {
      "customerName": "Northstar Health",
      "productService": "Care Quality Benchmarking",
      "category": "Dashboard Subscription",
      "sourceInvoiceNumbers": [
        "INV-1331"
      ],
      "sourceRowNumbers": [
        20
      ],
      "periods": [
        {
          "period": "2026-01",
          "arr": 0
        },
        {
          "period": "2026-02",
          "arr": 0
        },
        {
          "period": "2026-03",
          "arr": 0
        },
        {
          "period": "2026-04",
          "arr": 110703.3
        }
      ],
      "openingArr": 0,
      "closingArr": 110703.3,
      "netChange": 110703.3,
      "movement": "New",
      "requiresReview": false
    },
    {
      "customerName": "Harbor Logistics",
      "productService": "Route Optimization Add-On",
      "category": "Dashboard Subscription",
      "sourceInvoiceNumbers": [
        "INV-1327"
      ],
      "sourceRowNumbers": [
        19
      ],
      "periods": [
        {
          "period": "2026-01",
          "arr": 0
        },
        {
          "period": "2026-02",
          "arr": 0
        },
        {
          "period": "2026-03",
          "arr": 0
        },
        {
          "period": "2026-04",
          "arr": 102280.22
        }
      ],
      "openingArr": 0,
      "closingArr": 102280.22,
      "netChange": 102280.22,
      "movement": "New",
      "requiresReview": false
    },
    {
      "customerName": "Apex Retail Group",
      "productService": "Advanced Benchmarking Add-On",
      "category": "Dashboard Subscription",
      "sourceInvoiceNumbers": [
        "INV-1304"
      ],
      "sourceRowNumbers": [
        17
      ],
      "periods": [
        {
          "period": "2026-01",
          "arr": 0
        },
        {
          "period": "2026-02",
          "arr": 0
        },
        {
          "period": "2026-03",
          "arr": 78214.29
        },
        {
          "period": "2026-04",
          "arr": 78214.29
        }
      ],
      "openingArr": 0,
      "closingArr": 78214.29,
      "netChange": 78214.29,
      "movement": "New",
      "requiresReview": false
    },
    {
      "customerName": "Beacon Education",
      "productService": "Student Retention Add-On",
      "category": "Dashboard Subscription",
      "sourceInvoiceNumbers": [
        "INV-1292"
      ],
      "sourceRowNumbers": [
        8
      ],
      "periods": [
        {
          "period": "2026-01",
          "arr": 0
        },
        {
          "period": "2026-02",
          "arr": 0
        },
        {
          "period": "2026-03",
          "arr": 52142.82
        },
        {
          "period": "2026-04",
          "arr": 52142.82
        }
      ],
      "openingArr": 0,
      "closingArr": 52142.82,
      "netChange": 52142.82,
      "movement": "New",
      "requiresReview": false
    },
    {
      "customerName": "Apex Retail Group",
      "productService": "AI Forecasting Module",
      "category": "Dashboard Subscription",
      "sourceInvoiceNumbers": [
        "INV-1088"
      ],
      "sourceRowNumbers": [
        5
      ],
      "periods": [
        {
          "period": "2026-01",
          "arr": 169392.27
        },
        {
          "period": "2026-02",
          "arr": 169392.27
        },
        {
          "period": "2026-03",
          "arr": 169392.27
        },
        {
          "period": "2026-04",
          "arr": 0
        }
      ],
      "openingArr": 169392.27,
      "closingArr": 0,
      "netChange": -169392.27,
      "movement": "Churn",
      "requiresReview": false
    },
    {
      "customerName": "Northstar Health",
      "productService": "Enterprise Analytics Platform",
      "category": "Dashboard Subscription",
      "sourceInvoiceNumbers": [
        "INV-1001"
      ],
      "sourceRowNumbers": [
        2
      ],
      "periods": [
        {
          "period": "2026-01",
          "arr": 336923.08
        },
        {
          "period": "2026-02",
          "arr": 336923.08
        },
        {
          "period": "2026-03",
          "arr": 336923.08
        },
        {
          "period": "2026-04",
          "arr": 0
        }
      ],
      "openingArr": 336923.08,
      "closingArr": 0,
      "netChange": -336923.08,
      "movement": "Churn",
      "requiresReview": false
    },
    {
      "customerName": "Northstar Health",
      "productService": "Premium Support Subscription",
      "category": "Website Hosting / Support Subscription",
      "sourceInvoiceNumbers": [
        "INV-1001"
      ],
      "sourceRowNumbers": [
        3
      ],
      "periods": [
        {
          "period": "2026-01",
          "arr": 60164.84
        },
        {
          "period": "2026-02",
          "arr": 60164.84
        },
        {
          "period": "2026-03",
          "arr": 60164.84
        },
        {
          "period": "2026-04",
          "arr": 0
        }
      ],
      "openingArr": 60164.84,
      "closingArr": 0,
      "netChange": -60164.84,
      "movement": "Churn",
      "requiresReview": false
    }
  ]
};

export function isStaticDemoEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.endsWith('github.io') || window.location.search.includes('demo=1');
}

export function isDemoImportId(importId?: string): boolean {
  return !!importId && importId.startsWith('demo-');
}

export function getDemoCustomerDetail(importId: string, customerName: string): CustomerDetail {
  const detail = demoCustomerDetails[importId]?.[customerName];
  if (detail) return detail;

  const customer = demoCustomers[importId]?.customers.find(entry => entry.name === customerName);
  return {
    name: customerName,
    currentArr: customer?.currentArr ?? 0,
    peakArr: customer?.currentArr ?? 0,
    firstSeenPeriod: '',
    lastActivePeriod: '',
    arrHistory: demoTimeseries[importId]?.periods
      .map(period => ({
        period: period.period,
        arr: period.byCustomer.find(entry => entry.customer === customerName)?.arr ?? 0,
      }))
      .filter(period => period.arr > 0) ?? [],
    requiresReview: customer?.requiresReview ?? false,
    openReviewCount: demoReviewItems.filter(item => item.customerName === customerName && item.status === 'open').length,
  };
}
