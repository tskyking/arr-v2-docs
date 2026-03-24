import React, { useEffect, useState, useRef } from "react";
import { Card, CardHeader, CardBody, Row, Col, Button } from "reactstrap";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  Userlistid,
  UserUpdate,
  UserAdd,
} from "../../redux/actions/Admin-saasot-action";
import { useDispatch, useSelector } from "react-redux";
import swal from "sweetalert";
import { validations } from "../../utils";
const AddUsers = () => {
  const dispatch = useDispatch();
  const url = window.location.href;
  const path = new URL(url).pathname;
  const ids = path.split("/").pop().split(",");

  let navigate = useNavigate();
  const [firstname, setfirstname] = useState("");
  const [lastname, setlastname] = useState("");
  const [username, setusername] = useState("");
  const [role, setrole] = useState();
  const [email, setemail] = useState("");
  const [password, setpassword] = useState("");
  const [confirmpassword, setconfirmpassword] = useState("");
  const [passwordshow, setpasswordshow] = useState(false);
  const [rerender, setrender] = useState(false);
  const [errors, setErrors] = useState({
    email: null,
    password: null,
    firstname: null,
    lastname: null,
    username: null,
    confirmPassword: null,
    role: null,
  });

  const { UserlistIDdata, sucess: updated } = useSelector(
    (state) => state.UserlistIDReducer
  );

  const { userData } = useSelector((state) => state.authReducer);

  const { error, success } = useSelector((state) => state.UserPostReducer);

  const { success: updatesuccess } = useSelector(
    (state) => state.UserUpdateReducer
  );

  useEffect(() => {
    if (Array.isArray(ids) && ids.length === 1 && !isNaN(ids[0])) {
      dispatch(Userlistid(Number(ids[0])));
      setpasswordshow(true);
    }
  }, []);

  useEffect(() => {
    if (error) {
      swal(error?.message);
    }
  }, [error]);

  useEffect(() => {
    if (success && rerender) {
      swal("Succesfully Added");
      navigate("/users");
    }
  }, [success, rerender]);

  useEffect(() => {
    if (updatesuccess && rerender) {
      swal("Succesfully Added");
      navigate("/users");
    }
  }, [updatesuccess, rerender]);

  useEffect(() => {
    if (Array.isArray(ids) && ids.length === 1 && !isNaN(ids[0])) {
      setfirstname(UserlistIDdata?.first_name);
      setlastname(UserlistIDdata?.last_name);
      setrole(UserlistIDdata?.role);
      setemail(UserlistIDdata?.email);
      setusername(UserlistIDdata?.username);
    }
  }, [UserlistIDdata]);

  const validateSubmit = (e) => {
    e.preventDefault();

    const tempErrors = {
      email: validations.email(email),
      firstname: validations.firstName(firstname),
      lastname: validations.lastName(lastname),
      username: validations.username(username),
      ...(!Array.isArray(ids) &&
        ids.length === 1 &&
        !isNaN(ids[0]) && {
          password: validations.password(password),
          confirmPassword: validations.confirmPassword(
            confirmpassword,
            password
          ),
        }),
      role: !role && "Enter Role",
    };
    setErrors(tempErrors);
    if (Object.values(tempErrors).filter((value) => value).length) {
      // console.log(
      //   "..values",
      //   Object.values(tempErrors).filter((value) => value)
      // );
      return;
    }
    handleSubmit();
  };

  const handleSubmit = async () => {
    const formData = {
      first_name: firstname,
      last_name: lastname,
      username: username,
      role: role,
      email: email,
      password: password,
      confirm_password: confirmpassword,
      company: userData?.user?.company_id,
    };
    // await dispatch(UserAdd(formData));
    // setrender(true);
    if (Array.isArray(ids) && ids.length === 1 && !isNaN(ids[0])) {
      await dispatch(UserUpdate(formData, Number(ids[0])));
      setrender(true);
    } else {
      await dispatch(UserAdd(formData));
      setrender(true);
    }
    // Handle success or navigate to another page
  };

  return (
    <>
      <div className="content">
        <div className="adduser-div">
          <div className="userdiv-21">
            <h1 className="createtitle">Create User</h1>
          </div>

          <div className="container-add">
            <form class="bg-white newuserform" onSubmit={validateSubmit}>
              <div class="grid gap-3 mb-6 md:grid-cols-2">
                <div className="addUser">
                  <div className="userform">
                    <label
                      htmlFor="first_name"
                      className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                    >
                      Username
                    </label>
                    <div className="contact-input">
                      <input
                        type="text"
                        value={username}
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                        placeholder="John"
                        onChange={(e) => {
                          setusername(e.target.value);
                          setErrors({ ...errors, username: null });
                        }}
                      />
                      <span
                      style={{
                        color: "#D14F4F",
                        fontSize: "13px",
                        opacity: errors.username ? 1 : 0,
                      }}
                      >
                        {errors.username ?? "valid"}
                      </span>
                    </div>
                  </div>
                  <div className="userform">
                    <label
                      for="email"
                      class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                    >
                      Email address
                    </label>
                    <div className="contact-input">
                      <input
                        autoComplete="off"
                        type="email"
                        value={email}
                        pattern="[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                        placeholder="john.doe@company.com"
                        onChange={(e) => {
                          setemail(e.target.value);
                          setErrors({ ...errors, email: null });
                        }}
                        required
                      />
                      <span
                      style={{
                        color: "#D14F4F",
                        fontSize: "13px",
                        opacity: errors.email ? 1 : 0,
                      }}
                      >
                        {errors.email ?? "valid"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="addUser">
                  <div className="userform">
                    <label
                      for="firstname"
                      class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                    >
                      First-Name
                    </label>
                    <div className="contact-input">
                      <input
                        type="text"
                        value={firstname}
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                        placeholder="John"
                        autoComplete="off"
                        onChange={(e) => {
                          setfirstname(e.target.value);
                          setErrors({ ...errors, firstname: null });
                        }}
                        // required
                      />
                      <span
                      style={{
                        color: "#D14F4F",
                        fontSize: "13px",
                        opacity: errors.firstname ? 1 : 0,
                      }}
                      >
                        {errors.firstname ?? "valid"}
                      </span>
                    </div>
                  </div>
                  <div className="userform">
                    <label
                      for="lastname"
                      class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                    >
                      Last-Name
                    </label>
                    <div className="contact-input">
                      <input
                        type="text"
                        value={lastname}
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                        placeholder="John"
                        autoComplete="off"
                        // required
                        onChange={(e) => {
                          setlastname(e.target.value);
                          setErrors({ ...errors, lastname: null });
                        }}
                      />
                      <span
                      style={{
                        color: "#D14F4F",
                        fontSize: "13px",
                        opacity: errors.lastname ? 1 : 0,
                      }}
                      >
                        {errors.lastname ?? "valid"}
                      </span>
                    </div>
                  </div>
                </div>
                {!passwordshow && (
                  <>
                    <div className="addUser">
                      <div className="userform">
                        <label
                          for="password"
                          class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                        >
                          password
                        </label>
                        <div className="contact-input">
                          <input
                            type="password"
                            value={password}
                            class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                            placeholder="Enter Password"
                            autoComplete="off"
                            // required
                            onChange={(e) => {
                              setpassword(e.target.value);
                              setErrors({ ...errors, password: null });
                            }}
                          />
                          <span
                          style={{
                            color: "#D14F4F",
                            fontSize: "13px",
                            opacity: errors.password ? 1 : 0,
                          }}
                          >
                            {errors.password ?? "valid"}
                          </span>
                        </div>
                      </div>
                      <div className="userform">
                        <label
                          for="confirmpassword"
                          class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                        >
                          Confirm password
                        </label>
                        <div className="contact-input">
                          <input
                            type="password"
                            value={confirmpassword}
                            class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                            placeholder="Enter confirm Password"
                            autoComplete="off"
                            // required
                            onChange={(e) => {
                              setconfirmpassword(e.target.value);
                              setErrors({ ...errors, confirmPassword: null });
                            }}
                          />
                          <span
                          style={{
                            color: "#D14F4F",
                            fontSize: "13px",
                            opacity: errors.confirmPassword ? 1 : 0,
                          }}
                          >
                            {errors.confirmPassword ?? "valid"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
                <div className="addUser">
                  <div className="userform">
                    <label
                      for="countries"
                      class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                    >
                      ROLE
                    </label>
                    <div className="contact-input">
                      <select
                        value={role}
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                        onChange={(e) => {
                          setrole(e.target.value);
                          setErrors({ ...errors, role: null });
                        }}
                      >
                        <option>Choose a Role</option>
                        <option value="1">ADMIN</option>
                        <option value="2">Users with staff input</option>
                        <option value="3">Users with view only </option>
                      </select>
                      <span
                      style={{
                        color: "#D14F4F",
                        fontSize: "13px",
                        opacity: errors.role ? 1 : 0,
                      }}
                      >
                        {errors.role ?? "valid"}
                      </span>
                    </div>
                  </div>
                  <div className="userform">
                    <label
                      for="lastname"
                      class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                    >
                      Company
                    </label>
                    <div className="contact-input">
                      <input
                        type="text"
                        disabled
                        value={userData?.user?.company_name}
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                        placeholder="John"
                        autoComplete="off"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <hr className="bottamhr"></hr>
              <div>
                <button
                  class="bg-teal-800 hover:bg-teal-500 text-white font-bold py-2 px-4 rounded uploadfilessubmitbutton"
                  type="submit"
                >
                  Submit
                </button>
                <Link to="/users">
                  <button class="bg-teal-800 hover:bg-teal-500 text-white font-bold py-2 px-4 rounded uploadfilessubmitbutton">
                    Cancel
                  </button>
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddUsers;
