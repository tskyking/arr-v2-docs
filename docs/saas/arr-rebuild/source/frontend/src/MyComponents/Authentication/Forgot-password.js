import React, { useState, useEffect } from "react";
import { BACKEND_API_URL } from "../../environment";
import { validations } from "../../utils";
import { ToastContainer, toast } from "react-toastify";
import LoadingSpinner from "../../containers/LoadingSpinner";
import axios from "axios";
import swal from "sweetalert";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { defaultPageLoader } from "../../redux/actions/other-actions";

export default function ForgotPassword() {
  let navigate = useNavigate();

  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(defaultPageLoader());
  }, []);
  const { loading } = useSelector((state) => state.loaderReducer);

  const [email, setEmail] = useState();
  const [errors, setErrors] = useState({
    email: null,
  });

  const validateSubmit = (e) => {
    // e.preventDefault();
    const tempErrors = {
      email: validations.Email(email),
    };
    setErrors(tempErrors);
    if (Object.values(tempErrors).filter((value) => value).length) {
      console.log(
        "..values",
        Object.values(tempErrors).filter((value) => value)
      );
      return;
    }
    submitHandler();
  };

  const submitHandler = async (e) => {
    const success = axios
      .post(`${BACKEND_API_URL}auth/forget-password/`, {
        email,
      })
      .then((res) => {
        swal({
          title: "Successfully Complete",
          text: "Email has been sent successfully!",
          // text: res.data.message,
          className: "successAlert",
          // icon: "/img/logonew.svg",
          buttons: false,
          timer: 5000,
        });
        navigate("/");
        // toast.success(res.data.message);
      })
      .catch((err) => {
        var error = "";
        if (err.response.data["message"]) {
          error = err.response.data["message"];
        } else if (err.response.data["email"][0]) {
          error = err.response.data["email"][0];
        }
        swal({
          title: "Error",
          text: error,
          className: "errorAlert",
          // icon: "/img/logonew-red.svg",
          buttons: false,
          timer: 5000,
        });
      });
  };

  return (
    <>
      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="login-content">
            <div className="ForgotPgae">
            <div className="logo-content">
              <img class="logoimglogo1" src="/logoicon_new.png" alt="" />
                  <span className="saasotcontent1">SaaSot</span>
            </div>
              <form className="forgotpass">
                <div class={errors.email ? "inputCntnr error" : "inputCntnr"}>
                  <h5 className="mb-2">Email</h5>
                  <input
                    type="text"
                    name="email"
                    id="email"
                    className="w-100 h-47 border-radius border-1 pl-2"
                    value={email}
                    onChange={(e) => {
                      setErrors({ ...errors, email: null });
                      setEmail(e.target.value);
                    }}
                  />
                  <span
                    style={{ color: "#D14F4F", opacity: errors.email ? 1 : 0 }}
                  >
                    {errors.email ?? "valid"}
                  </span>
                </div>
                <div className="center mt-3 CancelBtnFP">
                  <button
                    type="button"
                    onClick={validateSubmit}
                    className="btn btn-primary Large w-100 border-radius"
                  >
                    Send
                  </button>
                  <a
                    href="/"
                    className="create-account-btn mt-3 w-100 border-radius"
                  >
                    Cancel
                  </a>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  );
}
