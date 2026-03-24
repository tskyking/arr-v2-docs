import {
  ADMIN_UPLOADED_CSV_FILES_FAILURE,
  ADMIN_UPLOADED_CSV_FILES_REQUEST,
  ADMIN_UPLOADED_CSV_FILES_SUCCESS,
  CLIENT_PRODUCTS_SERVICE_GET_SUCCESS,
  CLIENT_PRODUCTS_SERVICE_GET_FAILURE,
  CLIENT_PRODUCTS_SERVICE_GET_REQUEST,
  CLIENT_GET_LIST_PRODUCT_SERVICE_NAME_SUCCESS,
  CLIENT_GET_LIST_PRODUCT_SERVICE_NAME_REQUEST,
  CLIENT_GET_LIST_PRODUCT_SERVICE_NAME_FAILURE,
  CLIENT_GET_LIST_PRODUCT_SERVICE_TYPE_SUCCESS,
  CLIENT_GET_LIST_PRODUCT_SERVICE_TYPE_REQUEST,
  CLIENT_GET_LIST_PRODUCT_SERVICE_TYPE_FAILURE,
  CLIENT_GET_LIST_REVENUE_RECOGNITION_SUCCESS,
  CLIENT_GET_LIST_REVENUE_RECOGNITION_REQUEST,
  CLIENT_GET_LIST_REVENUE_RECOGNITION_FAILURE,
  CLIENT_ADD_PRODUCT_SERVICE_SUCCESS,
  CLIENT_ADD_PRODUCT_SERVICE_REQUEST,
  CLIENT_ADD_PRODUCT_SERVICE_FAILURE,
  CLIENT_PRODUCTS_SERVICE_GET_BY_ID_SUCCESS,
  CLIENT_PRODUCTS_SERVICE_GET_BY_ID_FAILURE,
  CLIENT_PRODUCTS_SERVICE_GET_BY_ID_REQUEST,
  CLIENT_ADD_CONTEACT_POST_SUCCESS,
  CLIENT_ADD_CONTEACT_POST_REQUEST,
  CLIENT_ADD_CONTEACT_POST_FAILURE,
  CLINET_SH0W_CSV_FILES_SUCCESS,
  CLINET_SH0W_CSV_FILES_FAILURE,
  CLINET_SH0W_CSV_FILES_REQUEST,
  CLINET_SH0W_CSV_FILES_RESET,
  CLIENT_SHOW_CONTRACT_DATABASE_SUCCESS,
  CLIENT_SHOW_CONTRACT_DATABASE_REQUEST,
  CLIENT_SHOW_CONTRACT_DATABASE_FAILURE,
  CLIENT_SHOW_CONTRACT_DATABASE_WITHOUT_PAGE_SUCCESS,
  CLIENT_SHOW_CONTRACT_DATABASE_WITHOUT_PAGE_REQUEST,
  CLIENT_SHOW_CONTRACT_DATABASE_WITHOUT_PAGE_FAILURE,
  CLIENT_SHOW_CONTRACT_SCREEN_SUCCESS,
  CLIENT_SHOW_CONTRACT_SCREEN_REQUEST,
  CLIENT_SHOW_CONTRACT_SCREEN_FAILURE,
  CLIENT_ARR_VIEW_LIST_SUCCESS,
  CLIENT_ARR_VIEW_LIST_FAILURE,
  CLIENT_ARR_VIEW_LIST_REQUEST,
  PRODUCT_DELETE_SUCCESS,
  PRODUCT_DELETE_FAILURE,
  PRODUCT_DELETE_REQUEST,
  PRODUCT_UPDATE_SUCCESS,
  PRODUCT_UPDATE_FAILURE,
  PRODUCT_UPDATE_REQUEST,
  PRODUCT_ADD_SUCCESS,
  PRODUCT_ADD_FAILURE,
  PRODUCT_ADD_REQUEST,
  CONTRACT_UPDATE_SUCCESS,
  CONTRACT_UPDATE_FAILURE,
  CONTRACT_UPDATE_REQUEST,
  INVOICE_LIST_SUCCESS,
  INVOICE_LIST_FAILURE,
  INVOICE_LIST_REQUEST,
  INVOICE_CUSTOMER_LIST_SUCCESS,
  INVOICE_CUSTOMER_LIST_FAILURE,
  INVOICE_CUSTOMER_LIST_REQUEST,
  ARR_LIST_SUCCESS,
  ARR_LIST_FAILURE,
  ARR_LIST_REQUEST,
  USER_LIST_SUCCESS,
  USER_LIST_FAILURE,
  USER_LIST_REQUEST,
  USER_DELETE_SUCCESS,
  USER_DELETE_FAILURE,
  USER_DELETE_REQUEST,
  USER_UPDATE_SUCCESS,
  USER_UPDATE_FAILURE,
  USER_UPDATE_REQUEST,
  USER_LISTID_SUCCESS,
  USER_LISTID_FAILURE,
  USER_LISTID_REQUEST,
  USER_ADD_SUCCESS,
  USER_ADD_FAILURE,
  USER_ADD_REQUEST,
  ClosedPeriod_LIST_SUCCESS,
  ClosedPeriod_LIST_FAILURE,
  ClosedPeriod_LIST_REQUEST,
  ClosedPeriod_ADD_SUCCESS,
  ClosedPeriod_ADD_FAILURE,
  ClosedPeriod_ADD_REQUEST,
  ClosedPeriod_UPDATE_SUCCESS,
  ClosedPeriod_UPDATE_FAILURE,
  ClosedPeriod_UPDATE_REQUEST,
  LIFE_LIST_SUCCESS,
  LIFE_LIST_FAILURE,
  LIFE_LIST_REQUEST,
  LIFE_UPDATE_SUCCESS,
  LIFE_UPDATE_FAILURE,
  LIFE_UPDATE_REQUEST,
  QUICKBOOK_LIST_SUCCESS,
  QUICKBOOK_LIST_FAILURE,
  QUICKBOOK_LIST_REQUEST,
  CLIENTARR_LIST_SUCCESS,
  CLIENTARR_LIST_FAILURE,
  CLIENTARR_LIST_REQUEST,
  ARRGRACE_LIST_SUCCESS,
  ARRGRACE_LIST_FAILURE,
  ARRGRACE_LIST_REQUEST,
  ARRGRACE_POST_SUCCESS,
  ARRGRACE_POST_FAILURE,
  ARRGRACE_POST_REQUEST,
  DATEFILTER_GET_SUCCESS,
  DATEFILTER_GET_FAILURE,
  DATEFILTER_GET_REQUEST,
  CLIENT_ADDCONTRACT_PRODUCTS_SERVICE_GET_SUCCESS,
  CLIENT_ADDCONTRACT_PRODUCTS_SERVICE_GET_FAILURE,
  CLIENT_ADDCONTRACT_PRODUCTS_SERVICE_GET_REQUEST,
  CONTRACT_DATABASE_GET_FILTER_DATA_SUCCESS,
  CONTRACT_DATABASE_GET_FILTER_DATA_REQUEST,
  CONTRACT_DATABASE_GET_FILTER_DATA_FAILURE,
  INVOICE_LIST_CSV_SUCCESS,
  INVOICE_LIST_CSV_FAILURE,
  INVOICE_LIST_CSV_REQUEST,
  INVOICE_LIST_EXCEL_SUCCESS,
  INVOICE_LIST_EXCEL_FAILURE,
  INVOICE_LIST_EXCEL_REQUEST,
  CLIENT_SHOW_CONTRACT_CSV_DATABASE_SUCCESS,
  CLIENT_SHOW_CONTRACT_CSV_DATABASE_REQUEST,
  CLIENT_SHOW_CONTRACT_CSV_DATABASE_FAILURE,
  GET_CUSTOMER_NAME_TABLE_TOTAL_REQUEST,
  GET_CUSTOMER_NAME_TABLE_TOTAL_SUCCESS,
  GET_CUSTOMER_NAME_TABLE_TOTAL_FAIL,
  GET_CUSTOMER_TABLE_TOTAL_FILTER_REQUEST,
  GET_CUSTOMER_TABLE_TOTAL_FILTER_SUCCESS,
  GET_CUSTOMER_TABLE_TOTAL_FILTER_FAILURE,
    CLIENT_SEARCH_SUCCESS,
  CLIENT_SEARCH_FAILURE,
  CLIENT_SEARCH_REQUEST,
  CLIENT_ARRSEARCH_SUCCESS,
  CLIENT_ARRSEARCH_FAILURE,
  CLIENT_ARRSEARCH_REQUEST,
  CONTRACT_SEARCH_SUCCESS,
  CONTRACT_SEARCH_FAILURE,
  CONTRACT_SEARCH_REQUEST,
  CONTRACTSCREEN_UPDATE_SUCCESS,
  CONTRACTSCREEN_UPDATE_FAILURE,
  CONTRACTSCREEN_UPDATE_REQUEST,
  PENDING_TABLE_SUCCESS,
  PENDING_TABLE_FAILURE,
  PENDING_TABLE_REQUEST
} from "../../constants/Admin-saasot-constants";

