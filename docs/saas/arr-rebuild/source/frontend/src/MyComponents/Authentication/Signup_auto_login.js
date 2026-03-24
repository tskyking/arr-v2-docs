import React, { useState, useEffect } from "react";
import { validations } from "../../utils";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import LoadingSpinner from "../../containers/LoadingSpinner";
import axios from "axios";
import { BACKEND_API_URL } from "../../environment";
import { register, login } from "../../redux/actions/auth-actions";
import { defaultPageLoader } from "../../redux/actions/other-actions";
import swal from "sweetalert";
import MenuItem from "@mui/material/MenuItem";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import { $CombinedState } from "redux";
import { USER_LOGOUT } from "../../constants/auth-constants";
import { useParams } from "react-router-dom";

export default function Signup_auto_login() {
  let navigate = useNavigate();
  const dispatch = useDispatch();

  const { jobId } = useParams();

  let buff = new Buffer(jobId, "base64");
  let decryptedJobId = buff.toString("ascii");

  const { error, userData, message } = useSelector(
    (state) => state.authReducer
  );

  const [username, setUsername] = useState("");
  const [firstname, setFirstName] = useState("");
  const [role, setRole] = useState("");
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
    role: null,
  });
  const [isOpen, setIsOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    dispatch({ type: USER_LOGOUT });
    dispatch(defaultPageLoader());
    const handler = () => {
      setIsOpen(false);
    };
    window.addEventListener("scroll", handler);
    return () => {
      window.removeEventListener("scroll", handler);
    };
  }, []);

  const menuProps = {
    variant: "menu",
    disableScrollLock: true,
  };

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
      role: validations.role(role),
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
    setIsLoading(true);

    const success = axios
      .post(`${BACKEND_API_URL}registerview/`, {
        username: username,
        first_name: firstname,
        last_name: lastname,
        email: email,
        password: password,
        confirm_password: confirm_password,
        role: role,
        email_verify: true,
      })
      .then((res) => {
        setTimeout(() => {
          setIsLoading(true);
        }, 5000);
        swal({
          title: "Successfully Complete",
          // text: res.data.message,
          text: "Login success",
          icon: "/img/SuccessAlert.png",
          buttons: false,
          timer: 5000,
        });
        dispatch(login({ email: email, password }));
        setTimeout(() => {
          navigate(`/jobs/details/${decryptedJobId}`);
        }, 400);
      })
      .catch((err) => {
        setTimeout(() => {
          setIsLoading(false);
        }, 1);
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
      });
  };

  useEffect(() => {
    if (userData) {
      swal({
        title: "Successfully Complete",
        text: "Login Success",
        className: "successAlert-login",
        icon: "/img/logonew.svg",
        buttons: false,
        timer: 2500,
      });
      setTimeout(() => {
        navigate(`/jobs/details/${decryptedJobId}`);
        // window.location.href = "/home";
      }, 1500);
    }
    if (error) {
      swal({
        title: "Error",
        text: error,
        className: "errorAlert-login",
        icon: "/img/logonew-red.svg",
        buttons: false,
        timer: 5000,
      });
      setIsLoading(false);
    }
  }, [dispatch, userData, error]);

  return (
    <>
      {loading ? <LoadingSpinner /> : isLoading ? <LoadingSpinner /> : <></>}
      <div className="signupPage">
        <div className="signup">
          <div className="logo-content">
            <img src="img/logonew.svg" className="login-logo mt-2" alt="" />
            <h3 className="mt-3">Create your adifect account</h3>
          </div>
          <form onSubmit={validateSubmit} id="websiteUserRegisterForm">
            <div className="form-group-one">
              <div className={errors.username ? "InCntnr error" : "InCntnr"}>
                <h5 className="form-label mt-2" for="Username">
                  Username:
                </h5>
                <input
                  className="input-box validateInput w-100 h-47 border-radius border-1 pl-2"
                  type="text"
                  value={username}
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
                <h5 className="form-label mt-2" for="firstname">
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
                <h5 className="form-label mt-2" for="firstname">
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
                <h5 className="form-label mt-2" for="firstname">
                  Email Address:
                </h5>
                <input
                  className="input-box validateInput w-100 h-47 border-radius border-1  pl-2"
                  type="text"
                  value={email}
                  onChange={(e) => {
                    setErrors({ ...errors, email: null });
                    setEmail(e.target.value);
                  }}
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
                <h5 className="form-label mt-2" for="firstname">
                  Password: (must be 7 or more)
                </h5>
                <input
                  className="input-box validateInput orgPassword w-100 h-47 border-radius border-1 mt-2 pl-2"
                  value={password}
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
                className={errors.confirmPassword ? "InCntnr error" : "InCntnr"}
              >
                <h5 className="form-label mt-2" for="firstname">
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
                  Agency
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
            <div className="form-group-one">
              <div className={errors.role ? "InCntnr error" : "InCntnr"}>
                <h5 className="form-label Role_1 mt-2" for="role">
                  Role:{" "}
                </h5>
                <Select
                className={
                  role === "null"
                  ? "selectinputcolor"
                  : "menuiteminputcolor"
                  }  
                  value={role}
                  open={isOpen}
                  onOpen={() => {
                    setIsOpen(true);
                  }}
                  onClose={() => {
                    setIsOpen(false);
                  }}
                  MenuProps={menuProps}
                  id="role"
                  onChange={(e) => {
                    setRole(e.target.value);
                    setErrors({ ...errors, role: null });
                  }}
                  // disableScrollLock={true}
                  displayEmpty
                  inputProps={{ "aria-label": "Without label" }}
                >
                  <MenuItem value=""> Select Role </MenuItem>
                  <MenuItem value="1">Creator</MenuItem>
                  <MenuItem value="2">Agency</MenuItem>
                </Select>
                <span
                  style={{ color: "#D14F4F", opacity: errors.role ? 1 : 0 }}
                >
                  {errors.role ?? "valid"}
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
    </>
  );
}
