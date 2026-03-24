import React, { useState, useEffect } from "react";
import { BACKEND_API_URL } from "../../environment";
import LoadingSpinner from "../../containers/LoadingSpinner";
import axios from "axios";
import swal from "sweetalert";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { defaultPageLoader } from "../../redux/actions/other-actions";
import { useParams } from "react-router-dom";

export default function VerifyEmail() {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(defaultPageLoader());
  }, []);
  const { loading } = useSelector((state) => state.loaderReducer);

  const { token, uid } = useParams();

  const [successChk, setSuccessChk] = useState(false);

  useEffect(() => {
    // alert(token + "/" + uid);
    // alert(`${BACKEND_API_URL}verify-email/${token}/${uid}/`);

    const success = axios
     

      .get(`${BACKEND_API_URL}auth/verify-email/${token}/${uid}/`)
      .then((res) => {
        // console.log("res --", res);
        if (res.data.message) {
          setSuccessChk(true);
          swal({
            title: "Email successfully verified",
            text: res.data.message,
            className: "successAlert",
            // icon: "/img/logonew.svg",
            buttons: false,
            timer: 2000,
          });
        }
      })
      .catch((err) => {
        // console.log("err -- ", err);
        if (err.response.data.message) {
          setSuccessChk(false);
          swal({
            title: "Error",
            text: err.response.data.message,
            className: "errorAlert",
            // icon: "/img/logonew-red.svg",
            buttons: false,
            timer: 2000,
          });
        }
      });
  }, []);

  return (
    <>
      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="verifydiv">
            <div className="login-content verifyemail">
              <div className="ForgotPgae1">
                <div className="verifylogo">
                  {/* <img
                    src={process.env.PUBLIC_URL + "/img/logonew.svg"}
                    className="login-logo"
                    alt=""
                  /> */}
                </div>
                <div className="verifyemailtext">
                  <h1>Welcome to Saasot</h1>
                  {successChk ? (
                    <>
                      <p>
                        Thank you, your email address has been <br />
                        verified and your account is all set up.
                      </p>
                    </>
                  ) : (
                    <>
                      <p> Opps! Something went wrong, Please try again. </p>
                    </>
                  )}
                  <a className="successfullyButton" href="/">
                    Login
                  </a>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