export const pendingrenewalreducer = (state = {}, action) => {
  switch (action.type) {
    case PENDING_TABLE_REQUEST:
      return { loading: true };
    case   PENDING_TABLE_SUCCESS:
      return {
        loading: false,
        success: true,
        pendingrenewalrecord: action.payload,
      };

    case PENDING_TABLE_FAILURE:
      return { loading: false, error: action.payload };
    default:
      return state;
  }
};

export const Contractscreenupdatesearch = (state = {}, action) => {
  switch (action.type) {
    case CONTRACTSCREEN_UPDATE_REQUEST:
      return { loading: true };
    case   CONTRACTSCREEN_UPDATE_SUCCESS:
      return {
        loading: false,
        success: true,
        Contractscreenrecord: action.payload,
      };

    case CONTRACTSCREEN_UPDATE_FAILURE:
      return { loading: false, error: action.payload };
    default:
      return state;
  }
};


export const Contractsearch = (state = {}, action) => {
  switch (action.type) {
    case CONTRACT_SEARCH_REQUEST:
      return { loading: true };
    case   CONTRACT_SEARCH_SUCCESS:
      return {
        loading: false,
        success: true,
        Contractsearchrecord: action.payload,
      };

    case CONTRACT_SEARCH_FAILURE:
      return { loading: false, error: action.payload };
    default:
      return state;
  }
};

