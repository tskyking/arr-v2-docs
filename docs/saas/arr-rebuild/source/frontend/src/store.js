import { createStore, applyMiddleware, combineReducers } from "redux";
import thunk from "redux-thunk";
import { composeWithDevTools } from "redux-devtools-extension";

import {
  userLoginReducer,
  userRegisterReducer,
  userDetailsReducer,
  UpdateProfileReducer,
  userPortfolioReducer,
  getCreatorProfileJobsInProgressReducer,
  memberApproverJobsInProgressReducer,
  memberMarketerJobsInProgressReducer,
  getMemberAdminProfileJobsInProgressReducer,
  getAgencyRatingDetailsReducer,
  getCreatorRatingDetailsReducer,
  Cacheupdate
} from "./redux/reducers/auth-reducer";
import { loaderReducer } from "./redux/reducers/other-reducer";

import {
  UploadFileReducer,
  GetProductServiceReducer,
  GetAddContractProductServiceReducer,
  GetListProductServiceNameReducer,
  GetListProductServiceTypeReducer,
  GetListRevenuReducer,
  AddProductServiceReducer,
  GetByIdProductReducer,
  AddContractReducer,
  CsvShowClientReducer,
  ViewContractDbReducer,
  ViewContractDbWihtoutPageReducer,
  getCutomerTotalReducer,
  getCutomerTotalFilterReducer,
  CsvViewContractDbReducer,
  ContractScreenReducer,
  ArrViewReducer,
  DeleteReducer2,
  ProductAddReducer,
  UpdateReducer,
  ContractUpdateReducer,
  InvoicegetReducer,
  CsvInvoicegetReducer,
  ExcelInvoicegetReducer,
  InvoicelistReducer,
  ArrlistReducer,
  UserlistReducer,
  UserlistIDReducer,
  UserPostReducer,
  UserUpdateReducer,
  UserDeleteReducer,
  CloseGetReducer,
  LifeListReducer,
  QuickbookReducer,
  ClientarrReducer,
  ArrGracegetReducer,
  DatefilterReducer,
  GetContractDbFilterListReducer,
  Clientsearch,
  ArrClientsearch,
  Contractsearch,
  Contractscreenupdatesearch,
  pendingrenewalreducer
} from "./redux/reducers/Admin-saasot-reducer";

const reducer = combineReducers({
  authReducer: userLoginReducer,
  userRegisterReducer,
  userPortfolioReducer,
  getCreatorProfileJobsInProgressReducer,
  memberApproverJobsInProgressReducer,
  memberMarketerJobsInProgressReducer,
  getMemberAdminProfileJobsInProgressReducer,
  UpdateProfileReducer,
  userDetailsReducer,
  loaderReducer,
  getAgencyRatingDetailsReducer,
  getCreatorRatingDetailsReducer,
  UploadFileReducer,
  GetProductServiceReducer,
  GetAddContractProductServiceReducer,
  GetListProductServiceNameReducer,
  GetListProductServiceTypeReducer,
  GetListRevenuReducer,
  AddProductServiceReducer,
  GetByIdProductReducer,
  AddContractReducer,
  CsvShowClientReducer,
  ViewContractDbReducer,
  ViewContractDbWihtoutPageReducer,
  getCutomerTotalReducer,
  getCutomerTotalFilterReducer,
  CsvViewContractDbReducer,
  ContractScreenReducer,
  ArrViewReducer,
  DeleteReducer2,
  ProductAddReducer,
  UpdateReducer,
  ContractUpdateReducer,
  InvoicegetReducer,
  CsvInvoicegetReducer,
  ExcelInvoicegetReducer,
  InvoicelistReducer,
  ArrlistReducer,
  Clientsearch,
  ArrClientsearch,
  UserlistReducer,
  UserlistIDReducer,
  UserPostReducer,
  UserUpdateReducer,
  Contractscreenupdatesearch,
  UserDeleteReducer,
  CloseGetReducer,
  LifeListReducer,
  QuickbookReducer,
  ClientarrReducer,
  ArrGracegetReducer,
  Cacheupdate,
  DatefilterReducer,
  GetContractDbFilterListReducer,
  Contractsearch,
  pendingrenewalreducer
});

// get userData from localStorage
const userDataFromStorage = localStorage.getItem("userData")
  ? JSON.parse(localStorage.getItem("userData"))
  : null;

// initialState
const initialState = {
  authReducer: { userData: userDataFromStorage },
};
// middleware used thunk
const middleware = [thunk];

// store variable initialized
const store = createStore(
  reducer,
  initialState,
  composeWithDevTools(applyMiddleware(...middleware))
);

export default store;
