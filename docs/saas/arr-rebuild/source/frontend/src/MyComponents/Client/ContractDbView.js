import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { Card, CardHeader, CardBody, Row, Col, Button } from "reactstrap";
import {
  ViewContractDbWithoutPageAction,
  Invoicelistrequest,
  Arrlist,
  Datelist,
  GetContractDbFilterListAction,
  getCutomerTotalFilterAction,
} from "../../redux/actions/Admin-saasot-action";
import { useDispatch, useSelector } from "react-redux";
import moment from "moment";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { CSVLink } from "react-csv";
import { MDBDataTable, MDBTableFoot } from "mdbreact";
import { Link, useNavigate } from "react-router-dom";
import SpinnerLoading from "../../containers/SpinnerLoader";
import LoadingSpinner from "../../containers/LoadingSpinner";

const ContractDbView = () => {

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [secTableLoader, setSecTableLoader] = useState(false);
  const [revinueList, setRevinueList] = useState("billing");
  const [startPeriod, setStartPeriod] = useState("Jun 18");
  const [endPeriod, setEndPeriod] = useState("Nov 29");
  const seccontainerRef = useRef(null);
  const [selectedOption, setSelectedOption] = useState("day");
  const [usersForRender, setUsersForRender] = useState([]);
  const [addSection, setAddSection] = useState("");
  const [filteredData, setFilteredData] = useState([]);
  const [pageNumShow1, setPageNumShow1] = useState(1);
  const [invoicelistPage, setInvoicelistPage] = useState();

  const { DBfilterData } = useSelector(
    (state) => state.GetContractDbFilterListReducer
  );
  const { ViewContractDbData, success, error } = useSelector(
    (state) => state.ViewContractDbWihtoutPageReducer
  );

  const { getCotTatalFilter } = useSelector((state) => state.getCutomerTotalFilterReducer);

  useEffect(() => {
    if (revinueList) {
      dispatch(
        ViewContractDbWithoutPageAction(
          revinueList,
          startPeriod,
          endPeriod,
          selectedOption,
          pageNumShow1
        )
      );
    }
  }, [revinueList, selectedOption,pageNumShow1]);

  useEffect(() => {
    if (error) {
      setSecTableLoader(false)
    }
  }, [error]);

  useEffect(() => {
    if (selectedOption) {
      dispatch(getCutomerTotalFilterAction(selectedOption, revinueList));
    }
  }, [selectedOption, revinueList]);

  useEffect(() => {
    dispatch(GetContractDbFilterListAction());
  }, []);

  useEffect(() => {
    if (
      ViewContractDbData &&
      ViewContractDbData.data &&
      ViewContractDbData.heading
    ) {
      const keysToMatch = ["revenue", "billing", "deferred_revenue"];

      const filterArray = (item) => {
        const matchedKey = keysToMatch.find((key) => item[key]);
        return matchedKey ? matchedKey : null;
      };
      const userData = ViewContractDbData?.data?.map((item, index) => {
        const selectedArray = filterArray(item);
        const formattedData = {
          product_name: (
            <div className="viewcontractdiv1t" style={{ display: "flex" }}>
              <div style={{ display: "flex" }}>
                <p
                  className="editiconDeletenew"
                  onClick={() =>
                    handleCustomerClick1(
                      index,
                      item?.items?.tansaction?.customer_name
                    )
                  }
                >
                  {item?.items?.tansaction?.customer_name}
                </p>
              </div>
            </div>
          ),

          order_close_data: (
            <p className="producttextdate">
              {item.items?.tansaction?.order_close_data}
            </p>
          ),
          customer_name: item.items?.tansaction?.customer_name,

          invoice_number: item.items?.tansaction?.invoice_number,
          billing_method: (
            <p className="producttext">
              {item?.items?.productp_service?.product_name}
            </p>
          ),
          qty: item.items?.quantity,
          sale_price: item.items?.sale_price,
          amount: item.items?.amount,
          s_start_d: moment(item.items?.s_start_d).format("MM-DD-yyyy"),
          s_end_d: moment(item.items?.s_end_d).format("MM-DD-yyyy"),
        };
        if (selectedArray !== null) {
          ViewContractDbData?.heading?.forEach((heading) => {
            const columnName = heading.toLowerCase().replace(/[^a-z0-9]/g, "_");
            const revenue = item[selectedArray]?.find(
              (rev) =>
                rev.date.toLowerCase().replace(/[^a-z0-9]/g, "_") === columnName
            );
            formattedData[columnName] = revenue ? revenue.value.toFixed(2) : "";
          });
        }
        return formattedData;
      });

      // Calculate column totals
      const columnTotals = {
        product_name: "Total",
        order_close_data: "",
        customer_name: "",
        invoice_number: "",
        billing_method: "",
        qty: null,
        sale_price: null,
        amount: null,
        ...(ViewContractDbData?.heading?.filter(Boolean).map((heading) => {
          const field = heading?.toLowerCase()?.replace(/[^a-z0-9]/g, "_");
          return {
            label: heading || "",
            field: field || "",
            sort: "asc",
            width: 500,
          };
        }) ?? []),
      };

      ViewContractDbData?.heading?.forEach((heading) => {
        const columnName = heading;
        const apiEntry = getCotTatalFilter?.total?.find(entry => entry.date === columnName);
        columnTotals[columnName] = apiEntry ? apiEntry.value.toFixed(2) : "0.00";
      });

      // Add the totals row to the userData array
      userData.push(columnTotals);

      setUsersForRender(userData);
    }
  }, [ViewContractDbData]);

  const handleCustomerClick1 = (index, customer_name) => {
    // Handle the click event for the customer_name here
    const idxArray = ViewContractDbData?.data[index].tansaction?.id; // Get the idx array
    localStorage.setItem("name", customer_name);
    navigate(`/customer-screen/${idxArray}`);
  };


  const csvData1 = usersForRender?.map((rowData) => {
    const dynamicColumns = ViewContractDbData?.heading
      ?.map((heading) => {
        const field = heading?.toLowerCase()?.replace(/[^a-z0-9]/g, "_");
        const value = rowData[field];
        return { [heading]: value };
      })
      .filter(
        (column) =>
          column[Object.keys(column)[0]] !== undefined &&
          column[Object.keys(column)[0]] !== null &&
          column[Object.keys(column)[0]] !== 0
      );

    const dataRow = {
      Customer: rowData.customer_name || "",
      "Invoice Date": rowData.order_close_data || "",
      "Invoice Number": rowData.invoice_number || "",
      "Product/Service": rowData.billing_method || "",
      Qty: rowData.qty || "",
      "Sales Price": rowData.sale_price || "",
      Amount: rowData.amount || "",
      "Subscription Start Date": rowData.s_start_d || "",
      "Subscription End Date": rowData.s_end_d || "",
      ...(dynamicColumns?.reduce((acc, cur) => ({ ...acc, ...cur }), {}) || {}),
    };

    return dataRow;
  });

  const createWorksheet = () => {
    const worksheetData = [
      Object.keys(csvData1[0]),
      ...csvData1.map(Object.values),
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    return worksheet;
  };

  const createWorkbook = () => {
    const worksheet = createWorksheet();
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet 1");
    return workbook;
  };

  const saveWorkbook = (workbook, filename) => {
    const excelBuffer = XLSX.write(workbook, {
      type: "array",
      bookType: "xlsx",
    });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, filename);
  };

  const handleDownloadExcel = () => {
    const workbook = createWorkbook();
    saveWorkbook(workbook, "data.xlsx");
  };

  useEffect(() => {
    if (ViewContractDbData?.data) {
      setFilteredData((prevState) => [...prevState, ...ViewContractDbData?.data]);
      setSecTableLoader(false);
    }
  }, [ViewContractDbData]);

  const sechandleScroll = () => {
    setAddSection("addfixedDiv");

    const container = seccontainerRef.current;
    if (container) {
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      const threshold = 150; // Adjust this value as needed
        if (
          scrollTop + clientHeight >= scrollHeight - threshold &&
          pageNumShow1
        ) {
          // alert(pageNumShow1);
          setSecTableLoader(true);
          setPageNumShow1((prevCount) => prevCount + 1);
          // containerRef.current.scrollTop = 2
      }

    }
  };

  return (
    <>
      <div className="content mb-0">
        <Row>
          <Col md="12">
            <Card className="card spacing_bottom spacing_bottom_0">
              <div className="CardHeader">
                <div className="parentSectionContractDb">
                  <div className="Contract-Database-List-main">
                    <Link to="/admin/view-contract-Db">
                      <h1 className="Contract-Database-List-text"> Contract Database List</h1>
                    </Link>
                    <span className="totaldata"> {ViewContractDbData?.count} Total Entries</span>
                  </div>
                  <div className="ChildSectionContractDb dbviewsec">
                    <div className="revenutypefirstsection">
                      <select
                        value={revinueList}
                        onChange={(e) => setRevinueList(e.target.value)}
                        name="revenue_type_frist"
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 revenuetypeclassdiv"
                      >
                        {DBfilterData?.data?.map((item) => (
                          <option value={item.name}>{item.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="excelCsvDownload">
                      {usersForRender && usersForRender.length > 0 && (
                        <button
                          className="csvbuttonfordownloadExcel"
                          onClick={handleDownloadExcel}
                        >
                          Excel
                        </button>
                      )}
                      {usersForRender && usersForRender.length > 0 && (
                        <CSVLink className="csvbuttonfordownload" data={csvData1}>
                          CSV
                        </CSVLink>
                      )}
                    </div>
                  </div>
                </div>
              </div>




              <div className="content">
                <div className="container-fluid table_1_Last">
                  <div
                    className="table_res_newsecLast"
                    onScroll={sechandleScroll}
                    ref={seccontainerRef}
                  >
              <table className="table-responsive">
                <thead>
                  <tr>
                    <th className="news_customer">CUSTOMER</th>
                    <th>INVOICE DATE</th>
                    <th>INVOICE NUMBER</th>
                    <th>Product/Service</th>
                    <th>Qty</th>
                    <th>Sales Price</th>
                    <th>Amount</th>
                    <th>SUBSCRIPTION START DATE</th>
                    <th>SUBSCRIPTION END DATE</th>
                    {ViewContractDbData?.heading?.map((heading, index) => (
                      <th key={index} className="heading">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                        {filteredData?.map((rowData, rowIndex) => {
                          const formattedData = {
                            product_name: (
                              <div
                                className="viewcontractdiv1t"
                                style={{ display: "flex" }}
                              >
                                <div style={{ display: "flex" }}>
                                  <p
                                    className="editiconDeletenew"
                                    onClick={() =>
                                      handleCustomerClick1(
                                        rowIndex,
                                        rowData?.items?.tansaction
                                          ?.customer_name
                                      )
                                    }
                                  >
                                    {rowData?.items?.tansaction?.customer_name}
                                  </p>
                                </div>
                              </div>
                            ),
                            order_close_data:
                              rowData?.items?.tansaction?.order_close_data,
                            customer_name:
                              rowData?.items?.tansaction?.customer_name,
                            invoice_number:
                              rowData?.items?.tansaction?.invoice_number,
                            billing_method:
                              rowData?.items?.productp_service?.product_name,
                            qty: rowData?.items?.quantity,
                            sale_price: rowData?.items?.sale_price,
                            amount: rowData?.items?.amount,
                            s_start_d: moment(rowData.items?.s_start_d).format(
                              "MM-DD-yyyy"
                            ),
                            s_end_d: moment(rowData.items?.s_end_d).format(
                              "MM-DD-yyyy"
                            ),
                          };

                          const keysToMatch = [
                            "revenue",
                            "billing",
                            "deferred_revenue",
                          ];
                          const filterArray = (item) => {
                            const matchedKey = keysToMatch.find(
                              (key) => item[key]
                            );
                            return matchedKey ? matchedKey : null;
                          };
                          const selectedArray = filterArray(rowData);

                          if (selectedArray !== null) {
                            ViewContractDbData?.heading?.forEach((heading) => {
                              const columnName = heading
                                .toLowerCase()
                                .replace(/[^a-z0-9]/g, "_");
                              const revenue = rowData[selectedArray]?.find(
                                (rev) =>
                                  rev.date
                                    .toLowerCase()
                                    .replace(/[^a-z0-9]/g, "_") === columnName
                              );
                              formattedData[columnName] = revenue
                                ? revenue.value.toFixed(2)
                                : "";
                            });
                          }

                          return (
                            <tr key={rowIndex}>
                              <td>{formattedData.product_name}</td>
                              <td>
                                <p className="datetext1">
                                  {formattedData.order_close_data}
                                </p>
                              </td>
                              <td>{formattedData.invoice_number}</td>
                              <td>
                                <p className="method-text">
                                  {formattedData.billing_method}
                                </p>
                              </td>
                              <td>{formattedData.qty}</td>
                              <td>{formattedData.sale_price}</td>
                              <td>{formattedData.amount}</td>
                              <td>{formattedData.s_start_d}</td>
                              <td>{formattedData.s_end_d}</td>
                              {ViewContractDbData?.heading?.map((heading, index) => (
                                <td key={index}>
                                  <div className="hover-value">
                                    {
                                      formattedData[
                                      heading
                                        .toLowerCase()
                                        .replace(/[^a-z0-9]/g, "_")
                                      ]
                                    }
                                  </div>
                                </td>
                              ))}
                            </tr>
                          );
                        })}

                        {/* {pageNumShow < pageSize && (
                          <div className="loadingsctionForLastTable">
                            <p className="loadingParagraph">Loading.....</p>
                          </div>
                        )} */}
                      </tbody>
                <tfoot className="lastTableTfoot">
                  {ViewContractDbData?.heading?.length > 0 ? (
                    <tr className="totalRow">
                      <td>Total</td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                      {ViewContractDbData?.heading?.map(
                        (heading, headingIndex) => {
                          const columnName = heading
                            .toLowerCase()
                            .replace(/[^a-z0-9]/g, "_");
                          const totalForColumn =
                            getCotTatalFilter?.total?.find(
                              (total) =>
                                total.date
                                  .toLowerCase()
                                  .replace(/[^a-z0-9]/g, "_") ===
                                columnName
                            );
                          const totalValue = totalForColumn
                            ? (totalForColumn.value).toLocaleString("en-US", {
                              style: "decimal",
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            })
                            : 0;

                          return (
                            <td key={headingIndex}>
                              {totalValue}
                            </td>
                          );
                        }
                      )}
                    </tr>
                  ) : null}
                </tfoot>
              </table>
              </div>
              {secTableLoader && (
                    <div className="Sectableloadersection">
                      <SpinnerLoading />
                    </div>
                  )}
              </div>
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    </>
  );
};

export default ContractDbView;