export const ArrClientsearch = (state = {}, action) => {
  switch (action.type) {
    case CLIENT_ARRSEARCH_REQUEST:
      return { loading: true };
    case   CLIENT_ARRSEARCH_SUCCESS:
      return {
        loading: false,
        success: true,
        Clientarrsearchrecord: action.payload,
      };

    case CLIENT_ARRSEARCH_FAILURE:
      return { loading: false, error: action.payload };
    default:
      return state;
  }
};

export const Clientsearch = (state = {}, action) => {
  switch (action.type) {
    case CLIENT_SEARCH_REQUEST:
      return { loading: true };
    case   CLIENT_SEARCH_SUCCESS:
      return {
        loading: false,
        success: true,
        Clientsearchrecord: action.payload,
      };

    case CLIENT_SEARCH_FAILURE:
      return { loading: false, error: action.payload };
    default:
      return state;
  }
};

export const DatefilterReducer = (state = {}, action) => {
  switch (action.type) {
    case DATEFILTER_GET_REQUEST:
      return { loading: true };
    case DATEFILTER_GET_SUCCESS:
      return {
        loading: false,
        success: true,
        Daterecord: action.payload,
      };

    case DATEFILTER_GET_FAILURE:
      return { loading: false, error: action.payload };
    default:
      return state;
  }
};

