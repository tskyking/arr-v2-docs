import React, { useEffect, useState, useRef } from "react";
import { Card, CardHeader, CardBody, Row, Col, Button } from "reactstrap";
import { useDispatch, useSelector } from "react-redux";
import { MDBDataTable, MDBTableFoot, MDBTableBody } from "mdbreact";
import CanvasJSReact from "@canvasjs/react-charts";
import { Link } from "react-router-dom";
import swal from "sweetalert";
import { Modal } from "react-bootstrap";

import {
  ContractScreenAction,
  ContractUpdateAction,
  Customerinvoicelist,
} from "../../redux/actions/Admin-saasot-action";
// first_Table_3
const CustomerScreen = ({ history }) => {
  const CanvasJS = CanvasJSReact.CanvasJS;
  const CanvasJSChart = CanvasJSReact.CanvasJSChart;
  const [selectedColor, setSelectedColor] = useState(null);
  const [lineColor, setlineColor] = useState(null);
  const [revenue, setrevenue] = useState("");
  const [selectedOption, setSelectedOption] = useState("");
  const resizableRef = useRef(null);
  const chartContainerRef = useRef(null);
  const [usersForRender1, setUsersForRender1] = useState([]);
  const [usersForRender3, setUsersForRender3] = useState([]);
  const [showColumn, setShowColumn] = useState(false);
  const [hardwareShowColumn, setHardwareShowColumn] = useState(false);
  const [impShowColumn, setImpShowColumn] = useState(false);
  const [namedynamic, setnamedynamic] = useState([]);
  const [namedynamicvalue, setnamedynamicvalue] = useState([]);
  const [showData, setShowData] = useState([]);
  const [showDateForArr, setShowDateForArr] = useState([]);
  const [storeid, setnewid] = useState();
  const [selectedname, setselectedname] = useState();
  const [shwoBilling, setShowBilling] = useState([]);
  const [shwoDefRev, setShowDefRev] = useState([]);
  const [editedValues, setEditedValues] = React.useState({}); // Initialize editedValues as state
  const [editedValues1, setEditedValues1] = React.useState({}); // Initialize editedValues as state
  // ------------------------------------FOR BILLING-------------------------------------
  const [showBillingSub, setshowBillingSub] = useState(false);
  const [showBillingHard, setshowBillingHard] = useState(false);
  // -------------------------------------------DEF REVENU----------------------------------------
  const [showDefRevSub, setShowDefRevSub] = useState(false);
  const [showDefRevHard, setShowDefRevHard] = useState(false);
  const [showids, setshowids] = useState([]);

  // ----------------------------------for Revnue heading state-----------------------------------
  const [expandedColumns, setExpandedColumns] = useState([]);
  const [expandedColumnsTotalArr, setExpandedColumnsTotalArr] = useState([]);
  const [expandedColumnsTotalRevenue, setExpandedColumnsTotalRevenue] =
    useState([]);
  const [expandedBilling, setExpandedBilling] = useState([]);
  const [expandedDef, setExpandedDef] = useState([]);
  const [name, setname] = useState();
  // -------------------------------------------------Row Apend------------------------------------
  const [rowCount, setRowCount] = useState(1);
  const [columnCount, setColumnCount] = useState(namedynamic?.length);
  const [showColumn2, setShowColumn2] = useState([]);
  const [newRowDates, setNewRowDates] = useState([]);

  const dispatch = useDispatch();

  function formatCustomerName(name) {
    return name.replace(/_/g, " ");
  }

  const url = window.location.href;
  const path = new URL(url).pathname;
  const ids = path.split("/").pop().split(",");

  useEffect(() => {
    let a = localStorage.getItem("selectedoption");
    setSelectedOption(a);
  }, []);

  const {
    ContractScreen,
    loading: ContractScreenLoading,
    error: ContractScreenError,
  } = useSelector((state) => state.ContractScreenReducer);

  const { success: statuschanges } = useSelector(
    (state) => state.ContractUpdateReducer
  );

  const { Invoicecustomerlist } = useSelector(
    (state) => state.InvoicelistReducer
  );

  const { error, success: successfullyupdated } = useSelector(
    (state) => state.ContractUpdateReducer
  );

  useEffect(() => {
    let name = localStorage.getItem("name");

    setname(name);
  }, []);

  useEffect(() => {
    if (ids && selectedOption) {
      dispatch(Customerinvoicelist(ids, selectedOption));
    }
  }, [name]);

  useEffect(() => {
    if (error?.message) {
      swal(error?.message);
      dispatch(ContractScreenAction(ids, selectedOption));
    }
  }, [error, selectedOption]);

  useEffect(() => {
    if (successfullyupdated) {
      swal("Succesfully Uploaded");
      dispatch(ContractScreenAction(ids, selectedOption));
    }
  }, [successfullyupdated]);

  useEffect(() => {
    if (ids && selectedOption) {
      dispatch(ContractScreenAction(ids, selectedOption));
    }
  }, [selectedOption, statuschanges]);

  const handleAddColumn = (name) => {
    const isExpanded = expandedColumns.includes(name);
    const updatedExpandedColumns = isExpanded
      ? expandedColumns.filter((column) => column !== name)
      : [...expandedColumns, name];
    setExpandedColumns(updatedExpandedColumns);
  };

  const handleAddColumnTotalArr = (name) => {
    handleLenghtGet(name);
    const isExpanded = expandedColumnsTotalArr.includes(name);
    const updatedExpandedColumns = isExpanded
      ? expandedColumnsTotalArr.filter((column) => column !== name)
      : [...expandedColumnsTotalArr, name];
    setExpandedColumnsTotalArr(updatedExpandedColumns);
  };

  const handleAddColumnBilling = (name) => {
    const isExpanded = expandedBilling.includes(name);
    const updatedExpandedColumns = isExpanded
      ? expandedBilling.filter((column) => column !== name)
      : [...expandedBilling, name];
    setExpandedBilling(updatedExpandedColumns);
  };

  const handleAddColumnDef = (name) => {
    const isExpanded = expandedDef.includes(name);
    const updatedExpandedColumns = isExpanded
      ? expandedDef.filter((column) => column !== name)
      : [...expandedDef, name];
    setExpandedDef(updatedExpandedColumns);
  };

  const toggleShowColumn = () => {
    setShowColumn((prevShowColumn) => !prevShowColumn);
  };
  const handleImpAddColumn = () => {
    setImpShowColumn(!impShowColumn);
  };
  const handleHardwareAddColumn = () => {
    setHardwareShowColumn(!hardwareShowColumn);
  };
  // --------------------------------------------------FOR REVENU TABLE-----------------------------------
  useEffect(() => {
    if (ContractScreen) {
      let myData = [];

      let months = ContractScreen?.months; //use this array

      // Extract the keys from the data and store them in namedynamic state
      const keys = ContractScreen?.tables_headings?.map(
        (item) => Object.keys(item)[0]
      );
      setnamedynamic(keys);
      setnamedynamicvalue(ContractScreen?.tables_headings);
      // let arrayArr = [];
      let arrayTotalRev = []; //use this array
      let arrayTotal = []; //use this array
      let arrTotalCumilativeRevenue = []; //use this array
      // let arrayHardware = [];
      // let arraySubscriptionRev = [];

      // ================== ARR =====================
      for (let index = 0; index < months?.length; index++) {
        // ------------------------------this code usefull----------------------------------------------------
        if (ContractScreen?.total_arr[index]?.date) {
          if (ContractScreen?.total_arr[index]?.date === months[index]) {
            arrayTotal.push(ContractScreen?.total_arr[index]?.value);
          } else {
            arrayTotal.push(0.0);
          }
        } else {
          arrayTotal.push(0.0);
        }

        if (ContractScreen?.total_revenue[index]?.date) {
          if (ContractScreen?.total_revenue[index]?.date === months[index]) {
            arrayTotalRev.push(ContractScreen?.total_revenue[index]?.value);
          } else {
            arrayTotalRev.push(0.0);
          }
        } else {
          arrayTotalRev.push(0.0);
        }

        // ------------------------------this code usefull----------------------------------------------------
        if (ContractScreen?.total_cumilative_revenue[index]?.date) {
          if (
            ContractScreen?.total_cumilative_revenue[index]?.date ===
            months[index]
          ) {
            arrTotalCumilativeRevenue.push(
              ContractScreen?.total_cumilative_revenue[index]?.value
            );
          } else {
            arrTotalCumilativeRevenue.push(0.0);
          }
        } else {
          arrTotalCumilativeRevenue.push(0.0);
        }
      }
      setShowDateForArr(months);
      setShowData({
        months: months,
        // arr: arrayArr,
        tatalRevenue: arrayTotalRev,
        cumilativeRevenue: arrTotalCumilativeRevenue,
        totalArr: arrayTotal,
        // SubscriptionData: arraySubscriptionRev,
        // HardwareData: arrayHardware,
      });
    }
  }, [ContractScreen]);

  useEffect(() => {
    if (ContractScreen) {
      let myData = [];

      let months = ContractScreen?.months; //use this array
      let name = ContractScreen?.tables_headings;

      let total = ContractScreen?.total_items_rev;
    }
  }, [ContractScreen]);

  // ----------------------------------------------FOR BILLING TABLE------------------------
  useEffect(() => {
    if (ContractScreen) {
      let myData = [];
      // let myData.push({'arr': arrayArr, 'gjhg':})

      let months = ContractScreen?.months;
      let hardwareBill = [];
      let Subscriptionbill = [];
      let TotalBill = [];
      let cumilativebill = [];

      // ================== ARR =====================
      for (let index = 0; index < months?.length; index++) {
        // ----------------------------------FOR HAREWARE BILLING---------------------------------------------

        // -------------------------------------------FOR SUBSCRIPTION BILLING---------------------------------------------

        // -------------------------------FOR TOTAL BILLING-----------------------------------------------------------------
        if (ContractScreen?.total_billing?.[index]?.date) {
          if (ContractScreen?.total_billing?.[index]?.date === months[index]) {
            TotalBill.push(ContractScreen?.total_billing?.[index]?.value);
          } else {
            TotalBill.push(0.0);
          }
        } else {
          TotalBill.push(0.0);
        }

        // -------------------------------FOR TOTAL CUMILATIVE-----------------------------------------------------------------

        if (ContractScreen?.total_cumilative_billing[index]?.date) {
          if (
            ContractScreen?.total_cumilative_billing[index]?.date ===
            months[index]
          ) {
            cumilativebill.push(
              ContractScreen?.total_cumilative_billing[index]?.value
            );
          } else {
            cumilativebill.push(0.0);
          }
        } else {
          cumilativebill.push(0.0);
        }
      }

      setShowBilling({
        months: months,
        hardwareBilling: hardwareBill,
        subscriptionBillig: Subscriptionbill,
        totalBilling: TotalBill,
        cumilativebilling: cumilativebill,
      });
    }
  }, [ContractScreen]);

  // --------------------------------------------------FOR DEF REVENU TABLE------------------------------------
  useEffect(() => {
    if (ContractScreen) {
      let myData = [];
      let months = ContractScreen?.months;
      let headingshow = ContractScreen?.tables_headings;
      let hardwareBill = [];
      let Subscriptionbill = [];
      let balanceArr = [];

      // ================== ARR =====================
      for (let index = 0; index < months?.length; index++) {
        // ----------------------------------FOR HAREWARE BILLING---------------------------------------------

        // -------------------------------------------FOR SUBSCRIPTION BILLING---------------------------------------------

        // -------------------------------FOR balance BILLING-----------------------------------------------------------------

        if (ContractScreen?.balance?.[index]?.date) {
          if (ContractScreen?.balance?.[index]?.date === months[index]) {
            balanceArr.push(ContractScreen?.balance?.[index]?.value);
          } else {
            balanceArr.push(0.0);
          }
        } else {
          balanceArr.push(0.0);
        }
      }

      setShowDefRev({
        months: months,
        hardwareBilling: hardwareBill,
        subscriptionBillig: Subscriptionbill,
        balance: balanceArr,
      });
    }
  }, [ContractScreen]);

  // --------------------------------------------FOR BILLING-----------------------------------
  const handleShowSubBiling = () => {
    setshowBillingSub(!showBillingSub);
  };

  const handleShowHardBiling = () => {
    setshowBillingHard(!showBillingHard);
  };
  // ----------------------------------------------DEF REVENUE--------------------------------------

  const handleShowDefRevSub = () => {
    setShowDefRevSub(!showDefRevSub);
  };
  const handleShowDefRevHard = () => {
    setShowDefRevHard(!showDefRevHard);
  };

  // const renderNewColumn = (name) => {
  //   const newData = ContractScreen?.data[0]?.add_on[name] || []; // Access the new data based on the name
  //   return (
  //     <>
  //       {newData.map((item, index) => (
  //         <th
  //           key={index}
  //           scope="col"
  //           className="border border-slate-300 px-6 py-4"
  //         >
  //           <Link to={`/contract-screen/${item.tansaction}`}>
  //             Transaction {item?.tansaction}, Line Item {index + 1}
  //             Total {item?.total_revenue}
  //           </Link>
  //         </th>
  //       ))}
  //     </>
  //   );
  // };

  const renderNewColumn = (name) => {
    const newData = ContractScreen?.data;

    return (
      <>
        {newData &&
          newData?.map((item, index) => {
            const newdataArr = item?.add_on[name] || [];
            if (newdataArr.length < 1) {
              return null; // Skip this iteration
            }
            return (
              <React.Fragment key={index}>
                {newdataArr?.map((itemData, index_) => {
                  return (
                    <tr key={index_}>
                      <th
                        scope="col"
                        className="border border-slate-300 px-6 py-4"
                      >
                        <Link
                          to={`/contract-screen/${itemData.tansaction}`}
                          className="linkColor"
                        >
                          Transaction {itemData?.tansaction}, Line Item{" "}
                          {index + 1}
                          Total {itemData?.total_revenue}
                        </Link>
                      </th>

                      <>
                        {showDateForArr?.map((elemItem, indexItem) => {
                          return (
                            <>
                              {renderNewColumnRowsRevenue(
                                name,
                                elemItem,
                                indexItem,
                                item,
                                itemData
                              )}
                            </>
                          );
                        })}
                      </>
                    </tr>
                  );
                })}
              </React.Fragment>
            );
          })}
      </>
    );
  };

  const renderNewColumnTotalArr = (name) => {
    // const newData = ContractScreen?.data[0]?.add_on[name] || []; // Access the new data based on the name
    const newData = ContractScreen?.data;

    return (
      <>
        {newData?.map((item, index) => {
          const newdataArr = item?.add_on[name] || [];
          return (
            <>
              <tr>
                {newdataArr?.map((itemData, index_) => (
                  <th className="border border-slate-300 px-6 py-4">
                    <Link
                      to={`/contract-screen/${itemData.tansaction}`}
                      className="linkColor"
                    >
                      Transaction {itemData?.tansaction}, Line Item {index + 1}{" "}
                      Total {itemData?.total_revenue}
                    </Link>
                  </th>
                ))}
                {showDateForArr?.map((elemItem, indexItem) => (
                  <td>
                    {renderNewColumnRowsARRArr(name, elemItem, indexItem, item)}
                  </td>
                ))}
              </tr>
            </>
          );
        })}
      </>
    );
  };

  const renderNewColumnBilling = (name) => {
    const newData = ContractScreen?.data;

    return (
      <>
        {newData &&
          newData?.map((item, index) => {
            const newdataArr = item?.add_on[name] || [];
            if (newdataArr.length < 1) {
              return null; // Skip this iteration
            }
            return (
              <React.Fragment key={index}>
                {newdataArr?.map((itemData, index_) => {
                  return (
                    <tr key={index_}>
                      <th
                        key={index}
                        scope="col"
                        className="border border-slate-300 px-6 py-4"
                      >
                        <Link
                          to={`/contract-screen/${item.tansaction}`}
                          className="linkColor"
                        >
                          Transaction {item?.tansaction}, Line Item {index + 1}
                        </Link>
                      </th>

                      <>
                        {shwoBilling?.months?.map((elemItem, indexItem) => {
                          return (
                            <>
                              {renderNewColumnRowsBilling(
                                name,
                                elemItem,
                                indexItem,
                                item,
                                itemData
                              )}
                            </>
                          );
                        })}
                      </>
                    </tr>
                  );
                })}
              </React.Fragment>
            );
          })}
      </>
    );

    // return ContractScreen?.data?.map((ContractScreen_, dataIndex) => {
    //   const newData = ContractScreen_?.add_on[name] || [];
    //   return newData?.map((item, index) => (
    //     <th
    //       key={index}
    //       scope="col"
    //       className="border border-slate-300 px-6 py-4"
    //     >
    //       <Link to={`/contract-screen/${item.tansaction}`}>
    //         Transaction {item?.tansaction}, Line Item {index + 1}
    //       </Link>
    //     </th>
    //   ));
    // });
  };

  const renderNewColumnDef = (name) => {
    const newData = ContractScreen?.data;

    return (
      <>
        {newData &&
          newData?.map((item, index) => {
            const newdataArr = item?.add_on[name] || [];
            if (newdataArr.length < 1) {
              return null; // Skip this iteration
            }
            return (
              <React.Fragment key={index}>
                {newdataArr?.map((itemData, index_) => {
                  return (
                    <tr key={index_}>
                      <th
                        key={index}
                        scope="col"
                        className="border border-slate-300 px-6 py-4"
                      >
                        <Link
                          to={`/contract-screen/${item.tansaction}`}
                          className="linkColor"
                        >
                          Transaction {item?.tansaction}, Line Item {index + 1}
                        </Link>
                      </th>

                      <>
                        {shwoDefRev?.months?.map((elemItem, indexItem) => {
                          return (
                            <>
                              {renderNewColumnRowsBallace(
                                name,
                                elemItem,
                                indexItem,
                                item,
                                itemData
                              )}
                            </>
                          );
                        })}
                      </>
                    </tr>
                  );
                })}
              </React.Fragment>
            );
          })}
      </>
    );

    // return ContractScreen?.data?.map((ContractScreen_, dataIndex) => {
    //   const newData = ContractScreen_?.add_on[name] || [];
    //   return newData?.map((item, index) => (
    //     <th
    //       key={index}
    //       scope="col"
    //       className="border border-slate-300 px-6 py-4"
    //     >
    //       <Link to={`/contract-screen/${item.tansaction}`}>
    //         Transaction {item?.tansaction}, Line Item {index + 1}
    //       </Link>
    //     </th>
    //   ));
    // });
  };

  // const renderNewColumnDef = (name) => {
  //   return ContractScreen?.data?.map((ContractScreen_, dataIndex) => {
  //     const newData = ContractScreen_?.add_on[name] || [];

  //     return newData?.map((item, index) => (
  //       <th
  //         key={index}
  //         scope="col"
  //         className="border border-slate-300 px-6 py-4"
  //       >
  //         <Link to={`/contract-screen/${item.tansaction}`}>
  //           Transaction {item?.tansaction}, Line Item {index + 1}
  //         </Link>
  //       </th>
  //     ));
  //   });
  // };

  // -------------------------------------------final code is working-------------------------------------
  const [contractScreen, setContractScreen] = useState([]);

  const [inputValues, setInputValues] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [password, setPassword] = useState("");

  const renderNewColumnRows = (name, elemItem, indexItem) => {
    const newData = ContractScreen?.data[0]?.add_on[name] || [];

    return newData?.map((item, index) => {
      let value = "0";
      let textColor = "black";
      if (item.revenue && item.revenue.revenue) {
        const revenueItem = item.revenue.revenue.find(
          (rev) => rev.date === elemItem
        );
        if (revenueItem) {
          value = revenueItem.value.toFixed(2);
          const status = revenueItem.status;
          if (status === "red") {
            textColor = "red"; // Set text color to red if the status is "red"
          }
        }
      } else if (item.amount) {
        value = item.amount;
      }

      const handleValueChange = (newValue, index) => {
        if (typeof index !== "undefined") {
          setnewid(newData[index]?.revenue?.id);
        }
        const updatedData = [...newData];
        const revenueItem = updatedData[index]?.revenue?.revenue?.find(
          (rev) => rev.date === elemItem
        );
        if (revenueItem) {
          revenueItem.value = parseFloat(newValue);
          // Update the ContractScreen data
          setContractScreen({ ...ContractScreen, data: updatedData });

          // Calculate the total value before stringifying
          const totalValue = updatedData[index].revenue.revenue.reduce(
            (total, item) => total + item.value,
            0
          );

          // Stringify the updated data
          const a = JSON.stringify(updatedData[index].revenue.revenue);
          setrevenue(a);
        }
      };

      const handleKeyPress = (e) => {
        if (e.key === "Enter") {
          setShowModal(true);
        }
      };

      const handleSubmit = () => {
        // Perform the delete operation
        const formData = new FormData();
        formData.append("revenue", revenue);
        formData.append("password", password);

        dispatch(ContractUpdateAction(formData, storeid));
        // ...
        handleClose();
      };

      const handleClose = () => {
        setShowModal(false);
        setPassword("");
      };

      return (
        <>
          <td
            key={`${name}_${elemItem}_${index}`}
            className="border border-slate-300 whitespace-nowrap px-6 py-4"
          >
            <input
              type="number"
              value={value}
              onChange={(e) => handleValueChange(e.target.value, index)}
              onKeyDown={handleKeyPress}
              style={{ color: textColor }}
            />
          </td>

          <Modal show={showModal} onHide={handleClose}>
            <Modal.Header closeButton>
              <Modal.Title>Enter Password</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <input
                className="passinput"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSubmit}>
                Submit
              </Button>
            </Modal.Footer>
          </Modal>
        </>
      );
    });
  };

  const [renderData, setRenderData] = useState();

  const renderNewColumnRowsARRArr = (
    name,
    elemItem,
    indexItem,
    dataContractScreen_
  ) => {
    const newData = dataContractScreen_?.add_on[name] || [];
    newRowDates.forEach((newDate) => {
      if (
        !newData.some((item) =>
          item.item_arr.arr.some((rev) => rev.date === newDate)
        )
      ) {
        newData.forEach((item) => {
          const arr =
            item.item_arr && item.item_arr.arr ? item.item_arr.arr : [];

          arr.push({
            date: newDate,
            value: 0,
            update: true,
          });

          item.item_arr = {
            ...item.item_arr,
            arr: arr,
          };
        });
      }
    });

    const newDataCopy = newData?.map((item) => {
      const arr = item.item_arr && item.item_arr.arr ? item.item_arr.arr : [];
      const revenueItem = arr.find((rev) => rev.date === elemItem);
      if (!revenueItem) {
        arr.push({
          date: elemItem,
          value: 0,
          update: true,
        });
      }
      return {
        ...item,
        item_arr: {
          ...item.item_arr,
          arr: arr,
        },
      };
    });

    return newDataCopy?.map((item, index) => {
      let value = 0;
      let pending_arr_cls = "";

      if (item.item_arr && item.item_arr.arr) {
        const revenueItem = item.item_arr.arr.find(
          (rev) => rev.date === elemItem
        );

        if (revenueItem) {
          value = revenueItem.value.toFixed(2);
        }
        pending_arr_cls = revenueItem.pending_arr;
      } else if (item.amount) {
        value = item.amount.toFixed(2);
      }

      const handleValueChange = (e, index) => {
        const newValue = e.target.value;

        if (typeof index !== "undefined") {
          setnewid(newData[index]?.item_arr?.id);
        }

        const updatedData = [...newData];
        const revenueItem = updatedData[index]?.item_arr?.arr?.find(
          (rev) => rev.date === elemItem
        );
        if (revenueItem) {
          const parsedValue = parseFloat(newValue);
          if (!isNaN(parsedValue)) {
            revenueItem.value = Number(parsedValue.toFixed(2));
            revenueItem.update = true;
          } else {
            revenueItem.value = newValue;
            revenueItem.update = true;
          }
          revenueItem.pending_arr = revenueItem.pending_arr;

          setContractScreen({ ...ContractScreen, data: updatedData });
          const a = JSON.stringify(updatedData[index].item_arr.arr);
          console.log(a);
          const parsedData = JSON.parse(a);

          // Calculate the total value
          const totalValue = parsedData.reduce(
            (total, item) => total + item.value,
            0
          );
          console.log("Total Value:", totalValue);
          setrevenue(a);
        }
      };

      const handleKeyPress = (e) => {
        if (e.key === "Enter") {
          setShowModal(true);
        }
      };

      const handleSubmit = () => {
        const formData = new FormData();
        formData.append("arr", revenue);
        formData.append("password", password);

        dispatch(ContractUpdateAction(formData, storeid));
        handleClose();
      };

      const handleClose = () => {
        setShowModal(false);
        setPassword("");
      };

      return (
        <React.Fragment key={`${name}_${elemItem}_${index}`}>
          {/* <td className="border border-slate-300 whitespace-nowrap px-6 py-4"> */}
          <input
            type="number"
            value={value}
            onChange={(e) => handleValueChange(e, index)}
            onKeyDown={handleKeyPress}
            className={
              pending_arr_cls
                ? pending_arr_cls + " arr-input-pending-arr"
                : "arr-input"
            }
          />
          {/* </td> */}

          <Modal show={showModal} onHide={handleClose}>
            <Modal.Header closeButton>
              <Modal.Title>Enter Password</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <input
                className="passwordsec"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSubmit}>
                Submit
              </Button>
            </Modal.Footer>
          </Modal>
        </React.Fragment>
      );
    });
  };

  const renderNewColumnRowsRevenue = (
    name,
    elemItem,
    indexItem,
    ContractScreen_,
    itemData_
  ) => {
    const newData = ContractScreen_?.add_on[name] || [];
    newRowDates.forEach((newDate) => {
      if (
        !newData.some((item) =>
          item.revenue.revenue.some((rev) => rev.date === newDate)
        )
      ) {
        newData.forEach((item) => {
          const revenue =
            item.revenue && item.revenue.revenue ? item.revenue.revenue : [];

          revenue.push({
            date: newDate,
            value: 0,
            update: true,
          });

          item.revenue = {
            ...item.revenue,
            revenue: revenue,
          };
        });
      }
    });

    const newDataCopy = [];

    const revenue =
      itemData_.revenue && itemData_.revenue.revenue
        ? itemData_.revenue.revenue
        : [];
    const revenueItem = revenue.find((rev) => rev.date === elemItem);
    if (!revenueItem) {
      revenue.push({
        date: elemItem,
        value: 0,
        update: true,
      });
    }
    newDataCopy.push({
      ...itemData_,
      revenue: {
        ...itemData_.revenue,
        revenue: revenue,
      },
    });

    // const newDataCopy = newData?.map((item) => {
    //   const revenue =
    //     item.revenue && item.revenue.revenue ? item.revenue.revenue : [];
    //   const revenueItem = revenue.find((rev) => rev.date === elemItem);
    //   if (!revenueItem) {
    //     revenue.push({
    //       date: elemItem,
    //       value: 0,
    //       update: true,
    //     });
    //   }
    //   return {
    //     ...item,
    //     revenue: {
    //       ...item.revenue,
    //       revenue: revenue,
    //     },
    //   };
    // });

    return newDataCopy?.map((item, index) => {
      let value = 0;

      if (item.revenue && item.revenue.revenue) {
        const revenueItem = item.revenue.revenue.find(
          (rev) => rev.date === elemItem
        );

        if (revenueItem) {
          value = revenueItem.value.toFixed(2);
        }
      } else if (item.amount) {
        value = item.amount.toFixed(2);
      }

      const handleValueChange = (e, index) => {
        const newValue = e.target.value;

        if (typeof index !== "undefined") {
          setnewid(newData[index]?.revenue?.id);
        }

        const updatedData = [...newData];
        const revenueItem = updatedData[index]?.revenue?.revenue?.find(
          (rev) => rev.date === elemItem
        );
        if (revenueItem) {
          const parsedValue = parseFloat(newValue);
          if (!isNaN(parsedValue)) {
            revenueItem.value = Number(parsedValue.toFixed(2));
            revenueItem.update = true;
          } else {
            revenueItem.value = newValue;
            revenueItem.update = true;
          }
          setContractScreen({ ...ContractScreen, data: updatedData });
          const a = JSON.stringify(updatedData[index].revenue.revenue);
          setrevenue(a);
        }
      };

      const handleKeyPress = (e) => {
        if (e.key === "Enter") {
          setShowModal(true);
        }
      };

      const handleSubmit = () => {
        const formData = new FormData();
        formData.append("revenue", revenue);
        formData.append("password", password);

        dispatch(ContractUpdateAction(formData, storeid));
        handleClose();
      };

      const handleClose = () => {
        setShowModal(false);
        setPassword("");
      };

      return (
        <React.Fragment key={`${name}_${elemItem}_${index}`}>
          <td className="border border-slate-300 whitespace-nowrap px-6 py-4">
            <input
              type="number"
              value={value}
              onChange={(e) => handleValueChange(e, index)}
              onKeyDown={handleKeyPress}
            />
          </td>

          <Modal show={showModal} onHide={handleClose}>
            <Modal.Header closeButton>
              <Modal.Title>Enter Password</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <input
                className="passwordsec"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSubmit}>
                Submit
              </Button>
            </Modal.Footer>
          </Modal>
        </React.Fragment>
      );
    });
  };

  // Assuming 'revenue' is a string

  const renderNewTotalArr = (
    name,
    elemItem,
    indexItem,
    editedValues,
    setEditedValues
  ) => {
    const newData = ContractScreen?.data[0]?.add_on[name] || [];

    const handleInputChange = (event, itemIndex) => {
      const newValue = event.target.value;
      setEditedValues((prevState) => ({
        ...prevState,
        [itemIndex]: newValue,
      }));
    };

    const rows = [];
    for (let index = 0; index < newData.length; index++) {
      const item = newData[index];
      let value = "0.0";

      if (item.item_arr && item.item_arr.arr) {
        const revenueItem = item.item_arr.arr.find(
          (rev) => rev.date === elemItem
        );
        if (revenueItem) {
          value = revenueItem.value.toFixed(2);
        }
      } else if (item.amount) {
        value = item.amount.toFixed(2);
      }

      const subscriptionKey = `subscription_${elemItem}_${index}`;
      const subscriptionValue =
        item && item.hasOwnProperty(subscriptionKey)
          ? item[subscriptionKey]
          : 0;

      const itemIndex = `${name}_${elemItem}_${index}`;
      const isEditable = Boolean(editedValues[itemIndex]);

      rows.push(
        <td
          key={itemIndex}
          className="border border-slate-300 whitespace-nowrap px-6 py-4"
        >
          {isEditable ? (
            <input
              type="text"
              value={editedValues[itemIndex]}
              onChange={(event) => handleInputChange(event, itemIndex)}
              className="editable-input"
            />
          ) : (
            <span
              onClick={() =>
                setEditedValues((prevState) => ({
                  ...prevState,
                  [itemIndex]: value,
                }))
              }
            >
              {subscriptionValue !== undefined ? subscriptionValue : "N/A"}
            </span>
          )}
        </td>
      );
    }

    return <>{rows}</>;
  };

  const renderNewColumnRowsBilling = (
    name,
    elemItem,
    indexItem,
    item_,
    itemData
  ) => {
    let value = "0.0";
    if (itemData.billing && itemData.billing.billing) {
      const revenueItem = itemData.billing.billing.find(
        (rev) => rev.date === elemItem
      );
      if (revenueItem) {
        value = revenueItem.value.toFixed(2);
      }
    } else if (itemData.amount) {
      value = itemData.amount.toFixed(2);
    }

    return (
      <td
        key={`${name}_${elemItem}_${indexItem}`}
        className="border border-slate-300 whitespace-nowrap px-6 py-4"
      >
        {value}
      </td>
    );
  };

  // const renderNewColumnRowsBilling = (name, elemItem, indexItem) => {
  //   // const newData = ContractScreen?.data[0]?.add_on[name] || [];
  //   const newData = ContractScreen?.data[0]?.add_on[name] || [];

  //   return newData.map((item, index) => {
  //     let value = "0.0";
  //     if (item.billing.billing) {
  //       const revenueItem = item.billing.billing.find(
  //         (rev) => rev.date === elemItem
  //       );
  //       if (revenueItem) {
  //         value = revenueItem.value.toFixed(2);
  //       }
  //     } else if (item.amount) {
  //       value = item.amount.toFixed(2);
  //     }

  //     return (
  //       <td
  //         key={`${name}_${elemItem}_${index}`}
  //         className="border border-slate-300 whitespace-nowrap px-6 py-4"
  //       >
  //         {value}
  //       </td>
  //     );
  //   });
  // };

  const renderNewColumnRowsBallace = (
    name,
    elemItem,
    indexItem,
    ContractScreen_,
    itemData
  ) => {
    let textColor = "black";

    let value = "0.0";
    if (itemData?.deffered_revenue?.deffered_revenue) {
      const revenueItem = itemData.deffered_revenue.deffered_revenue.find(
        (rev) => rev.date === elemItem
      );
      if (revenueItem) {
        value = revenueItem.value.toFixed(2);
        const status = revenueItem.status;
        if (status === "red") {
          textColor = "red"; // Set text color to red if the status is "red"
        }
      }
    } else if (itemData.amount) {
      value = itemData.amount.toFixed(2);
    }

    return (
      <td
        key={`${name}_${elemItem}_${indexItem}`}
        className="border border-slate-300 whitespace-nowrap px-6 py-4"
        style={{ color: textColor }}
      >
        {value}
      </td>
    );
  };

  // const renderNewColumnRowsBallace = (name, elemItem, indexItem, ContractScreen_, itemData) => {

  //     let textColor = "black";

  //       let value = "0.0";
  //       if (itemData.billing.billing) {
  //         const revenueItem = itemData?.deffered_revenue?.deffered_revenue?.find(
  //           (rev) => rev.date === elemItem
  //         );
  //         if (revenueItem) {
  //           value = revenueItem.value.toFixed(2);
  //           const status = revenueItem.status;
  //           if (status === "red") {
  //             textColor = "red"; // Set text color to red if the status is "red"
  //           }
  //         }
  //       } else if (itemData.amount) {
  //         value = itemData.amount.toFixed(2);
  //       }

  //       return (
  //         <td
  //           key={`${name}_${elemItem}_${index}`}
  //           className="border border-slate-300 whitespace-nowrap px-6 py-4"
  //           style={{ color: textColor }}
  //         >
  //           {value}
  //         </td>
  //       );
  // };

  const renderNewColumnData = (name, elemItem) => {
    const newData = ContractScreen?.total_items_rev?.[name] || [];
    const item = newData.find((item) => item.date === elemItem);
    const value = item ? item.value.toFixed(2) : 0.0;

    return (
      <td
        key={`${name}_${elemItem}`}
        className="border border-slate-300 whitespace-nowrap px-6 py-4"
      >
        {value}
      </td>
    );
  };

  useEffect(() => {
    if (Invoicecustomerlist) {
      const userData = items.map((item) => {
        const formattedData = {
          customer_name: formatCustomerName(item),
        };

        const arrData = Invoicecustomerlist?.arr_roll_fwd[item];
        if (Array.isArray(arrData) && arrData.length > 0) {
          arrData.forEach((entry) => {
            const columnName = entry.date
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "_");

            // Parse the entry.value to a number
            const numericValue = parseFloat(entry.value);

            // Check if the numericValue is NaN (Not-a-Number)
            if (!isNaN(numericValue)) {
              // Format numeric values with commas and parentheses for negatives
              formattedData[columnName] = (
                <div className="textAlign33">
                  {numericValue < 0
                    ? `(${Math.abs(numericValue).toLocaleString("en-US", {
                        style: "decimal",
                      })})`
                    : numericValue.toLocaleString("en-US", {
                        style: "decimal",
                      })}
                </div>
              );
            } else {
              // Handle non-numeric values (e.g., text or invalid input)
              formattedData[columnName] = (
                <div className="textAlign33">{entry.value}</div>
              );
            }
          });
        }
        return formattedData;
      });

      setUsersForRender1(userData);
    }
  }, [Invoicecustomerlist]);

  const items = [
    "Beginning_ARR",
    "New_ARR",
    "Expansion_ARR",
    "Contraction_ARR",
    "Churn_ARR",
    "Recovery_ARR",
    "Ending_ARR",
  ];

  const columns1 = [
    {
      label: <div className="cust">CUSTOMER</div>,
      field: "customer_name",
      sort: "asc",
      width: 500,
    },
    ...(Invoicecustomerlist?.heading.map((date) => {
      const columnName = date.toLowerCase().replace(/[^a-z0-9]/g, "_");
      return {
        label: date,
        field: columnName,
        sort: "asc",
        width: 500,
      };
    }) || []),
  ];

  const data2 = {
    columns: columns1,
    rows: usersForRender1,
  };

  const [showAddOnColumn, setShowAddOnColumn] = useState(false);

  useEffect(() => {
    setSelectedColor("Beginning_ARR");
    setlineColor("red");
    if (ContractScreen && ContractScreen.total_arr) {
      const userData = [
        {
          customer_name: (
            <div className="cust" onClick={handleCustomerNameClick}>
              + arr
            </div>
          ),
          ...(showAddOnColumn ? { add_on_column: "450" } : {}),
          ...ContractScreen.total_arr.reduce((acc, item) => {
            const columnName = item.date
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "_");
            acc[columnName] = item.value.toFixed(2);
            return acc;
          }, {}),
        },
      ];
      setUsersForRender3(userData);
    }
  }, [ContractScreen, showAddOnColumn]);

  const handleCustomerNameClick = () => {
    const subscriptionData = ContractScreen?.data[0]?.add_on || [];
    const subscriptionCount = subscriptionData.length;
    const subscriptionNames = Array.isArray(subscriptionData)
      ? subscriptionData
          .map((subscription) => subscription.product_name)
          .join(", ")
      : "";

    const newRow = {
      customer_name: subscriptionNames,
      subscription_count: subscriptionCount,
      ...(showAddOnColumn ? { add_on_column: "450" } : {}),
      ...ContractScreen.total_arr.reduce((acc, item) => {
        const columnName = item.date.toLowerCase().replace(/[^a-z0-9]/g, "_");
        acc[columnName] = item.value.toFixed(2);
        return acc;
      }, {}),
    };

    setUsersForRender3((prevUsers) => [...prevUsers, newRow]);
  };

  const columns = [
    {
      label: "CUSTOMER",
      field: "customer_name",
      sort: "asc",
      width: 500,
    },
    ...(showAddOnColumn
      ? [
          {
            label: "+",
            field: "add_on_column",
            sort: "asc",
            width: 500,
          },
        ]
      : []),
    ...(ContractScreen?.total_arr?.map((item) => {
      const columnName = item.date.toLowerCase().replace(/[^a-z0-9]/g, "_");
      return {
        label: item.date,
        field: columnName,
        sort: "asc",
        width: 500,
      };
    }) || []),
  ];

  const data3 = {
    columns: columns,
    rows: usersForRender3,
  };

  const items1 = [
    "Expansion_ARR",
    "New_ARR",
    "Churn_ARR",
    "Contraction_ARR",
    "Ending_ARR",
  ];

  const [selectedItems, setSelectedItems] = useState(items1);
  const [selectedColors, setSelectedColors] = useState(items1);
  const [yValues, setYValues] = useState([]);

  useEffect(() => {
    const fetchData = () => {
      const arrRollFwd = Invoicecustomerlist?.arr_roll_fwd || {};

      const selectedValues = selectedItems.map((item) => {
        if (arrRollFwd[item]) {
          return arrRollFwd[item].map((data) => ({
            label: data.date,
            y: data.value,
          }));
        }
        return [];
      });

      setYValues(selectedValues);
    };

    fetchData();
  }, [selectedItems, Invoicecustomerlist]);

  const handleColorClick = (itemName) => {
    let updatedSelectedItems;
    let updatedSelectedColors;
    if (selectedItems.includes(itemName)) {
      updatedSelectedItems = selectedItems.filter((item) => item !== itemName);
      updatedSelectedColors = selectedColors.filter(
        (color) => color !== itemName
      );
    } else {
      updatedSelectedItems = [...selectedItems, itemName];
      updatedSelectedColors = [...selectedColors, itemName];
    }

    setSelectedItems(updatedSelectedItems);
    setSelectedColors(updatedSelectedColors);
  };

  const getColorForItem = (item) => {
    const itemIndex = items1.indexOf(item);
    const colors = ["#90EE90", "green", "red", "#c7c700", "black"];
    return colors[itemIndex % colors.length];
  };

  const options = {
    animationEnabled: true,
    exportEnabled: true,
    theme: "light2",
    title: {
      text: "",
    },
    axisY: {
      includeZero: true,
    },
    data: selectedItems.length === 0 ? getStaticData() : getChartData(),
  };

  function getStaticData() {
    const headings = Invoicecustomerlist?.heading || [];

    // Provide static data when no items are selected
    const staticData = [
      {
        type: "stackedColumn",
        axisYType: "primary", // Display on the left side
        dataPoints: headings.map((headingItem) => ({
          label: headingItem,
        })),
      },
      {
        type: "stackedColumn",
        axisYType: "secondary", // Display on the right side
        dataPoints: headings.map((headingItem) => ({
          label: headingItem,
        })),
      },
    ];

    return staticData;
  }

  function getChartData() {
    // Generate chart data based on selectedItems as you did before
    return selectedItems.map((item, index) => {
      const dataPoints = Invoicecustomerlist?.heading?.map((headingItem) => {
        const matchingData = yValues[index]?.find(
          (data) => data.label === headingItem
        );
        return {
          label: headingItem,
          y: matchingData ? matchingData.y : 0,
          color: getColorForItem(item),
        };
      });

      const lineColor = item === "Ending_ARR" ? "black" : getColorForItem(item);
      const yAxisType = item === "Ending_ARR" ? "primary" : "secondary";
      const type = item === "Ending_ARR" ? "line" : "stackedColumn";

      if (
        dataPoints &&
        dataPoints.length > 0 &&
        dataPoints.some((dataPoint) => dataPoint.y !== 0)
      ) {
        return {
          type: type,
          indexLabelFontColor: "#5A5757",
          indexLabelPlacement: "outside",
          dataPoints,
          lineDashType: "solid",
          lineColor: lineColor,
          markerType: "circle",
          markerSize: 6,
          markerColor: lineColor,
          toolTipContent: "{label}: {y}",
          xValueFormatString: "MMM YYYY",
          interval: 3,
          intervalType: "month",
          axisYType: yAxisType,
        };
      }
      return [];
    });
  }

  // --------------------------------------Row Append---------------------------------------------------------------

  const handleLenghtGet = (name) => {
    const newData = ContractScreen?.data[0]?.add_on[name] || [];
    setShowColumn2(newData);
  };

  const handleAddRow = () => {
    if (newRowDates.length === 0) {
      // Add the initial date
      const initialDate = showData.months[showData.months.length - 1]; // Mar 19
      const [initialMonth, initialYear] = initialDate.split(" ");

      // Increment the month
      let nextMonth = new Date(Date.parse(`${initialMonth} 1, ${initialYear}`));
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const formattedDate = `${getMonthAbbreviation(
        nextMonth.getMonth() + 1
      )} ${nextMonth.getFullYear().toString().slice(-2)}`;

      setNewRowDates([formattedDate]);
      if (!showDateForArr.includes(formattedDate)) {
        setShowDateForArr((prevDates) => [...prevDates, formattedDate]);
      }
    } else {
      const lastValue = newRowDates[newRowDates.length - 1];
      const [lastMonth, lastYear] = lastValue.split(" ");

      // Increment the month
      let nextMonth = new Date(Date.parse(`${lastMonth} 1, ${lastYear}`));
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      // Format the next date
      const formattedDate = `${getMonthAbbreviation(
        nextMonth.getMonth() + 1
      )} ${nextMonth.getFullYear().toString().slice(-2)}`;

      setNewRowDates((prevNewRowDates) => [...prevNewRowDates, formattedDate]);
      setShowDateForArr((prevDates) => [...prevDates, formattedDate]);
    }

    setRowCount((prevRowCount) => prevRowCount + 1);
    const expandedColumnCount = expandedColumnsTotalArr.length;
    const newColumns = namedynamic.slice(expandedColumnCount); // Get the columns after the expanded columns
    newColumns.forEach(
      (name) => (handleLenghtGet(name), handleAddColumnTotalArr(name))
    );
  };
  const getMonthAbbreviation = (month) => {
    const date = new Date(Date.UTC(2000, month - 1, 1));
    return date.toLocaleString("default", { month: "short" });
  };

  return (
    <>
      <div className="toppage121212">
        <h1 className="customertitle">Customer</h1>
        <div className="customername">{name}</div>
      </div>

      <div className="btncanvas">
        <div className="btnall1">
          {items1.map((item) => (
            <button
              key={item}
              onClick={() => handleColorClick(item)}
              style={{
                backgroundColor: getColorForItem(item),
                color: selectedItems.includes(item) ? "black" : "white",
                marginRight: "10px",
                position: "relative",
              }}
            >
              {formatCustomerName(item)}
              {!selectedItems.includes(item) && (
                <div
                  style={{
                    position: "absolute",
                    top: "21px",
                    left: "0",
                    width: "100%",
                    height: "2px",
                    background: "black",
                  }}
                />
              )}
            </button>
          ))}
        </div>

        <div
          className="div1"
          style={{
            width: "900px",
            margin: "0px auto 30px",
            background: "#fff",
          }}
        >
          <CanvasJSChart options={options} />
        </div>
      </div>
      <div className="content maintableDatashowData">
        <Row>
          <Col md="12 ">
            <Card className="card">
              <CardBody>
                <div className="alltableaddinThisdiv2 alltablediv ">
                  <MDBDataTable
                    className="custom-mdb-table customertable1"
                    style={{}}
                    responsive
                    striped
                    bordered
                    small
                    data={data2}
                  ></MDBDataTable>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>

      {/* ----------------------------------------------------ARR1212-------------------------------------------------------------       */}

      <div className="content maintableDatashowData">
        <Row>
          <Col md="12">
            <Card className="card">
              <CardBody>
                <div className="alltableaddinThisdiv2 alltablediv">
                  <div className=" Revenuecont ">
                    <h1 className="text-center py-2">ARR</h1>
                    <div className="table-responsive ps ps--active-x ps--active-y ps--scrolling-y">
                      <table className="table table-bordered table-sm table-striped dataTable">
                        <thead className="border-b font-medium dark:border-neutral-500">
                          <tr>
                            <th
                              scope="col"
                              className="border border-slate-300 px-6 py-4 cutomerScr-tableW"
                            >
                              Month
                            </th>
                            {showDateForArr?.map((elemItem, indexItem) => {
                              return (
                                <React.Fragment key={indexItem}>
                                  <th
                                    scope="col"
                                    className="border border-slate-300 px-6 py-4"
                                  >
                                    {elemItem}
                                  </th>
                                </React.Fragment>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody className="contractpagetabale">
                          {namedynamic?.map((name, nameIndex) => {
                            const totalItemRev =
                              ContractScreen?.total_items_arr;
                            const newData = totalItemRev?.[name] || [];

                            // Add a check to skip further processing if newData is empty or has length smaller than 1
                            if (newData.length < 1) {
                              return null; // Skip this iteration
                            }

                            return (
                              <React.Fragment key={nameIndex}>
                                {expandedColumnsTotalArr?.includes(name) &&
                                  renderNewColumnTotalArr(name)}

                                <tr>
                                  <th
                                    scope="col"
                                    className="border border-slate-300 px-6 py-4 heading55"
                                  >
                                    <i
                                      className={
                                        expandedColumnsTotalArr?.includes(name)
                                          ? "fa fa-minus minusiconinSub"
                                          : "fa fa-plus plusiconinSub"
                                      }
                                      onClick={() =>
                                        handleAddColumnTotalArr(name)
                                      }
                                    ></i>
                                    ARR
                                  </th>

                                  {showDateForArr?.map(
                                    (elemItem, indexItem) => {
                                      const totalItemRev =
                                        ContractScreen?.total_items_arr;

                                      const rowData = namedynamic.map(
                                        (name) => {
                                          const newData =
                                            totalItemRev?.[name] || [];

                                          // Add a check to skip further processing if newData is empty or has length smaller than 1
                                          if (newData.length < 1) {
                                            return null; // Skip this iteration
                                          }
                                          const item = newData.find(
                                            (item) => item.date === elemItem
                                          );

                                          const value = item
                                            ? item.value.toLocaleString(
                                                "en-US",
                                                {
                                                  style: "decimal",
                                                }
                                              )
                                            : "0.0";

                                          return (
                                            <React.Fragment
                                              key={`${name}_${elemItem}`}
                                            >
                                              {value && <>{value}</>}
                                              {/* {expandedColumnsTotalArr?.includes(name) &&
                                            renderNewColumnRowsARRArr(
                                              name,
                                              elemItem,
                                              indexItem
                                            )} */}
                                            </React.Fragment>
                                          );
                                        }
                                      );

                                      return (
                                        <td
                                          key={indexItem}
                                          className="border-b dark:border-neutral-500 heading3843"
                                        >
                                          {rowData}
                                        </td>
                                      );
                                    }
                                  )}
                                </tr>
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                      <button className="addrowdiv" onClick={handleAddRow}>
                        Add Row
                      </button>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>

      <div className="content maintableDatashowData">
        <Row>
          <Col md="12">
            <Card className="card">
              <CardBody>
                <div className="alltableaddinThisdiv2 alltablediv">
                  {/* -----------------------------------------------first_Table_3-------------------------------------------- */}

                  <div className="flex flex-col">
                    <div className=" sm:-mx-6 lg:-mx-8">
                      <div className="inline-block min-w-full py-2 sm:px-6 lg:px-8 custom-mdb-table">
                        <div className=" Revenuecont ">
                          <h1 className="text-center py-2">
                            <b>Revenuer</b>
                          </h1>
                          <div className="table-responsive ps ps--active-x ps--active-y ps--scrolling-y">
                            <table className="table table-bordered table-sm table-striped dataTable">
                              <thead className="border-b font-medium dark:border-neutral-500">
                                <tr>
                                  <th
                                    scope="col"
                                    className="border border-slate-300 px-6 py-4 cutomerScr-tableW"
                                  >
                                    Month
                                  </th>

                                  {showData?.months?.map(
                                    (elemItem, indexItem) => {
                                      return (
                                        <th
                                          key={indexItem}
                                          className="border-b dark:border-neutral-500"
                                        >
                                          {elemItem}
                                        </th>
                                      );
                                    }
                                  )}
                                </tr>
                              </thead>
                              <tbody className="contractpagetabale">
                                {namedynamic?.map((name, nameIndex) => {
                                  return (
                                    <React.Fragment key={nameIndex}>
                                      {expandedColumns?.includes(name) &&
                                        renderNewColumn(name)}
                                      <tr>
                                        <th
                                          scope="col"
                                          className="border border-slate-300 px-6 py-4"
                                        >
                                          <i
                                            className={
                                              expandedColumns?.includes(name)
                                                ? "fa fa-minus minusiconinSub"
                                                : "fa fa-plus plusiconinSub"
                                            }
                                            onClick={() =>
                                              handleAddColumn(name)
                                            }
                                          ></i>
                                          {name}
                                        </th>

                                        {showData?.months?.map(
                                          (elemItem, indexItem) => {
                                            const totalItemRev =
                                              ContractScreen?.total_items_rev;
                                            // const rowData = namedynamic.map((name) => {
                                            const newData =
                                              totalItemRev?.[name] || [];

                                            // Add a check to skip further processing if newData is empty or has length smaller than 1
                                            // if (newData.length < 1) {
                                            //   return null; // Skip this iteration
                                            // }
                                            const item = newData.find(
                                              (item) => item.date === elemItem
                                            );

                                            const value = item
                                              ? item.value.toLocaleString(
                                                  "en-US",
                                                  {
                                                    style: "decimal",
                                                  }
                                                )
                                              : "0.0";

                                            return (
                                              <td
                                                key={indexItem}
                                                className="border-b dark:border-neutral-500"
                                              >
                                                {value}
                                              </td>
                                            );
                                          }
                                        )}
                                      </tr>
                                    </React.Fragment>
                                  );
                                })}
                                <tr>
                                  <th
                                    scope="col"
                                    className="border border-slate-300 px-6 py-4"
                                  >
                                    Total
                                  </th>

                                  {showData?.months?.map(
                                    (elemItem, indexItem) => {
                                      const totalItemRev =
                                        ContractScreen?.total_items_rev;
                                      const value1 =
                                        showData?.tatalRevenue?.[indexItem];
                                      const formattedValue =
                                        value1.toLocaleString("en-US", {
                                          style: "decimal",
                                        });

                                      return (
                                        <>
                                          <td className="border border-slate-300 whitespace-nowrap px-6 py-4">
                                            {formattedValue}
                                          </td>
                                        </>
                                      );
                                    }
                                  )}
                                </tr>
                                <tr>
                                  <th
                                    scope="col"
                                    className="border border-slate-300 px-6 py-4"
                                  >
                                    Cumulative
                                  </th>
                                  {showData?.months?.map(
                                    (elemItem, indexItem) => {
                                      const totalItemRev =
                                        ContractScreen?.total_items_rev;
                                      const value2 =
                                        showData?.cumilativeRevenue?.[
                                          indexItem
                                        ];
                                      const formattedValue2 =
                                        value2.toLocaleString("en-US", {
                                          style: "decimal",
                                        });

                                      return (
                                        <>
                                          <td className="border border-slate-300 whitespace-nowrap px-6 py-4">
                                            {formattedValue2}
                                          </td>
                                        </>
                                      );
                                    }
                                  )}
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ------------------------------------------------------------Second Table-------------------------------------------- */}

                  <div className="flex flex-col">
                    <div className=" sm:-mx-6 lg:-mx-8">
                      <div className="inline-block min-w-full py-2 sm:px-6 lg:px-8 custom-mdb-table">
                        <div className="Revenuecont">
                          <h1 className="text-center py-2">
                            <b>Billing</b>
                          </h1>
                          <div className="table-responsive ps ps--active-x ps--active-y ps--scrolling-y">
                            <table className="table table-bordered table-sm table-striped dataTable">
                              <thead className="border-b font-medium dark:border-neutral-500">
                                <tr>
                                  <th
                                    scope="col"
                                    className="px-6 py-4 cutomerScr-tableW"
                                  >
                                    Month
                                  </th>
                                  {shwoBilling?.months?.map(
                                    (elemItem, indexItem) => {
                                      return (
                                        <th
                                          key={indexItem}
                                          className="border-b dark:border-neutral-500"
                                        >
                                          {elemItem}
                                        </th>
                                      );
                                    }
                                  )}

                                  {/* {namedynamic?.map((name, nameIndex) => (
                                    <React.Fragment key={nameIndex}>
                                      {expandedBilling?.includes(name) &&
                                        renderNewColumnBilling(name)}
                                      <th
                                        scope="col"
                                        className="border border-slate-300 px-6 py-4"
                                      >
                                        <i
                                          className={
                                            expandedBilling?.includes(name)
                                              ? "fa fa-minus minusiconinSub"
                                              : "fa fa-plus plusiconinSub"
                                          }
                                          onClick={() =>
                                            handleAddColumnBilling(name)
                                          }
                                        ></i>
                                        {name}{" "}
                                      </th>
                                    </React.Fragment>
                                  ))} */}

                                  {/* <th
                                    scope="col"
                                    className="border border-slate-300 px-6 py-4"
                                  >
                                    Total
                                  </th> */}
                                  {/* <th
                                    scope="col"
                                    className="border border-slate-300 px-6 py-4"
                                  >
                                    Cumulative
                                  </th> */}
                                </tr>
                              </thead>
                              <tbody>
                                {namedynamic?.map((name, nameIndex) => {
                                  return (
                                    <React.Fragment key={nameIndex}>
                                      {expandedBilling?.includes(name) &&
                                        renderNewColumnBilling(name)}
                                      <tr>
                                        <th
                                          scope="col"
                                          className="border border-slate-300 px-6 py-4"
                                        >
                                          <i
                                            className={
                                              expandedBilling?.includes(name)
                                                ? "fa fa-minus minusiconinSub"
                                                : "fa fa-plus plusiconinSub"
                                            }
                                            onClick={() =>
                                              handleAddColumnBilling(name)
                                            }
                                          ></i>
                                          {name}{" "}
                                        </th>

                                        {shwoBilling?.months?.map(
                                          (elemItem, indexItem) => {
                                            const totalItemRev =
                                              ContractScreen?.total_items_bal;
                                            // const rowData = namedynamic.map((name) => {
                                            const newData =
                                              totalItemRev?.[name] || [];

                                            // Add a check to skip further processing if newData is empty or has length smaller than 1
                                            // if (newData.length < 1) {
                                            //   return null; // Skip this iteration
                                            // }
                                            const item = newData.find(
                                              (item) => item.date === elemItem
                                            );

                                            const value = item
                                              ? item.value.toLocaleString(
                                                  "en-US",
                                                  {
                                                    style: "decimal",
                                                  }
                                                )
                                              : "0.0";

                                            return (
                                              <td
                                                key={indexItem}
                                                className="border-b dark:border-neutral-500"
                                              >
                                                {value}
                                              </td>
                                            );
                                          }
                                        )}
                                      </tr>
                                    </React.Fragment>
                                  );
                                })}

                                <tr>
                                  <th
                                    scope="col"
                                    className="border border-slate-300 px-6 py-4"
                                  >
                                    Total
                                  </th>

                                  {shwoBilling?.months?.map(
                                    (elemItem, indexItem) => {
                                      const totalItemRev =
                                        ContractScreen?.total_items_bal;
                                      const value1 =
                                        shwoBilling?.totalBilling?.[indexItem];
                                      const formattedValue =
                                        value1.toLocaleString("en-US", {
                                          style: "decimal",
                                        });

                                      return (
                                        <>
                                          <td className="border border-slate-300 whitespace-nowrap px-6 py-4">
                                            {formattedValue}
                                          </td>
                                        </>
                                      );
                                    }
                                  )}
                                </tr>
                                <tr>
                                  <th
                                    scope="col"
                                    className="border border-slate-300 px-6 py-4"
                                  >
                                    Cumulative
                                  </th>
                                  {shwoBilling?.months?.map(
                                    (elemItem, indexItem) => {
                                      const totalItemRev =
                                        ContractScreen?.total_items_bal;
                                      const value2 =
                                        shwoBilling?.cumilativebilling?.[
                                          indexItem
                                        ];
                                      const formattedValue2 =
                                        value2.toLocaleString("en-US", {
                                          style: "decimal",
                                        });

                                      return (
                                        <>
                                          <td className="border border-slate-300 whitespace-nowrap px-6 py-4">
                                            {formattedValue2}
                                          </td>
                                        </>
                                      );
                                    }
                                  )}
                                </tr>

                                {/* {shwoBilling?.months?.map(
                                  (elemItem, indexItem) => {
                                    const totalItemRev =
                                      ContractScreen?.total_items_bal;

                                    const rowData = namedynamic.map((name) => {
                                      const newData =
                                        totalItemRev?.[name] || [];
                                      const item = newData.find(
                                        (item) => item.date === elemItem
                                      );
                                      const value = item
                                        ? item.value.toLocaleString("en-US", {
                                          style: "decimal",
                                        })
                                        : "0.0";
                                      return (
                                        <>
                                          {expandedBilling?.includes(name) &&
                                            renderNewColumnRowsBilling(
                                              name,
                                              elemItem,
                                              indexItem
                                            )}
                                          <td
                                            key={`${name}_${elemItem}`}
                                            className="border border-slate-300 whitespace-nowrap px-6 py-4"
                                          >
                                            {value}
                                          </td>
                                        </>
                                      );
                                    });
                                    const value1 =
                                      shwoBilling?.totalBilling?.[indexItem];
                                    const formattedValue =
                                      value1.toLocaleString("en-US", {
                                        style: "decimal",
                                      });
                                    const value2 =
                                      shwoBilling?.cumilativebilling?.[
                                      indexItem
                                      ];
                                    const formattedValue2 =
                                      value2.toLocaleString("en-US", {
                                        style: "decimal",
                                      });
                                    return (
                                      <tr
                                        key={indexItem}
                                        className="border-b dark:border-neutral-500"
                                      >
                                        <td className="border border-slate-300 whitespace-nowrap px-6 py-4 font-medium">
                                          {elemItem}
                                        </td>
                                        {rowData}

                                        <td className="border border-slate-300 whitespace-nowrap px-6 py-4">
                                          {formattedValue}
                                        </td>
                                        <td className="border border-slate-300 whitespace-nowrap px-6 py-4">
                                          {formattedValue2}
                                        </td>
                                      </tr>
                                    );
                                  }
                                )} */}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* ------------------------------------------------------------Third Table-------------------------------------------- */}

                  <div className="flex flex-col">
                    <div className=" sm:-mx-6 lg:-mx-8">
                      <div className="inline-block min-w-full py-2 sm:px-6 lg:px-8 custom-mdb-table">
                        <div className="Revenuecont">
                          <h1 className="text-center py-2">
                            <b>END OF MONTH DEFERRED REVENUE</b>
                          </h1>
                          <div className="table-responsive ps ps--active-x ps--active-y ps--scrolling-y">
                            <table className="table table-bordered table-sm table-striped dataTable">
                              <thead className="border-b font-medium dark:border-neutral-500">
                                <tr>
                                  <th
                                    scope="col"
                                    className="border border-slate-300 px-6 py-4 cutomerScr-tableW"
                                  >
                                    Month
                                  </th>

                                  {shwoDefRev?.months?.map(
                                    (elemItem, indexItem) => {
                                      return (
                                        <th
                                          key={indexItem}
                                          className="border-b dark:border-neutral-500"
                                        >
                                          {elemItem}
                                        </th>
                                      );
                                    }
                                  )}

                                  {/* {namedynamic?.map((name, nameIndex) => (
                                    <React.Fragment key={nameIndex}>
                                      {expandedDef?.includes(name) &&
                                        renderNewColumnDef(name)}
                                      <th
                                        scope="col"
                                        className="border border-slate-300 px-6 py-4"
                                      >
                                        <i
                                          className={
                                            expandedDef?.includes(name)
                                              ? "fa fa-minus minusiconinSub"
                                              : "fa fa-plus plusiconinSub"
                                          }
                                          onClick={() =>
                                            handleAddColumnDef(name)
                                          }
                                        ></i>
                                        {name}{" "}
                                      </th>
                                    </React.Fragment>
                                  ))} */}

                                  {/* <th
                                    scope="col"
                                    className="border border-slate-300 px-6 py-4"
                                  >
                                    Balance
                                  </th> */}
                                </tr>
                              </thead>

                              <tbody>
                                {namedynamic?.map((name, nameIndex) => {
                                  return (
                                    <React.Fragment key={nameIndex}>
                                      {expandedDef?.includes(name) &&
                                        renderNewColumnDef(name)}
                                      <tr>
                                        <th
                                          scope="col"
                                          className="border border-slate-300 px-6 py-4"
                                        >
                                          <i
                                            className={
                                              expandedDef?.includes(name)
                                                ? "fa fa-minus minusiconinSub"
                                                : "fa fa-plus plusiconinSub"
                                            }
                                            onClick={() =>
                                              handleAddColumnDef(name)
                                            }
                                          ></i>
                                          {name}
                                        </th>

                                        {shwoDefRev?.months?.map(
                                          (elemItem, indexItem) => {
                                            const totalItemRev =
                                              ContractScreen?.total_items_def;
                                            // const rowData = namedynamic.map((name) => {
                                            const newData =
                                              totalItemRev?.[name] || [];

                                            // Add a check to skip further processing if newData is empty or has length smaller than 1
                                            // if (newData.length < 1) {
                                            //   return null; // Skip this iteration
                                            // }
                                            const item = newData.find(
                                              (item) => item.date === elemItem
                                            );

                                            const value = item
                                              ? item.value.toLocaleString(
                                                  "en-US",
                                                  {
                                                    style: "decimal",
                                                  }
                                                )
                                              : "0.0";

                                            return (
                                              <td
                                                key={indexItem}
                                                className="border-b dark:border-neutral-500"
                                              >
                                                {value}
                                              </td>
                                            );
                                          }
                                        )}
                                      </tr>
                                    </React.Fragment>
                                  );
                                })}

                                <tr>
                                  <th
                                    scope="col"
                                    className="border border-slate-300 px-6 py-4"
                                  >
                                    Balance
                                  </th>

                                  {shwoDefRev?.months?.map(
                                    (elemItem, indexItem) => {
                                      const totalItemRev =
                                        ContractScreen?.total_items_def;
                                      const value1 =
                                        shwoDefRev?.balance?.[indexItem];
                                      const formattedValue =
                                        value1.toLocaleString("en-US", {
                                          style: "decimal",
                                        });

                                      return (
                                        <td className="border border-slate-300 whitespace-nowrap px-6 py-4">
                                          {formattedValue}
                                        </td>
                                      );
                                    }
                                  )}
                                </tr>

                                {/*                                 
                                {shwoDefRev?.months?.map(
                                  (elemItem, indexItem) => {
                                    const totalItemRev =
                                      ContractScreen?.total_items_def;

                                    const rowData = namedynamic.map((name) => {
                                      const newData =
                                        totalItemRev?.[name] || [];
                                      const item = newData.find(
                                        (item) => item.date === elemItem
                                      );
                                      const value = item
                                        ? item.value.toLocaleString("en-US", {
                                          style: "decimal",
                                        })
                                        : "0.0";
                                      return (
                                        <>
                                          {expandedDef?.includes(name) &&
                                            renderNewColumnRowsBallace(
                                              name,
                                              elemItem,
                                              indexItem
                                            )}
                                          <td
                                            key={`${name}_${elemItem}`}
                                            className="border border-slate-300 whitespace-nowrap px-6 py-4"
                                          >
                                            {value}
                                          </td>
                                        </>
                                      );
                                    });
                                    const value1 =
                                      shwoDefRev?.balance?.[indexItem];
                                    const formattedValue =
                                      value1.toLocaleString("en-US", {
                                        style: "decimal",
                                      });

                                    return (
                                      <tr
                                        key={indexItem}
                                        className="border-b dark:border-neutral-500"
                                      >
                                        <td className="border border-slate-300 whitespace-nowrap px-6 py-4 font-medium">
                                          {elemItem}
                                        </td>
                                        {rowData}

                                        <td className="border border-slate-300 whitespace-nowrap px-6 py-4">
                                          {formattedValue}
                                        </td>
                                      </tr>
                                    );
                                  }
                                )} */}
                              </tbody>
                              {/* // </>
                                  //   ))}  */}
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>
    </>
  );
};

export default CustomerScreen;
