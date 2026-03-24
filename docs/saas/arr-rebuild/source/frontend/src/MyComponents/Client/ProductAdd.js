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
import { Card, CardHeader, CardBody, Row, Col, Button } from "reactstrap";
import { useDispatch, useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";
import {
  GetProductServiceAction,
  GetListProductServiceTypeAction,
  GetListRevenueAction,
  AddProductServiceAction,
  GetByIdProductAction,
  GetListProductServiceNameAction,
  DeleteAction
} from "../../redux/actions/Admin-saasot-action";

import swal from "sweetalert";
import { validations } from "../../utils";

const Productlist = () => {
  const dispatch = useDispatch();
  const [usersForRender, setUsersForRender] = useState([]);
  const {
    ProServTypeData,
    loading: proServTypeDataLoading,
    error: proServTypeDataError,
  } = useSelector((state) => state.GetListProductServiceTypeReducer);

  const {
    success: deleteupdate
  } = useSelector((state) => state.UpdateReducer);

  const {
    success: DeleteReducer
  } = useSelector((state) => state.DeleteReducer2);


  useEffect(() => {
    dispatch(GetListProductServiceTypeAction());
  }, [deleteupdate,DeleteReducer]);

  useEffect(() => {
    let userData = [];
    if (ProServTypeData && ProServTypeData.length > 0) {
      ProServTypeData.map((item, index) => {
        item.title = item.productp_service_type;
        item.is_active = (
          <div style={{ display: "flex" }}>
            {item.is_active ? (
              <div className="active_status">
                <i className="fa fa-check" aria-hidden="true"></i>{" "}
              </div>
            ) : (
              <div className="inactive_status">
                <i className="fa fa-times" aria-hidden="true"></i>
              </div>
            )}
          </div>
        );

        item.action = (
          <div style={{ display: "flex" }}>
            <Link
              title="edit"
              className="EditBut editAdminButton editAdminbtnsec"
              to={`/Product/Service-update/${item.id}`}
            >
              {" "}

              <p className="editionEdit"><i class="fa fa-pencil"></i></p>
            </Link>
            <div className="divp-cl">
             

                <p
                  className="productadd-text"
                  onClick={() => deleteHandler(item.id)}
                >
                <i class="fa fa-trash"></i>
                </p>
            
            </div>
          </div>
        );
        userData.push(item);
      });
    }
    setUsersForRender(userData);
  }, [ProServTypeData]);


  const data1 = {
    columns: [
      {
        label: "Title",
        field: "title",
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

  const deleteHandler = (id) => {
    swal({
      title: "Warning",
      text: "Are you sure you want to delete this Video?",
      className: "errorAlert",
      // icon: "/img/company-logo.png",
      buttons: true,
      dangerMode: true,
    }).then((willDelete) => {
      if (willDelete) {
        dispatch(DeleteAction(id));
        swal({
          title: "Successfully Complete",
          text: "Successfully Deleted!",
          className: "successAlert",
          // icon: "/img/company-logo.png",
          buttons: false,
          timer: 1500,
        });
      }
    });
   
  };



  return (
    <>
      <div className="content">
            <div>
              <div className="productadd-div">
                <Link className="producbtn" to="/show-products/servies">
                  <button
                    className="button-text-t Service-m"
                  >
                    Products/Service List
                  </button>
                </Link>
                <Link to="/Product/Service-update">
                  <button
                    className="button-text-t Service-m"
                  >
                    Add Products/Services
                  </button>
                </Link>
              </div>
             
                <div className="container-new-add">
                  <MDBDataTable
                    className="dashbordtable dashbordtable5"
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
    </>
  );
};

export default Productlist;
