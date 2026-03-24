import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardBody, Row, Col, Button } from "reactstrap";
import { MDBDataTable } from "mdbreact";
import { Link } from "react-router-dom";
import { closelist, UserDelete } from "../../redux/actions/Admin-saasot-action";
import { useDispatch, useSelector } from "react-redux";
import swal from "sweetalert";
import moment, { utc } from "moment";
import DatePicker from "react-datepicker";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import "react-datepicker/dist/react-datepicker.css";
import { DialogActions, Dialog } from "@mui/material";

const ClosedPeriod = () => {
  const dispatch = useDispatch();
  const [usersForRender, setUsersForRender] = useState([]);

  const {
    error,
    success: successfullyupdated,
    Closeperioddata,
  } = useSelector((state) => state.CloseGetReducer);

  const { success } = useSelector((state) => state.UserDeleteReducer);
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const handleButtonClick = (id) => {
    setIsOpen(true);
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleClosecancel = () => {
    setIsOpen(false);
    setInputValue("");
  };

  const handlesubmit = () => {
    setIsOpen(false);
    setInputValue("");
  };

  useEffect(() => {
    dispatch(closelist());
  }, [success]);

  useEffect(() => {
    let userData = [];
    if (Closeperioddata) {
      Closeperioddata?.map((item, index) => {
        if (item.close_period) {
          item.created_at = new Date(item.close_period).toLocaleDateString();
        }
        item.id = item.id;
        item.closeperiod = "True";

        item.action = (
          <div style={{ display: "flex" }}>
            <div style={{ display: "flex" }}>
             
                <p
                  className="editiconDeletenew closedp"
                  onClick={() => handleButtonClick(item.id)}
                >
                <i class="fa fa-pencil"></i>
                </p>
            
            </div>
          </div>
        );
        userData.push(item);
      });
    }

    setUsersForRender(userData);
  }, [successfullyupdated]);

  const deleteHandler = (item, id) => {
    swal({
      title: "Are you sure?",
      text: "Once deleted, you will not be able to recover this item!",
      icon: "warning",
      buttons: true,
      dangerMode: true,
    }).then((willDelete) => {
      if (willDelete) {
        // Perform the delete operation
        // ...
        dispatch(UserDelete(id));
      }
    });
  };

  const data1 = {
    columns: [
      {
        label: "ID",
        field: "id",
        sort: "asc",
        width: 500,
      },
      {
        label: "Created At",
        field: "created_at",
        sort: "asc",
        width: 500,
      },
      {
        label: "Close Period",
        field: "closeperiod",
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

  const [startDate, setStartDate] = useState(new Date());
  return (
    <>
      <Dialog className="profileImgDialogagency popupclass" open={isOpen}>
        <DialogTitle className="profileImgHeadingAnew2"></DialogTitle>
        <div className="dialogcontent_and_actions_new">
          <DialogContent className="enterNameInputNewD">
            <div className="perioddate">
              <DatePicker
                className="datepick"
                selected={startDate}
                onChange={(date) => setStartDate(date)}
              />
            </div>
            <div className="userpop">
              <h1 className="usertitle">Closed Period</h1>
              <div className="userlistselsct">
                <select>
                  <option value={0}>Yes</option>
                  <option value={1}>No</option>
                </select>
              </div>
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
      <div className="content">

        <div className="closediv">
          <div className="container">
            <MDBDataTable
              className="dashbordtable dashbordtable1"
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

export default ClosedPeriod;