export const ArrGracePostReducer = (state = {}, action) => {
  switch (action.type) {
    case ARRGRACE_POST_REQUEST:
      return { loading: true };
    case ARRGRACE_POST_SUCCESS:
      return {
        loading: false,
        success: true,
        Arrgracedata1: action.payload,
      };

    case ARRGRACE_POST_FAILURE:
      return { loading: false, error: action.payload };
    default:
      return state;
  }
};

export const ArrGracegetReducer = (state = {}, action) => {
  switch (action.type) {
    case ARRGRACE_LIST_REQUEST:
      return { loading: true };
    case ARRGRACE_LIST_SUCCESS:
      return {
        loading: false,
        success: true,
        Arrgracedata: action.payload,
      };

    case ARRGRACE_LIST_FAILURE:
      return { loading: false, error: action.payload };
    default:
      return state;
  }
};

export const ClientarrReducer = (state = {}, action) => {
  switch (action.type) {
    case CLIENTARR_LIST_REQUEST:
      return { loading: true };
    case CLIENTARR_LIST_SUCCESS:
      return {
        loading: false,
        success: true,
        ARRdata: action.payload,
      };

    case CLIENTARR_LIST_FAILURE:
      return { loading: false, error: action.payload };
    default:
      return state;
  }
};

export const QuickbookReducer = (state = {}, action) => {
  switch (action.type) {
    case QUICKBOOK_LIST_REQUEST:
      return { loading: true };
    case QUICKBOOK_LIST_SUCCESS:
      return {
        loading: false,
        success: true,
        Quickbookupdate: action.payload,
      };

    case QUICKBOOK_LIST_FAILURE:
      return { loading: false, error: action.payload };
    default:
      return state;
  }
};

export const LifeListReducer = (state = {}, action) => {
  switch (action.type) {
    case LIFE_LIST_REQUEST:
      return { loading: true };
    case LIFE_LIST_SUCCESS:
      return {
        loading: false,
        success: true,
        LifelistUpdate: action.payload,
      };

    case LIFE_LIST_FAILURE:
      return { loading: false, error: action.payload };
    default:
      return state;
  }
};

export const LifeUpdateReducer = (state = {}, action) => {
  switch (action.type) {
    case LIFE_UPDATE_REQUEST:
      return { loading: true };
    case LIFE_UPDATE_SUCCESS:
      return {
        loading: false,
        success: true,
        Lifedata: action.payload,
      };

    case LIFE_UPDATE_FAILURE:
      return { loading: false, error: action.payload };
    default:
      return state;
  }
};

export const CloseUpdateReducer = (state = {}, action) => {
  switch (action.type) {
    case ClosedPeriod_UPDATE_REQUEST:
      return { loading: true };
    case ClosedPeriod_UPDATE_SUCCESS:
      return {
        loading: false,
        success: true,
        Updatedata: action.payload,
      };

    case ClosedPeriod_UPDATE_FAILURE:
      return { loading: false, error: action.payload };
    default:
      return state;
  }
};

export const CloseAddReducer = (state = {}, action) => {
  switch (action.type) {
    case ClosedPeriod_ADD_REQUEST:
      return { loading: true };
    case ClosedPeriod_ADD_SUCCESS:
      return {
        loading: false,
        success: true,
        CloseADDdata: action.payload,
      };

    case ClosedPeriod_ADD_FAILURE:
      return { loading: false, error: action.payload };
    default:
      return state;
  }
};

export const CloseGetReducer = (state = {}, action) => {
  switch (action.type) {
    case ClosedPeriod_LIST_REQUEST:
      return { loading: true };
    case ClosedPeriod_LIST_SUCCESS:
      return {
        loading: false,
        success: true,
        Closeperioddata: action.payload,
      };

    case ClosedPeriod_LIST_FAILURE:
      return { loading: false, error: action.payload };
    default:
      return state;
  }
};

