import React, { useState, useEffect } from "react";
import LoadingSpinner from "../../containers/LoadingSpinner";
import { BACKEND_API_URL } from "../../environment";
import { validations } from "../../utils";
import { Routes, Route, useParams } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import swal from "sweetalert";
import axios from "axios";

import { useDispatch, useSelector } from "react-redux";
import { defaultPageLoader } from "../../redux/actions/other-actions";

var stylingObject = {
  h5: {
    fontFamily: "Gilroy",
  },
};

export default function ResetPassword() {
  let { userId } = useParams();
  const { ResetpasswordId } = useParams();

  const dispatch = useDispatch();

  useEffect(async () => {
    await checkToken();
  }, []);

  useEffect(() => {
    dispatch(defaultPageLoader());
  }, []);

  const [isLoading, setIsLoading] = useState(true);
  setTimeout(function () {
    setIsLoading(false);
  }, 4000);

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [errors, setErrors] = useState({
    password: null,
    passwordConfirm: null,
  });

  const validateSubmit = (e) => {
    // e.preventDefault();
    const tempErrors = {
      password: validations.password(password),
      passwordConfirm: validations.confirmPassword(password, passwordConfirm),
    };

    setErrors(tempErrors);

    if (Object.values(tempErrors).filter((value) => value).length) {
      // console.log(
      //   "..values",
      //   Object.values(tempErrors).filter((value) => value)
      // );
      return;
    }
    checkToken();
    submitHandler();
  };

  const submitHandler = async (e) => {
    const success = axios
      .put(`${BACKEND_API_URL}reset-password/${ResetpasswordId}/${userId}/`, {
        password: password,
        confirm_password: passwordConfirm,
      })
      .then((res) => {
        // console.log("res---", res.data);
        swal({
          title: "Successfully Complete",
          // text: res.data.message,
          text: "Password has been changed successfully!",
          className: "successAlert",
          // icon: "/img/logonew.svg",
          buttons: false,
          timer: 5000,
        });
        setTimeout(() => {
          window.location.href = "/";
        }, 3000);
      })
      .catch((err) => {
        // console.log("err---", err.response);
        var myError;
        if (err.response.data.message.token_expire) {
          myError = err.response.data.message.token_expire;
          return;
        }
        if (err.response.data.message) {
          myError = err.response.data.message;
          return;
        }
        swal({
          text: myError,
          className: "errorAlert",
          // icon: "/img/logonew-red.svg",
          buttons: false,
          timer: 5000,
        });
        // console.log(err.response.data.message);
      });
  };

  const checkToken = async () => {
    const successReset = await axios
      .get(`${BACKEND_API_URL}reset-password/${ResetpasswordId}/${userId}/`, {
        password: password,
        confirm_password: passwordConfirm,
      })
      .then((res) => {
        console.log("res---", res.data);
      })
      .catch((err) => {
        console.log("err---", err.response.data);

        var myError;
        if (err.response.data.token_expire) {
          myError = err.response.data.token_expire;
        }
        if (err.response.data.message) {
          myError = err.response.data.message;
        }
        swal({
          title: "Error",
          text: myError,
          className: "errorAlert",
          icon: "/img/logonew-red.svg",
          buttons: false,
          timer: 5000,
        });
        setTimeout(() => {
          window.location.href = "/";
        }, 3000);
      });
  };

  return (
    <>
      {/* {loading && <LoadingSpinner />} */}
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="topResetpass">
            <div className="login-content Resetpasspage">
              <div className="ForgotPgae">
                <div className="content-Reset ">
                  <div className="resetlogo">
                    {/* <img src="/img/logonew.svg" className="login-logo" alt="" /> */}
                  </div>
                  <h1>Reset Password</h1>
                  <p className="reset-passwordtest">
                    Looks like you have forgotten your password. Enter your new
                    password and confirm password to reset.
                  </p>
                </div>

                <form id="ResetPasswordForm" className="Resetpageform">
                  <div
                    class={errors.password ? "inputCntnr error" : "inputCntnr"}
                  >
                    <h5 style={stylingObject.h5} className="mb-2 boldf">
                      New Password
                    </h5>
                    <input
                      type="password"
                      name="password"
                      id="password"
                      placeholder="*******"
                      className="w-100 h-47 border-radius border-1 pl-2 passwordR"
                      value={password}
                      onChange={(e) => {
                        setErrors({ ...errors, password: null });
                        setPassword(e.target.value);
                      }}
                    />
                    <span
                      style={{
                        color: "#D14F4F",
                        opacity: errors.password ? 1 : 0,
                      }}
                    >
                      {errors.password ?? "valid"}
                    </span>
                  </div>
                  <div
                    class={
                      errors.passwordConfirm ? "inputCntnr error" : "inputCntnr"
                    }
                  >
                    <h5 className="mb-2 mt-2 boldf">Confirm New Password</h5>
                    <input
                      type="password"
                      name="Confirm Password"
                      placeholder="*******"
                      id="Confirm Password"
                      className="w-100 h-47 border-radius border-1 pl-2 passwordR"
                      value={passwordConfirm}
                      onChange={(e) => {
                        setErrors({ ...errors, passwordConfirm: null });
                        setPasswordConfirm(e.target.value);
                      }}
                    />
                    <span
                      style={{
                        color: "#D14F4F",
                        opacity: errors.passwordConfirm ? 1 : 0,
                      }}
                    >
                      {errors.passwordConfirm ?? "valid"}
                    </span>
                  </div>
                  <div className="center mt-4 CancelBtnFP">
                    <button
                      type="button"
                      className="btn btn-primary Large ResetButton border-radius"
                      onClick={validateSubmit}
                    >
                      Reset Password
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
