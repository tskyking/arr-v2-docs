import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { Card, CardHeader, CardBody, Row, Col, Button } from "reactstrap";
import { MDBDataTable, MDBTableFoot } from "mdbreact";
import { MDBTable, MDBTableHead, MDBTableBody } from "mdbreact";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Clientarrget } from "../../redux/actions/Admin-saasot-action";
import moment from "moment";

const ClientDetails = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [usersForRender2, setUsersForRender2] = useState([]);

  const url = window.location.href;
  const path = new URL(url).pathname;
  const ids = path.split("/").pop().split(",");
  console.log("ids--------------------", ids);
  const tableRef = useRef(null);

  const { ARRdata: Arrlistdata } = useSelector(
    (state) => state.ClientarrReducer
  );

  useEffect(() => {
    dispatch(Clientarrget(ids));
  }, []);

  const handleCustomerClick = (index, customer_name) => {
    const idxArray = Arrlistdata?.data[index].ids; // Get the idx array
    navigate(`/customer-screen/${idxArray}`);
  };

  useEffect(() => {
    if (Arrlistdata) {
      const userData = Arrlistdata.data.map((item, index) => {
        const formattedData = {
          customer_name: (
            <div
              className="clickable-customer"
              onClick={() => handleCustomerClick(index)}
              title={item.customer_name}
            >
              {item.customer_name}
            </div>
          ),
        };

        item.arr.forEach((entry) => {
          const columnName = entry.date
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "_");
          formattedData[columnName] = entry.value.toFixed(2);
        });

        return formattedData;
      });

      setUsersForRender2(userData);
    }
  }, [Arrlistdata]);

  const columns3 = [
    {
      label: <div className="cust">Customer Name</div>,
      field: "customer_name",
      sort: "asc",
      width: 500,
      render: (rowData) => (
        <div className="tooltip">
          <div
            className="clickable-customer"
            title={rowData.customer_name}
            onClick={() => handleCustomerClick()}
          >
            {rowData.customer_name}
          </div>
        </div>
      ),
    },
    ...(Arrlistdata?.heading?.map((heading) => ({
      label: heading,
      field: heading.toLowerCase().replace(/[^a-z0-9]/g, "_"),
      sort: "asc",
      width: 500,
      render: (rowData) => (
        <div className="tooltip">
          <div
            className="hover-value"
            title={rowData[heading.toLowerCase().replace(/[^a-z0-9]/g, "_")]}
          >
            {rowData[heading.toLowerCase().replace(/[^a-z0-9]/g, "_")]}
          </div>
        </div>
      ),
    })) || []),
  ];

  const data3 = {
    columns: columns3,
    rows: usersForRender2,
  };

  return (
    <>
      <div className="content">
        <Row>
          <Col md="12">
            <Card className="card">
              <CardBody>
                <div className="table-container" ref={tableRef}>
                  <MDBDataTable
                    responsive
                    striped
                    bordered
                    small
                    data={data3}
                  />
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>
    </>
  );
};

export default ClientDetails;