export const UserPostReducer = (state = {}, action) => {
  switch (action.type) {
    case USER_ADD_REQUEST:
      return { loading: true };
    case USER_ADD_SUCCESS:
      return {
        loading: false,
        success: true,
        UserlistPOSTdata: action.payload,
      };

    case USER_ADD_FAILURE:
      return { loading: false, error: action.payload };
    default:
      return state;
  }
};

export const UserlistIDReducer = (state = {}, action) => {
  switch (action.type) {
    case USER_LISTID_REQUEST:
      return { loading: true };
    case USER_LISTID_SUCCESS:
      return {
        loading: false,
        success: true,
        UserlistIDdata: action.payload,
      };

    case USER_LISTID_FAILURE:
      return { loading: false, error: action.payload };
    default:
      return state;
  }
};

export const UserUpdateReducer = (state = {}, action) => {
  switch (action.type) {
    case USER_UPDATE_REQUEST:
      return { loading: true };
    case USER_UPDATE_SUCCESS:
      return {
        loading: false,
        success: true,
        UserUpdate: action.payload,
      };

    case USER_UPDATE_FAILURE:
      return { loading: false, error: action.payload };

    default:
      return state;
  }
};

export const UserDeleteReducer = (state = {}, action) => {
  switch (action.type) {
    case USER_DELETE_REQUEST:
      return { loading: true };
    case USER_DELETE_SUCCESS:
      return {
        loading: false,
        success: true,
        Userdelete: action.payload,
      };

    case USER_DELETE_FAILURE:
      return { loading: false, error: action.payload };

    default:
      return state;
  }
};

export const UserlistReducer = (state = {}, action) => {
  switch (action.type) {
    case USER_LIST_REQUEST:
      return { loading: true };
    case USER_LIST_SUCCESS:
      return {
        loading: false,
        success: true,
        Userlistdata: action.payload,
      };

    case USER_LIST_FAILURE:
      return { loading: false, error: action.payload };

    default:
      return state;
  }
};

export const ArrlistReducer = (state = {}, action) => {
  switch (action.type) {
    case ARR_LIST_REQUEST:
      return { loading: true };
    case ARR_LIST_SUCCESS:
      return {
        loading: false,
        success: true,
        Arrlistdata: action.payload,
      };

    case ARR_LIST_FAILURE:
      return { loading: false, error: action.payload };

    default:
      return state;
  }
};

export const InvoicelistReducer = (state = {}, action) => {
  switch (action.type) {
    case INVOICE_CUSTOMER_LIST_REQUEST:
      return { loading: true };
    case INVOICE_CUSTOMER_LIST_SUCCESS:
      return {
        loading: false,
        success: true,
        Invoicecustomerlist: action.payload,
      };

    case INVOICE_CUSTOMER_LIST_FAILURE:
      return { loading: false, error: action.payload };

    default:
      return state;
  }
};

export const InvoicegetReducer = (state = {}, action) => {
  switch (action.type) {
    case INVOICE_LIST_REQUEST:
      return { loading: true };
    case INVOICE_LIST_SUCCESS:
      return {
        loading: false,
        success: true,
        Invoicelist: action.payload,
      };

    case INVOICE_LIST_FAILURE:
      return { loading: false, error: action.payload };

    default:
      return state;
  }
};

export const CsvInvoicegetReducer = (state = {}, action) => {
  switch (action.type) {
    case INVOICE_LIST_CSV_REQUEST:
      return { loading: true };
    case INVOICE_LIST_CSV_SUCCESS:
      return {
        loading: false,
        success: true,
        InvoicelistCsv: action.payload,
      };

    case INVOICE_LIST_CSV_FAILURE:
      return { loading: false, error: action.payload };

    default:
      return state;
  }
};

