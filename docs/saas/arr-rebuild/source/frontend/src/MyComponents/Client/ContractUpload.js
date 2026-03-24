import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { Card, CardHeader, CardBody, Row, Col, Button } from "reactstrap";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { CsvShowClientAction, Contractsearch } from "../../redux/actions/Admin-saasot-action";
import moment from "moment";
import SpinnerLoading from "../../containers/SpinnerLoader";

const ContractUpload = () => {
  const dispatch = useDispatch();
  const [secTableLoader, setSecTableLoader] = useState(false);
  const [scroller, setscroller] = useState(false);
  const [filteredData, setFilteredData] = useState([]);
  const [pageNumShow1, setPageNumShow1] = useState(1);
  const seccontainerRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { CsvShowData, success, error } = useSelector(
    (state) => state.CsvShowClientReducer
  );

  const { Contractsearchrecord, success: searchsuceess } = useSelector(
    (state) => state.Contractsearch
  );


  useEffect(() => {
    dispatch(CsvShowClientAction(pageNumShow1));
  }, [pageNumShow1]);

  useEffect(() => {
    if (Contractsearchrecord && searchsuceess && searchQuery) {
      setFilteredData(Contractsearchrecord)
      setscroller(true)
    }

  }, [Contractsearchrecord]);

  function formatUTCDateToLocaleString(utcDateString) {
    if (!utcDateString) {
      return ''; // Return blank string if utcDateString is null or undefined
    }
  
    const date = new Date(utcDateString);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Adding 1 because getUTCMonth() returns zero-based month index
    const day = String(date.getUTCDate()).padStart(2, '0');
  
    return `${month}/${day}/${year}`;
  }
  

  useEffect(() => {
    if (error) {
      setSecTableLoader(false)
    }
  }, [error]);


  useEffect(() => {
    if (CsvShowData?.data) {
      setFilteredData((prevState) => [...prevState, ...CsvShowData?.data]);
      setSecTableLoader(false);
    }
  }, [CsvShowData]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (value) {
      handleSearch(value)
    } else {
      setscroller(false)
      dispatch(CsvShowClientAction("1"));
    }
  };
  const handleSearch = (value) => {
    dispatch(Contractsearch(value))
  }


  const sechandleScroll = () => {
    const container = seccontainerRef.current;
    if (container) {
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      const threshold = 150; // Adjust this value as needed
      if (pageNumShow1 < CsvShowData?.page_size && !scroller) {
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


    }
  };





  return (
    <>
      <div className="content">
        <Row>
          <Col md="12">
            <Card className="card uploadtable">
              <CardHeader>
                <div class="contract-uploadtop">
                  <Link to="/upload-file">
                    <button class="button-text-t uploadfilessubmitbutton">
                      Upload Contract
                    </button>
                  </Link>
                </div>
              </CardHeader>
              <CardBody>

                <div className="content">
                  <div
                    className="table-responsive1414114"
                    style={{ display: "flex", marginBottom: "10px" }}
                  >
                    <input
                      type="text"
                      className="Search-by-customer-name"
                      placeholder="Search by customer name"
                      value={searchQuery}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="container-fluid table_1_Last">
                    <div
                      className="table_res_newsecLast contract-upload-cls"
                      onScroll={sechandleScroll}
                      ref={seccontainerRef}
                    >
                      <table className="table-responsive">
                        <thead>
                          <tr>
                            <th className="news_customer">CUSTOMER</th>
                            <th>INVOICE DATE</th>
                            <th>TRANSACTION TYPE</th>
                            <th>INVOICE NUMBER</th>
                            <th>PRODUCT SERVICE</th>
                            <th>MEMO DESCRIPTION</th>
                            <th>QUANTITY</th>
                            <th>SALE PRICE</th>
                            <th>AMOUNT</th>
                            <th>SUBSCRIPTION START DATE</th>
                            <th>SUBSCRIPTION END DATE</th>
                          </tr>
                        </thead>
                        <tbody className="contract-up-table">
                          {filteredData?.map((rowData, rowIndex) => {
                            return (
                              <tr key={rowIndex}>
                                <td>
                                  {rowData?.tansaction.customer_name}
                                  {rowData?.tansaction.red_flag && <span style={{ color: 'red' }}> 🚩</span>}
                                </td>

                                <td>
  {rowData?.tansaction.order_close_data
    ? formatUTCDateToLocaleString(rowData.tansaction.order_close_data)
    : ''}
</td>

                                <td>{rowData.tansaction.billing_method}</td>
                                <td>{rowData.tansaction.invoice_number}</td>
                                <td>{rowData.productp_service.product_name}</td>
                                <td>{rowData.item_description}</td>
                                <td>{rowData.quantity}</td>
                                <td>{rowData.sale_price}</td>
                                <td>{rowData.amount}</td>
                                <td>{formatUTCDateToLocaleString(rowData.s_start_d)}</td>
                                <td>{formatUTCDateToLocaleString(rowData.s_end_d)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="lastTableTfoot">

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
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>
    </>
  );
};

export default ContractUpload;
