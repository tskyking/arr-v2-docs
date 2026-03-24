import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardBody, Row, Col, Button } from "reactstrap";
import { MDBDataTable } from "mdbreact";
import { Link } from "react-router-dom";
import { Userlist, UserDelete } from "../../redux/actions/Admin-saasot-action";
import { useDispatch, useSelector } from "react-redux";
import swal from "sweetalert";

const UsersList = () => {
  const dispatch = useDispatch();
  const [usersForRender, setUsersForRender] = useState([]);

  const {
    error,
    success: successfullyupdated,
    Userlistdata,
  } = useSelector((state) => state.UserlistReducer);

  const { success } = useSelector((state) => state.UserDeleteReducer);

  useEffect(() => {
    dispatch(Userlist());
  }, [success]);

  useEffect(() => {
    let userData = [];
    // console.log("levelData == ", levelData);

    if (Userlistdata) {
      Userlistdata?.map((item, index) => {
        item.title = item.username;
        item.description = item.email;
        if (item.status == false) {
          item.status1 = false;
         
        }
        if (item.status == true) {
          item.status1 = true;
        }

        item.action = (
          <div style={{ display: "flex" }}>
            <div style={{ display: "flex" }}>
            <Link to={`/add-user/${item.id}`}>
                <Button title="delete" className="iconbtn newbtn44">
                  <p className="editiconDelete1">  <i class="fa fa-pencil"></i></p>
                </Button>
              </Link>
              <Button title="delete" className=" newbtn44 iconbtn">
                <p
                  className="editiconDelete1"
                  onClick={() => deleteHandler(item.status, item.id)}
                >
              <i class="fa fa-trash"></i>
                </p>
              </Button>
             
            </div>
          </div>
        );
        userData.push(item);
      });
    }

    // console.log("userData", userData);
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
        label: "Title",
        field: "title",
        sort: "asc",
        width: 500,
      },
      {
        label: "E-mail",
        field: "description",
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
  return (
    <>
      <div className="content">
   
      
     
            <div className="userdivsec">
           
             
                <div className="container">
                <div className="Addclass">
                <Link to="/add-user">
                  <button className="adduser addbtnsec">Add User</button>
                </Link>
              </div>
                  <MDBDataTable
                    className="dashbordtable dashbordtable1 userclass"
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

export default UsersList;
