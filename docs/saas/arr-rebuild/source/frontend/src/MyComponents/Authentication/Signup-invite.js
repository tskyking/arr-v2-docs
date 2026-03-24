import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import swal from "sweetalert";
import { useParams } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";

import { USER_LOGOUT } from "../../constants/auth-constants";
import { defaultPageLoader } from "../../redux/actions/other-actions";
import { BACKEND_API_URL } from "../../environment";
import LoadingSpinner from "../../containers/LoadingSpinner";
import { validations } from "../../utils";

export default function Signup_invite() {
  let { inviteId, encodedEmail, exclusive } = useParams();

  let navigate = useNavigate();
  const dispatch = useDispatch();

  const [username, setUsername] = useState("");
  const [firstname, setFirstName] = useState("");
  const [lastname, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm_password, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({
    username: null,
    firstname: null,
    lastname: null,
    email: null,
    password: null,
    confirmPassword: null,
  });

  const [isLoading, setIsLoading] = useState(true);

  setTimeout(() => {
    setIsLoading(false);
  }, 1000);

  useEffect(() => {
    dispatch({ type: USER_LOGOUT });
    dispatch(defaultPageLoader());
  }, []);

  useEffect(() => {
    let encodedEmailId = encodedEmail;
    let buff = new Buffer(encodedEmailId, "base64");
    let decodedEmail = buff.toString("ascii");

    setEmail(decodedEmail);
  }, []);

  const { loading } = useSelector((state) => state.loaderReducer);

  const validateSubmit = (e) => {
    e.preventDefault();
    const tempErrors = {
      username: validations.username(username),
      firstname: validations.firstName(firstname),
      lastname: validations.lastName(lastname),
      email: validations.email(email),
      password: validations.password(password),
      confirmPassword: validations.confirmPassword(password, confirm_password),
    };
    setErrors(tempErrors);

    if (Object.values(tempErrors).filter((value) => value).length) {
      // console.log(
      //   "..values",
      //   Object.values(tempErrors).filter((value) => value)
      // );
      return;
    }
    submitHandler();
  };

  const submitHandler = async (e) => {
    setIsLoading(true);

    const success = axios
      .post(
        `${BACKEND_API_URL}agency/register-view-invite/${inviteId}/${exclusive}`,
        {
          username: username,
          first_name: firstname,
          last_name: lastname,
          email: email,
          password: password,
          confirm_password: confirm_password,
        }
      )
      .then((res) => {
        setTimeout(() => {
          setIsLoading(true);
        }, 1000);
        swal({
          title: "Successfully Complete",
          text: res.data.message,
          icon: "/img/logonew.svg",
          buttons: false,
          timer: 3000,
        });
        setTimeout(() => {
          navigate(`/thank-you/invite-register`);
        }, 1500);
      })
      .catch((err) => {
        // setTimeout(() => {
        //   setIsLoading(true);
        // }, 1000);
        if (
          err.response.data.message.non_field_errors ==
          "User Name already taken"
        ) {
          const tempErrors = {
            username: "Username already taken",
          };
          setErrors(tempErrors);
          return;
        } else if (
          err.response.data.message.non_field_errors == "Email already exist"
        ) {
          const tempErrors = {
            email: "Email already taken",
          };
          setErrors(tempErrors);
          return;
        } else {
          const tempErrors = {
            email: "Email already taken",
            username: "Username already taken",
          };
          setErrors(tempErrors);
          return;
        }

        // if (err.response.data.message.email) {
        //   // toast.error("Email already Exists");
        //   const tempErrors = {
        //     email: err.response.data.message.email,
        //   };
        //   setErrors(tempErrors);
        //   return;
        // }
        // if (err.response.data.message) {
        //   const tempErrors = {
        //     username: err.response.data.message,
        //   };
        //   setErrors(tempErrors);
        //   return;
        // }
      });
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  return (
    <>
      {loading || isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="signupPage">
          <div className="signup">
            <div className="logo-content">
              <img src="/img/logonew.svg" className="login-logo mt-2" alt="" />
              <h3 className="mt-3">Create your adifect account</h3>
            </div>
            <form onSubmit={validateSubmit} id="websiteUserRegisterForm">
              <div className="form-group-one">
                <div className={errors.username ? "InCntnr error" : "InCntnr"}>
                  <h5 className="form-label mt-2" htmlFor="Username">
                    Username:
                  </h5>
                  <input
                    className="input-box validateInput Usernameinvite w-100 h-47 border-radius border-1 pl-2"
                    type="text"
                    value={username}
                    autocomplete="nope"
                    onChange={(e) => {
                      setErrors({ ...errors, username: null });
                      setUsername(e.target.value);
                    }}
                    name="f_Username"
                    id="Username"
                  />

                  <span
                    style={{
                      color: "#D14F4F",
                      opacity: errors.username ? 1 : 0,
                    }}
                  >
                    {errors.username ?? "valid"}
                  </span>
                </div>
                <div className={errors.firstname ? "InCntnr error" : "InCntnr"}>
                  <h5 className="form-label mt-2" htmlFor="firstname">
                    First Name:
                  </h5>
                  <input
                    className="input-box validateInput w-100 h-47 border-radius border-1 pl-2"
                    type="text"
                    value={firstname}
                    onChange={(e) => {
                      setErrors({ ...errors, firstname: null });
                      setFirstName(e.target.value);
                    }}
                    name="f_name"
                    id="firstname"
                  />
                  <span
                    style={{
                      color: "#D14F4F",
                      opacity: errors.firstname ? 1 : 0,
                    }}
                  >
                    {errors.firstname ?? "valid"}
                  </span>
                </div>
              </div>
              <div className="form-group-one">
                <div className={errors.lastname ? "InCntnr error" : "InCntnr"}>
                  <h5 className="form-label mt-2" htmlFor="firstname">
                    Last Name:
                  </h5>
                  <input
                    className="input-box validateInput w-100 h-47 border-radius border-1 pl-2"
                    type="text"
                    value={lastname}
                    onChange={(e) => {
                      setErrors({ ...errors, lastname: null });
                      setLastName(e.target.value);
                    }}
                    name="l_name"
                    id="lastname"
                  />
                  <span
                    style={{
                      color: "#D14F4F",
                      opacity: errors.lastname ? 1 : 0,
                    }}
                  >
                    {errors.lastname ?? "valid"}
                  </span>
                </div>
                <div className={errors.email ? "InCntnr error" : "InCntnr"}>
                  <h5 className="form-label mt-2" htmlFor="firstname">
                    Email Address:
                  </h5>
                  <input
                    className="input-box validateInput w-100 h-47 border-radius border-1  pl-2"
                    type="text"
                    value={email}
                    disabled
                    name="email"
                    id="email"
                  />
                  <span
                    style={{ color: "#D14F4F", opacity: errors.email ? 1 : 0 }}
                  >
                    {errors.email ?? "valid"}
                  </span>
                </div>
              </div>
              <div className="form-group-one">
                <div className={errors.password ? "InCntnr error" : "InCntnr"}>
                  <h5 className="form-label mt-2" htmlFor="firstname">
                    Password: (must be 7 or more)
                  </h5>
                  <input
                    className="input-box validateInput orgPassword w-100 h-47 border-radius border-1 mt-2 pl-2"
                    value={password}
                    autocomplete="new-password"
                    onChange={(e) => {
                      setErrors({ ...errors, password: null });
                      setPassword(e.target.value);
                    }}
                    type="password"
                    name="password"
                    id="password"
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
                  className={
                    errors.confirmPassword ? "InCntnr error" : "InCntnr"
                  }
                >
                  <h5 className="form-label mt-2 conffii" htmlFor="firstname">
                    Confirm Password:
                  </h5>
                  <input
                    className="input-box validateInput orgPassword w-100 h-47 border-radius border-1 mt-2 pl-2"
                    value={confirm_password}
                    onChange={(e) => {
                      setErrors({ ...errors, confirmPassword: null });
                      setConfirmPassword(e.target.value);
                    }}
                    type="password"
                    name="confirm_password"
                    id="confirm_password"
                  />
                  <span
                    style={{
                      color: "#D14F4F",
                      opacity: errors.confirmPassword ? 1 : 0,
                    }}
                  >
                    {errors.confirmPassword ?? "valid"}
                  </span>
                </div>
              </div>
              <div className="center">
                <input
                  className="btn-primary border-radius w-335 h-47 registerWebsiteUserBtn mt-4"
                  type="submit"
                  value="Create Account"
                />
                <p className="mt-2">
                  By signing up, you agree to our Privacy Policy
                </p>{" "}
                <a className="Signbn" href="/">
                  Sign In Instead.
                </a>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
