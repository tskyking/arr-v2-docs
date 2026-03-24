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
import { Link } from "react-router-dom";
import { useParams } from "react-router-dom";

export default function Signup() {
  let navigate = useNavigate();
  const dispatch = useDispatch();

  const [username, setUsername] = useState("");
  const [firstname, setFirstName] = useState("");
  const [role, setRole] = useState("");
  const [lastname, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm_password, setConfirmPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [errors, setErrors] = useState({
    username: null,
    firstname: null,
    lastname: null,
    email: null,
    password: null,
    confirmPassword: null,
    companyName: null,
  });
  const [isOpen, setIsOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  const [decryptedJobId, setDecryptedJobId] = useState();
  const [redirectMyUrl, setRedirectMyUrl] = useState(false);
  const [copyMyUrl, setCopyMyUrl] = useState(false);

  useEffect(() => {
    let redirectUrl = localStorage.getItem("redirJob");
    let copiedUrl = localStorage.getItem("cop-url");
    if (redirectUrl) {
      if (copiedUrl) {
        setCopyMyUrl(true);
        localStorage.removeItem("cop-url");
      } else {
        setCopyMyUrl(false);
      }
      setRedirectMyUrl(true);
      setDecryptedJobId(redirectUrl);
      setRole("1");
    } else {
      setRedirectMyUrl(false);
    }
  }, []);

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
      companyName: !companyName && "Enter company Name",
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
      .post(`${BACKEND_API_URL}auth/signup-company-user/`, {
        username: username,
        first_name: firstname,
        last_name: lastname,
        email: email,
        password: password,
        confirm_password: confirm_password,
        company :companyName,
      })
      .then((res) => {
        setTimeout(() => {
          setIsLoading(true);
        }, 1000);

        if (redirectMyUrl && !copyMyUrl) {
          swal({
            title: "Successfully Complete",
            // text: res.data.message,
            text: "Login success",
            // icon: "/img/logonew.svg",
            buttons: false,
            timer: 5000,
          });
          dispatch(login({ email: email, password }));
          localStorage.removeItem("redirJob");

          setTimeout(() => {
            navigate(`/jobs/details/${decryptedJobId}`);
          }, 400);
        } else {
          swal({
            title: "Successfully Complete",
            text: res.data.message,
            // icon: "/img/logonew.svg",
            buttons: false,
            timer: 5000,
          });
          setTimeout(() => {
            navigate("/thank-you");
          }, 5000);
        }
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
        // setTimeout(() => {
        // }, 1000);
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
  };

  return (
    <>
      {loading ? <LoadingSpinner /> : isLoading ? <LoadingSpinner /> : <></>}
      <div className="signupPage">
        <div className="signup">
          <div className="logo-content">
          <img class="logoimglogo1" src="/logoicon_new.png" alt="" />
                  <span className="saasotcontent1">SaaSot</span>
            <h3 className="mt-3">Create your saasot account</h3>
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
                  autocomplete="nope"
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
                  autocomplete="nope"
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
                  autocomplete="nope"
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
                className={errors.confirmPassword ? "InCntnr error" : "InCntnr"}
              >
                <h5 className="form-label mt-2 conffii" for="firstname">
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
              <div className="form-group-one">
              <div
                className={errors.companyName ? "InCntnr error" : "InCntnr"}
              >
                <h5 className="form-label mt-2 conffii" for="firstname">
                  Company
                </h5>
                <input
                  className="input-box validateInput orgPassword w-100 h-47 border-radius border-1 mt-2 pl-2"
                  value={companyName}
                  onChange={(e) => {
                    setCompanyName(e.target.value);
                    setErrors({ ...errors, companyName: null });
                  }}
                  type="text"
                  name="company"
                  id="company"
                />
                <span
                  style={{
                    color: "#D14F4F",
                    opacity: errors.companyName ? 1 : 0,
                  }}
                >
                  {errors.companyName ?? "valid"}
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
              <Link className="Signbn" to="/">
                Sign In Instead.
              </Link>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