export const ExcelInvoicegetReducer = (state = {}, action) => {
  switch (action.type) {
    case INVOICE_LIST_EXCEL_REQUEST:
      return { loading: true };
    case INVOICE_LIST_EXCEL_SUCCESS:
      return {
        loading: false,
        success: true,
        InvoicelistExcel: action.payload,
      };

    case INVOICE_LIST_EXCEL_FAILURE:
      return { loading: false, error: action.payload };

    default:
      return state;
  }
};

  
export const ContractUpdateReducer = (state = {}, action) => {
  switch (action.type) {
    case CONTRACT_UPDATE_SUCCESS:
      return { loading: true };
    case CONTRACT_UPDATE_REQUEST:
      return {
        loading: false,
        success: true,
        UpdateFile: action.payload,
      };

    case CONTRACT_UPDATE_FAILURE:
      return { loading: false, error: action.payload };

    default:
      return state;
  }
};

export const UploadFileReducer = (state = {}, action) => {
  switch (action.type) {
    case ADMIN_UPLOADED_CSV_FILES_REQUEST:
      return { loading: true };
    case ADMIN_UPLOADED_CSV_FILES_SUCCESS:
      return {
        loading: false,
        success: true,
        UploadFile: action.payload,
      };

    case ADMIN_UPLOADED_CSV_FILES_FAILURE:
      return { loading: false, error: action.payload };

    default:
      return state;
  }
};

export const ProductAddReducer = (state = {}, action) => {
  switch (action.type) {
    case PRODUCT_ADD_SUCCESS:
      return { loading: true };
    case PRODUCT_ADD_REQUEST:
      return {
        loading: false,
        success: true,
        UploadProduct: action.payload,
      };

    case PRODUCT_ADD_FAILURE:
      return { loading: false, error: action.payload };

    default:
      return state;
  }
};

export const UpdateReducer = (state = {}, action) => {
  switch (action.type) {
    case PRODUCT_UPDATE_REQUEST:
      return { loading: true };
    case PRODUCT_UPDATE_SUCCESS:
      return {
        loading: false,
        success: true,
        UpdateFile: action.payload,
      };

    case PRODUCT_UPDATE_FAILURE:
      return { loading: false, error: action.payload };

    default:
      return state;
  }
};

export const DeleteReducer2 = (state = {}, action) => {
  switch (action.type) {
    case PRODUCT_DELETE_SUCCESS:
      return { loading: true };
    case PRODUCT_DELETE_REQUEST:
      return {
        loading: false,
        success: true,
        UpdateFile: action.payload,
      };

    case PRODUCT_DELETE_FAILURE:
      return { loading: false, error: action.payload };

    default:
      return state;
  }
};

export const GetProductServiceReducer = (
  state = { ProServData: [] },
  action
) => {
  switch (action.type) {
    case CLIENT_PRODUCTS_SERVICE_GET_REQUEST:
      return { loading: true };

    case CLIENT_PRODUCTS_SERVICE_GET_SUCCESS:
      return {
        loading: false,
        ProServData: action.payload,
        success: true,
      };
    case CLIENT_PRODUCTS_SERVICE_GET_FAILURE:
      return { loading: false, error: action.payload };

    default:
      return state;
  }
};

export const GetAddContractProductServiceReducer = (
  state = { ProServData: [] },
  action
) => {
  switch (action.type) {
    case CLIENT_ADDCONTRACT_PRODUCTS_SERVICE_GET_REQUEST:
      return { loading: true };

    case CLIENT_ADDCONTRACT_PRODUCTS_SERVICE_GET_SUCCESS:
      return {
        loading: false,
        ProServData: action.payload,
        success: true,
      };
    case CLIENT_ADDCONTRACT_PRODUCTS_SERVICE_GET_FAILURE:
      return { loading: false, error: action.payload };

    default:
      return state;
  }
};

export const GetListProductServiceNameReducer = (
  state = { ProServNameData: [] },
  action
) => {
  switch (action.type) {
    case CLIENT_GET_LIST_PRODUCT_SERVICE_NAME_REQUEST:
      return { loading: true };

    case CLIENT_GET_LIST_PRODUCT_SERVICE_NAME_SUCCESS:
      return {
        loading: false,
        ProServNameData: action.payload,
        success: true,
      };
    case CLIENT_GET_LIST_PRODUCT_SERVICE_NAME_FAILURE:
      return { loading: false, error: action.payload };

    default:
      return state;
  }
};

