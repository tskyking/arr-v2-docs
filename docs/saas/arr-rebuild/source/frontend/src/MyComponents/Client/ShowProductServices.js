import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import { MDBDataTable } from "mdbreact";
import { saveAs } from "file-saver";
import { Card, CardHeader, CardBody, Row, Col, Button } from "reactstrap";
import { useDispatch, useSelector } from "react-redux";
import { BACKEND_API_URL } from "../../environment";

import {
  GetProductServiceAction,
  GetListProductServiceTypeAction,
  GetListRevenueAction,
  AddProductServiceAction,
  GetByIdProductAction,
  GetListProductServiceNameAction,
  Lifelist,
  LifelistUpdateapi,
  Arrgraceget,
  Arrgracepost,
} from "../../redux/actions/Admin-saasot-action";

import { Link } from "react-router-dom";
import swal from "sweetalert";
import { validations } from "../../utils";

const ShowProductServices = () => {
  const dispatch = useDispatch();
  const [openUploadFile, setopenUploadFile] = useState(false);
  const [usersForRender, setUsersForRender] = useState([]);
  const [productName, setProductName] = useState("");
  const [updateid, setupdateit] = useState("");
  const [productNameInput, setProductNameInput] = useState("");
  const [productType, setProductType] = useState("");
  const [revenueData, setRevenuData] = useState("");
  const [errors, setErrors] = useState({
    serviceName: null,
    serviceNameInput: null,
    serviceType: null,
    revenueServ: null,
  });
  const [rerender, setRerender] = useState(false);
  const [productId, setProductId] = useState();

  const { error, userData } = useSelector((state) => state.authReducer);

  const { LifelistUpdate, success: dataget } = useSelector(
    (state) => state.LifeListReducer
  );

  const { userData: userDataToken } = useSelector((state) => state.authReducer);

  const {
    ProServData,
    loading: ProServDataLoading,
    error: ProServDataError,
  } = useSelector((state) => state.GetProductServiceReducer);

  const {
    ProServNameData,
    success: ProServNameDataSuccess,
    error: ProServNameDataError,
  } = useSelector((state) => state.GetListProductServiceNameReducer);

  const {
    ProductById,
    loading: ProductByIdLoading,
    error: ProductByIdError,
  } = useSelector((state) => state.GetByIdProductReducer);

  const {
    ProServTypeData,
    loading: proServTypeDataLoading,
    error: proServTypeDataError,
  } = useSelector((state) => state.GetListProductServiceTypeReducer);

  const {
    Revenulist,
    loading: revenulistLoading,
    error: revenulisterror,
  } = useSelector((state) => state.GetListRevenuReducer);

  const {
    addServPro,
    loading: addServProLoading,
    error: addServProrror,
    success: addServProsuccess,
  } = useSelector((state) => state.AddProductServiceReducer);

  const { Arrgracedata, success: gracedata } = useSelector(
    (state) => state.ArrGracegetReducer
  );

  useEffect(() => {
    console.log(LifelistUpdate);
    setInputValue(LifelistUpdate?.[0]?.months);
  }, [dataget]);

  useEffect(() => {
    dispatch(GetListProductServiceTypeAction());
    dispatch(GetListRevenueAction());
    dispatch(GetListProductServiceNameAction());
  }, []);

  useEffect(() => {
    dispatch(GetProductServiceAction());
  }, [addServProsuccess]);

  useEffect(() => {
    if (productId) {
      if (ProductById) {
        // setProductName(ProductById?.id);
        setProductNameInput(ProductById?.product_name);
        setProductName("other");
        setProductType(ProductById?.productp_service_type?.id);
        setRevenuData(ProductById?.revenue_type?.id);
      }
    }
  }, [productId, ProductById]);

  useEffect(() => {
    if (addServProsuccess && rerender) {
      swal({
        title: "SaaSot App",
        text: productId
          ? "Edit Product/Service Successfully"
          : "Add Product/Service Successfully",
        className: "successAlert",
        icon: "https://flowbite.com/docs/images/logo.svg",
        buttons: false,
        timer: 3000,
        open: true,
      });
      setProductName();
      setProductNameInput();
      setProductType();
      setRevenuData();
      setProductId();
      setRerender(false);
      setopenUploadFile(false);
      // <Redirect to="/admin" />
    }
    if (addServProrror && rerender) {
      swal({
        title: addServProrror,
        text: "Error",
        className: "errorAlert",
        // icon: "https://flowbite.com/docs/images/logo.svg",
        icon: "warning",
        buttons: false,
        timer: 4000,
        customClass: {
          title: "errorTitle",
          content: "errorText",
        },
      });
      setRerender(false);
    }
  }, [dispatch, addServProsuccess, addServProrror]);

  const handleDownloadExcelFile = async () => {
    try {
      const response = await fetch(
        `${BACKEND_API_URL}services/download-Product-service/excel/`,
        {
          headers: {
            Authorization: `Bearer ${userDataToken?.token}`,
          },
        }
      );

      if (response.status === 200) {
        const blob = await response.blob();
        saveAs(blob, "ProductService.xlsx");
      } else {
        console.error("Error downloading Excel file:", response.statusText);
      }
    } catch (error) {
      console.error("Error downloading Excel file:", error);
    }
  };

  const handleDownloadCsvFile = async () => {
    try {
      const response = await fetch(
        `${BACKEND_API_URL}services/download-Product-service/csv/`,
        {
          headers: {
            Authorization: `Bearer ${userDataToken?.token}`,
          },
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "download.csv";
        a.click();
      } else {
        console.error(
          "Failed to fetch CSV:",
          response.status,
          response.statusText
        );
      }
    } catch (error) {
      console.error("Error downloading CSV:", error);
    }
  };

  // const handleDownloadCsvFile = function () {
  //   const blob = new Blob([ProServData], { type: 'text/csv' });
  //   const url = window.URL.createObjectURL(blob)
  //   const a = document.createElement('a')
  //   a.setAttribute('href', url)
  //   a.setAttribute('download', 'download.csv');
  //   a.click()
  // }

  // useEffect(() => {
  //   let userData = [];
  //   if (ProServData?.length > 0) {
  //     let items = {};
  //     ProServData?.map((item, index) => {
  //       items.product_name = item?.product_name;
  //       items.productp_service_type =
  //         item?.productp_service_type?.productp_service_type;
  //       items.revenue_type = item?.revenue_type?.revenue_type;

  //       items.action = (
  //         <div>
  //           <div>
  //             <button title="Edit" className="button-text-t editbtuuontable iconbtn ">
  //               <p
  //                 className="editiconDelete1"
  //                 onClick={() => editDataHandler(item?.id)}
  //               >
  //               <i class="fa fa-pencil"></i>
  //               </p>
  //             </button>
  //           </div>
  //         </div>
  //       );
  //       userData.push(items);
  //     });
  //   }

  //   setUsersForRender(userData);
  // }, [ProServData]);

  useEffect(() => {
    if (Array.isArray(ProServData) && ProServData.length > 0) {
      const formattedData = ProServData.map((item) => {
        const userItem = {
          product_name: item?.product_name || "",
          productp_service_type:
            item?.productp_service_type?.productp_service_type || "",
          revenue_type: item?.revenue_type?.revenue_type || "",
          action: (
            <div>
              <div>
                <button
                  title="Edit"
                  className="button-text-t editbtuuontable iconbtn-1 "
                  onClick={() => editDataHandler(item?.id)}
                >
                  <p className="editiconDelete1">
                    <i className="fa fa-pencil"></i>
                  </p>
                </button>
              </div>
            </div>
          ),
        };
        return userItem;
      });

      setUsersForRender(formattedData);
    }
  }, [ProServData]);

  const data1 = {
    columns: [
      {
        label: "Product Name",
        field: "product_name",
        sort: "asc",
        width: 500,
      },
      {
        label: "Revenue Recognition",
        field: "revenue_type",
        sort: "asc",
        width: 500,
      },
      {
        label: "Product Type",
        field: "productp_service_type",
        sort: "asc",
        width: 500,
      },
      {
        label: "Status",
        field: "is_active",
        sort: "asc",
        width: 500,
      },
      {
        label: "Action",
        field: "action",
        sort: "asc",
        width: 100,
      },
    ],
    rows: usersForRender,
  };

  const handleClickOpenUpload = () => {
    setopenUploadFile(true);
  };

  const handleClickOpenlife = () => {
    if (Revenulist) {
      Revenulist.forEach((item) => {
        if (item.revenue_type === "over the expected life of the customer") {
          dispatch(Lifelist());
          setupdateit(item.id);
          setIsOpen(true);
        }
      });
    }
  };

  const handleClickOpenlifegrace = () => {
    setIsOpen1(true);
    dispatch(Arrgraceget());
  };

  const handleCloseUpload = () => {
    setopenUploadFile(false);
    setProductName();
    setProductNameInput();
    setProductType();
    setRevenuData();
    setProductId();
  };

  const editDataHandler = (id) => {
    setProductId(id);
    dispatch(GetByIdProductAction(id));
    setopenUploadFile(true);
  };

  const handleFileSubmit = (e) => {
    e.preventDefault();
    const tempErrors = {
      serviceName: validations.productName(productName),
      serviceNameInput: !productNameInput && "This field is requried",
      serviceType: !productType && "This field is requried",
      revenueServ: !revenueData && "This field is requried",
    };
    setErrors(tempErrors);
    if (Object.values(tempErrors).filter((value) => value).length) {
      // console.log(
      //   "validatio Error----",
      //   Object.values(tempErrors).filter((value) => value)
      // );
      return;
    }
    handleDataSubmit();
  };

  const handleDataSubmit = () => {
    setRerender(true);
    const formData = new FormData();
    if (productId) {
      if (productName === "other") {
        formData.append("product_name", productNameInput);
      } else {
        formData.append("service_id", productName);
      }
      formData.append("productp_service_type", productType);
      formData.append("revenue_type", revenueData);
      formData.append("user", userData?.user?.user_id);
      formData.append("is_active", true);

      dispatch(AddProductServiceAction(formData, productId));
    } else {
      if (productName === "other") {
        formData.append("product_name", productNameInput);
      } else {
        formData.append("service_id", productName);
      }
      formData.append("productp_service_type", productType);
      formData.append("revenue_type", revenueData);
      formData.append("user", userData?.user?.user_id);
      formData.append("is_active", true);

      dispatch(AddProductServiceAction(formData));
    }
  };

  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const [isOpen1, setIsOpen1] = useState(false);
  const [inputValue1, setInputValue1] = useState("");

  const handleButtonClick = (id) => {
    setIsOpen(true);
  };

  useEffect(() => {
    if (Arrgracedata && Arrgracedata.length > 0) {
      setInputValue1(Arrgracedata[0].months);
    }
  }, [Arrgracedata, isOpen1]);

  const handleClosecancel = () => {
    setIsOpen(false);
    setInputValue("");
  };

  const handleClosecancel1 = () => {
    setIsOpen1(false);
    setInputValue1("");
  };

  const handlesubmit1 = () => {
    setIsOpen1(false);
    const formData = new FormData();
    formData.append("months", inputValue1);
    formData.append("company", userData?.user?.company_id);
    dispatch(Arrgracepost(formData));
    setInputValue1("");
  };

  const handlesubmit = () => {
    setIsOpen(false);
    // Use the inputValue and perform the desired actions
    const formData = new FormData();
    formData.append("months", inputValue);
    formData.append("company", userData?.user?.company_id);
    dispatch(LifelistUpdateapi(formData, updateid));
    setInputValue("");
  };

  const handleInputChange = (event) => {
    const value = event.target.value;
    setInputValue(value);
  };

  const handleInputChange1 = (event) => {
    const value = event.target.value;
    setInputValue1(value);
  };

  return (
    <>
      <Dialog className="profileImgDialogagency popupclass" open={isOpen1}>
        <div className="dialogcontent_and_actions_new">
          <DialogContent className="enterNameInputNewD">
            <div></div>
            <div className="userpop">
              <span>ARR Grace Period (Months)</span>
              <input
                type="number"
                value={inputValue1}
                placeholder="Arr Grace Period (Months)"
                onChange={handleInputChange1}
              />
            </div>
          </DialogContent>
          <DialogActions>
            <div className="Cancelokbtn">
              <Button className="okbtn" onClick={handlesubmit1}>
                Ok
              </Button>
              <Button onClick={handleClosecancel1} className="Cancelbtn-4">
                Cancel
              </Button>
            </div>
          </DialogActions>
        </div>
      </Dialog>

      <Dialog className="profileImgDialogagency popupclass" open={isOpen}>
        <div className="dialogcontent_and_actions_new">
          <DialogContent className="enterNameInputNewD">
            <div></div>
            <div className="userpop">
              <span>Revenue Recognize Month</span>
              <input
                type="number"
                value={inputValue}
                placeholder="Number of Month"
                onChange={handleInputChange}
              />
            </div>
          </DialogContent>
          <DialogActions>
            <div className="Cancelokbtn">
              <Button className="okbtn" onClick={handlesubmit}>
                Ok
              </Button>
              <Button onClick={handleClosecancel} className="Cancelbtn-4">
                Cancel
              </Button>
            </div>
          </DialogActions>
        </div>
      </Dialog>
      <div className="content shoping-4">
        <div>
          <div className="card_header_space">
            <button className="button-text-t" onClick={handleClickOpenlife}>
              Expected Life of Customer (months)
            </button>
            <button
              className="button-text-t"
              onClick={handleClickOpenlifegrace}
            >
              ARR Grace Period
            </button>
            <button className="button-text-t" onClick={handleClickOpenUpload}>
              Add Products/Services
            </button>
            <Link to="/Product/Service-add">
              <button className="button-text-t">Product/Service List</button>
            </Link>
          </div>
          <div className="showproductsec-sec">
            <div className="container">
              <div className="serviescsvbtn">
                <button
                  className="csvbuttonfordownloadExcel"
                  onClick={handleDownloadExcelFile}
                >
                  Excel
                </button>
                <button
                  className="csvbuttonfordownloadExcel"
                  onClick={handleDownloadCsvFile}
                >
                  CSV
                </button>
              </div>
              <MDBDataTable
                className="dashbordtable dashbordtable1 showtable"
                style={{}}
                responsive
                striped
                bordered
                small
                data={data1}
              />
            </div>
          </div>
        </div>
      </div>
      <Dialog
        className="profileImgDialogagency popupclass"
        open={openUploadFile}
        onClose={handleCloseUpload}
      >
        <DialogTitle className="uploadmediapage">
          <h2 className="product_services">
            Add Products/Services
            <span className="closebuttonsec" onClick={handleCloseUpload}>
              <i className="fa-solid fa-xmark"></i>
            </span>
          </h2>
        </DialogTitle>
        <div className="dialogcontent_and_actions_new">
          <DialogContent className="enterNameInputNewD">
            {productName === "other" ? (
              <div className="hello">
                <label
                  hmlFor="countries"
                  className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                >
                  Product/Service Name
                </label>
                <input
                  value={productNameInput}
                  disabled={productId}
                  onChange={(e) => {
                    setProductNameInput(e.target.value);
                    setErrors({ ...errors, serviceNameInput: null });
                  }}
                  id="countries"
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                  placeholder="Input New Product"
                />
                <span
                  style={{
                    color: "#D14F4F",
                    fontSize: "13px",
                    opacity: errors.serviceNameInput ? 1 : 0,
                  }}
                >
                  {errors.serviceNameInput ?? "valid"}
                </span>
              </div>
            ) : (
              <div className="form_space">
                <label
                  hmlFor="countries"
                  className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                >
                  Product/Service Name
                </label>
                <select
                  value={productName}
                  disabled={productId}
                  onChange={(e) => {
                    setProductName(e.target.value);
                    setErrors({ ...errors, serviceName: null });
                  }}
                  id="countries"
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                >
                  <option selected>select</option>
                  <option value="other">other</option>
                  {ProServNameData?.length > 0 &&
                    ProServNameData?.map((item, index) => (
                      <option key={item.id} value={item.id}>
                        {item.product_name}
                      </option>
                    ))}
                </select>
                <span
                  style={{
                    color: "#D14F4F",
                    fontSize: "13px",
                    opacity: errors.serviceName ? 1 : 0,
                  }}
                >
                  {errors.serviceName ?? "valid"}
                </span>
              </div>
            )}

            <div className="form_space">
              <label
                hmlFor="countries"
                className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
              >
                Product/Service Type
              </label>
              <select
                value={productType}
                onChange={(e) => {
                  setProductType(e.target.value);
                  setErrors({ ...errors, serviceType: null });
                }}
                id="countries"
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              >
                <option selected>select Type</option>
                {ProServTypeData?.length > 0 &&
                  ProServTypeData?.map((item, index) => (
                    <option key={item.id} value={item.id}>
                      {item.productp_service_type}
                    </option>
                  ))}
              </select>
              <span
                style={{
                  color: "#D14F4F",
                  fontSize: "13px",
                  opacity: errors.serviceType ? 1 : 0,
                }}
              >
                {errors.serviceType ?? "valid"}
              </span>
            </div>
            <div className="form_space">
              <label
                hmlFor="countries"
                className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
              >
                Revenue Recognition
              </label>
              <select
                value={revenueData}
                onChange={(e) => {
                  setRevenuData(e.target.value);
                  setErrors({ ...errors, revenueServ: null });
                }}
                id="countries"
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              >
                <option selected>Select Revenue</option>
                {Revenulist?.length > 0 &&
                  Revenulist?.map((item, index) => (
                    <option key={item.id} value={item.id}>
                      {item.revenue_type}
                    </option>
                  ))}
              </select>
              <span
                style={{
                  color: "#D14F4F",
                  fontSize: "13px",
                  opacity: errors.revenueServ ? 1 : 0,
                }}
              >
                {errors.revenueServ ?? "valid"}
              </span>
            </div>
          </DialogContent>
          <DialogActions>
            <div className="cancelButtonnewFolder">
              <button
                className="button-text-t submitclickData"
                onClick={handleCloseUpload}
              >
                Cancel
              </button>

              <button
                className="button-text-t submitclickData"
                onClick={(e) => handleFileSubmit(e)}
              >
                Submit
              </button>
            </div>
          </DialogActions>
        </div>
      </Dialog>
    </>
  );
};

export default ShowProductServices;
