import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardBody, Row, Col, Button } from "reactstrap";
import { useDispatch, useSelector } from "react-redux";
import swal from "sweetalert";
import { GetAddContractProductServiceAction ,AddContractAction} from "../../redux/actions/Admin-saasot-action";
 

import { Link ,useNavigate} from 'react-router-dom'

const AddContract = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [addfield, setAddfield] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [contractId, setContractId] = useState("");
  const [contractName, setContractName] = useState("");
  const [orderCloseDate, setOrderCloseDate] = useState("");
  const [billingMethod, setBillingMethod] = useState("");
  const [cancelDate, setCancelDate] = useState("");
  const [invoice, setInvoice] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [invoiceAddress, setInvoiceAddress] = useState("");
  const [invoiceinfo, setInvoiceinfo] = useState("");
  const [rerender, setRerender] = useState(false);
  const [errors, setErrors] = useState({
    nameCustomer: null,
    idContract: null,
    nameContract: null,
    invoiceE: null,
    invoiceDateE: null,
    itemFiledRe: null,
  });

  const {
    ProServData,
    loading: ProServDataLoading,
    error: ProServDataError,
  } = useSelector((state) => state.GetAddContractProductServiceReducer);

  useEffect(() => {
    dispatch(GetAddContractProductServiceAction());
  }, []);

  const [itemErrors, setItemErrors] = useState([
    {
      revenue_type_fristE: null,
      total_item_valueE: null,
      contract_statusE: null,
      pause_start_dateE: null,
      start_dateE: null,
      end_dateE: null,
      term_monthsE: null,
      arrE: null,
      item_description_notesE: null,
      quantityE: null,
      other_matric1E: null,
      other_matric2E: null,
      total_item_revenueE: null,
      amountE: null,
    },
  ]);

  const {
    AddContract,
    error: AddContractError,
    sucess: AddContractSuccess,
  } = useSelector((state) => state.AddContractReducer);


  const { error, userData } = useSelector((state) => state.authReducer);

  const handleAdd = () => {
    setAddfield([
      ...addfield,
      {
        revenue_type_frist: "",
        total_item_value: "",
        contract_status: "",
        pause_start_date: "",
        start_date: "",
        end_date: "",
        term_months: "",
        arr: "",
        item_description_notes: "",
        quantity: "",
        other_matric1: "",
        other_matric2: "",
        total_item_revenue: "",
        amount: "",
      },
    ]);
    setErrors({ ...errors, itemFiledRe: null });
    setItemErrors([
      ...itemErrors,
      {
        start_dateE: null,
        end_dateE: null,
        item_description_notesE: null,
        quantityE: null,
        total_item_revenueE: null,
      },
    ]);
  };

  const handleServiceChnge = (e, index, field_name) => {
    const { name, value } = e.target;
    const list = [...addfield];
    list[index][name] = value;
    setAddfield(list);
    let errorList = [...itemErrors];
    for (let i = 0; i < itemErrors.length; i++) {
      if (Object.keys(errorList[i]).indexOf(field_name) > -1) {
        errorList[index][field_name] = null;
      }
    }
    setItemErrors(errorList);
  };

  const handleAllApproverChnge = (e, index) => {
    const { name, value } = e.target;
    const list = [...addfield];
    let prevValue = list[index][name];
    list[index][name] = !prevValue;
    setAddfield(list);
  };

  const handleFileSubmit = (e) => {
    e.preventDefault();
    const tempErrors = {
      nameCustomer: !customerName && "Please Enter Customer Name",
      idContract: !contractId && "Please Enter Contract Id",
      nameContract: !contractName && "please Enter Contract Name",
      invoiceE: !invoice && "Please Enter invoice",
      invoiceDateE: !invoiceDate && "Please Enter Date",
      itemFiledRe: addfield.length < 1 && "Please Add items",
      methodBilling: !billingMethod && "Please Enter billing Methods"
    };
    setErrors(tempErrors);
    if (Object.values(tempErrors).filter((value) => value).length) {
      return;
    }
    validateSubmit();
  };

  const validateSubmit = () => {
    const tempErrors = [];

    for (let index = 0; index < addfield.length; index++) {

      tempErrors.push({
        start_dateE: !addfield[index].start_date
          ? "This field is mandatory"
          : null,
        end_dateE: !addfield[index]?.end_date
          ? "This field is mandatory"
          : null,
        item_description_notesE: !addfield[index].item_description_notes
          ? "This field is mandatory"
          : null,
        quantityE: !addfield[index].quantity ? "This field is mandatory" : null,
        total_item_revenueE: !addfield[index].total_item_revenue
          ? "This field is mandatory"
          : null,
      });
    }

    setItemErrors(tempErrors);

    for (let index = 0; index < tempErrors.length; index++) {
      let noError = Object.values(tempErrors[index]).every(
        (x) => x === null || x === ""
      );
      if (!noError) {
        window.scrollTo(0, 0);
        return;
      }
    }

    submitHandler();
  };

  const submitHandler = () => {
    let schoolArr = [];
    const formData = new FormData();
    for (var index = 0; index < addfield.length; index++) {
      schoolArr.push({
        item_description: addfield[index].item_description_notes,
        quantity: addfield[index].quantity,
        s_start_d: addfield[index].start_date,
        s_end_d: addfield[index].start_date,
        subscription_status:  addfield[index].contract_status,
        subscription_terms_month: addfield[index].term_months,
        arr: addfield[index].arr,
        total_revenue: addfield[index].total_item_revenue,
        amount: addfield[index].amount,
        productp_service: addfield[index].revenue_type_frist,
        sale_price: addfield[index].total_item_value,
        // "tansaction":  addfield[index].item_description_notes
      });
    }

    formData.append("items", JSON.stringify(schoolArr));
    formData.append("transaction_id", contractId);
    formData.append("customer_name", customerName);
    formData.append("transaction_name", contractName);
    formData.append("order_close_data", orderCloseDate);
    formData.append("billing_method", billingMethod);
    formData.append("cancel_date", cancelDate);
    formData.append("invoice_number", invoice);
    formData.append("invoice_adresss", invoiceAddress);
    formData.append("other_invoice_info", invoiceinfo);
    formData.append("user", userData?.user?.user_id);

    setRerender(true);
    dispatch(AddContractAction(formData));
  };

  useEffect(() => {
    if (AddContract && rerender) {
      swal({
        title: "SaaSot App",
        text: "Save  Successfully",
        className: "successAlert",
        icon: "https://flowbite.com/docs/images/logo.svg",
        buttons: false,
        timer: 3000,
        open: true,
      });
      navigate("/admin/contract-upload");
    }
    if (AddContractError && rerender) {
      swal({
        title: "Error",
        text: "SomeThing Wrong",
        className: "errorAlert",
        icon: "https://flowbite.com/docs/images/logo.svg",
        buttons: false,
        timer: 3000,
        
      });
      setRerender(false);
    }
  }, [dispatch, AddContract, AddContractError]);

  return (
    <>
    <div className="content removeheightclass">
    <div className="container back-button-forContract">
    <div class="Backdivsec">
      <Link to="/admin/Product/Service-update">
                  <button
                    className="button-text-t"
                  >
                   Back
                  </button>
                </Link>
                </div>
                </div>
                </div>
      <div className="content removeheightclass">
        <Row>
          <Col md="12">
            <Card className="card uploadebtn">
            
              <CardBody>
                <div className="container containeradddiv-new">
                  {/* <form> */}
                  <div className="grid gap-4 mb-4 md:grid-cols-2">
                    <div class="add-contractdiv">
                      <label
                        for="first_name"
                        className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                      >
                        Customer Name
                      </label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => {
                          setCustomerName(e.target.value);
                          setErrors({ ...errors, nameCustomer: null });
                        }}
                        id="first_name"
                        className="addinput bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                        placeholder="John"
                        autoComplete="off"
                        required
                      />
                      <span
                        style={{
                          color: "#D14F4F",
                          fontSize: "13px",
                          opacity: errors.nameCustomer ? 1 : 0,
                        }}
                      >
                        {errors.nameCustomer ?? "valid"}
                      </span>
                    </div>
                    <div>
                      <label
                        for="number"
                        className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                      >
                        Contract Unique ID
                      </label>
                      <input
                        type="number"
                        value={contractId}
                        onChange={(e) => {
                          setContractId(e.target.value);
                          setErrors({ ...errors, idContract: null });
                        }}
                        id="number"
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                        placeholder="123-45-678"
                        autoComplete="off"
                        required
                      />
                      <span
                        style={{
                          color: "#D14F4F",
                          fontSize: "13px",
                          opacity: errors.idContract ? 1 : 0,
                        }}
                      >
                        {errors.idContract ?? "valid"}
                      </span>
                    </div>
                    <div>
                      <label
                        for="last_name"
                        className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                      >
                        Contract Name
                      </label>
                      <input
                        type="text"
                        value={contractName}
                        onChange={(e) => {
                          setContractName(e.target.value);
                          setErrors({ ...errors, nameContract: null });
                        }}
                        id="last_name"
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                        placeholder="Doe"
                        autoComplete="off"
                        required
                      />
                      <span
                        style={{
                          color: "#D14F4F",
                          fontSize: "13px",
                          opacity: errors.nameContract ? 1 : 0,
                        }}
                      >
                        {errors.nameContract ?? "valid"}
                      </span>
                    </div>

                    <div>
                      <label
                        for="last_name"
                        className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                      >
                        Order Close Date
                      </label>
                      <input
                        type="date"
                        value={orderCloseDate}
                        onChange={(e) => setOrderCloseDate(e.target.value)}
                      
                      
                      
                        id="last_name"
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                        placeholder="Doe"
                        autoComplete="off"
                        required
                      />
                    </div>
                    <div className="Methodinput">
                      <label
                        for="countries"
                        className="Billing block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                      >
                        Billing Method
                      </label>
                      <select
                        id="countries"
                        value={billingMethod}
                        onChange={(e) => {
                          setBillingMethod(e.target.value)
                          setErrors({ ...errors, methodBilling: null });
                        }}
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                      >
                        <option selected>Select Method</option>
                        <option value="Invoice">Invoice</option>
                        <option value="Credit_Memo">Credit Memo</option>
                        {/* <option value="US">United States</option>
                          <option value="CA">Canada</option>
                          <option value="FR">France</option>
                          <option value="DE">Germany</option> */}
                      </select>
                      <span
                        style={{
                          color: "#D14F4F",
                          fontSize: "13px",
                          opacity: errors.methodBilling ? 1 : 0,
                        }}
                      >
                        {errors.methodBilling ?? "valid"}
                      </span>
                      
                    </div>
                    <div>
                      <label
                        for="last_name"
                        className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                      >
                        Cancel Date
                      </label>
                      <input
                        type="date"
                        value={cancelDate}
                        onChange={(e) => setCancelDate(e.target.value)}
                        id="last_name"
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                        placeholder="Doe"
                        autoComplete="off"
                        required
                      />
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>
      <div className="contentSecond">
        <Row>
          <Col md="12">
            <Card className="card">
              <CardBody>
                <div className="relative overflow-x-auto">
                  <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                      <tr className={addfield?.length > 0 ? "addcontaed" : "addcontaedsecond"}>
                        <th>
                          <p className ="addcontbl formo">ORDER FORM</p>
                        </th>
                        <th>
                        <p className ="addcontbl"> Product/Service</p>
                        </th>
                        <th>
                        <p className ="addcontbl"> Total Item Value</p>
                        </th>
                        <th>
                        <p className ="addcontbl">Contract Status</p>
                        </th>
                        <th>
                        <p className ="addcontbl">Pause Start date</p>
                        </th>
                        <th>
                        <p className ="addcontbl">Start date</p>
                        </th>
                        <th>
                        <p className ="addcontbl">  End Date</p>
                        </th>
                        <th>
                        <p className ="addcontbl"> Term (Months)</p>
                        </th>
                        <th>
                        <p className ="addcontbl"> ARR</p>
                        </th>
                        <th>
                        <p className ="addcontbl"> Item Description/Notes</p>
                        </th>
                        <th>
                        <p className ="addcontbl">Quantity</p>
                        </th>
                        <th>
                        <p className ="addcontbl"> Other Matric1</p>
                        </th>
                        <th>
                        <p className ="addcontbl"> Other Matric2</p>
                        </th>
                        <th>
                        <p className ="addcontbl"> Total Item Revenue Per Rec Policy</p>
                        </th>
                      </tr>
                    </thead>
                    {addfield?.map((item, index) => {
                      return (
                        <tbody key={index}>
                          <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 trsectioncutom">
                            <td
                              scope="row"
                              className="px-2 font-medium text-gray-900 whitespace-nowrap dark:text-white"
                            >
                            <p className="linediv">
                              Line Item {index + 1}
                              </p>
                            </td>
                            <td className="px-2 SelectBoxintable">
                              <div className="grid gap-4 md:grid-cols-2">
                                <div className="addselect">
                                  <select
                                    value={item.revenue_type_frist}
                                    onChange={(e) =>
                                      handleServiceChnge(
                                        e,
                                        index,
                                        "revenue_type_frist"
                                      )
                                    }
                                    name="revenue_type_frist"
                                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 revenuetypeclassdiv"
                                  >
                                    <option value="" selected>
                                      select
                                    </option>
                                    {ProServData?.length > 0 &&
                                      ProServData?.map((item, index) => (
                                        <option key={item.id} value={item.id}>
                                          {item.product_name}
                                        </option>
                                      ))}
                                  </select>
                                </div>
                              </div>
                            </td>
                            <td className="px-2">
                              <div className="nu-input-text">
                                <input
                                  type="number"
                                  value={item.total_item_value}
                                  onChange={(e) =>
                                    handleServiceChnge(
                                      e,
                                      index,
                                      "total_item_value"
                                    )
                                  }
                                  name="total_item_value"
                                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 inputfielduseintable"
                                  placeholder="12,000"
                                  required
                                />
                              </div>
                            </td>
                            <td className="px-2  ">
                            <div className="addcontractinput">
                              <select
                                value={item.contract_status}
                                onChange={(e) =>
                                  handleServiceChnge(
                                    e,
                                    index,
                                    "contract_status"
                                  )
                                }
                                name="contract_status"
                                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 statusdivclass"
                              >
                                


                                <option value="" selected>
                                  select
                                </option>
                                <option value="active" selected>
                                  Active
                                </option>
                                <option value="pending renewal" selected>
                                  Pending
                                </option>
                                <option value="cancelled" selected>
                                Cancelled
                                </option>
                              </select>
                              </div>
                            </td>
                            <td className="px-2">
                              <div className="flex items-center checkboxinput">
                                <input
                                  id="default-checkbox"
                                  type="checkbox"
                                  onClick={(e) =>
                                    handleAllApproverChnge(e, index)
                                  }
                                  name="pause_start_date"
                                  checked={item.pause_start_date}
                                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                />
                              </div>
                            </td>
                            <td className="px-2">
                              <div className="datetable">
                                <input
                                  type="date"
                                  value={item.start_date}
                                  name="start_date"
                                  onChange={(e) =>
                                    handleServiceChnge(e, index, "start_dateE")
                                  }
                                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 inputfielduseintable"
                                  placeholder="John"
                                  required
                                />
                                <span
                                  style={{
                                    color: "#D14F4F",
                                    opacity: itemErrors[index]?.start_dateE
                                      ? 1
                                      : 0,
                                  }}
                                >
                                  {itemErrors[index]?.start_dateE ?? "valid"}
                                </span>
                              </div>
                            </td>
                            <td className="px-2">
                              <div className="dateinput1">
                                <input
                                  type="date"
                                  value={item.end_date}
                                  name="end_date"
                                  onChange={(e) =>
                                    handleServiceChnge(e, index, "end_dateE")
                                  }
                                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white f:focus:ring-blue-500 dark:focus:border-blue-500 inputfielduseintable"
                                  placeholder="John"
                                  required
                                />
                                <span
                                  style={{
                                    color: "#D14F4F",
                                    opacity: itemErrors[index]?.end_dateE
                                      ? 1
                                      : 0,
                                  }}
                                >
                                  {itemErrors[index]?.end_dateE ?? "valid"}
                                </span>
                              </div>
                            </td>
                            <td className="px-2">
                              <div className="textinputsec">
                                <input
                                  type="text"
                                  value={item.term_months}
                                  name="term_months"
                                  onChange={(e) =>
                                    handleServiceChnge(e, index, "term_months")
                                  }
                                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 inputfielduseintable"
                                  placeholder="3245"
                                  required
                                />
                              </div>
                            </td>
                            <td className="px-2">
                              <div className="numberdiv">
                                <input
                                  type="number"
                                  value={item.arr}
                                  name="arr"
                                  onChange={(e) =>
                                    handleServiceChnge(e, index, "arr")
                                  }
                                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 inputfielduseintable"
                                  placeholder="453"
                                  required
                                />
                              </div>
                            </td>
                            <td className="px-2">
                            <div className="addconinput">
                                <input
                                  type="text"
                                  value={item.item_description_notes}
                                  name="item_description_notes"
                                  onChange={(e) =>
                                    handleServiceChnge(
                                      e,
                                      index,
                                      "item_description_notesE"
                                    )
                                  }
                                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 inputfielduseintable"
                                  placeholder="One year Subscription"
                                  required
                                />
                                <span
                                  style={{
                                    color: "#D14F4F",
                                    opacity: itemErrors[index]
                                      ?.item_description_notesE
                                      ? 1
                                      : 0,
                                  }}
                                >
                                  {itemErrors[index]?.item_description_notesE ??
                                    "valid"}
                                </span>
                              </div>
                            </td>
                            <td className="px-2">
                              <div>
                                <input
                                  type="number"
                                  value={item.quantity}
                                  name="quantity"
                                  onChange={(e) =>
                                    handleServiceChnge(e, index, "quantityE")
                                  }
                                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 inputfielduseintable"
                                  placeholder="100"
                                  required
                                />
                                <span
                                  style={{
                                    color: "#D14F4F",
                                    opacity: itemErrors[index]?.quantityE
                                      ? 1
                                      : 0,
                                  }}
                                >
                                  {itemErrors[index]?.quantityE ?? "valid"}
                                </span>
                              </div>
                            </td>
                            <td className="px-2">
                            <div className="addcontractdiv">
                                <input
                                  type="text"
                                  value={item.other_matric1}
                                  name="other_matric1"
                                  onChange={(e) =>
                                    handleServiceChnge(
                                      e,
                                      index,
                                      "other_matric1"
                                    )
                                  }
                                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 inputfielduseintable"
                                  placeholder="TBD"
                                  required
                                />
                              </div>
                            </td>
                            <td className="px-2 ">
                              <div className="addcontractdiv">
                                <input
                                  type="text"
                                  value={item.other_matric2}
                                  name="other_matric2"
                                  onChange={(e) =>
                                    handleServiceChnge(
                                      e,
                                      index,
                                      "other_matric2"
                                    )
                                  }
                                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 inputfielduseintable"
                                  placeholder="TBD"
                                  required
                                />
                              </div>
                            </td>
                            <td className="px-2">
                              <div>
                                <input
                                  type="number"
                                  value={item.total_item_revenue}
                                  name="total_item_revenue"
                                  onChange={(e) =>
                                    handleServiceChnge(
                                      e,
                                      index,
                                      "total_item_revenueE"
                                    )
                                  }
                                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 inputfielduseintable"
                                  placeholder="11,000.00"
                                  required
                                />
                                <span
                                  style={{
                                    color: "#D14F4F",
                                    opacity: itemErrors[index]
                                      ?.total_item_revenueE
                                      ? 1
                                      : 0,
                                  }}
                                >
                                  {itemErrors[index]?.total_item_revenueE ??
                                    "valid"}
                                </span>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      );
                    })}
                    <button onClick={handleAdd} className="button-text-t">
                      Add More
                    </button>
                  </table>
                  <span
                    style={{
                      color: "#D14F4F",
                      fontSize: "16px",
                      opacity: errors.itemFiledRe ? 1 : 0,
                    }}
                  >
                    {errors.itemFiledRe ?? "valid"}
                  </span>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>
      <div className="contentSecondThird removeheightclass">
        <Row>
          <Col md="12">
            <Card className="card secondThirdcord">
              <CardBody>
                <div className="grid gap-4 mb-4 md:grid-cols-5">
                  <div className="invoice"><h1 className="invoicetitle">Invoice 1</h1></div>
                  <div className=" addcontractdiv">
                    <label
                      for="Invoice"
                      className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                    >
                      Invoice#
                    </label>
                    <input
                      type="number"
                      value={invoice}
                      onChange={(e) => {
                        setInvoice(e.target.value);
                        setErrors({ ...errors, invoiceE: null });
                      }}
                      id="Invoice"
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                      placeholder="1234"
                      autoComplete="off"
                      required
                    />
                    <span
                      style={{
                        color: "#D14F4F",
                        fontSize: "13px",
                        opacity: errors.invoiceE ? 1 : 0,
                      }}
                    >
                      {errors.invoiceE ?? "valid"}
                    </span>
                  </div>
                  <div className="In-a-d">
                    <label
                      for="Invoice1"
                      className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                    >
                      Invoice Date
                    </label>
                    <input
                      type="date"
                      class
                      value={invoiceDate}
                      onChange={(e) => {
                        setInvoiceDate(e.target.value);
                        setErrors({ ...errors, invoiceDateE: null });
                      }}
                      id="Invoice1"
                      className="Invoice1input bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                      autoComplete="off"
                      required
                    />
                    <span
                      style={{
                        color: "#D14F4F",
                        fontSize: "13px",
                        opacity: errors.invoiceDateE ? 1 : 0,
                      }}
                    >
                      {errors.invoiceDateE ?? "valid"}
                    </span>
                  </div>
                  <div className="Invoicediv">
                    <label
                      for="Address"
                      className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                    >
                      Invoice Address
                    </label>
                    <input
                      type="text"
                      value={invoiceAddress}
                      onChange={(e) => setInvoiceAddress(e.target.value)}
                      id="Address"
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                      placeholder="TBD"
                      autoComplete="off"
                      required
                    />
                  </div>

                  <div className="Invoicediv">
                    <label
                      for="Info"
                      className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                    >
                      Other Invoice Info
                    </label>
                    <input
                      type="text"
                      id="Info"
                      value={invoiceinfo}
                      onChange={(e) => setInvoiceinfo(e.target.value)}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                      placeholder="TBD"
                      autoComplete="off"
                      required
                    />
                  </div>
                </div>

                <div className="relative overflow-x-auto">
                  <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                      <tr>
                        <th scope="col" className="px-6 py-3">
                          R.no
                        </th>
                        <th scope="col" className="px-6 py-3">
                          Description
                        </th>
                        <th scope="col" className="px-6 py-3">
                          Quantity
                        </th>
                        <th scope="col" className="px-6 py-3">
                          Subscription Start Date
                        </th>
                        <th scope="col" className="px-6 py-3">
                          Subcription End Date
                        </th>
                        <th scope="col" className="px-6 py-3">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    {addfield?.map((item, index) => {
                      return (
                        <tbody key={index}>
                          <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                            <th
                              scope="row"
                              className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"
                            >
                              Item {index + 1}
                            </th>
                            <td className="px-6 py-4 ">
                              <div>
                                <input
                                  type="text"
                                  value={item.item_description_notes}
                                  name="item_description_notes"
                                  onChange={(e) =>
                                    handleServiceChnge(
                                      e,
                                      index,
                                      "item_description_notes"
                                    )
                                  }
                                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 inputfielduseintable"
                                  placeholder="One year Subscription"
                                  required
                                />
                              </div>
                            </td>
                            <td className="px-6 py-4 ">
                              <div>
                                <input
                                  type="text"
                                  value={item.quantity}
                                  name="quantity"
                                  onChange={(e) =>
                                    handleServiceChnge(e, index, "quantity")
                                  }
                                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 inputfielduseintable"
                                  placeholder="100"
                                  required
                                />
                              </div>
                            </td>
                            <td className="px-6 py-4 ">
                              <div>
                                <input
                                  type="date"
                                  value={item.start_date}
                                  name="start_date"
                                  onChange={(e) =>
                                    handleServiceChnge(e, index, "start_date")
                                  }
                                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 inputfielduseintable"
                                  placeholder="John"
                                  required
                                />
                              </div>
                            </td>
                            <td className="px-6 py-4 ">
                              <div>
                                <input
                                  type="date"
                                  value={item.end_date}
                                  name="end_date"
                                  onChange={(e) =>
                                    handleServiceChnge(e, index, "end_date")
                                  }
                                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white f:focus:ring-blue-500 dark:focus:border-blue-500 inputfielduseintable"
                                  placeholder="John"
                                  required
                                />
                              </div>
                            </td>
                            <td className="px-6 py-4 ">
                              <div>
                                <input
                                  type="number"
                                  value={item.amount}
                                  name="amount"
                                  onChange={(e) =>
                                    handleServiceChnge(e, index, "amount")
                                  }
                                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 inputfielduseintable"
                                  placeholder="12000 454545454545"
                                  required
                                />
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      );
                    })}
                  </table>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>
      <div className="cancelButtonnewFolder">
        <button
          class="button-text-t uploadfilessubmitbtn"
          onClick={(e) => handleFileSubmit(e)}
        >
          Submit
        </button>
      </div>
    </>
  );
};

export default AddContract;