export const GetListProductServiceTypeReducer = (
  state = { ProServTypeData: [] },
  action
) => {
  switch (action.type) {
    case CLIENT_GET_LIST_PRODUCT_SERVICE_TYPE_REQUEST:
      return { loading: true };

    case CLIENT_GET_LIST_PRODUCT_SERVICE_TYPE_SUCCESS:
      return {
        loading: false,
        ProServTypeData: action.payload,
        success: true,
      };
    case CLIENT_GET_LIST_PRODUCT_SERVICE_TYPE_FAILURE:
      return { loading: false, error: action.payload };

    default:
      return state;
  }
};

export const GetListRevenuReducer = (state = { Revenulist: [] }, action) => {
  switch (action.type) {
    case CLIENT_GET_LIST_REVENUE_RECOGNITION_REQUEST:
      return { loading: true };
    case CLIENT_GET_LIST_REVENUE_RECOGNITION_SUCCESS:
      return {
        loading: false,
        Revenulist: action.payload,
        success: true,
      };
    case CLIENT_GET_LIST_REVENUE_RECOGNITION_FAILURE:
      return { loading: false, error: action.payload };
    default:
      return state;
  }
};

export const AddProductServiceReducer = (state = {}, action) => {
  switch (action.type) {
    case CLIENT_ADD_PRODUCT_SERVICE_REQUEST:
      return { loading: true };
    case CLIENT_ADD_PRODUCT_SERVICE_SUCCESS:
      return {
        loading: false,
        success: true,
        addServPro: action.payload,
      };

    case CLIENT_ADD_PRODUCT_SERVICE_FAILURE:
      return { loading: false, error: action.payload };

    default:
      return state;
  }
};

export const GetByIdProductReducer = (state = {}, action) => {
  switch (action.type) {
    case CLIENT_PRODUCTS_SERVICE_GET_BY_ID_REQUEST:
      return { loading: true };
    case CLIENT_PRODUCTS_SERVICE_GET_BY_ID_SUCCESS:
      return {
        loading: false,
        success: true,
        ProductById: action.payload,
      };

    case CLIENT_PRODUCTS_SERVICE_GET_BY_ID_FAILURE:
      return { loading: false, error: action.payload };

    default:
      return state;
  }
};

export const AddContractReducer = (state = {}, action) => {
  switch (action.type) {
    case CLIENT_ADD_CONTEACT_POST_REQUEST:
      return { loading: true };
    case CLIENT_ADD_CONTEACT_POST_SUCCESS:
      return {
        loading: false,
        success: true,
        AddContract: action.payload,
      };

    case CLIENT_ADD_CONTEACT_POST_FAILURE:
      return { loading: false, error: action.payload };

    default:
      return state;
  }
};

export const CsvShowClientReducer = (state = { CsvShowData: [] }, action) => {
  switch (action.type) {
    case CLINET_SH0W_CSV_FILES_REQUEST:
      return { loading: true };

    case CLINET_SH0W_CSV_FILES_SUCCESS:
      return {
        loading: false,
        CsvShowData: action.payload,
        success: true,
      };
    case CLINET_SH0W_CSV_FILES_FAILURE:
      return { loading: false, error: action.payload };

      case CLINET_SH0W_CSV_FILES_RESET:
        return {};

    default:
      return state;
  }
};

export const ViewContractDbReducer = (
  state = { ViewContractDbData: [] },
  action
) => {
  switch (action.type) {
    case CLIENT_SHOW_CONTRACT_DATABASE_REQUEST:
      return { loading: true };

    case CLIENT_SHOW_CONTRACT_DATABASE_SUCCESS:
      return {
        loading: false,
        ViewContractDbData: action.payload,
        success: true,
      };
    case CLIENT_SHOW_CONTRACT_DATABASE_FAILURE:
      return { loading: false, error: action.payload };

    default:
      return state;
  }
};

