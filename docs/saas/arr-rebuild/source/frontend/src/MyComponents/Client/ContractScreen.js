import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardBody, Row, Col, Button } from "reactstrap";
import { useDispatch, useSelector } from "react-redux";
import swal from "sweetalert";
import { Modal } from "react-bootstrap";

import {
  ContractScreenAction,
  Contractscreenupdate,
  ContractUpdateAction,
  GetAddContractProductServiceAction,
} from "../../redux/actions/Admin-saasot-action";
// first_Table_3
const ContractScreen = ({ history }) => {
  const [showColumn, setShowColumn] = useState(false);
  const [hardwareShowColumn, setHardwareShowColumn] = useState(false);
  const [impShowColumn, setImpShowColumn] = useState(false);
  const [namedynamic, setnamedynamic] = useState([]);
  const [namedynamicvalue, setnamedynamicvalue] = useState([]);
  const [showData, setShowData] = useState([]);
  const [storeid, setnewid] = useState();
  const [revenue, setrevenue] = useState("");
  const [shwoBilling, setShowBilling] = useState([]);
  const [shwoDefRev, setShowDefRev] = useState([]);
  const [editedValues, setEditedValues] = React.useState({}); // Initialize editedValues as state
  // ------------------------------------FOR BILLING-------------------------------------
  const [showBillingSub, setshowBillingSub] = useState(false);
  const [showBillingHard, setshowBillingHard] = useState(false);
  // -------------------------------------------DEF REVENU----------------------------------------
  const [showDefRevSub, setShowDefRevSub] = useState(false);
  const [showDefRevHard, setShowDefRevHard] = useState(false);

  // ----------------------------------for Revnue heading state-----------------------------------
  const [expandedColumns, setExpandedColumns] = useState([]);
  const [expandedBilling, setExpandedBilling] = useState([]);
  const [expandedDef, setExpandedDef] = useState([]);
  const [selectedOption, setSelectedOption] = useState("");
  const [expandedColumnsTotalArr, setExpandedColumnsTotalArr] = useState([]);
  const [showDateForArr, setShowDateForArr] = useState([]);
  const [newRowDates, setNewRowDates] = useState([]);
  const [rowCount, setRowCount] = useState(1);
  const [showColumn2, setShowColumn2] = useState([]);
  const { userData } = useSelector((state) => state.authReducer);
  const dispatch = useDispatch();
  const {
    ProServData,
    loading: ProServDataLoading,
    error: ProServDataError,
  } = useSelector((state) => state.GetAddContractProductServiceReducer);
  const { success: statuschanges } = useSelector(
    (state) => state.ContractUpdateReducer
  );

  const { success: AddContractupdate } = useSelector(
    (state) => state.Contractscreenupdatesearch
  );

  const {
    ContractScreen,
    loading: ContractScreenLoading,
    error: ContractScreenError,
  } = useSelector((state) => state.ContractScreenReducer);

  const { error, success: successfullyupdated } = useSelector(
    (state) => state.ContractUpdateReducer
  );

  const url = window.location.href;
  const path = new URL(url).pathname;
  const ids = path.split("/").pop().split(",");

  useEffect(() => {
    let a = localStorage.getItem("selectedoption");
    setSelectedOption(a);
  }, []);

  useEffect(() => {
    if (error?.message) {
      swal(error?.message);
      dispatch(ContractScreenAction(ids, selectedOption));
    }
  }, [error]);

  useEffect(() => {
    dispatch(GetAddContractProductServiceAction());
  }, []);

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
  }, [selectedOption, statuschanges, AddContractupdate]);

  const handleAddColumn = (name) => {
    const isExpanded = expandedColumns.includes(name);
    const updatedExpandedColumns = isExpanded
      ? expandedColumns.filter((column) => column !== name)
      : [...expandedColumns, name];
    setExpandedColumns(updatedExpandedColumns);
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

  function formatUTCDateToLocaleString(utcDateString) {
    if (!utcDateString) {
      return ""; // Return blank string if utcDateString is null or undefined
    }

    const date = new Date(utcDateString);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0"); // Adding 1 because getUTCMonth() returns zero-based month index
    const day = String(date.getUTCDate()).padStart(2, "0");

    return `${month}/${day}/${year}`;
  }

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
      let arrTotalCumilativeRevenue = []; //use this array
      // let arrayHardware = [];
      // let arraySubscriptionRev = [];

      // ================== ARR =====================
      for (let index = 0; index < months?.length; index++) {
        // ------------------------------this code usefull----------------------------------------------------
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
        tatalRevenue: arrayTotalRev,
        cumilativeRevenue: arrTotalCumilativeRevenue,
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
                        Transaction {itemData?.tansaction}, Line Item{" "}
                        {index + 1}
                        Total {itemData?.total_revenue}
                      </th>

                      <>
                        {showDateForArr?.map((elemItem, indexItem) => {
                          return (
                            <>
                              {renderNewColumnRows(
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

  // const renderNewColumnBilling = (name) => {
  //   const newData = ContractScreen?.data[0]?.add_on[name] || []; // Access the new data based on the name
  //   return (
  //     <>
  //       {newData.map((item, index) => (
  //         <th
  //           key={index}
  //           scope="col"
  //           className="border border-slate-300 px-6 py-4"
  //         >
  //           Transaction {item?.tansaction}, Line Item {index + 1}
  //         </th>
  //       ))}
  //     </>
  //   );
  // };

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
                        Transaction {item?.tansaction}, Line Item {index + 1}
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
  // const renderNewColumnDef = (name) => {
  //   const newData = ContractScreen?.data[0]?.add_on[name] || []; // Access the new data based on the name
  //   return (
  //     <>
  //       {newData.map((item, index) => (
  //         <th
  //           key={index}
  //           scope="col"
  //           className="border border-slate-300 px-6 py-4"
  //         >
  //           Transaction {item?.tansaction}, Line Item {index + 1}
  //         </th>
  //       ))}
  //     </>
  //   );
  // };

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
                        Transaction {item?.tansaction}, Line Item {index + 1}
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
  };

  // -------------------------------------------final code is working-------------------------------------

  const [contractScreen, setContractScreen] = useState([]);

  const [inputValues, setInputValues] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [password, setPassword] = useState("");

  // const renderNewColumnRows = (name, elemItem, indexItem) => {
  //   const newData = ContractScreen?.data[0]?.add_on[name] || [];
  //   return newData.map((item, index) => {
  //     let value = "0";
  //     let textColor = "black";
  //     if (item.revenue && item.revenue.revenue) {
  //       const revenueItem = item.revenue.revenue.find(
  //         (rev) => rev.date === elemItem
  //       );
  //       if (revenueItem) {
  //         value = revenueItem.value.toFixed(2);
  //         const status = revenueItem.status;
  //         if (status === "red") {
  //           textColor = "red"; // Set text color to red if the status is "red"
  //         }
  //       }
  //     } else if (item.amount) {
  //       value = item.amount;
  //     }

  //     const handleValueChange = (newValue, index) => {
  //       if (typeof index !== "undefined") {
  //         // alert(index);
  //         setnewid(newData[index]?.revenue?.id);
  //       }

  //       const updatedData = [...newData];
  //       const revenueItem = updatedData[index]?.revenue?.revenue?.find(
  //         (rev) => rev.date === elemItem
  //       );
  //       if (revenueItem) {
  //         revenueItem.value = parseFloat(newValue);
  //         // Update the ContractScreen data
  //         setContractScreen({ ...ContractScreen, data: updatedData });
  //         const a = JSON.stringify(updatedData[index].revenue.revenue);
  //         const parsedData = JSON.parse(a);

  //         const totalValue = parsedData.reduce(
  //           (accumulator, currentItem) => accumulator + currentItem.value,
  //           0
  //         );

  //         console.log(totalValue); // This will log the total sum of all the 'value' properties
  //         setrevenue(a);
  //       }
  //     };

  //     const handleKeyPress = (e) => {
  //       if (e.key === "Enter") {
  //         setShowModal(true);
  //       }
  //     };

  //     const handleSubmit = () => {
  //       // Perform the delete operation
  //       const formData = new FormData();
  //       formData.append("revenue", revenue);
  //       formData.append("password", password);

  //       dispatch(ContractUpdateAction(formData, storeid));
  //       // ...
  //       handleClose();
  //     };

  //     const handleClose = () => {
  //       setShowModal(false);
  //       setPassword("");
  //     };

  //     return (
  //       <>
  //         <td
  //           key={`${name}_${elemItem}_${index}`}
  //           className="border border-slate-300 whitespace-nowrap px-6 py-4"
  //         >
  //           <input
  //             type="number"
  //             value={value}
  //             onChange={(e) => handleValueChange(e.target.value, index)}
  //             onKeyDown={handleKeyPress}
  //             style={{ color: textColor }}
  //           />
  //         </td>

  //         <Modal show={showModal} onHide={handleClose}>
  //           <Modal.Header closeButton>
  //             <Modal.Title>Enter Password</Modal.Title>
  //           </Modal.Header>
  //           <Modal.Body>
  //             <input
  //               type="password"
  //               value={password}
  //               onChange={(e) => setPassword(e.target.value)}
  //               placeholder="Enter your password"
  //             />
  //           </Modal.Body>
  //           <Modal.Footer>
  //             <Button
  //               variant="secondary"
  //               className="buttonfotterdatabgshow"
  //               onClick={handleClose}
  //             >
  //               Cancel
  //             </Button>
  //             <Button
  //               variant="primary"
  //               className="buttonfotterdatabgshow"
  //               onClick={handleSubmit}
  //             >
  //               Submit
  //             </Button>
  //           </Modal.Footer>
  //         </Modal>
  //       </>
  //     );
  //   });
  // };

  const renderNewColumnRows = (
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
          setContractScreen({ ...ContractScreen, data: updatedData });
          const a = JSON.stringify(updatedData[index].item_arr.arr);
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

  // const renderNewColumnTotalArr = (name) => {
  //   const newData = ContractScreen?.data[0]?.add_on[name] || []; // Access the new data based on the name
  //   return (
  //     <>
  //       {newData.map((item, index) => (
  //         <th
  //           key={index}
  //           scope="col"
  //           className="border border-slate-300 px-6 py-4"
  //         >
  //           Transaction {item?.tansaction}, Line Item {index + 1}
  //           Total {item?.total_revenue}
  //         </th>
  //       ))}
  //     </>
  //   );
  // };

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
                    Transaction {itemData?.tansaction}, Line Item {index + 1}{" "}
                    Total {itemData?.total_revenue}
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

  // const renderNewColumnTotalArr = (name) => {
  //   // const newData = ContractScreen?.data[0]?.add_on[name] || []; // Access the new data based on the name
  //   const newData = ContractScreen?.data;

  //   return (
  //     <>
  //       {newData.map((item, index) => {
  //         const newdataArr = item?.add_on[name] || [];
  //         return (
  //           <>
  //             {newdataArr?.map((itemData, index_) => (
  //               <th
  //                 key={index}
  //                 scope="col"
  //                 className="border border-slate-300 px-6 py-4"
  //               >
  //                 Transaction {itemData?.tansaction}, Line Item {index + 1}{" "}
  //                 Total {itemData?.total_revenue}
  //               </th>
  //             ))}
  //           </>
  //         );
  //       })}
  //     </>
  //   );
  // };

  const handleAddColumnTotalArr = (name) => {
    // alert(name)
    handleLenghtGet(name);
    const isExpanded = expandedColumnsTotalArr.includes(name);
    const updatedExpandedColumns = isExpanded
      ? expandedColumnsTotalArr.filter((column) => column !== name)
      : [...expandedColumnsTotalArr, name];
    setExpandedColumnsTotalArr(updatedExpandedColumns);
  };

  const handleAddColumnTotalArr2 = (name) => {
    handleLenghtGet(name);
    const isExpanded = expandedColumnsTotalArr.includes(name);
    const updatedExpandedColumns = isExpanded
      ? expandedColumnsTotalArr // If already expanded, keep the same array
      : [...expandedColumnsTotalArr, name]; // Otherwise, add the name to the array
    setExpandedColumnsTotalArr(updatedExpandedColumns);
  };

  // const renderNewColumnRowsBilling = (name, elemItem, indexItem) => {
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

  // const renderNewColumnRowsBallace = (name, elemItem, indexItem) => {
  //   const newData = ContractScreen?.data[0]?.add_on[name] || [];

  //   return newData.map((item, index) => {
  //     let value = "0.0";

  //     if (item.billing.billing) {
  //       const revenueItem = item?.deffered_revenue?.deffered_revenue.find(
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
  const handleLenghtGet = (name) => {
    // alert(name)
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
      (name) => (handleLenghtGet(name), handleAddColumnTotalArr2(name))
    );
  };
  const getMonthAbbreviation = (month) => {
    const date = new Date(Date.UTC(2000, month - 1, 1));
    return date.toLocaleString("default", { month: "short" });
  };
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState({});

  const handleEditClick = (e) => {
    e.preventDefault(); // Prevents the default behavior (page refresh)

    setEditMode(!editMode);
  };

  const handleInputChange = (e, fieldName) => {
    const updatedData = { ...editedData };
    updatedData[fieldName] = e.target.value;
    setEditedData(updatedData);
  };

  const [editedItems, setEditedItems] = useState([]);

  console.log("editedItems-------------", editedItems);

  const handleSaveClick = (e) => {
    e.preventDefault(); // Prevents the default behavior (page refresh)
    setEditMode(false); // Exit edit mode after saving
    let schoolArr = [];
    const formData = new FormData();
    const editedItemsArray = Object.values(editedItems);
    for (var index = 0; index < editedItemsArray.length; index++) {
      schoolArr.push({
        item_description: editedItems[index].item_description,
        quantity: editedItems[index].quantity,
        s_start_d: editedItems[index].s_start_d,
        s_end_d: editedItems[index].s_end_d,
        subscription_status: editedItems[index].subscription_status,
        subscription_terms_month: editedItems[index].subscription_terms_month,
        arr: editedItems[index].arr,
        total_revenue: editedItems[index].total_revenue,
        amount: editedItems[index].amount,
        productp_service: editedItems[index].product_service_id,
        sale_price: editedItems[index].total_revenue,

        // "tansaction":  addfield[index].item_description_notes
      });
    }

    formData.append("items", JSON.stringify(schoolArr));
    formData.append("customer_name", editedData?.customer_name);
    formData.append("transaction_name", editedData?.transaction_name);
    formData.append("order_close_data", editedData?.order_close_data);
    formData.append("billing_method", editedData?.billing_method);
    formData.append("invoice_number", editedData?.invoice_number);
    formData.append("user", userData?.user?.user_id);
    dispatch(
      Contractscreenupdate(editedData?.items?.[0]?.tansaction, formData)
    );
  };

  useEffect(() => {
    // Set editedData when entering edit mode
    setEditedData({ ...ContractScreen?.data?.[0] });
    setEditedItems({ ...ContractScreen?.data?.[0]?.items });
  }, [editMode, ContractScreen]);

  // Add other necessary state variables and functions
  const handleItemInputChange = (e, index, fieldName) => {
    const updatedValue = e.target.value;

    // If the field is product_service_name, find the corresponding product object
    if (fieldName === "product_service_name") {
      const selectedProduct = ProServData.find(
        (item) => item.product_name === updatedValue
      );

      if (selectedProduct) {
        const updatedItems = { ...editedItems };
        updatedItems[index]["product_service_name"] =
          selectedProduct.product_name;
        updatedItems[index]["product_service_id"] = selectedProduct.id;
        setEditedItems(updatedItems);
      }
    } else {
      const updatedItems = { ...editedItems };
      updatedItems[index][fieldName] = updatedValue;
      setEditedItems(updatedItems);
    }
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) {
      return ""; // Return blank string if utcDateString is null or undefined
    }

    const date = new Date(dateString);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0"); // Adding 1 because getUTCMonth() returns zero-based month index
    const day = String(date.getUTCDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const addNewRow = () => {
    const newIndex = Object.keys(editedItems).length; // Use a unique index
    setEditedItems({
      ...editedItems,
      [newIndex]: {
        /* initialize your new row data here */
      },
    });
  };

  const handleRemoveRow = (indexItem) => {
    const updatedItems = { ...editedItems };
    const keys = Object.keys(updatedItems);

    // Remove the item at the specified index
    const updatedObject = Object.fromEntries(
      keys
        .filter((key, index) => index !== indexItem)
        .map((key, index) => [index, updatedItems[key]])
    );

    setEditedItems(updatedObject);
  };

  return (
    <>
      <div className="content removeheightclass">
        <Row>
          <Col md="12">
            <Card className="card contract-top">
              <CardBody>
                {/* <form> */}
                <div className="grid gap-4 mb-4 md:grid-cols-2">
                  <div className="mainSectionContent">
                    <h3 className="childSectionContent">Customer Name</h3>
                    {editMode ? (
                      <input
                        type="text"
                        value={editedData.customer_name}
                        onChange={(e) => handleInputChange(e, "customer_name")}
                      />
                    ) : (
                      <span className="spanSectionContent">
                        {ContractScreen?.data?.[0]?.customer_name}
                      </span>
                    )}
                  </div>

                  <div className="mainSectionContent">
                    <h3 className="childSectionContent">Transaction Name</h3>
                    {editMode ? (
                      <input
                        type="text"
                        value={editedData.transaction_name || "---"}
                        onChange={(e) =>
                          handleInputChange(e, "transaction_name")
                        }
                      />
                    ) : (
                      <span className="spanSectionContent">
                        {ContractScreen?.data?.[0]?.transaction_name ||
                          "------------"}
                      </span>
                    )}
                  </div>

                  <div className="mainSectionContent">
                    <h3 className="childSectionContent">Order Close Date</h3>
                    {editMode ? (
                      <input
                        type="date"
                        value={editedData.order_close_data || ""}
                        onChange={(e) =>
                          handleInputChange(e, "order_close_data")
                        }
                      />
                    ) : (
                      <span className="spanSectionContent">
                        {ContractScreen?.data?.[0]?.order_close_data
                          ? formatUTCDateToLocaleString(
                              ContractScreen?.data?.[0]?.order_close_data
                            )
                          : ""}
                      </span>
                    )}
                  </div>

                  <div className="mainSectionContent">
                    <h3 className="childSectionContent">Billing Method</h3>
                    {editMode ? (
                      <input
                        type="text"
                        value={editedData.billing_method || ""}
                        onChange={(e) => handleInputChange(e, "billing_method")}
                      />
                    ) : (
                      <span className="spanSectionContent">
                        {ContractScreen?.data?.[0]?.billing_method}
                      </span>
                    )}
                  </div>

                  <div className="mainSectionContent">
                    <h3 className="childSectionContent">
                      Transaction Unique ID
                    </h3>
                    {editMode ? (
                      <input
                        type="text"
                        value={editedData.invoice_number || ""}
                        onChange={(e) => handleInputChange(e, "invoice_number")}
                      />
                    ) : (
                      <span className="spanSectionContent">
                        {ContractScreen?.data?.[0]?.invoice_number}
                      </span>
                    )}
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
                <div className="relative shwoDataRealtiveSections">
                  <form onSubmit={handleSaveClick}>
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                      <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr className="tablerowDataShow">
                          <th scope="col" className="px-6 py-3">
                            ORDER FORM
                          </th>
                          <th scope="col" className="px-6 py-3">
                            Product/Service
                          </th>
                          <th scope="col" className="px-6 py-3">
                            Subscription Status
                          </th>
                          <th scope="col" className="px-6 py-3">
                            Start date
                          </th>
                          <th scope="col" className="px-6 py-3">
                            End Date
                          </th>

                          <th scope="col" className="px-6 py-3">
                            Term (Months)
                          </th>
                          <th scope="col" className="px-6 py-3">
                            ARR
                          </th>
                          <th scope="col" className="px-6 py-3">
                            Item Description/Notes
                          </th>
                          <th scope="col" className="px-6 py-3">
                            Quantity
                          </th>
                          <th scope="col" className="px-6 py-3">
                            Amount
                          </th>
                          {/* <th scope="col" className="px-6 py-3">
                          Other Matric1
                        </th>
                        <th scope="col" className="px-6 py-3">
                          Other Matric2
                        </th> */}
                          <th scope="col" className="px-6 py-3">
                            Total Item Revenue Per Rec Policy
                          </th>
                        </tr>
                      </thead>

                      {editedItems && (
                        <>
                          {Object.values(editedItems).map(
                            (elemItem, indexItem) => (
                              <tbody key={indexItem}>
                                <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 trsectioncutom tablerowDataShow">
                                  <td
                                    scope="row"
                                    className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"
                                  >
                                    Line Item {indexItem + 1}
                                  </td>
                                  <td className="px-6 py-4">
                                    {editMode ? (
                                      <div className="addcontractinput">
                                        <select
                                          value={
                                            editedItems[indexItem]
                                              ?.product_service_name || ""
                                          }
                                          onChange={(e) =>
                                            handleItemInputChange(
                                              e,
                                              indexItem,
                                              "product_service_name"
                                            )
                                          }
                                          name="subscription_status"
                                          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 statusdivclass"
                                          required
                                        >
                                          <option value="" disabled selected>
                                            Select
                                          </option>
                                          {ProServData?.length > 0 &&
                                            ProServData?.map((item, index) => (
                                              <option
                                                key={item.id}
                                                value={item.product_name}
                                              >
                                                {item.product_name}
                                              </option>
                                            ))}
                                        </select>
                                      </div>
                                    ) : (
                                      <h3>{elemItem?.product_service_name}</h3>
                                    )}
                                  </td>

                                  <td className="px-6 py-4">
                                    {editMode ? (
                                      <div className="addcontractinput">
                                        <select
                                          value={
                                            editedItems[indexItem]
                                              ?.subscription_status || ""
                                          }
                                          onChange={(e) =>
                                            handleItemInputChange(
                                              e,
                                              indexItem,
                                              "subscription_status"
                                            )
                                          }
                                          name="subscription_status"
                                          required
                                          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 statusdivclass"
                                        >
                                          <option value="active">Active</option>
                                          <option value="pending renewal">
                                            Pending
                                          </option>
                                          <option value="cancelled">
                                            Cancelled
                                          </option>
                                        </select>
                                      </div>
                                    ) : (
                                      <h3>{elemItem?.subscription_status}</h3>
                                    )}
                                  </td>
                                  <td className="px-6 py-4">
                                    {editMode ? (
                                      <input
                                        type="date"
                                        value={
                                          formatDateForInput(
                                            editedItems[indexItem]?.s_start_d
                                          ) || ""
                                        }
                                        onChange={(e) =>
                                          handleItemInputChange(
                                            e,
                                            indexItem,
                                            "s_start_d"
                                          )
                                        }
                                        required
                                      />
                                    ) : (
                                      <h3>
                                        {formatUTCDateToLocaleString(
                                          elemItem?.s_start_d
                                        )}
                                      </h3>
                                    )}
                                  </td>
                                  <td className="px-6 py-4">
                                    {editMode ? (
                                      <input
                                        type="date"
                                        value={
                                          formatDateForInput(
                                            editedItems[indexItem]?.s_end_d
                                          ) || ""
                                        }
                                        onChange={(e) =>
                                          handleItemInputChange(
                                            e,
                                            indexItem,
                                            "s_end_d"
                                          )
                                        }
                                        required
                                      />
                                    ) : (
                                      <h3
                                        style={{
                                          color:
                                            new Date(elemItem?.s_start_d) >
                                            new Date(elemItem?.s_end_d)
                                              ? "red"
                                              : "inherit",
                                        }}
                                      >
                                        {formatUTCDateToLocaleString(
                                          elemItem?.s_end_d
                                        )}
                                        {/* {formatUTCDateToLocaleString(elemItem?.s_start_d) >
                                          formatUTCDateToLocaleString(elemItem?.s_end_d) && " 🔴"} */}
                                        {new Date(elemItem?.s_start_d) >
                                          new Date(elemItem?.s_end_d) && " 🔴"}
                                      </h3>
                                    )}
                                  </td>

                                  <td className="px-6 py-4">
                                    {editMode ? (
                                      <input
                                        type="number"
                                        value={
                                          editedItems[indexItem]
                                            ?.subscription_terms_month || ""
                                        }
                                        onChange={(e) =>
                                          handleItemInputChange(
                                            e,
                                            indexItem,
                                            "subscription_terms_month"
                                          )
                                        }
                                        required
                                      />
                                    ) : (
                                      <h3>
                                        {elemItem?.subscription_terms_month}
                                      </h3>
                                    )}
                                  </td>
                                  <td className="px-6 py-4">
                                    {editMode ? (
                                      <input
                                        type="number"
                                        value={
                                          editedItems[indexItem]?.arr || ""
                                        }
                                        onChange={(e) =>
                                          handleItemInputChange(
                                            e,
                                            indexItem,
                                            "arr"
                                          )
                                        }
                                        required
                                      />
                                    ) : (
                                      <h3>{elemItem?.arr}</h3>
                                    )}
                                  </td>
                                  <td className="px-6 py-4">
                                    {editMode ? (
                                      <input
                                        type="text"
                                        value={
                                          editedItems[indexItem]
                                            ?.item_description || ""
                                        }
                                        onChange={(e) =>
                                          handleItemInputChange(
                                            e,
                                            indexItem,
                                            "item_description"
                                          )
                                        }
                                        required
                                      />
                                    ) : (
                                      <h3>{elemItem?.item_description}</h3>
                                    )}
                                  </td>
                                  <td className="px-6 py-4">
                                    {editMode ? (
                                      <input
                                        type="number"
                                        value={
                                          editedItems[indexItem]?.quantity || ""
                                        }
                                        onChange={(e) =>
                                          handleItemInputChange(
                                            e,
                                            indexItem,
                                            "quantity"
                                          )
                                        }
                                        required
                                      />
                                    ) : (
                                      <h3>{elemItem?.quantity}</h3>
                                    )}
                                  </td>
                                  <td className="px-6 py-4">
                                    {editMode ? (
                                      <input
                                        type="number"
                                        value={
                                          editedItems[indexItem]?.amount || ""
                                        }
                                        onChange={(e) =>
                                          handleItemInputChange(
                                            e,
                                            indexItem,
                                            "amount"
                                          )
                                        }
                                        required
                                      />
                                    ) : (
                                      <h3>{elemItem?.amount}</h3>
                                    )}
                                  </td>
                                  <td className="px-6 py-4">
                                    {editMode ? (
                                      <input
                                        type="number"
                                        value={
                                          editedItems[indexItem]
                                            ?.total_revenue || ""
                                        }
                                        onChange={(e) =>
                                          handleItemInputChange(
                                            e,
                                            indexItem,
                                            "total_revenue"
                                          )
                                        }
                                        required
                                      />
                                    ) : (
                                      <h3>{elemItem?.total_revenue}</h3>
                                    )}
                                  </td>
                                  {editMode && (
                                    <>
                                      <td className="px-6 py-4">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleRemoveRow(indexItem)
                                          }
                                        >
                                          <span role="img" aria-label="Remove">
                                            ❌
                                          </span>
                                        </button>
                                      </td>
                                    </>
                                  )}
                                </tr>
                              </tbody>
                            )
                          )}
                        </>
                      )}
                      {userData?.user?.role == "1" && (
                        <>
                          {editMode ? (
                            <button className="addnewrowdb" type="submit">
                              Save
                            </button>
                          ) : (
                            <button
                              className="addnewrowdb"
                              type="button"
                              onClick={handleEditClick}
                            >
                              Edit
                            </button>
                          )}
                        </>
                      )}
                      {editMode && (
                        <>
                          {" "}
                          <button className="addnewrowdb" onClick={addNewRow}>
                            Add New Row
                          </button>
                        </>
                      )}
                    </table>
                  </form>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>
      <div className="contentSecondThird removeheightclass newaddclassremovecss">
        <Row>
          <Col md="12">
            <Card className="card">
              <CardBody>
                <div className="grid gap-4 mb-4 md:grid-cols-5">
                  <div>Invoice 1</div>
                  <div>
                    <div className="mainSectionContentjj">
                      <h3 className="childSectionContentjj"> Invoice#</h3>
                      <span className="spanSectionContentjj">
                        {" "}
                        {ContractScreen?.data?.invoice_number}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="mainSectionContentjj">
                      <h3 className="childSectionContentjj">Invoice Date</h3>
                      <span className="spanSectionContentjj">
                        {ContractScreen?.data?.order_close_data
                          ? new Date(
                              ContractScreen?.data?.order_close_data
                            ).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                            })
                          : ""}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="mainSectionContentjj">
                      <h3 className="childSectionContentjj">Invoice Address</h3>
                      <span className="spanSectionContentjj">
                        {" "}
                        {ContractScreen?.data?.invoice_adresss}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="mainSectionContentjj">
                      <h3 className="childSectionContentjj">
                        Other Invoice Info
                      </h3>
                      <span className="spanSectionContentjj">
                        {ContractScreen?.data?.other_invoice_info}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="relative shwoDataRealtiveSections">
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
                    {ContractScreen?.data?.[0]?.items.map(
                      (elemItem, indexItem) => (
                        <tbody>
                          <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 trsectioncutom tablerowDataShow">
                            <td
                              scope="row"
                              className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"
                            >
                              Line Item {indexItem + 1}
                            </td>
                            <td className="px-6 py-4">
                              <h3>{elemItem?.item_description}</h3>
                            </td>
                            <td className="px-6 py-4 ">
                              <h3>{elemItem?.quantity}</h3>
                            </td>
                            <td className="px-6 py-4 ">
                              <h3>
                                {elemItem?.s_start_d
                                  ? formatUTCDateToLocaleString(
                                      elemItem.s_start_d
                                    )
                                  : ""}
                              </h3>
                            </td>
                            <td className="px-6 py-4">
                              <h3>
                                {elemItem?.s_end_d
                                  ? formatUTCDateToLocaleString(
                                      elemItem.s_end_d
                                    )
                                  : ""}
                              </h3>
                            </td>
                            <td className="px-6 py-4 ">
                              <h3>{elemItem?.amount}</h3>
                            </td>
                          </tr>
                        </tbody>
                      )
                    )}
                  </table>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>
      <div className="container">
        <div className="divtable1">
          <div className=" Revenuecont ">
            <h1 className="text-center py-2">ARR</h1>
            <div className="table-responsive ps ps--active-x ps--active-y ps--scrolling-y">
              <table className="table table-bordered table-sm table-striped dataTable">
                <thead className="border-b font-medium dark:border-neutral-500">
                  <tr>
                    <th
                      scope="col"
                      className="border border-slate-300 px-6 py-4"
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

                    {/* {namedynamic?.map((name, nameIndex) => {
                      const totalItemRev = ContractScreen?.total_items_arr;
                      const newData = totalItemRev?.[name] || [];

                      // Add a check to skip further processing if newData is empty or has length smaller than 1
                      if (newData.length < 1) {
                        return null; // Skip this iteration
                      }

                      return (
                        <React.Fragment key={nameIndex}>
                          {expandedColumnsTotalArr?.includes(name) &&
                            renderNewColumnTotalArr(name)}
                          <th
                            scope="col"
                            className="border border-slate-300 px-6 py-4"
                          >
                            <i
                              className={
                                expandedColumnsTotalArr?.includes(name)
                                  ? "fa fa-minus minusiconinSub"
                                  : "fa fa-plus plusiconinSub"
                              }
                              onClick={() => handleAddColumnTotalArr(name)}
                            ></i>
                            ARR
                          </th>
                        </React.Fragment>
                      );
                    })} */}
                  </tr>
                </thead>

                <tbody className="contractpagetabale">
                  {namedynamic?.map((name, nameIndex) => {
                    const totalItemRev = ContractScreen?.total_items_arr;
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
                            className="border border-slate-300 px-6 py-4"
                          >
                            <i
                              className={
                                expandedColumnsTotalArr?.includes(name)
                                  ? "fa fa-minus minusiconinSub"
                                  : "fa fa-plus plusiconinSub"
                              }
                              onClick={() => handleAddColumnTotalArr(name)}
                            ></i>
                            ARR
                          </th>

                          {showDateForArr?.map((elemItem, indexItem) => {
                            const totalItemRev =
                              ContractScreen?.total_items_arr;

                            const rowData = namedynamic.map((name) => {
                              const newData = totalItemRev?.[name] || [];

                              // Add a check to skip further processing if newData is empty or has length smaller than 1
                              if (newData.length < 1) {
                                return null; // Skip this iteration
                              }
                              const item = newData.find(
                                (item) => item.date === elemItem
                              );

                              const value = item
                                ? item.value.toLocaleString("en-US", {
                                    style: "decimal",
                                  })
                                : "0.0";

                              return (
                                <React.Fragment key={`${name}_${elemItem}`}>
                                  {value && <>{value}</>}
                                  {/* {expandedColumnsTotalArr?.includes(name) &&
                                            renderNewColumnRowsARRArr(
                                              name,
                                              elemItem,
                                              indexItem
                                            )} */}
                                </React.Fragment>
                              );
                            });

                            return (
                              <td
                                key={indexItem}
                                className="border-b dark:border-neutral-500"
                              >
                                {rowData}
                              </td>
                            );
                          })}
                        </tr>
                      </React.Fragment>
                    );
                  })}

                  {/* {showDateForArr?.map((elemItem, indexItem) => {
                    const totalItemRev = ContractScreen?.total_items_arr;

                    const rowData = namedynamic.map((name) => {
                      const newData = totalItemRev?.[name] || [];

                      // Add a check to skip further processing if newData is empty or has length smaller than 1
                      if (newData.length < 1) {
                        return null; // Skip this iteration
                      }
                      const item = newData.find(
                        (item) => item.date === elemItem
                      );

                      const value = item
                        ? item.value.toLocaleString("en-US", {
                          style: "decimal",
                        })
                        : "0.0";

                      return (
                        <React.Fragment key={`${name}_${elemItem}`}>
                          {expandedColumnsTotalArr?.includes(name) &&
                            renderNewColumnRowsARRArr(
                              name,
                              elemItem,
                              indexItem
                            )}
                          {value && (
                            <td className="border border-slate-300 whitespace-nowrap px-6 py-4">
                              {value}
                            </td>
                          )}
                        </React.Fragment>
                      );
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
                      </tr>
                    );
                  })} */}
                </tbody>
              </table>
              <button className="addrow" onClick={handleAddRow}>
                Add Row
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="content maintableDatashowData">
        <Row>
          <Col md="12">
            <Card className="card">
              <CardBody>
                <div className="alltableaddinThisdiv2 alltablediv">
                  {/* ------------------------------------------------------------first_Table_3-------------------------------------------- */}

                  <div className="flex flex-col">
                    <div className=" sm:-mx-6 lg:-mx-8">
                      <div className="inline-block min-w-full py-2 sm:px-6 lg:px-8 custom-mdb-table">
                        <div className=" Revenuecont ">
                          <h1 className="text-center py-2">
                            <b>Revenue</b>
                          </h1>
                          <div className="table-responsive ps ps--active-x ps--active-y ps--scrolling-y">
                            <table className="table table-bordered table-sm table-striped dataTable">
                              <thead className="border-b font-medium dark:border-neutral-500">
                                <tr>
                                  <th
                                    scope="col"
                                    className="border border-slate-300 px-6 py-4"
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

                                  {/* {namedynamic?.map((name, nameIndex) => (
                                    <React.Fragment key={nameIndex}>
                                      {expandedColumns?.includes(name) &&
                                        renderNewColumn(name)}
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
                                          onClick={() => handleAddColumn(name)}
                                        ></i>
                                        {name}
                                      </th>
                                    </React.Fragment>
                                  ))} */}

                                  {/* <th
                                    scope="col"
                                    className="border border-slate-300 px-6 py-4"
                                  >
                                    Total
                                  </th>
                                  <th
                                    scope="col"
                                    className="border border-slate-300 px-6 py-4"
                                  >
                                    Cumulative
                                  </th> */}
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

                                {/* {showData?.months?.map(
                                  (elemItem, indexItem) => {
                                    const totalItemRev =
                                      ContractScreen?.total_items_rev;
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
                                        <React.Fragment
                                          key={`${name}_${elemItem}`}
                                        >
                                          {expandedColumns?.includes(name) &&
                                            renderNewColumnRows(
                                              name,
                                              elemItem,
                                              indexItem
                                            )}
                                          <td className="border border-slate-300 whitespace-nowrap px-6 py-4">
                                            {value}
                                          </td>
                                        </React.Fragment>
                                      );
                                    });

                                    const value1 =
                                      showData?.tatalRevenue?.[indexItem];
                                    const formattedValue =
                                      value1.toLocaleString("en-US", {
                                        style: "decimal",
                                      });
                                    const value2 =
                                      showData?.cumilativeRevenue?.[indexItem];
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
                                  <th scope="col" className="px-6 py-4">
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
                                  </th>
                                  <th
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
                                    className="border border-slate-300 px-6 py-4"
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
                                        {name}
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

                                {/* {shwoDefRev?.months?.map(
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

export default ContractScreen;
