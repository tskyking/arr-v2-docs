import "./App.css";
import "./Responsive.css";
import React, { useState, useEffect } from "react";
import { ToastContainer } from "react-toastify";

// ------------------------import saasot component----------------------------------------------
import UsersList from "./MyComponents/Client/UsersList";
import UploadeFiles from "./MyComponents/Client/UploadeFiles";
import CustomerUpload from "./MyComponents/Client/CustomerUpload";
import ShowProductServices from "./MyComponents/Client/ShowProductServices";
import ContractUpload from "./MyComponents/Client/ContractUpload";
import AddContract from "./MyComponents/Client/AddContract";
import ClosedPeriod from "./MyComponents/Client/ClosedPeriod";
import QuickbookSetting from "./MyComponents/Client/QuickbookSetting";
import ViewContractDb from "./MyComponents/Client/ViewContractDb";
import AddUsers from "./MyComponents/Client/AddUsers";
import ProductAdd from "./MyComponents/Client/ProductAdd";
import Productserviceadd from "./MyComponents/Client/Productserviceadd";
import CustomerScreen from "./MyComponents/Client/Customerscreen";
import ContractScreen from "./MyComponents/Client/ContractScreen";
import ContractDbView from "./MyComponents/Client/ContractDbView";
import ClientDetails from "./MyComponents/Client/ClientDetails";

// ------------------------import saasot component----------------------------------------------

import Error from "./MyComponents/Common/Error";

// Authentication
import Login from "./MyComponents/Authentication/Login";
import Signup from "./MyComponents/Authentication/Signup";
import ResetPassword from "./MyComponents/Authentication/Reset-password";
import ForgotPassword from "./MyComponents/Authentication/Forgot-password";
import VerifyEmail from "./MyComponents/Authentication/Verify-email";
import Thank_you from "./MyComponents/Authentication/Thank-you";

// Others
import AppLayout from "./containers/Layout/App-layout";

// Routing
import PublicRoute from "./routing/PublicRoute";
import ProtectedRoute from "./routing/ProtectedRoute";
import AdminRoute from "./routing/AdminRoute";

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

function App() {
  const [isToggle, setIsToggle] = useState(false);
  const [headerCompany, setHeaderCompany] = useState(null);
  // const [searchfeedbackCreator, setSearchfeedbackCreator] = useState("");
  const [searchfeedback, setSearchfeedback] = useState("");

  return (
    <>
      <div className="Topdiv">
        <Router>
          <Routes>
            <Route
              element={
                <AppLayout
                  headerCompany={headerCompany}
                  setHeaderCompany={setHeaderCompany}
                  // searchfeedbackCreator={searchfeedbackCreator}
                  // setSearchfeedbackCreator={setSearchfeedbackCreator}
                  searchfeedback={searchfeedback}
                  setSearchfeedback={setSearchfeedback}
                  isToggle={isToggle}
                  setIsToggle={setIsToggle}
                />
              }
            >
              <Route
                exact
                path="/home"
                element={
                  <ProtectedRoute>
                    <ViewContractDb />
                  </ProtectedRoute>
                }
              ></Route>

              <Route
                exact
                path="/users"
                element={
                  <ProtectedRoute>
                    <UsersList />
                  </ProtectedRoute>
                }
              ></Route>

              <Route
                exact
                path="/upload-file"
                element={
                  <ProtectedRoute>
                    <UploadeFiles />
                  </ProtectedRoute>
                }
              ></Route>

              <Route
                exact
                path="/customer-upload"
                element={
                  <ProtectedRoute>
                    <CustomerUpload />
                  </ProtectedRoute>
                }
              ></Route>

              <Route
                exact
                path="/show-products/servies"
                element={
                  <ProtectedRoute>
                    <ShowProductServices />
                  </ProtectedRoute>
                }
              ></Route>

              <Route
                exact
                path="/contract-upload"
                element={
                  <ProtectedRoute>
                    <ContractUpload />
                  </ProtectedRoute>
                }
              ></Route>

              <Route
                exact
                path="/add-contract"
                element={
                  <ProtectedRoute>
                    <AddContract />
                  </ProtectedRoute>
                }
              ></Route>

              <Route
                exact
                path="/closed-period"
                element={
                  <ProtectedRoute>
                    <ClosedPeriod />
                  </ProtectedRoute>
                }
              ></Route>

              <Route
                exact
                path="/quickbook-connect"
                element={
                  <ProtectedRoute>
                    <QuickbookSetting />
                  </ProtectedRoute>
                }
              ></Route>

              <Route
                exact
                path="/add-user"
                element={
                  <ProtectedRoute>
                    <AddUsers />
                  </ProtectedRoute>
                }
              ></Route>

              <Route
                exact
                path="/add-user/:ids"
                element={
                  <ProtectedRoute>
                    <AddUsers />
                  </ProtectedRoute>
                }
              ></Route>

              <Route
                exact
                path="/Product/Service-add"
                element={
                  <ProtectedRoute>
                    <ProductAdd />
                  </ProtectedRoute>
                }
              ></Route>

              <Route
                exact
                path="/Product/Service-update"
                element={
                  <ProtectedRoute>
                    <Productserviceadd />
                  </ProtectedRoute>
                }
              ></Route>

              <Route
                exact
                path="/Product/Service-update/:id"
                element={
                  <ProtectedRoute>
                    <Productserviceadd />
                  </ProtectedRoute>
                }
              ></Route>

              <Route
                exact
                path="/customer-screen/:id"
                element={
                  <ProtectedRoute>
                    <CustomerScreen />
                  </ProtectedRoute>
                }
              ></Route>

              <Route
                exact
                path="/contract-screen/:id"
                element={
                  <ProtectedRoute>
                    <ContractScreen />
                  </ProtectedRoute>
                }
              ></Route>

              <Route
                exact
                path="/view-contract-Db"
                element={
                  <ProtectedRoute>
                    <ContractDbView />
                  </ProtectedRoute>
                }
              ></Route>

              <Route
                exact
                path="/clientarr-screen/:id"
                element={
                  <ProtectedRoute>
                    <ClientDetails />
                  </ProtectedRoute>
                }
              ></Route>
            </Route>
            {/* ---------------------------------------------------------3018-------------------------------------------- */}
            <Route exact path="/" element={<Login />}></Route>
            <Route
              exact
              path="/verify-email/:token/:uid"
              element={
                <PublicRoute>
                  <VerifyEmail />
                </PublicRoute>
              }
            ></Route>
            <Route
              exact
              path="/signup"
              element={
                <PublicRoute>
                  <Signup />
                </PublicRoute>
              }
            ></Route>

            <Route
              exact
              path="/thank-you"
              element={
                <PublicRoute>
                  <Thank_you />
                </PublicRoute>
              }
            ></Route>

            <Route
              exact
              path="/thank-you/:successPage"
              element={
                <PublicRoute>
                  <Thank_you />
                </PublicRoute>
              }
            ></Route>
            <Route
              exact
              path="/forgot-password"
              element={
                <PublicRoute>
                  <ForgotPassword />
                </PublicRoute>
              }
            ></Route>
            <Route
              exact
              path="/reset-password/:ResetpasswordId/:userId/"
              element={
                <PublicRoute>
                  <ResetPassword />
                </PublicRoute>
              }
            ></Route>
            <Route
              // exact
              path="*"
              element={<Error />}
            ></Route>
          </Routes>
        </Router>
      </div>

      <ToastContainer />
    </>
  );
}
export default App;