export const ViewContractDbWihtoutPageReducer = (
  state = { ViewContractDbData: [] },
  action
) => {
  switch (action.type) {
    case CLIENT_SHOW_CONTRACT_DATABASE_WITHOUT_PAGE_REQUEST:
      return { loading: true };

    case CLIENT_SHOW_CONTRACT_DATABASE_WITHOUT_PAGE_SUCCESS:
      return {
        loading: false,
        ViewContractDbData: action.payload,
        success: true,
      };
    case CLIENT_SHOW_CONTRACT_DATABASE_WITHOUT_PAGE_FAILURE:
      return { loading: false, error: action.payload };

    default:
      return state;
  }
};

export const getCutomerTotalReducer = (state = { getCotTatal: [] }, action) => {
  switch (action.type) {
    case GET_CUSTOMER_NAME_TABLE_TOTAL_REQUEST:
      return { loading: true };

    case GET_CUSTOMER_NAME_TABLE_TOTAL_SUCCESS:
      return {
        loading: false,
        getCotTatal: action.payload,
        success: true,
      };
    case GET_CUSTOMER_NAME_TABLE_TOTAL_FAIL:
      return { loading: false, error: action.payload };

    default:
      return state;
  }
};

export const getCutomerTotalFilterReducer = (
  state = { getCotTatalFilter: [] },
  action
) => {
  switch (action.type) {
    case GET_CUSTOMER_TABLE_TOTAL_FILTER_REQUEST:
      return { loading: true };

    case GET_CUSTOMER_TABLE_TOTAL_FILTER_SUCCESS:
      return {
        loading: false,
        getCotTatalFilter: action.payload,
        success: true,
      };
    case GET_CUSTOMER_TABLE_TOTAL_FILTER_FAILURE:
      return { loading: false, error: action.payload };

    default:
      return state;
  }
};

export const CsvViewContractDbReducer = (
  state = { CsvViewContractDbData: [] },
  action
) => {
  switch (action.type) {
    case CLIENT_SHOW_CONTRACT_CSV_DATABASE_REQUEST:
      return { loading: true };

    case CLIENT_SHOW_CONTRACT_CSV_DATABASE_SUCCESS:
      return {
        loading: false,
        CsvViewContractDbData: action.payload,
        success: true,
      };
    case CLIENT_SHOW_CONTRACT_CSV_DATABASE_FAILURE:
      return { loading: false, error: action.payload };

    default:
      return state;
  }
};

export const ContractScreenReducer = (
  state = { ContractScreen: [] },
  action
) => {
  switch (action.type) {
    case CLIENT_SHOW_CONTRACT_SCREEN_REQUEST:
      return { loading: true };
    case CLIENT_SHOW_CONTRACT_SCREEN_SUCCESS:
      return {
        loading: false,
        success: true,
        ContractScreen: action.payload,
      };

    case CLIENT_SHOW_CONTRACT_SCREEN_FAILURE:
      return { loading: false, error: action.payload };

    default:
      return state;
  }
};

export const ArrViewReducer = (state = { ArrView: [] }, action) => {
  switch (action.type) {
    case CLIENT_ARR_VIEW_LIST_REQUEST:
      return { loading: true };
    case CLIENT_ARR_VIEW_LIST_SUCCESS:
      return {
        loading: false,
        success: true,
        ArrView: action.payload,
      };

    case CLIENT_ARR_VIEW_LIST_FAILURE:
      return { loading: false, error: action.payload };

    default:
      return state;
  }
};

export const GetContractDbFilterListReducer = (
  state = { DBfilterData: [] },
  action
) => {
  switch (action.type) {
    case CONTRACT_DATABASE_GET_FILTER_DATA_REQUEST:
      return { loading: true };

    case CONTRACT_DATABASE_GET_FILTER_DATA_SUCCESS:
      return {
        loading: false,
        DBfilterData: action.payload,
        success: true,
      };
    case CONTRACT_DATABASE_GET_FILTER_DATA_FAILURE:
      return { loading: false, error: action.payload };

    default:
      return state;
  }
};
