import React from "react";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import { ROLE } from "../../constants/other-constants";

export default function AdminRoute({ children }) {
  const { userData } = useSelector((state) => state.authReducer);
  //   if (userData?.user?.role == Object.keys(ROLE)[0]) {

  return userData?.user?.role == Object.keys(ROLE)[0] ? (
    children
  ) : (
    <Navigate to="/" />
  );
}
