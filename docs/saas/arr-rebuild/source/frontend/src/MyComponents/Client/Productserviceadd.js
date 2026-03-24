import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardBody, Row, Col, Button } from "reactstrap";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  GetListProductServiceTypeAction,
  Productadd,
  ProductUpdateAction,
} from "../../redux/actions/Admin-saasot-action";
import { useDispatch, useSelector } from "react-redux";
import swal from "sweetalert";

const MyForm = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState("");
  const [checkboxValue, setCheckboxValue] = useState(false);
  const [render, setRerender] = useState(false);
  const paramsid = useParams();

  const {id } = useParams();


  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleCheckboxChange = (e) => {
    setCheckboxValue(e.target.checked);
  };

  const {
    ProServTypeData,
    loading: proServTypeDataLoading,
    error: proServTypeDataError,
  } = useSelector((state) => state.GetListProductServiceTypeReducer);

  const { sucess: done, error: notdone } = useSelector(
    (state) => state.UpdateReducer
  );

  const { sucess: created, error: createderror } = useSelector(
    (state) => state.ProductAddReducer
  );

  useEffect(() => {}, [done, created]);

  useEffect(() => {
    const data = paramsid;
    const value = data.id; // Accessing the value using dot notation
    if (id) {
      dispatch(GetListProductServiceTypeAction(id));
    }
  }, [id]);

  useEffect(() => {
    const data = paramsid;
    const value = data.id; // Accessing the value using dot notation
    if (id) {
      setInputValue(ProServTypeData?.productp_service_type);
      setCheckboxValue(ProServTypeData?.is_active);
    } else {
      setInputValue("");
      setCheckboxValue(false);
    }
  }, [ProServTypeData]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    const local = localStorage.getItem("userData");
    const responseData = JSON.parse(local);
    const userId = responseData.user.user_id;
    const formData = new FormData();
    const data = paramsid;
    const value = data.id; // Accessing the value using dot notation
    formData.append("productp_service_type", inputValue);
    formData.append("is_active", checkboxValue);
    formData.append("user", userId);

    try {
      if (id) {
        await dispatch(ProductUpdateAction(id, formData));
      } else {
        await dispatch(Productadd(formData));
      }
      if (inputValue) {
        if (id) {
          swal({
            title: " ",
            text: "Updated Successfully",
            className: "successAlert",
            // icon: "/img/logo.svg",
            buttons: false,
            timer: 3000,
          });
        } else {
          swal({
            title: " ",
            text: "Added Successfully",
            className: "successAlert",
            // icon: "/img/logo.svg",
            buttons: false,
            timer: 3000,
          });
        }
        setTimeout(() => {
          navigate("/Product/Service-add");
        }, 300);
      } else {
        alert("Please enter product/service type.");
      }
    } catch (error) {
      // Show error alert
      alert("API response error!");
    }

    setInputValue("");
    setCheckboxValue(false);
  };

  return (
    <div className="content removeheightclass">
      <div className="Product-title">Product/Service Type</div>

      <div className="grid gap-4 mb-4 md:grid-cols-2">
        <form className="product-div-update" onSubmit={handleSubmit}>
        <div className="formsecdiv">
          <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
           <p className="servicetext">Service Type:</p> 
            <input
              pleceholder="Enter Product/Service Type"
              className="inputdivsec bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              type="text"
              value={inputValue}
              onChange={handleInputChange}
            />
          </label>
          <br />
          <label>
            Status:
            <input
            className="statusinput"
              type="checkbox"
              checked={checkboxValue}
              onChange={handleCheckboxChange}
            />
          </label>
          <br />
          <div className="cancelButtonnewFolder Submitbtn">
            {/* <button className="canceButtonnewPop" onClick={handleCloseUpload}>
                Cancel
              </button> */}
            <button
              class="button-text-t uploadfilessubmitbtn"
              style={{ Background: "#005661" }}
              type="submit"
            >
              Submit
            </button>
          </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MyForm;
