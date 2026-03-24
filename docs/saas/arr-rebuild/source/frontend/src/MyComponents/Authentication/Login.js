import React, { useState, useEffect } from "react";
import { validations } from "../../utils";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import LoadingSpinner from "../../containers/LoadingSpinner";
import { login } from "../../redux/actions/auth-actions";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { defaultPageLoader } from "../../redux/actions/other-actions";
import swal from "sweetalert";

export default function Login() {
  let navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  const dispatch = useDispatch();
  useEffect(() => {
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  }, []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({
    email: null,
    password: null,
  });
  const { error, userData, message } = useSelector(
    (state) => state.authReducer
  );

  const redirect =
    window.location.search && window.location.search?.split("=")[1];
  // : "/home";

  // const [redirectMyUrl, setRedirectMyUrl] = useState("/home");

  // useEffect(() => {
  //   let redirectUrl = localStorage.getItem("redirJob");
  //   if (redirectUrl) {
  //     setRedirectMyUrl(`/jobs/details/${redirectUrl}`);
  //   }
  //   localStorage.removeItem("redirJob");
  // }, []);

  const validateSubmit = (e) => {
    e.preventDefault();
    const tempErrors = {
      email: validations.emailRequired(email),
      password: validations.passwordRequired(password),
    };
    setErrors(tempErrors);

    if (Object.values(tempErrors).filter((value) => value).length) {
      // console.log(
      //   "..values",
      //   Object.values(tempErrors).filter((value) => value)
      // );
      return;
    }
    submitHandler(e);
  };

  useEffect(() => {
    if (userData) {
      swal({
        title: "Successfully Complete",
        text: "Login Success",
        className: "successAlert-login",
        // icon: "/logoicon_new.png",
        buttons: false,
        timer: 1500,
      });
      setTimeout(() => {
        setIsLoading(true);
      }, 1000);
      setTimeout(() => {
        navigate("/home");
      }, 1000);
    }
    if (error) {
      swal({
        title: "Error",
        text: error,
        className: "errorAlert-login",
        // icon: "/logoicon_new.png",
        buttons: false,
        timer: 1500,
      });
      setIsLoading(false);
    }
  }, [dispatch, userData, error]);

  const submitHandler = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    await dispatch(login({ email: email, password }));
  };

  return (
    <>
      {isLoading && <LoadingSpinner />}

      <div className="login-content">
        <div className="loginsec">
          <div className="logo-wrapper">
            <div className="logo-content">
              <img class="logoimglogo1" src="/logoicon_new.png" alt="" />
                  <span className="saasotcontent1">SaaSot</span>
            </div>
          </div>
          <div className="login-message-wrapper">
            <div className="login-message">
              <h2>Welcome to Saasot</h2>
              <p>
                Log into your account by entering your
                <br />
                username, email and password.
              </p>
            </div>
          </div>
          <form id="websiteUserLoginForm" onSubmit={validateSubmit}>
            <div className={errors.email ? "inputCntnr error" : "inputCntnr"}>
              <h5 className="form-label  mt-2" htmlFor="email">
                Username or Email
              </h5>
              <input
                className="input-box validateInput w-100 h-47 border-radius border-1 pl-2"
                type="text"
                name="email"
                id="email"
                value={email}
                onChange={(e) => {
                  setErrors({ ...errors, email: null });
                  setEmail(e.target.value);
                }}
              />
              <span style={{ color: "#D14F4F", opacity: errors.email ? 1 : 0 }}>
                {errors.email ?? "valid"}
              </span>
            </div>
            <div
              className={errors.password ? "inputCntnr error" : "inputCntnr"}
            >
              <h5 className="form-label mt-1" htmlFor="password">
                Password
              </h5>
              <input
                className="input-box validateInput w-100 h-47 border-radius border-1 pl-2"
                type="password"
                name="password"
                id="password"
                value={password}
                onChange={(e) => {
                  setErrors({ ...errors, password: null });
                  setPassword(e.target.value);
                }}
              />
              <span
                style={{ color: "#D14F4F", opacity: errors.password ? 1 : 0 }}
              >
                {errors.password ?? "valid"}
              </span>
            </div>
            <div className="center mt-2 logindiv1">
              <button
                // disabled={success}
                type="submit"
                // onClick={validateSubmit}
                className="btn btn-primary Large w-100 border-radius "
              >
                Log In
              </button>
              <Link
                to="/signup"
                className="create-account-btn mt-3 w-100 border-radius"
              >
                Create Account
              </Link>
            </div>
            <div className="center mt-3 Forgotsecbott">
              <h5>
                <Link to="/forgot-password">Forgot Password ?</Link>
              </h5>
            </div>
          </form>
        </div>
      </div>
      {/* )} */}
    </>
  );
}
